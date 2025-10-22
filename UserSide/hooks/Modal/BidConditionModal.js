import React from "react"
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"

const BidConditionModal = ({ visible, onClose, onConfirm, selectedItem }) => {
  if (!selectedItem) return null

  const PesoSymbol = ({ size = 16, color = "#2E6A2E" }) => (
    <Text style={{ fontSize: size, color, fontWeight: "bold" }}>₱</Text>
  )

  const conditionColors = {
    Excellent: "#4CAF50",
    Good: "#8BC34A",
    Fair: "#FFC107",
    Poor: "#F44336",
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Icon name="gavel" size={32} color="#2E6A2E" />
            <Text style={styles.modalTitle}>Confirm Your Bid</Text>
          </View>

          {/* Item Details */}
          <View style={styles.itemDetailsContainer}>
            <Image
              source={{ uri: selectedItem.image }}
              style={styles.itemImage}
            />
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle} numberOfLines={2}>
                {selectedItem.title}
              </Text>
              <View style={styles.badgesContainer}>
                {selectedItem.condition && (
                  <View
                    style={[
                      styles.conditionBadge,
                      { backgroundColor: conditionColors[selectedItem.condition] || "#F0F0F0" },
                    ]}
                  >
                    <Text style={styles.badgeText}>{selectedItem.condition}</Text>
                  </View>
                )}
                {selectedItem.category && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{selectedItem.category}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Bid Information */}
          <View style={styles.bidInfoContainer}>
            <View style={styles.bidRow}>
              <Text style={styles.bidLabel}>Current Bid:</Text>
              <View style={styles.bidAmountContainer}>
                <PesoSymbol size={16} color="#666" />
                <Text style={styles.currentBidText}>
                  {selectedItem.currentBid.toLocaleString()}
                </Text>
              </View>
            </View>
            <View style={styles.bidRow}>
              <Text style={styles.bidLabel}>Your Bid:</Text>
              <View style={styles.bidAmountContainer}>
                <PesoSymbol size={18} color="#2E6A2E" />
                <Text style={styles.yourBidText}>
                  {selectedItem.nextBid.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>

          {/* Warning Message */}
          <View style={styles.warningContainer}>
            <Icon name="info-outline" size={20} color="#F5A623" />
            <Text style={styles.warningText}>
              By placing this bid, you agree to purchase this item if you win the auction.
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Icon name="check-circle" size={20} color="white" style={styles.buttonIcon} />
              <Text style={styles.confirmButtonText}>Confirm Bid</Text>
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
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginTop: 8,
    textAlign: "center",
  },
  itemDetailsContainer: {
    flexDirection: "row",
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
    justifyContent: "center",
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  badgesContainer: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  conditionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    color: "white",
    fontWeight: "600",
  },
  categoryBadge: {
    backgroundColor: "#E0E0E0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 11,
    color: "#666",
    fontWeight: "600",
  },
  bidInfoContainer: {
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  bidRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  bidLabel: {
    fontSize: 15,
    color: "#666",
    fontWeight: "500",
  },
  bidAmountContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  currentBidText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginLeft: 4,
  },
  yourBidText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2E6A2E",
    marginLeft: 4,
  },
  warningContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF9E6",
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#F5A623",
  },
  warningText: {
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
  buttonIcon: {
    marginRight: 6,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
})

export default BidConditionModal