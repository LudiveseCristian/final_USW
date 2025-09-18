import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAlert } from '../contexts/alertContext';
import { LoadingSpinner, Card, CardContent, CardTitle, Button, EmptyState, Pagination } from './ui';
import ExportModal from '../modals/ExportModal';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  Calendar,
  FileText,
  BarChart3,
  Download,
  X
} from 'lucide-react';
// ✅ Added imports for Recharts and Pie Chart components
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
// Existing Modals
const CustomerAnalyticsModal = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-11/12 max-w-4xl mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-secondary">Customer Analytics</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-gray-600">
            This section would display charts and data related to your customers, such as:
          </p>
          <ul className="list-disc list-inside mt-2 text-sm text-gray-700">
            <li>Top customers by total spend</li>
            <li>Customer acquisition trends over time</li>
            <li>Geographic distribution of customers</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const ReportModal = ({ onClose, onGenerate }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-secondary">Generate Sales Report</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <select className="w-full input-field">
              <option>Monthly Sales Report</option>
              <option>Quarterly Performance</option>
              <option>Annual Summary</option>
              <option>Custom Period</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Include Charts</label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" defaultChecked />
                <span className="text-sm">Yes</span>
              </label>
            </div>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onGenerate}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
};

const SalesAnalytics = () => {
  const [salesData, setSalesData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [filterPeriod, setFilterPeriod] = useState('month');
  // ✅ Added state for custom date range
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCustomerAnalyticsModal, setShowCustomerAnalyticsModal] = useState(false);
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [exportScope, setExportScope] = useState('all');

  const { showAlert } = useAlert();
  useEffect(() => {
    fetchSalesData();
  }, []);
  // Updated useEffect to apply filter based on period or custom dates
  useEffect(() => {
    applyFilter(filterPeriod, startDate, endDate);
  }, [salesData, filterPeriod, startDate, endDate]);
  const fetchSalesData = async () => {
    try {
      const ordersRef = collection(db, 'orders');
      const ordersSnapshot = await getDocs(ordersRef);
      
      if (!ordersSnapshot.empty) {
        const ordersData = ordersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSalesData(ordersData);
      } else {
        setSalesData([]);
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
      showAlert('error', 'Failed to fetch sales data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = (period, customStartDate, customEndDate) => {
    let finalStartDate = null;
    const now = new Date();
    
    // Determine the start date based on the selected period
    if (period === 'custom' && customStartDate) {
      finalStartDate = new Date(customStartDate);
    } else {
      switch (period) {
        case 'week':
          finalStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
          break;
        case 'month':
          finalStartDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          break;
        case 'quarter':
          finalStartDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
          break;
        case 'year':
          finalStartDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          break;
        default:
          finalStartDate = new Date(0);
          // All time
      }
    }

    const filtered = salesData.filter(sale => {
      const saleDate = sale.date?.seconds
        ? new Date(sale.date.seconds * 1000)
        : new Date(sale.createdAt?.seconds * 1000 || sale.timestamp?.seconds * 1000 || sale.date);
      
      const isAfterStartDate = finalStartDate ? saleDate >= finalStartDate : true;
      const isBeforeEndDate = customEndDate ? saleDate <= new Date(customEndDate) : true;
      
      return isAfterStartDate && isBeforeEndDate;
    });
    
    setFilteredData(filtered);
    setCurrentPage(1); // Reset to first page whenever filter changes
  };
  const calculateStats = (data) => {
    const totalSales = data.reduce((sum, sale) => sum + (sale.price || 0), 0);
    const totalOrders = data.length;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    const statusCounts = data.reduce((acc, sale) => {
      const status = sale.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    const categorySales = data.reduce((acc, sale) => {
      const category = sale.category || 'uncategorized';
      // Group similar categories
      let groupedCategory;
      if (['Jeans', 'Skirt', 'Longsleeve'].includes(category)) {
        groupedCategory = 'Apparel';
      } else if (['Earrings', 'Watch'].includes(category)) {
        groupedCategory = 'Accessories';
      } else {
        groupedCategory = category;
      }
      acc[groupedCategory] = (acc[groupedCategory] || 0) + (sale.price || 0);
      return acc;
    }, {});
    return {
      totalSales,
      totalOrders,
      avgOrderValue,
      statusCounts,
      categorySales
    };
  };

  const stats = calculateStats(filteredData);
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  // Calculate the sales for the current page
  const currentSales = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const getPercentageChange = (currentValue, previousValue) => {
    if (previousValue === 0) return '+100%';
    const change = ((currentValue - previousValue) / previousValue) * 100;
    return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
  };
  const getInsight = (stats) => {
    const sortedCategories = Object.entries(stats.categorySales).sort(([, a], [, b]) => b - a);
    const topCategory = sortedCategories.length > 0 ? sortedCategories[0][0] : null;
    const sortedStatuses = Object.entries(stats.statusCounts).sort(([, a], [, b]) => b - a);
    const topStatus = sortedStatuses.length > 0 ? sortedStatuses[0][0] : null;

    return { topCategory, topStatus };
  };

  const insights = getInsight(stats);
  const formatDate = (dateField) => {
    if (!dateField) return 'N/A';
    if (dateField.seconds) {
      return new Date(dateField.seconds * 1000).toLocaleDateString();
    }
    return new Date(dateField).toLocaleDateString();
  };

  const formatPrice = (price) => `₱${(price || 0).toLocaleString()}`;

  const getStatusColor = (status) => {
    switch (status) {
      case 'mine': return 'bg-blue-100 text-blue-800';
      case 'grab': return 'bg-yellow-100 text-yellow-800';
      case 'steal': return 'bg-red-100 text-red-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'mine': return '💎';
      case 'grab': return '⚡';
      case 'steal': return '🔥';
      case 'confirmed': return '📦';
      default: return '❓';
    }
  };
  const handleGenerateReport = () => setShowReportModal(true);
  const handleViewCustomerAnalytics = () => setShowCustomerAnalyticsModal(true);
  const handleExportData = (scope) => {
    setExportScope(scope);
    setShowExportModal(true);
  };
  // Pagination navigation functions
  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-cream p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    );
  }

  // ✅ Added data preparation for the category chart
  const categoryChartData = Object.entries(stats.categorySales).map(([category, sales]) => ({
    name: category,
    sales: sales
  }));
  
  // ✅ Added data preparation for the status chart
  const statusChartData = Object.entries(stats.statusCounts).map(([status, count]) => ({
    name: status,
    value: count
  }));

  // ✅ Added color palettes for the pie charts
  const PIE_COLORS_STATUS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8A2BE2'];
  const PIE_COLORS_CATEGORY = ['#8A2BE2', '#FF8042', '#FFBB28', '#00C49F', '#0088FE'];

  return (
    <div className="min-h-screen bg-cream p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-secondary mb-2">Sales Analytics</h1>
          <p className="text-gray-600">Track your sales performance and insights</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={filterPeriod}
            onChange={(e) => {
              setFilterPeriod(e.target.value);
              setStartDate(null); // Clear custom dates when a preset is selected
              setEndDate(null);
            }}
            className="input-field"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
            <option value="all">All Time</option>
            <option value="custom">Custom Range</option>
          </select>
          {/* ✅ Added date inputs for custom range */}
          {filterPeriod === 'custom' && (
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={startDate ? startDate.toISOString().substr(0, 10) : ''}
                onChange={(e) => setStartDate(new Date(e.target.value))}
                className="input-field"
              />
              <span className="text-gray-500">-</span>
              <input
                type="date"
                value={endDate ? endDate.toISOString().substr(0, 10) : ''}
                onChange={(e) => setEndDate(new Date(e.target.value))}
                className="input-field"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold text-secondary">{formatPrice(stats.totalSales)}</p>
              <p className="text-sm text-green-600 flex items-center mt-1">
                <TrendingUp className="h-4 w-4 mr-1" />
                {getPercentageChange(stats.totalSales, salesData.reduce((sum, sale) => sum + sale.price, 0) / salesData.length)} from all time
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-secondary">{stats.totalOrders}</p>
              <p className="text-sm text-green-600 flex items-center mt-1">
                <TrendingUp className="h-4 w-4 mr-1" />
                {getPercentageChange(stats.totalOrders, salesData.length / 4)} from all time
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Order</p>
              <p className="text-2xl font-bold text-secondary">{formatPrice(stats.avgOrderValue)}</p>
              <p className="text-sm text-red-600 flex items-center mt-1">
                <TrendingDown className="h-4 w-4 mr-1" />
                -2.1% from last period
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-bold text-secondary">68.5%</p>
              <p className="text-sm text-green-600 flex items-center mt-1">
                <TrendingUp className="h-4 w-4 mr-1" />
                +5.2% from last period
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* ✅ Updated: Pie Chart for Sales by Status with side legend */}
        <div className="card">
          <h3 className="text-lg font-semibold text-secondary mb-4">Sales by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart margin={{ right: 80 }}>
              <Pie
                data={statusChartData}
                dataKey="value"
                nameKey="name"
                cx="40%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                label
              >
                {statusChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS_STATUS[index % PIE_COLORS_STATUS.length]} />
                ))}
              </Pie>
              <Legend layout="vertical" verticalAlign="middle" align="right" />
              <Tooltip formatter={(value) => `${value} order(s)`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* ✅ Updated: Pie Chart for Sales by Category with grouped categories and side legend */}
        <div className="card">
          <h3 className="text-lg font-semibold text-secondary mb-4">Sales by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart margin={{ right: 80 }}>
              <Pie
                data={categoryChartData}
                dataKey="sales"
                nameKey="name"
                cx="40%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                label
              >
                {categoryChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS_CATEGORY[index % PIE_COLORS_CATEGORY.length]} />
                ))}
              </Pie>
              <Legend layout="vertical" verticalAlign="middle" align="right" />
              <Tooltip formatter={(value) => formatPrice(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

<div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h3 className="text-lg font-semibold text-secondary mb-2 sm:mb-0">Recent Sales</h3>
          {/* ✅ ADDED: Filter and export controls for the Recent Sales table */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="flex items-center space-x-2">
              <select
                value={filterPeriod}
                onChange={(e) => {
                  setFilterPeriod(e.target.value);
                  setStartDate(null);
                  setEndDate(null);
                }}
                className="input-field"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
                <option value="all">All Time</option>
                <option value="custom">Custom Range</option>
              </select>
              {filterPeriod === 'custom' && (
                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    value={startDate ? startDate.toISOString().substr(0, 10) : ''}
                    onChange={(e) => setStartDate(new Date(e.target.value))}
                    className="input-field"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="date"
                    value={endDate ? endDate.toISOString().substr(0, 10) : ''}
                    onChange={(e) => setEndDate(new Date(e.target.value))}
                    className="input-field"
                  />
                </div>
              )}
            </div>
            <div className="flex space-x-2">
              <button onClick={() => handleExportData('page')} className="btn-secondary">Export Page</button>
              <button onClick={() => handleExportData('all-filtered')} className="btn-primary">Export All Filtered</button>
            </div>
          </div>
        </div>
        {/* ✅ Updated: Added fixed height and overflow to the table container */}
        <div className="h-[600px] overflow-y-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 sticky top-0 bg-white">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Customer</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Product</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Category</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Price</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {currentSales.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 px-4 text-center text-gray-500">
                    No sales data available for this period.
                  </td>
                </tr>
              ) : (
                currentSales.map((sale) => (
                  <tr key={sale.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-600">{formatDate(sale.date || sale.createdAt || sale.timestamp)}</td>
                    <td className="py-3 px-4 font-medium">{sale.customer || sale.customerName || 'N/A'}</td>
                    <td className="py-3 px-4">{sale.product || sale.productName || 'N/A'}</td>
                    <td className="py-3 px-4 text-gray-600">{sale.category || 'N/A'}</td>
                    <td className="py-3 px-4 font-medium text-primary">{formatPrice(sale.price)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(sale.status || 'unknown')}`}>
                        {(sale.status || 'UNKNOWN').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalItems > itemsPerPage && (
          <div className="flex items-center justify-center mt-4 space-x-2">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="px-4 py-2 border rounded-lg text-gray-700 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-gray-700">Page {currentPage} of {totalPages}</span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border rounded-lg text-gray-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="card">
          <h3 className="text-lg font-semibold text-secondary mb-4">Top Insights</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="bg-green-100 p-2 rounded-full">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-secondary">Best Performing Category</p>
                <p className="text-sm text-gray-600">
                  {insights.topCategory
                    ? `${insights.topCategory} is your top seller with a total of ${formatPrice(stats.categorySales[insights.topCategory])}.`
                    : 'No category data available.'}
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-secondary">Customer Preference</p>
                <p className="text-sm text-gray-600">
                  {insights.topStatus
                    ? `Items with "${insights.topStatus}" status are most popular, representing ${((stats.statusCounts[insights.topStatus] / stats.totalOrders) * 100).toFixed(1)}% of all orders.`
                    : 'No status data available.'}
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-yellow-100 p-2 rounded-full">
                <Calendar className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="font-medium text-secondary">Peak Sales Time</p>
                <p className="text-sm text-gray-600">
                  Weekends show 25% higher sales than weekdays based on recent data.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-secondary mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={handleGenerateReport}
              className="w-full btn-primary flex items-center justify-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>Generate Sales Report</span>
            </button>
            <button
              onClick={handleViewCustomerAnalytics}
              className="w-full btn-secondary flex items-center justify-center space-x-2"
            >
              <BarChart3 className="h-4 w-4" />
              <span>View Customer Analytics</span>
            </button>
            <button
              onClick={() => handleExportData('all')}
              className="w-full btn-secondary flex items-center justify-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export All Data</span>
            </button>
          </div>
        </div>
      </div>

      {showReportModal && (
        <ReportModal
          onClose={() => setShowReportModal(false)}
          onGenerate={() => {
            setShowReportModal(false);
            showAlert('success', 'Sales report generated successfully!');
          }}
        />
      )}

      {showExportModal && (
        <ExportModal
          show={showExportModal}
          onClose={() => setShowExportModal(false)}
          data={exportScope === 'all' ? salesData : (exportScope === 'page' ? currentSales : filteredData)}
        />
      )}

      {showCustomerAnalyticsModal && (
        <CustomerAnalyticsModal onClose={() => setShowCustomerAnalyticsModal(false)} />
      )}
    </div>
  );
};

export default SalesAnalytics;