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
  TextInput,
  ActivityIndicator,
  Dimensions,
} from "react-native"
import { Feather } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import { useAuth } from "../AuthContext"
import { doc, updateDoc, getDoc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { db, storage } from "../firebase/firebase"
import LoadingScreen from "../hooks/LoadingScreen"
import { SafeAreaView } from 'react-native-safe-area-context'

const { width } = Dimensions.get("window")

export default function PersonalInformationScreen({ navigation }) {
  const { currentUser } = useAuth()
  const [updating, setUpdating] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const [firstName, setFirstName] = useState("")
  const [middleName, setMiddleName] = useState("")
  const [lastName, setLastName] = useState("")
  const [contactNumber, setContactNumber] = useState("")
  const [address, setAddress] = useState("")

  // Fetch user profile data
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

  const showImagePicker = () => {
    Alert.alert(
      "Change Profile Picture",
      "Choose an option",
      [
        { text: "Camera", onPress: selectImageFromCamera },
        { text: "Gallery", onPress: selectImageFromLibrary },
        { text: "Cancel", style: "cancel" },
      ]
    )
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
      Alert.alert("Success", "Profile updated successfully!", [
        { text: "OK", onPress: () => navigation.goBack() }
      ])
    } catch (error) {
      console.error("Update error:", error)
      Alert.alert("Error", "Failed to update profile")
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return <LoadingScreen message="Loading profile..." />
  }

  const userData = userProfile || currentUser
  const displayName =
    userData?.firstName && userData?.lastName
      ? userData?.middleName
        ? `${userData.firstName} ${userData.middleName} ${userData.lastName}`
        : `${userData.firstName} ${userData.lastName}`
      : userData?.name || "User"

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Personal Information</Text>
          <Text style={styles.headerDescription}>Update your profile details</Text>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Picture Section */}
        <View style={styles.section}>
          <View style={styles.profileImageCard}>
            <Text style={styles.sectionTitle}>Profile Picture</Text>
            <View style={styles.avatarContainer}>
              <Image
                source={{
                  uri: userData?.photoURL || "https://via.placeholder.com/120x120/CCCCCC/FFFFFF?text=User",
                }}
                style={styles.avatar}
              />
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={showImagePicker}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Feather name="camera" size={18} color="white" />
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.imageHint}>Tap the camera icon to change your profile picture</Text>
          </View>
        </View>

        {/* Personal Details Section */}
        <View style={styles.section}>
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Personal Details</Text>

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
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={userData?.email || ""}
                editable={false}
              />
              <Text style={styles.inputHint}>Email cannot be changed</Text>
            </View>
          </View>
        </View>

        {/* Contact Information Section */}
        <View style={styles.section}>
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Contact Information</Text>

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
                placeholder="Enter your complete address"
                value={address}
                onChangeText={setAddress}
                editable={!updating}
                multiline={true}
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.saveButton, updating && styles.disabledButton]}
            onPress={handleSave}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Feather name="save" size={20} color="white" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    flexDirection: "row",
    alignItems: "center",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  backButton: {
    padding: 8,
    marginRight: 15,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  headerDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },

  // Profile Picture Section
  profileImageCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#2E6A2E",
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#2E6A2E",
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  imageHint: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
  },

  // Form Section
  formCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  inputGroup: {
    marginBottom: 20,
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
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#333",
  },
  disabledInput: {
    backgroundColor: "#F5F5F5",
    color: "#888",
  },
  addressInput: {
    height: 80,
    paddingTop: 15,
  },
  inputHint: {
    fontSize: 12,
    color: "#888",
    marginTop: 5,
    fontStyle: "italic",
  },

  // Save Button
  saveButton: {
    backgroundColor: "#2E6A2E",
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: "#cccccc",
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});