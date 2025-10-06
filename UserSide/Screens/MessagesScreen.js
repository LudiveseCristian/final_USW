import React, { useState, useRef, useEffect, useCallback} from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Modal,
    Alert,
    Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useFocusEffect  } from '@react-navigation/native';
import { SafeAreaView } from "react-native-safe-area-context";
import LoadingScreen from "../hooks/LoadingScreen";
import { 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    doc, 
    setDoc, 
    updateDoc, 
    serverTimestamp,
    getDoc,
    where,
    limit,
    getDocs,
    increment,
} from 'firebase/firestore';
import { db, storage } from '../firebase/firebase';
import { useAuth } from '../AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useMessageCount } from "../hooks/useMessageCounts"

const { width, height } = Dimensions.get('window');

const MessagesScreen = ({ route }) => {
    const navigation = useNavigation();
    const { previousScreen } = route?.params || {};
    const { currentUser } = useAuth();
    
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [isAdminTyping, setIsAdminTyping] = useState(false);
    const [conversationId, setConversationId] = useState(null);
    const flatListRef = useRef(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const { resetMessageCount } = useMessageCount(); 

    useFocusEffect(
  useCallback(() => {
    resetMessageCount && resetMessageCount()
  }, [resetMessageCount])
)

    const showImageOptions = () => {
     Alert.alert(
    "Add Image",
    "Choose an option",
    [
      { text: "Camera", onPress: pickImageFromCamera },
      { text: "Gallery", onPress: pickImageFromLibrary },
      { text: "Cancel", style: "cancel" },
    ]
  );
};


const sendWinNotification = async (wonItem) => {
  try {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    
    // Send automated win message
    await addDoc(messagesRef, {
      senderId: 'admin',
      senderType: 'admin',
      text: `🎉 Congratulations! You've won "${wonItem.title}" with a bid of ₱${wonItem.winningBid.toLocaleString()}! Your item is ready for checkout.`,
      type: 'win_notification',
      productId: wonItem.productId,
      imageUrl: wonItem.imageUrl,
      timestamp: serverTimestamp(),
      status: 'delivered'
    });

    // Update conversation
    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      lastMessage: `🎉 You won: ${wonItem.title}`,
      lastMessageTime: serverTimestamp(),
      [`unreadCount.${currentUser.uid}`]: increment(1)
    });

    // Mark as notification sent in product document
    const productRef = doc(db, 'products', wonItem.productId);
    await updateDoc(productRef, {
      [`winNotificationSent.${currentUser.uid}`]: true
    });

  } catch (error) {
    console.error('Error sending win notification:', error);
  }
};

const pickImageFromCamera = async () => {
  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "images",
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadAndSendImage(result.assets[0].uri);
    }
  } catch (error) {
    console.error("Camera error:", error);
  }
};

const pickImageFromLibrary = async () => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadAndSendImage(result.assets[0].uri);
    }
  } catch (error) {
    console.error("Library error:", error);
  }
};

const uploadAndSendImage = async (imageUri) => {
  if (!conversationId) return;

  try {
    setUploadingImage(true);

    // Upload to Firebase Storage
    const filename = `chat-images/${conversationId}/${Date.now()}.jpg`;
    const imageRef = ref(storage, filename);
    
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    await uploadBytes(imageRef, blob);
    const downloadURL = await getDownloadURL(imageRef);

    // Send message with image
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    await addDoc(messagesRef, {
      senderId: currentUser.uid,
      senderType: 'user',
      imageUrl: downloadURL,
      type: 'image',
      timestamp: serverTimestamp(),
      status: 'delivered'
    });

    // Update conversation metadata
    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      lastMessage: '📷 Photo',
      lastMessageTime: serverTimestamp(),
      'unreadCount.admin': (await getDoc(conversationRef)).data()?.unreadCount?.admin + 1 || 1,
    });

  } catch (error) {
    console.error('Upload error:', error);
    Alert.alert('Error', 'Failed to send image');
  } finally {
    setUploadingImage(false);
  }
};

    useEffect(() => {
        if (!currentUser?.uid) return;
        
        initializeConversation();
    }, [currentUser?.uid]);

    useEffect(() => {
        if (!conversationId) return;

        // Listen to messages in real-time
        const messagesRef = collection(db, 'conversations', conversationId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate() || new Date(),
            }));
            setMessages(newMessages);
            
            // Scroll to bottom when new messages arrive
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        });

        // Listen to admin typing status
        const conversationRef = doc(db, 'conversations', conversationId);
        const unsubscribeTyping = onSnapshot(conversationRef, (doc) => {
            const data = doc.data();
            setIsAdminTyping(data?.adminTyping || false);
        });

        return () => {
            unsubscribe();
            unsubscribeTyping();
        };
    }, [conversationId]);

    useEffect(() => {
  if (!currentUser?.uid || !conversationId) return;

  const unsubscribe = onSnapshot(collection(db, "products"), async (snapshot) => {
    const wonItems = [];
    
    snapshot.docs.forEach((d) => {
      const data = d.data();
      const userBid = data.bids?.find((bid) => bid.bidderId === currentUser.uid);

      // Check if user won (same logic as WinBiddingScreen)
      if (
        (userBid && data.status === "sold" && data.highestBidder === userBid.bidderName) ||
        data.winnerBidderId === currentUser.uid
      ) {
        // Check if we haven't sent a notification for this item yet
        if (!data.winNotificationSent?.[currentUser.uid]) {
          wonItems.push({
            productId: d.id,
            title: data.name,
            winningBid: userBid.amount,
            imageUrl: data.imageUrls?.[0]
          });
        }
      }
    });

    // Send win notification messages
    for (const item of wonItems) {
      await sendWinNotification(item);
    }
  });

  return () => unsubscribe();
}, [currentUser?.uid, conversationId]);

    const initializeConversation = async () => {
        try {
            setLoading(true);
            
            // Check if conversation already exists
            const conversationsRef = collection(db, 'conversations');
            const q = query(
                conversationsRef, 
                where('participants', 'array-contains', currentUser.uid),
                limit(1)
            );
            
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
                // Use existing conversation
                setConversationId(snapshot.docs[0].id);
            } else {
                // Create new conversation
                const newConvRef = doc(collection(db, 'conversations'));
                await setDoc(newConvRef, {
                    participants: [currentUser.uid, 'admin'],
                    userProfile: {
                        name: currentUser.name || currentUser.firstName || 'User',
                        email: currentUser.email || '',
                        uid: currentUser.uid,
                    },
                    status: 'active',
                    createdAt: serverTimestamp(),
                    lastMessage: '',
                    lastMessageTime: serverTimestamp(),
                    unreadCount: {
                        [currentUser.uid]: 0,
                        admin: 0
                    }
                });
                
                setConversationId(newConvRef.id);
                
                // Send welcome message from admin
                await addDoc(collection(db, 'conversations', newConvRef.id, 'messages'), {
                    senderId: 'admin',
                    senderType: 'admin',
                    text: `Hi ${currentUser.firstName || currentUser.name || 'there'}! 👋 Welcome to Upcycled Support. I'm here to help you with any questions about your orders, bids, or account. How can I assist you today?`,
                    timestamp: serverTimestamp(),
                    status: 'delivered'
                });
            }
        } catch (error) {
            console.error('Error initializing conversation:', error);
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async () => {
        if (!inputText.trim() || !conversationId) return;

        const messageText = inputText.trim();
        setInputText('');

        try {
            setLoading(true);

            // Add message to Firestore
            const messagesRef = collection(db, 'conversations', conversationId, 'messages');
            await addDoc(messagesRef, {
                senderId: currentUser.uid,
                senderType: 'user',
                text: messageText,
                timestamp: serverTimestamp(),
                status: 'delivered'
            });

            // Update conversation metadata
            const conversationRef = doc(db, 'conversations', conversationId);
            await updateDoc(conversationRef, {
                lastMessage: messageText,
                lastMessageTime: serverTimestamp(),
                'unreadCount.admin': (await getDoc(conversationRef)).data()?.unreadCount?.admin + 1 || 1,
                userTyping: false
            });

        } catch (error) {
            console.error('Send message error:', error);
        } finally {
            setLoading(false);
        }
    };

    const quickActions = [
        { text: "Track my order", icon: "local-shipping" },
        { text: "Check bid status", icon: "gavel" },
        { text: "Payment issue", icon: "payment" },
        { text: "Return request", icon: "replay" },
    ];

    const handleGoBack = () => {
        const targetScreen = previousScreen || 'Home';
        navigation.replace(targetScreen);
    };

const renderMessage = ({ item }) => {
    const isWinNotification = item.type === 'win_notification';
    const isUserImage = item.type === 'image' && item.senderType === 'user';
    const isAdminImage = item.type === 'image' && item.senderType === 'admin'; // ADD THIS
    
    return (
        <View style={[
            styles.messageContainer,
            item.senderType === 'user' ? styles.userMessage : styles.adminMessage,
            isWinNotification && styles.winNotificationContainer
        ]}>
            {item.senderType === 'admin' && (
                <View style={styles.adminAvatar}>
                    <Icon name={isWinNotification ? "emoji-events" : "support-agent"} size={16} color="white" />
                </View>
            )}
            <View style={[
                styles.messageBubble,
                item.senderType === 'user' ? styles.userBubble : styles.adminBubble,
                isWinNotification && styles.winNotificationBubble
            ]}>
                {/* Win notification image */}
                {item.imageUrl && isWinNotification && (
                    <Image 
                        source={{ uri: item.imageUrl }} 
                        style={styles.winNotificationImage}
                        resizeMode="cover"
                    />
                )}
                
                {/* User uploaded image */}
                {item.imageUrl && isUserImage && (
                    <Image 
                        source={{ uri: item.imageUrl }} 
                        style={styles.messageImage}
                        resizeMode="cover"
                    />
                )}
                
                {/* Admin uploaded image - ADD THIS BLOCK */}
                {item.imageUrl && isAdminImage && (
                    <Image 
                        source={{ uri: item.imageUrl }} 
                        style={styles.messageImage}
                        resizeMode="cover"
                    />
                )}
                
                {/* Only show text if there is text */}
                {item.text && (
                    <Text style={[
                        styles.messageText,
                        item.senderType === 'user' ? styles.userMessageText : styles.adminMessageText,
                        isWinNotification && styles.winNotificationText
                    ]}>
                        {item.text}
                    </Text>
                )}
                
                <View style={styles.messageFooter}>
                    <Text style={[
                        styles.timestamp,
                        item.senderType === 'user' ? styles.userTimestamp : styles.adminTimestamp
                    ]}>
                        {new Date(item.timestamp).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit' 
                        })}
                    </Text>
                    {item.senderType === 'user' && (
                        <View style={styles.statusIcon}>
                            {item.status === 'sending' && <Icon name="schedule" size={12} color="#999" />}
                            {item.status === 'delivered' && <Icon name="done-all" size={12} color="#4CAF50" />}
                            {item.status === 'read' && <Icon name="done-all" size={12} color="#2196F3" />}
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
};

    const renderQuickAction = ({ item }) => (
        <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => {
                setInputText(item.text);
                setTimeout(() => sendMessage(), 100);
            }}
        >
            <View style={styles.quickActionIcon}>
                <Icon name={item.icon} size={18} color="#135918" />
            </View>
            <Text style={styles.quickActionText}>{item.text}</Text>
        </TouchableOpacity>
    );
    
    if (loading && !conversationId) {
        return <LoadingScreen message="Loading conversation..." />;
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={styles.keyboardAvoid}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={handleGoBack}
                        style={styles.backButton}
                    >
                        <Icon name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <View style={styles.adminAvatarHeader}>
                            <Icon name="support-agent" size={20} color="white" />
                            <View style={styles.onlineIndicator} />
                        </View>
                        <View>
                            <Text style={styles.headerTitle}>Upcycled Support</Text>
                            <Text style={styles.headerSubtitle}>
                                {isAdminTyping ? 'Typing...' : 'Online • Usually replies in minutes'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.headerRight} />
                </View>

                {/* Info Banner */}
                <View style={styles.infoBanner}>
                    <Icon name="info-outline" size={16} color="#135918" />
                    <Text style={styles.infoBannerText}>
                        We typically respond within 5 minutes
                    </Text>
                </View>

                {/* Messages List */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(item) => item.id}
                    style={styles.messagesList}
                    contentContainerStyle={styles.messagesContent}
                    onContentSizeChange={() => 
                        flatListRef.current?.scrollToEnd({ animated: true })
                    }
                    ListFooterComponent={() => (
                        <View>
                            {isAdminTyping && (
                                <View style={styles.typingContainer}>
                                    <View style={styles.adminAvatar}>
                                        <Icon name="support-agent" size={16} color="white" />
                                    </View>
                                    <View style={styles.typingBubble}>
                                        <View style={styles.typingDots}>
                                            <View style={styles.dot} />
                                            <View style={styles.dot} />
                                            <View style={styles.dot} />
                                        </View>
                                    </View>
                                </View>
                            )}
                            {messages.length === 0 && (
                                <View style={styles.quickActionsContainer}>
                                    <Text style={styles.quickActionsTitle}>
                                        How can we help you?
                                    </Text>
                                    <FlatList
                                        data={quickActions}
                                        renderItem={renderQuickAction}
                                        keyExtractor={(item, index) => index.toString()}
                                        numColumns={2}
                                        columnWrapperStyle={styles.quickActionsRow}
                                    />
                                </View>
                            )}
                        </View>
                    )}
                />

                {/* Input Container */}
                <View style={styles.inputContainer}>
                        <TouchableOpacity 
                        style={styles.attachButton}
                        onPress={showImageOptions}
                        disabled={uploadingImage}
                        >
                        {uploadingImage ? (
                            <ActivityIndicator size="small" color="#135918" />
                        ) : (
                            <Icon name="attach-file" size={22} color="#666" />
                        )}
                        </TouchableOpacity>
                    <TextInput
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Type your message..."
                        placeholderTextColor="#999"
                        style={styles.textInput}
                        multiline
                        maxLength={500}
                    />
                    <TouchableOpacity
                        onPress={sendMessage}
                        disabled={loading || !inputText.trim()}
                        style={[
                            styles.sendButton,
                            (!inputText.trim() || loading) && styles.sendButtonDisabled
                        ]}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Icon name="send" size={20} color="white" />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFEF7',
    },
    keyboardAvoid: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#135918',
        paddingTop: Platform.OS === 'ios' ? 10 : 15,
        paddingBottom: 15,
        paddingHorizontal: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 4,
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    headerCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    headerRight: {
        width: 40,
    },
    adminAvatarHeader: {
        width: 40,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        position: 'relative',
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        backgroundColor: '#4CAF50',
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#135918',
    },
    headerTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 11,
        marginTop: 2,
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f9f0',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e0f2e0',
    },
    infoBannerText: {
        fontSize: 12,
        color: '#135918',
        marginLeft: 8,
        fontWeight: '500',
    },
    messagesList: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    messagesContent: {
        paddingHorizontal: 15,
        paddingVertical: 15,
        paddingBottom: 20,
    },
    messageContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        maxWidth: '85%',
    },
    userMessage: {
        alignSelf: 'flex-end',
        flexDirection: 'row-reverse',
    },
    adminMessage: {
        alignSelf: 'flex-start',
    },
    adminAvatar: {
        width: 32,
        height: 32,
        backgroundColor: '#135918',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    messageBubble: {
        flex: 1,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 18,
    },
    userBubble: {
        backgroundColor: '#135918',
        borderBottomRightRadius: 4,
        shadowColor: '#135918',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    adminBubble: {
        backgroundColor: 'white',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    messageText: {
        fontSize: 14,
        lineHeight: 20,
    },
    userMessageText: {
        color: 'white',
    },
    adminMessageText: {
        color: '#333',
    },
    messageFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 4,
    },
    timestamp: {
        fontSize: 10,
    },
    userTimestamp: {
        color: 'rgba(255,255,255,0.7)',
    },
    adminTimestamp: {
        color: '#999',
    },
    statusIcon: {
        marginLeft: 4,
    },
    typingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        maxWidth: '85%',
    },
    typingBubble: {
        backgroundColor: 'white',
        borderRadius: 18,
        borderBottomLeftRadius: 4,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    typingDots: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dot: {
        width: 8,
        height: 8,
        backgroundColor: '#135918',
        borderRadius: 4,
        opacity: 0.6,
    },
    quickActionsContainer: {
        marginTop: 10,
        marginBottom: 10,
    },
    quickActionsTitle: {
        fontSize: 13,
        color: '#666',
        fontWeight: '600',
        marginBottom: 12,
        marginLeft: 5,
    },
    quickActionsRow: {
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    quickActionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 12,
        marginHorizontal: 5,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    quickActionIcon: {
        width: 32,
        height: 32,
        backgroundColor: '#f0f9f0',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    quickActionText: {
        flex: 1,
        fontSize: 12,
        color: '#333',
        fontWeight: '500',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 5,
    },
    attachButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    textInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#d0d0d0',
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingVertical: 10,
        paddingTop: 10,
        marginRight: 8,
        maxHeight: 100,
        fontSize: 14,
        backgroundColor: '#f8f9fa',
        color: '#333',
    },
    sendButton: {
        width: 44,
        height: 44,
        backgroundColor: '#135918',
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#135918',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
    },
    sendButtonDisabled: {
        opacity: 0.5,
        backgroundColor: '#999',
    },
    messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
    },

    winNotificationContainer: {
    backgroundColor: '#f0f9f0',
    borderRadius: 12,
    padding: 8,
    marginVertical: 8,
},
    winNotificationBubble: {
        borderColor: '#4CAF50',
        borderWidth: 2,
        backgroundColor: '#ffffff',
    },
    winNotificationImage: {
        width: '100%',
        height: 150,
        borderRadius: 8,
        marginBottom: 10,
    },
    winNotificationText: {
        fontWeight: '600',
    },

});

export default MessagesScreen;