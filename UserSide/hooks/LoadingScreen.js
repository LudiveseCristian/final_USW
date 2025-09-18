
import React from "react"
import { SafeAreaView, ActivityIndicator, Text, StyleSheet } from "react-native"

export default function LoadingScreen({ message = "Loading..." }) {
  return (
    <SafeAreaView style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#2E6A2E" />
      <Text style={styles.loadingText}>{message}</Text>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFCF3",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
})
