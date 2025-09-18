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
import { collection, getDocs, query, orderBy } from "firebase/firestore"
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

  useEffect(() => {
    fetchNews()
  }, [])

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

  const renderGridItem = ({ item, index }) => {
    const isEven = index % 2 === 0

    return (
      <TouchableOpacity
        style={[styles.gridCard, { marginRight: isEven ? 8 : 0, marginLeft: isEven ? 0 : 8 }]}
        onPress={() => openArticleDetails(item)}
        activeOpacity={0.85}
      >
        {/* Card Image with Gradient Overlay */}
        <View style={styles.imageContainer}>
          {item.mainImage ? (
            <Image source={{ uri: item.mainImage }} style={styles.cardImage} resizeMode="cover" />
          ) : (
            <View style={styles.placeholderImage}>
              <Feather name="image" size={32} color="#CCC" />
            </View>
          )}

          {/* Gradient Overlay */}
          <View style={styles.gradientOverlay} />

          {/* Image Count Badge */}
          {item.secondaryImages && item.secondaryImages.length > 0 && (
            <View style={styles.imageCountBadge}>
              <Feather name="camera" size={10} color="white" />
              <Text style={styles.imageCountText}>+{item.secondaryImages.length}</Text>
            </View>
          )}

          {/* Time Badge */}
          <View style={styles.timeBadge}>
            <Text style={styles.timeText}>{formatDateTime(item.createdAt)}</Text>
          </View>
        </View>

        {/* Card Content */}
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>

          <Text style={styles.cardDescription} numberOfLines={3}>
            {item.description}
          </Text>

          {/* Action Button */}
          <View style={styles.cardFooter}>
            <View style={styles.viewButton}>
              <Feather name="eye" size={12} color="#2E6A2E" />
              <Text style={styles.viewButtonText}>View</Text>
            </View>
          </View>
        </View>

        {/* New Drop Indicator */}
        {index < 3 && (
          <View style={styles.newIndicator}>
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

  const renderArticleDetailModal = () => (
    <Modal visible={articleModalVisible} animationType="slide" onRequestClose={() => setArticleModalVisible(false)}>
      <SafeAreaView style={styles.articleModalContainer}>
        {/* Header */}
        <View style={styles.articleModalHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => setArticleModalVisible(false)}>
            <Feather name="arrow-left" size={24} color="#2E6A2E" />
          </TouchableOpacity>
          <Text style={styles.articleModalTitle}>Drop Details</Text>
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
                  <View style={styles.galleryIndicator}>
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
                {selectedArticle.secondaryImages && selectedArticle.secondaryImages.length > 0 && (
                  <View style={styles.imageCount}>
                    <Feather name="image" size={14} color="#666" />
                    <Text style={styles.imageCountLabel}>{selectedArticle.secondaryImages.length + 1} images</Text>
                  </View>
                )}
              </View>

              <Text style={styles.articleTitle}>{selectedArticle.title}</Text>

              <Text style={styles.articleDescription}>{selectedArticle.description}</Text>

              {/* Secondary Images Grid */}
              {selectedArticle.secondaryImages && selectedArticle.secondaryImages.length > 0 && (
                <View style={styles.secondaryImagesSection}>
                  <Text style={styles.sectionTitle}>More Images</Text>
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

  if (loading) {
    return <LoadingScreen message="Loading drops..." />
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Upcoming Drops</Text>
          <View style={styles.headerStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{newsArticles.length}</Text>
              <Text style={styles.statLabel}>Drops</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Feather name="zap" size={16} color="rgba(255, 255, 255, 0.9)" />
              <Text style={styles.statLabel}>Live Updates</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Grid Content */}
      <View style={styles.gridContainer}>
        {newsArticles.length === 0 ? (
          <ScrollView
            contentContainerStyle={styles.emptyStateContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2E6A2E"]} tintColor="#2E6A2E" />
            }
          >
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Feather name="package" size={48} color="#CCC" />
              </View>
              <Text style={styles.emptyStateText}>No drops available</Text>
              <Text style={styles.emptyStateSubtext}>Pull down to refresh and check for new drops</Text>
            </View>
          </ScrollView>
        ) : (
          <FlatList
            data={newsArticles}
            renderItem={renderGridItem}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={styles.gridRow}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2E6A2E"]} tintColor="#2E6A2E" />
            }
            ItemSeparatorComponent={() => <View style={styles.rowSeparator} />}
          />
        )}
      </View>

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
    backgroundColor: "#2E6A2E",
    paddingTop: 20,
    paddingBottom: 25,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flexDirection: "column",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "white",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  headerStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
    marginRight: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.85)",
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    marginHorizontal: 16,
  },

  // Grid Layout Styles
  gridContainer: {
    flex: 1,
  },
  gridContent: {
    padding: 16,
    paddingBottom: 100,
  },
  gridRow: {
    justifyContent: "space-between",
  },
  rowSeparator: {
    height: 16,
  },

  // Grid Card Styles
  gridCard: {
    width: cardWidth,
    backgroundColor: "white",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    overflow: "hidden",
    position: "relative",
  },

  imageContainer: {
    position: "relative",
    height: 160,
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
  gradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
    backgroundColor: "rgba(0,0,0,0.1)", // Fallback for React Native
  },

  // Badges
  imageCountBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
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
    bottom: 10,
    left: 10,
    backgroundColor: "rgba(46, 106, 46, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeText: {
    color: "white",
    fontSize: 11,
    fontWeight: "600",
  },
  newIndicator: {
    position: "absolute",
    top: -2,
    left: -2,
    backgroundColor: "#FF4757",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 0,
    borderTopLeftRadius: 20,
    borderBottomRightRadius: 12,
    zIndex: 10,
  },
  newText: {
    color: "white",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // Card Content
  cardContent: {
    padding: 16,
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#135918",
    marginBottom: 8,
    lineHeight: 22,
  },
  cardDescription: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
    marginBottom: 12,
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
  viewButtonText: {
    fontSize: 11,
    color: "#2E6A2E",
    fontWeight: "700",
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Empty State
  emptyStateContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
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

  // Image Modal Styles (unchanged)
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

  articleModalContainer: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  articleModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  },
  headerSpacer: {
    width: 40,
  },
  articleContent: {
    flex: 1,
  },
  mainImageContainer: {
    position: "relative",
    height: 250,
    backgroundColor: "#F0F0F0",
  },
  articleMainImage: {
    width: "100%",
    height: "100%",
  },
  galleryIndicator: {
    position: "absolute",
    bottom: 15,
    right: 15,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  galleryText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },
  articleInfo: {
    padding: 20,
    backgroundColor: "white",
  },
  articleMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
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
  imageCount: {
    flexDirection: "row",
    alignItems: "center",
  },
  imageCountLabel: {
    fontSize: 14,
    color: "#666",
    marginLeft: 6,
    fontWeight: "500",
  },
  articleTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#135918",
    marginBottom: 15,
    lineHeight: 32,
  },
  articleDescription: {
    fontSize: 16,
    color: "#333",
    lineHeight: 24,
    marginBottom: 25,
  },
  secondaryImagesSection: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#135918",
    marginBottom: 15,
  },
  secondaryImagesContainer: {
    flexDirection: "row",
    paddingRight: 20,
  },
  secondaryImageWrapper: {
    marginRight: 12,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryImage: {
    width: 120,
    height: 120,
  },
})
