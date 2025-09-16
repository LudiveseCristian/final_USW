// Removed "use client"
import "react-native-gesture-handler" // Must be at the top
import React from "react"
import { NavigationContainer } from "@react-navigation/native"
import { createStackNavigator } from "@react-navigation/stack"

import { AuthProvider, useAuth } from "./AuthContext"
import { View, ActivityIndicator, StyleSheet, Text, Animated, StatusBar } from "react-native"
import { enableScreens } from "react-native-screens"

// Enable react-native-screens for better performance
enableScreens()

// Disable all navigation animations globally
const disableAnimations = {
  animationEnabled: false,
  gestureEnabled: false,
  transitionSpec: {
    open: { animation: "timing", config: { duration: 1000 } },
    close: { animation: "timing", config: { duration: 1000 } },
  },
  cardStyleInterpolator: () => ({}),
}

// Import your screen components
import SignInScreen from "./Screens/SignInScreen"
import SignUpScreen from "./Screens/SignUpScreen"
import WelcomeScreen from "./Screens/WelcomeScreen"
import HomeScreen from "./Screens/HomeScreen"
import NewsScreen from "./Screens/NewsScreen"
import BiddingScreen from "./Screens/BiddingScreen"
import ProfileScreen from "./Screens/ProfileScreen"
import WinningBiddingScreen from "./Screens/WinbiddingScreen"
import UpcycledUserAssistant from "./Screens/UpcycledUserAssistant"
import NotificationScreen from "./Screens/NotificationScreen"
import OrderTrackingScreen from "./Screens/OrderTrackingScreen"


// Import your NavBarLayout
import NavBarLayout from "./Layout/NavbarLayout"

// Import Onboarding Screens
import OnboardingScreen from "./Screens/OnboardingScreen"

const Stack = createStackNavigator()

// Enhanced Loading Component
const LoadingScreen = ({ message = "Loading..." }) => {
  const [fadeAnim] = React.useState(new Animated.Value(0))

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: true,
    }).start()
  }, [fadeAnim])

  return (
    <View style={styles.loadingContainer}>
      <Animated.View style={[styles.loadingContent, { opacity: fadeAnim }]}>
        <ActivityIndicator size="large" color="#2E6A2E" />
        <Text style={styles.loadingText}>{message}</Text>
      </Animated.View>
    </View>
  )
}

// --- Onboarding Stack (First Time Users) ---
function OnboardingStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        ...disableAnimations,
        cardStyle: { backgroundColor: "transparent" },
      }}
      initialRouteName="Onboarding"
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      {/* Add authentication screens after onboarding */}
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  )
}

// --- Authentication Stack (Returning Users) ---
function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        ...disableAnimations,
        cardStyle: { backgroundColor: "transparent" },
      }}
      initialRouteName="SignIn"
    >
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  )
}

// --- Main App Stack (Authenticated Users) ---
function MainAppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        ...disableAnimations,
        cardStyle: { backgroundColor: "transparent" },
      }}
      initialRouteName="Welcome"
    >
      {/* Welcome screen is the first screen after login */}
      <Stack.Screen name="Welcome" component={WelcomeScreen} />

      {/* Screens that use the NavBarLayout */}
      <Stack.Screen name="Home">
        {(props) => (
          <NavBarLayout>
            <HomeScreen {...props} />
          </NavBarLayout>
        )}
      </Stack.Screen>

      <Stack.Screen name="News">
        {(props) => (
          <NavBarLayout>
            <NewsScreen {...props} />
          </NavBarLayout>
        )}
      </Stack.Screen>

      <Stack.Screen name="Bidding">
        {(props) => (
          <NavBarLayout>
            <BiddingScreen {...props} />
          </NavBarLayout>
        )}
      </Stack.Screen>

      <Stack.Screen name="Cart">
        {(props) => (
          <NavBarLayout>
            <WinningBiddingScreen {...props} />
          </NavBarLayout>
        )}
      </Stack.Screen>


      <Stack.Screen name="Profile">
        {(props) => (
          <NavBarLayout>
            <ProfileScreen {...props} />
          </NavBarLayout>
        )}
      </Stack.Screen>

      <Stack.Screen name="Notifications">
        {(props) => (
          <NavBarLayout>
            <NotificationScreen {...props} />
          </NavBarLayout>
        )}
      </Stack.Screen>

      <Stack.Screen name="OrderTracking">
        {(props) => (
          <NavBarLayout>
            <OrderTrackingScreen {...props} />
          </NavBarLayout>
        )}
      </Stack.Screen>


      {/* Account Screen */}
      <Stack.Screen name="Account">
        {(props) => (
          <NavBarLayout>
            <View style={styles.accountScreen}>
              <Text style={styles.accountText}>My Account Details</Text>
            </View>
          </NavBarLayout>
        )}
      </Stack.Screen>
    </Stack.Navigator>
  )
}

// Global App Wrapper with Assistant - this wraps the entire navigation
const AppWithAssistant = ({ children, currentUser, showAssistant = true }) => {
  return (
    <View style={styles.appContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFEF7" />

      {/* Main App Content */}
      {children}

      {/* Global Floating Assistant - Hide during onboarding and auth */}
      {showAssistant && currentUser && <UpcycledUserAssistant currentUser={currentUser} />}
    </View>
  )
}

// --- Root Navigator ---
function RootNavigator() {
  const authContext = useAuth()

  // Destructure with fallbacks to prevent undefined errors
  const {
    isLoggedIn = false,
    isLoading = true,
    currentUser = null,
    hasSeenOnboarding = false,
    hasCompletedAppOnboarding = false,
  } = authContext || {}

  if (isLoading) {
    return <LoadingScreen message="Initializing app..." />
  }

  // Flow Logic:
  // 1. First time app users → Show onboarding tutorial → Show auth
  // 2. Returning users who've seen onboarding but not logged in → Show auth only
  // 3. Logged in users → Show main app

  return (
    <NavigationContainer
      theme={{
        colors: {
          background: "#F8F9FA",
        },
      }}
    >
      <AppWithAssistant currentUser={currentUser} showAssistant={isLoggedIn && hasCompletedAppOnboarding}>
        {(() => {
          // User is logged in → Main App
          if (isLoggedIn) {
            return <MainAppStack />
          }

          // User has seen onboarding but not logged in → Auth only
          if (hasSeenOnboarding) {
            return <AuthStack />
          }

          // First time user → Onboarding + Auth flow
          return <OnboardingStack />
        })()}
      </AppWithAssistant>
    </NavigationContainer>
  )
}

// --- Main App Component ---
export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  )
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFCF3",
  },
  loadingContent: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#2E6A2E",
    fontWeight: "600",
    textAlign: "center",
  },
  accountScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  accountText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2E6A2E",
  },
})
