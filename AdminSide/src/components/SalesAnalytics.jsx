import { useState, useEffect, useMemo } from 'react';
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
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';

// --- Helper Components ---

const CustomPieChartLegend = ({ data, colors }) => (
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

const CustomerAnalyticsModal = ({ onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-11/12 max-w-4xl mx-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-secondary">Customer Analytics</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-600">Feature coming soon. This section will display:</p>
        <ul className="list-disc list-inside mt-2 text-sm text-gray-700">
          <li>Top customers by total spend</li>
          <li>Customer acquisition trends</li>
          <li>Geographic distribution</li>
        </ul>
      </div>
    </div>
  </div>
);

const ReportModal = ({ onClose, onGenerate }) => (
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
          <select className="w-full border border-gray-300 rounded-lg p-2">
            <option>Monthly Sales Report</option>
            <option>Quarterly Performance</option>
            <option>Annual Summary</option>
          </select>
        </div>
        <div className="flex items-center">
            <input type="checkbox" className="mr-2" defaultChecked />
            <span className="text-sm">Include Charts</span>
        </div>
      </div>
      <div className="flex space-x-3">
        <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
        <button onClick={onGenerate} className="flex-1 px-4 py-2 bg-[#135918] text-white rounded-lg hover:bg-[#104e14]">Generate</button>
      </div>
    </div>
  </div>
);

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
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                        currentPeriod === period.value
                            ? 'bg-[#135918] text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                    {period.label}
                </button>
            ))}
        </div>
    );
};

const MonthFilterButtons = ({ selectedMonth, onMonthChange }) => {
    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    return (
        <div className="w-full mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider text-right">Select Month (Current Year)</p>
            <div className="flex flex-wrap justify-end gap-2">
                {months.map((month, index) => (
                    <button
                        key={month}
                        onClick={() => onMonthChange(index)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                            selectedMonth === index
                                ? 'bg-green-100 text-green-800 border border-green-200'
                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        {month}
                    </button>
                ))}
            </div>
        </div>
    );
};

// --- Main Component ---

const SalesAnalytics = () => {
  const [salesData, setSalesData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [filterPeriod, setFilterPeriod] = useState('month'); 
  // NEW STATE: Track specific month selection (0-11), default to current month
  const [selectedSpecificMonth, setSelectedSpecificMonth] = useState(new Date().getMonth());
  
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCustomerAnalyticsModal, setShowCustomerAnalyticsModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [exportScope, setExportScope] = useState('all');
  const itemsPerPage = 9;

  const { showAlert } = useAlert();
  
  const COLORS_STATUS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#14b8a6'];
  const COLORS_CATEGORY = ['#8b5cf6', '#f59e0b', '#10b981', '#3b82f6', '#ec4899'];

  useEffect(() => {
    fetchSalesData();
  }, []);
  
  // Trigger filter when Period OR Specific Month changes
  useEffect(() => {
    applyFilter(filterPeriod);
  }, [salesData, filterPeriod, selectedSpecificMonth]);

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
              status: data.orderStatus || 'pending', 
            };
          });
        setSalesData(soldProducts);
      } else {
        setSalesData([]);
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
      showAlert('error', 'Failed to fetch sales data.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = (period) => {
    let startDate = new Date(0);
    let endDate = new Date(); // Default end date is now
    const now = new Date();

    if (period === 'month') {
        // LOGIC CHANGE: If 'month' is selected, use the specific selected month of current year
        const currentYear = now.getFullYear();
        // Start of the selected month
        startDate = new Date(currentYear, selectedSpecificMonth, 1);
        // End of the selected month (last day)
        endDate = new Date(currentYear, selectedSpecificMonth + 1, 0, 23, 59, 59);
    } else {
        // Logic for other periods (Week, Quarter, Year, All) relative to TODAY
        switch (period) {
            case 'week':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
                break;
            case 'quarter':
                startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
                break;
            case 'year':
                startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                break;
            case 'all':
            default:
                startDate = new Date(0);
                break;
        }
    }
    
    const filtered = salesData.filter(sale => {
      let saleDate = sale.date?.seconds ? new Date(sale.date.seconds * 1000) : new Date(sale.date || 0);
      return saleDate >= startDate && saleDate <= endDate;
    });

    setFilteredData(filtered);
    setCurrentPage(1);
  };

  const calculateStats = (data) => {
    const cleanedData = data.map(sale => ({
      ...sale,
      price: parseFloat(sale.price) || 0
    }));

    const totalSales = cleanedData.reduce((sum, sale) => sum + (sale.price || 0), 0);
    const totalOrders = cleanedData.length;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    
    const statusCounts = cleanedData.reduce((acc, sale) => {
      const rawStatus = sale.status ? sale.status.toLowerCase() : 'pending';
      let groupedStatus = 'Other';
      
      if (rawStatus === 'pending') groupedStatus = 'Pending';
      else if (rawStatus === 'shipped') groupedStatus = 'Shipped';
      else if (rawStatus === 'delivered') groupedStatus = 'Delivered';
      else if (['rated', 'completed'].includes(rawStatus)) groupedStatus = 'Completed';

      acc[groupedStatus] = (acc[groupedStatus] || 0) + 1;
      return acc;
    }, {});
    
    const categorySales = cleanedData.reduce((acc, sale) => {
      const category = sale.category || 'uncategorized';
      let groupedCategory = category;
      if (['Jeans', 'Skirt', 'Longsleeve'].includes(category)) groupedCategory = 'Apparel';
      if (['Earrings', 'Watch', 'Accessories'].includes(category)) groupedCategory = 'Accessories';
      
      acc[groupedCategory] = (acc[groupedCategory] || 0) + (sale.price || 0);
      return acc;
    }, {});
    
    return { totalSales, totalOrders, avgOrderValue, statusCounts, categorySales };
  };

  const lineChartData = useMemo(() => {
    const grouped = filteredData.reduce((acc, item) => {
      let dateObj = item.date?.seconds ? new Date(item.date.seconds * 1000) : new Date(item.date);
      let key;

      // Use numeric day for Month/Week view, use Month name for Year/All view
      if (filterPeriod === 'year' || filterPeriod === 'all') {
        key = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      } else {
        key = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      if (!acc[key]) acc[key] = 0;
      acc[key] += item.price;
      return acc;
    }, {});

    return Object.keys(grouped).map(key => ({
      date: key,
      sales: grouped[key]
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [filteredData, filterPeriod]);

  const stats = calculateStats(filteredData);

  const formatPrice = (price) => `₱${(price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatDate = (dateField) => {
    if (!dateField) return 'N/A';
    return dateField.seconds ? new Date(dateField.seconds * 1000).toLocaleDateString() : new Date(dateField).toLocaleDateString();
  };
  
  const getStatusColor = (status) => {
    const s = status ? status.toLowerCase() : 'pending';
    if (['rated', 'completed'].includes(s)) return 'bg-green-100 text-green-800';
    if (s === 'delivered') return 'bg-teal-100 text-teal-800';
    if (s === 'shipped') return 'bg-purple-100 text-purple-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const categoryChartData = Object.entries(stats.categorySales)
    .map(([name, sales]) => ({ name, sales }))
    .sort((a, b) => b.sales - a.sales);

  const statusChartData = Object.entries(stats.statusCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const currentSales = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  if (loading) return <div className="min-h-screen bg-cream p-8 flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="min-h-screen bg-cream">
      <div className="bg-[#135918] rounded-b-3xl shadow-xl p-8 mb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-6">
          <div className="flex justify-between items-start py-4">
            <div>
              <h1 className="text-4xl font-extrabold text-white flex items-center">
                <BarChart3 className="w-8 h-8 mr-3 text-green-300" />
                Sales Analytics
              </h1>
              <p className="mt-2 text-green-300 text-lg">Track your sales performance and insights.</p>
            </div>
            <div className="text-right">
              <p className="text-6xl font-bold text-white leading-none">{formatPrice(stats.totalSales)}</p>
              <p className="text-green-300 mt-1">Total Sales ({filterPeriod === 'month' ? new Date(0, selectedSpecificMonth).toLocaleString('en', {month:'long'}) : filterPeriod})</p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Sales', value: stats.totalSales, icon: PhilippinePeso, color: 'text-green-600', bg: 'bg-green-100', isPrice: true },
              { label: 'Total Orders', value: stats.totalOrders, icon: Package, color: 'text-blue-600', bg: 'bg-blue-100' },
              { label: 'Avg Order', value: stats.avgOrderValue, icon: Users, color: 'text-purple-600', bg: 'bg-purple-100', isPrice: true },
              { label: 'Conversion', value: '68.5%', icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-100' },
            ].map((stat, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-green-700/30 text-white shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium opacity-80">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.isPrice ? formatPrice(stat.value) : stat.value.toLocaleString()}</p>
                  </div>
                  <div className={`${stat.bg} p-2 rounded-full`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 space-y-6 pb-8">
        
        {/* Updated ClassName: added 'sticky top-4 z-20'
           This makes the filter card stick to the top of the window as you scroll.
        */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 flex flex-col sticky top-4 z-20">
            <div className="flex flex-col md:flex-row justify-between items-center">
                <h2 className="text-xl font-semibold text-secondary mb-4 md:mb-0">Dashboard Period</h2>
                <PeriodFilterButtons currentPeriod={filterPeriod} onPeriodChange={setFilterPeriod} />
            </div>
            
            {/* Conditionally render Month buttons only if 'month' filter is active */}
            {filterPeriod === 'month' && (
                <MonthFilterButtons 
                    selectedMonth={selectedSpecificMonth} 
                    onMonthChange={setSelectedSpecificMonth} 
                />
            )}
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-secondary mb-4">Sales Trend</h3>
          {lineChartData.length > 0 ? (
             <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
            <div className="h-[300px] flex items-center justify-center text-gray-500">No trend data available for this period</div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-secondary mb-4">Items by Order Status</h3>
                {statusChartData.length > 0 ? (
                    <div className="flex flex-col xl:flex-row items-center justify-center">
                        <ResponsiveContainer width="100%" height={300} className="xl:w-3/5">
                            <PieChart>
                                <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                                    {statusChartData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS_STATUS[index % COLORS_STATUS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(value) => `${value} item(s)`} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="xl:w-2/5 xl:ml-6">
                            <CustomPieChartLegend data={statusChartData} colors={COLORS_STATUS} />
                        </div>
                    </div>
                ) : <div className="h-[300px] flex items-center justify-center text-gray-500">No data available</div>}
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-secondary mb-4">Sales by Category</h3>
                {categoryChartData.length > 0 ? (
                    <div className="flex flex-col xl:flex-row items-center justify-center">
                        <ResponsiveContainer width="100%" height={300} className="xl:w-3/5">
                            <PieChart>
                                <Pie data={categoryChartData} dataKey="sales" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                                    {categoryChartData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS_CATEGORY[index % COLORS_CATEGORY.length]} />)}
                                </Pie>
                                <Tooltip formatter={(value) => formatPrice(value)} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="xl:w-2/5 xl:ml-6">
                            <CustomPieChartLegend data={categoryChartData} colors={COLORS_CATEGORY} />
                        </div>
                    </div>
                ) : <div className="h-[300px] flex items-center justify-center text-gray-500">No data available</div>}
            </div>
        </div>

        {/* --- RECENT ITEMS TABLE --- */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                <h3 className="text-lg font-semibold text-secondary mb-2 sm:mb-0">Recent Sold Items</h3>
                <div className="flex space-x-2">
                    <button onClick={() => { setExportScope('page'); setShowExportModal(true); }} className="flex items-center px-4 py-2 bg-green-50 text-[#135918] border border-[#135918]/20 rounded-lg hover:bg-green-100 text-sm font-medium">
                        <Download className="h-4 w-4 mr-2" /> Export Page
                    </button>
                    <button onClick={() => { setExportScope('all-filtered'); setShowExportModal(true); }} className="flex items-center px-4 py-2 bg-[#135918] text-white rounded-lg hover:bg-[#104e14] text-sm font-medium">
                        <Download className="h-4 w-4 mr-2" /> Export All Filtered
                    </button>
                </div>
            </div>

            {/* Fixed height table container */}
            <div className="h-[500px] overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full relative">
                    <thead className="sticky top-0 z-10 bg-gray-50">
                        <tr className="border-b border-gray-200">
                            {['Date', 'Customer', 'Product', 'Category', 'Price', 'Status'].map(h => (
                                <th key={h} className="text-left py-3 px-4 font-medium text-gray-600 bg-gray-50">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {currentSales.length === 0 ? (
                            <tr><td colSpan="6" className="py-8 px-4 text-center text-gray-500">No sold items available for this period.</td></tr>
                        ) : (
                            currentSales.map((sale) => (
                                <tr key={sale.id} className="border-b border-gray-100 hover:bg-green-50">
                                    <td className="py-3 px-4 text-gray-600">{formatDate(sale.date)}</td>
                                    <td className="py-3 px-4 font-medium text-gray-800">{sale.customer}</td>
                                    <td className="py-3 px-4 text-gray-700">{sale.product}</td>
                                    <td className="py-3 px-4 text-gray-600">{sale.category}</td>
                                    <td className="py-3 px-4 font-bold text-[#135918]">{formatPrice(sale.price)}</td>
                                    <td className="py-3 px-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(sale.status)}`}>
                                            {sale.status.toUpperCase()}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {filteredData.length > itemsPerPage && (
                <div className="flex items-center justify-center mt-4 space-x-4">
                    <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">Previous</button>
                    <span className="text-gray-700">Page {currentPage} of {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">Next</button>
                </div>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-secondary mb-4">Quick Actions</h3>
                <div className="space-y-3">
                    <button onClick={() => setShowReportModal(true)} className="w-full bg-[#135918] text-white px-4 py-3 rounded-lg hover:bg-[#104e14] flex items-center justify-center space-x-2 font-medium">
                        <FileText className="h-4 w-4" /> <span>Generate Sales Report</span>
                    </button>
                    <button onClick={() => setShowCustomerAnalyticsModal(true)} className="w-full bg-green-50 text-[#135918] border border-[#135918]/20 px-4 py-3 rounded-lg hover:bg-green-100 flex items-center justify-center space-x-2 font-medium">
                        <BarChart3 className="h-4 w-4" /> <span>View Customer Analytics</span>
                    </button>
                    <button onClick={() => { setExportScope('all'); setShowExportModal(true); }} className="w-full bg-green-50 text-[#135918] border border-[#135918]/20 px-4 py-3 rounded-lg hover:bg-green-100 flex items-center justify-center space-x-2 font-medium">
                        <Download className="h-4 w-4" /> <span>Export All Data</span>
                    </button>
                </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                 <h3 className="text-lg font-semibold text-secondary mb-4">Summary Insights</h3>
                 <ul className="space-y-4">
                    <li className="flex items-start space-x-3">
                        <div className="bg-green-100 p-2 rounded-full"><TrendingUp className="h-4 w-4 text-green-600" /></div>
                        <div>
                            <p className="font-medium">Top Category</p>
                            <p className="text-sm text-gray-600">{categoryChartData[0]?.name || 'N/A'} ({formatPrice(categoryChartData[0]?.sales)})</p>
                        </div>
                    </li>
                    <li className="flex items-start space-x-3">
                        <div className="bg-blue-100 p-2 rounded-full"><Users className="h-4 w-4 text-blue-600" /></div>
                        <div>
                            <p className="font-medium">Top Status</p>
                            <p className="text-sm text-gray-600">{statusChartData[0]?.name || 'N/A'} ({statusChartData[0]?.value} items)</p>
                        </div>
                    </li>
                 </ul>
            </div>
        </div>

      </div>

      {showReportModal && <ReportModal onClose={() => setShowReportModal(false)} onGenerate={() => { setShowReportModal(false); showAlert('success', 'Report generated!'); }} />}
      {showExportModal && <ExportModal show={showExportModal} onClose={() => setShowExportModal(false)} data={exportScope === 'all' ? salesData : (exportScope === 'page' ? currentSales : filteredData)} />}
      {showCustomerAnalyticsModal && <CustomerAnalyticsModal onClose={() => setShowCustomerAnalyticsModal(false)} />}
    </div>
  );
};

export default SalesAnalytics;
