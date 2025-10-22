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
import Icon from "react-native-vector-icons/MaterialIcons"
import * as ImagePicker from "expo-image-picker"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { collection, addDoc, doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore"
import { storage, db } from "../../firebase/firebase"

const MessageImageModal = ({ 
  visible, 
  onClose, 
  currentUser, 
  conversationId,
  onImageSent 
}) => {
  const [uploading, setUploading] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)
  const [showAlert, setShowAlert] = useState(false)
  const [alertConfig, setAlertConfig] = useState({
    type: "success",
    title: "",
    message: ""
  })

  // Handle camera photo
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      
      if (status !== "granted") {
        setAlertConfig({
          type: "warning",
          title: "Permission Required",
          message: "Camera access is needed to take photos."
        })
        setShowAlert(true)
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPreviewImage(result.assets[0].uri)
      }
    } catch (error) {
      console.error("Camera error:", error)
      setAlertConfig({
        type: "error",
        title: "Camera Error",
        message: "Failed to open camera. Please try again."
      })
      setShowAlert(true)
    }
  }

  // Handle gallery selection
  const handlePickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      
      if (status !== "granted") {
        setAlertConfig({
          type: "warning",
          title: "Permission Required",
          message: "Photo library access is needed to select images."
        })
        setShowAlert(true)
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPreviewImage(result.assets[0].uri)
      }
    } catch (error) {
      console.error("Gallery error:", error)
      setAlertConfig({
        type: "error",
        title: "Gallery Error",
        message: "Failed to open gallery. Please try again."
      })
      setShowAlert(true)
    }
  }

  // Upload and send image
  const handleSendImage = async () => {
    if (!previewImage || !conversationId) return

    try {
      setUploading(true)

      const filename = `chat-images/${conversationId}/${Date.now()}.jpg`
      const imageRef = ref(storage, filename)
      
      const response = await fetch(previewImage)
      const blob = await response.blob()
      
      await uploadBytes(imageRef, blob)
      const downloadURL = await getDownloadURL(imageRef)

      const messagesRef = collection(db, 'conversations', conversationId, 'messages')
      await addDoc(messagesRef, {
        senderId: currentUser.uid,
        senderType: 'user',
        imageUrl: downloadURL,
        type: 'image',
        timestamp: serverTimestamp(),
        status: 'delivered'
      })

      const conversationRef = doc(db, 'conversations', conversationId)
      const conversationDoc = await getDoc(conversationRef)
      const currentUnreadCount = conversationDoc.data()?.unreadCount?.admin || 0
      
      await updateDoc(conversationRef, {
        lastMessage: '📷 Photo',
        lastMessageTime: serverTimestamp(),
        'unreadCount.admin': currentUnreadCount + 1,
      })

      if (onImageSent) {
        onImageSent(downloadURL)
      }

      handleClose()
    } catch (error) {
      console.error('Upload error:', error)
      setAlertConfig({
        type: "error",
        title: "Upload Failed",
        message: "Failed to send image. Please try again."
      })
      setShowAlert(true)
    } finally {
      setUploading(false)
    }
  }

  // Handle close modal
  const handleClose = () => {
    setPreviewImage(null)
    setUploading(false)
    onClose()
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Icon name="image" size={28} color="#135918" />
            <Text style={styles.modalTitle}>Send Image</Text>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={handleClose}
              disabled={uploading}
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Image Preview */}
          <View style={styles.imagePreviewContainer}>
            {previewImage ? (
              <>
                <Image
                  source={{ uri: previewImage }}
                  style={styles.previewImage}
                />
                <View style={styles.previewBadge}>
                  <Icon name="check-circle" size={16} color="white" />
                  <Text style={styles.previewBadgeText}>Image Selected</Text>
                </View>
              </>
            ) : (
              <View style={styles.placeholderContainer}>
                <Icon name="photo-library" size={80} color="#ddd" />
                <Text style={styles.placeholderText}>No image selected</Text>
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
              <Icon name="camera-alt" size={24} color="#135918" />
              <Text style={styles.actionButtonText}>Take Photo</Text>
            </TouchableOpacity>

            <View style={styles.actionButtonDivider} />

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handlePickFromGallery}
              disabled={uploading}
            >
              <Icon name="photo-library" size={24} color="#135918" />
              <Text style={styles.actionButtonText}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>

          {/* Info Text */}
          <View style={styles.infoContainer}>
            <Icon name="info-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              Select or take a photo, then tap "Send" to share it in the chat.
            </Text>
          </View>

          {/* Bottom Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.cancelButton, uploading && styles.disabledButton]}
              onPress={handleClose}
              disabled={uploading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!previewImage || uploading) && styles.disabledButton,
              ]}
              onPress={handleSendImage}
              disabled={!previewImage || uploading}
            >
              {uploading ? (
                <>
                  <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.sendButtonText}>Sending...</Text>
                </>
              ) : (
                <>
                  <Icon name="send" size={18} color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.sendButtonText}>Send</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
    minHeight: 250,
    justifyContent: "center",
  },
  previewImage: {
    width: "100%",
    height: 250,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#135918",
  },
  placeholderContainer: {
    width: "100%",
    height: 250,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  placeholderText: {
    marginTop: 12,
    fontSize: 14,
    color: "#999",
  },
  previewBadge: {
    position: "absolute",
    bottom: 10,
    backgroundColor: "#135918",
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
    color: "#135918",
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
  sendButton: {
    flex: 1,
    backgroundColor: "#135918",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
  disabledButton: {
    backgroundColor: "#CCCCCC",
    opacity: 0.6,
  },
})

export default MessageImageModal