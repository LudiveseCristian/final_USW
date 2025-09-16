"use client"

import { useState, useEffect } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "../firebase/config"
import { useAlert } from "../contexts/alertContext"
import ExportModal from "../modals/ExportModal"
import {
  TrendingUp,
  DollarSign,
  Package,
  Users,
  Calendar,
  FileText,
  BarChart3,
  Download,
  X,
  Clock,
  Truck,
  CheckCircle,
  Star,
} from "lucide-react"
// ✅ Added imports for Recharts and Pie Chart components
import { Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
// Existing Modals
const CustomerAnalyticsModal = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-11/12 max-w-4xl mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-secondary">Customer Analytics</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
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
  )
}

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
  )
}

const SalesAnalytics = () => {
  const [salesData, setSalesData] = useState([])
  const [ordersData, setOrdersData] = useState([]) // Added orders data state
  const [productsData, setProductsData] = useState([]) // Added products data state
  const [filteredData, setFilteredData] = useState([])
  const [filterPeriod, setFilterPeriod] = useState("month")
  // ✅ Added state for custom date range
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showCustomerAnalyticsModal, setShowCustomerAnalyticsModal] = useState(false)

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [exportScope, setExportScope] = useState("all")

  const { showAlert } = useAlert()

  useEffect(() => {
    fetchAllData() // Updated to fetch all data types
  }, [])
  // Updated useEffect to apply filter based on period or custom dates
  useEffect(() => {
    applyFilter(filterPeriod, startDate, endDate)
  }, [salesData, ordersData, productsData, filterPeriod, startDate, endDate]) // Added new dependencies
  const fetchAllData = async () => {
    try {
      // Fetch orders data
      const ordersRef = collection(db, "orders")
      const ordersSnapshot = await getDocs(ordersRef)
      const orders = ordersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      // Fetch products data to get won auctions
      const productsRef = collection(db, "products")
      const productsSnapshot = await getDocs(productsRef)
      const products = productsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      // Process won auctions from products
      const wonOrders = []
      products.forEach((product) => {
        if (product.status === "sold" || product.winnerBidderId) {
          const winnerBid = product.bids?.find(
            (bid) => bid.bidderName === product.highestBidder || bid.bidderId === product.winnerBidderId,
          )

          if (winnerBid) {
            wonOrders.push({
              id: product.id,
              title: product.name,
              category: product.category,
              price: winnerBid.amount,
              winnerName: winnerBid.bidderName,
              winnerEmail: winnerBid.bidderEmail,
              orderStatus: product.orderStatus || "pending",
              orderDate: product.orderDate || new Date().toISOString(),
              shippingDate: product.shippingDate || null,
              deliveryDate: product.deliveryDate || null,
              ratedAt: product.ratedAt || null,
              type: "auction",
            })
          }
        }
      })

      setOrdersData(wonOrders)
      setProductsData(products)
      setSalesData([...orders, ...wonOrders]) // Combine all sales data
    } catch (error) {
      console.error("Error fetching data:", error)
      showAlert("error", "Failed to fetch sales data. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }

  const applyFilter = (period, customStartDate, customEndDate) => {
    let finalStartDate = null
    const now = new Date()

    // Determine the start date based on the selected period
    if (period === "custom" && customStartDate) {
      finalStartDate = new Date(customStartDate)
    } else {
      switch (period) {
        case "week":
          finalStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
          break
        case "month":
          finalStartDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
          break
        case "quarter":
          finalStartDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
          break
        case "year":
          finalStartDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
          break
        default:
          finalStartDate = new Date(0)
        // All time
      }
    }

    const filtered = salesData.filter((sale) => {
      const saleDate = sale.date?.seconds
        ? new Date(sale.date.seconds * 1000)
        : new Date(sale.createdAt?.seconds * 1000 || sale.timestamp?.seconds * 1000 || sale.date)

      const isAfterStartDate = finalStartDate ? saleDate >= finalStartDate : true
      const isBeforeEndDate = customEndDate ? saleDate <= new Date(customEndDate) : true

      return isAfterStartDate && isBeforeEndDate
    })

    setFilteredData(filtered)
    setCurrentPage(1) // Reset to first page whenever filter changes
  }
  const calculateStats = (data) => {
    const totalSales = data.reduce((sum, sale) => sum + (sale.price || 0), 0)
    const totalOrders = data.length
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0

    const statusCounts = data.reduce((acc, sale) => {
      const status = sale.orderStatus || sale.status || "pending"
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})

    const categorySales = data.reduce((acc, sale) => {
      const category = sale.category
      acc[category] = (acc[category] || 0) + (sale.price || 0)
      return acc
    }, {})
    return {
      totalSales,
      totalOrders,
      avgOrderValue,
      statusCounts,
      categorySales,
    }
  }

  const stats = calculateStats(filteredData)
  const totalItems = filteredData.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  // Calculate the sales for the current page
  const currentSales = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  const getPercentageChange = (currentValue, previousValue) => {
    if (previousValue === 0) return "+100%"
    const change = ((currentValue - previousValue) / previousValue) * 100
    return `${change > 0 ? "+" : ""}${change.toFixed(1)}%`
  }
  const getInsight = (stats) => {
    const sortedCategories = Object.entries(stats.categorySales).sort(([, a], [, b]) => b - a)
    const topCategory = sortedCategories.length > 0 ? sortedCategories[0][0] : null
    const sortedStatuses = Object.entries(stats.statusCounts).sort(([, a], [, b]) => b - a)
    const topStatus = sortedStatuses.length > 0 ? sortedStatuses[0][0] : null

    return { topCategory, topStatus }
  }

  const insights = getInsight(stats)
  const formatDate = (dateField) => {
    if (!dateField) return "N/A"
    if (dateField.seconds) {
      return new Date(dateField.seconds * 1000).toLocaleDateString()
    }
    return new Date(dateField).toLocaleDateString()
  }

  const formatPrice = (price) => `₱${(price || 0).toLocaleString()}`

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "shipped":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "delivered":
        return "bg-green-100 text-green-800 border-green-200"
      case "rated":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "available":
        return "bg-emerald-100 text-emerald-800 border-emerald-200"
      case "sold":
        return "bg-red-100 text-red-800 border-red-200"
      case "reserved":
        return "bg-amber-100 text-amber-800 border-amber-200"
      case "expired":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />
      case "shipped":
        return <Truck className="w-4 h-4" />
      case "delivered":
        return <Package className="w-4 h-4" />
      case "rated":
        return <Star className="w-4 h-4" />
      default:
        return <Package className="w-4 h-4" />
    }
  }
  const handleGenerateReport = () => setShowReportModal(true)
  const handleViewCustomerAnalytics = () => setShowCustomerAnalyticsModal(true)
  const handleExportData = (scope) => {
    setExportScope(scope)
    setShowExportModal(true)
  }
  // Pagination navigation functions
  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1))
  }

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
  }
  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        {" "}
        {/* Updated background to match OrderManagement theme */}
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mx-auto"></div>{" "}
          {/* Updated spinner color */}
          <p className="mt-4 text-lg text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  // ✅ Added data preparation for the category chart
  const categoryChartData = Object.entries(stats.categorySales).map(([category, sales]) => ({
    name: category,
    sales: sales,
  }))

  // ✅ Added data preparation for the status chart
  const statusChartData = Object.entries(stats.statusCounts).map(([status, count]) => ({
    name: status,
    value: count,
  }))

  // ✅ Added color palettes for the pie charts
  const PIE_COLORS_STATUS = ["#FCD34D", "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B"] // Yellow, Blue, Green, Purple, Orange
  const PIE_COLORS_CATEGORY = ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444"] // Green, Blue, Purple, Orange, Red

  return (
    <div className="min-h-screen bg-amber-50">
      {" "}
      {/* Updated background to match theme */}
      <div className="bg-green-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-white">Sales Analytics</h1>
            <p className="mt-2 text-green-100">
              Track your sales performance and insights • {stats.totalOrders} total orders
            </p>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 border border-green-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-green-800 mb-2">Filter Analytics</h2>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={filterPeriod}
                onChange={(e) => {
                  setFilterPeriod(e.target.value)
                  setStartDate(null)
                  setEndDate(null)
                }}
                className="px-4 py-2 border-2 border-green-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-colors"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
                <option value="all">All Time</option>
                <option value="custom">Custom Range</option>
              </select>
              {filterPeriod === "custom" && (
                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    value={startDate ? startDate.toISOString().substr(0, 10) : ""}
                    onChange={(e) => setStartDate(new Date(e.target.value))}
                    className="px-3 py-2 border-2 border-green-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="date"
                    value={endDate ? endDate.toISOString().substr(0, 10) : ""}
                    onChange={(e) => setEndDate(new Date(e.target.value))}
                    className="px-3 py-2 border-2 border-green-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6 border border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sales</p>
                <p className="text-2xl font-bold text-green-700">{formatPrice(stats.totalSales)}</p>
                <p className="text-sm text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  {getPercentageChange(
                    stats.totalSales,
                    salesData.reduce((sum, sale) => sum + (sale.price || 0), 0) / Math.max(salesData.length, 1),
                  )}{" "}
                  from average
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-green-700">{stats.totalOrders}</p>
                <p className="text-sm text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  {getPercentageChange(stats.totalOrders, Math.max(salesData.length / 4, 1))} growth
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Order</p>
                <p className="text-2xl font-bold text-green-700">{formatPrice(stats.avgOrderValue)}</p>
                <p className="text-sm text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Stable performance
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-green-700">
                  {stats.totalOrders > 0
                    ? Math.round(
                        (((stats.statusCounts.delivered || 0) + (stats.statusCounts.rated || 0)) / stats.totalOrders) *
                          100,
                      )
                    : 0}
                  %
                </p>
                <p className="text-sm text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Orders delivered/completed
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <CheckCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Status Chart */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-green-100">
            <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Orders by Status
            </h3>
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
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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

          {/* Category Sales Chart */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-green-100">
            <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Sales by Category
            </h3>
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
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="bg-white rounded-xl shadow-md border border-green-100">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold text-green-800 mb-2 sm:mb-0 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Recent Sales & Orders
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleExportData("page")}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Export Page
                </button>
                <button
                  onClick={() => handleExportData("all-filtered")}
                  className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors"
                >
                  Export All Filtered
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-6 font-medium text-gray-600">Date</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-600">Customer</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-600">Product</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-600">Category</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-600">Price</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {currentSales.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 px-6 text-center text-gray-500">
                      <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-lg font-medium">No sales data available</p>
                      <p className="text-sm">No sales match your current filter criteria.</p>
                    </td>
                  </tr>
                ) : (
                  currentSales.map((sale) => (
                    <tr key={sale.id} className="border-b border-gray-100 hover:bg-green-50 transition-colors">
                      <td className="py-4 px-6 text-gray-600">
                        {formatDate(sale.orderDate || sale.date || sale.createdAt || sale.timestamp)}
                      </td>
                      <td className="py-4 px-6 font-medium text-gray-900">
                        {sale.winnerName || sale.customer || sale.customerName || "N/A"}
                      </td>
                      <td className="py-4 px-6 text-gray-900">
                        {sale.title || sale.product || sale.productName || "N/A"}
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-700">
                          {sale.category || "N/A"}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-bold text-green-700">{formatPrice(sale.price)}</td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(sale.orderStatus || sale.status || "pending")}`}
                        >
                          {getStatusIcon(sale.orderStatus || sale.status || "pending")}
                          <span className="ml-1 capitalize">{sale.orderStatus || sale.status || "pending"}</span>
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
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
                {totalItems} results
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6 border border-green-100">
            <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Key Insights
            </h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 p-2 rounded-full">
                  <BarChart3 className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Best Performing Category</p>
                  <p className="text-sm text-gray-600">
                    {insights.topCategory
                      ? `${insights.topCategory} leads with ${formatPrice(stats.categorySales[insights.topCategory])} in sales.`
                      : "No category data available yet."}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <Package className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Order Status Distribution</p>
                  <p className="text-sm text-gray-600">
                    {insights.topStatus
                      ? `Most orders are in "${insights.topStatus}" status (${((stats.statusCounts[insights.topStatus] / stats.totalOrders) * 100).toFixed(1)}%).`
                      : "No status data available yet."}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-purple-100 p-2 rounded-full">
                  <Calendar className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Performance Trend</p>
                  <p className="text-sm text-gray-600">
                    {stats.totalOrders > 0
                      ? `${Math.round((((stats.statusCounts.delivered || 0) + (stats.statusCounts.rated || 0)) / stats.totalOrders) * 100)}% of orders have been successfully completed.`
                      : "Start processing orders to see performance trends."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-green-100">
            <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button
                onClick={handleGenerateReport}
                className="w-full bg-green-700 text-white px-4 py-3 rounded-lg hover:bg-green-800 transition-colors flex items-center justify-center space-x-2"
              >
                <FileText className="h-4 w-4" />
                <span>Generate Sales Report</span>
              </button>
              <button
                onClick={handleViewCustomerAnalytics}
                className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <BarChart3 className="h-4 w-4" />
                <span>View Customer Analytics</span>
              </button>
              <button
                onClick={() => handleExportData("all")}
                className="w-full bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Export All Data</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Modals */}
      {showReportModal && (
        <ReportModal
          onClose={() => setShowReportModal(false)}
          onGenerate={() => {
            setShowReportModal(false)
            showAlert("success", "Sales report generated successfully!")
          }}
        />
      )}
      {showExportModal && (
        <ExportModal
          show={showExportModal}
          onClose={() => setShowExportModal(false)}
          data={exportScope === "all" ? salesData : exportScope === "page" ? currentSales : filteredData}
        />
      )}
      {showCustomerAnalyticsModal && <CustomerAnalyticsModal onClose={() => setShowCustomerAnalyticsModal(false)} />}
    </div>
  )
}

export default SalesAnalytics
