import { useState, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal, Dimensions } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { collection, onSnapshot } from "firebase/firestore"
import { db } from "../firebase/firebase"
import { useAuth } from "../AuthContext"
import LoadingScreen from "../hooks/LoadingScreen"
import { SafeAreaView } from "react-native-safe-area-context"
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons"

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

  const PesoSymbol = ({ size = 16, color = "#1A5B1A" }) => (
    <Text style={{ fontSize: size, color, fontWeight: "700" }}>₱</Text>
  )

  const PesoAmount = ({ amount, style }) => (
    <View style={styles.pesoAmountContainer}>
      <PesoSymbol size={style?.fontSize || 16} color={style?.color || "#1A5B1A"} />
      <Text style={[style, { marginLeft: 4 }]}>{amount.toLocaleString()}</Text>
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
            <Icon name="close" size={28} color="white" />
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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F7F2" }}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Auction Wins</Text>
          <Text style={styles.headerSubtitle}>Explore all your winning bids</Text>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <MaterialCommunityIcon name="trophy" size={28} color="#1A5B1A" />
            <Text style={styles.summaryNumber}>{totalItems}</Text>
            <Text style={styles.summaryLabel}>Items Won</Text>
          </View>
          <View style={styles.summaryCard}>
            <Icon name="account-balance-wallet" size={28} color="#1A5B1A" />
            <PesoAmount amount={totalAmount} style={styles.summaryAmount} />
            <Text style={styles.summaryLabel}>Total Spent</Text>
          </View>
        </View>

        {/* Winning Bids List */}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {winningBids.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="emoji-events" size={80} color="#D3D3D3" />
              <Text style={styles.emptyStateTitle}>No Wins Yet</Text>
              <Text style={styles.emptyStateText}>
                Start bidding in auctions to see your wins here!
              </Text>
            </View>
          ) : (
            <View style={styles.cardList}>
              {winningBids.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.card}
                  activeOpacity={0.9}
                  onPress={() => openImageViewer(item)}
                >
                  <Image source={{ uri: item.image }} style={styles.cardImage} />
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.cardCategory}>{item.category}</Text>
                    <Text style={styles.cardDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                    <View style={styles.cardDetails}>
                      <Text style={styles.cardDetailText}>L: {item.length}″</Text>
                      <Text style={styles.cardDetailText}>W: {item.width}″</Text>
                    </View>
                    <View style={styles.cardFooter}>
                      <PesoAmount amount={item.winningBid} style={styles.cardAmount} />
                      <Text style={styles.cardDate}>{formatDate(item.orderDate)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Total Spent</Text>
                <PesoAmount amount={totalAmount} style={styles.totalAmount} />
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
    backgroundColor: "#F8F7F2",
  },
  header: {
    backgroundColor: "#1A5B1A",
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 4,
  },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginVertical: 20,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  summaryNumber: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A5B1A",
    marginTop: 8,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A5B1A",
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666666",
    marginTop: 4,
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#333333",
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#888888",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 24,
  },
  cardList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    marginBottom: 50,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    overflow: "hidden",
  },
  cardImage: {
    width: 100,
    height: 100,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  cardContent: {
    flex: 1,
    padding: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
  },
  cardCategory: {
    fontSize: 12,
    color: "#1A5B1A",
    fontWeight: "500",
    marginTop: 2,
  },
  cardDescription: {
    fontSize: 12,
    color: "#666666",
    lineHeight: 18,
    marginTop: 4,
  },
  cardDetails: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cardDetailText: {
    fontSize: 12,
    color: "#888888",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A5B1A",
  },
  cardDate: {
    fontSize: 12,
    color: "#666666",
  },
  totalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333333",
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A5B1A",
  },
  pesoAmountContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  bottomPadding: {
    height: 40,
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
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 16,
    zIndex: 1000,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  imageCounter: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
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
    height: Dimensions.get("window").height * 0.75,
  },
  imageDots: {
    position: "absolute",
    bottom: 40,
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
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: "#FFFFFF",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
})