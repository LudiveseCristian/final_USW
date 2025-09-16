"use client"

import React, { useCallback, useState } from "react"
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator } from "react-native"
import { useNavigation, useRoute } from "@react-navigation/native"
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons"
import { useCartCount } from "../hooks/useCartCounts"

const { width } = Dimensions.get("window")

// Memoized tab configuration
const tabs = [
  { name: "Home", icon: "home", route: "Home" },
  { name: "Drops", icon: "tag", route: "News" },
  { name: "Bidding", icon: "tshirt-crew", route: "Bidding" },
  { name: "Won", icon: "party-popper", route: "Cart" },
  { name: "Profile", icon: "account", route: "Profile" },
]

function NavBarLayout({ children }) {
  const navigation = useNavigation()
  const route = useRoute()
  const [isNavigating, setIsNavigating] = useState(false)

  const { cartCount, loading: cartLoading } = useCartCount()

  // Optimized navigation function
  const navigateTo = useCallback(
    (screenName) => {
      if (route.name === screenName || isNavigating) return

      setIsNavigating(true)

      try {
        navigation.replace(screenName)
      } catch (error) {
        console.warn("Navigation error:", error)
      } finally {
        setTimeout(() => setIsNavigating(false), 100)
      }
    },
    [navigation, route.name, isNavigating],
  )

  // Function to render notification badge
  const renderNotificationBadge = (count) => {
    if (count <= 0) return null

    return (
      <View style={styles.notificationBadge}>
        <Text style={styles.badgeText}>{count > 99 ? "99+" : count.toString()}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Main Content Area */}
      <View style={styles.content}>{children}</View>

      {/* Fixed Bottom Navigation */}
      <View style={styles.bottomNavContainer}>
        <View style={styles.bottomNav}>
          {tabs.map((tab) => {
            const isActive = route.name === tab.route
            const showBadge = tab.name === "Won" && cartCount > 0

            return (
              <TouchableOpacity
                key={tab.name}
                style={styles.tabButton}
                onPress={() => navigateTo(tab.route)}
                activeOpacity={0.7}
                disabled={isNavigating}
              >
                <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
                  <MaterialCommunityIcons name={tab.icon} size={22} color={isActive ? "#2E6A2E" : "#888"} />
                  {/* Notification Badge */}
                  {showBadge && renderNotificationBadge(cartCount)}
                </View>
                <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>{tab.name}</Text>
                {/* Indicator below the text */}
                {isActive && <View style={styles.activeTextBottomIndicator} />}
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Loading overlay */}
        {isNavigating && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#2E6A2E" />
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  content: {
    flex: 1,
    paddingBottom: 0,
  },
  bottomNavContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 15,
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tabButton: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    position: "relative",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
    backgroundColor: "transparent",
    position: "relative", // Added for badge positioning
  },
  activeIconContainer: {
    backgroundColor: "rgba(46, 106, 46, 0.1)",
  },
  tabLabel: {
    fontSize: 11,
    color: "#888",
    fontWeight: "500",
    textAlign: "center",
  },
  activeTabLabel: {
    color: "#2E6A2E",
    fontWeight: "700",
  },
  activeTextBottomIndicator: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 2,
    backgroundColor: "#2E6A2E",
    borderRadius: 2,
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#FF4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "white",
  },
  badgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
    paddingHorizontal: 2,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
})

export default React.memo(NavBarLayout)
