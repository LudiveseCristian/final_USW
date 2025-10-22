import React from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

// 1. Create a reusable component for bullet points
const BulletPoint = ({ text }) => (
  <View style={styles.bulletItem}>
    <Text style={styles.bullet}>•</Text>
    <Text style={styles.bulletText}>{text}</Text>
  </View>
);

export default function TermsModal({ visible, onClose }) {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Terms and Conditions</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.lastUpdated}>Last updated: September 18, 2025</Text>
            
            <Text style={styles.paragraph}>
              Welcome to our mobile application. By accessing or using the app, you agree to be bound by these terms. Please read them carefully.
            </Text>

            {/* 2. Replace paragraph text with the BulletPoint component */}
            <Text style={styles.sectionTitle}>1. User Accounts and Eligibility</Text>
            <BulletPoint text="You must be at least 18 years old to create an account and use this service." />
            <BulletPoint text="You are responsible for maintaining the confidentiality of your account password and for all activities that occur under your account." />
            <BulletPoint text="You agree to notify us immediately of any unauthorized use of your account." />

            <Text style={styles.sectionTitle}>2. The Bidding Process</Text>
            <BulletPoint text="Placing a Bid: To bid on an item, you will enter your desired bid amount into the input field and press the 'Place Bid' button. Your bid must be higher than the current highest bid or the starting price of the item if there is no bid placed yet on the item." />
            <BulletPoint text="Updating Your Bid: If another user challenges your bid with a higher offer, you can update your own bid by entering a new, higher amount into the input field and pressing the 'Place Bid' button again. You cannot place a bid that is lower than the current highest bid." />
            <BulletPoint text="Winning Bid: The user with the highest bid at the end of the bidding duration will win the item." />

            <Text style={styles.sectionTitle}>3. Order and Cancellation Policy</Text>
            <BulletPoint text="Once a bid is successful, it is considered a final order." />
            <BulletPoint text="You have a one-hour grace period from the time of a successful bid to cancel your order." />
            <BulletPoint text='To cancel an order, you must send an email to the admin team at admin.upcycled@gmail.com with the subject line "Order Cancellation Request" and include your full name, username, and the specific item code.' />
            <BulletPoint text="Cancellation requests made after the one-hour window will not be accommodated." />

            <Text style={styles.sectionTitle}>4. No-Refund Policy</Text>
            <BulletPoint text="All sales are considered final. We do not offer refunds or exchanges for any items purchased through the application." />

            <Text style={styles.sectionTitle}>5. Payment and Delivery</Text>
            <BulletPoint text="Unless a mutual agreement is made with the owner, the customer is responsible for all shipping and delivery fees." />
            <BulletPoint text="Payment for all orders will be made via Cash on Delivery (COD) upon receipt of the item." />

            <Text style={styles.sectionTitle}>6. Dispute Resolution</Text>
            <BulletPoint text="Any disputes or issues regarding an order should be directed to the admin team via email. We will work to resolve all concerns in a timely and fair manner." />
            <BulletPoint text="We reserve the right to suspend or terminate accounts that engage in fraudulent activity, harassment, or a high number of unfulfilled orders." />

            <Text style={styles.sectionTitle}>7. Changes to Terms and Conditions</Text>
            <BulletPoint text="Upcycled Streetwear reserves the right to modify these Terms and Conditions at any time. We will notify users of significant changes by posting the updated terms on the app. Your continued use of the app after such changes constitutes your acceptance of the new terms." />
          </ScrollView>

          {/* Footer Button */}
          <TouchableOpacity style={styles.agreeButton} onPress={onClose}>
            <Text style={styles.agreeButtonText}>I Understand and Agree</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContainer: {
    height: height * 0.85,
    backgroundColor: '#FFFCF3',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 15,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2E6A2E',
  },
  closeButton: {
    padding: 5,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 15,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 15,
    color: '#4A4A4A',
    lineHeight: 22,
    marginBottom: 10, // Add some margin
  },
  // 3. Add these new styles for the bullet points
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingRight: 10, 
  },
  bullet: {
    marginRight: 8,
    fontSize: 15,
    color: '#4A4A4A',
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    color: '#4A4A4A',
    lineHeight: 22,
  },
  agreeButton: {
    backgroundColor: '#2E6A2E',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  agreeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});