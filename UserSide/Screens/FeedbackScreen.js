import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
  TextInput,
  RefreshControl,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Add Firebase Storage imports
import { db, storage } from "../firebase/firebase"; // Ensure storage is exported from firebase config
import { useAuth } from "../AuthContext";
import LoadingScreen from "../hooks/LoadingScreen";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

export default function FeedbackScreen({ navigation }) {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false); // Add state for image upload loading

  const fetchOrders = () => {
    if (!currentUser?.uid) return;

    setLoading(true);
    const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
      const userOrders = [];

      snapshot.docs.forEach((d) => {
        const data = d.data();
        const userBid = data.bids?.find((bid) => bid.bidderId === currentUser.uid);

        if (
          (userBid && data.status === "sold" && data.highestBidder === userBid.bidderName) ||
          data.winnerBidderId === currentUser.uid
        ) {
          if (data.orderStatus === "delivered" && !data.userRating) {
            userOrders.push({
              id: d.id,
              title: data.name,
              category: data.category || "Uncategorized",
              winningBid: userBid?.amount || 0,
              orderStatus: data.orderStatus || "pending",
              orderDate: data.orderDate || new Date().toISOString(),
              deliveryDate: data.deliveryDate || null,
              images: data.imageUrls || [],
              description: data.description || "No description available",
            });
          }
        }
      });

      userOrders.sort((a, b) => new Date(b.deliveryDate) - new Date(a.deliveryDate));
      setOrders(userOrders);
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error("Firestore error:", error);
      setLoading(false);
      setRefreshing(false);
      Alert.alert("Error", "Failed to fetch orders. Please try again.");
    });

    return unsubscribe;
  };

  useEffect(() => {
    const unsubscribe = fetchOrders();
    return () => unsubscribe && unsubscribe();
  }, [currentUser?.uid]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const unsubscribe = fetchOrders();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      unsubscribe();
    } catch (error) {
      console.error("Refresh error:", error);
      setRefreshing(false);
      Alert.alert("Error", "Failed to refresh orders. Please try again.");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const PesoSymbol = ({ size = 16, color = "#2E6A2E" }) => (
    <Text style={{ fontSize: size, color, fontWeight: "bold" }}>₱</Text>
  );

  const PesoAmount = ({ amount, style }) => (
    <View style={styles.pesoAmountContainer}>
      <PesoSymbol size={style?.fontSize || 16} color={style?.color || "#2E6A2E"} />
      <Text style={[style, { marginLeft: 2 }]}>{amount.toLocaleString()}</Text>
    </View>
  );

  const openFeedbackModal = (order) => {
    setSelectedOrder(order);
    setRating(0);
    setReviewText("");
    setUploadedImages([]);
    setFeedbackModalVisible(true);
  };

const pickImage = async () => {
  const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (permissionResult.granted === false) {
    Alert.alert("Permission Denied", "Please allow access to your photo library to upload images.");
    return;
  }

  try {
    setUploadingImages(true);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images, // Revert to MediaTypeOptions.Images
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const newImageUris = result.assets.map((asset) => asset.uri);
      const uploadPromises = newImageUris.map(async (uri) => {
        const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const imageRef = ref(storage, `feedback-images/${currentUser.uid}/${selectedOrder.id}/${filename}`);

        const response = await fetch(uri);
        const blob = await response.blob();
        const snapshot = await uploadBytes(imageRef, blob);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
      });

      const downloadURLs = await Promise.all(uploadPromises);
      setUploadedImages((prev) => [...prev, ...downloadURLs].slice(0, 3)); // Limit to 3 images
    }
  } catch (error) {
    console.error("Image upload error:", error);
    Alert.alert("Error", "Failed to upload images. Please try again.");
  } finally {
    setUploadingImages(false);
  }
};

  const submitFeedback = async () => {
    if (!rating) {
      Alert.alert("Error", "Please select a rating");
      return;
    }

    try {
      const orderRef = doc(db, "products", selectedOrder.id);
      await updateDoc(orderRef, {
        userRating: rating,
        userReview: reviewText,
        ratedAt: new Date().toISOString(),
        orderStatus: "rated",
        reviewImages: uploadedImages, // Store download URLs
      });

      setFeedbackModalVisible(false);
      Alert.alert("Success", "Thank you for your feedback!");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      Alert.alert("Error", "Failed to submit feedback. Please try again.");
    }
  };

  const renderFeedbackModal = () => (
    <Modal
      visible={feedbackModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setFeedbackModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.feedbackModalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Rate & Review</Text>
            <TouchableOpacity onPress={() => setFeedbackModalVisible(false)}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedOrder && (
              <>
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>{selectedOrder.title}</Text>
                  <Text style={styles.sectionSubtitle}>{selectedOrder.category}</Text>
                  <PesoAmount amount={selectedOrder.winningBid} style={styles.detailValue} />
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Your Rating</Text>
                  <View style={styles.ratingContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity key={star} onPress={() => setRating(star)}>
                        <Icon
                          name={star <= rating ? "star" : "star-border"}
                          size={32}
                          color="#FFD700"
                          style={styles.starIcon}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Your Review</Text>
                  <TextInput
                    style={styles.reviewInput}
                    multiline
                    numberOfLines={4}
                    placeholder="Share your thoughts about the product..."
                    value={reviewText}
                    onChangeText={setReviewText}
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Upload Photos</Text>
                  <View style={styles.imageRow}>
                    {uploadedImages.map((uri, index) => (
                      <View key={index} style={styles.uploadedImageContainer}>
                        <Image source={{ uri }} style={styles.uploadedImage} />
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() =>
                            setUploadedImages((prev) => prev.filter((_, i) => i !== index))
                          }
                        >
                          <Icon name="close" size={16} color="white" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {uploadedImages.length < 3 && (
                      <TouchableOpacity
                        style={styles.addImageButton}
                        onPress={pickImage}
                        disabled={uploadingImages}
                      >
                        {uploadingImages ? (
                          <ActivityIndicator size="small" color="#666" />
                        ) : (
                          <>
                            <Icon name="add-a-photo" size={24} color="#666" />
                            <Text style={styles.addImageText}>Add Photo</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.imageLimitText}>Maximum 3 photos</Text>
                </View>

                <TouchableOpacity style={styles.submitButton} onPress={submitFeedback}>
                  <Text style={styles.submitButtonText}>Submit Feedback</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return <LoadingScreen message="Loading your orders..." />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFCF3" }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Feedback</Text>
            <Icon name="star" size={28} color="white" />
          </View>
          <Text style={styles.headerSubtitle}>Share your thoughts</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2E6A2E" />
          }
        >
          {orders.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="inbox" size={64} color="#ccc" />
              <Text style={styles.emptyStateTitle}>No orders to review</Text>
              <Text style={styles.emptyStateText}>
                You have no delivered orders that need feedback.
              </Text>
            </View>
          ) : (
            <View style={styles.ordersContainer}>
              {orders.map((order, index) => (
                <TouchableOpacity
                  key={order.id}
                  style={[styles.orderCard, index % 2 === 0 && styles.evenCard]}
                  onPress={() => openFeedbackModal(order)}
                >
                  <View style={styles.orderContent}>
                    <Image
                      source={{
                        uri:
                          order.images[0] ||
                          "https://via.placeholder.com/80x80/CCCCCC/FFFFFF?text=No+Image",
                      }}
                      style={styles.orderImage}
                    />
                    <View style={styles.orderInfo}>
                      <Text style={styles.orderTitle} numberOfLines={2}>
                        {order.title}
                      </Text>
                      <Text style={styles.orderCategory}>{order.category}</Text>
                      <PesoAmount amount={order.winningBid} style={styles.orderPrice} />
                      <View style={styles.orderMeta}>
                        <View style={styles.metaRow}>
                          <Icon name="event" size={14} color="#666" />
                          <Text style={styles.metaText}>
                            Delivered: {formatDate(order.deliveryDate)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Icon name="chevron-right" size={24} color="#666" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={styles.bottomPadding} />
        </ScrollView>

        {renderFeedbackModal()}
      </View>
    </SafeAreaView>
  );
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
    gap: 12,
    marginBottom: 5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
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
  ordersContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  orderCard: {
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
  evenCard: {
    backgroundColor: "#FAFAFA",
  },
  orderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  orderImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: "#F0F0F0",
  },
  orderInfo: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
    lineHeight: 20,
  },
  orderCategory: {
    fontSize: 12,
    color: "#2E6A2E",
    fontWeight: "500",
    marginBottom: 6,
  },
  orderPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2E6A2E",
    marginBottom: 8,
  },
  orderMeta: {
    gap: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: "#666",
  },
  pesoAmountContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  bottomPadding: {
    height: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  feedbackModalContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  modalContent: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 14,
    color: "#333",
  },
  ratingContainer: {
    flexDirection: "row",
    marginBottom: 12,
  },
  starIcon: {
    marginRight: 8,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: "#F0F0F0",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#333",
    textAlignVertical: "top",
  },
  imageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  uploadedImageContainer: {
    position: "relative",
  },
  uploadedImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#2E6A2E",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  addImageButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  addImageText: {
    fontSize: 12,
    color: "#666",
  },
  imageLimitText: {
    fontSize: 12,
    color: "#999",
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: "#2E6A2E",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 12,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
});