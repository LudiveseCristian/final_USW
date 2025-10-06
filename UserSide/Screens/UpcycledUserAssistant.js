import React, { useState, useRef, useEffect } from 'react';
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
    Animated,
    Image,
    ActivityIndicator,
    Keyboard
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import {
    getFirestore,
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    getDocs,
    where,
    limit,
    doc,
    updateDoc,
    deleteDoc,
    Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');
const MENU_BAR_HEIGHT = 60; // Estimated height of the bottom menu bar
const SAFE_TOP_MARGIN = 20; // Margin from top to avoid status bar overlap
const SAFE_BOTTOM_MARGIN = MENU_BAR_HEIGHT + 20; // Margin above menu bar
const BUTTON_WIDTH = 60; // Width of the floating button
const BUTTON_HEIGHT = 60; // Height of the floating button

const UpcycledUserAssistant = ({ userId, userProfile }) => {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isBotTyping, setIsBotTyping] = useState(false);
    const flatListRef = useRef(null);
    const slideAnim = useRef(new Animated.Value(height)).current;
    
    // Use Animated.ValueXY for a unified position state
    const position = useRef(new Animated.ValueXY({ x: width - BUTTON_WIDTH - 15, y: height - BUTTON_HEIGHT - 90 })).current;

    const [userStats, setUserStats] = useState({
        activeBids: 0,
        wonItems: 0,
        totalOrders: 0,
        totalSpent: 0,
        pendingPayments: 0,
        favoriteCategories: [],
        recentlyViewed: [],
        currentBids: [],
        recommendedItems: []
    });

    const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || "AIzaSyBsPOHcydTbrU2rLfFr3cvf7B84L0iBlD0";
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

    useEffect(() => {
        if (isOpen) {
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => {
                if (messages.length === 0) {
                    initializeChat();
                }
            });
        } else {
            Animated.timing(slideAnim, {
                toValue: height,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [isOpen]);

    useEffect(() => {
        if (userId) {
            loadUserStats();
            const interval = setInterval(loadUserStats, 30000);
            return () => clearInterval(interval);
        }
    }, [userId]);

    const initializeChat = () => {
        const userName = userProfile?.firstName || userProfile?.name || 'there';
        const welcomeMessage = {
            id: 1,
            text: `Hey ${userName}! 👋 I'm your personal Upcycled Streetwear assistant! I can help you find amazing deals, track your bids, discover trending items, and answer any questions about sustainable fashion. What would you like to explore today?`,
            sender: 'bot',
            timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
    };

    useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
        'keyboardDidShow',
        () => {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    );

    return () => {
        keyboardDidShowListener.remove();
    };
}, []);

    const loadUserStats = async () => {
        if (!userId) return;

        try {
            const ordersQuery = query(
                collection(db, 'orders'),
                where('userId', '==', userId)
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
                    const userBid = productData.bids.find(bid => bid.userId === userId);
                    if (userBid && productData.status === 'available') {
                        activeBids++;
                        currentBids.push({
                            productId: doc.id,
                            productName: productData.name,
                            currentBid: userBid.amount,
                            highestBid: productData.currentBid || 0,
                            isWinning: productData.highestBidder === userId,
                            endTime: productData.biddingEndTime
                        });
                    }
                }

                if (productData.highestBidder === userId && productData.status === 'sold') {
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
            // console.error('Error loading user stats:', error);
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
                    where('userId', '==', userId),
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

            if (lowerQuery.includes('news') || lowerQuery.includes('trend') || lowerQuery.includes('style') || lowerQuery.includes('fashion')) {
                const newsQuery = query(
                    collection(db, 'news'),
                    orderBy('createdAt', 'desc'),
                    limit(5)
                );
                const newsSnap = await getDocs(newsQuery);
                contextData.fashionNews = newsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            }

        } catch (error) {
            // console.error('Error getting contextual data:', error);
        }
        return contextData;
    };

    const callGeminiAI = async (userMessage, contextData) => {
        try {
            const userName = userProfile?.firstName || userProfile?.name || 'there';
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

${contextData.biddingItems ? `TRENDING AUCTIONS: ${JSON.stringify(contextData.biddingItems.slice(0, 5).map(item => ({
    name: item.name,
    startingBid: item.price,
    currentBid: item.currentBid || item.price,
    category: item.category,
    condition: item.condition,
    timeLeft: item.biddingEndTime
})))}` : ''}

${contextData.userOrders ? `RECENT ORDERS: ${JSON.stringify(contextData.userOrders.map(order => ({
    product: order.product,
    price: order.price,
    status: order.status,
    date: order.date
})))}` : ''}

${contextData.availableProducts ? `AVAILABLE ITEMS: ${JSON.stringify(contextData.availableProducts.slice(0, 8).map(product => ({
    name: product.name,
    price: product.price,
    category: product.category,
    condition: product.condition,
    biddingEnabled: product.biddingEnabled,
    currentBid: product.currentBid
})))}` : ''}

${contextData.fashionNews ? `FASHION NEWS: ${JSON.stringify(contextData.fashionNews.map(news => ({
    title: news.title,
    description: news.description
})))}` : ''}

PERSONALITY & GUIDELINES:
1. Be enthusiastic about sustainable fashion and upcycling 🌿
2. Use emojis and casual, friendly language
3. Give personalized recommendations based on user's history
4. Help with bidding strategies and timing
5. Explain sustainable fashion benefits
6. Alert about ending auctions for items they're bidding on
7. Suggest styling tips and outfit combinations
8. Keep responses conversational and under 250 words
9. Use Philippine Peso (₱) for pricing
10. Encourage eco-friendly shopping habits

SPECIAL FEATURES:
- Alert if user is losing a bid and suggest action
- Recommend items similar to their purchase history
- Notify about flash sales and new arrivals
- Provide styling advice for purchased items
- Share sustainability tips and fashion care

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
                        topP: 0.95,
                        maxOutputTokens: 400,
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Gemini API error: ${response.status}`);
            }

            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            // console.error('Gemini API Error:', error);
        }
    };

    const sendMessage = async () => {
        if (!inputText.trim()) return;

        try {
            setLoading(true);
            setIsBotTyping(true);

            const userMessage = {
                id: Date.now(),
                text: inputText,
                sender: 'user',
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, userMessage]);
            const currentInput = inputText;
            setInputText('');

            const contextData = await getContextualData(currentInput);
            const aiResponse = await callGeminiAI(currentInput, contextData);

            const botMessage = {
                id: Date.now() + 1,
                text: aiResponse,
                sender: 'bot',
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            // console.error('AI Error:', error);
        } finally {
            setLoading(false);
            setIsBotTyping(false);
        }
    };

    const quickActions = [
        { text: "What items should I bid on right now?", icon: "gavel" },
        { text: "Show me trending sustainable fashion", icon: "trending-up" },
        { text: "Check my winning bids", icon: "emoji-events" },
        { text: "Find items similar to what I bought", icon: "recommend" },
        { text: "Any auctions ending soon?", icon: "schedule" },
    ];

    const sendQuickAction = (action) => {
        setInputText(action);
        setTimeout(() => sendMessage(), 100);
    };

    // New logic for dragging
    const onPanGestureEvent = Animated.event(
      [{ nativeEvent: { translationX: position.x, translationY: position.y } }],
      { useNativeDriver: true }
    );

    const onPanStateChange = ({ nativeEvent }) => {
        if (nativeEvent.state === State.BEGAN) {
            // Set the current position as the offset when the drag starts
            position.setOffset({ x: position.x._value, y: position.y._value });
            position.setValue({ x: 0, y: 0 }); // Reset value to 0 so the drag starts from the tap point
        } else if (nativeEvent.state === State.END || nativeEvent.state === State.CANCELLED) {
            // Flatten the offset into the value and reset offset
            position.flattenOffset();
            const { x, y } = position.__getValue();

            // Snap logic (optional, but good for UI)
            const newX = x < width / 2 ? 15 : width - BUTTON_WIDTH - 15;
            const newY = Math.max(SAFE_TOP_MARGIN, Math.min(y, height - SAFE_BOTTOM_MARGIN));
            
            Animated.spring(position, {
                toValue: { x: newX, y: newY },
                friction: 7,
                tension: 40,
                useNativeDriver: true,
            }).start();
        }
    };

    const renderMessage = ({ item }) => (
        <View style={[
            styles.messageContainer,
            item.sender === 'user' ? styles.userMessage : styles.botMessage
        ]}>
            <Text style={[
                styles.messageText,
                item.sender === 'user' ? styles.userMessageText : styles.botMessageText
            ]}>
                {item.text}
            </Text>
        </View>
    );

    const renderQuickAction = ({ item }) => (
        <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => sendQuickAction(item.text)}
        >
            <Icon name={item.icon} size={16} color="#135918" />
            <Text style={styles.quickActionText}>{item.text}</Text>
        </TouchableOpacity>
    );

    return (
        <>
            <PanGestureHandler
                onGestureEvent={onPanGestureEvent}
                onHandlerStateChange={onPanStateChange}
            >
                <Animated.View
                    style={[
                        styles.floatingButton,
                        {
                            transform: [
                                { translateX: position.x },
                                { translateY: position.y },
                                { scale: isOpen ? 0 : 1 }
                            ]
                        }
                    ]}
                >
                    <TouchableOpacity
                        onPress={() => setIsOpen(true)}
                        style={styles.chatButton}
                        disabled={false} // Allow press even while dragging begins
                        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                    >
                        <Image
                            source={require("../assets/LogoBot.png")}
                            style={{ width: BUTTON_WIDTH, height: BUTTON_HEIGHT }}
                        />
                        {(userStats.activeBids > 0 || userStats.pendingPayments > 0) && (
                            <View style={styles.notificationBadge}>
                                <Text style={styles.badgeText}>
                                    {userStats.activeBids + userStats.pendingPayments}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </Animated.View>
            </PanGestureHandler>

            <Animated.View
                style={[
                    styles.chatModal,
                    { transform: [{ translateY: slideAnim }] }
                ]}
                pointerEvents={isOpen ? 'auto' : 'none'}
            >
                    <View style={styles.container}> 
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <View style={styles.avatarContainer}>
                                <Icon name="assistant" size={16} color="white" />
                            </View>
                            <View>
                                <Text style={styles.headerTitle}>Upcycled Assistance</Text>
                                <Text style={styles.headerSubtitle}>AI-Powered Guide for Sustainable Streetwear</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            onPress={() => setIsOpen(false)}
                            style={styles.closeButton}
                        >
                            <Icon name="close" size={24} color="white" />
                        </TouchableOpacity>
                    </View>

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

                     <KeyboardAvoidingView
            style={{ flex: 1 }}  // Changed
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
        >


                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={(item) => item.id.toString()}
                        style={styles.messagesList}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                        ListFooterComponent={() => (
                            <View>
                                {isBotTyping && (
                                    <View style={styles.typingContainer}>
                                        <View style={styles.typingBubble}>
                                            <ActivityIndicator size="small" color="#135918" />
                                            <Text style={styles.typingText}>Thinking...</Text>
                                        </View>
                                    </View>
                                )}
                                {messages.length <= 1 && (
                                    <View style={styles.quickActionsContainer}>
                                        <Text style={styles.quickActionsTitle}>Quick Questions:</Text>
                                        <FlatList
                                            data={quickActions}
                                            renderItem={renderQuickAction}
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
                            value={inputText}
                            onChangeText={setInputText}
                            placeholder="Ask about bids, trends, or styling tips..."
                            style={styles.textInput}
                            multiline
                            maxLength={500}
                            onSubmitEditing={sendMessage}
                        />
                        <TouchableOpacity
                            onPress={sendMessage}
                            disabled={loading || !inputText.trim()}
                            style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Icon name="send" size={20} color="white" />
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
                </View>
            </Animated.View>
        </>
    );
};

const styles = StyleSheet.create({


    floatingButton: {
        position: 'absolute',
        zIndex: 1000,
    },
    chatButton: {
        width: BUTTON_WIDTH,
        height: BUTTON_HEIGHT,
        backgroundColor: 'transparent',
        borderRadius: BUTTON_WIDTH / 2,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    notificationBadge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: '#ff4444',
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    chatModal: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#FFFEF7',
        zIndex: 999,
    },
    keyboardAvoid: {
        flex: 1,
    },
    container: {
    flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#135918',
        paddingTop: Platform.OS === 'ios' ? 50 : 40,
        paddingBottom: 15,
        paddingHorizontal: 20,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        width: 32,
        height: 32,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    headerTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
    },
    closeButton: {
        padding: 5,
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
        paddingHorizontal: 15,
        paddingTop: 15,
    },
    messageContainer: {
        marginBottom: 12,
        maxWidth: '80%',
    },
    userMessage: {
        alignSelf: 'flex-end',
    },
    botMessage: {
        alignSelf: 'flex-start',
    },
    messageText: {
        fontSize: 14,
        lineHeight: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 18,
    },
    userMessageText: {
        backgroundColor: '#135918',
        color: 'white',
        borderBottomRightRadius: 5,
    },
    botMessageText: {
        backgroundColor: '#f5f5f5',
        color: '#333',
        borderBottomLeftRadius: 5,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    typingContainer: {
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    typingBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 18,
        borderBottomLeftRadius: 5,
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    typingText: {
        marginLeft: 8,
        color: '#135918',
        fontSize: 14,
    },
    quickActionsContainer: {
        marginTop: 15,
        marginBottom: 10,
    },
    quickActionsTitle: {
        fontSize: 12,
        color: '#666',
        marginBottom: 10,
        marginLeft: 5,
    },
    quickActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f9f0',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#d0d0d0',
    },
    quickActionText: {
        marginLeft: 8,
        fontSize: 12,
        color: '#135918',
        flex: 1,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 15,
        paddingVertical: 10,
        paddingBottom: Platform.OS === 'ios' ? 20 : 10,  // Add this
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        backgroundColor: 'white',
    },
    textInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#d0d0d0',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginRight: 10,
        maxHeight: 80,
        fontSize: 14,
        backgroundColor: '#fafafa',
    },
    sendButton: {
        backgroundColor: '#135918',
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
});

export default UpcycledUserAssistant;