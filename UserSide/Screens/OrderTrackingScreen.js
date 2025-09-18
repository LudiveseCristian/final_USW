"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native"
import { Feather } from "@expo/vector-icons"
import { useAuth } from "../AuthContext"
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, addDoc } from "firebase/firestore"
import { db } from "../firebase/firebase"
import LoadingScreen from "../hooks/LoadingScreen"

const { width, height } = Dimensions.get("window")

export default function OrderTrackingScreen({ navigation }) {
  const { currentUser } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [detailsModalVisible, setDetailsModalVisible] = useState(false)
  const [reviewModalVisible, setReviewModalVisible] = useState(false)
  const [reviewData, setReviewData] = useState({
    rating: 0,
    comment: "",
    orderId: null,
  })
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    if (!currentUser?.uid) return

    const ordersQuery = query(
      collection(db, "orders"),
      where("customerId", "==", currentUser.uid),
    )

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const ordersList = []
      snapshot.docs.forEach((doc) => {
        ordersList.push({
          id: doc.id,
          ...doc.data(),
        })
      })
        ordersList.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt)
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt)
        return dateB - dateA // Descending order
      })
      setOrders(ordersList)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [currentUser?.uid])

  const getOrderStatus = (status) => {
    const statusMap = {
      pending: {
        label: "Order Pending",
        icon: "clock",
        color: "#FFA500",
        bgColor: "#FFF8DC",
        description: "Your order is being reviewed"
      },
      confirmed: {
        label: "Order Confirmed",
        icon: "check-circle",
        color: "#4CAF50",
        bgColor: "#F0F8F0",
        description: "Your order has been confirmed"
      },
      preparing: {
        label: "Preparing Order",
        icon: "package",
        color: "#2196F3",
        bgColor: "#E3F2FD",
        description: "Your order is being prepared"
      },
      grab: {
        label: "Ready for Pickup",
        icon: "truck",
        color: "#FF9800",
        bgColor: "#FFF3E0",
        description: "Your order is ready for pickup"
      },
      shipping: {
        label: "Out for Delivery",
        icon: "navigation",
        color: "#9C27B0",
        bgColor: "#F3E5F5",
        description: "Your order is on the way"
      },
      delivered: {
        label: "Delivered",
        icon: "check",
        color: "#4CAF50",
        bgColor: "#E8F5E8",
        description: "Order delivered successfully"
      },
      completed: {
        label: "Completed",
        icon: "star",
        color: "#4CAF50",
        bgColor: "#E8F5E8",
        description: "Order completed"
      },
      cancelled: {
        label: "Cancelled",
        icon: "x-circle",
        color: "#F44336",
        bgColor: "#FFEBEE",
        description: "Order has been cancelled"
      },
      declined: {
        label: "Declined",
        icon: "x-circle",
        color: "#F44336",
        bgColor: "#FFEBEE",
        description: "Order has been declined"
      }
    }
    return statusMap[status] || statusMap.pending
  }

  const getStatusProgress = (status) => {
    const statusOrder = ["pending", "confirmed", "preparing", "grab", "shipping", "delivered"]
    const currentIndex = statusOrder.indexOf(status)
    return currentIndex >= 0 ? ((currentIndex + 1) / statusOrder.length) * 100 : 0
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A"
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleOrderDetails = (order) => {
    setSelectedOrder(order)
    setDetailsModalVisible(true)
  }

  const handleWriteReview = (order) => {
    setReviewData({
      rating: 0,
      comment: "",
      orderId: order.id,
    })
    setReviewModalVisible(true)
  }

  const submitReview = async () => {
    if (reviewData.rating === 0) {
      Alert.alert("Rating Required", "Please select a rating before submitting.")
      return
    }

    setSubmittingReview(true)
    try {
      // Add review to reviews collection
      await addDoc(collection(db, "reviews"), {
        orderId: reviewData.orderId,
        customerId: currentUser.uid,
        customerName: currentUser.name || "Anonymous",
        rating: reviewData.rating,
        comment: reviewData.comment,
        createdAt: new Date(),
      })

      // Update order status to completed with review
      const orderRef = doc(db, "orders", reviewData.orderId)
      await updateDoc(orderRef, {
        status: "completed",
        reviewSubmitted: true,
        lastUpdated: new Date(),
      })

      Alert.alert("Review Submitted", "Thank you for your feedback!")
      setReviewModalVisible(false)
      setReviewData({ rating: 0, comment: "", orderId: null })
    } catch (error) {
      console.error("Error submitting review:", error)
      Alert.alert("Error", "Failed to submit review. Please try again.")
    } finally {
      setSubmittingReview(false)
    }
  }

  const renderStarRating = (rating, onPress = null) => {
    return (
      <View style={styles.starContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onPress && onPress(star)}
            disabled={!onPress}
          >
            <Feather
              name="star"
              size={24}
              color={star <= rating ? "#FFD700" : "#E0E0E0"}
              style={star <= rating ? styles.filledStar : styles.emptyStar}
            />
          </TouchableOpacity>
        ))}
      </View>
    )
  }

  if (loading) {
    return <LoadingScreen message="Loading your orders..." />
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>My Orders</Text>
          <Text style={styles.headerDescription}>
            Track your order status and history
          </Text>
        </View>
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Feather name="package" size={80} color="#E0E0E0" />
          </View>
          <Text style={styles.emptyTitle}>No Orders Yet</Text>
          <Text style={styles.emptyMessage}>
            Your order history will appear here once you make your first purchase.
          </Text>
          <TouchableOpacity style={styles.shopButton} onPress={() => navigation.navigate("Home")}>
            <Feather name="shopping-bag" size={20} color="white" />
            <Text style={styles.shopButtonText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {orders.map((order) => {
            const statusInfo = getOrderStatus(order.status)
            const progress = getStatusProgress(order.status)
            const canReview = order.status === "delivered" && !order.reviewSubmitted

            return (
              <View key={order.id} style={styles.orderCard}>
                {/* Order Header */}
                <View style={styles.orderHeader}>
                  <View style={styles.orderHeaderLeft}>
                    <Text style={styles.orderId}>#{order.id.slice(-8)}</Text>
                    <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
                    <Feather name={statusInfo.icon} size={14} color={statusInfo.color} />
                    <Text style={[styles.statusText, { color: statusInfo.color }]}>
                      {statusInfo.label}
                    </Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${progress}%`, backgroundColor: statusInfo.color },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>{statusInfo.description}</Text>
                </View>

                {/* Order Items Preview */}
                <View style={styles.itemsPreview}>
                  {order.items && order.items.length > 0 ? (
                    <View style={styles.itemsList}>
                      {order.items.slice(0, 2).map((item, idx) => (
                        <View key={idx} style={styles.itemPreview}>
                          <Image source={{ uri: item.image }} style={styles.itemImage} />
                          <View style={styles.itemDetails}>
                            <Text style={styles.itemTitle} numberOfLines={1}>
                              {item.title}
                            </Text>
                            <Text style={styles.itemPrice}>₱{item.price?.toLocaleString()}</Text>
                          </View>
                        </View>
                      ))}
                      {order.items.length > 2 && (
                        <Text style={styles.moreItems}>+{order.items.length - 2} more items</Text>
                      )}
                    </View>
                  ) : (
                    <Text style={styles.noItems}>No items information available</Text>
                  )}
                </View>

                {/* Order Total */}
                <View style={styles.orderTotal}>
                  <Text style={styles.totalLabel}>Total Amount:</Text>
                  <Text style={styles.totalAmount}>₱{order.totalAmount?.toLocaleString()}</Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.detailsButton}
                    onPress={() => handleOrderDetails(order)}
                  >
                    <Feather name="eye" size={16} color="#2E6A2E" />
                    <Text style={styles.detailsButtonText}>View Details</Text>
                  </TouchableOpacity>

                  {canReview && (
                    <TouchableOpacity
                      style={styles.reviewButton}
                      onPress={() => handleWriteReview(order)}
                    >
                      <Feather name="star" size={16} color="white" />
                      <Text style={styles.reviewButtonText}>Write Review</Text>
                    </TouchableOpacity>
                  )}

                  {order.status === "cancelled" || order.status === "declined" ? (
                    <TouchableOpacity style={styles.reorderButton} onPress={() => navigation.navigate("Home")}>
                      <Feather name="refresh-cw" size={16} color="white" />
                      <Text style={styles.reorderButtonText}>Shop Again</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            )
          })}
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}

      {/* Order Details Modal */}
      <Modal
        visible={detailsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Order Details</Text>
                <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                  <Feather name="x" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {selectedOrder && (
                <View style={styles.modalContent}>
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Order Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Order ID:</Text>
                      <Text style={styles.detailValue}>#{selectedOrder.id.slice(-8)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Date:</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedOrder.createdAt)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status:</Text>
                      <Text style={[styles.detailValue, { color: getOrderStatus(selectedOrder.status).color }]}>
                        {getOrderStatus(selectedOrder.status).label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Delivery Address</Text>
                    <Text style={styles.addressText}>{selectedOrder.customerAddress}</Text>
                    <Text style={styles.contactText}>Phone: {selectedOrder.customerPhone}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Items Ordered</Text>
                    {selectedOrder.items?.map((item, idx) => (
                      <View key={idx} style={styles.modalItemCard}>
                        <Image source={{ uri: item.image }} style={styles.modalItemImage} />
                        <View style={styles.modalItemDetails}>
                          <Text style={styles.modalItemTitle}>{item.title}</Text>
                          <Text style={styles.modalItemCategory}>{item.category}</Text>
                          <Text style={styles.modalItemPrice}>₱{item.price?.toLocaleString()}</Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Payment Summary</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Subtotal:</Text>
                      <Text style={styles.detailValue}>₱{selectedOrder.subtotal?.toLocaleString()}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Shipping:</Text>
                      <Text style={styles.detailValue}>₱{selectedOrder.shippingFee?.toLocaleString()}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Service Fee:</Text>
                      <Text style={styles.detailValue}>₱{selectedOrder.serviceFee?.toLocaleString()}</Text>
                    </View>
                    <View style={[styles.detailRow, styles.totalRow]}>
                      <Text style={styles.totalLabel}>Total:</Text>
                      <Text style={styles.totalValue}>₱{selectedOrder.totalAmount?.toLocaleString()}</Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Review Modal */}
      <Modal
        visible={reviewModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Write a Review</Text>
              <TouchableOpacity onPress={() => setReviewModalVisible(false)}>
                <Feather name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.reviewContent}>
              <Text style={styles.reviewQuestion}>How was your order experience?</Text>
              
              {renderStarRating(reviewData.rating, (rating) =>
                setReviewData({ ...reviewData, rating })
              )}

              <Text style={styles.commentLabel}>Share your thoughts (optional):</Text>
              <TextInput
                style={styles.commentInput}
                multiline
                numberOfLines={4}
                placeholder="Tell us about your experience..."
                value={reviewData.comment}
                onChangeText={(text) => setReviewData({ ...reviewData, comment: text })}
                textAlignVertical="top"
              />

              <View style={styles.reviewButtons}>
                <TouchableOpacity
                  style={styles.cancelReviewButton}
                  onPress={() => setReviewModalVisible(false)}
                >
                  <Text style={styles.cancelReviewText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitReviewButton, submittingReview && styles.disabledButton]}
                  onPress={submitReview}
                  disabled={submittingReview}
                >
                  {submittingReview ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Feather name="send" size={16} color="white" />
                      <Text style={styles.submitReviewText}>Submit Review</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: Platform.OS === "ios" ? 0 : 20,
    paddingBottom: 25,
    paddingHorizontal: Math.max(20, width * 0.05),
    paddingTop: 30,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  backButton: {
    padding: 8,
    marginRight: 15,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: Math.min(28, width * 0.07),
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  headerDescription: {
    fontSize: Math.min(16, width * 0.04),
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "400",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Math.max(40, width * 0.1),
  },
  emptyIconContainer: {
    backgroundColor: "white",
    borderRadius: 50,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyTitle: {
    fontSize: Math.min(24, width * 0.06),
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  emptyMessage: {
    fontSize: Math.min(16, width * 0.04),
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  shopButton: {
    backgroundColor: "#2E6A2E",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shopButtonText: {
    color: "white",
    fontSize: Math.min(16, width * 0.04),
    fontWeight: "600",
    marginLeft: 8,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: Math.max(20, width * 0.05),
    paddingTop: 20,
  },
  orderCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: Math.max(16, width * 0.04),
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  orderHeaderLeft: {
    flex: 1,
  },
  orderId: {
    fontSize: Math.min(18, width * 0.045),
    fontWeight: "bold",
    color: "#135918",
    marginBottom: 4,
  },
  orderDate: {
    fontSize: Math.min(14, width * 0.035),
    color: "#666",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: Math.min(12, width * 0.03),
    fontWeight: "600",
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressText: {
    fontSize: Math.min(14, width * 0.035),
    color: "#666",
    fontStyle: "italic",
  },
  itemsPreview: {
    marginBottom: 16,
  },
  itemsList: {
    gap: 8,
  },
  itemPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  itemDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: Math.min(16, width * 0.04),
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: Math.min(14, width * 0.035),
    color: "#2E6A2E",
    fontWeight: "bold",
  },
  moreItems: {
    fontSize: Math.min(14, width * 0.035),
    color: "#666",
    fontStyle: "italic",
    marginTop: 4,
  },
  noItems: {
    fontSize: Math.min(14, width * 0.035),
    color: "#999",
    fontStyle: "italic",
  },
  orderTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: Math.min(16, width * 0.04),
    fontWeight: "600",
    color: "#333",
  },
  totalAmount: {
    fontSize: Math.min(18, width * 0.045),
    fontWeight: "bold",
    color: "#2E6A2E",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  detailsButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#2E6A2E",
    borderRadius: 8,
    gap: 6,
  },
  detailsButtonText: {
    color: "#2E6A2E",
    fontSize: Math.min(14, width * 0.035),
    fontWeight: "600",
  },
  reviewButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    backgroundColor: "#FFD700",
    borderRadius: 8,
    gap: 6,
  },
  reviewButtonText: {
    color: "white",
    fontSize: Math.min(14, width * 0.035),
    fontWeight: "600",
  },
  reorderButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    backgroundColor: "#2E6A2E",
    borderRadius: 8,
    gap: 6,
  },
  reorderButtonText: {
    color: "white",
    fontSize: Math.min(14, width * 0.035),
    fontWeight: "600",
  },
  bottomPadding: {
    height: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    margin: 20,
    width: "90%",
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  modalContent: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  addressText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    marginBottom: 4,
  },
  contactText: {
    fontSize: 14,
    color: "#666",
  },
  modalItemCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
  },
  modalItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  modalItemDetails: {
    flex: 1,
  },
  modalItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  modalItemCategory: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  modalItemPrice: {
    fontSize: 14,
    color: "#2E6A2E",
    fontWeight: "bold",
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2E6A2E",
  },
  // Review modal styles
  reviewContent: {
    padding: 20,
  },
  reviewQuestion: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  starContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    gap: 8,
  },
  filledStar: {
    marginHorizontal: 2,
  },
  emptyStar: {
    marginHorizontal: 2,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#F9F9F9",
    marginBottom: 20,
    minHeight: 100,
  },
  reviewButtons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelReviewButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
  },
  cancelReviewText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
  },
  submitReviewButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    backgroundColor: "#2E6A2E",
    borderRadius: 8,
    gap: 6,
  },
  submitReviewText: {
    fontSize: 16,
    color: "white",
    fontWeight: "bold",
  },
  disabledButton: {
    opacity: 0.7,
  },
})