import { useState, useEffect } from 'react';
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
} from 'lucide-react';
// Added 'where' import
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../firebase/config.js'; // Ensure path is correct
import { Card, CardHeader, CardContent, CardTitle, Button, LoadingSpinner, EmptyState, Modal, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui'; // Ensure path is correct

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
  const [recentOrders, setRecentOrders] = useState([]);
  const [latestNews, setLatestNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);

  // Helper to format Firestore timestamps safely
  const formatDate = (value) => {
    let date;
    if (!value) return "";
    if (value.toDate) { // Firestore Timestamp object
      date = value.toDate();
    } else if (typeof value === 'string' || typeof value === 'number') {
      date = new Date(value);
    } else {
        return ""; // Cannot format
    }
    // Check if date is valid before formatting
    return !isNaN(date.getTime()) ? date.toLocaleString('en-US', { // Use a consistent locale
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      }) : "";
  };


  useEffect(() => {
    fetchDashboardData();
  }, []);

  // --- UPDATED fetchDashboardData Function ---
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

      // Inventory Status Calculation
      const outOfStockCount = products.filter(product => product.stock <= 0 && product.status !== 'available').length;
      const lowStockCount = products.filter(
        product => product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD
      ).length;

      // --- Fetch All Orders for Stats Calculation ---
      const allOrdersSnap = await getDocs(collection(db, "orders"));
      const allOrders = allOrdersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        rawDate: doc.data().date // Keep raw date for calculations
      }));

      // Helper to get month/year
       const getMonthYear = (dateValue) => {
         let d;
         if (!dateValue) return { month: -1, year: -1 };
         if (dateValue.toDate) d = dateValue.toDate();
         else d = new Date(dateValue);
         if (isNaN(d.getTime())) return { month: -1, year: -1 };
         return { month: d.getMonth(), year: d.getFullYear() };
      };

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      // Filter orders by month
      const currentMonthOrders = allOrders.filter(order => {
        const { month, year } = getMonthYear(order.rawDate);
        return month === currentMonth && year === currentYear;
      });
      const prevMonthOrders = allOrders.filter(order => {
        const { month, year } = getMonthYear(order.rawDate);
        return month === prevMonth && year === prevYear;
      });

      // --- Calculate Totals ---
      const totalSales = allOrders.reduce((sum, order) => sum + (order.finalBidAmount || order.price || 0), 0);
      const totalProducts = products.length;
      const usersSnap = await getDocs(collection(db, "users")); // Fetch users for count
      const totalCustomers = usersSnap.size;
      const monthlySales = currentMonthOrders.reduce((sum, order) => sum + (order.finalBidAmount || order.price || 0), 0);
      const prevMonthlySales = prevMonthOrders.reduce((sum, order) => sum + (order.finalBidAmount || order.price || 0), 0);
      const currentMonthCustomerIds = new Set(currentMonthOrders.map(order => order.userId));
      const prevMonthCustomerIds = new Set(prevMonthOrders.map(order => order.userId));
      const currentMonthUniqueCustomers = currentMonthCustomerIds.size;
      const prevMonthUniqueCustomers = prevMonthCustomerIds.size;

      // Growth calculation helper
      const calcGrowth = (current, prev) => {
        if (prev === 0 && current > 0) return 100;
        if (prev === 0) return 0;
        return parseFloat((((current - prev) / prev) * 100).toFixed(1));
      };

      const salesGrowth = calcGrowth(monthlySales, prevMonthlySales);
      const customerGrowth = calcGrowth(currentMonthUniqueCustomers, prevMonthUniqueCustomers);

      // Set stats
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

      // --- Fetch Recent Orders with deliveryAddress ---
      const recentOrdersQuery = query(
        collection(db, "orders"),
        where('deliveryAddress', '!=', null), // <<< FILTER ADDED
        orderBy("date", "desc"),             // Use the 'date' field from orders
        limit(6)                             // Limit to 6 for dashboard
      );
      const recentOrdersSnap = await getDocs(recentOrdersQuery);

      const recentOrdersData = recentOrdersSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          customerName: data.deliveryAddress?.fullName || 'N/A',
          product: data.productName || 'N/A',
          price: data.finalBidAmount || data.price || 0,
          orderStatus: data.status || 'pending', // Use 'status' field from order doc
          date: formatDate(data.date), // Format the date for display
        };
      });
      setRecentOrders(recentOrdersData);
      // --- END UPDATED RECENT ORDERS ---

      // Fetch latest 3 news
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
  // --- END UPDATED fetchDashboardData Function ---


  const getStatusColor = (orderStatus) => {
    // Consistent status colors
    switch (orderStatus?.toLowerCase()) {
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-teal-100 text-teal-800'; // Changed color
      case 'completed':
      case 'rated':
        return 'bg-green-100 text-green-800'; // Grouped final states
      case 'pending_confirmation':
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800'; // Pending color
    }
  };


  const formatPrice = (price) => {
    if (price === null || price === undefined || isNaN(price)) return "₱0.00";
    return `₱${Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleAddNewProduct = () => setShowAddProductModal(true);
  const handleViewSalesReport = () => navigate('/sales');
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
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">

          {/* === UPDATED RECENT ORDERS TABLE SECTION === */}
          <div className="xl:col-span-2">
            <Card className="shadow-lg overflow-hidden">
              <CardHeader className="border-b bg-gray-50/50"> {/* Slightly transparent header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-gray-500" />
                    <CardTitle className="text-lg font-semibold text-gray-700">Recent Orders</CardTitle>
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => navigate('/sales')} // Navigate to full sales/orders page
                    className="text-sm text-blue-600 hover:text-blue-800 px-1" // Minimal padding for link
                  >
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {recentOrders.length === 0 ? (
                  <div className="p-10 text-center"> {/* Centered empty state */}
                    <EmptyState
                      icon={Package}
                      title="No recent orders with addresses"
                      description="New orders with delivery details will appear here."
                    />
                  </div>
                ) : (
                  // Use overflow-x-auto for responsiveness like in SalesAnalytics
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        {/* Use sticky header style like SalesAnalytics */}
                        <TableRow className="border-b border-gray-200 bg-gray-50">
                          <TableHead className="py-3 px-4 font-medium text-gray-600 w-[150px]">Customer</TableHead>
                          <TableHead className="py-3 px-4 font-medium text-gray-600">Product</TableHead>
                          <TableHead className="py-3 px-4 font-medium text-gray-600 text-right">Price</TableHead>
                          <TableHead className="py-3 px-4 font-medium text-gray-600 w-[180px]">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentOrders.map((order) => (
                           // Use hover effect like SalesAnalytics
                          <TableRow key={order.id} className="border-b border-gray-100 hover:bg-green-50/50">
                            <TableCell className="py-3 px-4">
                              <div className="font-medium text-gray-800 truncate" title={order.customerName}>
                                {order.customerName}
                              </div>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-gray-700 truncate" title={order.product}>
                                {order.product}
                            </TableCell>
                            <TableCell className="py-3 px-4 text-right">
                              <span className="font-semibold text-[#135918]"> {/* Use primary green for price */}
                                {formatPrice(order.price)}
                              </span>
                            </TableCell>
                             {/* Use smaller text for date */}
                            <TableCell className="py-3 px-4 text-gray-500 text-xs">{order.date}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          {/* === END UPDATED RECENT ORDERS TABLE SECTION === */}

          {/* Sidebar (Quick Actions & System Status) */}
          <div className="space-y-6 md:space-y-8">
            {/* Quick Actions */}
             <Card className="shadow-lg">
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
            <Card className="shadow-lg">
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
                   {/* Can add more status indicators if needed */}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Latest News */}
        <Card className="shadow-lg mt-6 md:mt-8">
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
                      {/* Optional: Add image if available in news data */}
                      {/* {news.imageUrl && ( <img src={news.imageUrl} ... /> )} */}
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

        {/* Modals (No changes needed) */}
        <Modal isOpen={showAddProductModal} onClose={() => setShowAddProductModal(false)} title="Add New Product" size="sm">
          {/* Modal Content */}
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
           {/* Modal Content */}
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