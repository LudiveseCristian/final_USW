import React, { useState, useRef, useEffect, useCallback } from 'react';
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
    Alert,
    Image,
    Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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
} from 'firebase/firestore';
import { db, storage } from '../firebase/firebase';
import { useAuth } from '../AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useMessageCount } from "../hooks/useMessageCounts";
import Constants from 'expo-constants';

const { width, height } = Dimensions.get('window');

const MessagesScreen = ({ route }) => {
    const navigation = useNavigation();
    const { previousScreen } = route?.params || {};
    const { currentUser } = useAuth();
    
    // Tab state
    const [activeTab, setActiveTab] = useState('support'); // 'support' or 'ai'
    
    // Support Chat States
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [isAdminTyping, setIsAdminTyping] = useState(false);
    const [conversationId, setConversationId] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const flatListRef = useRef(null);
    const { resetMessageCount } = useMessageCount();

    // AI Assistant States
    const [aiMessages, setAiMessages] = useState([]);
    const [aiInputText, setAiInputText] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [isBotTyping, setIsBotTyping] = useState(false);
    const aiFlatListRef = useRef(null);
    const [userStats, setUserStats] = useState({
        activeBids: 0,
        wonItems: 0,
        totalOrders: 0,
        totalSpent: 0,
        pendingPayments: 0,
        favoriteCategories: [],
        currentBids: [],
        recommendedItems: []
    });

    const GEMINI_API_KEY = Constants.expoConfig?.extra?.REACT_APP_GEMINI_API_KEY;
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;

    useFocusEffect(
        useCallback(() => {
            resetMessageCount && resetMessageCount();
        }, [resetMessageCount])
    );

    // Initialize AI chat on first load
    useEffect(() => {
        if (activeTab === 'ai' && aiMessages.length === 0) {
            initializeAiChat();
        }
    }, [activeTab]);

    // Load user stats for AI
    useEffect(() => {
        if (currentUser?.uid && activeTab === 'ai') {
            loadUserStats();
            const interval = setInterval(loadUserStats, 30000);
            return () => clearInterval(interval);
        }
    }, [currentUser?.uid, activeTab]);

    const initializeAiChat = () => {
        const userName = currentUser?.firstName || currentUser?.name || 'there';
        const welcomeMessage = {
            id: 1,
            text: `Hey ${userName}! 👋 I'm your personal Upcycled Streetwear assistant! I can help you find amazing deals, track your bids, discover trending items, and answer any questions about sustainable fashion. What would you like to explore today?`,
            sender: 'bot',
            timestamp: new Date(),
        };
        setAiMessages([welcomeMessage]);
    };

    const loadUserStats = async () => {
        if (!currentUser?.uid) return;

        try {
            const ordersQuery = query(
                collection(db, 'orders'),
                where('userId', '==', currentUser.uid)
            );
            const ordersSnap = await getDocs(ordersQuery);

            let totalSpent = 0;
            let pendingPayments = 0;
            const categoryCount = {};

            ordersSnap.docs.forEach(doc => {
                const orderData = doc.data();
                totalSpent += orderData.price || 0;

                if (orderData.status === 'pending_payment') {
                    pendingPayments++;
                }

                if (orderData.category) {
                    categoryCount[orderData.category] = (categoryCount[orderData.category] || 0) + 1;
                }
            });

            const productsQuery = query(collection(db, 'products'));
            const productsSnap = await getDocs(productsQuery);

            let activeBids = 0;
            let wonItems = 0;
            const currentBids = [];
            const recommendedItems = [];

            productsSnap.docs.forEach(doc => {
                const productData = doc.data();

                if (productData.bids && Array.isArray(productData.bids)) {
                    const userBid = productData.bids.find(bid => bid.userId === currentUser.uid);
                    if (userBid && productData.status === 'available') {
                        activeBids++;
                        currentBids.push({
                            productId: doc.id,
                            productName: productData.name,
                            currentBid: userBid.amount,
                            highestBid: productData.currentBid || 0,
                            isWinning: productData.highestBidder === currentUser.uid,
                            endTime: productData.biddingEndTime
                        });
                    }
                }

                if (productData.highestBidder === currentUser.uid && productData.status === 'sold') {
                    wonItems++;
                }

                const topCategories = Object.keys(categoryCount).slice(0, 3);
                if (topCategories.includes(productData.category) && productData.status === 'available') {
                    recommendedItems.push({
                        id: doc.id,
                        name: productData.name,
                        price: productData.price,
                        category: productData.category,
                        currentBid: productData.currentBid || productData.price
                    });
                }
            });

            const favoriteCategories = Object.entries(categoryCount)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([category, count]) => ({ category, count }));

            setUserStats({
                activeBids,
                wonItems,
                totalOrders: ordersSnap.size,
                totalSpent,
                pendingPayments,
                favoriteCategories,
                currentBids: currentBids.slice(0, 5),
                recommendedItems: recommendedItems.slice(0, 5)
            });

        } catch (error) {
            console.error('Error loading user stats:', error);
        }
    };

    const getContextualData = async (userQuery) => {
        const lowerQuery = userQuery.toLowerCase();
        let contextData = { stats: userStats };

        try {
            if (lowerQuery.includes('bid') || lowerQuery.includes('auction') || lowerQuery.includes('winning')) {
                const productsQuery = query(
                    collection(db, 'products'),
                    where('biddingEnabled', '==', true),
                    where('status', '==', 'available'),
                    orderBy('createdAt', 'desc'),
                    limit(10)
                );
                const productsSnap = await getDocs(productsQuery);
                contextData.biddingItems = productsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            }

            if (lowerQuery.includes('order') || lowerQuery.includes('purchase') || lowerQuery.includes('bought')) {
                const ordersQuery = query(
                    collection(db, 'orders'),
                    where('userId', '==', currentUser.uid),
                    orderBy('date', 'desc'),
                    limit(5)
                );
                const ordersSnap = await getDocs(ordersQuery);
                contextData.userOrders = ordersSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            }

            if (lowerQuery.includes('find') || lowerQuery.includes('recommend') || lowerQuery.includes('suggest') || lowerQuery.includes('trending')) {
                const productsQuery = query(
                    collection(db, 'products'),
                    where('status', '==', 'available'),
                    orderBy('createdAt', 'desc'),
                    limit(15)
                );
                const productsSnap = await getDocs(productsQuery);
                contextData.availableProducts = productsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            }

        } catch (error) {
            console.error('Error getting contextual data:', error);
        }
        return contextData;
    };

    const callGeminiAI = async (userMessage, contextData) => {
        try {
            const userName = currentUser?.firstName || currentUser?.name || 'there';
            const systemPrompt = `You are a friendly, enthusiastic personal shopping assistant for "${userName}" on the "Upcycled Streetwear" app - a sustainable fashion marketplace with bidding features.

USER PROFILE:
- Name: ${userName}
- Active Bids: ${contextData.stats.activeBids}
- Items Won: ${contextData.stats.wonItems}
- Total Orders: ${contextData.stats.totalOrders}
- Total Spent: ₱${contextData.stats.totalSpent.toLocaleString()}
- Pending Payments: ${contextData.stats.pendingPayments}
- Favorite Categories: ${contextData.stats.favoriteCategories.map(c => c.category).join(', ')}

${contextData.stats.currentBids?.length > 0 ? `CURRENT BIDS: ${JSON.stringify(contextData.stats.currentBids.map(bid => ({
    item: bid.productName,
    yourBid: bid.currentBid,
    highestBid: bid.highestBid,
    winning: bid.isWinning ? 'YES' : 'NO'
})))}` : ''}

PERSONALITY & GUIDELINES:
1. Be enthusiastic about sustainable fashion and upcycling 🌿
2. Use emojis and casual, friendly language
3. Give personalized recommendations based on user's history
4. Help with bidding strategies and timing
5. Explain sustainable fashion benefits
6. Keep responses conversational and under 80 words
7. Use Philippine Peso (₱) for pricing
8. Encourage eco-friendly shopping habits

USER MESSAGE: ${userMessage}

Respond as their personal shopping buddy with enthusiasm and helpful insights:`;

            const response = await fetch(GEMINI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: systemPrompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.8,
                        topK: 40,
                        topP: 0.90,
                        maxOutputTokens: 120,
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Gemini API error: ${response.status}`);
            }

            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error('Gemini API Error:', error);
            return "I'm having trouble connecting right now. Please try again in a moment! 😊";
        }
    };

    const sendAiMessage = async () => {
        if (!aiInputText.trim()) return;

        try {
            setAiLoading(true);
            setIsBotTyping(true);

            const userMessage = {
                id: Date.now(),
                text: aiInputText,
                sender: 'user',
                timestamp: new Date(),
            };

            setAiMessages(prev => [...prev, userMessage]);
            const currentInput = aiInputText;
            setAiInputText('');

            const contextData = await getContextualData(currentInput);
            const aiResponse = await callGeminiAI(currentInput, contextData);

            const botMessage = {
                id: Date.now() + 1,
                text: aiResponse,
                sender: 'bot',
                timestamp: new Date(),
            };

            setAiMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error('AI Error:', error);
        } finally {
            setAiLoading(false);
            setIsBotTyping(false);
        }
    };

    // Support Chat Functions
    useEffect(() => {
        if (!currentUser?.uid) return;
        initializeConversation();
    }, [currentUser?.uid]);

    useEffect(() => {
        if (!conversationId) return;

        const messagesRef = collection(db, 'conversations', conversationId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate() || new Date(),
            }));
            setMessages(newMessages);
            
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        });

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

    const initializeConversation = async () => {
        try {
            setLoading(true);
            
            const conversationsRef = collection(db, 'conversations');
            const q = query(
                conversationsRef, 
                where('participants', 'array-contains', currentUser.uid),
                limit(1)
            );
            
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
                setConversationId(snapshot.docs[0].id);
            } else {
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

            const messagesRef = collection(db, 'conversations', conversationId, 'messages');
            await addDoc(messagesRef, {
                senderId: currentUser.uid,
                senderType: 'user',
                text: messageText,
                timestamp: serverTimestamp(),
                status: 'delivered'
            });

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

            const filename = `chat-images/${conversationId}/${Date.now()}.jpg`;
            const imageRef = ref(storage, filename);
            
            const response = await fetch(imageUri);
            const blob = await response.blob();
            
            await uploadBytes(imageRef, blob);
            const downloadURL = await getDownloadURL(imageRef);

            const messagesRef = collection(db, 'conversations', conversationId, 'messages');
            await addDoc(messagesRef, {
                senderId: currentUser.uid,
                senderType: 'user',
                imageUrl: downloadURL,
                type: 'image',
                timestamp: serverTimestamp(),
                status: 'delivered'
            });

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

    const supportQuickActions = [
        { text: "Track my order", icon: "local-shipping" },
        { text: "Check bid status", icon: "gavel" },
        { text: "Payment issue", icon: "payment" },
        { text: "Return request", icon: "replay" },
    ];

    const aiQuickActions = [
        { text: "What items should I bid on right now?", icon: "gavel" },
        { text: "Show me trending sustainable fashion", icon: "trending-up" },
        { text: "Check my winning bids", icon: "emoji-events" },
        { text: "Find items similar to what I bought", icon: "recommend" },
    ];

    const handleGoBack = () => {
        const targetScreen = previousScreen || 'Home';
        navigation.replace(targetScreen);
    };

    const renderSupportMessage = ({ item }) => {
        const isWinNotification = item.type === 'win_notification';
        const isUserImage = item.type === 'image' && item.senderType === 'user';
        const isAdminImage = item.type === 'image' && item.senderType === 'admin';
        
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
                    {item.imageUrl && isWinNotification && (
                        <Image 
                            source={{ uri: item.imageUrl }} 
                            style={styles.winNotificationImage}
                            resizeMode="cover"
                        />
                    )}
                    
                    {item.imageUrl && (isUserImage || isAdminImage) && (
                        <Image 
                            source={{ uri: item.imageUrl }} 
                            style={styles.messageImage}
                            resizeMode="cover"
                        />
                    )}
                    
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

    const renderAiMessage = ({ item }) => (
        <View style={[
            styles.messageContainer,
            item.sender === 'user' ? styles.userMessage : styles.adminMessage
        ]}>
            {item.sender === 'bot' && (
                <View style={[styles.adminAvatar, styles.aiAvatar]}>
                    <Icon name="assistant" size={16} color="white" />
                </View>
            )}
            <View style={[
                styles.messageBubble,
                item.sender === 'user' ? styles.userBubble : styles.adminBubble
            ]}>
                <Text style={[
                    styles.messageText,
                    item.sender === 'user' ? styles.userMessageText : styles.adminMessageText
                ]}>
                    {item.text}
                </Text>
                <View style={styles.messageFooter}>
                    <Text style={[
                        styles.timestamp,
                        item.sender === 'user' ? styles.userTimestamp : styles.adminTimestamp
                    ]}>
                        {new Date(item.timestamp).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit' 
                        })}
                    </Text>
                </View>
            </View>
        </View>
    );

    const renderSupportQuickAction = ({ item }) => (
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

    const renderAiQuickAction = ({ item }) => (
        <TouchableOpacity
            style={styles.aiQuickActionButton}
            onPress={() => {
                setAiInputText(item.text);
                setTimeout(() => sendAiMessage(), 100);
            }}
        >
            <Icon name={item.icon} size={16} color="#135918" />
            <Text style={styles.aiQuickActionText}>{item.text}</Text>
        </TouchableOpacity>
    );

    if (loading && !conversationId && activeTab === 'support') {
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
                        <Text style={styles.headerTitle}>Messages</Text>
                    </View>
                    <View style={styles.headerRight} />
                </View>

                {/* Tab Bar */}
                <View style={styles.tabBar}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'support' && styles.activeTab]}
                        onPress={() => setActiveTab('support')}
                    >
                        <Icon 
                            name="support-agent" 
                            size={20} 
                            color={activeTab === 'support' ? '#135918' : '#666'} 
                        />
                        <Text style={[
                            styles.tabText,
                            activeTab === 'support' && styles.activeTabText
                        ]}>
                            Support
                        </Text>
                        <View style={styles.onlineIndicatorTab} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'ai' && styles.activeTab]}
                        onPress={() => setActiveTab('ai')}
                    >
                        <Icon 
                            name="assistant" 
                            size={20} 
                            color={activeTab === 'ai' ? '#135918' : '#666'} 
                        />
                        <Text style={[
                            styles.tabText,
                            activeTab === 'ai' && styles.activeTabText
                        ]}>
                            AI Assistant
                        </Text>
                        {(userStats.activeBids > 0 || userStats.pendingPayments > 0) && (
                            <View style={styles.tabBadge}>
                                <Text style={styles.tabBadgeText}>
                                    {userStats.activeBids + userStats.pendingPayments}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Support Chat View */}
                {activeTab === 'support' && (
                    <>
                        <View style={styles.infoBanner}>
                            <Icon name="info-outline" size={16} color="#135918" />
                            <Text style={styles.infoBannerText}>
                                We typically respond within 5 minutes
                            </Text>
                        </View>

                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            renderItem={renderSupportMessage}
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
                                                data={supportQuickActions}
                                                renderItem={renderSupportQuickAction}
                                                keyExtractor={(item, index) => index.toString()}
                                                numColumns={2}
                                                columnWrapperStyle={styles.quickActionsRow}
                                            />
                                        </View>
                                    )}
                                </View>
                            )}
                        />

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
                    </>
                )}

                {/* AI Assistant View */}
                {activeTab === 'ai' && (
                    <>
                        <View style={styles.statsBar}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{userStats.activeBids}</Text>
                                <Text style={styles.statLabel}>Active Bids</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{userStats.wonItems}</Text>
                                <Text style={styles.statLabel}>Won</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>₱{(userStats.totalSpent / 1000).toFixed(1)}k</Text>
                                <Text style={styles.statLabel}>Spent</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, userStats.pendingPayments > 0 && styles.pendingValue]}>
                                    {userStats.pendingPayments}
                                </Text>
                                <Text style={styles.statLabel}>Pending</Text>
                            </View>
                        </View>

                        <FlatList
                            ref={aiFlatListRef}
                            data={aiMessages}
                            renderItem={renderAiMessage}
                            keyExtractor={(item) => item.id.toString()}
                            style={styles.messagesList}
                            contentContainerStyle={styles.messagesContent}
                            onContentSizeChange={() => 
                                aiFlatListRef.current?.scrollToEnd({ animated: true })
                            }
                            ListFooterComponent={() => (
                                <View>
                                    {isBotTyping && (
                                        <View style={styles.typingContainer}>
                                            <View style={[styles.adminAvatar, styles.aiAvatar]}>
                                                <Icon name="assistant" size={16} color="white" />
                                            </View>
                                            <View style={styles.typingBubble}>
                                                <ActivityIndicator size="small" color="#135918" />
                                                <Text style={styles.typingText}>Thinking...</Text>
                                            </View>
                                        </View>
                                    )}
                                    {aiMessages.length <= 1 && (
                                        <View style={styles.quickActionsContainer}>
                                            <Text style={styles.quickActionsTitle}>
                                                Quick Questions:
                                            </Text>
                                            <FlatList
                                                data={aiQuickActions}
                                                renderItem={renderAiQuickAction}
                                                keyExtractor={(item, index) => index.toString()}
                                                showsVerticalScrollIndicator={false}
                                            />
                                        </View>
                                    )}
                                </View>
                            )}
                        />

                        <View style={styles.inputContainer}>
                            <TextInput
                                value={aiInputText}
                                onChangeText={setAiInputText}
                                placeholder="Ask about bids, trends, or styling tips..."
                                placeholderTextColor="#999"
                                style={styles.textInput}
                                multiline
                                maxLength={500}
                            />
                            <TouchableOpacity
                                onPress={sendAiMessage}
                                disabled={aiLoading || !aiInputText.trim()}
                                style={[
                                    styles.sendButton,
                                    (!aiInputText.trim() || aiLoading) && styles.sendButtonDisabled
                                ]}
                            >
                                {aiLoading ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Icon name="send" size={20} color="white" />
                                )}
                            </TouchableOpacity>
                        </View>
                    </>
                )}
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
        flex: 1,
        alignItems: 'center',
    },
    headerRight: {
        width: 40,
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 10,
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
        position: 'relative',
    },
    activeTab: {
        borderBottomColor: '#135918',
        backgroundColor: '#f0f9f0',
    },
    tabText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
        marginLeft: 6,
    },
    activeTabText: {
        color: '#135918',
        fontWeight: 'bold',
    },
    onlineIndicatorTab: {
        position: 'absolute',
        top: 12,
        left: '28%',
        width: 8,
        height: 8,
        backgroundColor: '#4CAF50',
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: 'white',
    },
    tabBadge: {
        position: 'absolute',
        top: 8,
        right: '20%',
        backgroundColor: '#ff4444',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 5,
    },
    tabBadgeText: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
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
    statsBar: {
        flexDirection: 'row',
        backgroundColor: '#f0f9f0',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#135918',
    },
    pendingValue: {
        color: '#ff8800',
    },
    statLabel: {
        fontSize: 10,
        color: '#666',
        marginTop: 2,
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
    aiAvatar: {
        backgroundColor: '#2196F3',
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
        flexDirection: 'row',
        alignItems: 'center',
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
    typingText: {
        marginLeft: 8,
        color: '#135918',
        fontSize: 14,
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
    aiQuickActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f9f0',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#d0d0d0',
    },
    aiQuickActionText: {
        marginLeft: 8,
        fontSize: 12,
        color: '#135918',
        flex: 1,
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