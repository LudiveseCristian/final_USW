"use client"

import { createContext, useState, useEffect, useContext, useMemo, useCallback } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { auth, db } from "./firebase/firebase"
import AsyncStorage from "@react-native-async-storage/async-storage"

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null) // Store complete user data
  const [userData, setUserData] = useState(null) // Store Firestore user data
  const [hasSeenOnboarding, setHasSeenOnboardingState] = useState(false)
  const [hasCompletedAppOnboarding, setHasCompletedAppOnboardingState] = useState(false)

  // Keys for AsyncStorage
  const ONBOARDING_SEEN_KEY = "@onboarding_seen"
  const APP_ONBOARDING_KEY = "@app_onboarding_completed"

  useEffect(() => {
    // Initialize app onboarding status on app start
    const initializeApp = async () => {
      await initializeOnboardingStatus()

      // Firebase auth listener
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        setIsLoading(true)

        if (user) {
          try {
            const userDocRef = doc(db, "users", user.uid)
            const userDocSnap = await getDoc(userDocRef)

            if (userDocSnap.exists()) {
              const firestoreData = userDocSnap.data()
              setUserData(firestoreData)
              setCurrentUser({
                uid: user.uid,
                email: user.email,
                ...firestoreData,
              })

              const appOnboardingCompleted =
                firestoreData.hasCompletedAppOnboarding !== undefined
                  ? firestoreData.hasCompletedAppOnboarding
                  : await checkLocalAppOnboardingStatus()

              setHasCompletedAppOnboardingState(appOnboardingCompleted)
            } else {
              const newUserData = {
                uid: user.uid,
                email: user.email,
                name: user.email.split("@")[0], // Use email prefix as fallback name
              }
              setCurrentUser(newUserData)

              setHasCompletedAppOnboardingState(false)
            }
            setIsLoggedIn(true)
          } catch (error) {
            console.error("Error fetching user data:", error)
            const fallbackUserData = {
              uid: user.uid,
              email: user.email,
              name: user.email.split("@")[0],
            }
            setCurrentUser(fallbackUserData)
            setIsLoggedIn(true)

            // Check local app onboarding status as fallback
            const localAppOnboardingStatus = await checkLocalAppOnboardingStatus()
            setHasCompletedAppOnboardingState(localAppOnboardingStatus)
          }
        } else {
          // User logged out - DON'T reset onboarding status
          setCurrentUser(null)
          setUserData(null)
          setIsLoggedIn(false)
          // Keep hasSeenOnboarding and hasCompletedAppOnboarding as they are
          // DON'T reset these values on logout
        }

        setIsLoading(false)
      })

      return unsubscribe
    }

    initializeApp()
  }, [])

  // Initialize onboarding status from AsyncStorage
  const initializeOnboardingStatus = async () => {
    try {
      const seenOnboarding = await AsyncStorage.getItem(ONBOARDING_SEEN_KEY)
      const completedAppOnboarding = await AsyncStorage.getItem(APP_ONBOARDING_KEY)

      setHasSeenOnboardingState(seenOnboarding === "true")
      setHasCompletedAppOnboardingState(completedAppOnboarding === "true")

      console.log("Onboarding status initialized:", {
        hasSeenOnboarding: seenOnboarding === "true",
        hasCompletedAppOnboarding: completedAppOnboarding === "true",
      })
    } catch (error) {
      console.error("Error initializing onboarding status:", error)
      setHasSeenOnboardingState(false)
      setHasCompletedAppOnboardingState(false)
    }
  }

  // Check app onboarding status from AsyncStorage
  const checkLocalAppOnboardingStatus = async () => {
    try {
      const appOnboardingStatus = await AsyncStorage.getItem(APP_ONBOARDING_KEY)
      return appOnboardingStatus === "true"
    } catch (error) {
      console.error("Error checking local app onboarding status:", error)
      return false
    }
  }

  const signIn = useCallback(async () => {
    // This will be handled by onAuthStateChanged
    // No need to manually set state here
  }, [])

  const signOut = useCallback(async () => {
    try {
      await auth.signOut()
      console.log("User signed out - onboarding status preserved")
      // onAuthStateChanged will handle other state updates
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }, [])

  const updateUserData = useCallback((newData) => {
    setUserData((prev) => ({ ...prev, ...newData }))
    setCurrentUser((prev) => ({ ...prev, ...newData }))
  }, [])

  // Mark that user has seen the onboarding tutorial
  const setHasSeenOnboarding = useCallback(async (seen) => {
    try {
      setHasSeenOnboardingState(seen)
      await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, seen.toString())
      console.log("Onboarding seen status updated:", seen)
    } catch (error) {
      console.error("Error saving onboarding seen state:", error)
    }
  }, [])

  // Set app onboarding completion status
  const setHasCompletedAppOnboarding = useCallback(
    async (completed) => {
      try {
        setHasCompletedAppOnboardingState(completed)

        // Save to AsyncStorage
        await AsyncStorage.setItem(APP_ONBOARDING_KEY, completed.toString())
        console.log("App onboarding completion status updated:", completed)

        // Save to Firestore if user is logged in
        if (currentUser?.uid) {
          try {
            const userDocRef = doc(db, "users", currentUser.uid)
            await updateDoc(userDocRef, {
              hasCompletedAppOnboarding: completed,
              appOnboardingCompletedAt: completed ? new Date() : null,
            })
          } catch (firestoreError) {
            console.log("Could not update Firestore, but local storage updated:", firestoreError)
          }
        }
      } catch (error) {
        console.error("Error saving app onboarding state:", error)
      }
    },
    [currentUser],
  )

  const resetOnboarding = useCallback(async () => {
    try {
      console.log("RESETTING ONBOARDING - This should only be used for testing!")
      setHasSeenOnboardingState(false)
      setHasCompletedAppOnboardingState(false)

      await AsyncStorage.multiRemove([ONBOARDING_SEEN_KEY, APP_ONBOARDING_KEY])

      // Update Firestore if possible
      if (currentUser?.uid) {
        try {
          const userDocRef = doc(db, "users", currentUser.uid)
          await updateDoc(userDocRef, {
            hasCompletedAppOnboarding: false,
            appOnboardingCompletedAt: null,
          })
        } catch (firestoreError) {
          console.log("Could not update Firestore, but local storage updated:", firestoreError)
        }
      }
    } catch (error) {
      console.error("Error resetting onboarding:", error)
    }
  }, [currentUser])

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      isLoggedIn,
      isLoading,
      currentUser, // Provide complete user data
      userData, // Provide Firestore user data
      hasSeenOnboarding,
      hasCompletedAppOnboarding,
      signIn,
      signOut,
      updateUserData, // Method to update user data
      setHasSeenOnboarding,
      setHasCompletedAppOnboarding,
      resetOnboarding, // Only use this for testing/admin purposes
    }),
    [
      isLoggedIn,
      isLoading,
      currentUser,
      userData,
      hasSeenOnboarding,
      hasCompletedAppOnboarding,
      signIn,
      signOut,
      updateUserData,
      setHasSeenOnboarding,
      setHasCompletedAppOnboarding,
      resetOnboarding,
    ],
  )

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
