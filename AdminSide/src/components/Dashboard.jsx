import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  Package, 
  Users, 
  DollarSign,
  Plus,
  FileText,
  Settings,
  X,
  BarChart3,
  Activity,
  Clock,
  AlertCircle
} from 'lucide-react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config.js';
import { Card, CardHeader, CardContent, CardTitle, Button, LoadingSpinner, EmptyState, Modal, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalSales: 0,
    totalProducts: 0,
    totalCustomers: 0,
    monthlySales: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [latestNews, setLatestNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);

  // ✅ Helper to format Firestore timestamps safely
  const formatDate = (value) => {
    if (!value) return "";
    if (value.toDate) {
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
      const products = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch all orders
      const ordersSnap = await getDocs(collection(db, "orders"));
      const orders = ordersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: formatDate(doc.data().date) // ✅ Fix timestamp
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
      const totalSales = orders.reduce((sum, order) => sum + (order.price || 0), 0);
      const totalProducts = products.length;
      const totalCustomers = new Set(orders.map(order => order.customerId)).size;

      const monthlySales = currentMonthOrders.reduce((sum, order) => sum + (order.price || 0), 0);
      const prevMonthlySales = prevMonthOrders.reduce((sum, order) => sum + (order.price || 0), 0);

      const currentMonthCustomers = new Set(currentMonthOrders.map(order => order.customerId)).size;
      const prevMonthCustomers = new Set(prevMonthOrders.map(order => order.customerId)).size;

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
        customerGrowth: customerGrowth
      });

      // Fetch recent orders (last 5)
      const recentOrdersQuery = query(
        collection(db, "orders"),
        orderBy("date", "desc"),
        limit(6)
      );
      const recentOrdersSnap = await getDocs(recentOrdersQuery);
      const recentOrders = recentOrdersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: formatDate(doc.data().date) // ✅ Fix timestamp
      }));
      setRecentOrders(recentOrders);

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
        createdAt: formatDate(doc.data().createdAt) // ✅ Fix timestamp
      }));
      setLatestNews(latestNews);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'mine':
        return 'bg-blue-100 text-blue-800';
      case 'grab':
        return 'bg-yellow-100 text-yellow-800';
      case 'steal':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPrice = (price) => {
    if (price === null || price === undefined || isNaN(price)) return "₱0";
    return `₱${Number(price).toLocaleString()}`;
  };


  // ✅ ADDED: Define the missing functions
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
      <div className="min-h-screen bg-cream p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F7F1] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Welcome back! Here's an overview of your business performance and recent activity.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Sales */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Sales</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatPrice(stats.totalSales)}
                  </p>
                  {stats.salesGrowth && (
                    <div className="flex items-center mt-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-green-600 font-medium">
                        +{stats.salesGrowth}% from last month
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Products */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalProducts}</p>
                  <div className="flex items-center mt-2 text-sm text-gray-500">
                    <Package className="h-4 w-4 mr-1" />
                    <span>Active inventory</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Customers */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Customers</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalCustomers}</p>
                  {stats.customerGrowth && (
                    <div className="flex items-center mt-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-green-600 font-medium">
                        +{stats.customerGrowth}% growth
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Sales */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">This Month</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatPrice(stats.monthlySales)}
                  </p>
                  <div className="flex items-center mt-2 text-sm text-gray-500">
                    <Activity className="h-4 w-4 mr-1" />
                    <span>Monthly revenue</span>
                  </div>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
          {/* Recent Orders - Takes 2/3 width */}
          <div className="xl:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-gray-400" />
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
                            <div className="font-medium text-gray-900">{order.customerName}</div>
                          </TableCell>
                          <TableCell className="text-gray-600">{order.product}</TableCell>
                          <TableCell>
                            <span className="font-semibold text-gray-900">
                              {formatPrice(order.price)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${getStatusColor(order.status)}`}>
                              {order.status}
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
            <Card>
              <CardContent className="p-6">
                <CardTitle className="mb-4 flex items-center">
                  <Plus className="h-5 w-5 mr-2 text-gray-400" />
                  Quick Actions
                </CardTitle>
                <div className="space-y-3">
                  <Button 
                    onClick={handleAddNewProduct}
                    className="w-full"
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
            <Card>
              <CardContent className="p-6">
                <CardTitle className="mb-4 flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-gray-400" />
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
        <Card>
          <CardContent className="p-6">
            <CardTitle className="mb-6 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-gray-400" />
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

        {/* Add Product Modal */}
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
                className="flex-1"
              >
                Go to Products
              </Button>
            </div>
          </div>
        </Modal>

        {/* Inventory Management Modal */}
        <Modal
          isOpen={showInventoryModal}
          onClose={() => setShowInventoryModal(false)}
          title="Inventory Overview"
          size="sm"
        >
          <div className="p-6">
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-3">
                  <Package className="h-5 w-5 text-blue-600" />
                  <span className="text-gray-900 font-medium">Available Products</span>
                </div>
                <span className="text-xl font-bold text-blue-600">{stats.totalProducts}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <span className="text-gray-900 font-medium">Low Stock Items</span>
                </div>
                <span className="text-xl font-bold text-orange-600">3</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center space-x-3">
                  <X className="h-5 w-5 text-red-600" />
                  <span className="text-gray-900 font-medium">Out of Stock</span>
                </div>
                <span className="text-xl font-bold text-red-600">1</span>
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
                className="flex-1"
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