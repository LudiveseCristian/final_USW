import { useState, useEffect } from "react"
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Modal, 
  Dimensions,
  TextInput,
  RefreshControl
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { collection, onSnapshot } from "firebase/firestore"
import { db } from "../firebase/firebase"
import { useAuth } from "../AuthContext"
import LoadingScreen from "../hooks/LoadingScreen"
import { SafeAreaView } from "react-native-safe-area-context"

export default function OrderTrackingScreen({ navigation }) {
  const { currentUser } = useAuth()
  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Modal states
  const [imageModalVisible, setImageModalVisible] = useState(false)
  const [selectedImages, setSelectedImages] = useState([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [orderDetailModal, setOrderDetailModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)

  // Statistics
  const [stats, setStats] = useState({
    all: 0,
    pending: 0,
    shipped: 0,
    delivered: 0,
    rated: 0
  })

  useEffect(() => {
    if (!currentUser?.uid) return

    const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
      const userOrders = []

      snapshot.docs.forEach((d) => {
        const data = d.data()
        
        // Check if current user won this auction
        const userBid = data.bids?.find((bid) => bid.bidderId === currentUser.uid)
        
        if (
          (userBid && data.status === "sold" && data.highestBidder === userBid.bidderName) ||
          data.winnerBidderId === currentUser.uid
        ) {
          userOrders.push({
            id: d.id,
            title: data.name,
            category: data.category || "Uncategorized",
            winningBid: userBid?.amount || 0,
            orderStatus: data.orderStatus || 'pending',
            orderDate: data.orderDate || new Date().toISOString(),
            shippingDate: data.shippingDate || null,
            deliveryDate: data.deliveryDate || null,
            ratedAt: data.ratedAt || null,
            trackingNumber: data.trackingNumber || '',
            userRating: data.userRating || null,
            userReview: data.userReview || '',
            images: data.imageUrls || [],
            description: data.description || "No description available",
            length: data.length || "N/A",
            width: data.width || "N/A",
            raw: data,
          })
        }
      })

      // Sort by order date (newest first)
      userOrders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
      
      setOrders(userOrders)
      
      // Calculate statistics
      const newStats = {
        all: userOrders.length,
        pending: userOrders.filter(o => o.orderStatus === 'pending').length,
        shipped: userOrders.filter(o => o.orderStatus === 'shipped').length,
        delivered: userOrders.filter(o => o.orderStatus === 'delivered').length,
        rated: userOrders.filter(o => o.orderStatus === 'rated').length
      }
      setStats(newStats)
      
      setLoading(false)
      setRefreshing(false)
    })

    return () => unsubscribe()
  }, [currentUser?.uid])

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
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredOrders(filtered)
  }, [orders, activeTab, searchTerm])

  const onRefresh = () => {
    setRefreshing(true)
  }

  const openImageViewer = (images, index = 0) => {
    if (images && images.length > 0) {
      setSelectedImages(images)
      setCurrentImageIndex(index)
      setImageModalVisible(true)
    }
  }

  const openOrderDetail = (order) => {
    setSelectedOrder(order)
    setOrderDetailModal(true)
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return "#FFA726"
      case 'shipped':
        return "#42A5F5"
      case 'delivered':
        return "#66BB6A"
      case 'rated':
        return "#AB47BC"
      default:
        return "#9E9E9E"
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return "schedule"
      case 'shipped':
        return "local-shipping"
      case 'delivered':
        return "inventory"
      case 'rated':
        return "star"
      default:
        return "schedule"
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return "Order Placed"
      case 'shipped':
        return "In Transit"
      case 'delivered':
        return "Delivered"
      case 'rated':
        return "Completed"
      default:
        return "Unknown"
    }
  }

  const tabs = [
    { id: 'all', label: 'All', count: stats.all, icon: 'list' },
    { id: 'pending', label: 'Pending', count: stats.pending, icon: 'schedule' },
    { id: 'shipped', label: 'Shipped', count: stats.shipped, icon: 'local-shipping' },
    { id: 'delivered', label: 'Delivered', count: stats.delivered, icon: 'inventory' },
    { id: 'rated', label: 'Completed', count: stats.rated, icon: 'star' }
  ]

  if (loading) {
    return <LoadingScreen message="Loading your order tracking..." />
  }

  const PesoSymbol = ({ size = 16, color = "#2E6A2E" }) => (
    <Text style={{ fontSize: size, color, fontWeight: "bold" }}>₱</Text>
  )

  const PesoAmount = ({ amount, style }) => (
    <View style={styles.pesoAmountContainer}>
      <PesoSymbol size={style?.fontSize || 16} color={style?.color || "#2E6A2E"} />
      <Text style={[style, { marginLeft: 2 }]}>{amount.toLocaleString()}</Text>
    </View>
  )

  const renderImageViewer = () => (
    <Modal
      visible={imageModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setImageModalVisible(false)}
    >
      <View style={styles.imageModalContainer}>
        <View style={styles.imageModalHeader}>
          <Text style={styles.imageCounter}>
            {currentImageIndex + 1} of {selectedImages.length}
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={() => setImageModalVisible(false)}>
            <Icon name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const { width } = Dimensions.get("window")
            const index = Math.round(event.nativeEvent.contentOffset.x / width)
            setCurrentImageIndex(index)
          }}
          style={styles.imageScrollView}
        >
          {selectedImages.map((imageUrl, index) => (
            <View key={index} style={styles.imageSlideContainer}>
              <Image source={{ uri: imageUrl }} style={styles.fullScreenImage} resizeMode="contain" />
            </View>
          ))}
        </ScrollView>

        {selectedImages.length > 1 && (
          <View style={styles.imageDots}>
            {selectedImages.map((_, index) => (
              <View key={index} style={[styles.dot, currentImageIndex === index && styles.activeDot]} />
            ))}
          </View>
        )}
      </View>
    </Modal>
  )

  const renderOrderDetailModal = () => (
    <Modal
      visible={orderDetailModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setOrderDetailModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.orderDetailContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Order Details</Text>
            <TouchableOpacity onPress={() => setOrderDetailModal(false)}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {selectedOrder && (
              <>
                {/* Product Images */}
                {selectedOrder.images.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Product Images</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
                      {selectedOrder.images.map((image, index) => (
                        <TouchableOpacity key={index} onPress={() => openImageViewer(selectedOrder.images, index)}>
                          <Image source={{ uri: image }} style={styles.modalThumbnail} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Product Details */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Product Details</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Title:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.title}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Category:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.category}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Description:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.description}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Dimensions:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.length}″ x {selectedOrder.width}″</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Winning Bid:</Text>
                    <PesoAmount amount={selectedOrder.winningBid} style={styles.detailValue} />
                  </View>
                </View>

                {/* Order Timeline */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Order Timeline</Text>
                  <View style={styles.timelineContainer}>
                    <View style={[styles.timelineItem, { opacity: 1 }]}>
                      <View style={[styles.timelineIcon, { backgroundColor: getStatusColor('pending') }]}>
                        <Icon name="schedule" size={16} color="white" />
                      </View>
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineTitle}>Order Placed</Text>
                        <Text style={styles.timelineDate}>{formatDate(selectedOrder.orderDate)}</Text>
                      </View>
                    </View>

                    <View style={[styles.timelineItem, { opacity: selectedOrder.shippingDate ? 1 : 0.3 }]}>
                      <View style={[styles.timelineIcon, { backgroundColor: getStatusColor('shipped') }]}>
                        <Icon name="local-shipping" size={16} color="white" />
                      </View>
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineTitle}>Shipped</Text>
                        <Text style={styles.timelineDate}>
                          {selectedOrder.shippingDate ? formatDate(selectedOrder.shippingDate) : 'Pending'}
                        </Text>
                        {selectedOrder.trackingNumber && (
                          <Text style={styles.trackingText}>Tracking: {selectedOrder.trackingNumber}</Text>
                        )}
                      </View>
                    </View>

                    <View style={[styles.timelineItem, { opacity: selectedOrder.deliveryDate ? 1 : 0.3 }]}>
                      <View style={[styles.timelineIcon, { backgroundColor: getStatusColor('delivered') }]}>
                        <Icon name="inventory" size={16} color="white" />
                      </View>
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineTitle}>Delivered</Text>
                        <Text style={styles.timelineDate}>
                          {selectedOrder.deliveryDate ? formatDate(selectedOrder.deliveryDate) : 'Pending'}
                        </Text>
                      </View>
                    </View>

                    {selectedOrder.userRating && (
                      <View style={[styles.timelineItem, { opacity: 1 }]}>
                        <View style={[styles.timelineIcon, { backgroundColor: getStatusColor('rated') }]}>
                          <Icon name="star" size={16} color="white" />
                        </View>
                        <View style={styles.timelineContent}>
                          <Text style={styles.timelineTitle}>Rated & Reviewed</Text>
                          <Text style={styles.timelineDate}>
                            {selectedOrder.ratedAt ? formatDate(selectedOrder.ratedAt) : formatDate(selectedOrder.deliveryDate)}
                          </Text>
                          <View style={styles.ratingContainer}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Icon
                                key={star}
                                name={star <= selectedOrder.userRating ? "star" : "star-border"}
                                size={16}
                                color="#FFD700"
                                style={styles.starIcon}
                              />
                            ))}
                          </View>
                          {selectedOrder.userReview && (
                            <Text style={styles.reviewText}>"{selectedOrder.userReview}"</Text>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFCF3" }}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <Icon name="track-changes" size={32} color="white" />
            <Text style={styles.headerTitle}>Order Tracking</Text>
          </View>
          <Text style={styles.headerSubtitle}>Track your winning auction orders</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by title, order ID, or tracking number..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor="#999"
            />
            {searchTerm !== '' && (
              <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearButton}>
                <Icon name="clear" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, activeTab === tab.id && styles.activeTab]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Icon 
                  name={tab.icon} 
                  size={20} 
                  color={activeTab === tab.id ? "white" : "#2E6A2E"} 
                />
                <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View style={[styles.badge, activeTab === tab.id && styles.activeBadge]}>
                    <Text style={[styles.badgeText, activeTab === tab.id && styles.activeBadgeText]}>
                      {tab.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Orders List */}
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2E6A2E" />
          }
        >
          {filteredOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="inbox" size={64} color="#ccc" />
              <Text style={styles.emptyStateTitle}>
                {searchTerm ? 'No matching orders' : `No ${activeTab === 'all' ? '' : activeTab + ' '}orders found`}
              </Text>
              <Text style={styles.emptyStateText}>
                {searchTerm 
                  ? 'Try adjusting your search terms.' 
                  : 'Your orders will appear here when you win auctions.'}
              </Text>
            </View>
          ) : (
            <View style={styles.ordersContainer}>
              {filteredOrders.map((order, index) => (
                <View key={order.id} style={[styles.orderCard, index % 2 === 0 && styles.evenCard]}>
                  <View style={styles.orderHeader}>
                    <View style={styles.orderStatus}>
                      <Icon 
                        name={getStatusIcon(order.orderStatus)} 
                        size={20} 
                        color={getStatusColor(order.orderStatus)} 
                      />
                      <Text style={[styles.statusText, { color: getStatusColor(order.orderStatus) }]}>
                        {getStatusText(order.orderStatus)}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => openOrderDetail(order)} style={styles.detailButton}>
                      <Icon name="info-outline" size={20} color="#666" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.orderContent}>
                    <TouchableOpacity onPress={() => openImageViewer(order.images, 0)} activeOpacity={0.8}>
                      <Image 
                        source={{ uri: order.images[0] || 'https://via.placeholder.com/80x80/CCCCCC/FFFFFF?text=No+Image' }} 
                        style={styles.orderImage} 
                      />
                      {order.images.length > 1 && (
                        <View style={styles.imageCount}>
                          <Text style={styles.imageCountText}>{order.images.length}</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    <View style={styles.orderInfo}>
                      <Text style={styles.orderTitle} numberOfLines={2}>{order.title}</Text>
                      <Text style={styles.orderCategory}>{order.category}</Text>
                      <PesoAmount amount={order.winningBid} style={styles.orderPrice} />
                      
                      <View style={styles.orderMeta}>
                        <View style={styles.metaRow}>
                          <Icon name="event" size={14} color="#666" />
                          <Text style={styles.metaText}>{formatDate(order.orderDate)}</Text>
                        </View>
                        {order.trackingNumber && (
                          <View style={styles.metaRow}>
                            <Icon name="local-shipping" size={14} color="#666" />
                            <Text style={styles.metaText}>{order.trackingNumber}</Text>
                          </View>
                        )}
                        {order.userRating && (
                          <View style={styles.metaRow}>
                            <Icon name="star" size={14} color="#FFD700" />
                            <Text style={styles.metaText}>{order.userRating}/5 stars</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>

        {renderImageViewer()}
        {renderOrderDetailModal()}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFCF3",
  },
  header: {
    backgroundColor: "#2E6A2E",
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  clearButton: {
    padding: 5,
  },
  tabContainer: {
    paddingVertical: 10,
  },
  tabScrollContent: {
    paddingHorizontal: 15,
    gap: 10,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "white",
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#2E6A2E",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 6,
  },
  activeTab: {
    backgroundColor: "#2E6A2E",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2E6A2E",
  },
  activeTabText: {
    color: "white",
  },
  badge: {
    backgroundColor: "#2E6A2E",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  activeBadge: {
    backgroundColor: "white",
  },
  badgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  activeBadgeText: {
    color: "#2E6A2E",
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#666",
    marginTop: 20,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 24,
  },
  ordersContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  orderCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  evenCard: {
    backgroundColor: "#FAFAFA",
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  orderStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: "600",
  },
  detailButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
  },
  orderContent: {
    flexDirection: "row",
    gap: 12,
  },
  orderImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: "#F0F0F0",
  },
  imageCount: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#2E6A2E",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  imageCountText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  orderInfo: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
    lineHeight: 20,
  },
  orderCategory: {
    fontSize: 12,
    color: "#2E6A2E",
    fontWeight: "500",
    marginBottom: 6,
  },
  orderPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2E6A2E",
    marginBottom: 8,
  },
  orderMeta: {
    gap: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: "#666",
  },
  pesoAmountContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  bottomPadding: {
    height: 30,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  orderDetailContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  modalContent: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  imageRow: {
    flexDirection: "row",
  },
  modalThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: "#F0F0F0",
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 8,
    alignItems: "flex-start",
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    width: 100,
    marginRight: 10,
  },
  detailValue: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  timelineContainer: {
    paddingLeft: 10,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 2,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  trackingText: {
    fontSize: 12,
    color: "#2E6A2E",
    fontWeight: "500",
  },
  ratingContainer: {
    flexDirection: "row",
    marginTop: 4,
    marginBottom: 4,
  },
  starIcon: {
    marginRight: 2,
  },
  reviewText: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginTop: 4,
    lineHeight: 16,
  },

  // Image Modal Styles
  imageModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
  },
  imageModalHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 1000,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  imageCounter: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  imageScrollView: {
    flex: 1,
  },
  imageSlideContainer: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenImage: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height * 0.8,
  },
  imageDots: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },

  })