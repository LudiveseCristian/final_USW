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

      // Sort by date (newest first)
      wonItems.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
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
    return <LoadingScreen message="Loading your winning bids..." />
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
        {/* Enhanced Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>Your Auction Wins</Text>
              <Text style={styles.headerSubtitle}>
                {totalItems === 0 
                  ? "Start bidding to see your wins here" 
                  : `${totalItems} item${totalItems > 1 ? 's' : ''} won`
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Enhanced Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <View style={styles.cardIcon}>
              <MaterialCommunityIcon name="package-variant" size={24} color="#1A5B1A" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.summaryNumber}>{totalItems}</Text>
              <Text style={styles.summaryLabel}>Items Won</Text>
            </View>
          </View>
          
          <View style={styles.summaryCard}>
            <View style={styles.cardIcon}>
              <Icon name="account-balance-wallet" size={24} color="#1A5B1A" />
            </View>
            <View style={styles.cardInfo}>
              <PesoAmount amount={totalAmount} style={styles.summaryAmount} />
              <Text style={styles.summaryLabel}>Total Invested</Text>
            </View>
          </View>
        </View>

        {/* Winning Bids List */}
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {winningBids.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <MaterialCommunityIcon name="gavel" size={80} color="#D3D3D3" />
              </View>
              <Text style={styles.emptyStateTitle}>No Wins Yet</Text>
              <Text style={styles.emptyStateText}>
                Start participating in auctions to build your collection of winning bids!
              </Text>
              <TouchableOpacity style={styles.exploreButton}>
                <Text style={styles.exploreButtonText}>Explore Auctions</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cardList}>
              <Text style={styles.sectionTitle}>Your Winning Items</Text>
              {winningBids.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.card, index === 0 && styles.firstCard]}
                  activeOpacity={0.8}
                  onPress={() => openImageViewer(item)}
                >
                  <View style={styles.cardImageContainer}>
                    <Image source={{ uri: item.image }} style={styles.cardImage} />
                  </View>
                  
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text style={styles.cardCategory}>{item.category}</Text>
                    </View>
                    
                    <Text style={styles.cardDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                    
                    <View style={styles.cardDetails}>
                      <View style={styles.dimensionInfo}>
                        <Icon name="straighten" size={14} color="#888888" />
                        <Text style={styles.cardDetailText}>L: {item.length}″</Text>
                      </View>
                      <View style={styles.dimensionInfo}>
                        <Icon name="crop-landscape" size={14} color="#888888" />
                        <Text style={styles.cardDetailText}>W: {item.width}″</Text>
                      </View>
                    </View>
                    
                    <View style={styles.cardFooter}>
                      <View style={styles.priceContainer}>
                        <Text style={styles.priceLabel}>Winning Bid</Text>
                        <PesoAmount amount={item.winningBid} style={styles.cardAmount} />
                      </View>
                      <View style={styles.dateContainer}>
                        <Icon name="event" size={14} color="#666666" />
                        <Text style={styles.cardDate}>{formatDate(item.orderDate)}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
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
    backgroundColor: "#1A5B1A",
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 4,
    fontWeight: "400",
  },
  headerStats: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    padding: 12,
    minWidth: 60,
  },
  headerStatsText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 4,
  },
  summaryContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
    gap: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  cardIcon: {
    backgroundColor: "rgba(26, 91, 26, 0.1)",
    borderRadius: 16,
    padding: 12,
    marginRight: 16,
  },
  cardInfo: {
    flex: 1,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1A5B1A",
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1A5B1A",
  },
  summaryLabel: {
    fontSize: 13,
    color: "#666666",
    marginTop: 2,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333333",
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    backgroundColor: "#F5F5F5",
    borderRadius: 50,
    padding: 24,
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333333",
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#888888",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  exploreButton: {
    backgroundColor: "#1A5B1A",
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  exploreButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  cardList: {
    paddingHorizontal: 20,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 6,
    overflow: "hidden",
    alignItems: "stretch",
  },
  firstCard: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  cardImageContainer: {
    position: "relative",
  },
  cardImage: {
    width: 120,
    height: 140,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  winBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 12,
    padding: 4,
  },
  cardContent: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
    minHeight: 140,
  },
  cardHeader: {
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#333333",
    lineHeight: 22,
  },
  cardCategory: {
    fontSize: 12,
    color: "#1A5B1A",
    fontWeight: "600",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardDescription: {
    fontSize: 13,
    color: "#666666",
    lineHeight: 18,
    marginBottom: 12,
  },
  cardDetails: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  dimensionInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardDetailText: {
    fontSize: 12,
    color: "#888888",
    fontWeight: "500",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 11,
    color: "#888888",
    fontWeight: "500",
    marginBottom: 2,
  },
  cardAmount: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A5B1A",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardDate: {
    fontSize: 12,
    color: "#666666",
    fontWeight: "500",
  },
  pesoAmountContainer: {
    flexDirection: "row",
    alignItems: "center",
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
    backgroundColor: "rgba(255, 255, 255, 0.2)",
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
    backgroundColor: "#FFFFFF",
    width: 12,
    height: 12,
    borderRadius: 6,
  },
})