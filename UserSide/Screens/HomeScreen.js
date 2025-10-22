import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  TextInput,
  Alert,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import Feather from "react-native-vector-icons/Feather"
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons"
import { useState, useEffect } from "react"
import { collection, getDocs, query, orderBy, onSnapshot, doc, getDoc, updateDoc, where, limit} from "firebase/firestore"
import { db } from "../firebase/firebase"
import LoadingScreen from "../hooks/LoadingScreen"
import { useAuth } from "../AuthContext"
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get("window")

const PesoSymbol = ({ size = 16, color = "#000" }) => (
  <Text style={{ fontSize: size, color, fontWeight: "600" }}>₱</Text>
)

export default function HomeScreen({ navigation }) {
  const { currentUser, isLoading } = useAuth()
  const user = currentUser || null
  const [isLoadingData, setIsLoadingData] = useState(true)

  const [featuredNews, setFeaturedNews] = useState([])
  const [featuredBidding, setFeaturedBidding] = useState([])
  const [userStats, setUserStats] = useState({
    activeBids: 0,
    endingSoon: 0,
    wonItems: 0,
  })
  const [dropModalVisible, setDropModalVisible] = useState(false)
  const [selectedDrop, setSelectedDrop] = useState(null)

  const [approvedFeedback, setApprovedFeedback] = useState([])
  const [showBidModal, setShowBidModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [bidAmount, setBidAmount] = useState("")

  const [reviewImageModalVisible, setReviewImageModalVisible] = useState(false)
  const [selectedReviewImages, setSelectedReviewImages] = useState([])
  const [reviewImageIndex, setReviewImageIndex] = useState(0)

const openReviewImageViewer = (item, startIndex = 0) => {
  const allImages = []
  
  // Handle both review and drop items
  if (item.productImage) {
    // For reviews
    allImages.push({ uri: item.productImage, type: 'product' })
    if (item.reviewImages && item.reviewImages.length > 0) {
      item.reviewImages.forEach(imgUri => {
        allImages.push({ uri: imgUri, type: 'customer' })
      })
    }
  } else if (item.mainImage) {
    // For drops
    allImages.push({ uri: item.mainImage, type: 'drop' })
    if (item.secondaryImages && item.secondaryImages.length > 0) {
      item.secondaryImages.forEach(imgUri => {
        allImages.push({ uri: imgUri, type: 'drop' })
      })
    }
  }
  
  if (allImages.length > 0) {
    setSelectedReviewImages(allImages)
    setReviewImageIndex(startIndex)
    setReviewImageModalVisible(true)
  }
}

useEffect(() => {
  if (user) {
    const loadData = async () => {
      setIsLoadingData(true)
      await Promise.all([
        fetchFeaturedNews(),
        fetchFeaturedBidding(),
        fetchUserStats(),
        fetchApprovedFeedback()
      ])
      setIsLoadingData(false)
    }
    loadData()
  } else {
    setIsLoadingData(false)
  }
}, [user])

  const fetchFeaturedNews = async () => {
    try {
      const newsCollection = collection(db, "news")
      const q = query(newsCollection, orderBy("createdAt", "desc"))
      const snapshot = await getDocs(q)

      const news = snapshot.docs.slice(0, 4).map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }))

      setFeaturedNews(news)
    } catch (error) {
      console.error("Error fetching news:", error)
    }
  }

  const openDropDetails = (drop) => {
  setSelectedDrop(drop)
  setDropModalVisible(true)
}

const renderDropDetailModal = () => {
  const isUpdate = selectedDrop?.type === 'update'

  return (
    <Modal 
      visible={dropModalVisible} 
      animationType="slide" 
      onRequestClose={() => setDropModalVisible(false)}
    >
      <SafeAreaView style={styles.articleModalContainer}>
        {/* Header */}
        <View style={[styles.articleModalHeader, isUpdate && styles.updateModalHeader]}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => setDropModalVisible(false)}
          >
            <Feather name="arrow-left" size={24} color={isUpdate ? "#135918" : "#2E6A2E"} />
          </TouchableOpacity>
          <Text style={[styles.articleModalTitle, isUpdate && styles.updateModalTitle]}>
            {isUpdate ? "Update Details" : "Drop Details"}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {selectedDrop && (
          <ScrollView style={styles.articleContent} showsVerticalScrollIndicator={false}>
            {/* Main Image */}
            {selectedDrop.mainImage && (
              <TouchableOpacity 
                style={styles.mainImageContainer} 
                onPress={() => openReviewImageViewer(selectedDrop)}
              >
                <Image 
                  source={{ uri: selectedDrop.mainImage }} 
                  style={styles.articleMainImage} 
                  resizeMode="cover" 
                />
                {selectedDrop.secondaryImages && selectedDrop.secondaryImages.length > 0 && (
                  <View style={[styles.galleryIndicator, isUpdate && styles.updateGalleryIndicator]}>
                    <Feather name="camera" size={16} color="white" />
                    <Text style={styles.galleryText}>
                      View Gallery ({selectedDrop.secondaryImages.length + 1})
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {/* Drop Info */}
            <View style={styles.articleInfo}>
              <View style={styles.articleMeta}>
                <View style={styles.timeContainer}>
                  <Feather name="clock" size={14} color="#666" />
                  <Text style={styles.articleTime}>{formatDateTime(selectedDrop.createdAt)}</Text>
                </View>
                <View style={[styles.typeContainer, isUpdate ? styles.updateTypeContainer : styles.dropTypeContainer]}>
                  <Feather name={isUpdate ? "bell" : "package"} size={14} color="white" />
                  <Text style={styles.typeContainerText}>{isUpdate ? 'UPDATE' : 'DROP'}</Text>
                </View>
              </View>

              <Text style={[styles.articleTitle, isUpdate && styles.updateArticleTitle]}>
                {selectedDrop.title}
              </Text>

              <Text style={styles.articleDescription}>{selectedDrop.description}</Text>

              {/* Secondary Images Grid */}
              {selectedDrop.secondaryImages && selectedDrop.secondaryImages.length > 0 && (
                <View style={styles.secondaryImagesSection}>
                  <Text style={[styles.sectionTitle, isUpdate && styles.updateSectionTitle]}>
                    {isUpdate ? "Additional Information" : "More Images"}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.secondaryImagesContainer}>
                      {selectedDrop.secondaryImages.map((imageUri, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.secondaryImageWrapper}
                          onPress={() => {
                            setReviewImageIndex(index + 1) // +1 because main image is first
                            openReviewImageViewer(selectedDrop)
                          }}
                        >
                          <Image 
                            source={{ uri: imageUri }} 
                            style={styles.secondaryImage} 
                            resizeMode="cover" 
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  )
}

  const fetchFeaturedBidding = async () => {
    try {
      const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
        const now = new Date()
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

            const nextBid = base > 0 ? Math.ceil(base * 1.05) : minBid

            return {
              id: d.id,
              title: data.name,
              currentBid: base,
              nextBid: nextBid,
              timeLeft: getTimeLeftText(bidEndTime),
              bidders: data.bids?.length || 0,
              image: data.imageUrls?.[0] || "https://via.placeholder.com/150x150/CCCCCC/FFFFFF?text=Auction+Item",
              category: data.category || "",
            }
          })
          .filter(Boolean)
          .slice(0, 4)

        setFeaturedBidding(items)
      })

      return unsubscribe
    } catch (error) {
      console.error("Error fetching bidding items:", error)
    }
  }

  const fetchUserStats = async () => {
    if (!user?.uid) return

    try {
      const productsSnapshot = await getDocs(collection(db, "products"))
      let activeBids = 0
      let endingSoon = 0
      let wonItems = 0

      const now = new Date()
      const soonThreshold = new Date(now.getTime() + 2 * 60 * 60 * 1000) // 2 hours from now

      productsSnapshot.docs.forEach((doc) => {
        const data = doc.data()
        const bidEndTime = data.bidEndTime?.toDate ? data.bidEndTime.toDate() : data.bidEndTime

        const userHasBid = data.bids?.some((bid) => bid.bidderId === user.uid)
        const isAuctionActive =
          bidEndTime &&
          new Date(bidEndTime) > now &&
          data.biddingEnabled &&
          data.status !== "sold" &&
          data.status !== "expired"

        if (userHasBid && isAuctionActive) {
          activeBids++

          // Check if ending soon (within 2 hours)
          if (bidEndTime && new Date(bidEndTime) <= soonThreshold) {
            endingSoon++
          }
        }

        if (data.status === "sold") {
          // Check if user is the highest bidder by comparing bid amounts
          const userBids = data.bids?.filter((bid) => bid.bidderId === user.uid) || []
          if (userBids.length > 0) {
            const userHighestBid = Math.max(...userBids.map((bid) => bid.amount))
            const allBids = data.bids || []
            const overallHighestBid = Math.max(...allBids.map((bid) => bid.amount))

            if (userHighestBid === overallHighestBid) {
              wonItems++
            }
          }
        }
      })

      setUserStats({ activeBids, endingSoon, wonItems })
    } catch (error) {
      console.error("Error fetching user stats:", error)
    }
  }

  const getTimeLeftText = (endTime) => {
    if (!endTime) return "No time limit"

    const now = new Date()
    const end = new Date(endTime)
    const diff = end - now

    if (diff <= 0) return "Ended"

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  }

  const formatDateTime = (date) => {
    const now = new Date()
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60))
      return diffInMinutes < 1 ? "Just now" : `${diffInMinutes}m ago`
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      })
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

  const getUserFirstName = () => {
    if (!user) {
      return "User"
    }

    if (user.firstName) {
      return user.firstName
    }

    if (user.name) {
      const firstName = user.name.split(" ")[0]
      return firstName
    }

    if (user.email) {
      const emailName = user.email.split("@")[0]
      return emailName
    }

    return "User"
  }

const fetchApprovedFeedback = async () => {
  try {
    const feedbackQuery = query(
      collection(db, "feedbacks"),
      where("status", "==", "approved"), // Add this line back
      orderBy("submittedAt", "desc"),
      limit(4)
    )
    
    const snapshot = await getDocs(feedbackQuery)
    const feedback = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    setApprovedFeedback(feedback)
  } catch (error) {
    console.error("Error fetching approved feedback:", error)
  }
}

if (isLoading || isLoadingData) {
  return <LoadingScreen message="Loading Home..." />
}


  return (
    <SafeAreaView>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Modern Header Section */}
        <View style={styles.headerContainer}>
          <LinearGradient colors={["#1A5A1A", "#2E6A2E", "#4A8F4A"]} style={styles.headerGradient}>
            {/* Decorative Elements */}
            <View style={styles.decorativeCircle1} />
            <View style={styles.decorativeCircle2} />
            <View style={styles.decorativeCircle3} />
            
            {/* Header Top Bar */}
            <View style={styles.headerTopBar}>
              <View style={styles.logoContainer}>
                <Image
                  source={require("../assets/images/Welcome/USW-Logo.png")}
                  style={{ width: 30, height: 30, }}
                />
                <Text style={styles.logoText}>Upcycled Streetwear</Text>
              </View>
              <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate("Profile")}>
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileInitial}>{getUserFirstName().charAt(0).toUpperCase()}</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Welcome Section */}
            <View style={styles.welcomeContainer}>
              <Text style={styles.greetingText}>Hey there,</Text>
              <Text style={styles.nameText}>{getUserFirstName()}! <MaterialCommunityIcons name="hand-wave" size={30} color="white" /></Text>
              <View style={styles.taglineContainer}>
                <View style={styles.taglineBadge}>
                  <MaterialCommunityIcons name="tag" size={16} color="#2E6A2E" />
                  <Text style={styles.taglineText}>Sustainably Upcycled Streetwear</Text>
                </View>
                <Text style={styles.descriptionText}>
                  Where Creativity Meets Conscious Fashion
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity 
                style={styles.primaryActionButton}
                onPress={() => navigation.navigate("Bidding")}
              >
                <Feather name="shopping-bag" size={16} color="#2E6A2E" />
                <Text style={styles.primaryActionText}>Start Bidding</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.secondaryActionButton}
                onPress={() => navigation.navigate("News")}
              >
                <Feather name="tag" size={16} color="#FFFFFF" />
                <Text style={styles.secondaryActionText}>Latest Drops</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <MaterialCommunityIcons name="tshirt-crew-outline" size={24} color="#2E6A2E" />
            </View>
            <Text style={styles.statNumber}>{userStats.activeBids}</Text>
            <Text style={styles.statLabel}>Active Bids</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Feather name="clock" size={24} color="#F5A623" />
            </View>
            <Text style={styles.statNumber}>{userStats.endingSoon}</Text>
            <Text style={styles.statLabel}>Ending Soon</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Feather name="award" size={24} color="#D0021B" />
            </View>
            <Text style={styles.statNumber}>{userStats.wonItems}</Text>
            <Text style={styles.statLabel}>Won Items</Text>
          </View>
        </View>

        {/* Featured Drops Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Drops</Text>
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={() => navigation.navigate("News")}
            >
              <Text style={styles.seeAllText}>See All</Text>
              <Feather name="arrow-right" size={14} color="#2E6A2E" />
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionDescription}>Catch the newest drops and updates highlights!</Text>

            {featuredNews.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <Feather name="inbox" size={48} color="#E0E0E0" />
                </View>
                <Text style={styles.emptyStateTitle}>No Updates Yet</Text>
                <Text style={styles.emptyStateText}>
                  Check back later for exciting new drops and announcements!
                </Text>
              </View>
            ) : (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={styles.newsScroll}
                contentContainerStyle={styles.newsScrollContent}
              >
                {featuredNews.map((article) => (
                  <TouchableOpacity 
                    key={article.id} 
                    style={styles.newsCardImproved} 
                    onPress={() => openDropDetails(article)}
                    activeOpacity={0.95}
                  >
                    {/* Image Container with Overlay */}
                    <View style={styles.newsImageWrapper}>
                      {article.mainImage ? (
                        <Image source={{ uri: article.mainImage }} style={styles.newsImageImproved} />
                      ) : (
                        <View style={styles.newsPlaceholder}>
                          <Feather name="image" size={32} color="#CCC" />
                        </View>
                      )}
                      
                      {/* Gradient Overlay */}
                      <View style={styles.newsGradientOverlay} />
                      
                      {/* Type Badge */}
                      <View style={[
                        styles.newsTypeBadge,
                        article.type === 'update' ? styles.newsUpdateBadge : styles.newsDropBadge
                      ]}>
                        <Feather 
                          name={article.type === 'update' ? "bell" : "package"} 
                          size={10} 
                          color="white" 
                        />
                        <Text style={styles.newsTypeText}>
                          {article.type === 'update' ? 'UPDATE' : 'DROP'}
                        </Text>
                      </View>
                      
                      {/* Time Badge */}
                      <View style={styles.newsTimeBadge}>
                        <Feather name="clock" size={10} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.newsTimeText}>{formatDateTime(article.createdAt)}</Text>
                      </View>

                      {/* Image Count Badge */}
                      {article.secondaryImages && article.secondaryImages.length > 0 && (
                        <View style={styles.newsImageCountBadge}>
                          <Feather name="camera" size={10} color="white" />
                          <Text style={styles.newsImageCountText}>+{article.secondaryImages.length}</Text>
                        </View>
                      )}
                    </View>

                    {/* Card Content */}
                    <View style={styles.newsContentImproved}>
                      <Text style={styles.newsTitleImproved} numberOfLines={2}>
                        {article.title}
                      </Text>
                      <Text style={styles.newsDescriptionImproved} numberOfLines={3}>
                        {article.description}
                      </Text>
                      
                      {/* Footer with Read More */}
                      <View style={styles.newsFooterImproved}>
                        <View style={styles.newsReadMoreButton}>
                          <Feather name="arrow-right" size={12} color="#2E6A2E" />
                          <Text style={styles.newsReadMoreText}>Read More</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

        {/* Featured Bidding */}
        <SafeAreaView style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Bidding</Text>
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={() => navigation.navigate("Bidding")}
            >
              <Text style={styles.seeAllText}>See All</Text>
              <Feather name="arrow-right" size={14} color="#2E6A2E" />
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionDescription}>Live Bidding with active bids - place your bids now!</Text>
          {featuredBidding.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="tshirt-crew" size={64} color="#ccc" />
              <Text style={styles.emptyStateTitle}>No Live Bidding</Text>
              <Text style={styles.emptyStateText}>
                There are no items up for bidding right now. Please check back later!
              </Text>
            </View>
          ) : (
          <View style={styles.gridContainer}>
            {featuredBidding.slice(0, 4).map((item) => (
              <View key={item.id} style={styles.gridCard}>
                <TouchableOpacity onPress={() => navigation.navigate("Bidding")}>
                  <Image source={{ uri: item.image }} style={styles.gridImage} />
                  <View style={styles.gridContent}>
                    <Text style={styles.gridTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.gridBid}>₱{item.currentBid?.toLocaleString() || "0"}</Text>
                    <View style={styles.gridInfo}>
                      <View style={styles.gridTimeContainer}>
                        <Feather name="clock" size={12} color="#F5A623" />
                        <Text style={styles.gridTimeText}>{item.timeLeft}</Text>
                      </View>
                      <View style={styles.gridBiddersContainer}>
                        <Feather name="users" size={12} color="#666" />
                        <Text style={styles.gridBiddersText}>{item.bidders}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bidButton} onPress={() => handlePlaceBid(item)}>
                  <Text style={styles.bidButtonText}>Bid ₱{item.nextBid?.toLocaleString()}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
          )}
          
        </SafeAreaView>
        {/* Customer Reviews */}
          {approvedFeedback.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Customer Reviews</Text>
              </View>
              <Text style={styles.sectionDescription}>Real feedback from our community of upcycled streetwear lovers</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewScroll}>
                {approvedFeedback.map((review) => (
                  <View key={review.id} style={styles.reviewCardImproved}>
                    {/* User Info Header */}
                    {/* Product Info Header */}
                      <View style={styles.reviewProductHeader}>
                        <View style={styles.reviewProductIcon}>
                          <MaterialCommunityIcons name="tshirt-crew" size={20} color="#2E6A2E" />
                        </View>
                        <View style={styles.reviewProductDetails}>
                          <Text style={styles.reviewProductTitleText} numberOfLines={1}>
                            {review.productTitle}
                          </Text>
                          <View style={styles.reviewPriceContainer}>
                            <Text style={styles.reviewSoldLabel}>Sold for </Text>
                            <PesoSymbol size={12} color="#666" />
                            <Text style={styles.reviewPriceText}>
                              {(review.winningBid || review.soldPrice || 0).toLocaleString()}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Customer Name Below */}
                      <View style={styles.reviewCustomerRow}>
                        <MaterialCommunityIcons name="account-circle" size={14} color="#888" />
                        <Text style={styles.reviewCustomerName} numberOfLines={1}>
                          {review.userName}
                        </Text>
                        <View style={styles.reviewStarsHorizontal}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <MaterialCommunityIcons
                              key={star}
                              name={star <= review.rating ? "star" : "star-outline"}
                              size={14}
                              color="#FFD700"
                            />
                          ))}
                        </View>
                      </View>

                    {/* Product Title */}
                    <Text style={styles.reviewProductName} numberOfLines={1}>
                      {review.productTitle}
                    </Text>

                  {/* Images Section - Product + User Uploads */}
                  <View style={styles.reviewImagesSection}>
                    {/* Product Image */}
                    {review.productImage && (
                      <TouchableOpacity 
                        style={styles.productImageContainer}
                        onPress={() => openReviewImageViewer(review, 0)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.imageLabel}>Product</Text>
                        <Image 
                          source={{ uri: review.productImage }} 
                          style={styles.reviewMainImage}
                        />
                      </TouchableOpacity>
                    )}

                    {/* User Uploaded Images */}
                    {review.reviewImages && review.reviewImages.length > 0 && (
                      <TouchableOpacity 
                        style={styles.userImagesContainer}
                        onPress={() => openReviewImageViewer(review, review.productImage ? 1 : 0)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.imageLabel}>Customer Photo</Text>
                        <View style={styles.customerImageWrapper}>
                          <Image 
                            source={{ uri: review.reviewImages[0] }} 
                            style={styles.reviewMainImage}
                          />
                          {review.reviewImages.length > 1 && (
                            <View style={styles.multipleImagesOverlay}>
                              <MaterialCommunityIcons name="image-multiple" size={20} color="white" />
                              <Text style={styles.multipleImagesText}>
                                +{review.reviewImages.length - 1}
                              </Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>

                    {/* Review Text */}
                    <Text style={styles.reviewTextImproved} numberOfLines={3}>
                      {review.reviewText || "Great product! Highly recommended."}
                    </Text>

                    {/* Verified Badge */}
                    <View style={styles.verifiedBadge}>
                      <MaterialCommunityIcons name="check-decagram" size={14} color="#2E6A2E" />
                      <Text style={styles.verifiedText}>Verified Purchase</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        {/* Bottom padding for navigation */}
        <View style={styles.bottomPadding} />
      </ScrollView>

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

      {/* Review Image Modal */}
          <Modal
            visible={reviewImageModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setReviewImageModalVisible(false)}
          >
            <View style={styles.imageModalContainer}>
              {/* Make header absolute positioned */}
              <View style={styles.imageModalHeaderAbsolute}>
                <View style={styles.imageModalInfo}>
                  <Text style={styles.imageCounter}>
                    {reviewImageIndex + 1} of {selectedReviewImages.length}
                  </Text>
                  <View style={[
                    styles.imageTypeBadge,
                    selectedReviewImages[reviewImageIndex]?.type === 'customer' && styles.customerImageBadge
                  ]}>
                    <MaterialCommunityIcons 
                      name={
                              selectedReviewImages[reviewImageIndex]?.type === 'customer' ? "camera" :
                              selectedReviewImages[reviewImageIndex]?.type === 'drop' ? "package" : "package"
                            }
                      size={14} 
                      color="white" 
                    />
                    <Text style={styles.imageTypeText}>
                      {
                        selectedReviewImages[reviewImageIndex]?.type === 'customer' ? 'Customer Photo' :
                        selectedReviewImages[reviewImageIndex]?.type === 'drop' ? 'Drop Image' : 'Product Image'
                      }
                    </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.closeButton} 
                  onPress={() => setReviewImageModalVisible(false)}
                >
                  <Feather name="x" size={24} color="white" />
                </TouchableOpacity>
              </View>

              {/* Centered ScrollView */}
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.imageScrollContent}
                onMomentumScrollEnd={(event) => {
                  const index = Math.round(event.nativeEvent.contentOffset.x / width)
                  setReviewImageIndex(index)
                }}
                contentOffset={{ x: reviewImageIndex * width, y: 0 }}
              >
                {selectedReviewImages.map((image, index) => (
                  <View key={index} style={styles.imageSlideContainer}>
                    <View style={styles.imageWrapper}>
                      <Image 
                        source={{ uri: image.uri }} 
                        style={styles.fullScreenImage} 
                        resizeMode="cover"
                      />
                    </View>
                  </View>
                ))}
              </ScrollView>

              {/* Absolute positioned dots */}
              {selectedReviewImages.length > 1 && (
                <View style={styles.imageDotsAbsolute}>
                  {selectedReviewImages.map((_, index) => (
                    <View 
                      key={index} 
                      style={[
                        styles.imageDot, 
                        reviewImageIndex === index && styles.activeImageDot
                      ]} 
                    />
                  ))}
                </View>
              )}
            </View>
          </Modal>
          {renderDropDetailModal()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFCF3",
  },
  container: {
    backgroundColor: "#FFFCF3",
  },
  // New Modern Header Styles
  headerContainer: {
    position: 'relative',
  },
  headerGradient: {
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -20,
    right: -30,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    top: 80,
    left: -20,
  },
  decorativeCircle3: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    bottom: 20,
    right: 50,
  },
  headerTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    zIndex: 1,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  profileButton: {
    padding: 2,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profileInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  welcomeContainer: {
    marginBottom: 25,
    zIndex: 1,
  },
  greetingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  nameText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  taglineContainer: {
    alignItems: 'flex-start',
  },
  taglineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  taglineText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E6A2E',
    marginLeft: 6,
  },
  descriptionText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    zIndex: 1,
  },
  primaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E6A2E',
    marginLeft: 6,
  },
  secondaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  // Enhanced Stats Container
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginTop: 10,
    zIndex: 2,
  },
  statCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#135918",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 5,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#135918",
  },
  sectionDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
    lineHeight: 20,
  },
  seeAllText: {
    fontSize: 14,
    color: "#2E6A2E",
    fontWeight: "600",
  },
  newsScroll: {
    marginTop: 10,
  paddingHorizontal: 5,
  paddingVertical: 10,
  },
  newsImage: {
    width: "100%",
    height: 140,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  newsContent: {
    padding: 15,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#135918",
    marginBottom: 8,
    lineHeight: 20,
  },
  newsDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 18,
    marginBottom: 12,
  },
  newsFooter: {
    flexDirection: "row",
    alignItems: "center",
  },
  newsTime: {
    fontSize: 12,
    color: "#888",
    marginLeft: 4,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 10,
    marginHorizontal: -5,
  },
  gridCard: {
    backgroundColor: "white",
      borderRadius: 12,
      width: (width - 50) / 2, // Maintain responsive width
      marginBottom: 10, // Reduced from 15 to minimize vertical gap
      marginHorizontal: 5, // Add small horizontal margin for even spacing
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      overflow: "hidden",
  },
  gridImage: {
    width: "100%",
    height: 100,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  gridContent: {
    padding: 10,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  gridBid: {
    fontSize: 14,
    color: "#2E6A2E",
    fontWeight: "600",
    marginBottom: 8,
  },
  gridInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gridTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  gridTimeText: {
    fontSize: 10,
    color: "#F5A623",
    marginLeft: 3,
    fontWeight: "500",
  },
  gridBiddersContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  gridBiddersText: {
    fontSize: 10,
    color: "#666",
    marginLeft: 3,
  },
  bidButton: {
    backgroundColor: "#2E6A2E",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    alignItems: "center",
    marginTop: 0,
  },
  bidButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
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
    width: width * 0.9,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 15,
  },
  modalItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2E6A2E",
    textAlign: "center",
    marginBottom: 20,
  },
  modalBidRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalCurrentBid: {
    fontSize: 14,
    color: "#666",
  },
  modalMinBid: {
    fontSize: 14,
    color: "#2E6A2E",
    fontWeight: "600",
  },
  pesoAmountContainer: {
    flexDirection: "row",
    alignItems: "center",
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
    paddingVertical: 12,
  },
  bidInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    paddingVertical: 12,
    borderRadius: 10,
    marginRight: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "#2E6A2E",
    paddingVertical: 12,
    borderRadius: 10,
    marginLeft: 10,
    alignItems: "center",
  },
  confirmButtonText: {
    fontSize: 16,
    color: "white",
    fontWeight: "600",
  },
  bottomPadding: {
    height: 100, // Space for bottom navigation
  },

  reviewCard: {
  backgroundColor: "white",
  borderRadius: 12,
  width: (width - 50) / 2,
  marginBottom: 15,
  marginHorizontal: 5,
  padding: 12,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
},
reviewHeader: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 8,
},
reviewProductImage: {
  width: 30,
  height: 30,
  borderRadius: 15,
  marginRight: 8,
},
reviewInfo: {
  flex: 1,
},
reviewUserName: {
  fontSize: 12,
  fontWeight: "600",
  color: "#333",
},
reviewProductTitle: {
  fontSize: 10,
  color: "#666",
  marginBottom: 2,
},
reviewStars: {
  flexDirection: "row",
},
reviewText: {
  fontSize: 12,
  color: "#666",
  lineHeight: 16,
  fontStyle: "italic",
},

reviewScroll: {
  marginTop: 10,
  paddingHorizontal: 5,
},
reviewCardImproved: {
  backgroundColor: "white",
  borderRadius: 16,
  padding: 16,
  marginRight: 15,
  width: 300,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.12,
  shadowRadius: 8,
  elevation: 5,
},
reviewProductHeader: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 10,
  paddingBottom: 10,
  borderBottomWidth: 1,
  borderBottomColor: "#F0F0F0",
},
reviewProductIcon: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: "rgba(46, 106, 46, 0.1)",
  justifyContent: "center",
  alignItems: "center",
  marginRight: 12,
},
reviewProductDetails: {
  flex: 1,
},
reviewProductTitleText: {
  fontSize: 15,
  fontWeight: "700",
  color: "#333",
  marginBottom: 4,
},
reviewPriceContainer: {
  flexDirection: "row",
  alignItems: "center",
},
reviewSoldLabel: {
  fontSize: 12,
  color: "#666",
  fontWeight: "500",
},
reviewPriceText: {
  fontSize: 13,
  fontWeight: "700",
  color: "#2E6A2E",
  marginLeft: 2,
},
reviewCustomerRow: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 10,
  gap: 6,
},
reviewCustomerName: {
  fontSize: 12,
  color: "#888",
  fontWeight: "500",
  flex: 1,
},
reviewStarsHorizontal: {
  flexDirection: "row",
  gap: 2,
},
reviewProductName: {
  fontSize: 13,
  color: "#666",
  marginBottom: 12,
  fontStyle: "italic",
},
reviewImagesSection: {
  flexDirection: "row",
  gap: 10,
  marginBottom: 12,
},
productImageContainer: {
  flex: 1,
},
userImagesContainer: {
  flex: 1,
},
imageLabel: {
  fontSize: 10,
  color: "#888",
  marginBottom: 4,
  fontWeight: "600",
  textTransform: "uppercase",
},
reviewMainImage: {
  width: "100%",
  height: 120,
  borderRadius: 12,
  backgroundColor: "#F0F0F0",
},
moreImagesOverlay: {
  position: "absolute",
  bottom: 8,
  right: 8,
  backgroundColor: "rgba(0, 0, 0, 0.7)",
  borderRadius: 12,
  paddingHorizontal: 8,
  paddingVertical: 4,
},
moreImagesText: {
  color: "white",
  fontSize: 12,
  fontWeight: "600",
},
reviewTextImproved: {
  fontSize: 13,
  color: "#444",
  lineHeight: 18,
  marginBottom: 12,
},
verifiedBadge: {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
},
verifiedText: {
  fontSize: 11,
  color: "#2E6A2E",
  fontWeight: "600",
},

customerImageWrapper: {
  position: 'relative',
},
multipleImagesOverlay: {
  position: "absolute",
  bottom: 0,
  right: 0,
  left: 0,
  backgroundColor: "rgba(0, 0, 0, 0.75)",
  paddingVertical: 6,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  borderBottomLeftRadius: 12,
  borderBottomRightRadius: 12,
},
multipleImagesText: {
  color: "white",
  fontSize: 12,
  fontWeight: "700",
},
imageModalContainer: {
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.95)",
  justifyContent: "center", // Add this
  alignItems: "center", // Add this
},
imageModalHeaderAbsolute: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
  paddingTop: 50,
  paddingHorizontal: 20,
  paddingBottom: 15,
  zIndex: 10,
},
imageScrollContent: {
  alignItems: "center", // Centers content vertically
},
imageSlideContainer: {
  width: width,
  height: height,
  justifyContent: "center",
  alignItems: "center",
},
imageWrapper: {
  width: width - 40,
  height: width - 40,
  backgroundColor: "#1a1a1a",
  borderRadius: 12,
  overflow: "hidden",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 8,
},
fullScreenImage: {
  width: "100%",
  height: "100%",
},
imageDotsAbsolute: {
  position: "absolute",
  bottom: 50,
  left: 0,
  right: 0,
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  gap: 6,
  zIndex: 10,
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
sectionSubtitleInline: {
  fontSize: 13,
  color: "#666",
  marginTop: 2,
  fontWeight: "500",
},
seeAllButton: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "rgba(46, 106, 46, 0.1)",
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 20,
  gap: 4,
},
newsScrollContent: {
  paddingHorizontal: 5,
  paddingVertical: 10,
},

newsCardImproved: {
  backgroundColor: "white",
  borderRadius: 16,
  width: 300,
  marginRight: 15,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 12,
  elevation: 6,
  overflow: "hidden",
},
newsImageWrapper: {
  position: "relative",
  height: 180,
  backgroundColor: "#F0F0F0",
},
newsImageImproved: {
  width: "100%",
  height: "100%",
},
newsPlaceholder: {
  width: "100%",
  height: "100%",
  backgroundColor: "#F5F5F5",
  justifyContent: "center",
  alignItems: "center",
},
newsGradientOverlay: {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  height: 80,
  backgroundColor: "rgba(0,0,0,0.3)",
},
newsTypeBadge: {
  position: "absolute",
  top: 12,
  left: 12,
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 20,
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
  elevation: 3,
},
newsUpdateBadge: {
  backgroundColor: "rgba(46, 106, 46, 0.95)",
},
newsDropBadge: {
  backgroundColor: "rgba(46, 106, 46, 0.95)",
},
newsTypeText: {
  color: "white",
  fontSize: 10,
  fontWeight: "800",
  letterSpacing: 0.5,
},
newsTimeBadge: {
  position: "absolute",
  bottom: 12,
  left: 12,
  backgroundColor: "rgba(0, 0, 0, 0.7)",
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 20,
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
},
newsTimeText: {
  color: "rgba(255,255,255,0.9)",
  fontSize: 11,
  fontWeight: "600",
},
newsImageCountBadge: {
  position: "absolute",
  top: 12,
  right: 12,
  backgroundColor: "rgba(0, 0, 0, 0.7)",
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 20,
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
},
newsImageCountText: {
  color: "white",
  fontSize: 11,
  fontWeight: "600",
},
newsContentImproved: {
  padding: 16,
},
newsTitleImproved: {
  fontSize: 17,
  fontWeight: "700",
  color: "#135918",
  marginBottom: 8,
  lineHeight: 22,
},
newsDescriptionImproved: {
  fontSize: 14,
  color: "#666",
  lineHeight: 20,
  marginBottom: 12,
},
newsFooterImproved: {
  flexDirection: "row",
  justifyContent: "flex-end",
  alignItems: "center",
  marginTop: 4,
},
newsReadMoreButton: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "rgba(46, 106, 46, 0.1)",
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 20,
  gap: 4,
},
newsReadMoreText: {
  fontSize: 12,
  color: "#2E6A2E",
  fontWeight: "700",
  letterSpacing: 0.3,
},
emptyIconContainer: {
  width: 100,
  height: 100,
  borderRadius: 50,
  backgroundColor: "#F5F5F5",
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 20,
},
emptyStateTitle: {
  fontSize: 20,
  fontWeight: "700",
  color: "#333",
  marginBottom: 8,
  textAlign: "center",
},
emptyStateText: {
  fontSize: 15,
  color: "#666",
  textAlign: "center",
  lineHeight: 22,
  paddingHorizontal: 20,
},

articleModalContainer: {
  flex: 1,
  backgroundColor: "#F8F9FA",
},
articleModalHeader: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 16,
  paddingVertical: 12,
  backgroundColor: "white",
  borderBottomWidth: 1,
  borderBottomColor: "#E5E5E5",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
},
updateModalHeader: {
  backgroundColor: "rgba(52, 152, 219, 0.05)",
  borderBottomColor: "rgba(52, 152, 219, 0.2)",
},
backButton: {
  padding: 8,
  borderRadius: 20,
  backgroundColor: "rgba(46, 106, 46, 0.1)",
},
articleModalTitle: {
  fontSize: 18,
  fontWeight: "700",
  color: "#135918",
  textAlign: "center",
},
updateModalTitle: {
  color: "#135918",
},
headerSpacer: {
  width: 40,
},
articleContent: {
  flex: 1,
},
mainImageContainer: {
  position: "relative",
  height: 240,
  backgroundColor: "#F0F0F0",
},
articleMainImage: {
  width: "100%",
  height: "100%",
},
galleryIndicator: {
  position: "absolute",
  bottom: 12,
  right: 12,
  backgroundColor: "rgba(0, 0, 0, 0.8)",
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 16,
  flexDirection: "row",
  alignItems: "center",
},
updateGalleryIndicator: {
  backgroundColor: "rgba(46, 106, 46, 0.9)",
},
galleryText: {
  color: "white",
  fontSize: 12,
  fontWeight: "600",
  marginLeft: 6,
},
articleInfo: {
  padding: 16,
  backgroundColor: "white",
},
articleMeta: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
},
timeContainer: {
  flexDirection: "row",
  alignItems: "center",
},
articleTime: {
  fontSize: 14,
  color: "#666",
  marginLeft: 6,
  fontWeight: "500",
},
typeContainer: {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 12,
},
updateTypeContainer: {
  backgroundColor: "#2E6A2E",
},
dropTypeContainer: {
  backgroundColor: "#2E6A2E",
},
typeContainerText: {
  color: "white",
  fontSize: 11,
  fontWeight: "700",
  marginLeft: 4,
  letterSpacing: 0.5,
},
articleTitle: {
  fontSize: 24,
  fontWeight: "800",
  color: "#135918",
  marginBottom: 12,
  lineHeight: 32,
  textAlign: "left",
},
updateArticleTitle: {
  color: "#135918",
},
articleDescription: {
  fontSize: 16,
  color: "#333",
  lineHeight: 24,
  marginBottom: 20,
},
secondaryImagesSection: {
  marginTop: 8,
},
sectionTitle: {
  fontSize: 18,
  fontWeight: "700",
  color: "#135918",
  marginBottom: 12,
},
updateSectionTitle: {
  color: "#135918",
},
secondaryImagesContainer: {
  flexDirection: "row",
  paddingRight: 16,
},
secondaryImageWrapper: {
  marginRight: 8,
  borderRadius: 10,
  overflow: "hidden",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
},
secondaryImage: {
  width: 110,
  height: 110,
},

customerImageBadge: {
  backgroundColor: "rgba(46, 106, 46, 0.9)",
},
imageTypeBadge: {
  backgroundColor: "rgba(0, 0, 0, 0.7)",
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 20,
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
},
imageTypeText: {
  color: "white",
  fontSize: 10,
  fontWeight: "800",
  letterSpacing: 0.5,
},
})