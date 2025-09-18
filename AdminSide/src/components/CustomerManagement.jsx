"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where } from "firebase/firestore"
import EmailModal from "../modals/EmailModal"
import { db } from "../firebase/config"
import {
  Users,
  Search,
  Mail,
  Phone,
  MapPin,
  ShoppingBag,
  Calendar,
  Eye,
  Edit,
  X,
  Send,
  Package,
  Trash,
  ChevronUp,
  ChevronDown,
  MoreVertical,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, Button, Pagination, LoadingSpinner, EmptyState, StatusBadge } from './ui'
import DeleteCustomerModal from "../modals/custumerPage/DeleteCustomerModal"
import ErrorModal from "../modals/custumerPage/ErrorModal"
import SuccessModal from "../modals/custumerPage/SuccessModal"
import OrdersModal from "../modals/custumerPage/OrdersModal"
import CustomerDetailModal from "../modals/custumerPage/CustomerDetailModal"

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const [sortOrder, setSortOrder] = useState("asc")
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showOrdersModal, setShowOrdersModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [emailData, setEmailData] = useState({ subject: "", message: "" })
  const [customerOrders, setCustomerOrders] = useState([])
  const [error, setError] = useState(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [modalMessage, setModalMessage] = useState("")
  const [modalTitle, setModalTitle] = useState("")
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingCustomer, setDeletingCustomer] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(5)
  const [dropdownOpen, setDropdownOpen] = useState(null)
  

  useEffect(() => {
    fetchCustomersWithOrderData()
  }, [])

  const fetchCustomersWithOrderData = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("Fetching users and orders from Firebase...")

      if (!db) {
        throw new Error("Firebase database not initialized")
      }

      // Fetch all users
      const usersRef = collection(db, "users")
      const usersSnapshot = await getDocs(usersRef)

      // Fetch all orders
      const ordersRef = collection(db, "orders")
      const ordersSnapshot = await getDocs(ordersRef)

      if (usersSnapshot.empty) {
        console.log("No users found in Firebase")
        setCustomers([])
        setError("No users found in database.")
        return
      }

      // Process orders data
      const ordersData = ordersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      console.log("Orders fetched from Firebase:", ordersData)

      // Process users data and calculate order statistics
      const usersData = usersSnapshot.docs.map((doc) => {
        const userData = doc.data()
        const userId = doc.id

        // Find orders for this user using customerId field
        const userOrders = ordersData.filter(order => order.customerId === userId)
        
        // Calculate statistics
        const totalOrders = userOrders.length
        const totalSpent = userOrders.reduce((sum, order) => sum + (order.price || 0), 0)
        
        // Get last order date
        const lastOrderDate = userOrders.length > 0 
          ? userOrders
              .map(order => order.date?.toDate ? order.date.toDate() : new Date(order.date))
              .sort((a, b) => b - a)[0]
          : null

        const formatLastOrder = (date) => {
          if (!date) return "Never"
          const now = new Date()
          const diffTime = Math.abs(now - date)
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          
          if (diffDays === 1) return "Today"
          if (diffDays === 2) return "Yesterday"
          if (diffDays <= 7) return `${diffDays - 1} days ago`
          if (diffDays <= 30) return `${Math.floor(diffDays / 7)} weeks ago`
          if (diffDays <= 365) return `${Math.floor(diffDays / 30)} months ago`
          return `${Math.floor(diffDays / 365)} years ago`
        }

        return {
          id: userId,
          name: `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || "Unknown User",
          email: userData.email || "No email",
          phone: userData.phone || userData.contactNumber || "No phone",
          address: userData.address || userData.location || "No address",
          status: "active", // You can implement logic to determine status based on your requirements
          totalOrders,
          totalSpent,
          lastOrder: formatLastOrder(lastOrderDate),
          preferences: ["Streetwear"], // You can modify this based on order categories or user data
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
          photoURL: userData.photoURL || "",
          uid: userData.uid || userId,
        }
      })

      console.log("Users with order data processed:", usersData)
      setCustomers(usersData)

    } catch (error) {
      console.error("Error fetching users and orders:", error)
      setError(`Failed to load data from Firebase: ${error.message}`)
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  const getCustomerOrders = async (customerId) => {
    try {
      console.log("Fetching orders for user:", customerId)

      if (!db) {
        throw new Error("Firebase database not initialized")
      }

      const ordersRef = collection(db, "orders")
      const q = query(ordersRef, where("customerId", "==", customerId))
      const ordersSnapshot = await getDocs(q)

      if (!ordersSnapshot.empty) {
        const ordersData = ordersSnapshot.docs.map((doc) => {
          const orderData = doc.data()
          return {
            id: doc.id,
            ...orderData,
            // Format the date for display
            formattedDate: orderData.date?.toDate 
              ? orderData.date.toDate().toLocaleDateString() 
              : new Date(orderData.date).toLocaleDateString(),
          }
        })
        console.log("Orders fetched from Firebase:", ordersData)
        return ordersData
      } else {
        console.log("No orders found in Firebase")
        return []
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
      return []
    }
  }

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("asc")
    }
  }

  const getSortIcon = (column) => {
    if (sortBy !== column) return null
    return sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
  }

  const sortedAndFilteredCustomers = customers
    .filter((customer) => {
      const matchesSearch =
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFilter = filterStatus === "all" || customer.status === filterStatus
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      let valueA, valueB

      switch (sortBy) {
        case "name":
          valueA = a.name.toLowerCase()
          valueB = b.name.toLowerCase()
          break
        case "email":
          valueA = a.email.toLowerCase()
          valueB = b.email.toLowerCase()
          break
        case "totalOrders":
          valueA = a.totalOrders
          valueB = b.totalOrders
          break
        case "totalSpent":
          valueA = a.totalSpent
          valueB = b.totalSpent
          break
        case "status":
          valueA = a.status.toLowerCase()
          valueB = b.status.toLowerCase()
          break
        default:
          valueA = a[sortBy]
          valueB = b[sortBy]
      }

      if (typeof valueA === "string" && typeof valueB === "string") {
        return sortOrder === "asc" ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA)
      }

      if (sortOrder === "asc") {
        return valueA > valueB ? 1 : -1
      } else {
        return valueA < valueB ? 1 : -1
      }
    })

  // Pagination
  const totalPages = Math.ceil(sortedAndFilteredCustomers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedCustomers = sortedAndFilteredCustomers.slice(startIndex, startIndex + itemsPerPage)

  // Calculate overall statistics
  const totalOrdersOverall = customers.reduce((sum, customer) => sum + customer.totalOrders, 0)
  const totalSpentOverall = customers.reduce((sum, customer) => sum + customer.totalSpent, 0)

  const formatPrice = (price) => {
    return `₱${price.toLocaleString()}`
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "inactive":
        return "bg-gray-100 text-gray-800"
      case "new":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getOrderStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "confirmed":
        return "bg-blue-100 text-blue-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleViewCustomer = (customer) => {
    setSelectedCustomer(customer)
    setShowCustomerModal(true)
    setDropdownOpen(null)
  }

  const handleViewOrders = async (customer) => {
    setSelectedCustomer(customer)
    setShowOrdersModal(true)
    setDropdownOpen(null)

    const orders = await getCustomerOrders(customer.id)
    setCustomerOrders(orders)
  }

  const handleSendEmail = (customer) => {
    setSelectedCustomer(customer)
    setEmailData({ subject: "", message: "" })
    setShowEmailModal(true)
    setDropdownOpen(null)
  }

  const confirmDeleteCustomer = (customer) => {
    setDeletingCustomer(customer)
    setShowDeleteModal(true)
    setDropdownOpen(null)
  }

  const handleSendEmailSubmit = () => {
    if (emailData.subject && emailData.message) {
      setShowEmailModal(false)
      setEmailData({ subject: "", message: "" })
      setModalTitle("Email Sent")
      setModalMessage(`Email sent to ${selectedCustomer.email} successfully!`)
      setShowSuccessModal(true)
    } else {
      setModalTitle("Validation Error")
      setModalMessage("Please fill in both subject and message.")
      setShowErrorModal(true)
    }
  }

  const handleDeleteCustomer = async () => {
    if (deletingCustomer) {
      try {
        console.log("Deleting user from Firebase:", deletingCustomer.id)
        const userRef = doc(db, "users", deletingCustomer.id)

        await deleteDoc(userRef)
        console.log("User deleted from Firebase successfully")

        setCustomers((prev) => prev.filter((c) => c.id !== deletingCustomer.id))

        setShowDeleteModal(false)
        setDeletingCustomer(null)
        setShowCustomerModal(false)

        setModalTitle("Success")
        setModalMessage(`User "${deletingCustomer.name}" has been deleted successfully!`)
        setShowSuccessModal(true)
      } catch (error) {
        console.error("Error deleting user:", error)
        setModalTitle("Error")
        setModalMessage(`Failed to delete user: ${error.message}`)
        setShowErrorModal(true)
      }
    }
  }

  if (loading) {
    return (
      <div className="p-8 bg-cream min-h-screen">
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 bg-cream min-h-screen">
      {error && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-yellow-600 hover:text-yellow-800 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-bold text-green-800 text-foreground mb-2">User Management</h1>
          <p className="text-muted-foreground text-green-700">Manage your user profiles and track their activity</p>
        </div>
      </div>

      {/* Customer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold text-foreground">{customers.length}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
              <p className="text-2xl font-bold text-foreground">{totalOrdersOverall}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <Package className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold text-foreground">{formatPrice(totalSpentOverall)}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <ShoppingBag className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avg Order Value</p>
              <p className="text-2xl font-bold text-foreground">
                {totalOrdersOverall > 0
                  ? formatPrice(Math.round(totalSpentOverall / totalOrdersOverall))
                  : formatPrice(0)}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 flex-1">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <input
                type="text"
                placeholder="Search users by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="md:w-48 px-3 py-2 border border-input rounded-lg bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            >
              <option value="all">All Users</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="new">New</option>
            </select>
          </div>
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedAndFilteredCustomers.length)} of{" "}
            {sortedAndFilteredCustomers.length} users
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center space-x-1">
                    <span>User</span>
                    {getSortIcon("name")}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("email")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Contact</span>
                    {getSortIcon("email")}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Status</span>
                    {getSortIcon("status")}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("totalOrders")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Orders</span>
                    {getSortIcon("totalOrders")}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("totalSpent")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Total Spent</span>
                    {getSortIcon("totalSpent")}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedCustomers.map((customer) => {
                return (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {customer.photoURL ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={customer.photoURL || "/placeholder.svg"}
                              alt={customer.name}
                            />
                          ) : (
                            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">
                                {customer.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .substring(0, 2)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground">{customer.name}</div>
                          <div className="text-sm text-muted-foreground">ID: {customer.id.substring(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground">
                        <div className="flex items-center mb-1">
                          <Mail className="h-4 w-4 text-muted-foreground mr-2" />
                          {customer.email}
                        </div>
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 text-muted-foreground mr-2" />
                          {customer.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(customer.status)}`}
                      >
                        {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      <div className="flex items-center">
                        <Package className="h-4 w-4 text-muted-foreground mr-2" />
                        {customer.totalOrders}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                      {formatPrice(customer.totalSpent)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground flex items-center">
                        <MapPin className="h-4 w-4 text-muted-foreground mr-2" />
                        <span className="truncate max-w-32" title={customer.address}>
                          {customer.address}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative">
                        <button
                          onClick={() => setDropdownOpen(dropdownOpen === customer.id ? null : customer.id)}
                          className="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-muted/50 transition-colors"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {dropdownOpen === customer.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-popover rounded-md shadow-lg z-10 border border-border">
                            <div className="py-1">
                              <button
                                onClick={() => handleViewCustomer(customer)}
                                className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground w-full text-left transition-colors"
                              >
                                <Eye className="h-4 w-4 mr-3" />
                                View Details
                              </button>
                              <button
                                onClick={() => handleViewOrders(customer)}
                                className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground w-full text-left transition-colors"
                              >
                                <Package className="h-4 w-4 mr-3" />
                                View Orders
                              </button>
                              <button
                                onClick={() => handleSendEmail(customer)}
                                className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground w-full text-left transition-colors"
                              >
                                <Send className="h-4 w-4 mr-3" />
                                Send Email
                              </button>
                              <button
                                onClick={() => confirmDeleteCustomer(customer)}
                                className="flex items-center px-4 py-2 text-sm text-destructive hover:bg-destructive/10 w-full text-left transition-colors"
                              >
                                <Trash className="h-4 w-4 mr-3" />
                                Delete User
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md text-foreground bg-card hover:bg-accent disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md text-foreground bg-card hover:bg-accent disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
                  <span className="font-medium">
                    {Math.min(startIndex + itemsPerPage, sortedAndFilteredCustomers.length)}
                  </span>{" "}
                  of <span className="font-medium">{sortedAndFilteredCustomers.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-border bg-card text-sm font-medium text-muted-foreground hover:bg-accent disabled:opacity-50 transition-colors"
                  >
                    Previous
                  </button>
                  {[...Array(totalPages)].map((_, index) => {
                    const page = index + 1
                    const isCurrentPage = page === currentPage
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ${
                          isCurrentPage
                            ? "z-10 bg-[#15440d] border-[#ffffff] text-white hover:bg-[#15440d] rounded-xl"
                            : "bg-card border-border text-foreground hover:bg-accent"
                        }`}
                      >
                        {page}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-border bg-card text-sm font-medium text-muted-foreground hover:bg-accent disabled:opacity-50 transition-colors"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Customer Detail Modal */}
      <CustomerDetailModal
        show={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        selectedCustomer={selectedCustomer}
        onSendEmail={handleSendEmail}
        onViewOrders={handleViewOrders}
        onDeleteCustomer={confirmDeleteCustomer}
      />

      {/* Orders Modal */}
      <OrdersModal
        show={showOrdersModal}
        onClose={() => setShowOrdersModal(false)}
        selectedCustomer={selectedCustomer}
        customerOrders={customerOrders}
      />

      {/* Email Modal */}
      {showEmailModal && selectedCustomer && (
            <EmailModal
                recipient={selectedCustomer.email}
                onClose={() => setShowEmailModal(false)}
            />
        )}

      {/* Success Modal */}
      <SuccessModal
        show={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={modalTitle}
        message={modalMessage}
      />

      {/* Error Modal */}
      <ErrorModal
          show={showErrorModal}
          onClose={() => setShowErrorModal(false)}
          title={modalTitle}
          message={modalMessage}
        />

      {/* Delete Confirmation Modal */}
        <DeleteCustomerModal 
          show={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteCustomer}
          customer={deletingCustomer || { name: '' }}
        />
    </div>
  )
}

export default CustomerManagement