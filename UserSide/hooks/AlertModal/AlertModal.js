import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

const { width } = Dimensions.get("window");

const AlertSignIn = ({ visible, title, message, onClose, isSuccess = false }) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={[styles.iconContainer, isSuccess ? styles.successIcon : styles.errorIcon]}>
            <MaterialCommunityIcons
              name={isSuccess ? "check-circle-outline" : "alert-circle-outline"}
              size={40}
              color={isSuccess ? "#2E6A2E" : "#D32F2F"}
            />
          </View>

          <Text style={styles.titleText}>{title}</Text>
          <Text style={styles.messageText}>{message}</Text>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.closeButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: width * 0.8,
    maxWidth: 350,
    backgroundColor: "#FFFCF3",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 15,
  },
  iconContainer: {
    marginBottom: 15,
    padding: 10,
    borderRadius: 50,
  },
  successIcon: {
    backgroundColor: "rgba(46, 106, 46, 0.1)",
  },
  errorIcon: {
    backgroundColor: "rgba(211, 47, 47, 0.1)",
  },
  titleText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2E6A2E",
    textAlign: "center",
    marginBottom: 10,
  },
  messageText: {
    fontSize: 16,
    color: "#4A4A4A",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  closeButton: {
    backgroundColor: "#2E6A2E",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    shadowColor: "#2E6A2E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default AlertSignIn;