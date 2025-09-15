import React, { useState, useEffect } from "react"
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  SafeAreaView, 
  Image, 
  Dimensions,
  Platform,
  ActivityIndicator 
} from "react-native"
import { Feather } from "@expo/vector-icons"
import { useAuth } from "../AuthContext"

const { width, height } = Dimensions.get("window")

export default function CheckoutScreen({ route, navigation }) {
  const items = route?.params?.items || []
  const { currentUser, userData } = useAuth()

  const [firstName, setFirstName] = useState("")
  const [middleName, setMiddleName] = useState("")
  const [lastName, setLastName] = useState("")
  const [address, setAddress] = useState("")
  const [contactNumber, setContactNumber] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Prefill from user profile if available
    const profile = userData || currentUser || {}
    const fullName = profile.name || ""
    
    if (fullName && !firstName && !lastName) {
      const parts = fullName.trim().split(/\s+/)
      if (parts.length === 1) {
        setFirstName(parts[0])
      } else if (parts.length === 2) {
        setFirstName(parts[0])
        setLastName(parts[1])
      } else if (parts.length >= 3) {
        setFirstName(parts[0])
        setMiddleName(parts.slice(1, -1).join(" "))
        setLastName(parts[parts.length - 1])
      }
    }
    
    if (profile.address && !address) setAddress(profile.address)
    if (profile.contactNumber && !contactNumber) setContactNumber(profile.contactNumber)
    if (profile.phone && !contactNumber) setContactNumber(profile.phone)
  }, [userData, currentUser])

  const calculateTotal = () => {
    return items.reduce((total, item) => total + (item.myBid || item.currentBid || 0), 0)
  }

  const calculateSubtotal = () => {
    return calculateTotal()
  }

  const shippingFee = 150 // Fixed shipping fee
  const serviceFee = Math.round(calculateSubtotal() * 0.02) // 2% service fee

  const grandTotal = () => {
    return calculateSubtotal() + shippingFee + serviceFee
  }

  const handleBackPress = () => {
    navigation.goBack()
  }

  const capitalizeWords = (text) => {
    return text
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
  }

  const handleFirstNameChange = (text) => {
    setFirstName(capitalizeWords(text))
  }

  const handleMiddleNameChange = (text) => {
    setMiddleName(capitalizeWords(text))
  }

  const handleLastNameChange = (text) => {
    setLastName(capitalizeWords(text))
  }

  const validateForm = () => {
    if (!firstName.trim()) {
      Alert.alert("Missing Information", "Please enter your first name")
      return false
    }
    if (!lastName.trim()) {
      Alert.alert("Missing Information", "Please enter your last name")
      return false
    }
    if (!address.trim()) {
      Alert.alert("Missing Information", "Please enter your complete address")
      return false
    }
    if (!contactNumber.trim()) {
      Alert.alert("Missing Information", "Please enter your contact number")
      return false
    }
    if (!/^09\d{9}$/.test(contactNumber.replace(/\D/g, ''))) {
      Alert.alert("Invalid Contact", "Please enter a valid Philippine mobile number (09XXXXXXXXX)")
      return false
    }
    return true
  }

  const handlePlaceOrder = async () => {
    if (!validateForm()) return

    setLoading(true)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      Alert.alert(
        "Order Placed Successfully!", 
        `Thank you ${firstName}! Your order has been submitted and will be processed within 24 hours. You will receive a confirmation message at ${contactNumber}.`,
        [
          { 
            text: "View My Orders", 
            onPress: () => navigation.navigate('Cart') 
          }
        ]
      )
    } catch (error) {
      Alert.alert("Error", "Failed to place order. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Feather name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Checkout</Text>
            <Text style={styles.headerDescription}>No items to checkout</Text>
          </View>
        </View>
        
        <View style={styles.emptyContainer}>
          <Feather name="shopping-bag" size={80} color="#E0E0E0" />
          <Text style={styles.emptyTitle}>No Items to Checkout</Text>
          <Text style={styles.emptyMessage}>Your cart appears to be empty.</Text>
          <TouchableOpacity style={styles.backToCartButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backToCartText}>Back to Cart</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Feather name="arrow-left" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Checkout</Text>
          <Text style={styles.headerDescription}>
            {items.length} item{items.length !== 1 ? 's' : ''} • ₱{grandTotal().toLocaleString()}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.itemsBadge}>
            <Text style={styles.itemsBadgeText}>{items.length}</Text>
          </View>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollContainer} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Order Items Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {items.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <Image source={{ uri: item.image }} style={styles.itemImage} />
              <View style={styles.itemContent}>
                <Text style={styles.itemTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.itemCategory}>{item.category}</Text>
                <View style={styles.itemPriceRow}>
                  <Text style={styles.itemPriceLabel}>Winning Bid:</Text>
                  <Text style={styles.itemPrice}>₱{(item.myBid || item.currentBid).toLocaleString()}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Customer Information Form */}
        <View style={styles.section}>
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Delivery Information</Text>
            
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>
                  First Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={handleFirstNameChange}
                  placeholder="Enter first name"
                  autoCapitalize="words"
                />
              </View>
              
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Middle Name</Text>
                <TextInput
                  style={styles.input}
                  value={middleName}
                  onChangeText={handleMiddleNameChange}
                  placeholder="Enter middle name"
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Last Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={handleLastNameChange}
                placeholder="Enter last name"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Complete Address <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={address}
                onChangeText={setAddress}
                placeholder="House No, Street, Barangay, City, Province, ZIP Code"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Contact Number <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={contactNumber}
                onChangeText={setContactNumber}
                placeholder="09XXXXXXXXX"
                keyboardType="phone-pad"
                maxLength={11}
              />
            </View>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <View style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal ({items.length} item{items.length !== 1 ? 's' : ''})</Text>
              <Text style={styles.summaryValue}>₱{calculateSubtotal().toLocaleString()}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping Fee</Text>
              <Text style={styles.summaryValue}>₱{shippingFee.toLocaleString()}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service Fee (2%)</Text>
              <Text style={styles.summaryValue}>₱{serviceFee.toLocaleString()}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>₱{grandTotal().toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <View style={styles.paymentCard}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <View style={styles.paymentOption}>
              <View style={styles.paymentIcon}>
                <Feather name="credit-card" size={20} color="#2E6A2E" />
              </View>
              <View style={styles.paymentContent}>
                <Text style={styles.paymentTitle}>Cash on Delivery</Text>
                <Text style={styles.paymentDescription}>Pay when your order arrives</Text>
              </View>
              <Feather name="check-circle" size={20} color="#2E6A2E" />
            </View>
          </View>
        </View>

        {/* Place Order Button */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.placeOrderButton, loading && styles.disabledButton]} 
            onPress={handlePlaceOrder}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Feather name="check-circle" size={20} color="white" />
                <Text style={styles.placeOrderText}>Place Order • ₱{grandTotal().toLocaleString()}</Text>
              </>
            )}
          </TouchableOpacity>
          
          <View style={styles.securityNote}>
            <Feather name="shield" size={16} color="#666" />
            <Text style={styles.securityText}>Your information is secure and protected</Text>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
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
  itemsBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  itemsBadgeText: {
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
  emptyTitle: {
    fontSize: Math.min(24, width * 0.06),
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 12,
    textAlign: "center",
  },
  emptyMessage: {
    fontSize: Math.min(16, width * 0.04),
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
  },
  backToCartButton: {
    backgroundColor: "#2E6A2E",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  backToCartText: {
    color: "white",
    fontSize: Math.min(16, width * 0.04),
    fontWeight: "600",
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

  // Item Cards
  itemCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: Math.max(16, width * 0.04),
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  itemImage: {
    width: Math.min(70, width * 0.18),
    height: Math.min(70, width * 0.18),
    borderRadius: 12,
    marginRight: 16,
    backgroundColor: "#f0f0f0",
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: Math.min(16, width * 0.04),
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
    lineHeight: 20,
  },
  itemCategory: {
    fontSize: Math.min(13, width * 0.033),
    color: "#888",
    marginBottom: 8,
    textTransform: "capitalize",
  },
  itemPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemPriceLabel: {
    fontSize: Math.min(13, width * 0.033),
    color: "#666",
  },
  itemPrice: {
    fontSize: Math.min(16, width * 0.04),
    fontWeight: "bold",
    color: "#2E6A2E",
  },

  // Form Card
  formCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: Math.max(20, width * 0.05),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  halfWidth: {
    flex: 1,
  },
  label: {
    fontSize: Math.min(15, width * 0.038),
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  required: {
    color: "#E74C3C",
    fontSize: Math.min(15, width * 0.038),
  },
  input: {
    backgroundColor: "#FAFAFA",
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: Math.max(14, width * 0.035),
    paddingVertical: Math.max(12, width * 0.03),
    fontSize: Math.min(16, width * 0.04),
    color: "#333",
  },
  multilineInput: {
    height: Math.max(80, width * 0.2),
    textAlignVertical: "top",
  },

  // Summary Card
  summaryCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: Math.max(20, width * 0.05),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
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

  // Payment Card
  paymentCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: Math.max(20, width * 0.05),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f8f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  paymentContent: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: Math.min(16, width * 0.04),
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  paymentDescription: {
    fontSize: Math.min(14, width * 0.035),
    color: "#666",
  },

  // Buttons
  placeOrderButton: {
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
    marginBottom: 30,
  },
  disabledButton: {
    backgroundColor: "#cccccc",
  },
  placeOrderText: {
    color: "white",
    fontSize: Math.min(18, width * 0.045),
    fontWeight: "bold",
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    gap: 6,
  },
  securityText: {
    fontSize: Math.min(13, width * 0.033),
    color: "#666",
  },
  bottomPadding: {
    height: 20,
  },
})