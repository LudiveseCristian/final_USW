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
import { collection, onSnapshot, updateDoc, doc, getDoc,  } from "firebase/firestore"
import { db } from "../firebase/firebase"
import { useAuth } from "../AuthContext"
import LoadingScreen from "../hooks/LoadingScreen"
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";

export default function BiddingScreen({ navigation }) {
  const { currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState("live")
  const [bidAmount, setBidAmount] = useState("")
  const [showBidModal, setShowBidModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  const [liveAuctions, setLiveAuctions] = useState([])
  const [myBids, setMyBids] = useState([])
  const [acceptedBids, setAcceptedBids] = useState([])
  const [endingSoonAuctions, setEndingSoonAuctions] = useState([])
  const [activeBiddersCount, setActiveBiddersCount] = useState(0)

  const [imageModalVisible, setImageModalVisible] = useState(false)
  const [selectedImages, setSelectedImages] = useState([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  const [biddingCounts, setBiddingCounts] = useState({ activeBids: 0, outbidNotifications: 0 })
  const [biddingCountsLoading, setBiddingCountsLoading] = useState(false)

  const [expandedCards, setExpandedCards] = useState(new Set());

  const toggleExpand = (itemId) => {
    setExpandedCards(prevExpandedCards => {
      const newExpanded = new Set(prevExpandedCards);
      if (newExpanded.has(itemId)) {
        newExpanded.delete(itemId);
      } else {
        newExpanded.add(itemId);
      }
      return newExpanded;
    });
  };

  const conditionColors = {
    Excellent: '#4CAF50', // Green
    Good: '#8BC34A',      // Light green
    Fair: '#FFC107',      // Amber
    Poor: '#F44336',      // Red
  };

  useEffect(() => {
    if (!currentUser?.uid) return

    const unsubscribeLive = onSnapshot(collection(db, "products"), (snapshot) => {
      const now = new Date()
      const soonThreshold = new Date(now.getTime() + 2 * 60 * 60 * 1000) // 2 hours from now

      const items = snapshot.docs
        .map((d) => {
          const data = d.data()
          const bidEndTime = data.bidEndTime?.toDate ? data.bidEndTime.toDate() : data.bidEndTime
          const isExpired = bidEndTime ? new Date(bidEndTime) <= now : false

          if (!data.biddingEnabled || data.status === "sold" || data.status === "expired" || isExpired) {
            return null
          }

          const current =
            typeof data.currentBid === "number"
              ? data.currentBid
              : data.currentBid
                ? Number.parseFloat(data.currentBid)
                : 0
          const minBid =
            typeof data.minimumBid === "number"
              ? data.minimumBid
              : data.minimumBid
                ? Number.parseFloat(data.minimumBid)
                : 0
          const base = Math.max(current || 0, minBid || 0)
          const next = base > 0 ? Math.ceil(base * 1.05) : 0

          // Check if user has bid on this item
          const userBid = data.bids?.find((bid) => bid.bidderId === currentUser.uid)

          return {
            id: d.id,
            title: data.name,
            currentBid: base,
            nextBid: next,
            timeLeft: getTimeLeftText(bidEndTime),
            bidders: data.bids?.length || 0,
            image: data.imageUrls?.[0] || "https://via.placeholder.com/120x120/CCCCCC/FFFFFF?text=Auction+Item",
            category: data.category || "",
            condition: data.condition || "",
            raw: data,
            userBid: userBid,
            userBidAmount: userBid?.amount || null,
            isUserWinning: userBid && userBid.amount === base,
            description: data.description || "No description available",
            length: data.length || "N/A",
            width: data.width || "N/A",
            bidEndTime: bidEndTime,
            isEndingSoon: bidEndTime && new Date(bidEndTime) <= soonThreshold,
            bids: data.bids || [],
          }
        })
        .filter(Boolean)

      setLiveAuctions(items)

      const endingSoon = items.filter((item) => item.isEndingSoon)
      setEndingSoonAuctions(endingSoon)

      const uniqueBidders = new Set()
      items.forEach((item) => {
        item.bids.forEach((bid) => {
          if (bid.bidderId) {
            uniqueBidders.add(bid.bidderId)
          }
        })
      })
      setActiveBiddersCount(uniqueBidders.size)

      setLoading(false)
    })

    const unsubscribeBids = onSnapshot(collection(db, "products"), (snapshot) => {
      const userBids = []
      const accepted = []

      snapshot.docs.forEach((d) => {
        const data = d.data()
        const userBid = data.bids?.find((bid) => bid.bidderId === currentUser.uid)

        if (userBid) {
          const bidInfo = {
            id: d.id,
            title: data.name,
            myBid: userBid.amount,
            currentBid: data.currentBid || 0,
            status:
              data.status === "sold" && data.highestBidder === userBid.bidderName
                ? "won"
                : data.currentBid > userBid.amount
                  ? "outbid"
                  : "winning",
            timeLeft: getTimeLeftText(data.bidEndTime?.toDate ? data.bidEndTime.toDate() : data.bidEndTime),
            image: data.imageUrls?.[0] || "https://via.placeholder.com/80x80/CCCCCC/FFFFFF?text=Bid+Item",
            category: data.category || "",
            condition: data.condition || "",
            bidEndTime: data.bidEndTime?.toDate ? data.bidEndTime.toDate() : data.bidEndTime,
            raw: data,
            userBid: userBid,
            description: data.description || "No description available",
            length: data.length || "N/A",
            width: data.width || "N/A",
          }

          if (data.status === "sold" && data.highestBidder === userBid.bidderName) {
            accepted.push(bidInfo)
          } else {
            userBids.push(bidInfo)
          }
        }
      })

      setMyBids(userBids)
      setAcceptedBids(accepted)
    })

    return () => {
      unsubscribeLive()
      unsubscribeBids()
    }
  }, [currentUser?.uid])

  const allMyBids = [...myBids, ...acceptedBids]

  const getStatusColor = (status) => {
    switch (status) {
      case "winning":
        return "#7ED321"
      case "outbid":
        return "#D0021B"
      case "won":
        return "#135918"
      default:
        return "#888"
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case "winning":
        return "WINNING"
      case "outbid":
        return "OUTBID"
      case "won":
        return "WON"
      default:
        return "ACTIVE"
    }
  }

  const handlePlaceBid = (item) => {
    setSelectedItem(item)
    setBidAmount(item.nextBid.toString())
    setShowBidModal(true)
  }

  const handleConfirmBid = async () => {
    const bidValue = Number.parseFloat(bidAmount)

    if (!bidValue || isNaN(bidValue)) {
      Alert.alert("Invalid Bid", "Please enter a valid bid amount.")
      return
    }

    if (bidValue < selectedItem.nextBid) {
      Alert.alert("Bid Too Low", `Your bid must be at least ₱${selectedItem.nextBid.toLocaleString()}`)
      return
    }
    try {
      const productRef = doc(db, "products", selectedItem.id)
      const productSnap = await getDoc(productRef)
      if (!productSnap.exists()) {
        Alert.alert("Error", "This auction no longer exists.")
        return
      }
      const data = productSnap.data()
      const current =
        typeof data.currentBid === "number" ? data.currentBid : data.currentBid ? Number.parseFloat(data.currentBid) : 0
      const minBid =
        typeof data.minimumBid === "number" ? data.minimumBid : data.minimumBid ? Number.parseFloat(data.minimumBid) : 0
      const base = Math.max(current || 0, minBid || 0)
      const requiredMin = base > 0 ? Math.ceil(base * 1.05) : minBid
      if (bidValue < requiredMin) {
        Alert.alert("Bid Too Low", `Latest required bid is ₱${requiredMin.toLocaleString()}`)
        return
      }

      const newBid = {
        bidderId: currentUser?.uid || "anonymous",
        bidderName: currentUser?.name || currentUser?.email?.split("@")[0] || "Anonymous",
        bidderEmail: currentUser?.email || undefined,
        amount: bidValue,
        timestamp: new Date().toISOString(),
      }

      const updatedBids = [...(data.bids || []), newBid]
      await updateDoc(productRef, {
        bids: updatedBids,
        currentBid: bidValue,
        updatedAt: new Date(),
      })

      Alert.alert("Bid Placed!", `Your bid of ₱${bidValue.toLocaleString()} has been placed on ${selectedItem.title}`)
      setShowBidModal(false)
      setBidAmount("")
      setSelectedItem(null)
    } catch (e) {
      console.error("Error placing bid:", e)
      Alert.alert("Error", "Failed to place bid. Please try again.")
    }
  }

  const handleCancelBid = () => {
    setShowBidModal(false)
    setBidAmount("")
    setSelectedItem(null)
  }

  const renderNextBidText = (item) => {
    if (item.isUserWinning) {
      return "Your Bid"
    }
    return `${item.nextBid.toLocaleString()}`
  }

  const renderBidButtonText = (item) => {
    if (item.isUserWinning) {
      return "Increase Bid"
    }
    return `Place Bid - ₱${item.nextBid.toLocaleString()}`
  }

  const handleViewOrder = (item) => {
    if (item.status === "won") {
      navigation.navigate("Cart", {
        orderItem: {
          ...item,
          orderId: `ORDER_${item.id}_${Date.now()}`,
          orderDate: new Date().toISOString(),
          status: "pending_payment",
        },
      })
    }
  }

  if (loading || biddingCountsLoading) {
    return <LoadingScreen message="Loading bids..." />
  }

  const PesoSymbol = ({ size = 16, color = "#2E6A2E" }) => (
    <Text style={{ fontSize: size, color, fontWeight: "bold" }}>₱</Text>
  )

  const PesoAmount = ({ amount, style, showYou = false }) => (
    <View style={styles.pesoAmountContainer}>
      <PesoSymbol size={style?.fontSize || 16} color={style?.color || "#2E6A2E"} />
      <Text style={[style, { marginLeft: 2 }]}>
        {amount.toLocaleString()}
        {showYou && " (You)"}
      </Text>
    </View>
  )

  function getTimeLeftText(endTime) {
    if (!endTime) return "No end time"
    const now = new Date()
    const end = new Date(endTime)
    const diff = end - now
    if (diff <= 0) return "Expired"
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const openImageViewer = (item) => {
    if (item.image && item.raw?.imageUrls) {
      const allImages = item.raw.imageUrls
      setSelectedImages(allImages)
      setCurrentImageIndex(0)
      setImageModalVisible(true)
    }
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFCF3" }}>
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Bidding Center</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Place bids and track your auctions • {biddingCounts.activeBids} active bids
        </Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "live" && styles.activeTab]}
          onPress={() => setActiveTab("live")}
        >
          <Text style={[styles.tabText, activeTab === "live" && styles.activeTabText]}>Live Bids</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "mybids" && styles.activeTab]}
          onPress={() => setActiveTab("mybids")}
        >
          <View style={styles.tabWithBadge}>
            <Text style={[styles.tabText, activeTab === "mybids" && styles.activeTabText]}>My Bids</Text>
            {biddingCounts.outbidNotifications > 0 && (
              <View style={styles.tabNotificationBadge}>
                <Text style={styles.tabNotificationText}>{biddingCounts.outbidNotifications}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {activeTab === "live" ? (
          <View style={styles.section}>
            {/* Quick Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{liveAuctions.length}</Text>
                <Text style={styles.statLabel}>Live Bids</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{endingSoonAuctions.length}</Text>
                <Text style={styles.statLabel}>Ending Soon</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{activeBiddersCount}</Text>
                <Text style={styles.statLabel}>Active Bids</Text>
              </View>
            </View>

            {/* Live Auctions */}
            <Text style={styles.sectionTitle}>Live Bids</Text>
            {liveAuctions.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcon name="tshirt-crew" size={64} color="#ccc" />
                  <Text style={styles.emptyStateTitle}>No Live Bidding</Text>
                  <Text style={styles.emptyStateText}>
                    There are no items up for bidding right now. Please check back later!
                  </Text>
                </View>
              ) : (
            liveAuctions.map((item) => (
              <View key={item.id} style={styles.auctionCard}>
                <TouchableOpacity onPress={() => openImageViewer(item)} activeOpacity={0.8}>
                  <Image source={{ uri: item.image }} style={styles.auctionImage} />
                  {item.raw?.imageUrls && item.raw.imageUrls.length > 1 && (
                    <View style={styles.imageCountBadge}>
                      <Icon name="photo-library" size={12} color="white" />
                      <Text style={styles.imageCountText}>+{item.raw.imageUrls.length - 1}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <View style={styles.auctionContent}>
                  <View style={styles.auctionHeader}>
                    <Text style={styles.auctionTitle}>{item.title}</Text>
                    <View style={[
                      styles.conditionBadge,
                      { backgroundColor: conditionColors[item.condition] || '#F0F0F0' }
                    ]}>
                      <Text style={styles.conditionText}>{item.condition}</Text>
                    </View>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>{item.category}</Text>
                    </View>
                  </View>

                  <View style={styles.auctionDescription}>
                    <Text style={styles.descriptionText}>{item.description}</Text>
                    <View style={styles.measurementsContainer}>
                      <Text style={styles.measurementText}>Length: {item.length}″</Text>
                      <Text style={styles.measurementText}>Width: {item.width}″</Text>
                    </View>
                  </View>

                  <View style={styles.bidInfo}>
                    <View style={styles.bidRow}>
                      <Text style={styles.bidLabel}>Current Bid:</Text>
                      <PesoAmount
                        amount={item.currentBid}
                        style={[
                          styles.currentBidAmount,
                          item.userBid && item.userBid === item.currentBid && styles.userBidAmount,
                        ]}
                        showYou={item.userBid && item.userBid === item.currentBid}
                      />
                    </View>
                    <View style={styles.bidRow}>
                      <Text style={styles.bidLabel}>Next Bid:</Text>
                      {item.userBid && item.userBid === item.currentBid ? (
                        <Text style={[styles.nextBidAmount, styles.yourBidText]}>Your Bid</Text>
                      ) : (
                        <View style={styles.pesoAmountContainer}>
                          <PesoSymbol size={14} color="#333" />
                          <Text style={[styles.nextBidAmount, { marginLeft: 2 }]}>{item.nextBid.toLocaleString()}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.auctionFooter}>
                    <View style={styles.timeContainer}>
                      <Icon name="access-time" size={12} color="#F5A623" />
                      <Text style={styles.timeLeft}>{item.timeLeft} left</Text>
                    </View>
                    <View style={styles.biddersContainer}>
                      <Icon name="people" size={12} color="#4A90E2" />
                      <Text style={styles.biddersCount}>{item.bidders} bids</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.bidButton,
                      item.userBid && item.userBid === item.currentBid && styles.increaseBidButton,
                    ]}
                    onPress={() => handlePlaceBid(item)}
                  >
                    <Text style={styles.bidButtonText}>{renderBidButtonText(item)}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )))}
          </View>
        ) : (
          <View style={styles.section}>
            {/* My Bids Stats */}
            <View style={styles.myBidsStats}>
              <View style={styles.myBidsStatCard}>
                <Text style={styles.myBidsStatNumber}>{allMyBids.length}</Text>
                <Text style={styles.myBidsStatLabel}>Total Bids</Text>
              </View>
              <View style={styles.myBidsStatCard}>
                <Text style={styles.myBidsStatNumber}>{myBids.filter((b) => b.status === "winning").length}</Text>
                <Text style={styles.myBidsStatLabel}>Winning</Text>
              </View>
              <View style={styles.myBidsStatCard}>
                <Text style={styles.myBidsStatNumber}>{acceptedBids.length}</Text>
                <Text style={styles.myBidsStatLabel}>Won</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>My Bids</Text>
              {allMyBids.length === 0 ? (
                <View style={styles.emptyState}>
                  <Icon name="assignment" size={64} color="#ccc" />
                  <Text style={styles.emptyStateTitle}>You Haven't Bid Yet</Text>
                  <Text style={styles.emptyStateText}>
                    Your active and won bids will appear here once you place a bid on an item.
                  </Text>
                </View>
              ) : (
            allMyBids.map((item) => (
              <View key={item.id} style={styles.myBidCard}>
                <TouchableOpacity onPress={() => openImageViewer(item)} activeOpacity={0.8}>
                  <Image source={{ uri: item.image }} style={styles.myBidImage} />
                  {item.raw?.imageUrls && item.raw.imageUrls.length > 1 && (
                    <View style={styles.myBidImageCountBadge}>
                      <Icon name="photo-library" size={10} color="white" />
                      <Text style={styles.myBidImageCountText}>+{item.raw.imageUrls.length - 1}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <View style={styles.myBidContent}>
                  <View style={styles.myBidHeader}>
                    <Text style={styles.myBidTitle}>{item.title}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                      <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
                    </View>
                  </View>

                  <View style={styles.myBidInfo}>
                    <View style={styles.myBidRowContainer}>
                      <Text style={styles.myBidLabel}>My Bid: </Text>
                      <View style={styles.pesoAmountContainer}>
                        <PesoSymbol size={14} color="#333" />
                        <Text style={[styles.myBidAmount, { marginLeft: 2 }]}>{item.myBid}</Text>
                      </View>
                    </View>
                    <View style={styles.myBidRowContainer}>
                      <Text style={styles.myBidLabel}>Current: </Text>
                      <View style={styles.pesoAmountContainer}>
                        <PesoSymbol size={14} color="#2E6A2E" />
                        <Text style={[styles.currentBidAmount, { marginLeft: 2 }]}>{item.currentBid}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.myBidFooter}>
                    <View style={styles.timeContainer}>
                      <Icon name="access-time" size={11} color="#F5A623" />
                      <Text style={styles.timeLeftSmall}>
                        {item.status === "won" ? "Won" : `${item.timeLeft} left`}
                      </Text>
                    </View>
                    {item.status === "outbid" && (
                      <TouchableOpacity style={styles.rebidButton}>
                        <Text style={styles.rebidButtonText}>Increase Bid</Text>
                      </TouchableOpacity>
                    )}
                    {item.status === "won" && (
                      <TouchableOpacity style={styles.viewOrderButton} onPress={() => handleViewOrder(item)}>
                        <Text style={styles.viewOrderButtonText}>View Bid</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            )))}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Bid Modal */}
      <Modal visible={showBidModal} transparent={true} animationType="slide" onRequestClose={handleCancelBid}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Place Your Bid</Text>
            {selectedItem && (
              <>
                <Text style={styles.modalItemTitle}>{selectedItem.title}</Text>
                <View style={styles.modalBidRow}>
                  <Text style={styles.modalCurrentBid}>Current Bid: </Text>
                  <View style={styles.pesoAmountContainer}>
                    <PesoSymbol size={16} color="#666" />
                    <Text style={[styles.modalCurrentBid, { marginLeft: 2 }]}>
                      {selectedItem.currentBid.toLocaleString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.modalBidRow}>
                  <Text style={styles.modalMinBid}>Minimum Bid: </Text>
                  <View style={styles.pesoAmountContainer}>
                    <PesoSymbol size={16} color="#2E6A2E" />
                    <Text style={[styles.modalMinBid, { marginLeft: 2 }]}>{selectedItem.nextBid.toLocaleString()}</Text>
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Your Bid Amount:</Text>
                  <View style={styles.inputWrapper}>
                    <PesoSymbol size={20} color="#2E6A2E" />
                    <TextInput
                      style={styles.bidInput}
                      value={bidAmount}
                      onChangeText={setBidAmount}
                      placeholder={selectedItem.nextBid.toString()}
                      keyboardType="numeric"
                      autoFocus={true}
                    />
                  </View>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelButton} onPress={handleCancelBid}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmBid}>
                    <Text style={styles.confirmButtonText}>Place Bid</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  notificationBadge: {
    backgroundColor: "#FF4444",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  notificationText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    marginHorizontal: 20,
    marginTop: -10,
    borderRadius: 25,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: "#2E6A2E",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#888",
  },
  activeTabText: {
    color: "white",
  },
  tabWithBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tabNotificationBadge: {
    backgroundColor: "#FF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  tabNotificationText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  scrollView: {
    flex: 1,
    marginTop: 20,
  },
  section: {
    paddingHorizontal: 20,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  statCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#135918",
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  auctionCard: {
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
  auctionImage: {
    width: "100%",
    height: 150,
    borderRadius: 10,
    marginBottom: 15,
  },
  auctionContent: {
    flex: 1,
  },
  auctionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  auctionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#135918",
    flex: 1,
  },
  conditionBadge: {
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  conditionText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "500",
  },
  categoryBadge: {
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  bidInfo: {
    marginBottom: 15,
  },
  bidRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  bidLabel: {
    fontSize: 14,
    color: "#666",
  },
  currentBidAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2E6A2E",
  },
  userBidAmount: {
    color: "#7ED321",
  },
  nextBidAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  yourBidText: {
    color: "#7ED321",
    fontWeight: "bold",
  },
  pesoAmountContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  auctionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeLeft: {
    fontSize: 12,
    color: "#F5A623",
    marginLeft: 5,
    fontWeight: "500",
  },
  biddersContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  biddersCount: {
    fontSize: 12,
    color: "#4A90E2",
    marginLeft: 5,
    fontWeight: "500",
  },
  bidButton: {
    backgroundColor: "#2E6A2E",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  increaseBidButton: {
    backgroundColor: "#4A90E2",
  },
  bidButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  myBidsStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  myBidsStatCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  myBidsStatNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2E6A2E",
  },
  myBidsStatLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 5,
  },
  myBidCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  myBidImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 15,
  },
  myBidContent: {
    flex: 1,
  },
  myBidHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  myBidTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: "white",
    fontWeight: "bold",
  },
  myBidInfo: {
    marginBottom: 8,
  },
  myBidRowContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  myBidLabel: {
    fontSize: 14,
    color: "#666",
  },
  myBidAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  myBidFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeLeftSmall: {
    fontSize: 11,
    color: "#F5A623",
    marginLeft: 4,
  },
  rebidButton: {
    backgroundColor: "#D0021B",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  rebidButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  viewOrderButton: {
    backgroundColor: "#135918",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  viewOrderButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
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
    marginBottom: 10,
  },
  modalBidRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },
  modalCurrentBid: {
    fontSize: 16,
    color: "#666",
  },
  modalMinBid: {
    fontSize: 16,
    color: "#2E6A2E",
    fontWeight: "600",
  },
  inputContainer: {
    marginTop: 20,
    marginBottom: 25,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#2E6A2E",
    borderRadius: 10,
    paddingHorizontal: 15,
  },
  bidInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: "600",
    paddingVertical: 15,
    color: "#333",
    marginLeft: 5,
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
  confirmButton: {
    flex: 1,
    backgroundColor: "#2E6A2E",
    borderRadius: 10,
    paddingVertical: 15,
    marginLeft: 10,
    alignItems: "center",
  },
  confirmButtonText: {
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
  myBidImageCountBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  myBidImageCountText: {
    color: "white",
    fontSize: 8,
    fontWeight: "600",
    marginLeft: 1,
  },

  auctionDescription: {
    marginVertical: 10,
    paddingHorizontal: 5,
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
    marginTop: 5,
  },
  measurementText: {
    fontSize: 13,
    color: "#444",
    marginRight: 15,
    fontWeight: "500",
  },
   emptyState: {
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
    marginTop: 20,
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

})
