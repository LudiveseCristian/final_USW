import React, { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native"
import { Feather } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { doc, updateDoc } from "firebase/firestore"
import { storage, db } from "../../firebase/firebase"
import ProfileAlertModal from "../AlertModal/ProfileAlertModal"
import ConfirmationModal from "../AlertModal/ConfirmationModal"

const PersonalInformationModal = ({ visible, onClose, currentUser, currentPhotoURL, onImageUpdated }) => {
  const [uploading, setUploading] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)
  
  // Alert modal states
  const [alertVisible, setAlertVisible] = useState(false)
  const [alertConfig, setAlertConfig] = useState({
    type: "success",
    title: "",
    message: ""
  })
  
  // Confirmation modal state
  const [confirmVisible, setConfirmVisible] = useState(false)

  // Show alert helper
  const showAlert = (type, title, message, onCloseCallback) => {
    setAlertConfig({ type, title, message, onCloseCallback })
    setAlertVisible(true)
  }

  // Upload image to Firebase Storage
  const uploadImageToFirebase = async (imageUri) => {
    try {
      setUploading(true)

      const filename = `profile_${Date.now()}.jpg`
      const imageRef = ref(storage, `profile-images/${currentUser.uid}/${filename}`)

      const response = await fetch(imageUri)
      const blob = await response.blob()

      const snapshot = await uploadBytes(imageRef, blob)
      const downloadURL = await getDownloadURL(snapshot.ref)

      const userRef = doc(db, "users", currentUser.uid)
      await updateDoc(userRef, {
        photoURL: downloadURL,
        updatedAt: new Date().toISOString(),
      })

      if (onImageUpdated) {
        onImageUpdated(downloadURL)
      }

      showAlert(
        "success",
        "Success!",
        "Your profile picture has been updated successfully.",
        handleClose
      )
    } catch (error) {
      console.error("Upload error:", error)
      showAlert(
        "error",
        "Upload Failed",
        `Failed to update profile picture. ${error.message}`
      )
    } finally {
      setUploading(false)
    }
  }

  // Handle camera photo
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      
      if (status !== "granted") {
        showAlert(
          "warning",
          "Permission Required",
          "Camera access is needed to take photos. Please enable it in your device settings."
        )
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPreviewImage(result.assets[0].uri)
      }
    } catch (error) {
      console.error("Camera error:", error)
      showAlert(
        "error",
        "Camera Error",
        "Failed to open camera. Please try again."
      )
    }
  }

  // Handle gallery selection
  const handlePickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      
      if (status !== "granted") {
        showAlert(
          "warning",
          "Permission Required",
          "Photo library access is needed to select images. Please enable it in your device settings."
        )
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPreviewImage(result.assets[0].uri)
      }
    } catch (error) {
      console.error("Gallery error:", error)
      showAlert(
        "error",
        "Gallery Error",
        "Failed to open gallery. Please try again."
      )
    }
  }

  // Handle upload confirmation
  const handleUploadConfirm = () => {
    if (!previewImage) {
      showAlert(
        "info",
        "No Image Selected",
        "Please select an image before uploading."
      )
      return
    }
    uploadImageToFirebase(previewImage)
  }

  // Handle close modal
  const handleClose = () => {
    setPreviewImage(null)
    setUploading(false)
    onClose()
  }

  // Handle cancel with confirmation if image selected
  const handleCancel = () => {
    if (uploading) {
      showAlert(
        "info",
        "Upload in Progress",
        "Please wait for the upload to complete."
      )
      return
    }
    
    if (previewImage) {
      setConfirmVisible(true)
    } else {
      handleClose()
    }
  }

  return (
    <>
      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Feather name="image" size={28} color="#2E6A2E" />
              <Text style={styles.modalTitle}>Change Profile Picture</Text>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={handleCancel}
                disabled={uploading}
              >
                <Feather name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Image Preview */}
            <View style={styles.imagePreviewContainer}>
              <Image
                source={{
                  uri: previewImage || currentPhotoURL || "https://via.placeholder.com/200x200/CCCCCC/FFFFFF?text=No+Image",
                }}
                style={styles.previewImage}
              />
              {previewImage && (
                <View style={styles.previewBadge}>
                  <Feather name="check-circle" size={16} color="white" />
                  <Text style={styles.previewBadgeText}>New Image Selected</Text>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleTakePhoto}
                disabled={uploading}
              >
                <Feather name="camera" size={24} color="#2E6A2E" />
                <Text style={styles.actionButtonText}>Take Photo</Text>
              </TouchableOpacity>

              <View style={styles.actionButtonDivider} />

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handlePickFromGallery}
                disabled={uploading}
              >
                <Feather name="image" size={24} color="#2E6A2E" />
                <Text style={styles.actionButtonText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>

            {/* Info Text */}
            <View style={styles.infoContainer}>
              <Feather name="info" size={16} color="#666" />
              <Text style={styles.infoText}>
                Select or take a photo, then tap "Upload" to update your profile picture.
              </Text>
            </View>

            {/* Bottom Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.cancelButton, uploading && styles.disabledButton]}
                onPress={handleCancel}
                disabled={uploading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.uploadButton,
                  (!previewImage || uploading) && styles.disabledButton,
                ]}
                onPress={handleUploadConfirm}
                disabled={!previewImage || uploading}
              >
                {uploading ? (
                  <>
                    <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                    <Text style={styles.uploadButtonText}>Uploading...</Text>
                  </>
                ) : (
                  <>
                    <Feather name="upload" size={18} color="white" style={{ marginRight: 8 }} />
                    <Text style={styles.uploadButtonText}>Upload</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Alert Modal */}
      <ProfileAlertModal
        visible={alertVisible}
        onClose={() => {
          setAlertVisible(false)
          if (alertConfig.onCloseCallback) {
            alertConfig.onCloseCallback()
          }
        }}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={confirmVisible}
        title="Discard Changes?"
        message="You have selected a new image. Are you sure you want to cancel without uploading?"
        confirmText="Discard"
        cancelText="Keep Editing"
        onConfirm={() => {
          setConfirmVisible(false)
          handleClose()
        }}
        onCancel={() => setConfirmVisible(false)}
      />
    </>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
    margin: 20,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    position: "relative",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 12,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  imagePreviewContainer: {
    alignItems: "center",
    marginBottom: 24,
    position: "relative",
  },
  previewImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: "#2E6A2E",
  },
  previewBadge: {
    position: "absolute",
    bottom: 10,
    backgroundColor: "#2E6A2E",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  previewBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    backgroundColor: "#F8F8F8",
    borderRadius: 16,
    padding: 8,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
  },
  actionButtonDivider: {
    width: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 8,
  },
  actionButtonText: {
    fontSize: 13,
    color: "#2E6A2E",
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },
  infoContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF9E6",
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: "#F5A623",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#856404",
    marginLeft: 10,
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#F0F0F0",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  uploadButton: {
    flex: 1,
    backgroundColor: "#2E6A2E",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
  disabledButton: {
    backgroundColor: "#CCCCCC",
    opacity: 0.6,
  },
})

export default PersonalInformationModal