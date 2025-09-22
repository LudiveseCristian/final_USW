import React, { useState, useEffect } from 'react'
import { 
  Search, 
  Filter, 
  Package, 
  Truck, 
  CheckCircle, 
  Star,
  Clock,
  Eye,
  Edit3,
  Camera,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  MapPin,
  Phone,
  Mail,
  DollarSign
} from 'lucide-react'
import { collection, onSnapshot, updateDoc, doc, addDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { Card, CardContent, CardHeader, CardTitle, Button, Pagination, LoadingSpinner, EmptyState, StatusBadge } from './ui'

const OrderManagement = () => {
  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImages, setSelectedImages] = useState([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [editingStatus, setEditingStatus] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Statistics
  const [stats, setStats] = useState({
    all: 0,
    pending: 0,
    shipped: 0,
    delivered: 0,
    rated: 0
  })

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const wonOrders = []

      snapshot.docs.forEach((d) => {
        const data = d.data()
        
        // Check if this is a won auction item
        if (data.status === 'sold' || data.winnerBidderId) {
          const winnerBid = data.bids?.find(bid => 
            bid.bidderName === data.highestBidder || 
            bid.bidderId === data.winnerBidderId
          )

          if (winnerBid) {
            wonOrders.push({
              id: d.id,
              title: data.name,
              category: data.category || 'Uncategorized',
              winningBid: winnerBid.amount,
              winnerName: winnerBid.bidderName,
              winnerEmail: winnerBid.bidderEmail,
              winnerId: winnerBid.bidderId,
              orderStatus: data.orderStatus || 'pending',
              orderDate: data.orderDate || new Date().toISOString(),
              shippingDate: data.shippingDate || null,
              deliveryDate: data.deliveryDate || null,
              ratedAt: data.ratedAt || null,
              trackingNumber: data.trackingNumber || '',
              userRating: data.userRating || null,
              userReview: data.userReview || '',
              images: data.imageUrls || [],
              description: data.description || 'No description available',
              length: data.length || 'N/A',
              width: data.width || 'N/A',
              raw: data
            })
          }
        }
      })

      // Sort by order date (newest first)
      wonOrders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
      
      setOrders(wonOrders)
      
      // Calculate statistics
      const newStats = {
        all: wonOrders.length,
        pending: wonOrders.filter(o => o.orderStatus === 'pending').length,
        shipped: wonOrders.filter(o => o.orderStatus === 'shipped').length,
        delivered: wonOrders.filter(o => o.orderStatus === 'delivered').length,
        rated: wonOrders.filter(o => o.orderStatus === 'rated').length
      }
      setStats(newStats)
      
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    let filtered = orders

    // Filter by tab
    if (activeTab !== 'all') {
      filtered = filtered.filter(order => order.orderStatus === activeTab)
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.winnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.winnerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredOrders(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }, [orders, activeTab, searchTerm])

  // Pagination logic
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentOrders = filteredOrders.slice(startIndex, endIndex)

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const updateData = {
        orderStatus: newStatus,
        updatedAt: new Date().toISOString()
      }

      if (newStatus === 'shipped') {
        updateData.shippingDate = new Date().toISOString()
        if (trackingNumber.trim()) {
          updateData.trackingNumber = trackingNumber.trim()
        }
      } else if (newStatus === 'delivered') {
        updateData.deliveryDate = new Date().toISOString()
      }

      await updateDoc(doc(db, 'products', orderId), updateData)
      
      setEditingStatus(null)
      setTrackingNumber('')
      alert(`Order status updated to ${newStatus} successfully!`)
    } catch (error) {
      console.error('Error updating order status:', error)
      alert('Failed to update order status. Please try again.')
    }
  }

  const openImageModal = (images, index = 0) => {
    setSelectedImages(images)
    setCurrentImageIndex(index)
    setShowImageModal(true)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'shipped':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'rated':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />
      case 'shipped':
        return <Truck className="w-4 h-4" />
      case 'delivered':
        return <Package className="w-4 h-4" />
      case 'rated':
        return <Star className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount) => {
    return `₱${amount.toLocaleString()}`
  }

  const tabs = [
    { id: 'all', label: 'All Orders', count: stats.all },
    { id: 'pending', label: 'Pending', count: stats.pending },
    { id: 'shipped', label: 'Shipped', count: stats.shipped },
    { id: 'delivered', label: 'Delivered', count: stats.delivered },
    { id: 'rated', label: 'Completed', count: stats.rated }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-[#135918] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-white">Order Management</h1>
            <p className="mt-2 text-green-100">
              Manage and track all winning auction orders • {stats.all} total orders
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {tabs.slice(1).map((tab) => (
            <div key={tab.id} className="bg-white rounded-xl shadow-md p-6 border border-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{tab.label}</p>
                  <p className="text-2xl font-bold text-[#135918]">{tab.count}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  {getStatusIcon(tab.id)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search orders by title, winner name, email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-green-200 rounded-lg focus:border-[#135918] focus:ring-2 focus:ring-green-200 transition-colors"
              />
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#135918] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.id !== 'all' && getStatusIcon(tab.id)}
                <span className={tab.id !== 'all' ? 'ml-2' : ''}>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    activeTab === tab.id
                      ? 'bg-white text-[#135918]'
                      : 'bg-gray-300 text-gray-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No orders found</h3>
            <p className="text-gray-500">
              {searchTerm
                ? 'No orders match your search criteria.'
                : `No ${activeTab === 'all' ? '' : activeTab} orders available.`}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {currentOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-green-100 hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Product Image and Info */}
                    <div className="lg:col-span-2">
                      <div className="flex space-x-4">
                        <div className="relative flex-shrink-0">
                          <img
                            src={order.images[0] || 'https://via.placeholder.com/120x120/CCCCCC/FFFFFF?text=No+Image'}
                            alt={order.title}
                            className="w-24 h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => openImageModal(order.images, 0)}
                          />
                          {order.images.length > 1 && (
                            <div className="absolute -top-2 -right-2 bg-green-700 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                              {order.images.length}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-green-800 mb-1 truncate">
                            {order.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {order.description}
                          </p>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            <span>Length: {order.length}″</span>
                            <span>Width: {order.width}″</span>
                            <span className="inline-flex items-center px-2 py-1 bg-gray-100 rounded">
                              {order.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Winner Info */}
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                        <User className="w-4 h-4 mr-2" />
                        Winner Details
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center text-gray-600">
                          <span className="font-medium">{order.winnerName}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Mail className="w-4 h-4 mr-2 text-gray-400" />
                          <span className="truncate">{order.winnerEmail}</span>
                        </div>
                        <div className="flex items-center text-green-700 font-bold">
                          <DollarSign className="w-4 h-4 mr-2" />
                          <span>{formatCurrency(order.winningBid)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Order Status and Actions */}
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                        <Package className="w-4 h-4 mr-2" />
                        Order Status
                      </h4>
                      <div className="space-y-3">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.orderStatus)}`}>
                          {getStatusIcon(order.orderStatus)}
                          <span className="ml-2 capitalize">{order.orderStatus}</span>
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            <span>Ordered: {formatDate(order.orderDate)}</span>
                          </div>
                          {order.shippingDate && (
                            <div className="flex items-center">
                              <Truck className="w-4 h-4 mr-2 text-gray-400" />
                              <span>Shipped: {formatDate(order.shippingDate)}</span>
                            </div>
                          )}
                          {order.deliveryDate && (
                            <div className="flex items-center">
                              <CheckCircle className="w-4 h-4 mr-2 text-gray-400" />
                              <span>Delivered: {formatDate(order.deliveryDate)}</span>
                            </div>
                          )}
                          {order.trackingNumber && (
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                              <span>Tracking: {order.trackingNumber}</span>
                            </div>
                          )}
                        </div>

                        {/* Status Update Buttons */}
                        <div className="flex flex-wrap gap-2">
                          {order.orderStatus === 'pending' && (
                            <div className="space-y-2 w-full">
                              {editingStatus === order.id ? (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    placeholder="Tracking number (optional)"
                                    value={trackingNumber}
                                    onChange={(e) => setTrackingNumber(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleStatusUpdate(order.id, 'shipped')}
                                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors flex items-center justify-center"
                                    >
                                      <Truck className="w-4 h-4 mr-1" />
                                      Ship
                                    </button>
                                    <button
                                      onClick={() => setEditingStatus(null)}
                                      className="px-3 py-2 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setEditingStatus(order.id)}
                                  className="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors flex items-center justify-center"
                                >
                                  <Truck className="w-4 h-4 mr-2" />
                                  Mark as Shipped
                                </button>
                              )}
                            </div>
                          )}
                          
                          {order.orderStatus === 'shipped' && (
                            <button
                              onClick={() => handleStatusUpdate(order.id, 'delivered')}
                              className="w-full bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors flex items-center justify-center"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Mark as Delivered
                            </button>
                          )}
                          
                          <button
                            onClick={() => {
                              setSelectedOrder(order)
                              setShowModal(true)
                            }}
                            className="w-full bg-gray-600 text-white px-3 py-2 rounded text-sm hover:bg-gray-700 transition-colors flex items-center justify-center"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </button>
                        </div>

                        {/* Rating Display */}
                        {order.userRating && (
                          <div className="border-t pt-3">
                            <div className="flex items-center mb-1">
                              <span className="text-sm font-medium text-gray-600 mr-2">Rating:</span>
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-4 h-4 ${
                                      star <= order.userRating
                                        ? 'text-yellow-400 fill-current'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            {order.userReview && (
                              <p className="text-sm text-gray-600 italic">"{order.userReview}"</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredOrders.length}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-green-800">Order Details</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Product Images */}
              {selectedOrder.images.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Product Images</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedOrder.images.map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`${selectedOrder.title} ${index + 1}`}
                        className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => openImageModal(selectedOrder.images, index)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Order Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Product Details</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Title:</strong> {selectedOrder.title}</div>
                    <div><strong>Category:</strong> {selectedOrder.category}</div>
                    <div><strong>Description:</strong> {selectedOrder.description}</div>
                    <div><strong>Dimensions:</strong> {selectedOrder.length}″ x {selectedOrder.width}″</div>
                    <div><strong>Winning Bid:</strong> {formatCurrency(selectedOrder.winningBid)}</div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Order Timeline</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Order Date:</strong> {formatDate(selectedOrder.orderDate)}</div>
                    {selectedOrder.shippingDate && (
                      <div><strong>Shipping Date:</strong> {formatDate(selectedOrder.shippingDate)}</div>
                    )}
                    {selectedOrder.deliveryDate && (
                      <div><strong>Delivery Date:</strong> {formatDate(selectedOrder.deliveryDate)}</div>
                    )}
                    {selectedOrder.ratedAt && (
                      <div><strong>Rated Date:</strong> {formatDate(selectedOrder.ratedAt)}</div>
                    )}
                    {selectedOrder.trackingNumber && (
                      <div><strong>Tracking Number:</strong> {selectedOrder.trackingNumber}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Winner Information */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Winner Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <div><strong>Name:</strong> {selectedOrder.winnerName}</div>
                  <div><strong>Email:</strong> {selectedOrder.winnerEmail}</div>
                  <div><strong>User ID:</strong> {selectedOrder.winnerId}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50">
          <div className="relative w-full h-full flex items-center justify-center">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>
            
            {selectedImages.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentImageIndex(prev => 
                    prev > 0 ? prev - 1 : selectedImages.length - 1
                  )}
                  className="absolute left-4 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-colors z-10"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setCurrentImageIndex(prev => 
                    prev < selectedImages.length - 1 ? prev + 1 : 0
                  )}
                  className="absolute right-4 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-colors z-10"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
            
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white bg-black bg-opacity-50 px-4 py-2 rounded-full">
              {currentImageIndex + 1} of {selectedImages.length}
            </div>
            
            <img
              src={selectedImages[currentImageIndex]}
              alt="Full size view"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderManagement