import React, { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
} from "react-native"
import { Feather } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import ProfileAlertModal from "../AlertModal/ProfileAlertModal"
import ConfirmationModal from "../AlertModal/ConfirmationModal"

const ImageUploadModal = ({
  visible,
  onClose,
  images,
  onImagesSelected,
  maxImages = 3,
  title = "Upload Photos",
}) => {
  const [tempImages, setTempImages] = useState([])
  const [uploading, setUploading] = useState(false)

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

      if (tempImages.length >= maxImages) {
        showAlert(
          "info",
          "Maximum Reached",
          `You can only upload up to ${maxImages} photos.`
        )
        return
      }

      setUploading(true)
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setTempImages(prev => [...prev, result.assets[0].uri])
      }
    } catch (error) {
      console.error("Camera error:", error)
      showAlert(
        "error",
        "Camera Error",
        "Failed to open camera. Please try again."
      )
    } finally {
      setUploading(false)
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

      const remainingSlots = maxImages - tempImages.length
      if (remainingSlots <= 0) {
        showAlert(
          "info",
          "Maximum Reached",
          `You can only upload up to ${maxImages} photos.`
        )
        return
      }

      setUploading(true)
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.7,
        allowsEditing: false,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImages = result.assets
          .slice(0, remainingSlots)
          .map(asset => asset.uri)
        
        setTempImages(prev => [...prev, ...newImages])

        if (result.assets.length > remainingSlots) {
          showAlert(
            "info",
            "Selection Limit",
            `Only ${remainingSlots} image(s) were added due to the ${maxImages} photo limit.`
          )
        }
      }
    } catch (error) {
      console.error("Gallery error:", error)
      showAlert(
        "error",
        "Gallery Error",
        "Failed to open gallery. Please try again."
      )
    } finally {
      setUploading(false)
    }
  }

  // Remove image from temp selection
  const handleRemoveImage = (index) => {
    setTempImages(prev => prev.filter((_, i) => i !== index))
  }

  // Handle confirm upload
  const handleConfirm = () => {
    if (tempImages.length === 0) {
      showAlert(
        "info",
        "No Images Selected",
        "Please select at least one image before uploading."
      )
      return
    }

    onImagesSelected(tempImages)
    handleClose()
    showAlert(
      "success",
      "Images Added!",
      `${tempImages.length} photo(s) have been added successfully.`
    )
  }

  // Handle close modal
  const handleClose = () => {
    setTempImages([])
    setUploading(false)
    onClose()
  }

  // Handle cancel with confirmation if images selected
  const handleCancel = () => {
    if (uploading) {
      showAlert(
        "info",
        "Upload in Progress",
        "Please wait for the image selection to complete."
      )
      return
    }
    
    if (tempImages.length > 0) {
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
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={handleCancel}
                disabled={uploading}
              >
                <Feather name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Image Preview Grid */}
            <ScrollView 
              style={styles.previewScrollView}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.imageGrid}>
                {tempImages.map((uri, index) => (
                  <View key={index} style={styles.imageContainer}>
                    <Image source={{ uri }} style={styles.previewImage} />
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveImage(index)}
                    >
                      <Feather name="x" size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}

                {tempImages.length < maxImages && (
                  <TouchableOpacity
                    style={styles.addImagePlaceholder}
                    disabled={true}
                  >
                    <Feather name="image" size={32} color="#CCC" />
                    <Text style={styles.placeholderText}>Empty Slot</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Image Counter */}
              <View style={styles.counterContainer}>
                <Feather name="image" size={16} color="#666" />
                <Text style={styles.counterText}>
                  {tempImages.length} of {maxImages} photos selected
                </Text>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleTakePhoto}
                disabled={uploading || tempImages.length >= maxImages}
              >
                <Feather name="camera" size={24} color="#2E6A2E" />
                <Text style={styles.actionButtonText}>Take Photo</Text>
              </TouchableOpacity>

              <View style={styles.actionButtonDivider} />

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handlePickFromGallery}
                disabled={uploading || tempImages.length >= maxImages}
              >
                <Feather name="image" size={24} color="#2E6A2E" />
                <Text style={styles.actionButtonText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>

            {/* Info Text */}
            <View style={styles.infoContainer}>
              <Feather name="info" size={16} color="#666" />
              <Text style={styles.infoText}>
                Select up to {maxImages} photos from your camera or gallery. Tap "Done" when finished.
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
                  styles.confirmButton,
                  (tempImages.length === 0 || uploading) && styles.disabledButton,
                ]}
                onPress={handleConfirm}
                disabled={tempImages.length === 0 || uploading}
              >
                {uploading ? (
                  <>
                    <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                    <Text style={styles.confirmButtonText}>Processing...</Text>
                  </>
                ) : (
                  <>
                    <Feather name="check" size={18} color="white" style={{ marginRight: 8 }} />
                    <Text style={styles.confirmButtonText}>Done</Text>
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
        title="Discard Images?"
        message="You have selected images. Are you sure you want to cancel without adding them?"
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
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
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
  previewScrollView: {
    maxHeight: 250,
    marginBottom: 16,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  imageContainer: {
    position: "relative",
    width: 100,
    height: 100,
  },
  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    backgroundColor: "#F0F0F0",
  },
  removeButton: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#E74C3C",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
  },
  placeholderText: {
    fontSize: 11,
    color: "#CCC",
    fontWeight: "600",
    marginTop: 6,
  },
  counterContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    padding: 8,
    backgroundColor: "#F8F8F8",
    borderRadius: 8,
  },
  counterText: {
    fontSize: 13,
    color: "#666",
    marginLeft: 8,
    fontWeight: "500",
  },
  actionButtonsContainer: {
    flexDirection: "row",
    backgroundColor: "#F8F8F8",
    borderRadius: 16,
    padding: 8,
    marginBottom: 16,
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
    marginBottom: 20,
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
  confirmButton: {
    flex: 1,
    backgroundColor: "#2E6A2E",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
  disabledButton: {
    backgroundColor: "#CCCCCC",
    opacity: 0.6,
  },
})

export default ImageUploadModal