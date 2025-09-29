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
  FlatList,
  RefreshControl,
  Dimensions,
  Alert,
} from "react-native"
import Feather from "react-native-vector-icons/Feather"
import { collection, getDocs, query, orderBy, where } from "firebase/firestore"
import { db } from "../firebase/firebase"
import LoadingScreen from "../hooks/LoadingScreen"
import { SafeAreaView } from "react-native-safe-area-context"

const { width: screenWidth, height: screenHeight } = Dimensions.get("window")
const cardWidth = (screenWidth - 48) / 2 // 2 columns with padding

export default function NewsScreen({ navigation }) {
  const [newsArticles, setNewsArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedImages, setSelectedImages] = useState([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [imageModalVisible, setImageModalVisible] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [articleModalVisible, setArticleModalVisible] = useState(false)
  const [activeTab, setActiveTab] = useState('drops') // 'updates' or 'drops'
  // Add this to your existing state variables
  const [featuredArticles, setFeaturedArticles] = useState([])
  const [heroCurrentIndex, setHeroCurrentIndex] = useState(0)

  const getFeaturedArticles = () => {
  return newsArticles.slice(0, 3) // Get latest 3 articles
}

useEffect(() => {
  fetchNews()
}, [])

useEffect(() => {
  if (newsArticles.length > 0) {
    setFeaturedArticles(getFeaturedArticles())
  }
}, [newsArticles])

const renderHeroCarousel = () => {
  if (featuredArticles.length === 0) return null

  return (
    <View style={styles.heroSection}>
      <Text style={styles.heroTitle}>Featured</Text>
      <FlatList
        data={featuredArticles}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / (screenWidth - 40))
          setHeroCurrentIndex(index)
        }}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.heroCard}
            onPress={() => openArticleDetails(item)}
            activeOpacity={0.9}
          >
            <View style={styles.heroImageContainer}>
              {item.mainImage ? (
                <Image source={{ uri: item.mainImage }} style={styles.heroImage} resizeMode="cover" />
              ) : (
                <View style={[styles.heroPlaceholder, item.type === 'update' && styles.heroUpdatePlaceholder]}>
                  <Feather name={item.type === 'update' ? "bell" : "package"} size={48} color={item.type === 'update' ? "#135918" : "#CCC"} />
                </View>
              )}
              
              {/* Hero Overlay */}
              <View style={styles.heroOverlay}>
                {/* Type Badge */}
                <View style={[styles.heroTypeBadge, item.type === 'update' ? styles.heroUpdateBadge : styles.heroDropBadge]}>
                  <Feather name={item.type === 'update' ? "bell" : "package"} size={12} color="white" />
                  <Text style={styles.heroTypeText}>{item.type === 'update' ? 'UPDATE' : 'DROP'}</Text>
                </View>

                {/* Hero Content */}
                <View style={styles.heroContent}>
                  <Text style={styles.heroCardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.heroDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                  <View style={styles.heroMeta}>
                    <View style={styles.heroTimeContainer}>
                      <Feather name="clock" size={12} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.heroTime}>{formatDateTime(item.createdAt)}</Text>
                    </View>
                    {item.secondaryImages && item.secondaryImages.length > 0 && (
                      <View style={styles.heroImageCount}>
                        <Feather name="camera" size={12} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.heroImageCountText}>+{item.secondaryImages.length}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* New Badge */}
              {index === 0 && (
                <View style={styles.heroNewBadge}>
                  <Text style={styles.heroNewText}>LATEST</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
      />
      
      {/* Pagination Dots */}
      {featuredArticles.length > 1 && (
        <View style={styles.heroDots}>
          {featuredArticles.map((_, index) => (
            <View key={index} style={[styles.heroDot, heroCurrentIndex === index && styles.heroActiveDot]} />
          ))}
        </View>
      )}
    </View>
  )
}
const renderSectionDivider = () => (
  <View style={styles.sectionDivider}>
    <Text style={styles.sectionTitle}>All {activeTab === 'updates' ? 'Updates' : 'Drops'}</Text>
    <Text style={styles.sectionSubtitle}>{filteredArticles.length} items</Text>
  </View>
)

  const fetchNews = async () => {
    try {
      setLoading(true)
      const newsCollection = collection(db, "news")
      const q = query(newsCollection, orderBy("createdAt", "desc"))
      const snapshot = await getDocs(q)

      const fetchedNews = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }))

      setNewsArticles(fetchedNews)
    } catch (error) {
      console.error("Error fetching news:", error)
      Alert.alert("Error", "Failed to load news articles")
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchNews()
    setRefreshing(false)
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

  const openArticleDetails = (article) => {
    setSelectedArticle(article)
    setArticleModalVisible(true)
  }

  const openImageViewer = (article) => {
    const allImages = []
    if (article.mainImage) {
      allImages.push(article.mainImage)
    }
    if (article.secondaryImages && article.secondaryImages.length > 0) {
      allImages.push(...article.secondaryImages)
    }

    if (allImages.length > 0) {
      setSelectedImages(allImages)
      setCurrentImageIndex(0)
      setImageModalVisible(true)
    }
  }

  // Filter articles based on active tab
  const filteredArticles = newsArticles.filter(article => {
    if (activeTab === 'updates') {
      return article.type === 'update'
    } else {
      return article.type === 'drop'
    }
  })

  const getTabStats = (type) => {
    return newsArticles.filter(article => article.type === type).length
  }

  const renderGridItem = ({ item, index }) => {
    const isEven = index % 2 === 0
    const isUpdate = item.type === 'update'

    return (
      <TouchableOpacity
        style={[
          styles.gridCard, 
          isUpdate && styles.updateCard
        ]}
        onPress={() => openArticleDetails(item)}
        activeOpacity={0.85}
      >
        {/* Card Image with Gradient Overlay */}
        <View style={styles.imageContainer}>
          {item.mainImage ? (
            <Image source={{ uri: item.mainImage }} style={styles.cardImage} resizeMode="cover" />
          ) : (
            <View style={[styles.placeholderImage, isUpdate && styles.updatePlaceholder]}>
              <Feather name={isUpdate ? "bell" : "package"} size={32} color={isUpdate ? "#135918" : "#CCC"} />
            </View>
          )}

          {/* Gradient Overlay */}
          <View style={styles.gradientOverlay} />

          {/* Type Badge */}
          <View style={[styles.typeBadge, isUpdate ? styles.updateBadge : styles.dropBadge]}>
            <Feather name={isUpdate ? "bell" : "package"} size={10} color="white" />
            <Text style={styles.typeText}>{isUpdate ? 'UPDATE' : 'DROP'}</Text>
          </View>

          {/* Image Count Badge */}
          {item.secondaryImages && item.secondaryImages.length > 0 && (
            <View style={styles.imageCountBadge}>
              <Feather name="camera" size={10} color="white" />
              <Text style={styles.imageCountText}>+{item.secondaryImages.length}</Text>
            </View>
          )}

          {/* Time Badge */}
          <View style={[styles.timeBadge, isUpdate && styles.updateTimeBadge]}>
            <Text style={styles.timeText}>{formatDateTime(item.createdAt)}</Text>
          </View>
        </View>

        {/* Card Content */}
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, isUpdate && styles.updateTitle]} numberOfLines={2}>
            {item.title}
          </Text>

          <Text style={styles.cardDescription} numberOfLines={3}>
            {item.description}
          </Text>

          {/* Action Button */}
          <View style={styles.cardFooter}>
            <View style={[styles.viewButton, isUpdate && styles.updateViewButton]}>
              <Feather name={isUpdate ? "info" : "eye"} size={12} color={isUpdate ? "#2E6A2E" : "#2E6A2E"} />
              <Text style={[styles.viewButtonText, isUpdate && styles.updateViewButtonText]}>
                {isUpdate ? "Read" : "View"}
              </Text>
            </View>
          </View>
        </View>

        {/* New Indicator */}
        {index < 2 && (
          <View style={[styles.newIndicator, isUpdate && styles.updateNewIndicator]}>
            <Text style={styles.newText}>NEW</Text>
          </View>
        )}
      </TouchableOpacity>
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
            <Feather name="x" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={selectedImages}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth)
            setCurrentImageIndex(index)
          }}
          renderItem={({ item }) => (
            <View style={styles.imageSlideContainer}>
              <Image source={{ uri: item }} style={styles.fullScreenImage} resizeMode="contain" />
            </View>
          )}
          keyExtractor={(item, index) => index.toString()}
        />

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

  const renderArticleDetailModal = () => {
    const isUpdate = selectedArticle?.type === 'update'
    
    return (
      <Modal visible={articleModalVisible} animationType="slide" onRequestClose={() => setArticleModalVisible(false)}>
        <SafeAreaView style={styles.articleModalContainer}>
          {/* Header */}
          <View style={[styles.articleModalHeader, isUpdate && styles.updateModalHeader]}>
            <TouchableOpacity style={styles.backButton} onPress={() => setArticleModalVisible(false)}>
              <Feather name="arrow-left" size={24} color={isUpdate ? "#135918" : "#2E6A2E"} />
            </TouchableOpacity>
            <Text style={[styles.articleModalTitle, isUpdate && styles.updateModalTitle]}>
              {isUpdate ? "Update Details" : "Drop Details"}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          {selectedArticle && (
            <ScrollView style={styles.articleContent} showsVerticalScrollIndicator={false}>
              {/* Main Image */}
              {selectedArticle.mainImage && (
                <TouchableOpacity style={styles.mainImageContainer} onPress={() => openImageViewer(selectedArticle)}>
                  <Image source={{ uri: selectedArticle.mainImage }} style={styles.articleMainImage} resizeMode="cover" />
                  {/* Image Gallery Indicator */}
                  {selectedArticle.secondaryImages && selectedArticle.secondaryImages.length > 0 && (
                    <View style={[styles.galleryIndicator, isUpdate && styles.updateGalleryIndicator]}>
                      <Feather name="camera" size={16} color="white" />
                      <Text style={styles.galleryText}>View Gallery ({selectedArticle.secondaryImages.length + 1})</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}

              {/* Article Info */}
              <View style={styles.articleInfo}>
                <View style={styles.articleMeta}>
                  <View style={styles.timeContainer}>
                    <Feather name="clock" size={14} color="#666" />
                    <Text style={styles.articleTime}>{formatDateTime(selectedArticle.createdAt)}</Text>
                  </View>
                  <View style={[styles.typeContainer, isUpdate ? styles.updateTypeContainer : styles.dropTypeContainer]}>
                    <Feather name={isUpdate ? "bell" : "package"} size={14} color="white" />
                    <Text style={styles.typeContainerText}>{isUpdate ? 'UPDATE' : 'DROP'}</Text>
                  </View>
                </View>

                <Text style={[styles.articleTitle, isUpdate && styles.updateArticleTitle]}>{selectedArticle.title}</Text>

                <Text style={styles.articleDescription}>{selectedArticle.description}</Text>

                {/* Secondary Images Grid */}
                {selectedArticle.secondaryImages && selectedArticle.secondaryImages.length > 0 && (
                  <View style={styles.secondaryImagesSection}>
                    <Text style={[styles.sectionTitle, isUpdate && styles.updateSectionTitle]}>
                      {isUpdate ? "Additional Information" : "More Images"}
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.secondaryImagesContainer}>
                        {selectedArticle.secondaryImages.map((imageUri, index) => (
                          <TouchableOpacity
                            key={index}
                            style={styles.secondaryImageWrapper}
                            onPress={() => {
                              setCurrentImageIndex(index + 1) // +1 because main image is first
                              openImageViewer(selectedArticle)
                            }}
                          >
                            <Image source={{ uri: imageUri }} style={styles.secondaryImage} resizeMode="cover" />
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

  if (loading) {
    return <LoadingScreen message="Loading content..." />
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Enhanced Header with Tabs */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Updates & Drops</Text>
          <Text style={styles.headerSubtitle}>Stay updated with the latest announcements and upcoming drops</Text>
          
          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'drops' && styles.activeTab]}
              onPress={() => setActiveTab('drops')}
            >
              <Feather name="package" size={16} color={activeTab === 'drops' ? "white" : "rgba(255, 255, 255, 0.7)"} />
              <Text style={[styles.tabText, activeTab === 'drops' && styles.activeTabText]}>
                Drops ({getTabStats('drop')})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, activeTab === 'updates' && styles.activeTab]}
              onPress={() => setActiveTab('updates')}
            >
              <Feather name="bell" size={16} color={activeTab === 'updates' ? "white" : "rgba(255, 255, 255, 0.7)"} />
              <Text style={[styles.tabText, activeTab === 'updates' && styles.activeTabText]}>
                Updates ({getTabStats('update')})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

          {/* Grid Content */}
          <ScrollView 
            style={styles.mainScrollContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2E6A2E"]} tintColor="#2E6A2E" />
            }
          >
            {/* Hero Section */}
            {newsArticles.length > 0 && renderHeroCarousel()}
            
            {/* Section Divider */}
            {filteredArticles.length > 0 && renderSectionDivider()}
            
            {/* Grid Section */}
            {filteredArticles.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <Feather 
                    name={activeTab === 'updates' ? "bell-off" : "package"} 
                    size={48} 
                    color="#CCC" 
                  />
                </View>
                <Text style={styles.emptyStateText}>
                  No {activeTab === 'updates' ? 'updates' : 'drops'} available
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  {activeTab === 'updates' 
                    ? "Check back later for important updates and announcements" 
                    : "Pull down to refresh and check for new drops"
                  }
                </Text>
              </View>
            ) : (
              <View style={styles.gridSection}>
                <FlatList
                  data={filteredArticles}
                  renderItem={renderGridItem}
                  numColumns={2}
                  scrollEnabled={false} // Disable FlatList scrolling since we're using ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.gridContent}
                  columnWrapperStyle={styles.gridRow}
                  ItemSeparatorComponent={() => <View style={styles.rowSeparator} />}
                />
              </View>
            )}
            
            {/* Bottom Padding */}
            <View style={styles.bottomPadding} />
          </ScrollView>

      {renderArticleDetailModal()}
      {renderImageViewer()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFCF3",
  },

  // Enhanced Header Styles
  header: {
    backgroundColor: "#1A5B1A",
    paddingVertical: 20, // Reduced slightly for tighter layout
    paddingHorizontal: 16, // Standardized padding
    borderBottomLeftRadius: 16, // Slightly smaller radius for balance
    borderBottomRightRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  headerContent: {
    flexDirection: "column",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "white",
    marginBottom: 8, // Increased for better spacing
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.85)",
    marginBottom: 16, // Adjusted for consistent spacing
    lineHeight: 18,
  },

  // Tab Navigation
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 6, // Increased padding for touch targets
    marginHorizontal: 16, // Ensure tabs don't touch edges
    justifyContent: "space-between", // Evenly distribute tabs
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10, // Adjusted for balance
    borderRadius: 8,
    marginHorizontal: 4, // Add small gap between tabs
  },
  activeTab: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.7)",
    marginLeft: 6,
  },
  activeTabText: {
    color: "white",
  },

  // Grid Layout Styles
  gridContainer: {
    flex: 1,
  },
  gridContent: {
    paddingHorizontal: 16, // Reduced to align with hero section
    paddingVertical: 12, // Consistent vertical padding
  },
  gridRow: {
    justifyContent: "space-between", // Ensure even spacing
    paddingHorizontal: 0, // Add padding to row for consistency
  },
  rowSeparator: {
    height: 12, // Reduced for tighter grid
  },

  // Grid Card Styles
  gridCard: {
    width: (screenWidth - 48) / 2, // Adjusted for consistent spacing
    backgroundColor: "white",
    borderRadius: 16, // Slightly smaller radius for modern look
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    overflow: "hidden",
    marginVertical: 6, // Added vertical margin for balance
  },
  updateCard: {
    borderWidth: 1,
    borderColor: "rgba(46, 106, 46, 0.9)",
  },

  imageContainer: {
    position: "relative",
    height: 150, // Slightly reduced for compact layout
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  updatePlaceholder: {
    backgroundColor: "rgba(52, 152, 219, 0.1)",
  },
  gradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: "rgba(0,0,0,0.1)",
  },

  // Badges
  typeBadge: {
    position: "absolute",
    bottom: 10, // Adjusted for better alignment
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10, // Smaller radius for consistency
    flexDirection: "row",
    alignItems: "center",
  },
  updateBadge: {
    backgroundColor: "rgba(46, 106, 46, 0.9)",
  },
  dropBadge: {
    backgroundColor: "rgba(46, 106, 46, 0.9)",
  },
  typeText: {
    color: "white",
    fontSize: 9,
    fontWeight: "800",
    marginLeft: 3,
    letterSpacing: 0.5,
  },
  imageCountBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  imageCountText: {
    color: "white",
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 3,
  },
  timeBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(46, 106, 46, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  updateTimeBadge: {
    backgroundColor: "rgba(46, 106, 46, 0.9)",
  },
  timeText: {
    color: "white",
    fontSize: 11,
    fontWeight: "600",
  },
  newIndicator: {
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "#FF4757",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 0,
    borderTopLeftRadius: 16, // Match card radius
    borderBottomRightRadius: 10,
    zIndex: 10,
  },
  updateNewIndicator: {
    backgroundColor: "#FF4757",
  },
  newText: {
    color: "white",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // Card Content
  cardContent: {
    padding: 12, // Reduced for compact layout
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#135918",
    marginBottom: 6, // Adjusted for spacing
    lineHeight: 20,
  },
  updateTitle: {
    color: "#135918",
  },
  cardDescription: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
    marginBottom: 10,
    flex: 1,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(46, 106, 46, 0.1)",
    borderRadius: 8,
  },
  updateViewButton: {
    backgroundColor: "rgba(52, 152, 219, 0.1)",
  },
  viewButtonText: {
    fontSize: 11,
    color: "#2E6A2E",
    fontWeight: "700",
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  updateViewButtonText: {
    color: "#2E6A2E",
  },

  // Empty State
  emptyStateContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60, // Reduced for better fit
    paddingHorizontal: 32,
    minHeight: 280,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
  },

  // Modal Styles
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
    paddingTop: 40, // Adjusted for safe area
    paddingHorizontal: 16,
    paddingBottom: 16,
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
  imageSlideContainer: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenImage: {
    width: screenWidth,
    height: screenHeight * 0.8,
  },
  imageDots: {
    position: "absolute",
    bottom: 40, // Adjusted for better positioning
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

  // Article Detail Modal
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
    textAlign: "center", // Center title
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
    height: 240, // Slightly reduced for balance
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
    padding: 16, // Standardized padding
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
    textAlign: "left", // Ensure left-aligned for readability
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
  secondaryImagesContainer: {
    flexDirection: "row",
    paddingRight: 16,
  },
  secondaryImageWrapper: {
    marginRight: 8, // Reduced for tighter spacing
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryImage: {
    width: 110, // Slightly smaller for better fit
    height: 110,
  },

  // Hero Section
  heroSection: {
    paddingVertical: 16, // Adjusted for consistency
    paddingHorizontal: 16,
    backgroundColor: "#FFFCF3",
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#135918",
    marginBottom: 12,
    letterSpacing: -0.3,
    textAlign: "left",
    paddingRight: 16,
  },
  heroCard: {
    width: screenWidth - 40, // Adjusted for proper full width display
    height: 200,
    marginRight: 16, // Consistent margin for carousel spacing
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  heroImageContainer: {
    flex: 1,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  heroUpdatePlaceholder: {
    backgroundColor: "rgba(52, 152, 219, 0.1)",
  },
  heroOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 16, // Standardized padding
    justifyContent: "space-between",
  },
  heroTypeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(46, 106, 46, 0.9)",
  },
  heroUpdateBadge: {
    backgroundColor: "rgba(52, 152, 219, 0.9)",
  },
  heroDropBadge: {
    backgroundColor: "rgba(46, 106, 46, 0.9)",
  },
  heroTypeText: {
    color: "white",
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  heroContent: {
    flex: 1,
    justifyContent: "flex-end",
  },
  heroCardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "white",
    marginBottom: 6,
    lineHeight: 24,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  heroDescription: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    lineHeight: 20,
    marginBottom: 10,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  heroMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroTime: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginLeft: 4,
    fontWeight: "500",
  },
  heroImageCount: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroImageCountText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginLeft: 4,
    fontWeight: "500",
  },
  heroNewBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#FF4757",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 10,
  },
  heroNewText: {
    color: "white",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  heroDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12, // Adjusted for spacing
    paddingRight: 16,
  },
  heroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 4,
  },
  heroActiveDot: {
    backgroundColor: "#2E6A2E",
    width: 16, // Slightly smaller for balance
    borderRadius: 4,
  },

  // Section Divider
  sectionDivider: {
    paddingHorizontal: 16, // Match container padding
    paddingVertical: 12,
    backgroundColor: "#FFFCF3",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#135918",
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },

  mainScrollContainer: {
    flex: 1,
  },
  gridSection: {
    paddingHorizontal: 0, // Match gridContent padding
  },
  bottomPadding: {
    height: 80, // Reduced for less empty space
  },
});
