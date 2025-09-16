"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Alert,
  Dimensions,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { collection, onSnapshot, updateDoc, doc, getDoc, addDoc } from "firebase/firestore"
import { db } from "../firebase/firebase"
import { useAuth } from "../AuthContext"
import LoadingScreen from "../hooks/LoadingScreen"

export default function WinBiddingScreen({ navigation }) {
  const { currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState("pending")
  const [winningBids, setWinningBids] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal states
  const [imageModalVisible, setImageModalVisible] = useState(false)
  const [selectedImages, setSelectedImages] = useState([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [ratingModalVisible, setRatingModalVisible] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState("")

  // Statistics
  const [stats, setStats] = useState({
    pending: 0,
    shipped: 0,
    delivered: 0,
    rated: 0,
    total: 0
  })

  useEffect(() => {
    if (!currentUser?.uid) return

    const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
      const wonItems = []

      snapshot.docs.forEach((d) => {
        const data = d.data()
        const userBid = data.bids?.find((bid) => bid.bidderId === currentUser.uid)

        // Check if user won this auction
        if (
          userBid && 
          (data.status === "sold" && data.highestBidder === userBid.bidderName) ||
          (data.winnerBidderId === currentUser.uid)
        ) {
          wonItems.push({
            id: d.id,
            title: data.name,
            winningBid: userBid.amount,
            category: data.category || "",
            image: data.imageUrls?.[0] || "https://via.placeholder.com/120x120/CCCCCC/FFFFFF?text=Won+Item",
            description: data.description || "No description available",
            length: data.length || "N/A",
            width: data.width || "N/A",
            orderStatus: data.orderStatus || "pending", // pending, shipped, delivered, rated
            orderDate: data.orderDate || new Date().toISOString(),
            shippingDate: data.shippingDate || null,
            deliveryDate: data.deliveryDate || null,
            trackingNumber: data.trackingNumber || null,
            rating: data.userRating || null,
            review: data.userReview || null,
            raw: data,
          })
        }
      })

      setWinningBids(wonItems)

      // Calculate statistics
      const newStats = {
        pending: wonItems.filter(item => item.orderStatus === "pending").length,
        shipped: wonItems.filter(item => item.orderStatus === "shipped").length,
        delivered: wonItems.filter(item => item.orderStatus === "delivered").length,
        rated: wonItems.filter(item => item.orderStatus === "rated").length,
        total: wonItems.length
      }
      setStats(newStats)

      setLoading(false)
    })

    return () => unsubscribe()
  }, [currentUser?.uid])

  const handleConfirmDelivery = async (item) => {
    Alert.alert(
      "Confirm Delivery",
      "Have you received this item?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Received",
          onPress: async () => {
            try {
              const productRef = doc(db, "products", item.id)
              await updateDoc(productRef, {
                orderStatus: "delivered",
                deliveryDate: new Date().toISOString(),
                updatedAt: new Date(),
              })
              Alert.alert("Success", "Delivery confirmed! You can now rate this item.")
            } catch (error) {
              console.error("Error confirming delivery:", error)
              Alert.alert("Error", "Failed to confirm delivery. Please try again.")
            }
          }
        }
      ]
    )
  }

  const handleRateItem = (item) => {
    setSelectedItem(item)
    setRating(item.rating || 0)
    setReview(item.review || "")
    setRatingModalVisible(true)
  }

  const submitRating = async () => {
    if (rating === 0) {
      Alert.alert("Rating Required", "Please select a rating before submitting.")
      return
    }

    try {
      const productRef = doc(db, "products", selectedItem.id)
      await updateDoc(productRef, {
        orderStatus: "rated",
        userRating: rating,
        userReview: review,
        ratedAt: new Date().toISOString(),
        updatedAt: new Date(),
      })

      // Optionally add to reviews collection
      await addDoc(collection(db, "reviews"), {
        productId: selectedItem.id,
        productName: selectedItem.title,
        userId: currentUser.uid,
        userName: currentUser.name || currentUser.email?.split("@")[0] || "Anonymous",
        rating: rating,
        review: review,
        createdAt: new Date().toISOString(),
      })

      Alert.alert("Thank You!", "Your rating and review have been submitted.")
      setRatingModalVisible(false)
      setRating(0)
      setReview("")
      setSelectedItem(null)
    } catch (error) {
      console.error("Error submitting rating:", error)
      Alert.alert("Error", "Failed to submit rating. Please try again.")
    }
  }

  const openImageViewer = (item) => {
    if (item.image && item.raw?.imageUrls) {
      setSelectedImages(item.raw.imageUrls)
      setCurrentImageIndex(0)
      setImageModalVisible(true)
    }
  }

  const getFilteredItems = () => {
    return winningBids.filter(item => item.orderStatus === activeTab)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "#F5A623"
      case "shipped":
        return "#4A90E2"
      case "delivered":
        return "#7ED321"
      case "rated":
        return "#135918"
      default:
        return "#888"
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return "hourglass-empty"
      case "shipped":
        return "local-shipping"
      case "delivered":
        return "check-circle"
      case "rated":
        return "star"
      default:
        return "help"
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  if (loading) {
    return <LoadingScreen message="Loading your winning bids..." />
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

  const renderStarRating = (currentRating, onPress = null, size = 24) => {
    return (
      <View style={styles.starContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onPress && onPress(star)}
            disabled={!onPress}
          >
            <Icon
              name={star <= currentRating ? "star" : "star-border"}
              size={size}
              color="#FFD700"
            />
          </TouchableOpacity>
        ))}
      </View>
    )
  }

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

  const renderRatingModal = () => (
    <Modal
      visible={ratingModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setRatingModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.ratingModalContainer}>
          <Text style={styles.modalTitle}>Rate Your Purchase</Text>
          {selectedItem && (
            <>
              <Text style={styles.modalItemTitle}>{selectedItem.title}</Text>
              
              <View style={styles.ratingSection}>
                <Text style={styles.ratingLabel}>How would you rate this item?</Text>
                {renderStarRating(rating, setRating, 32)}
              </View>

              <View style={styles.reviewSection}>
                <Text style={styles.reviewLabel}>Share your experience (optional):</Text>
                <TextInput
                  style={styles.reviewInput}
                  value={review}
                  onChangeText={setReview}
                  placeholder="Tell others about your experience with this item..."
                  multiline={true}
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={() => setRatingModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitButton} onPress={submitRating}>
                  <Text style={styles.submitButtonText}>Submit Rating</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  )

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>My Winning Bids</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Manage your won auctions • {stats.total} total wins
        </Text>
      </View>

      {/* Statistics Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.shipped}</Text>
          <Text style={styles.statLabel}>Shipped</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.delivered}</Text>
          <Text style={styles.statLabel}>Delivered</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.rated}</Text>
          <Text style={styles.statLabel}>Rated</Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {["pending", "shipped", "delivered", "rated"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Icon 
                name={getStatusIcon(tab)} 
                size={16} 
                color={activeTab === tab ? "white" : "#888"} 
              />
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
              {stats[tab] > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{stats[tab]}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          {getFilteredItems().length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name={getStatusIcon(activeTab)} size={48} color="#ccc" />
              <Text style={styles.emptyStateTitle}>No {activeTab} items</Text>
              <Text style={styles.emptyStateText}>
                {activeTab === "pending" && "Your won items will appear here once payment is processed."}
                {activeTab === "shipped" && "Items will show here once they've been shipped."}
                {activeTab === "delivered" && "Delivered items will appear here."}
                {activeTab === "rated" && "Items you've rated will appear here."}
              </Text>
            </View>
          ) : (
            getFilteredItems().map((item) => (
              <View key={item.id} style={styles.winningBidCard}>
                <TouchableOpacity onPress={() => openImageViewer(item)} activeOpacity={0.8}>
                  <Image source={{ uri: item.image }} style={styles.itemImage} />
                  {item.raw?.imageUrls && item.raw.imageUrls.length > 1 && (
                    <View style={styles.imageCountBadge}>
                      <Icon name="photo-library" size={12} color="white" />
                      <Text style={styles.imageCountText}>+{item.raw.imageUrls.length - 1}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.itemContent}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.orderStatus) }]}>
                      <Icon name={getStatusIcon(item.orderStatus)} size={12} color="white" />
                      <Text style={styles.statusText}>
                        {item.orderStatus.charAt(0).toUpperCase() + item.orderStatus.slice(1)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.itemDetails}>
                    <Text style={styles.descriptionText}>{item.description}</Text>
                    <View style={styles.measurementsContainer}>
                      <Text style={styles.measurementText}>Length: {item.length}″</Text>
                      <Text style={styles.measurementText}>Width: {item.width}″</Text>
                    </View>
                  </View>

                  <View style={styles.itemInfo}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Winning Bid:</Text>
                      <PesoAmount 
                        amount={item.winningBid} 
                        style={styles.winningBidAmount} 
                      />
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Order Date:</Text>
                      <Text style={styles.infoValue}>{formatDate(item.orderDate)}</Text>
                    </View>
                    {item.shippingDate && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Shipped:</Text>
                        <Text style={styles.infoValue}>{formatDate(item.shippingDate)}</Text>
                      </View>
                    )}
                    {item.deliveryDate && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Delivered:</Text>
                        <Text style={styles.infoValue}>{formatDate(item.deliveryDate)}</Text>
                      </View>
                    )}
                    {item.trackingNumber && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Tracking:</Text>
                        <Text style={styles.trackingNumber}>{item.trackingNumber}</Text>
                      </View>
                    )}
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    {item.orderStatus === "shipped" && (
                      <TouchableOpacity 
                        style={styles.deliveryButton}
                        onPress={() => handleConfirmDelivery(item)}
                      >
                        <Icon name="check-circle" size={16} color="white" />
                        <Text style={styles.deliveryButtonText}>Confirm Delivery</Text>
                      </TouchableOpacity>
                    )}
                    {item.orderStatus === "delivered" && (
                      <TouchableOpacity 
                        style={styles.rateButton}
                        onPress={() => handleRateItem(item)}
                      >
                        <Icon name="star" size={16} color="white" />
                        <Text style={styles.rateButtonText}>Rate Item</Text>
                      </TouchableOpacity>
                    )}
                    {item.orderStatus === "rated" && item.rating && (
                      <View style={styles.ratingDisplay}>
                        <Text style={styles.yourRatingText}>Your Rating:</Text>
                        {renderStarRating(item.rating, null, 20)}
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {renderImageViewer()}
      {renderRatingModal()}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFCF3",
  },
  header: {
    backgroundColor: "#2E6A2E",
    paddingTop: 30,
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
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    marginLeft: 40,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 15,
  },
  statCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2E6A2E",
  },
  statLabel: {
    fontSize: 11,
    color: "#666",
    marginTop: 2,
  },
  tabContainer: {
    backgroundColor: "white",
    marginHorizontal: 20,
    borderRadius: 25,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
  },
  activeTab: {
    backgroundColor: "#2E6A2E",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
    marginLeft: 6,
  },
  activeTabText: {
    color: "white",
  },
  tabBadge: {
    backgroundColor: "#FF4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  tabBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  winningBidCard: {
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
  itemImage: {
    width: "100%",
    height: 160,
    borderRadius: 10,
    marginBottom: 15,
  },
  imageCountBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  imageCountText: {
    color: "white",
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 2,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#135918",
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    color: "white",
    fontWeight: "600",
    marginLeft: 4,
  },
  itemDetails: {
    marginBottom: 15,
  },
  descriptionText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 8,
  },
  measurementsContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  measurementText: {
    fontSize: 13,
    color: "#444",
    marginRight: 15,
    fontWeight: "500",
  },
  itemInfo: {
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  winningBidAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2E6A2E",
  },
  trackingNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4A90E2",
  },
  pesoAmountContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  deliveryButton: {
    backgroundColor: "#7ED321",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  deliveryButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  rateButton: {
    backgroundColor: "#F5A623",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  rateButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  ratingDisplay: {
    flexDirection: "row",
    alignItems: "center",
  },
  yourRatingText: {
    fontSize: 14,
    color: "#666",
    marginRight: 8,
  },
  starContainer: {
    flexDirection: "row",
  },
  bottomPadding: {
    height: 100,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  ratingModalContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    margin: 20,
    width: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 15,
  },
  modalItemTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  ratingSection: {
    alignItems: "center",
    marginBottom: 25,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
  },
  reviewSection: {
    marginBottom: 25,
  },
  reviewLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  reviewInput: {
    borderWidth: 2,
    borderColor: "#2E6A2E",
    borderRadius: 10,
    padding: 15,
    fontSize: 14,
    color: "#333",
    minHeight: 100,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#F0F0F0",
    borderRadius: 10,
    paddingVertical: 15,
    marginRight: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  submitButton: {
    flex: 1,
    backgroundColor: "#2E6A2E",
    borderRadius: 10,
    paddingVertical: 15,
    marginLeft: 10,
    alignItems: "center",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
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
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: "white",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
})