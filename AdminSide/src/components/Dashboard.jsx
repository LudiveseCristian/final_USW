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
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config.js';
import { Card, CardHeader, CardContent, CardTitle, Button, LoadingSpinner, EmptyState, Modal, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui';

// --- Theme Colors ---
const PRIMARY_DARK_GREEN = '#135918'; // Dark green for the main header background
const CARD_LIGHT_GREEN = '#227227'; // Lighter shade of the primary dark green for header cards background
const BG_CREAM = '#F7F3E8'; // Light cream background
const TEXT_DARK = '#1f2937'; // Dark gray for general text

const LOW_STOCK_THRESHOLD = 5; // Define your threshold for low stock

// --- Reusable Component for Header Stat Cards (Copied from the desired style) ---
const DashboardStatCard = ({ title, value, icon: Icon, trendText }) => {
    // Trend text logic for color and icon rotation
    const isPercentage = trendText && (trendText.includes('% from last month') || trendText.includes('% growth'));
    let trendValue = 0;
    if (isPercentage) {
        const match = trendText.match(/([+-]?[\d.]+)/);
        trendValue = match ? parseFloat(match[1]) : 0;
    }

    const isPositive = trendValue > 0;

    // Lighter color for stat comments/trend text
    let trendColor = 'text-white/70'; // Default light color for non-percentage comments
    if (isPercentage) {
        // High-contrast colors for positive/negative growth percentages
        trendColor = isPositive ? 'text-lime-300' : 'text-red-300';
    }

    return (
      <div
        // Use lighter shade of green for card background
        style={{ backgroundColor: CARD_LIGHT_GREEN }}
        className={`rounded-xl p-5 shadow-lg transition-all duration-300 hover:brightness-110`}
      >
        <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
                {/* Text is white/light */}
                <p className="text-sm font-medium text-white/80">{title}</p>
                {/* Icon color changed to amber for contrast */}
                <Icon className={`w-5 h-5 text-amber-300`} />
            </div>
          <p className="text-3xl font-extrabold text-white">{value}</p>
          {trendText && (
            <div className="text-xs flex items-center pt-1" style={{ color: trendColor }}>
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
    salesGrowth: 0, // Added for DashboardStatCard
    customerGrowth: 0, // Added for DashboardStatCard
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
    if (!value) return "";
    if (value && value.toDate) {
      // Firestore Timestamp
      return value.toDate().toLocaleString();
    }
    if (typeof value === "string" || typeof value === "number") {
      return new Date(value).toLocaleString();
    }
    return "";
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all products
      const productsSnap = await getDocs(collection(db, "products"));
      const products = productsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        stock: doc.data().stock || 0
      }));

      // Inventory Status Calculation
      const outOfStockCount = products.filter(product => product.stock <= 0).length;
      const lowStockCount = products.filter(
        product => product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD
      ).length;

      // Fetch all orders
      const ordersSnap = await getDocs(collection(db, "orders"));
      const orders = ordersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: formatDate(doc.data().date)
      }));

      // Helper to get month/year from string/Date
      const getMonthYear = (dateStr) => {
        const d = new Date(dateStr);
        return { month: d.getMonth(), year: d.getFullYear() };
      };

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      // Filter orders by month
      const currentMonthOrders = orders.filter(order => {
        const { month, year } = getMonthYear(order.date);
        return month === currentMonth && year === currentYear;
      });

      const prevMonthOrders = orders.filter(order => {
        const { month, year } = getMonthYear(order.date);
        return month === prevMonth && year === prevYear;
      });

      // Calculate totals
      const totalSales = orders.reduce((sum, order) => sum + (order.finalBidAmount || order.price || 0), 0); // Use finalBidAmount or price
      const totalProducts = products.length;
      const totalCustomers = new Set(orders.map(order => order.userId)).size; // Use userId for customer count

      const monthlySales = currentMonthOrders.reduce((sum, order) => sum + (order.finalBidAmount || order.price || 0), 0);
      const prevMonthlySales = prevMonthOrders.reduce((sum, order) => sum + (order.finalBidAmount || order.price || 0), 0);

      const currentMonthCustomers = new Set(currentMonthOrders.map(order => order.userId)).size;
      const prevMonthCustomers = new Set(prevMonthOrders.map(order => order.userId)).size;

      // Growth calculation helper
      const calcGrowth = (current, prev) => {
        if (prev === 0 && current > 0) return 100;
        if (prev === 0 && current === 0) return 0;
        return (((current - prev) / prev) * 100).toFixed(1);
      };

      const salesGrowth = calcGrowth(monthlySales, prevMonthlySales);
      const customerGrowth = calcGrowth(currentMonthCustomers, prevMonthCustomers);

      // Set stats
      setStats({
        totalSales: totalSales || 0,
        totalProducts: totalProducts || 0,
        totalCustomers: totalCustomers || 0,
        monthlySales: monthlySales || 0,
        salesGrowth: salesGrowth,
        customerGrowth: customerGrowth,
        lowStockCount: lowStockCount,
        outOfStockCount: outOfStockCount
      });

      // Fetch recent orders (last 6)
      const recentOrdersQuery = query(
        collection(db, "orders"),
        orderBy("date", "desc"),
        limit(6)
      );
      const recentOrdersSnap = await getDocs(recentOrdersQuery);
      
      // *** UPDATED MAPPING LOGIC HERE ***
      const recentOrders = recentOrdersSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          date: formatDate(data.date),
          // Map to new structure based on your provided order data
          customerName: data.deliveryAddress?.fullName || 'N/A', 
          product: data.productName || 'N/A',
          price: data.finalBidAmount || data.price || 0, // Use finalBidAmount or price
          orderStatus: data.status, // Use the 'status' field from the orders document as the 'orderStatus'
        };
      });
      setRecentOrders(recentOrders);
      // *** END UPDATED MAPPING LOGIC ***

      // Fetch latest 3 news
      const newsQuery = query(
        collection(db, "news"),
        orderBy("createdAt", "desc"),
        limit(3)
      );
      const newsSnap = await getDocs(newsQuery);
      const latestNews = newsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: formatDate(doc.data().createdAt)
      }));
      setLatestNews(latestNews);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (orderStatus) => {
      // NOTE: Using the orderStatus values you provided: pending, shipped, delivered, completed, rated
      // Also handling the new 'status' value: pending_confirmation
      switch (orderStatus) {
        case 'shipped':
          return 'bg-blue-100 text-blue-800';
        case 'delivered':
          return 'bg-green-100 text-green-800';
        case 'completed':
          return 'bg-purple-100 text-purple-800';
        case 'rated':
          return 'bg-yellow-100 text-yellow-800';
        case 'pending_confirmation':
        case 'pending':
        default:
          return 'bg-gray-100 text-gray-800';
      }
    };

  const formatPrice = (price) => {
    if (price === null || price === undefined || isNaN(price)) return "₱0";
    return `₱${Number(price).toLocaleString()}`;
  };


  // Define the missing functions
  const handleAddNewProduct = () => {
    setShowAddProductModal(true);
  };

  const handleViewSalesReport = () => {
    navigate('/sales');
  };

  const handleManageInventory = () => {
    setShowInventoryModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: BG_CREAM }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <LoadingSpinner size="lg" color={PRIMARY_DARK_GREEN} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG_CREAM, color: TEXT_DARK }}>

      {/* Header Section (Dark Green) - STYLED TO MATCH REQUESTED STYLE */}
      <div style={{ backgroundColor: PRIMARY_DARK_GREEN }} className="rounded-b-[40px] shadow-2xl p-8 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Title Row */}
          <div className="flex justify-between items-start py-2">
            <div>
              <h1 className="text-4xl font-extrabold text-white flex items-center">
                <List className="w-9 h-9 mr-3 text-white" />
                Sales Dashboard
              </h1>
              <p className="mt-2 text-white/80 text-lg">
                Welcome back! Here's an overview of your business performance.
              </p>
            </div>

            {/* Main KPI Counter (Total Sales/Revenue) */}
            <div className="text-right hidden sm:block">
                <p className="text-5xl font-extrabold text-white">
                    {formatPrice(stats.totalSales).replace('₱', '').split('.')[0]}
                </p>
                <p className="text-base text-white/70">
                    Total Revenue in Philippine Pesos (₱)
                </p>
            </div>
          </div>

          {/* Sales Statistics Cards - Below the main counter */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-green-300">

            <DashboardStatCard
              title="Monthly Sales"
              value={formatPrice(stats.monthlySales)}
              icon={PhilippinePeso}
              trendText={`${stats.salesGrowth > 0 ? '+' : ''}${stats.salesGrowth}% from last month`}
            />

            <DashboardStatCard
              title="Total Customers"
              value={stats.totalCustomers}
              icon={Users}
              trendText={`${stats.customerGrowth > 0 ? '+' : ''}${stats.customerGrowth}% growth`}
            />

            <DashboardStatCard
              title="Total Products"
              value={stats.totalProducts}
              icon={Package}
              trendText="Total active inventory items"
            />

            <DashboardStatCard
              title="Inventory Alerts"
              value={stats.lowStockCount + stats.outOfStockCount}
              icon={AlertCircle}
              trendText={`${stats.outOfStockCount} Out of Stock`}
            />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 mt-[1rem] pb-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">

          {/* Recent Orders */}
          <div className="xl:col-span-2">
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-gray-500" />
                    <CardTitle>Recent Orders</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/sales')}
                  >
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {recentOrders.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="No recent orders found"
                    description="Orders will appear here once customers start making purchases."
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>
                            {/* Display customerName from the mapped order data */}
                            <div className="font-medium text-gray-900">{order.customerName || 'N/A'}</div>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {/* Display product from the mapped order data */}
                            {order.product || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-gray-900">
                              {/* Display price from the mapped order data */}
                              {formatPrice(order.price)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {/* Use order.orderStatus (which is mapped from order.status) */}
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${getStatusColor(order.orderStatus)}`}>
                              {/* Display order.orderStatus */}
                              {order.orderStatus || 'pending'}
                            </span>
                          </TableCell>
                          <TableCell className="text-gray-500 text-sm">{order.date}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <CardTitle className="mb-4 flex items-center">
                  <Plus className="h-5 w-5 mr-2 text-gray-500" />
                  Quick Actions
                </CardTitle>
                <div className="space-y-3">
                  <Button
                    onClick={handleAddNewProduct}
                    className="w-full bg-[#135918] hover:bg-[#0f4312] text-white"
                    size="lg"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Product
                  </Button>
                  <Button
                    onClick={handleViewSalesReport}
                    variant="secondary"
                    className="w-full"
                    size="lg"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Sales Report
                  </Button>
                  <Button
                    onClick={handleManageInventory}
                    variant="secondary"
                    className="w-full"
                    size="lg"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Inventory
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <CardTitle className="mb-4 flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-gray-500" />
                  System Status
                </CardTitle>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Database</span>
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <span className="text-green-600 font-medium text-sm">Online</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Storage</span>
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <span className="text-green-600 font-medium text-sm">Available</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Auto-cleanup</span>
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <span className="text-green-600 font-medium text-sm">Active</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Latest News */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <CardTitle className="mb-6 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-gray-500" />
              Latest News
            </CardTitle>
            {latestNews.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No news available"
                description="Latest news and announcements will appear here."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {latestNews.map((news) => (
                  <Card key={news.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      {news.imageUrl && (
                        <img
                          src={news.imageUrl}
                          alt={news.name || news.title}
                          className="w-full h-32 object-cover rounded-md mb-4"
                        />
                      )}
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                        {news.name || news.title}
                      </h3>
                      <p className="text-gray-600 text-sm line-clamp-3 mb-3">{news.description}</p>
                      <p className="text-xs text-gray-500">{news.createdAt}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Product Modal (Remains the same) */}
        <Modal
          isOpen={showAddProductModal}
          onClose={() => setShowAddProductModal(false)}
          title="Add New Product"
          size="sm"
        >
          <div className="p-6">
            <p className="text-gray-600 mb-6 leading-relaxed">
              Navigate to the Products page to add new items to your inventory and manage your product catalog.
            </p>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowAddProductModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowAddProductModal(false);
                  navigate('/products');
                }}
                className="flex-1 bg-[#38A169] hover:bg-[#2F855A] text-white"
              >
                Go to Products
              </Button>
            </div>
          </div>
        </Modal>

        {/* Inventory Management Modal (Remains the same) */}
        <Modal
          isOpen={showInventoryModal}
          onClose={() => setShowInventoryModal(false)}
          title="Inventory Overview"
          size="sm"
        >
          <div className="p-6">
            <div className="space-y-4 mb-6">
              {/* Available Products (Total Products) */}
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-3">
                  <Package className="h-5 w-5 text-blue-600" />
                  <span className="text-gray-900 font-medium">Available Products</span>
                </div>
                <span className="text-xl font-bold text-blue-600">{stats.totalProducts}</span>
              </div>
              {/* Low Stock Items */}
              <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <span className="text-gray-900 font-medium">Low Stock Items</span>
                </div>
                <span className="text-xl font-bold text-orange-600">{stats.lowStockCount}</span>
              </div>
              {/* Out of Stock */}
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center space-x-3">
                  <X className="h-5 w-5 text-red-600" />
                  <span className="text-gray-900 font-medium">Out of Stock</span>
                </div>
                <span className="text-xl font-bold text-red-600">{stats.outOfStockCount}</span>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowInventoryModal(false)}
                className="flex-1"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setShowInventoryModal(false);
                  navigate('/products');
                }}
                className="flex-1 bg-[#38A169] hover:bg-[#2F855A] text-white"
              >
                Manage Products
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default Dashboard;