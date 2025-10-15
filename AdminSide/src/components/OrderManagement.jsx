import React, { useState, useEffect } from 'react'
import {
  Search,
  Truck,
  CheckCircle,
  Star,
  Clock,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  PhilippinePeso,
  Package,
  Tag,
  ThumbsUp,
  ListOrdered
} from 'lucide-react'
import { collection, onSnapshot, updateDoc, doc, addDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAlert } from "../contexts/alertContext"
// Assuming these are custom UI components
import { Button, Pagination, StatusBadge } from './ui'


// Helper component for displaying the rating stars
const RatingStars = ({ rating }) => {
  const fullStars = Math.floor(rating);
  const stars = [];
  for (let i = 0; i < 5; i++) {
    stars.push(
      <Star
        key={i}
        className={`w-4 h-4 ${i < fullStars ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
      />
    );
  }
  return <div className="flex space-x-0.5">{stars}</div>;
};


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
  const [itemsPerPage] = useState(8) 
  const { showAlert } = useAlert();

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
      const order = orders.find(o => o.id === orderId);

      if (newStatus === 'shipped') {
        updateData.shippingDate = new Date().toISOString()
        if (trackingNumber.trim()) {
          updateData.trackingNumber = trackingNumber.trim()
        }
      } else if (newStatus === 'delivered') {
        updateData.deliveryDate = new Date().toISOString()
        // Check if the order has a user rating/review upon delivery
        if (order?.userRating) {
          // Create feedback entry in feedbacks collection
          await addDoc(collection(db, 'feedbacks'), {
            orderId: orderId,
            productTitle: order.title,
            productImage: order.images[0] || null,
            userName: order.winnerName,
            userEmail: order.winnerEmail,
            rating: order.userRating,
            reviewText: order.userReview || '',
            status: 'pending',
            submittedAt: new Date().toISOString(),
            category: order.category
          });
        }
      } else if (newStatus === 'rated') {
        updateData.ratedAt = new Date().toISOString();
      }

      await updateDoc(doc(db, 'products', orderId), updateData)

      setEditingStatus(null)
      setTrackingNumber('')
      showAlert('success', `Order status updated to ${newStatus} successfully!`)
    } catch (error) {
      console.error('Error updating order status:', error)
      showAlert('error', 'Failed to update order status. Please try again.')
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
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'shipped':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rated':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'shipped':
        return <Truck className="w-4 h-4" />;
      case 'delivered':
        return <CheckCircle className="w-4 h-4" />;
      case 'rated':
        return <Star className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
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
    if (typeof amount !== 'number') return '₱0.00';
    return `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  const tabs = [
    { id: 'all', label: 'All Orders', count: stats.all, icon: ListOrdered },
    { id: 'pending', label: 'Pending', count: stats.pending, icon: Clock },
    { id: 'shipped', label: 'Shipped', count: stats.shipped, icon: Truck },
    { id: 'delivered', label: 'Delivered', count: stats.delivered, icon: CheckCircle },
    { id: 'rated', label: 'Completed', count: stats.rated, icon: Star }
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
      {/* HEADER STYLE: Darker Green */}
      <div className="bg-[#135918] rounded-b-3xl shadow-xl p-8 mb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-6">
          <div className="flex justify-between items-start py-4">
            <div>
              <h1 className="text-4xl font-extrabold text-white flex items-center">
                <ListOrdered className="w-8 h-8 mr-3 text-green-300" />
                Order Management Dashboard
              </h1>
              <p className="mt-2 text-green-300 text-lg">
                View, track, and manage all winning auction orders.
              </p>
            </div>
            {/* Main Total Order Stat */}
            <div className="text-right">
                <p className="text-6xl font-bold text-white leading-none">{stats.all}</p>
                <p className="text-green-300 mt-1">Total Orders</p>
            </div>
          </div>

          {/* Integrated Statistics Cards */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {tabs.filter(tab => tab.id !== 'all').map((tab) => {
              const Icon = tab.icon;
              return (
                <div 
                  key={tab.id} 
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-green-700/30 text-white shadow-md transition-all duration-300 hover:bg-white/20"
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-6 h-6 text-green-300" />
                    <div>
                      <p className="text-sm font-medium opacity-80">{tab.label}</p>
                      <p className="text-2xl font-bold">{tab.count}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* END HEADER STYLE */}

      {/* Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6 -mt-6">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search orders by title, winner name, email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-colors"
              />
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon || ListOrdered;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-[#135918] text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${tab.id !== 'all' ? 'mr-2' : ''}`} />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                      activeTab === tab.id
                        ? 'bg-white text-[#135918] font-bold'
                        : 'bg-gray-300 text-gray-700'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Orders Table List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-200">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No orders found</h3>
            <p className="text-gray-500">
              {searchTerm
                ? 'No orders match your search criteria.'
                : `No ${activeTab === 'all' ? '' : activeTab} orders available.`}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-x-auto border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Winner/Bid
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-green-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-12 h-12">
                          <img
                            className="w-12 h-12 object-cover rounded-md cursor-pointer"
                            src={order.images[0] || 'https://via.placeholder.com/120x120/CCCCCC/FFFFFF?text=No+Image'}
                            alt={order.title}
                            onClick={() => openImageModal(order.images, 0)}
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900 truncate max-w-xs">{order.title}</div>
                          <div className="text-xs text-gray-500 flex items-center mt-1">
                            <Tag className='w-3 h-3 mr-1' /> {order.category}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-800">{order.winnerName}</div>
                      <div className="text-xs text-green-700 font-bold flex items-center mt-1">
                        <PhilippinePeso className="w-3 h-3 mr-1" />
                        {formatCurrency(order.winningBid)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {/* Status Badge */}
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.orderStatus)}`}>
                        {getStatusIcon(order.orderStatus)}
                        <span className="ml-2 capitalize">{order.orderStatus}</span>
                      </div>
                      {/* Rating Indicator */}
                      {order.orderStatus === 'rated' && order.userRating && (
                        <div className='mt-2'>
                          <RatingStars rating={order.userRating} />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700 flex items-center">
                        <Calendar className="w-3 h-3 mr-1 text-gray-400" />
                        {formatDate(order.orderDate)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {order.trackingNumber ? `Tracking: ${order.trackingNumber}` : 'No tracking yet'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {/* Status Update/Action Buttons */}
                      <div className="flex flex-col space-y-2">
                        {order.orderStatus === 'pending' && (
                          <div className='w-full'>
                            {editingStatus === order.id ? (
                              <div className='space-y-1'>
                                <input
                                  type="text"
                                  placeholder="Tracking #"
                                  value={trackingNumber}
                                  onChange={(e) => setTrackingNumber(e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-green-500 focus:border-green-500"
                                />
                                <div className='flex gap-1'>
                                  <Button
                                    onClick={() => handleStatusUpdate(order.id, 'shipped')}
                                    className="flex-1 bg-blue-600 text-white px-2 py-1 text-xs hover:bg-blue-700"
                                    size="sm"
                                  >
                                    <Truck className="w-3 h-3 mr-1" /> Ship
                                  </Button>
                                  <Button
                                    onClick={() => setEditingStatus(null)}
                                    className="bg-gray-300 text-gray-700 px-2 py-1 text-xs hover:bg-gray-400"
                                    size="sm"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button
                                onClick={() => {
                                  setEditingStatus(order.id);
                                  setTrackingNumber(order.trackingNumber || '');
                                }}
                                className="w-full bg-blue-600 text-white px-3 py-2 text-sm hover:bg-blue-700"
                                size="sm"
                              >
                                <Truck className="w-4 h-4 mr-2" /> Ship
                              </Button>
                            )}
                          </div>
                        )}

                        {order.orderStatus === 'shipped' && (
                          <Button
                            onClick={() => handleStatusUpdate(order.id, 'delivered')}
                            className="w-full bg-green-600 text-white px-3 py-2 text-sm hover:bg-green-700"
                            size="sm"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" /> Delivered
                          </Button>
                        )}
                        
                        {order.orderStatus === 'delivered' && !order.userRating && (
                            <Button
                                onClick={() => handleStatusUpdate(order.id, 'rated')}
                                className="w-full bg-purple-600 text-white px-3 py-2 text-sm hover:bg-purple-700"
                                size="sm"
                            >
                                <ThumbsUp className="w-4 h-4 mr-2" /> Complete
                            </Button>
                        )}
                        
                        {/* Always show View Details */}
                        <Button
                          onClick={() => {
                            setSelectedOrder(order)
                            setShowModal(true)
                          }}
                          className="w-full bg-gray-600 text-white px-3 py-2 text-sm hover:bg-gray-700"
                          size="sm"
                        >
                          <Eye className="w-4 h-4 mr-2" /> View
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
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
                    <div className='pt-2'>
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedOrder.orderStatus)}`}>
                            {getStatusIcon(selectedOrder.orderStatus)}
                            <span className="ml-2 capitalize">{selectedOrder.orderStatus}</span>
                        </div>
                    </div>
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
              
              {/* Review/Rating Section */}
              {selectedOrder.userRating && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                    <Star className="w-4 h-4 mr-2 text-amber-500" /> User Feedback
                  </h3>
                  <div className="bg-amber-50 rounded-lg p-4 space-y-2 text-sm border border-amber-200">
                    <RatingStars rating={selectedOrder.userRating} />
                    <div className="font-medium text-gray-700">Review:</div>
                    <p className="text-gray-600 italic">"{selectedOrder.userReview || 'No review text provided.'}"</p>
                  </div>
                </div>
              )}
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

            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white bg-black bg-opacity-50 px-4 py-2 rounded-full z-10">
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