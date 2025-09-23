"use client"

import { useState, useCallback, useEffect } from "react"
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Dimensions,
  ImageBackground,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native"
import Feather from "react-native-vector-icons/Feather"
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons"
import { useAuth } from "../AuthContext"

// Import your images
import Background_SignIn from "../assets/images/SignIn/Bg-SignIn.png"
import Text_SignIn from "../assets/images/SignIn/Text-SignIn.png"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "../firebase/firebase"

const { width, height } = Dimensions.get("window")

export default function SignInScreen({ navigation }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isEmailFocused, setIsEmailFocused] = useState(false)
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  

  const { signIn } = useAuth() // Remove verifyCredentials as we're using Firebase

  useEffect(() => {
    StatusBar.setBarStyle("light-content", true)
  }, [])

  const handleSignIn = useCallback(async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields")
      return
    }

    setIsLoading(true)

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      console.log("Signed in:", userCredential.user.email)

      // The AuthContext will automatically update when Firebase auth state changes
    } catch (error) {
      setIsLoading(false)

      let errorMessage = "Login failed. Please try again."
      if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email."
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Incorrect password."
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email format."
      }

      Alert.alert("Login Failed", errorMessage)
    }
  }, [email, password])

  const handleSignUp = useCallback(() => {
    console.log("Sign Up pressed")
    navigation.navigate("SignUp")
  }, [navigation])

  return (
    <ImageBackground source={Background_SignIn} style={styles.fullScreenBackground} resizeMode="cover">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer}>
        <View style={styles.contentArea}>
          <View style={styles.textImageContainer}>
            <Image source={Text_SignIn} style={styles.signInText} resizeMode="contain" />
          </View>

          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionText}>
              Log in with your email and password to continue where you left off.
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email:</Text>
            <View style={[styles.inputContainer, isEmailFocused && styles.inputFocused]}>
              <MaterialCommunityIcons name="email-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter Email"
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

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password:</Text>
            <View style={[styles.inputContainer, isPasswordFocused && styles.inputFocused]}>
              <MaterialCommunityIcons name="lock-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter Password"
                placeholderTextColor="#888"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.iconButton}
                activeOpacity={0.7}
              >
                <Feather name={showPassword ? "eye" : "eye-off"} size={20} color="#888" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.signInButton, isLoading && styles.signInButtonLoading]}
              onPress={handleSignIn}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <MaterialCommunityIcons name="loading" size={20} color="#fff" />
                  <Text style={styles.signInButtonText}>Signing In...</Text>
                </View>
              ) : (
                <>
                  <MaterialCommunityIcons name="login" size={18} color="#fff" />
                  <Text style={styles.signInButtonText}>Sign In</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.signUpContainer}>
            <Text style={styles.signUpText}>Don't have an account? </Text>
            <TouchableOpacity onPress={handleSignUp} activeOpacity={0.7}>
              <Text style={styles.signUpLink}>Sign Up!</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    paddingVertical: 30,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 15,
  },
  textImageContainer: {
    marginBottom: 10,
    zIndex: 1,
  },
  signInText: {
    width: width * 0.6,
    height: 60,
  },
  descriptionContainer: {
    marginBottom: 30,
    zIndex: 1,
  },
  descriptionText: {
    fontSize: 16,
    color: "#4A4A4A",
    textAlign: "center",
    paddingHorizontal: 20,
    fontWeight: "normal",
  },
  inputGroup: {
    width: "100%",
    marginBottom: 20,
    zIndex: 1,
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
  iconButton: {
    paddingLeft: 10,
    paddingVertical: 5,
  },
  buttonContainer: {
    width: "100%",
    marginTop: 10,
    marginBottom: 20,
    zIndex: 1,
  },
  signInButton: {
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
  signInButtonLoading: {
    backgroundColor: "#666",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingSpinner: {},
  signInButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  signUpContainer: {
    flexDirection: "row",
    marginTop: 10,
    zIndex: 1,
  },
  signUpText: {
    fontSize: 14,
    color: "#4A4A4A",
  },
  signUpLink: {
    fontSize: 14,
    color: "#2E6A2E",
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
})
