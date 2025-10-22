import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

const { width, height } = Dimensions.get("window");

const LogoutModal = ({ visible, onConfirm, onCancel }) => {
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="logout" size={48} color="#E74C3C" />
          </View>

          <Text style={styles.titleText}>Confirm Logout</Text>
          <Text style={styles.messageText}>
            Are you sure you want to sign out of your account?
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              activeOpacity={0.7}
              accessibilityLabel="Cancel logout"
              accessibilityRole="button"
            >
              <Text style={styles.cancelButtonText}>Stay Logged In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={onConfirm}
              activeOpacity={0.7}
              accessibilityLabel="Confirm logout"
              accessibilityRole="button"
            >
              <Text style={styles.confirmButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: width * 0.85,
    maxWidth: 360,
    backgroundColor: "#FFFCF3",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 20,
  },
  iconContainer: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 50,
    backgroundColor: "rgba(231, 76, 60, 0.15)",
  },
  titleText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2E6A2E",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  messageText: {
    fontSize: 16,
    color: "#4A4A4A",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
    fontWeight: "400",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderWidth: 1.5,
    borderColor: "#D0D0D0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#E74C3C",
    shadowColor: "#E74C3C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4A4A4A",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

export default LogoutModal;