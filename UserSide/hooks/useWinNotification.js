import { createContext, useContext, useState, useEffect } from 'react';
import { Modal, View, Text, Image, StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useAuth } from '../AuthContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LottieView from 'lottie-react-native'; // Optional: for better confetti

const { width, height } = Dimensions.get('window');

const WinNotificationContext = createContext();

export const useWinNotification = () => useContext(WinNotificationContext);

export const WinNotificationProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [winData, setWinData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const scaleAnim = new Animated.Value(0);
  const [confettiPieces, setConfettiPieces] = useState([]);

  // Real-time listener for wins
  useEffect(() => {
    if (!currentUser?.uid) return;

    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('winnerBidderId', '==', currentUser.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const data = change.doc.data();
          
          // Check if just won (status changed to 'sold' AND has winnerBidderId)
          if (data.status === 'sold' && data.winnerBidderId === currentUser.uid) {
            const userBid = data.bids?.find(bid => bid.bidderId === currentUser.uid);
            
            // Show win notification
            setWinData({
              productId: change.doc.id,
              productName: data.name,
              winningBid: userBid?.amount || data.finalPrice,
              productImage: data.imageUrls?.[0],
              category: data.category,
            });
            setShowModal(true);
            startConfetti();
            animateModal();
          }
        }
      });
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  const animateModal = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  const startConfetti = () => {
    const pieces = [];
    for (let i = 0; i < 50; i++) {
      pieces.push({
        id: i,
        x: Math.random() * width,
        y: -20,
        rotation: Math.random() * 360,
        color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'][Math.floor(Math.random() * 5)],
        size: Math.random() * 10 + 5,
        speed: Math.random() * 3 + 2,
      });
    }
    setConfettiPieces(pieces);
  };

  const closeModal = () => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowModal(false);
      setWinData(null);
      setConfettiPieces([]);
      scaleAnim.setValue(0);
    });
  };

  return (
    <WinNotificationContext.Provider value={{ winData, showModal }}>
      {children}
      
      {/* Win Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="none"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          {/* Confetti Effect */}
          {confettiPieces.map((piece) => (
            <ConfettiPiece key={piece.id} piece={piece} />
          ))}

          {/* Win Card */}
          <Animated.View
            style={[
              styles.modalContent,
              { transform: [{ scale: scaleAnim }] }
            ]}
          >
            {/* Trophy Icon */}
            <View style={styles.trophyContainer}>
              <Icon name="emoji-events" size={80} color="#FFD700" />
            </View>

            {/* Congratulations Text */}
            <Text style={styles.congrats}>🎉 Congratulations! 🎉</Text>
            <Text style={styles.winTitle}>You Won the Bid!</Text>

            {/* Product Image */}
            {winData?.productImage && (
              <Image
                source={{ uri: winData.productImage }}
                style={styles.productImage}
                resizeMode="cover"
              />
            )}

            {/* Product Details */}
            <View style={styles.detailsContainer}>
              <Text style={styles.productName}>{winData?.productName}</Text>
              <Text style={styles.category}>{winData?.category}</Text>
              
              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>Winning Bid:</Text>
                <Text style={styles.priceAmount}>
                  ₱{winData?.winningBid?.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Message */}
            <Text style={styles.message}>
              Your item is ready for checkout! Check your messages for details.
            </Text>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={closeModal}
              activeOpacity={0.8}
            >
              <Text style={styles.closeButtonText}>Awesome! 🎊</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </WinNotificationContext.Provider>
  );
};

// Confetti Component
const ConfettiPiece = ({ piece }) => {
  const fallAnim = new Animated.Value(0);
  const rotateAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fallAnim, {
        toValue: height + 50,
        duration: 3000 / piece.speed,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ),
    ]).start();
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        {
          left: piece.x,
          backgroundColor: piece.color,
          width: piece.size,
          height: piece.size,
          transform: [
            { translateY: fallAnim },
            { rotate },
          ],
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 30,
    padding: 30,
    width: width * 0.9,
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  trophyContainer: {
    marginBottom: 20,
    transform: [{ scale: 1.2 }],
  },
  congrats: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E6A2E',
    textAlign: 'center',
    marginBottom: 5,
  },
  winTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#135918',
    textAlign: 'center',
    marginBottom: 20,
  },
  productImage: {
    width: 200,
    height: 200,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  detailsContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  category: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  priceContainer: {
    backgroundColor: '#F0F9F0',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priceLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  priceAmount: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2E6A2E',
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
  },
  closeButton: {
    backgroundColor: '#2E6A2E',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    width: '100%',
    shadowColor: '#2E6A2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  confettiPiece: {
    position: 'absolute',
    borderRadius: 2,
  },
});