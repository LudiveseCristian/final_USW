import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Package,
  Users,
  PhilippinePeso,
  Plus,
  FileText,
  Settings,
  X,
  BarChart3,
  Activity,
  Clock,
  AlertCircle,
  List,
  ArrowRight
} from 'lucide-react';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../firebase/config.js'; 
import { Card, CardHeader, CardContent, CardTitle, Button, LoadingSpinner, EmptyState, Modal, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui';
// --- Added Recharts Imports ---
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';

// --- Theme Colors ---
const PRIMARY_DARK_GREEN = '#135918';
const CARD_LIGHT_GREEN = '#227227';
const BG_CREAM = '#F7F3E8';
const TEXT_DARK = '#1f2937';

const LOW_STOCK_THRESHOLD = 5;

// --- Reusable Component for Header Stat Cards ---
const DashboardStatCard = ({ title, value, icon: Icon, trendText }) => {
    const isPercentage = trendText && (trendText.includes('% from last month') || trendText.includes('% growth'));
    let trendValue = 0;
    if (isPercentage) {
        const match = trendText.match(/([+-]?[\d.]+)/);
        trendValue = match ? parseFloat(match[1]) : 0;
    }
    const isPositive = trendValue > 0;
    let trendColor = 'text-white/70';
    if (isPercentage) {
        trendColor = isPositive ? 'text-lime-300' : 'text-red-300';
    }

    return (
      <div
        style={{ backgroundColor: CARD_LIGHT_GREEN }}
        className={`rounded-xl p-5 shadow-lg transition-all duration-300 hover:brightness-110`}
      >
        <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white/80">{title}</p>
                <Icon className={`w-5 h-5 text-amber-300`} />
            </div>
          <p className="text-3xl font-extrabold text-white">{value}</p>
          {trendText && (
            <div className={`text-xs flex items-center pt-1 ${trendColor}`}>
              {isPercentage && (
                <TrendingUp className={`h-4 w-4 mr-1 ${isPositive ? 'rotate-0' : 'rotate-180 text-red-300'}`} />
              )}
              <span>{trendText}</span>
            </div>
          )}
        </div>
      </div>
    );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalSales: 0,
    totalProducts: 0,
    totalCustomers: 0,
    monthlySales: 0,
    salesGrowth: 0,
    customerGrowth: 0,
    lowStockCount: 0,
    outOfStockCount: 0
  });
  const [salesTrendData, setSalesTrendData] = useState([]); // Data for Line Graph
  const [recentOrders, setRecentOrders] = useState([]);
  const [latestNews, setLatestNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);

  const formatDate = (value) => {
    let date;
    if (!value) return "";
    if (value.toDate) { 
      date = value.toDate();
    } else if (typeof value === 'string' || typeof value === 'number') {
      date = new Date(value);
    } else {
        return ""; 
    }
    return !isNaN(date.getTime()) ? date.toLocaleString('en-US', { 
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      }) : "";
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // --- Fetch Products ---
      const productsSnap = await getDocs(collection(db, "products"));
      const products = productsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        stock: doc.data().stock !== undefined ? doc.data().stock : (doc.data().status === 'available' ? 1 : 0)
      }));

      const outOfStockCount = products.filter(product => product.stock <= 0 && product.status !== 'available').length;
      const lowStockCount = products.filter(
        product => product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD
      ).length;

      // --- Fetch All Orders for Stats ---
      const allOrdersSnap = await getDocs(collection(db, "orders"));
      const allOrders = allOrdersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        rawDate: doc.data().date 
      }));

       const getMonthYear = (dateValue) => {
         let d;
         if (!dateValue) return { month: -1, year: -1, day: -1, dateObj: null };
         if (dateValue.toDate) d = dateValue.toDate();
         else d = new Date(dateValue);
         if (isNaN(d.getTime())) return { month: -1, year: -1, day: -1, dateObj: null };
         return { month: d.getMonth(), year: d.getFullYear(), day: d.getDate(), dateObj: d };
      };

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      const currentMonthOrders = allOrders.filter(order => {
        const { month, year } = getMonthYear(order.rawDate);
        return month === currentMonth && year === currentYear;
      });
      
      // --- Prepare Sales Trend Data (Current Month) ---
      const trendMap = {};
      currentMonthOrders.forEach(order => {
          const { dateObj } = getMonthYear(order.rawDate);
          // Format: "Nov 01"
          const key = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const amount = order.finalBidAmount || order.price || 0;
          if (!trendMap[key]) trendMap[key] = 0;
          trendMap[key] += amount;
      });
      
      // Convert to array and sort by date
      const trendArray = Object.entries(trendMap).map(([date, sales]) => ({
          date,
          sales
      })).sort((a, b) => new Date(a.date) - new Date(b.date)); // Approximation sort, strictly relies on current month context
      
      setSalesTrendData(trendArray);

      const prevMonthOrders = allOrders.filter(order => {
        const { month, year } = getMonthYear(order.rawDate);
        return month === prevMonth && year === prevYear;
      });

      // --- Calculate Totals ---
      const totalSales = allOrders.reduce((sum, order) => sum + (order.finalBidAmount || order.price || 0), 0);
      const totalProducts = products.length;
      const usersSnap = await getDocs(collection(db, "users")); 
      const totalCustomers = usersSnap.size;
      const monthlySales = currentMonthOrders.reduce((sum, order) => sum + (order.finalBidAmount || order.price || 0), 0);
      const prevMonthlySales = prevMonthOrders.reduce((sum, order) => sum + (order.finalBidAmount || order.price || 0), 0);
      const currentMonthCustomerIds = new Set(currentMonthOrders.map(order => order.userId));
      const prevMonthCustomerIds = new Set(prevMonthOrders.map(order => order.userId));
      const currentMonthUniqueCustomers = currentMonthCustomerIds.size;
      const prevMonthUniqueCustomers = prevMonthCustomerIds.size;

      const calcGrowth = (current, prev) => {
        if (prev === 0 && current > 0) return 100;
        if (prev === 0) return 0;
        return parseFloat((((current - prev) / prev) * 100).toFixed(1));
      };

      const salesGrowth = calcGrowth(monthlySales, prevMonthlySales);
      const customerGrowth = calcGrowth(currentMonthUniqueCustomers, prevMonthUniqueCustomers);

      setStats({
        totalSales: totalSales || 0,
        totalProducts: totalProducts || 0,
        totalCustomers: totalCustomers || 0,
        monthlySales: monthlySales || 0,
        salesGrowth: salesGrowth || 0,
        customerGrowth: customerGrowth || 0,
        lowStockCount: lowStockCount || 0,
        outOfStockCount: outOfStockCount || 0
      });

      // --- Fetch Recent Orders ---
      const recentOrdersQuery = query(
        collection(db, "orders"),
        where('deliveryAddress', '!=', null), 
        orderBy("date", "desc"),            
        limit(10) // Increased limit slightly since the table scrolls
      );
      const recentOrdersSnap = await getDocs(recentOrdersQuery);

      const recentOrdersData = recentOrdersSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          customerName: data.deliveryAddress?.fullName || 'N/A',
          product: data.productName || 'N/A',
          price: data.finalBidAmount || data.price || 0,
          orderStatus: data.status || 'pending', 
          date: formatDate(data.date), 
        };
      });
      setRecentOrders(recentOrdersData);

      // Fetch news
      const newsQuery = query(
        collection(db, "news"),
        orderBy("createdAt", "desc"),
        limit(3)
      );
      const newsSnap = await getDocs(newsQuery);
      const latestNewsData = newsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: formatDate(doc.data().createdAt)
      }));
      setLatestNews(latestNewsData);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };


  const getStatusColor = (orderStatus) => {
    switch (orderStatus?.toLowerCase()) {
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-teal-100 text-teal-800';
      case 'completed':
      case 'rated': return 'bg-green-100 text-green-800';
      default: return 'bg-yellow-100 text-yellow-800'; 
    }
  };

  const formatPrice = (price) => {
    if (price === null || price === undefined || isNaN(price)) return "₱0.00";
    return `₱${Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleAddNewProduct = () => setShowAddProductModal(true);
  const handleViewSalesReport = () => navigate('/sales');
  const handleViewAnalytics = () => navigate('/sales-analytics'); // Redirect to SalesAnalytics.js
  const handleManageInventory = () => setShowInventoryModal(true);

  if (loading) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center" style={{ backgroundColor: BG_CREAM }}>
        <LoadingSpinner size="lg" color={PRIMARY_DARK_GREEN} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG_CREAM, color: TEXT_DARK }}>

      {/* Header Section */}
      <div style={{ backgroundColor: PRIMARY_DARK_GREEN }} className="rounded-b-[40px] shadow-2xl p-6 md:p-8 pb-8">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-start py-2 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white flex items-center">
                <BarChart3 className="w-7 h-7 md:w-9 md:h-9 mr-3 text-white" />
                Sales Dashboard
              </h1>
              <p className="mt-1 md:mt-2 text-white/80 text-base md:text-lg">
                Overview of your business performance.
              </p>
            </div>
            <div className="text-right mt-4 sm:mt-0">
                <p className="text-4xl md:text-5xl font-extrabold text-white">
                    {formatPrice(stats.totalSales)}
                </p>
                <p className="text-sm md:text-base text-white/70 mt-1">
                    Total Revenue (₱)
                </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <DashboardStatCard
              title="Monthly Sales"
              value={formatPrice(stats.monthlySales)}
              icon={PhilippinePeso}
              trendText={`${stats.salesGrowth >= 0 ? '+' : ''}${stats.salesGrowth}% from last month`}
            />
            <DashboardStatCard
              title="Total Customers"
              value={stats.totalCustomers}
              icon={Users}
              trendText={`${stats.customerGrowth >= 0 ? '+' : ''}${stats.customerGrowth}% growth`}
            />
            <DashboardStatCard
              title="Total Products"
              value={stats.totalProducts}
              icon={Package}
              trendText="Total inventory items"
            />
            <DashboardStatCard
              title="Inventory Alerts"
              value={stats.lowStockCount + stats.outOfStockCount}
              icon={AlertCircle}
              trendText={`${stats.outOfStockCount} Out | ${stats.lowStockCount} Low`}
            />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 md:mt-8 pb-8">
        
        {/* NEW: Line Graph Section (Sales Trend) */}
        <div className="mb-8">
          <Card className="shadow-lg border border-gray-100">
            <CardHeader className="border-b bg-gray-50/50 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-700 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                Sales Trend (This Month)
              </CardTitle>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleViewAnalytics}
                className="text-xs md:text-sm flex items-center border-green-200 text-green-700 hover:bg-green-50"
              >
                View Full Analytics
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="p-6">
                {salesTrendData.length > 0 ? (
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={salesTrendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="date" tick={{fontSize: 12}} stroke="#6b7280" />
                                <YAxis tick={{fontSize: 12}} stroke="#6b7280" tickFormatter={(value) => `₱${value}`} />
                                <Tooltip 
                                    formatter={(value) => [formatPrice(value), 'Sales']}
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="sales" 
                                    stroke="#135918" 
                                    strokeWidth={3} 
                                    dot={{ r: 4, fill: '#135918' }} 
                                    activeDot={{ r: 6 }} 
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-[300px] flex items-center justify-center text-gray-500">
                        No sales data recorded for this month yet.
                    </div>
                )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
          
          {/* === UPDATED RECENT ORDERS TABLE SECTION === */}
          <div className="xl:col-span-2">
            <Card className="shadow-lg overflow-hidden border border-gray-100">
              <CardHeader className="border-b bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-gray-500" />
                    <CardTitle className="text-lg font-semibold text-gray-700">Recent Orders</CardTitle>
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={handleViewSalesReport}
                    className="text-sm text-blue-600 hover:text-blue-800 px-1"
                  >
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {recentOrders.length === 0 ? (
                  <div className="p-10 text-center">
                    <EmptyState
                      icon={Package}
                      title="No recent orders"
                      description="New orders will appear here."
                    />
                  </div>
                ) : (
                  // Fixed Height Container with Scroll
                  <div className="h-[400px] overflow-y-auto border border-gray-200 rounded-lg">
                    <table className="w-full relative">
                      <thead className="sticky top-0 z-10 bg-gray-50">
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-gray-600 bg-gray-50 w-[180px]">Customer</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600 bg-gray-50">Product</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-600 bg-gray-50 w-[120px]">Price</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600 bg-gray-50 w-[100px]">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600 bg-gray-50 w-[150px]">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.map((order) => (
                          <tr key={order.id} className="border-b border-gray-100 hover:bg-green-50/50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-medium text-gray-800 truncate max-w-[160px]" title={order.customerName}>
                                {order.customerName}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                                <div className="text-gray-700 truncate max-w-[200px]" title={order.product}>
                                    {order.product}
                                </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="font-semibold text-[#135918]">
                                {formatPrice(order.price)}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(order.orderStatus)}`}>
                                    {order.orderStatus.toUpperCase()}
                                </span>
                            </td>
                            <td className="py-3 px-4 text-gray-500 text-xs">{order.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar (Quick Actions & System Status) */}
          <div className="space-y-6 md:space-y-8">
            {/* Quick Actions */}
             <Card className="shadow-lg border border-gray-100">
               <CardHeader className="border-b">
                 <CardTitle className="text-lg flex items-center">
                    <Plus className="h-5 w-5 mr-2 text-gray-500" />
                    Quick Actions
                 </CardTitle>
               </CardHeader>
              <CardContent className="p-4 md:p-6">
                <div className="space-y-3">
                  <Button
                    onClick={handleAddNewProduct}
                    className="w-full bg-green-600 hover:bg-green-700 text-white justify-start px-4 py-3 text-base"
                    size="lg"
                  >
                    <Plus className="h-5 w-5 mr-3" />
                    Add New Product
                  </Button>
                  <Button
                    onClick={handleViewSalesReport}
                    variant="outline"
                    className="w-full justify-start px-4 py-3 text-base border-gray-300 text-gray-700 hover:bg-gray-100"
                    size="lg"
                  >
                    <FileText className="h-5 w-5 mr-3" />
                    View Sales Report
                  </Button>
                  <Button
                    onClick={handleManageInventory}
                    variant="outline"
                    className="w-full justify-start px-4 py-3 text-base border-gray-300 text-gray-700 hover:bg-gray-100"
                    size="lg"
                  >
                    <Settings className="h-5 w-5 mr-3" />
                    Manage Inventory
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card className="shadow-lg border border-gray-100">
               <CardHeader className="border-b">
                 <CardTitle className="text-lg flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-gray-500" />
                    System Status
                 </CardTitle>
               </CardHeader>
              <CardContent className="p-4 md:p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 text-sm">Database</span>
                    <div className="flex items-center space-x-1.5">
                      <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-600 font-medium text-sm">Online</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 text-sm">Storage</span>
                    <div className="flex items-center space-x-1.5">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <span className="text-green-600 font-medium text-sm">Nominal</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Latest News */}
        <Card className="shadow-lg mt-6 md:mt-8 border border-gray-100">
           <CardHeader className="border-b bg-gray-50/50">
              <CardTitle className="text-lg flex items-center font-semibold text-gray-700">
                 <AlertCircle className="h-5 w-5 mr-2 text-gray-500" />
                 Latest News & Updates
              </CardTitle>
           </CardHeader>
          <CardContent className="p-4 md:p-6">
            {latestNews.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No news available"
                description="Latest updates and announcements will appear here."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {latestNews.map((news) => (
                  <Card key={news.id} className="hover:shadow-md transition-shadow border">
                    <CardContent className="p-4">
                      <h3 className="text-base font-semibold text-gray-800 mb-1 line-clamp-2">
                        {news.name || news.title}
                      </h3>
                      <p className="text-gray-600 text-xs line-clamp-3 mb-2">{news.description}</p>
                      <p className="text-xs text-gray-400">{news.createdAt}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modals */}
        <Modal isOpen={showAddProductModal} onClose={() => setShowAddProductModal(false)} title="Add New Product" size="sm">
           <div className="p-6">
            <p className="text-gray-600 mb-6">
              Go to the 'Products' section to add new items.
            </p>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => setShowAddProductModal(false)} className="flex-1">Cancel</Button>
              <Button
                onClick={() => { setShowAddProductModal(false); navigate('/products'); }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              > Go to Products </Button>
            </div>
          </div>
        </Modal>
        <Modal isOpen={showInventoryModal} onClose={() => setShowInventoryModal(false)} title="Inventory Overview" size="sm">
           <div className="p-6">
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2"> <Package className="h-5 w-5 text-blue-600" /> <span className="text-gray-800 font-medium text-sm">Total Items</span> </div>
                <span className="text-lg font-bold text-blue-600">{stats.totalProducts}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center space-x-2"> <AlertCircle className="h-5 w-5 text-orange-600" /> <span className="text-gray-800 font-medium text-sm">Low Stock Items</span> </div>
                <span className="text-lg font-bold text-orange-600">{stats.lowStockCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center space-x-2"> <X className="h-5 w-5 text-red-600" /> <span className="text-gray-800 font-medium text-sm">Out of Stock</span> </div>
                <span className="text-lg font-bold text-red-600">{stats.outOfStockCount}</span>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => setShowInventoryModal(false)} className="flex-1">Close</Button>
              <Button
                onClick={() => { setShowInventoryModal(false); navigate('/products'); }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              > Manage Products </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default Dashboard;
