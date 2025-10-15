import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAlert } from '../contexts/alertContext';
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
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

// Custom Legend Component (No change)
const CustomPieChartLegend = ({ data, colors }) => {
    return (
        <div className="flex flex-col space-y-2 mt-4 max-h-[300px] overflow-y-auto pr-2">
            {data.map((entry, index) => (
                <div key={`legend-item-${index}`} className="flex items-center">
                    <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: colors[index % colors.length] }}
                    ></div>
                    <span className="text-sm text-gray-700 font-medium truncate" title={entry.name}>
                        {entry.name}
                    </span>
                </div>
            ))}
        </div>
    );
};

// Customer Analytics Modal (No change)
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

// Report Modal (No change)
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

// Period Filter Buttons (No change)
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
                            ? 'bg-[#135918] text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }
                    `}
                >
                    {period.label}
                </button>
            ))}
        </div>
    );
};

// Main Component
const SalesAnalytics = () => {
  const [salesData, setSalesData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [filterPeriod, setFilterPeriod] = useState('month'); 
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCustomerAnalyticsModal, setShowCustomerAnalyticsModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [exportScope, setExportScope] = useState('all');

  const { showAlert } = useAlert();
  
  useEffect(() => {
    fetchSalesData();
  }, []);
  
  useEffect(() => {
    applyFilter(filterPeriod);
  }, [salesData, filterPeriod]);

  const fetchSalesData = async () => {
    try {
      const productsRef = collection(db, 'products');
      const productsSnapshot = await getDocs(productsRef);

      if (!productsSnapshot.empty) {
        const soldProducts = productsSnapshot.docs
          .filter(doc => doc.data().status === 'sold')
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              price: parseFloat(data.finalPrice) || parseFloat(data.price) || 0,
              date: data.soldAt || data.createdAt,
              customer: data.highestBidder || 'Unknown',
              product: data.name || 'Unknown Product',
              category: data.category || 'Uncategorized',
              // Set a default of 'pending' if orderStatus is not defined, 
              // as per the common flow for a sold item awaiting fulfillment.
              status: data.orderStatus || 'pending', 
            };
          });
        setSalesData(soldProducts);
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

  // applyFilter remains the same (No change)
  const applyFilter = (period) => {
    let finalStartDate = null;
    const now = new Date();

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
    }
    
    const finalEndDate = now;

    const filtered = salesData.filter(sale => {
      let saleDate;
      if (sale.date?.seconds) {
        saleDate = new Date(sale.date.seconds * 1000);
      } else if (typeof sale.date === 'string') {
        saleDate = new Date(sale.date);
      } else {
        saleDate = new Date(0);
      }

      const isAfterStartDate = saleDate >= finalStartDate;
      const isBeforeEndDate = saleDate <= finalEndDate;

      return isAfterStartDate && isBeforeEndDate;
    });

    setFilteredData(filtered);
    setCurrentPage(1);
  };

  /**
   * UPDATED: Groups the raw order statuses into the requested categories for the pie chart.
   */
  const calculateStats = (data) => {
    const cleanedData = data.map(sale => ({
      ...sale,
      price: parseFloat(sale.price) || 0
    }));

    const totalSales = cleanedData.reduce((sum, sale) => sum + (sale.price || 0), 0);
    const totalOrders = cleanedData.length;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    
    // --- START OF REQUIRED CHANGE ---
    const statusCounts = cleanedData.reduce((acc, sale) => {
      const rawStatus = sale.status ? sale.status.toLowerCase() : 'pending';
      let groupedStatus;

      switch (rawStatus) {
        case 'pending':
          groupedStatus = 'Pending';
          break;
        case 'shipped':
          groupedStatus = 'Shipped';
          break;
        case 'delivered':
          groupedStatus = 'Delivered';
          break;
        case 'rated': // Mapped the final state ('rated') to 'Completed'
        case 'completed': // Include 'completed' just in case
          groupedStatus = 'Completed';
          break;
        default:
          groupedStatus = 'Other';
          break;
      }

      acc[groupedStatus] = (acc[groupedStatus] || 0) + 1;
      return acc;
    }, {});
    // --- END OF REQUIRED CHANGE ---
    
    const categorySales = cleanedData.reduce((acc, sale) => {
      const category = sale.category || 'uncategorized';
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
      statusCounts, // This now holds the new grouped statuses
      categorySales
    };
  };

  const stats = calculateStats(filteredData);

  const cardStats = [
    { id: 'sales', label: 'Total Sales', value: stats.totalSales, icon: PhilippinePeso, bgColor: 'bg-green-100', iconColor: 'text-green-600' },
    { id: 'orders', label: 'Total Orders', value: stats.totalOrders, icon: Package, bgColor: 'bg-blue-100', iconColor: 'text-blue-600' },
    { id: 'avgOrder', label: 'Average Order', value: stats.avgOrderValue, isCurrency: true, icon: Users, bgColor: 'bg-purple-100', iconColor: 'text-purple-600' },
    { id: 'conversion', label: 'Conversion Rate', value: '68.5%', isRate: true, icon: TrendingUp, bgColor: 'bg-orange-100', iconColor: 'text-orange-600' },
  ];

  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
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

  /**
   * UPDATED: Maps the new grouped status names to specific colors for the table and pie chart legend.
   */
  const getStatusColor = (status) => {
    // The status here will be the RAW status from the database, but we map its visual representation
    // to match the logical flow of the new grouped chart names.
    const rawStatus = status ? status.toLowerCase() : 'pending';

    switch (rawStatus) {
      case 'rated': 
      case 'completed': 
        return 'bg-green-100 text-green-800'; // Completed/Rated gets a 'final' color
      case 'delivered': 
        return 'bg-teal-100 text-teal-800'; // Delivered
      case 'shipped': 
        return 'bg-purple-100 text-purple-800'; // Shipped/In Transit
      case 'pending': 
        return 'bg-yellow-100 text-yellow-800'; // Pending/Processing
      default: 
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleGenerateReport = () => setShowReportModal(true);
  const handleViewCustomerAnalytics = () => setShowCustomerAnalyticsModal(true);
  
  const handleExportData = (scope) => {
    setExportScope(scope);
    setShowExportModal(true);
  };
  
  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };
  
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

  const categoryChartData = Object.entries(stats.categorySales).map(([category, sales]) => ({
    name: category,
    sales: sales
  })).sort((a, b) => b.sales - a.sales); 

  // --- START OF PIE CHART DATA USING NEW GROUPED STATUSES ---
  const statusChartData = Object.entries(stats.statusCounts).map(([status, count]) => ({
    name: status,
    value: count
  })).sort((a, b) => b.value - a.value); 
  // --- END OF PIE CHART DATA USING NEW GROUPED STATUSES ---

  const PIE_COLORS_STATUS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#14b8a6'];
  const PIE_COLORS_CATEGORY = ['#8b5cf6', '#f59e0b', '#10b981', '#3b82f6', '#ec4899'];

  return (
    <div className="min-h-screen bg-cream">
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
            <div className="text-right">
              <p className="text-6xl font-bold text-white leading-none">{formatPrice(stats.totalSales)}</p>
              <p className="text-green-300 mt-1">Total Sales ({filterPeriod})</p>
            </div>
          </div>

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 mb-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                  <h2 className="text-xl font-semibold text-secondary mb-4 md:mb-0">Filter Data Period</h2>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                      <PeriodFilterButtons 
                          currentPeriod={filterPeriod} 
                          onPeriodChange={handlePeriodChange} 
                      />
                  </div>
              </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="card bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-secondary mb-4">Items by Order Status</h3>
              {statusChartData.length > 0 ? (
                <div className="flex flex-col xl:flex-row items-center justify-center">
                    <ResponsiveContainer width="100%" height={300} className="xl:w-3/5">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        outerRadius={90}
                        fill="#8884d8"
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS_STATUS[index % PIE_COLORS_STATUS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value} item(s)`} />
                    </PieChart>
                  </ResponsiveContainer>
                    <div className="xl:w-2/5 xl:ml-6 mt-4 xl:mt-0">
                        <CustomPieChartLegend data={statusChartData} colors={PIE_COLORS_STATUS} />
                    </div>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No data available
                </div>
              )}
            </div>

            <div className="card bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-secondary mb-4">Sales by Category</h3>
              {categoryChartData.length > 0 ? (
                <div className="flex flex-col xl:flex-row items-center justify-center">
                <ResponsiveContainer width="100%" height={300} className="xl:w-3/5">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      dataKey="sales"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      outerRadius={90}
                      fill="#8884d8"
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS_CATEGORY[index % PIE_COLORS_CATEGORY.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatPrice(value)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="xl:w-2/5 xl:ml-6 mt-4 xl:mt-0">
                    <CustomPieChartLegend data={categoryChartData.map(d => ({ name: d.name }))} colors={PIE_COLORS_CATEGORY} />
                </div>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No data available
                </div>
              )}
            </div>
          </div>

          <div className="card bg-white rounded-xl shadow-md p-6 border border-gray-100 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <h3 className="text-lg font-semibold text-secondary mb-2 sm:mb-0">Recent Sold Items</h3>
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
                        No sold items available for this period.
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
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(sale.status || 'pending')}`}>
                            {(sale.status || 'PENDING').toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

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