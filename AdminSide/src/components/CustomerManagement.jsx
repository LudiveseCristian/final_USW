"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where } from "firebase/firestore"
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
  const [itemsPerPage] = useState(10)
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

  const handleEditProfile = (customer) => {
    setEditingCustomer({ ...customer })
    setShowEditModal(true)
    setDropdownOpen(null)
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

  const handleSaveEdit = async () => {
    if (editingCustomer) {
      try {
        console.log("Updating user in Firebase:", editingCustomer.id)
        const userRef = doc(db, "users", editingCustomer.id)

        const nameParts = editingCustomer.name.trim().split(" ")
        const firstName = nameParts[0] || ""
        const lastName = nameParts.slice(1).join(" ") || ""

        await updateDoc(userRef, {
          firstName: firstName,
          lastName: lastName,
          email: editingCustomer.email,
          phone: editingCustomer.phone,
          contactNumber: editingCustomer.phone,
          address: editingCustomer.address,
          updatedAt: new Date().toISOString(),
        })
        console.log("User updated in Firebase successfully")

        setCustomers((prev) => prev.map((c) => (c.id === editingCustomer.id ? editingCustomer : c)))

        setShowEditModal(false)
        setEditingCustomer(null)
        setModalTitle("Success")
        setModalMessage("User profile updated successfully!")
        setShowSuccessModal(true)
      } catch (error) {
        console.error("Error updating user:", error)
        setModalTitle("Error")
        setModalMessage(`Failed to update user: ${error.message}`)
        setShowErrorModal(true)
      }
    }
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
      <div className="p-8 bg-[#FFFCF3] min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="bg-gray-200 rounded h-96"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 bg-[#FFFCF3] min-h-screen">
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
          <h1 className="text-3xl font-bold text-foreground mb-2">User Management</h1>
          <p className="text-muted-foreground">Manage your user profiles and track their activity</p>
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
                                onClick={() => handleEditProfile(customer)}
                                className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground w-full text-left transition-colors"
                              >
                                <Edit className="h-4 w-4 mr-3" />
                                Edit Profile
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
                            ? "z-10 bg-primary border-primary text-primary-foreground"
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
      {showCustomerModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl border border-gray-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
                <h2 className="text-xl font-semibold text-foreground">User Details</h2>
                <button
                  onClick={() => setShowCustomerModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Customer Info */}
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    {selectedCustomer.photoURL ? (
                      <img
                        src={selectedCustomer.photoURL || "/placeholder.svg"}
                        alt={selectedCustomer.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-primary font-semibold text-xl">
                        {selectedCustomer.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{selectedCustomer.name}</h3>
                    <p className="text-muted-foreground">{selectedCustomer.email}</p>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedCustomer.status)}`}
                    >
                      {selectedCustomer.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Phone</label>
                    <p className="text-foreground">{selectedCustomer.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Address</label>
                    <p className="text-foreground">{selectedCustomer.address}</p>
                  </div>
                </div>

                {/* Order History */}
                <div>
                  <h4 className="text-lg font-semibold text-foreground mb-3">Order History</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Orders</p>
                      <p className="text-2xl font-bold text-foreground">{selectedCustomer.totalOrders}</p>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Spent</p>
                      <p className="text-2xl font-bold text-primary">{formatPrice(selectedCustomer.totalSpent)}</p>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Last Order</p>
                      <p className="text-2xl font-bold text-foreground">{selectedCustomer.lastOrder}</p>
                    </div>
                  </div>
                </div>

                {/* Preferences */}
                <div>
                  <h4 className="text-lg font-semibold text-foreground mb-3">Preferences</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCustomer.preferences.map((pref, index) => (
                      <span key={index} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                        {pref}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => handleSendEmail(selectedCustomer)}
                    className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Send className="h-4 w-4" />
                    <span>Send Email</span>
                  </button>
                  <button
                    onClick={() => handleViewOrders(selectedCustomer)}
                    className="flex-1 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/90 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Package className="h-4 w-4" />
                    <span>View Orders</span>
                  </button>
                  <button
                    onClick={() => handleEditProfile(selectedCustomer)}
                    className="flex-1 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/90 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit Profile</span>
                  </button>
                  <button
                    onClick={() => confirmDeleteCustomer(selectedCustomer)}
                    className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <Trash className="h-4 w-4" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Orders Modal */}
      {showOrdersModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl border border-gray-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
                <h2 className="text-xl font-semibold text-foreground">Order History - {selectedCustomer.name}</h2>
                <button
                  onClick={() => setShowOrdersModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {customerOrders.length > 0 ? (
                  customerOrders.map((order) => (
                    <div key={order.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex space-x-4">
                          {order.productImage && (
                            <img
                              src={order.productImage}
                              alt={order.product}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                          )}
                          <div>
                            <h4 className="font-semibold text-foreground">{order.product}</h4>
                            <p className="text-sm text-muted-foreground">Category: {order.category}</p>
                            <p className="text-sm text-muted-foreground">Order ID: {order.id.substring(0, 8)}...</p>
                            <p className="text-sm text-muted-foreground">Date: {order.formattedDate}</p>
                            <p className="text-sm text-muted-foreground">Address: {order.address}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary text-lg">{formatPrice(order.price)}</p>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getOrderStatusColor(order.status)}`}
                          >
                            {order.status?.toUpperCase() || "PENDING"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No orders found for this user</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && editingCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full shadow-xl border border-gray-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4">
                <h2 className="text-xl font-semibold text-foreground">Edit User Profile</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Name</label>
                  <input
                    type="text"
                    value={editingCustomer.name}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
                  <input
                    type="email"
                    value={editingCustomer.email}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Phone</label>
                  <input
                    type="text"
                    value={editingCustomer.phone}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Address</label>
                  <input
                    type="text"
                    value={editingCustomer.address}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
                  <select
                    value={editingCustomer.status}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, status: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="new">New</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-3 pt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-foreground hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Email Modal */}
      {showEmailModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full shadow-xl border border-gray-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
                <h2 className="text-xl font-semibold text-foreground">Send Email to {selectedCustomer.name}</h2>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">To</label>
                  <input
                    type="email"
                    value={selectedCustomer.email}
                    disabled
                    className="w-full px-3 py-2 border border-input rounded-lg bg-muted text-muted-foreground"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Subject</label>
                  <input
                    type="text"
                    value={emailData.subject}
                    onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    placeholder="Enter email subject..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Message</label>
                  <textarea
                    value={emailData.message}
                    onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent h-32 resize-none"
                    placeholder="Enter your message..."
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-6">
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-foreground hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEmailSubmit}
                  className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center space-x-2 font-medium"
                >
                  <Send className="h-4 w-4" />
                  <span>Send Email</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full border border-gray-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-green-600">{modalTitle}</h2>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-foreground">{modalMessage}</p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full border border-gray-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-destructive">{modalTitle}</h2>
                <button
                  onClick={() => setShowErrorModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-foreground">{modalMessage}</p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowErrorModal(false)}
                  className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full border border-gray-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-destructive">Confirm Delete</h2>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-foreground">
                  Are you sure you want to delete user <strong>"{deletingCustomer.name}"</strong>? This action cannot be
                  undone.
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-foreground hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteCustomer}
                  className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors font-medium flex items-center justify-center space-x-2"
                >
                  <Trash className="h-4 w-4" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomerManagement