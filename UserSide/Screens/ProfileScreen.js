"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform,
} from "react-native"
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import { useAuth } from "../AuthContext"
import { doc, updateDoc, getDoc, collection, onSnapshot, query, where } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { db, storage } from "../firebase/firebase"
import LoadingScreen from "../hooks/LoadingScreen"
import { SafeAreaView } from 'react-native-safe-area-context';
import LogoutModal from "../hooks/AlertModal/LogoutModal"
import TermsModal from "../hooks/Modal/TermsModal"

const { width, height } = Dimensions.get("window")

export default function ProfileScreen({ navigation }) {
  const { currentUser, signOut, isLoading } = useAuth()
  const [modalVisible, setModalVisible] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [imagePickerVisible, setImagePickerVisible] = useState(false)
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);

  const [firstName, setFirstName] = useState("")
  const [middleName, setMiddleName] = useState("")
  const [lastName, setLastName] = useState("")
  const [contactNumber, setContactNumber] = useState("")
  const [address, setAddress] = useState("")

  const [userBids, setUserBids] = useState([])
  const [userStats, setUserStats] = useState({
  totalBids: 0,
  wonAuctions: 0,
  successRate: 0
})


// Add this useEffect after your existing useEffects to fetch user profile data
useEffect(() => {
  const fetchUserProfile = async () => {
    if (!currentUser?.uid) return

    try {
      const userRef = doc(db, "users", currentUser.uid)
      const userDoc = await getDoc(userRef)
      
      if (userDoc.exists()) {
        const profileData = userDoc.data()
        setUserProfile(profileData)
        
        // Populate form fields with existing data
        setFirstName(profileData.firstName || "")
        setMiddleName(profileData.middleName || "")
        setLastName(profileData.lastName || "")
        setContactNumber(profileData.phone || "")
        setAddress(profileData.address || "")
      }
    } catch (error) {
      console.error("Error fetching user profile:", error)
    } finally {
      setLoading(false)
    }
  }

  fetchUserProfile()
}, [currentUser?.uid])

// Also add this useEffect to populate fields when modal opens
useEffect(() => {
  if (modalVisible && (userProfile || currentUser)) {
    const userData = userProfile || currentUser
    setFirstName(userData.firstName || "")
    setMiddleName(userData.middleName || "")
    setLastName(userData.lastName || "")
    setContactNumber(userData.phone || "")
    setAddress(userData.address || "")
  }
}, [modalVisible, userProfile, currentUser])

// Update your existing bids useEffect to set loading to false even when no user
useEffect(() => {
  if (!currentUser?.uid) {
    setLoading(false) // Add this line
    return
  }

  setLoading(true)

  const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
    const allUserBids = []
    let wonCount = 0

    snapshot.docs.forEach((doc) => {
      const data = doc.data()
      const userBid = data.bids?.find(bid => bid.bidderId === currentUser.uid)
      
      if (userBid) {
        const bidInfo = {
          id: doc.id,
          myBid: userBid.amount,
          currentBid: data.currentBid || 0,
          status: data.status === 'sold' && data.highestBidder === userBid.bidderName 
            ? 'won' 
            : data.currentBid > userBid.amount 
              ? 'outbid' 
              : 'winning',
          itemName: data.name
        }
        
        allUserBids.push(bidInfo)
        
        if (bidInfo.status === 'won') {
          wonCount++
        }
      }
    })

    setUserBids(allUserBids)
    
    const totalBids = allUserBids.length
    const successRate = totalBids > 0 ? Math.round((wonCount / totalBids) * 100) : 0

    setUserStats({
      totalBids,
      wonAuctions: wonCount,
      successRate
    })

    setLoading(false)
  }, (error) => {
    console.error("Error fetching bids: ", error)
    setLoading(false)
  })

  return () => unsubscribe()
}, [currentUser?.uid])

  // Request permissions on component mount
  useEffect(() => {
    requestPermissions()
  }, [])

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync()
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (cameraStatus !== "granted" || mediaStatus !== "granted") {
      console.log("Permissions not granted")
    }
  }

  // Helper function to capitalize first letter of each word
  const capitalizeWords = (text) => {
    return text
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
  }

  // Fetch user profile
useEffect(() => {
  if (!currentUser?.uid) return

  setLoading(true) // start loading before fetching

  const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
    const allUserBids = []
    let wonCount = 0

    snapshot.docs.forEach((doc) => {
      const data = doc.data()
      const userBid = data.bids?.find(bid => bid.bidderId === currentUser.uid)
      
      if (userBid) {
        const bidInfo = {
          id: doc.id,
          myBid: userBid.amount,
          currentBid: data.currentBid || 0,
          status: data.status === 'sold' && data.highestBidder === userBid.bidderName 
            ? 'won' 
            : data.currentBid > userBid.amount 
              ? 'outbid' 
              : 'winning',
          itemName: data.name
        }
        
        allUserBids.push(bidInfo)
        
        if (bidInfo.status === 'won') {
          wonCount++
        }
      }
    })

    setUserBids(allUserBids)
    
    // Calculate success rate
    const totalBids = allUserBids.length
    const successRate = totalBids > 0 ? Math.round((wonCount / totalBids) * 100) : 0

    setUserStats({
      totalBids,
      wonAuctions: wonCount,
      successRate
    })

    setLoading(false) // stop loading after processing data
  }, (error) => {
    console.error("Error fetching bids: ", error)
    setLoading(false) // stop loading even if error
  })

  return () => unsubscribe()
}, [currentUser?.uid])


  const uploadImageToFirebase = async (imageUri) => {
    try {
      setUploadingImage(true)

      // Create path that matches our security rules
      const filename = `${Date.now()}.jpg`
      const imageRef = ref(storage, `profile-images/${currentUser.uid}/${filename}`)

      // Convert image to blob
      const response = await fetch(imageUri)
      const blob = await response.blob()

      // Upload to Firebase
      const snapshot = await uploadBytes(imageRef, blob)
      const downloadURL = await getDownloadURL(snapshot.ref)

      // Update Firestore
      const userRef = doc(db, "users", currentUser.uid)
      await updateDoc(userRef, {
        photoURL: downloadURL,
        updatedAt: new Date().toISOString(),
      })

      // Update local state
      setUserProfile((prev) => ({ ...prev, photoURL: downloadURL }))
      Alert.alert("Success", "Profile picture updated!")
    } catch (error) {
      console.error("Upload error:", error)
      Alert.alert("Error", `Failed to update profile picture: ${error.message}`)
    } finally {
      setUploadingImage(false)
    }
  }

  const selectImageFromCamera = async () => {
    setImagePickerVisible(false)

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        await uploadImageToFirebase(result.assets[0].uri)
      }
    } catch (error) {
      console.error("Camera error:", error)
      Alert.alert("Error", "Failed to take photo")
    }
  }

  const selectImageFromLibrary = async () => {
    setImagePickerVisible(false)

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        await uploadImageToFirebase(result.assets[0].uri)
      }
    } catch (error) {
      console.error("Library error:", error)
      Alert.alert("Error", "Failed to select image")
    }
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

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Error", "Please enter first and last name")
      return
    }

    setUpdating(true)
    try {
      const userRef = doc(db, "users", currentUser.uid)

      // Create full name with middle name if provided
      const fullName = middleName.trim()
        ? `${firstName.trim()} ${middleName.trim()} ${lastName.trim()}`
        : `${firstName.trim()} ${lastName.trim()}`

      const updateData = {
        name: fullName,
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        lastName: lastName.trim(),
        phone: contactNumber.trim(),
        address: address.trim(),
        updatedAt: new Date().toISOString(),
      }

      await updateDoc(userRef, updateData)
      setUserProfile((prev) => ({ ...prev, ...updateData }))
      Alert.alert("Success", "Profile updated!")
      setModalVisible(false)
    } catch (error) {
      console.error("Update error:", error)
      Alert.alert("Error", "Failed to update profile")
    } finally {
      setUpdating(false)
    }
  }

 const handleLogout = () => {
  setLogoutModalVisible(true);
};

 if (loading || isLoading) {
  return <LoadingScreen message="Loading profile..." />
}

  const userData = userProfile || currentUser
  const displayName =
    userData?.firstName && userData?.lastName
      ? userData?.middleName
        ? `${userData.firstName} ${userData.middleName} ${userData.lastName}`
        : `${userData.firstName} ${userData.lastName}`
      : userData?.name || "User"

const stats = [
  { label: "Total Bids", value: userStats.totalBids.toString(), icon: "tshirt-crew-outline", type: "material" },
  { label: "Won bids", value: userStats.wonAuctions.toString(), icon: "award", type: "feather" },
  { label: "Success Rate", value: `${userStats.successRate}%`, icon: "trending-up", type: "feather" },
]

  const menuItems = [
    {
      title: "Personal Information",
      subtitle: "Update your profile details",
      icon: "user",
      onPress: () => navigation.navigate("PersonalInformation"),
    },
    {
      title: "Change Password",
      subtitle: "Update your account password",
      icon: "lock",
      onPress: () => navigation.navigate("ChangePassword"),
    },
    {
      title: "My Bids",
      subtitle: "View your bidding history",
      icon: "list",
      onPress: () => navigation.navigate("Bidding"),
    },
    {
      title: "Terms and Conditions",
      subtitle: "View our terms and conditions",
      icon: "file-text", 
      onPress: () => setTermsModalVisible(true),
    },
    {
      title: "Notifications",
      subtitle: "Manage notification preferences",
      icon: "bell",
      onPress: () => navigation.navigate("Notifications"),
    },
    {
      title: "Order Tracking",
      subtitle: "Track your order status in real-time",
      icon: "package", 
      onPress: () => navigation.navigate("OrderTracking"),
    },
    {
      title: "Feedback",
      subtitle: "Share your thoughts",
      icon: "star", 
      onPress: () => navigation.navigate("Feedback"),
    },
    {
      title: "Logout",
      subtitle: "Sign out of your account",
      icon: "log-out",
      onPress: handleLogout,
      isLogout: true,
    },
  ]  

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Text style={styles.headerDescription}>Manage your account settings and view your bids activity</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Section with Centered Image */}
        <View style={styles.section}>
          <View style={styles.profileCard}>
            {/* Centered Profile Image */}
            <View style={styles.avatarContainer}>
              <Image
                source={{
                  uri: userData?.photoURL || "https://via.placeholder.com/120x120/CCCCCC/FFFFFF?text=User",
                }}
                style={styles.avatar}
              />
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={() => setImagePickerVisible(true)}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Feather name="camera" size={18} color="white" />
                )}
              </TouchableOpacity>
            </View>

            {/* Profile Information Below Image */}
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{displayName}</Text>
              <Text style={styles.userEmail}>{userData?.email}</Text>

              {userData?.phone && (
                <View style={styles.detailRow}>
                  <Feather name="phone" size={16} color="#2E6A2E" />
                  <Text style={styles.userDetail}>{userData.phone}</Text>
                </View>
              )}

              {userData?.address && (
                <View style={styles.detailRow}>
                  <Feather name="map-pin" size={16} color="#2E6A2E" />
                  <Text style={styles.userDetail} numberOfLines={2}>
                    {userData.address}
                  </Text>
                </View>
              )}
            </View>

            {/* Edit Button */}
            <TouchableOpacity style={styles.editButton} onPress={() => setModalVisible(true)}>
              <Feather name="edit-2" size={20} color="#2E6A2E" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.statsContainer}>
            {stats.map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <View style={styles.statIcon}>
                  {stat.type === "material" ? (
                    <MaterialCommunityIcons name={stat.icon} size={20} color="white" />
                  ) : (
                    <Feather name={stat.icon} size={20} color="white" />
                  )}
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, item.isLogout && styles.logoutItem]}
              onPress={item.onPress}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.menuIcon, item.isLogout && styles.logoutIcon]}>
                  <Feather name={item.icon} size={20} color={item.isLogout ? "#E74C3C" : "#666"} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuTitle, item.isLogout && styles.logoutText]}>{item.title}</Text>
                  <Text style={[styles.menuSubtitle, item.isLogout && styles.logoutSubtext]}>{item.subtitle}</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color={item.isLogout ? "#E74C3C" : "#888"} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButtonStandalone} onPress={handleLogout}>
            <Feather name="log-out" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Image Picker Modal */}
      <Modal
        visible={imagePickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setImagePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.imagePickerModal}>
            <Text style={styles.modalTitle}>Choose Profile Picture</Text>

            <TouchableOpacity style={styles.pickerOption} onPress={selectImageFromCamera}>
              <Feather name="camera" size={24} color="#2E6A2E" />
              <Text style={styles.pickerText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.pickerOption} onPress={selectImageFromLibrary}>
              <Feather name="image" size={24} color="#2E6A2E" />
              <Text style={styles.pickerText}>Choose from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelOption} onPress={() => setImagePickerVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModal}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                First Name <Text style={styles.asterisk}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Enter first name"
                value={firstName}
                onChangeText={handleFirstNameChange}
                editable={!updating}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Middle Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter middle name (optional)"
                value={middleName}
                onChangeText={handleMiddleNameChange}
                editable={!updating}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Last Name <Text style={styles.asterisk}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Enter last name"
                value={lastName}
                onChangeText={handleLastNameChange}
                editable={!updating}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contact Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter contact number"
                value={contactNumber}
                onChangeText={setContactNumber}
                keyboardType="phone-pad"
                editable={!updating}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Address</Text>
              <TextInput
                style={[styles.input, styles.addressInput]}
                placeholder="Enter address"
                value={address}
                onChangeText={setAddress}
                editable={!updating}
                multiline={true}
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)} disabled={updating}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, updating && styles.disabledButton]}
                onPress={handleSave}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      <LogoutModal
        visible={logoutModalVisible}
        onConfirm={() => {
          setLogoutModalVisible(false);
          signOut();
        }}
        onCancel={() => setLogoutModalVisible(false)}
      />

      <TermsModal
      visible={termsModalVisible}
      onClose={() => setTermsModalVisible(false)}
    />

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
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  headerDescription: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "400",
    lineHeight: 18,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  section: {
    paddingHorizontal: Math.max(20, width * 0.05),
    marginTop: 20,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },

  // Profile Card - Redesigned
  profileCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    position: "relative",
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 20,
  },
  avatar: {
    width: Math.min(120, width * 0.3),
    height: Math.min(120, width * 0.3),
    borderRadius: Math.min(60, width * 0.15),
    borderWidth: 4,
    borderColor: "#2E6A2E",
  },
  cameraButton: {
    position: "absolute",
    bottom: 5,
    right: 5,
    backgroundColor: "#2E6A2E",
    borderRadius: 18,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "white",
  },
  profileInfo: {
    alignItems: "center",
    width: "100%",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2E6A2E",
    marginBottom: 6,
    textAlign: "center",
  },
  userEmail: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
    textAlign: "center",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 10,
    justifyContent: "center", // keeps the whole row centered
  },
  userDetail: {
    fontSize: 15,
    color: "#555",
    marginLeft: 8, // spacing between icon and text
    fontWeight: "500",
    textAlign: "left", // don't center inside its box
    flex: 0, // prevents stretching
  },
  editButton: {
    position: "absolute",
    top: 20,
    right: 20,
    padding: 12,
    backgroundColor: "#f0f8f0",
    borderRadius: 12,
  },

  // Stats
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2E6A2E",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    fontWeight: "500",
  },

  // Menu
  menuItem: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 18,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2E6A2E",
    marginBottom: 3,
  },
  menuSubtitle: {
    fontSize: 14,
    color: "#666",
    lineHeight: 18,
  },



  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Image Picker Modal
  imagePickerModal: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    width: width * 0.85,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    marginBottom: 12,
  },
  pickerText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 15,
    fontWeight: "500",
  },
  cancelOption: {
    marginTop: 10,
    padding: 15,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 16,
    color: "#666",
  },

  // Edit Modal
  editModal: {
    width: "90%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    maxWidth: 450,
    maxHeight: "85%",
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  asterisk: {
    color: "#E74C3C",
    fontSize: 15,
    fontWeight: "bold",
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#333",
  },
  addressInput: {
    height: 80,
    paddingTop: 14,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 25,
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderWidth: 1.5,
    borderColor: "#ddd",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#2E6A2E",
  },
  disabledButton: {
    backgroundColor: "#cccccc",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  logoutItem: {
    borderWidth: 1,
    borderColor: "#FFE6E6",
    backgroundColor: "#FFF5F5",
  },
  logoutIcon: {
    backgroundColor: "#FFE6E6",
  },
  logoutText: {
    color: "#E74C3C",
  },
  logoutSubtext: {
    color: "#E74C3C",
    opacity: 0.7,
  },
})
