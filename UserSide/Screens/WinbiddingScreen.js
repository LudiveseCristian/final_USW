"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal, Dimensions } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { collection, onSnapshot } from "firebase/firestore"
import { db } from "../firebase/firebase"
import { useAuth } from "../AuthContext"
import LoadingScreen from "../hooks/LoadingScreen"
import { SafeAreaView } from "react-native-safe-area-context"
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";

export default function WinBiddingScreen({ navigation }) {
  const { currentUser } = useAuth()
  const [winningBids, setWinningBids] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal states for image viewing
  const [imageModalVisible, setImageModalVisible] = useState(false)
  const [selectedImages, setSelectedImages] = useState([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    if (!currentUser?.uid) return

    const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
      const wonItems = []

      snapshot.docs.forEach((d) => {
        const data = d.data()
        const userBid = data.bids?.find((bid) => bid.bidderId === currentUser.uid)

        // Check if user won this auction
        if (
          (userBid && data.status === "sold" && data.highestBidder === userBid.bidderName) ||
          data.winnerBidderId === currentUser.uid
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
            orderDate: data.orderDate || new Date().toISOString(),
            raw: data,
          })
        }
      })

      setWinningBids(wonItems)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [currentUser?.uid])

  const openImageViewer = (item) => {
    if (item.image && item.raw?.imageUrls) {
      setSelectedImages(item.raw.imageUrls)
      setCurrentImageIndex(0)
      setImageModalVisible(true)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const totalAmount = winningBids.reduce((sum, item) => sum + item.winningBid, 0)
  const totalItems = winningBids.length

  if (loading) {
    return <LoadingScreen message="Loading your winning bids summary..." />
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFCF3" }}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Winning Bids Summary</Text>
          </View>
          <Text style={styles.headerSubtitle}>Complete overview of your auction wins</Text>
        </View>

        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <MaterialCommunityIcon name="tshirt-crew" size={32} color="#2E6A2E" />
            <Text style={styles.summaryNumber}>{totalItems}</Text>
            <Text style={styles.summaryLabel}>Total Wins</Text>
          </View>
          <View style={styles.summaryCard}>
            <Icon name="account-balance-wallet" size={32} color="#2E6A2E" />
            <PesoAmount amount={totalAmount} style={styles.summaryAmount} />
            <Text style={styles.summaryLabel}>Total Spent</Text>
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {winningBids.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="emoji-events" size={64} color="#ccc" />
              <Text style={styles.emptyStateTitle}>No Winning Bids Yet</Text>
              <Text style={styles.emptyStateText}>Your winning bids will appear here once you win an auction.</Text>
            </View>
          ) : (
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderText}>Item Details</Text>
                <Text style={styles.tableHeaderText}>Amount</Text>
                <Text style={styles.tableHeaderText}>Date</Text>
              </View>

              {winningBids.map((item, index) => (
                <View key={item.id} style={[styles.tableRow, index % 2 === 0 && styles.evenRow]}>
                  <View style={styles.itemColumn}>
                    <TouchableOpacity onPress={() => openImageViewer(item)} activeOpacity={0.8}>
                      <Image source={{ uri: item.image }} style={styles.itemImage} />
                    </TouchableOpacity>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      <Text style={styles.itemCategory}>{item.category}</Text>
                      <Text style={styles.itemDescription} numberOfLines={2}>
                        {item.description}
                      </Text>
                      <View style={styles.dimensionsContainer}>
                        <Text style={styles.dimensionText}>L: {item.length}″</Text>
                        <Text style={styles.dimensionText}>W: {item.width}″</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.amountColumn}>
                    <PesoAmount amount={item.winningBid} style={styles.bidAmount} />
                  </View>

                  <View style={styles.dateColumn}>
                    <Text style={styles.dateText}>{formatDate(item.orderDate)}</Text>
                  </View>
                </View>
              ))}

              <View style={styles.tableFooter}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Amount:</Text>
                  <PesoAmount amount={totalAmount} style={styles.totalAmount} />
                </View>
              </View>
            </View>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>

        {renderImageViewer()}
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
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
  },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2E6A2E",
    marginTop: 8,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2E6A2E",
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
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
  tableContainer: {
    marginHorizontal: 20,
    backgroundColor: "white",
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: "hidden",
    marginBottom: 100,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#2E6A2E",
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  tableHeaderText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    alignItems: "center",
  },
  evenRow: {
    backgroundColor: "#f9f9f9",
  },
  itemColumn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  itemCategory: {
    fontSize: 12,
    color: "#2E6A2E",
    fontWeight: "500",
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 12,
    color: "#666",
    lineHeight: 16,
    marginBottom: 4,
  },
  dimensionsContainer: {
    flexDirection: "row",
  },
  dimensionText: {
    fontSize: 11,
    color: "#888",
    marginRight: 8,
  },
  amountColumn: {
    flex: 1,
    alignItems: "center",
  },
  bidAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2E6A2E",
  },
  dateColumn: {
    flex: 1,
    alignItems: "center",
  },
  dateText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  tableFooter: {
    backgroundColor: "#f8f8f8",
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2E6A2E",
  },
  pesoAmountContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  bottomPadding: {
    height: 30,
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
