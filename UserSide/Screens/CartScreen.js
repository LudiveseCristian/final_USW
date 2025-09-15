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
} from "react-native"
import { Feather } from "@expo/vector-icons"
import { useAuth } from "../AuthContext"
import { collection, onSnapshot, updateDoc, doc, arrayRemove } from "firebase/firestore"
import { db } from "../firebase/firebase"
import LoadingScreen from "../hooks/LoadingScreen"

const { width, height } = Dimensions.get("window")

export default function CartScreen({ route, navigation }) {
  const { currentUser } = useAuth()
  const [orderItem, setOrderItem] = useState(null)
  const [cartItems, setCartItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [declineModalVisible, setDeclineModalVisible] = useState(false)
  const [selectedDeclineItem, setSelectedDeclineItem] = useState(null)
  const [declining, setDeclining] = useState(false)

  useEffect(() => {
    // If navigated with an orderItem param, show it immediately
    if (route?.params?.orderItem) {
      setOrderItem(route.params.orderItem)
      setCartItems([route.params.orderItem])
      setLoading(false)
    }

    // Subscribe to won bids (successful bids) for current user
    if (currentUser?.uid) {
      const unsub = onSnapshot(collection(db, "products"), (snap) => {
        const nowon = []
        snap.docs.forEach((d) => {
          const data = d.data()
          // Find user's bid on this product
          const userBid = (data.bids || []).find((b) => b.bidderId === currentUser.uid)
          if (!userBid) return
          // Determine if user won: prefer explicit highestBidder, else compute
          const explicitWon =
            data.status === "sold" &&
            (data.highestBidder === userBid.bidderName || data.highestBidderId === currentUser.uid)
          let computedWon = false
          if (!explicitWon && Array.isArray(data.bids) && data.bids.length > 0) {
            const top = data.bids.reduce(
              (max, b) => (b.amount > (max?.amount || Number.NEGATIVE_INFINITY) ? b : max),
              null,
            )
            computedWon = data.status === "sold" && top && top.bidderId === currentUser.uid
          }
          if (explicitWon || computedWon) {
            const soldAt = data.soldAt?.toDate
              ? data.soldAt.toDate()
              : data.updatedAt?.toDate
                ? data.updatedAt.toDate()
                : new Date()
            nowon.push({
              id: d.id,
              title: data.name,
              category: data.category || "",
              image: data.imageUrls?.[0] || "https://via.placeholder.com/120x120/CCCCCC/FFFFFF?text=Item",
              myBid: userBid.amount,
              currentBid: data.currentBid || userBid.amount,
              orderId: data.orderId || (data.numericId ? `Id ${data.numericId}` : `Id ${d.id.slice(-4)}`),
              orderDate: soldAt.toISOString(),
              status: "won",
              userBid: userBid,
              productData: data,
            })
          }
        })
        // Sort by sold date desc
        nowon.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
        if (!route?.params?.orderItem) {
          setCartItems(nowon)
        }
        setLoading(false)
      })
      return () => unsub()
    }
  }, [currentUser?.uid, route?.params?.orderItem])

  const handleCheckout = () => {
    navigation.navigate("Checkout", { items: cartItems })
  }

  const handleDeclineBid = (item) => {
    setSelectedDeclineItem(item)
    setDeclineModalVisible(true)
  }

  const confirmDeclineBid = async () => {
    if (!selectedDeclineItem || !currentUser?.uid) return

    setDeclining(true)
    try {
      const productRef = doc(db, "products", selectedDeclineItem.id)
      
      // Remove the user's bid from the bids array
      await updateDoc(productRef, {
        bids: arrayRemove(selectedDeclineItem.userBid),
        updatedAt: new Date(),
      })

      // Also need to update currentBid if this was the highest bid
      const remainingBids = selectedDeclineItem.productData.bids?.filter(
        bid => bid.bidderId !== currentUser.uid
      ) || []

      if (remainingBids.length > 0) {
        // Find the new highest bid
        const newHighestBid = remainingBids.reduce((max, bid) => 
          bid.amount > max.amount ? bid : max
        )
        
        await updateDoc(productRef, {
          currentBid: newHighestBid.amount,
          highestBidder: newHighestBid.bidderName,
          highestBidderId: newHighestBid.bidderId,
        })
      } else {
        // No bids left, reset to minimum bid
        await updateDoc(productRef, {
          currentBid: selectedDeclineItem.productData.minimumBid || 0,
          highestBidder: null,
          highestBidderId: null,
        })
      }

      Alert.alert(
        "Bid Declined", 
        `You have successfully declined your bid for ${selectedDeclineItem.title}`,
        [
          {
            text: "OK",
            onPress: () => {
              setDeclineModalVisible(false)
              setSelectedDeclineItem(null)
              // Navigate back to Bidding screen
              navigation.navigate("Bidding")
            }
          }
        ]
      )
    } catch (error) {
      console.error("Error declining bid:", error)
      Alert.alert("Error", "Failed to decline bid. Please try again.")
    } finally {
      setDeclining(false)
    }
  }

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + (item.myBid || item.currentBid), 0)
  }

  if (loading) {
    return <LoadingScreen message="Loading carts..." />
  }

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Fixed Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>My Won Bids</Text>
            <Text style={styles.headerDescription}>Review your successful auction items</Text>
          </View>
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Feather name="shopping-cart" size={80} color="#E0E0E0" />
          </View>
          <Text style={styles.emptyTitle}>No Won Bids Yet</Text>
          <Text style={styles.emptyMessage}>
            Your successfully won auction items will appear here once auctions are finalized.
          </Text>
          <TouchableOpacity style={styles.exploreButton} onPress={() => navigation.navigate("Home")}>
            <Feather name="search" size={20} color="white" />
            <Text style={styles.exploreButtonText}>Explore Auctions</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>My Won Bids</Text>
          <Text style={styles.headerDescription}>
            {cartItems.length} item{cartItems.length !== 1 ? "s" : ""} won
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeText}>₱{calculateTotal().toLocaleString()}</Text>
          </View>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Won Items</Text>

          {cartItems.map((item, index) => (
            <View key={index} style={styles.orderCard}>
              <Image source={{ uri: item.image }} style={styles.orderImage} />

              <View style={styles.orderContent}>
                <Text style={styles.orderTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.orderCategory}>{item.category}</Text>

                <View style={styles.orderDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Winning Bid:</Text>
                    <Text style={styles.winningBidValue}>₱{item.myBid?.toLocaleString()}</Text>
                  </View>

                  {item.orderId && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Order ID:</Text>
                      <Text style={styles.detailValue}>{item.orderId}</Text>
                    </View>
                  )}

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Order Date:</Text>
                    <Text style={styles.detailValue}>{new Date(item.orderDate).toLocaleDateString()}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <View style={styles.statusBadge}>
                      <Feather name="check-circle" size={12} color="white" />
                      <Text style={styles.statusText}>Won</Text>
                    </View>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={styles.declineButton} 
                    onPress={() => handleDeclineBid(item)}
                  >
                    <Feather name="x-circle" size={16} color="white" />
                    <Text style={styles.declineButtonText}>Decline Bid</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Order Summary</Text>

            {cartItems.map((item, idx) => (
              <View key={idx} style={styles.summaryRow}>
                <Text style={styles.summaryLabel} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.summaryValue}>₱{(item.myBid || item.currentBid).toLocaleString()}</Text>
              </View>
            ))}

            <View style={styles.divider} />

            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalValue}>₱{calculateTotal().toLocaleString()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
            <Feather name="credit-card" size={20} color="white" />
            <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
            <Feather name="arrow-right" size={20} color="white" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.continueShoppingButton} onPress={() => navigation.navigate("Bidding")}>
            <Text style={styles.continueShoppingText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Decline Bid Modal */}
      <Modal
        visible={declineModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDeclineModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Feather name="alert-triangle" size={48} color="#FF6B6B" />
              <Text style={styles.modalTitle}>Decline Bid?</Text>
            </View>
            
            {selectedDeclineItem && (
              <>
                <Text style={styles.modalMessage}>
                  Are you sure you want to decline your winning bid for:
                </Text>
                <Text style={styles.modalItemName}>"{selectedDeclineItem.title}"</Text>
                <Text style={styles.modalBidAmount}>
                  Your bid: ₱{selectedDeclineItem.myBid?.toLocaleString()}
                </Text>
                <Text style={styles.modalWarning}>
                  This action cannot be undone. You will lose this item and cannot bid on it again.
                </Text>

                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={styles.cancelButton} 
                    onPress={() => setDeclineModalVisible(false)}
                    disabled={declining}
                  >
                    <Text style={styles.cancelButtonText}>Keep Bid</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.confirmDeclineButton, declining && styles.disabledButton]} 
                    onPress={confirmDeclineBid}
                    disabled={declining}
                  >
                    {declining ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <Feather name="x-circle" size={16} color="white" />
                        <Text style={styles.confirmDeclineButtonText}>Decline Bid</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },

  // Fixed Header
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
  headerRight: {
    alignItems: "flex-end",
  },
  totalBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  totalBadgeText: {
    color: "white",
    fontSize: Math.min(14, width * 0.035),
    fontWeight: "bold",
  },

  // Empty State
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
  exploreButton: {
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
  exploreButtonText: {
    color: "white",
    fontSize: Math.min(16, width * 0.04),
    fontWeight: "600",
    marginLeft: 8,
  },

  // Scrollable Content
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    paddingHorizontal: Math.max(20, width * 0.05),
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: Math.min(20, width * 0.05),
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },

  // Order Cards
  orderCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: Math.max(16, width * 0.04),
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  orderImage: {
    width: Math.min(90, width * 0.22),
    height: Math.min(90, width * 0.22),
    borderRadius: 12,
    marginRight: 16,
    backgroundColor: "#f0f0f0",
  },
  orderContent: {
    flex: 1,
  },
  orderTitle: {
    fontSize: Math.min(18, width * 0.045),
    fontWeight: "bold",
    color: "#135918",
    marginBottom: 6,
    lineHeight: 22,
  },
  orderCategory: {
    fontSize: Math.min(14, width * 0.035),
    color: "#888",
    marginBottom: 12,
    textTransform: "capitalize",
  },
  orderDetails: {
    gap: 8,
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: Math.min(14, width * 0.035),
    color: "#666",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: Math.min(14, width * 0.035),
    fontWeight: "600",
    color: "#333",
  },
  winningBidValue: {
    fontSize: Math.min(16, width * 0.04),
    fontWeight: "bold",
    color: "#2E6A2E",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: Math.min(12, width * 0.03),
    color: "white",
    fontWeight: "bold",
  },

  // Action Buttons
  actionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  declineButton: {
    backgroundColor: "#FF6B6B",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  declineButtonText: {
    color: "white",
    fontSize: Math.min(14, width * 0.035),
    fontWeight: "600",
  },

  moreButton: {
    padding: 8,
    marginLeft: 8,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: Math.max(20, width * 0.05),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: Math.min(20, width * 0.05),
    fontWeight: "bold",
    color: "#135918",
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: Math.min(16, width * 0.04),
    color: "#666",
    flex: 1,
    marginRight: 12,
  },
  summaryValue: {
    fontSize: Math.min(16, width * 0.04),
    fontWeight: "600",
    color: "#333",
  },
  divider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 16,
  },
  totalRow: {
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: Math.min(18, width * 0.045),
    fontWeight: "bold",
    color: "#333",
  },
  totalValue: {
    fontSize: Math.min(20, width * 0.05),
    fontWeight: "bold",
    color: "#2E6A2E",
  },

  // Buttons
  checkoutButton: {
    backgroundColor: "#2E6A2E",
    borderRadius: 16,
    paddingVertical: Math.max(16, width * 0.04),
    paddingHorizontal: Math.max(20, width * 0.05),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2E6A2E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    gap: 12,
  },
  checkoutButtonText: {
    color: "white",
    fontSize: Math.min(18, width * 0.045),
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  continueShoppingButton: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 60,
  },
  continueShoppingText: {
    color: "#2E6A2E",
    fontSize: Math.min(16, width * 0.04),
    fontWeight: "600",
  },
  bottomPadding: {
    height: 20,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
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
  modalHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 10,
  },
  modalMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 10,
    lineHeight: 22,
  },
  modalItemName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  modalBidAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2E6A2E",
    textAlign: "center",
    marginBottom: 15,
  },
  modalWarning: {
    fontSize: 14,
    color: "#FF6B6B",
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 20,
    fontStyle: "italic",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#F0F0F0",
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  confirmDeclineButton: {
    flex: 1,
    backgroundColor: "#FF6B6B",
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  confirmDeclineButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
  disabledButton: {
    opacity: 0.7,
  },
})