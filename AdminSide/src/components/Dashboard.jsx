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
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg- [#F9F7F1] rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg- [#F9F7F1] rounded-xl"></div>
            ))}
          </div>
          <div className="h-96 bg- [#F9F7F1] rounded-xl"></div>
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
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Welcome back! Here's an overview of your business performance and recent activity.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Sales */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
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
          </div>

          {/* Total Products */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
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
          </div>

          {/* Total Customers */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
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
          </div>

          {/* Monthly Sales */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
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
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
          {/* Recent Orders - Takes 2/3 width */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-gray-400" />
                    <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
                  </div>
                  <button 
                    onClick={() => navigate('/sales')} 
                    className="px-4 py-2 text-primary hover:bg-primary/5 rounded-lg transition-colors font-medium text-sm"
                  >
                    View All
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Customer</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Product</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Price</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Status</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentOrders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-gray-500">
                          <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p>No recent orders found</p>
                        </td>
                      </tr>
                    ) : (
                      recentOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="font-medium text-gray-900">{order.customerName}</div>
                          </td>
                          <td className="py-4 px-6 text-gray-600">{order.product}</td>
                          <td className="py-4 px-6">
                            <span className="font-semibold text-gray-900">
                              {formatPrice(order.price)}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-gray-500 text-sm">{order.date}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Quick Actions Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Plus className="h-5 w-5 mr-2 text-gray-400" />
                Quick Actions
              </h3>
              <div className="space-y-3">
                <button 
                  onClick={handleAddNewProduct}
                  className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center space-x-2 font-medium"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add New Product</span>
                </button>
                <button 
                  onClick={handleViewSalesReport}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg- [#F9F7F1] transition-colors flex items-center justify-center space-x-2 font-medium"
                >
                  <FileText className="h-4 w-4" />
                  <span>View Sales Report</span>
                </button>
                <button 
                  onClick={handleManageInventory}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg- [#F9F7F1] transition-colors flex items-center justify-center space-x-2 font-medium"
                >
                  <Settings className="h-4 w-4" />
                  <span>Manage Inventory</span>
                </button>
              </div>
            </div>

            {/* System Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-gray-400" />
                System Status
              </h3>
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
            </div>
          </div>
        </div>

        {/* Latest News */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 text-gray-400" />
            Latest News
          </h2>
          {latestNews.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No news available at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {latestNews.map((news) => (
                <div key={news.id} className="border border- [#F9F7F1] rounded-lg p-4 hover:shadow-md transition-shadow">
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
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Product Modal */}
        {showAddProductModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Add New Product</h3>
                <button
                  onClick={() => setShowAddProductModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <p className="text-gray-600 mb-6 leading-relaxed">
                Navigate to the Products page to add new items to your inventory and manage your product catalog.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowAddProductModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowAddProductModal(false);
                    navigate('/products');
                  }}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  Go to Products
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Management Modal */}
        {showInventoryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Inventory Overview</h3>
                <button
                  onClick={() => setShowInventoryModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
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
                <button
                  onClick={() => setShowInventoryModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowInventoryModal(false);
                    navigate('/products');
                  }}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  Manage Products
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;