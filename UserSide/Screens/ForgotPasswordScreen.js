"use client"

import { useState, useEffect } from "react"
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native"
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons"
import { sendPasswordResetEmail } from "firebase/auth"
import { auth } from "../firebase/firebase"
import AlertSignIn from "../hooks/AlertModal/AlertModal"

// Import your background image
import Background_SignIn from "../assets/images/SignIn/Bg-SignIn.png"

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState("")
  const [isEmailFocused, setIsEmailFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [modalTitle, setModalTitle] = useState("")
  const [modalMessage, setModalMessage] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    StatusBar.setBarStyle("light-content", true)
  }, [])

  const handleResetPassword = async () => {
    if (!email) {
      setModalTitle("Error")
      setModalMessage("Please enter your email address")
      setIsSuccess(false)
      setModalVisible(true)
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setModalTitle("Error")
      setModalMessage("Please enter a valid email address")
      setIsSuccess(false)
      setModalVisible(true)
      return
    }

    setIsLoading(true)

    try {
    await sendPasswordResetEmail(auth, email)
    setModalTitle("Success")
    setModalMessage("If an account exists with this email, a password reset link has been sent. Please check your inbox and spam folder.")
    setIsSuccess(true)
    setModalVisible(true)
    setIsLoading(false)
    
    // Clear email field after successful send
    setEmail("")
  } catch (error) {
    setIsLoading(false)
    console.error("Password reset error:", error)

    let errorMessage = "If an account exists with this email, a password reset link has been sent. Please check your inbox and spam folder."
    
    // Only show specific errors for invalid email format or rate limiting
    // Don't reveal if user exists or not for security
    if (error.code === "auth/invalid-email") {
      errorMessage = "Invalid email address format."
      setModalTitle("Error")
      setIsSuccess(false)
    } else if (error.code === "auth/too-many-requests") {
      errorMessage = "Too many requests. Please try again later."
      setModalTitle("Error")
      setIsSuccess(false)
    } else {
      // For user-not-found or other errors, show success message to prevent email enumeration
      setModalTitle("Success")
      setIsSuccess(true)
    }

    setModalMessage(errorMessage)
    setModalVisible(true)
    }
  }

  const handleModalClose = () => {
    setModalVisible(false)
    if (isSuccess) {
      // Navigate back to sign in after successful email send
      navigation.goBack()
    }
  }

  return (
    <ImageBackground source={Background_SignIn} style={styles.fullScreenBackground} resizeMode="cover">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer}>
        <View style={styles.contentArea}>
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#2E6A2E" />
          </TouchableOpacity>

          <View style={styles.headerContainer}>
            <MaterialCommunityIcons name="lock-reset" size={60} color="#2E6A2E" />
            <Text style={styles.headerTitle}>Forgot Password?</Text>
          </View>

          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionText}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email:</Text>
            <View style={[styles.inputContainer, isEmailFocused && styles.inputFocused]}>
              <MaterialCommunityIcons name="email-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#888"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setIsEmailFocused(true)}
                onBlur={() => setIsEmailFocused(false)}
              />
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.resetButton, isLoading && styles.resetButtonLoading]}
              onPress={handleResetPassword}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <MaterialCommunityIcons name="loading" size={20} color="#fff" />
                  <Text style={styles.resetButtonText}>Sending...</Text>
                </View>
              ) : (
                <>
                  <MaterialCommunityIcons name="email-outline" size={18} color="#fff" />
                  <Text style={styles.resetButtonText}>Send Reset Link</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.backToSignInContainer}>
            <Text style={styles.backToSignInText}>Remember your password? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Text style={styles.backToSignInLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>

        <AlertSignIn
          visible={modalVisible}
          title={modalTitle}
          message={modalMessage}
          onClose={handleModalClose}
          isSuccess={isSuccess}
        />
      </KeyboardAvoidingView>
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  fullScreenBackground: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#F5F5DC",
    justifyContent: "center",
    alignItems: "center",
  },
  keyboardContainer: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  contentArea: {
    paddingHorizontal: 20,
    alignItems: "center",
    backgroundColor: "#FFFCF3",
    borderRadius: 30,
    paddingVertical: 40,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 15,
    position: "relative",
  },
  backButton: {
    position: "absolute",
    top: 20,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2E6A2E",
    marginTop: 15,
  },
  descriptionContainer: {
    marginBottom: 30,
  },
  descriptionText: {
    fontSize: 15,
    color: "#4A4A4A",
    textAlign: "center",
    paddingHorizontal: 10,
    lineHeight: 22,
  },
  inputGroup: {
    width: "100%",
    marginBottom: 25,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2E6A2E",
    marginBottom: 8,
    alignSelf: "flex-start",
    marginLeft: 5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#B0B0B0",
    paddingHorizontal: 15,
    height: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputFocused: {
    borderColor: "#2E6A2E",
    borderWidth: 2,
    shadowColor: "#2E6A2E",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  inputIcon: {
    marginRight: 10,
  },
  buttonContainer: {
    width: "100%",
    marginBottom: 20,
  },
  resetButton: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: "#2E6A2E",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2E6A2E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    gap: 8,
  },
  resetButtonLoading: {
    backgroundColor: "#666",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  resetButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  backToSignInContainer: {
    flexDirection: "row",
    marginTop: 10,
  },
  backToSignInText: {
    fontSize: 14,
    color: "#4A4A4A",
  },
  backToSignInLink: {
    fontSize: 14,
    color: "#2E6A2E",
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
})