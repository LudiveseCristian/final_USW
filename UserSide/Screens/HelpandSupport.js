import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Linking,
  StyleSheet,
  Platform,
  Image
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from "react-native-safe-area-context"

export default function HelpSupportScreen({ navigation }) {
  const [expandedFAQ, setExpandedFAQ] = useState(null);

  // UPDATE THESE WITH YOUR ACTUAL INFORMATION
  const contactInfo = {
    email: 'streetwearupcycled@gmail.com',
    phone: '+63 995 124 9025',
    address: 'Mactan Lapu-Lapu City, Cebu City, Philippines',
    location: {
      latitude: 10.310972, // Replace with your actual latitude
      longitude: 124.013500, // Replace with your actual longitude
      name: 'Upcycled Streetwear Clothing'
    }
  };

  const faqs = [
    {
      id: 1,
      question: 'What is Upcycled Streetwear?',
      answer: 'Upcycled Streetwear transforms pre-loved clothing into unique, sustainable fashion pieces. We give old garments new life through creative redesign, reducing waste while creating one-of-a-kind streetwear.'
    },
    {
      id: 2,
      question: 'How does shipping work?',
      answer: 'We offer free shipping on orders over ₱500. Standard shipping takes 5-7 business days. Express shipping (2-3 days) is available for an additional fee.'
    },
    {
      id: 3,
      question: 'What is your return policy?',
      answer: 'We accept returns within 30 days of purchase. Items must be unworn with original tags attached. Contact our support team to initiate a return.'
    },
    {
      id: 4,
      question: 'Are your products sustainable?',
      answer: 'Absolutely! Every piece is upcycled from existing materials, significantly reducing environmental impact compared to new clothing production. We\'re committed to sustainable fashion.'
    }
  ];

  const handleEmail = () => {
    Linking.openURL(`mailto:${contactInfo.email}`);
  };

  const handleCall = () => {
    Linking.openURL(`tel:${contactInfo.phone}`);
  };

  const handleOpenMap = () => {
    const { latitude, longitude, name } = contactInfo.location;
    const label = encodeURIComponent(name);
    
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}(${label})`
    });
    
    Linking.openURL(url).catch(() => {
      // Fallback to Google Maps web if native app not available
      const webUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      Linking.openURL(webUrl);
    });
  };

  const toggleFAQ = (id) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const handleInstagram = () => {
  const instagramUrl = "https://www.instagram.com/upcycled_streetwear?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==";
  Linking.openURL(instagramUrl);
};


  return (
     <SafeAreaView style={styles.safeArea}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.iconContainer}>
            <Feather name="help-circle" size={40} color="#ffffff" />
          </View>
          <Text style={styles.headerTitle}>Help & Support</Text>
          <Text style={styles.headerSubtitle}>We're here to help you!</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* About Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="info" size={20} color="#1A5B1A" />
            <Text style={styles.sectionTitle}>About Us</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.aboutText}>
              Upcycled Streetwear is your destination for sustainable, one-of-a-kind fashion. 
              We believe in giving clothes a second life through creative upcycling, transforming 
              ordinary pieces into extraordinary streetwear.
            </Text>
            <Text style={styles.aboutText}>
              Our mission is to reduce fashion waste while providing you with unique, 
              high-quality clothing that stands out. Every purchase supports sustainable 
              fashion and helps reduce environmental impact.
            </Text>
          </View>
        </View>

        {/* Contact Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="message-circle" size={20} color="#1A5B1A" />
            <Text style={styles.sectionTitle}>Contact Us</Text>
          </View>

          <TouchableOpacity style={styles.contactCard} onPress={handleEmail}>
            <View style={styles.contactIconContainer}>
              <Feather name="mail" size={22} color="#1A5B1A" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>{contactInfo.email}</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#d1d5db" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactCard} onPress={handleInstagram}>
            <View style={styles.contactIconContainer}>
                <Feather name="instagram" size={22} color="#1A5B1A" />
            </View>
            <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Instagram</Text>
                <Text style={styles.contactValue}>@upcycled_streetwear</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#d1d5db" />
            </TouchableOpacity>

          <TouchableOpacity style={styles.contactCard} onPress={handleCall}>
            <View style={styles.contactIconContainer}>
              <Feather name="phone" size={22} color="#1A5B1A" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Phone</Text>
              <Text style={styles.contactValue}>{contactInfo.phone}</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#d1d5db" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactCard} onPress={handleOpenMap}>
            <View style={styles.contactIconContainer}>
              <Feather name="map-pin" size={22} color="#1A5B1A" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Location</Text>
              <Text style={styles.contactValue}>{contactInfo.address}</Text>
              <Text style={styles.mapLink}>Tap to open in Maps</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#d1d5db" />
          </TouchableOpacity>
        </View>

        {/* Map Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcon name="map-marker-radius" size={20} color="#1A5B1A" />
            <Text style={styles.sectionTitle}>Our Location</Text>
          </View>
          
      <TouchableOpacity 
          style={styles.mapContainer} 
          onPress={handleOpenMap}
          activeOpacity={0.95}
        >
          <MapView
            style={styles.mapImage}
            initialRegion={{
              latitude: contactInfo.location.latitude,
              longitude: contactInfo.location.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
            pointerEvents="none"
          >
            <Marker
              coordinate={{
                latitude: contactInfo.location.latitude,
                longitude: contactInfo.location.longitude,
              }}
              title={contactInfo.location.name}
            >
              <MaterialCommunityIcon name="map-marker" size={40} color="#1A5B1A" />
            </Marker>
          </MapView>

          {/* Keep your existing overlay and badge */}
          <View style={styles.mapOverlay}>
            <View style={styles.mapOverlayContent}>
              <MaterialCommunityIcon name="google-maps" size={24} color="#1A5B1A" />
              <View style={styles.mapOverlayText}>
                <Text style={styles.mapOverlayTitle}>View in Maps</Text>
                <Text style={styles.mapOverlaySubtitle}>Tap to get directions</Text>
              </View>
            </View>
          </View>

          <View style={styles.locationBadge}>
            <Feather name="map-pin" size={16} color="#1A5B1A" />
            <Text style={styles.locationBadgeText}>{contactInfo.location.name}</Text>
          </View>
        </TouchableOpacity>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcon name="frequently-asked-questions" size={20} color="#1A5B1A" />
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          </View>
          {faqs.map((faq) => (
            <TouchableOpacity
              key={faq.id}
              style={styles.faqCard}
              onPress={() => toggleFAQ(faq.id)}
              activeOpacity={0.7}
            >
              <View style={styles.faqHeader}>
                <View style={styles.faqQuestionContainer}>
                  <Feather 
                    name="help-circle" 
                    size={18} 
                    color="#1A5B1A" 
                    style={styles.faqQuestionIcon}
                  />
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                </View>
                <Feather 
                  name={expandedFAQ === faq.id ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#1A5B1A"
                />
              </View>
              {expandedFAQ === faq.id && (
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerIconContainer}>
            <MaterialCommunityIcon name="handshake" size={32} color="#1A5B1A" />
          </View>
          <Text style={styles.footerText}>
            Need more help? Don't hesitate to reach out!
          </Text>
          <Text style={styles.footerSubtext}>
            We typically respond within 24 hours
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    safeArea: {
    flex: 1,
    backgroundColor: '#FFFCF3',
  },
  header: {
    backgroundColor: '#1A5B1A',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 32,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    borderRadius: 50,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
  },
  scrollContent: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  aboutText: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 24,
    marginBottom: 12,
  },
  contactCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  contactIconContainer: {
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 12,
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  contactValue: {
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '500',
  },
  mapLink: {
    fontSize: 12,
    color: '#1A5B1A',
    marginTop: 4,
  },
  mapContainer: {
    marginTop: 12,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    height: 250,
    position: 'relative',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  mapOverlayContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapOverlayText: {
    marginLeft: 12,
    flex: 1,
  },
  mapOverlayTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 2,
  },
  mapOverlaySubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  locationBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  locationBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 6,
  },
  faqCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestionContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  faqQuestionIcon: {
    marginRight: 8,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
    marginLeft: 26,
    lineHeight: 22,
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  footerIconContainer: {
    marginBottom: 12,
  },
  footerText: {
    fontSize: 16,
    color: '#1f2937',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
  },
  footerSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});