"use client"

import { useState, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  SafeAreaView,
  ImageBackground,
} from "react-native"
import { useAuth } from "../AuthContext"
import { useNavigation } from "@react-navigation/native"

// Import background images
import background1 from "../assets/images/onBoarding/background1.png"
import background2 from "../assets/images/onBoarding/background2.png"
import background3 from "../assets/images/onBoarding/background3.png"
import background4 from "../assets/images/onBoarding/background4.png"
import background5 from "../assets/images/onBoarding/background5.png"

const { width, height } = Dimensions.get("window")

const onboardingData = [
  {
    id: 1,
    title: "Welcome to Upcycled",
    description:
      "Transform waste into wonderful creations and join our sustainable community where every item gets a second life.",
    backgroundImage: background1,
    features: ["Pre-loved fashion, fresh stories", "Shop smart, join a movement", "Your style choices that Matters"],
  },
  {
    id: 2,
    title: "Discover Amazing Products",
    description:
      "Discover hidden gems in our thrifted fashion marketplace pre-loved pieces with new stories waiting to be worn.",
    backgroundImage: background2,
    features: ["Thrifted, re-loved, and ready to shine", "Ethical shopping made simple", "Quality guaranteed products"],
  },
  {
    id: 3,
    title: "Join Exciting Auctions",
    description: "Participate in our bidding sessions and win exclusive upcycled treasures at amazing prices.",
    backgroundImage: background3,
    features: ["Bidding Experience", "Feels like Thrifting", "Amazing deals ahead"],
  },
  {
    id: 4,
    title: "Stay Connected",
    description: "Stay updated with the latest announcements, new items to bid on, and all things thrift.",
    backgroundImage: background5,
    features: ["Latest platform announcements", "New items to bid", "Important updates"],
  },
  {
    id: 5,
    title: "Your AI Shopping Assistant",
    description:
      "Meet your personal AI helper! Get recommendations, ask questions, and discover products tailored just for you.",
    backgroundImage: background4,
    features: ["Personalized thrift picks", "24/7 support", "Smart bidding & shopping insights"],
  },
]

const OnboardingScreen = () => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const { setHasSeenOnboarding } = useAuth()
  const navigation = useNavigation()
  const scrollX = useRef(new Animated.Value(0)).current
  const slidesRef = useRef(null)

  const viewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index)
    }
  }).current

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current

  const scrollTo = () => {
    if (currentIndex < onboardingData.length - 1) {
      slidesRef.current.scrollToIndex({ index: currentIndex + 1 })
    } else {
      completeOnboarding()
    }
  }

  const completeOnboarding = async () => {
    try {
      // This ensures the user will never see onboarding again on this device
      await setHasSeenOnboarding(true)
      console.log("Onboarding completed - user will not see this again even after logout")
      navigation.navigate("SignIn")
    } catch (error) {
      console.error("Error completing onboarding:", error)
      // Still navigate even if there's an error
      navigation.navigate("SignIn")
    }
  }

  const goToPrevious = () => {
    if (currentIndex > 0) {
      slidesRef.current.scrollToIndex({ index: currentIndex - 1 })
    }
  }

  const OnboardingItem = ({ item }) => (
    <View style={[styles.slide, { width }]}>
      <ImageBackground source={item.backgroundImage} style={styles.imageBackground} resizeMode="cover">
        {/* Dark overlay to make background more solid */}
        <View style={styles.overlay} />

        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            {/* Main Content */}
            <View style={styles.mainContent}>
              <Text style={styles.iconText}>{item.icon}</Text>

              <View style={styles.textContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>

                <View style={styles.featuresContainer}>
                  {item.features.map((feature, index) => (
                    <Text key={index} style={styles.featureText}>
                      {feature}
                    </Text>
                  ))}
                </View>
              </View>
            </View>

            {/* Navigation Controls */}
            <View style={styles.navigationContainer}>
              <View style={styles.pagination}>
                {onboardingData.map((_, index) => (
                  <View
                    key={index}
                    style={[styles.dot, index === currentIndex ? styles.activeDot : styles.inactiveDot]}
                  />
                ))}
              </View>

              <View style={styles.buttonsContainer}>
                {currentIndex > 0 && (
                  <TouchableOpacity style={styles.backButton} onPress={goToPrevious}>
                    <Text style={styles.backButtonText}>← Back</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.spacer} />

                <TouchableOpacity style={styles.nextButton} onPress={scrollTo}>
                  <Text style={styles.nextButtonText}>
                    {currentIndex === onboardingData.length - 1 ? "Continue to Sign In" : "Next →"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Skip button - allows users to skip onboarding but still marks it as seen */}
              {currentIndex < onboardingData.length - 1 && (
                <TouchableOpacity style={styles.skipButton} onPress={completeOnboarding}>
                  <Text style={styles.skipButtonText}>Skip</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  )

  return (
    <View style={styles.wrapper}>
      <Animated.FlatList
        ref={slidesRef}
        data={onboardingData}
        renderItem={({ item }) => <OnboardingItem item={item} />}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        keyExtractor={(item) => item.id.toString()}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        scrollEventThrottle={32}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#000",
  },
  slide: {
    flex: 1,
  },
  imageBackground: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "space-between",
  },
  mainContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    marginTop: -90,
  },
  iconText: {
    fontSize: 80,
    textAlign: "center",
    marginBottom: 30,
  },
  textContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 50,
    fontWeight: "900", // make it bolder
    fontFamily: "cursive", // monospace font
    color: "#2E6A2E",
    textAlign: "center",
    marginBottom: 15,
    lineHeight: 70,
  },
  description: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "sans-serif",
    color: "#000000ff",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 25,
    paddingHorizontal: 15,
  },
  featuresContainer: {
    alignItems: "flex-start",
  },
  featureText: {
    fontSize: 16,
    fontFamily: "sans-serif",
    fontWeight: "500",
    color: "#000000ff",
    textAlign: "center",
    marginBottom: 8,
  },
  navigationContainer: {
    paddingBottom: 40,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  dot: {
    height: 10,
    borderRadius: 5,
    marginHorizontal: 8,
  },
  activeDot: {
    width: 30,
    backgroundColor: "#2E6A2E",
  },
  inactiveDot: {
    width: 10,
    backgroundColor: "#C4C4C4",
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 7,
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  backButtonText: {
    color: "#2E6A2E",
    fontSize: 16,
    fontWeight: "600",
  },
  spacer: {
    flex: 1,
  },
  nextButton: {
    backgroundColor: "#2E6A2E",
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginBottom: 10,
    borderRadius: 10,
    minWidth: 120,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  skipButton: {
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 15,
  },
  skipButtonText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
})

export default OnboardingScreen
