"use client"

import { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native"
import { Feather } from "@expo/vector-icons"
import { useAuth } from "../AuthContext"
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth"
import { auth } from "../firebase/firebase"
import { SafeAreaView } from 'react-native-safe-area-context'

export default function ChangePasswordScreen({ navigation }) {
  const { currentUser } = useAuth()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [updating, setUpdating] = useState(false)
  
  // Password visibility states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Validation states
  const [errors, setErrors] = useState({})

  const validatePassword = (password) => {
    const minLength = 8
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    const validations = {
      length: password.length >= minLength,
      uppercase: hasUpperCase,
      lowercase: hasLowerCase,
      numbers: hasNumbers,
      special: hasSpecialChar,
    }

    return validations
  }

  const handleChangePassword = async () => {
    // Reset errors
    setErrors({})

    // Validate inputs
    const newErrors = {}
    
    if (!currentPassword.trim()) {
      newErrors.currentPassword = "Current password is required"
    }
    
    if (!newPassword.trim()) {
      newErrors.newPassword = "New password is required"
    } else {
      const passwordValidation = validatePassword(newPassword)
      if (!passwordValidation.length) {
        newErrors.newPassword = "Password must be at least 8 characters long"
      } else if (!passwordValidation.uppercase || !passwordValidation.lowercase) {
        newErrors.newPassword = "Password must contain both uppercase and lowercase letters"
      } else if (!passwordValidation.numbers) {
        newErrors.newPassword = "Password must contain at least one number"
      } else if (!passwordValidation.special) {
        newErrors.newPassword = "Password must contain at least one special character"
      }
    }
    
    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = "Please confirm your new password"
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    if (currentPassword === newPassword) {
      newErrors.newPassword = "New password must be different from current password"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setUpdating(true)

    try {
      // Re-authenticate the user before changing password
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
      )

      await reauthenticateWithCredential(auth.currentUser, credential)
      
      // Update the password
      await updatePassword(auth.currentUser, newPassword)

      Alert.alert(
        "Success", 
        "Password changed successfully!", 
        [
          {
            text: "OK",
            onPress: () => {
              // Clear form and navigate back
              setCurrentPassword("")
              setNewPassword("")
              setConfirmPassword("")
              navigation.goBack()
            }
          }
        ]
      )
    } catch (error) {
      console.error("Password change error:", error)
      
      let errorMessage = "Failed to change password. Please try again."
      
      switch (error.code) {
        case "auth/wrong-password":
          errorMessage = "Current password is incorrect"
          setErrors({ currentPassword: "Current password is incorrect" })
          break
        case "auth/too-many-requests":
          errorMessage = "Too many failed attempts. Please try again later."
          break
        case "auth/network-request-failed":
          errorMessage = "Network error. Please check your connection."
          break
        case "auth/requires-recent-login":
          errorMessage = "Please sign out and sign in again before changing your password"
          break
        default:
          errorMessage = error.message || "An unexpected error occurred"
      }
      
      Alert.alert("Error", errorMessage)
    } finally {
      setUpdating(false)
    }
  }

  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, text: "", color: "#E0E0E0" }
    
    const validation = validatePassword(password)
    const score = Object.values(validation).filter(Boolean).length
    
    if (score <= 2) return { strength: 1, text: "Weak", color: "#E74C3C" }
    if (score <= 3) return { strength: 2, text: "Fair", color: "#F39C12" }
    if (score <= 4) return { strength: 3, text: "Good", color: "#3498DB" }
    return { strength: 4, text: "Strong", color: "#2ECC71" }
  }

  const passwordStrength = getPasswordStrength(newPassword)

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
          <Text style={styles.headerTitle}>Change Password</Text>
          <Text style={styles.headerDescription}>Update your account password</Text>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        {/* Security Notice */}
        <View style={styles.section}>
          <View style={styles.noticeCard}>
            <View style={styles.noticeIcon}>
              <Feather name="shield" size={20} color="#3498DB" />
            </View>
            <View style={styles.noticeContent}>
              <Text style={styles.noticeTitle}>Security Notice</Text>
              <Text style={styles.noticeText}>
                For your security, you'll need to enter your current password to make changes.
              </Text>
            </View>
          </View>
        </View>

        {/* Change Password Form */}
        <View style={styles.section}>
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Password Information</Text>

            {/* Current Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Current Password <Text style={styles.asterisk}>*</Text>
              </Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.passwordInput,
                    errors.currentPassword && styles.errorInput
                  ]}
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPassword}
                  editable={!updating}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  <Feather 
                    name={showCurrentPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
              </View>
              {errors.currentPassword && (
                <Text style={styles.errorText}>{errors.currentPassword}</Text>
              )}
            </View>

            {/* New Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                New Password <Text style={styles.asterisk}>*</Text>
              </Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.passwordInput,
                    errors.newPassword && styles.errorInput
                  ]}
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  editable={!updating}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                >
                  <Feather 
                    name={showNewPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
              </View>
              
              {/* Password Strength Indicator */}
              {newPassword.length > 0 && (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthBar}>
                    <View 
                      style={[
                        styles.strengthFill, 
                        { 
                          width: `${(passwordStrength.strength / 4) * 100}%`,
                          backgroundColor: passwordStrength.color
                        }
                      ]} 
                    />
                  </View>
                  <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                    {passwordStrength.text}
                  </Text>
                </View>
              )}
              
              {errors.newPassword && (
                <Text style={styles.errorText}>{errors.newPassword}</Text>
              )}
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Confirm New Password <Text style={styles.asterisk}>*</Text>
              </Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.passwordInput,
                    errors.confirmPassword && styles.errorInput
                  ]}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  editable={!updating}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Feather 
                    name={showConfirmPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Password Requirements */}
        <View style={styles.section}>
          <View style={styles.requirementsCard}>
            <Text style={styles.requirementsTitle}>Password Requirements:</Text>
            <View style={styles.requirement}>
              <Feather name="check-circle" size={16} color="#2ECC71" />
              <Text style={styles.requirementText}>At least 8 characters long</Text>
            </View>
            <View style={styles.requirement}>
              <Feather name="check-circle" size={16} color="#2ECC71" />
              <Text style={styles.requirementText}>Contains uppercase and lowercase letters</Text>
            </View>
            <View style={styles.requirement}>
              <Feather name="check-circle" size={16} color="#2ECC71" />
              <Text style={styles.requirementText}>Contains at least one number</Text>
            </View>
            <View style={styles.requirement}>
              <Feather name="check-circle" size={16} color="#2ECC71" />
              <Text style={styles.requirementText}>Contains at least one special character</Text>
            </View>
          </View>
        </View>

        {/* Change Password Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.changeButton, updating && styles.disabledButton]}
            onPress={handleChangePassword}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Feather name="lock" size={20} color="white" />
                <Text style={styles.changeButtonText}>Change Password</Text>
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
    marginBottom: 20,
  },

  // Security Notice
  noticeCard: {
    backgroundColor: "#E8F4FD",
    borderRadius: 15,
    padding: 20,
    flexDirection: "row",
    borderLeftWidth: 4,
    borderLeftColor: "#3498DB",
  },
  noticeIcon: {
    marginRight: 15,
    marginTop: 2,
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2980B9",
    marginBottom: 5,
  },
  noticeText: {
    fontSize: 14,
    color: "#34495E",
    lineHeight: 20,
  },

  // Form Card
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
    marginBottom: 25,
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
  passwordContainer: {
    position: "relative",
  },
  passwordInput: {
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 15,
    paddingRight: 50,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#333",
  },
  eyeButton: {
    position: "absolute",
    right: 15,
    top: 15,
    padding: 5,
  },
  errorInput: {
    borderColor: "#E74C3C",
  },
  errorText: {
    fontSize: 12,
    color: "#E74C3C",
    marginTop: 5,
    marginLeft: 5,
  },

  // Password Strength
  strengthContainer: {
    marginTop: 10,
  },
  strengthBar: {
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    marginBottom: 5,
  },
  strengthFill: {
    height: "100%",
    borderRadius: 2,
    transition: "width 0.3s ease",
  },
  strengthText: {
    fontSize: 12,
    fontWeight: "500",
  },

  // Requirements Card
  requirementsCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  requirementsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
  },
  requirement: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  requirementText: {
    fontSize: 14,
    color: "#555",
    marginLeft: 10,
    flex: 1,
  },

  // Change Button
  changeButton: {
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
  changeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});