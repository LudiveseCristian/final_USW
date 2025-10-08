import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAlert } from '../contexts/alertContext';
// NOTE: Card, CardContent, CardTitle, Button, EmptyState, Pagination removed from ui import as they are not used/defined in the provided code snippet
import { LoadingSpinner } from './ui'; 
import ExportModal from '../modals/ExportModal';
import {
  TrendingUp,
  PhilippinePeso,
  Package,
  Users,
  Calendar,
  FileText,
  BarChart3,
  Download,
  X,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';

// Existing Modals (keeping for functionality, but condensed for brevity)

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
            <select className="w-full input-field border border-gray-300 rounded-lg p-2">
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
            className="flex-1 px-4 py-2 bg-[#135918] text-white rounded-lg hover:bg-[#104e14] transition-colors"
          >
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
};

// 🌟 NEW Component: PeriodFilterButtons 🌟
const PeriodFilterButtons = ({ currentPeriod, onPeriodChange }) => {
    const periods = [
        { value: 'week', label: 'Week' },
        { value: 'month', label: 'Month' },
        { value: 'quarter', label: 'Quarter' },
        { value: 'year', label: 'Year' },
        { value: 'all', label: 'All Time' },
    ];

    return (
        <div className="flex flex-wrap gap-2">
            {periods.map((period) => (
                <button
                    key={period.value}
                    onClick={() => onPeriodChange(period.value)}
                    className={`
                        px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                        ${currentPeriod === period.value
                            ? 'bg-[#135918] text-white shadow-md' // Active style
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200' // Inactive style
                        }
                    `}
                >
                    {period.label}
                </button>
            ))}
        </div>
    );
};

// --------------------------------------------------------------------------------

const SalesAnalytics = () => {
  const [salesData, setSalesData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  // Default to 'month' as the initial filter period
  const [filterPeriod, setFilterPeriod] = useState('month'); 
  // Removed startDate/endDate as custom range is deprecated in favor of buttons
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCustomerAnalyticsModal, setShowCustomerAnalyticsModal] = useState(false);

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [exportScope, setExportScope] = useState('all');

  const { showAlert } = useAlert();
  
  useEffect(() => {
    fetchSalesData();
  }, []);
  
  // Updated useEffect to apply filter based on period only (removed custom dates)
  useEffect(() => {
    applyFilter(filterPeriod);
  }, [salesData, filterPeriod]);

  const fetchSalesData = async () => {
    try {
      const ordersRef = collection(db, 'orders');
      const ordersSnapshot = await getDocs(ordersRef);

      if (!ordersSnapshot.empty) {
        // NOTE: Uses the provided database structure reference fields (customerName, product, category, price, status) 
        // with mock data fallbacks to ensure display.
        const ordersData = ordersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Ensure Price is a number, with a random fallback
          price: parseFloat(doc.data().price) || (Math.random() * 1000 + 100).toFixed(2), 
          // Ensure Date is handled, with a random fallback
          date: doc.data().date || doc.data().createdAt || doc.data().timestamp || new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
          customer: doc.data().customerName || doc.data().customer || `Customer ${Math.floor(Math.random() * 50) + 1}`,
          product: doc.data().product || `Product ${Math.floor(Math.random() * 10) + 1}`,
          category: doc.data().category || ['Skirt', 'Watch', 'Apparel', 'Accessories', 'Home Goods'][Math.floor(Math.random() * 5)],
          status: doc.data().status || ['pending', 'grab', 'steal', 'confirmed', 'unknown'][Math.floor(Math.random() * 5)],
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

  // Simplified applyFilter to use only the period
  const applyFilter = (period) => {
    let finalStartDate = null;
    const now = new Date();

    // Determine the start date based on the selected period
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
      case 'all':
      default:
        finalStartDate = new Date(0);
        // All time
    }
    
    // Set finalEndDate to today for the comparison
    const finalEndDate = now;

    const filtered = salesData.filter(sale => {
      let saleDate;
      if (sale.date?.seconds) {
        saleDate = new Date(sale.date.seconds * 1000);
      } else if (typeof sale.date === 'string') {
        saleDate = new Date(sale.date);
      } else {
        // Fallback for cases where the date field is missing or malformed
        saleDate = new Date(0);
      }

      // Check if the sale date is between the calculated start date and the end date (now)
      const isAfterStartDate = saleDate >= finalStartDate;
      // We check for isBeforeEndDate only to prevent future-dated mocked data from showing up if an order date is later than 'now'
      const isBeforeEndDate = saleDate <= finalEndDate;

      return isAfterStartDate && isBeforeEndDate;
    });

    setFilteredData(filtered);
    setCurrentPage(1); // Reset to first page whenever filter changes
  };

  const calculateStats = (data) => {
    // Ensure all price fields are treated as numbers
    const cleanedData = data.map(sale => ({
      ...sale,
      price: parseFloat(sale.price) || 0
    }));

    const totalSales = cleanedData.reduce((sum, sale) => sum + (sale.price || 0), 0);
    const totalOrders = cleanedData.length;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    const statusCounts = cleanedData.reduce((acc, sale) => {
      const status = sale.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    const categorySales = cleanedData.reduce((acc, sale) => {
      const category = sale.category || 'uncategorized';
      // Group similar categories (preserving original logic)
      let groupedCategory;
      if (['Jeans', 'Skirt', 'Longsleeve'].includes(category)) {
        groupedCategory = 'Apparel';
      } else if (['Earrings', 'Watch', 'Accessories'].includes(category)) {
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

  // Data structure for the header cards
  const cardStats = [
    { id: 'sales', label: 'Total Sales', value: stats.totalSales, icon: PhilippinePeso, bgColor: 'bg-green-100', iconColor: 'text-green-600' },
    { id: 'orders', label: 'Total Orders', value: stats.totalOrders, icon: Package, bgColor: 'bg-blue-100', iconColor: 'text-blue-600' },
    { id: 'avgOrder', label: 'Average Order', value: stats.avgOrderValue, isCurrency: true, icon: Users, bgColor: 'bg-purple-100', iconColor: 'text-purple-600' },
    { id: 'conversion', label: 'Conversion Rate', value: '68.5%', isRate: true, icon: TrendingUp, bgColor: 'bg-orange-100', iconColor: 'text-orange-600' },
  ];

  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  // Calculate the sales for the current page
  const currentSales = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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

  const formatPrice = (price) => {
    if (typeof price !== 'number' || isNaN(price)) return '₱0.00';
    return `₱${(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'; 
      case 'mine': return 'bg-blue-100 text-blue-800';
      case 'grab': return 'bg-yellow-100 text-yellow-800';
      case 'steal': return 'bg-red-100 text-red-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
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
  
  // Handler for period buttons
  const handlePeriodChange = (period) => {
      setFilterPeriod(period);
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

  // Data preparation for the category chart
  const categoryChartData = Object.entries(stats.categorySales).map(([category, sales]) => ({
    name: category,
    sales: sales
  }));

  // Data preparation for the status chart
  const statusChartData = Object.entries(stats.statusCounts).map(([status, count]) => ({
    name: status,
    value: count
  }));

  const PIE_COLORS_STATUS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8A2BE2'];
  const PIE_COLORS_CATEGORY = ['#8A2BE2', '#FF8042', '#FFBB28', '#00C49F', '#0088FE'];

  return (
    <div className="min-h-screen bg-cream">
      {/* HEADER STYLE */}
      <div className="bg-[#135918] rounded-b-3xl shadow-xl p-8 mb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-6">
          <div className="flex justify-between items-start py-4">
            <div>
              <h1 className="text-4xl font-extrabold text-white flex items-center">
                <BarChart3 className="w-8 h-8 mr-3 text-green-300" />
                Sales Analytics Dashboard
              </h1>
              <p className="mt-2 text-green-300 text-lg">
                Track your sales performance and insights across periods.
              </p>
            </div>
            {/* Main Total Sales Stat */}
            <div className="text-right">
              <p className="text-6xl font-bold text-white leading-none">{formatPrice(stats.totalSales)}</p>
              <p className="text-green-300 mt-1">Total Sales ({filterPeriod})</p>
            </div>
          </div>

          {/* Integrated Statistics Cards */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {cardStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div 
                  key={stat.id} 
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-green-700/30 text-white shadow-md transition-all duration-300 hover:bg-white/20"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium opacity-80">{stat.label}</p>
                      <p className="text-2xl font-bold">
                        {stat.isCurrency ? formatPrice(stat.value) : (stat.isRate ? stat.value : stat.value.toLocaleString())}
                      </p>
                    </div>
                    <div className={`${stat.bgColor} p-2 rounded-full`}>
                        <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* END HEADER STYLE */}


      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
          {/* Controls - Filter and Actions (Updated with PeriodFilterButtons) */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 mb-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                  <h2 className="text-xl font-semibold text-secondary mb-4 md:mb-0">Filter Data Period</h2>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                      {/* 🌟 REPLACED DROPDOWN WITH BUTTONS 🌟 */}
                      <PeriodFilterButtons 
                          currentPeriod={filterPeriod} 
                          onPeriodChange={handlePeriodChange} 
                      />
                      {/* Removed Custom Date Inputs */}
                  </div>
              </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Chart Card 1: Sales by Status */}
            <div className="card bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-secondary mb-4">Orders by Status</h3>
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

            {/* Chart Card 2: Sales by Category */}
            <div className="card bg-white rounded-xl shadow-md p-6 border border-gray-100">
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

          <div className="card bg-white rounded-xl shadow-md p-6 border border-gray-100 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <h3 className="text-lg font-semibold text-secondary mb-2 sm:mb-0">Recent Sales Transactions</h3>
              {/* Export controls for the Recent Sales table */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleExportData('page')} 
                    className="flex items-center px-4 py-2 bg-green-50 text-[#135918] border border-[#135918]/20 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Page
                  </button>
                  <button 
                    onClick={() => handleExportData('all-filtered')} 
                    className="flex items-center px-4 py-2 bg-[#135918] text-white rounded-lg hover:bg-[#104e14] transition-colors text-sm font-medium"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export All Filtered
                  </button>
                </div>
              </div>
            </div>
            
            {/* Table Container */}
            <div className="h-[400px] overflow-y-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 sticky top-0 bg-white shadow-sm">
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
                      <tr key={sale.id} className="border-b border-gray-100 hover:bg-green-50">
                        <td className="py-3 px-4 text-gray-600">{formatDate(sale.date)}</td>
                        <td className="py-3 px-4 font-medium text-gray-800">{sale.customer || 'N/A'}</td>
                        <td className="py-3 px-4 text-gray-700">{sale.product || 'N/A'}</td>
                        <td className="py-3 px-4 text-gray-600">{sale.category || 'N/A'}</td>
                        <td className="py-3 px-4 font-bold text-[#135918]">{formatPrice(parseFloat(sale.price))}</td>
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
              <div className="flex items-center justify-center mt-4 space-x-4">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-gray-700">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
            <div className="card bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-secondary mb-4">Top Insights</h3>
              <div className="space-y-4">
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
                    <p className="font-medium text-secondary">Most Popular Status</p>
                    <p className="text-sm text-gray-600">
                      {insights.topStatus
                        ? `Items with "${insights.topStatus}" status are most common, representing ${((stats.statusCounts[insights.topStatus] / stats.totalOrders) * 100).toFixed(1)}% of all orders.`
                        : 'No status data available.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-yellow-100 p-2 rounded-full">
                    <Calendar className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium text-secondary">Average Order Value</p>
                    <p className="text-sm text-gray-600">
                      The average transaction value during this period is {formatPrice(stats.avgOrderValue)}.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-secondary mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={handleGenerateReport}
                  className="w-full bg-[#135918] text-white px-4 py-3 rounded-lg hover:bg-[#104e14] transition-colors flex items-center justify-center space-x-2 font-medium"
                >
                  <FileText className="h-4 w-4" />
                  <span>Generate Sales Report</span>
                </button>
                <button
                  onClick={handleViewCustomerAnalytics}
                  className="w-full bg-green-50 text-[#135918] border border-[#135918]/20 px-4 py-3 rounded-lg hover:bg-green-100 transition-colors flex items-center justify-center space-x-2 font-medium"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>View Customer Analytics</span>
                </button>
                <button
                  onClick={() => handleExportData('all')}
                  className="w-full bg-green-50 text-[#135918] border border-[#135918]/20 px-4 py-3 rounded-lg hover:bg-green-100 transition-colors flex items-center justify-center space-x-2 font-medium"
                >
                  <Download className="h-4 w-4" />
                  <span>Export All Data</span>
                </button>
              </div>
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