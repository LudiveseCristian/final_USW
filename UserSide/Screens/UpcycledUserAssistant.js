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
import { db } from '../firebase/firebase'; // Ensure this path is correct
import Icon from 'react-native-vector-icons/MaterialIcons';
import Constants from 'expo-constants';

const { width, height } = Dimensions.get('window');
const MENU_BAR_HEIGHT = 60; // Adjust if your menu bar height is different
const SAFE_TOP_MARGIN = Constants.statusBarHeight + 10; // Use actual status bar height
const SAFE_BOTTOM_MARGIN = MENU_BAR_HEIGHT + 20;
const BUTTON_WIDTH = 60;
const BUTTON_HEIGHT = 60;

const UpcycledUserAssistant = ({ userId, userProfile }) => {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isBotTyping, setIsBotTyping] = useState(false);
    const flatListRef = useRef(null);
    const slideAnim = useRef(new Animated.Value(height)).current;
    const position = useRef(new Animated.ValueXY({ x: width - BUTTON_WIDTH - 15, y: height - BUTTON_HEIGHT - SAFE_BOTTOM_MARGIN - 10 })).current; // Adjusted initial Y

    const [userStats, setUserStats] = useState({
        activeBids: 0,
        wonItems: 0,
        totalOrders: 0,
        totalSpent: 0,
        pendingPayments: 0,
        favoriteCategories: [],
        recentlyViewed: [], // Note: recentlyViewed is not currently calculated
        currentBids: [],
        recommendedItems: []
    });

    const GEMINI_API_KEY = Constants.expoConfig?.extra?.REACT_APP_GEMINI_API_KEY;
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;

    useEffect(() => {
        if (isOpen) {
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => {
                if (messages.length === 0 && userId) { // Ensure userId is present
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
    }, [isOpen, userId]); // Add userId dependency

    useEffect(() => {
        if (userId) {
            loadUserStats();
            const interval = setInterval(loadUserStats, 30000);
            return () => clearInterval(interval);
        } else {
             // Reset stats if user logs out or userId becomes invalid
            setUserStats({
                activeBids: 0, wonItems: 0, totalOrders: 0, totalSpent: 0, pendingPayments: 0,
                favoriteCategories: [], recentlyViewed: [], currentBids: [], recommendedItems: []
            });
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
        // Scroll to end when keyboard appears
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => {
                setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                }, 100); // Small delay might be needed
            }
        );
         // Scroll to end when new messages are added
        if (messages.length > 0) {
           setTimeout(() => {
             flatListRef.current?.scrollToEnd({ animated: true });
           }, 100);
        }

        return () => {
            keyboardDidShowListener.remove();
        };
    }, [messages]); // Add messages dependency

    const loadUserStats = async () => {
        if (!userId) return;

        try {
            // --- VERIFY 'userId' FIELD EXISTS IN 'orders' COLLECTION ---
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
                // --- VERIFY 'price' FIELD NAME ---
                totalSpent += orderData.price || 0;

                // --- VERIFY 'status' VALUE FOR PENDING PAYMENT ---
                if (orderData.status === 'pending_payment') { // Example status, adjust if needed
                    pendingPayments++;
                }
                // --- VERIFY 'category' FIELD EXISTS ---
                if (orderData.category) {
                    categoryCount[orderData.category] = (categoryCount[orderData.category] || 0) + 1;
                }
            });

            const productsQuery = query(collection(db, 'products'));
            const productsSnap = await getDocs(productsQuery);

            let activeBids = 0;
            let wonItems = 0;
            const currentBids = [];
            const recommendedItems = []; // Recalculate recommendations here

            productsSnap.docs.forEach(doc => {
                const productData = doc.data();

                // Check active bids
                // --- VERIFY 'bids' ARRAY STRUCTURE and 'userId' field in bids ---
                if (productData.bids && Array.isArray(productData.bids)) {
                    const userBid = productData.bids.find(bid => bid.userId === userId); // Adjust field if needed
                     // --- VERIFY 'status' VALUE FOR AVAILABLE ---
                    if (userBid && productData.status === 'available') {
                        activeBids++;
                         // --- VERIFY 'highestBidder' FIELD NAME (might be winnerBidderId) ---
                         // --- VERIFY 'currentBid' FIELD NAME ---
                         // --- VERIFY 'biddingEndTime' FIELD NAME and format ---
                        currentBids.push({
                            productId: doc.id,
                            productName: productData.name,
                            currentBid: userBid.amount, // Adjust field if needed
                            highestBid: productData.currentBid || 0,
                            isWinning: productData.highestBidder === userId, // Adjust field if needed
                            endTime: productData.biddingEndTime // Or relevant end time field
                        });
                    }
                }

                // Check won items
                // --- VERIFY 'highestBidder' FIELD NAME ---
                // --- VERIFY 'status' VALUE FOR SOLD ---
                if (productData.highestBidder === userId && productData.status === 'sold') { // Adjust fields if needed
                    wonItems++;
                }
            });

            // Calculate favorite categories *after* processing all orders
            const favoriteCategories = Object.entries(categoryCount)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([category, count]) => ({ category, count }));

            // Calculate recommendations *after* favorites are determined
             const topCategoryNames = favoriteCategories.map(fav => fav.category);
             productsSnap.docs.forEach(doc => {
                const productData = doc.data();
                 if (topCategoryNames.includes(productData.category) && productData.status === 'available') {
                     recommendedItems.push({
                         id: doc.id,
                         name: productData.name,
                         price: productData.price,
                         category: productData.category,
                         currentBid: productData.currentBid || productData.price // Use currentBid if available
                     });
                 }
             });


            setUserStats({
                activeBids,
                wonItems,
                totalOrders: ordersSnap.size,
                totalSpent,
                pendingPayments,
                favoriteCategories,
                currentBids: currentBids.sort((a,b) => (a.endTime?.toDate() || 0) - (b.endTime?.toDate() || 0)).slice(0, 5), // Sort by end time
                recommendedItems: recommendedItems.slice(0, 5) // Limit recommendations
            });

        } catch (error) {
            console.error('Error loading user stats:', error); // <-- UNCOMMENTED
        }
    };

    const getContextualData = async (userQuery) => {
        const lowerQuery = userQuery.toLowerCase();
        let contextData = { stats: userStats }; // Start with the latest stats

        try {
            // Fetch currently active bidding items (more relevant than just 'biddingEnabled')
            if (lowerQuery.includes('bid') || lowerQuery.includes('auction') || lowerQuery.includes('winning')) {
                 // --- VERIFY 'biddingEndTime' FIELD NAME ---
                const productsQuery = query(
                    collection(db, 'products'),
                    where('status', '==', 'available'),
                    where('biddingEnabled', '==', true),
                    where('biddingEndTime', '>', Timestamp.now()), // Only show active auctions
                    orderBy('biddingEndTime', 'asc'), // Show soonest ending first
                    limit(10)
                );
                const productsSnap = await getDocs(productsQuery);
                contextData.biddingItems = productsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            }

            // Fetch user's recent orders
            if (lowerQuery.includes('order') || lowerQuery.includes('purchase') || lowerQuery.includes('bought')) {
                 // --- VERIFY 'date' FIELD NAME ---
                const ordersQuery = query(
                    collection(db, 'orders'),
                    where('userId', '==', userId),
                    orderBy('date', 'desc'), // Assuming 'date' field exists and is Timestamp
                    limit(5)
                );
                const ordersSnap = await getDocs(ordersQuery);
                contextData.userOrders = ordersSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            }

             // Fetch general available products if needed for recommendations
             // Consider fetching based on favorite categories if query implies it
            if (lowerQuery.includes('find') || lowerQuery.includes('recommend') || lowerQuery.includes('suggest') || lowerQuery.includes('trending')) {
                 // --- VERIFY 'createdAt' FIELD NAME (or another relevant sorting field) ---
                const productsQuery = query(
                    collection(db, 'products'),
                    where('status', '==', 'available'),
                    orderBy('createdAt', 'desc'), // Or sort by popularity, bids, etc.
                    limit(15)
                );
                const productsSnap = await getDocs(productsQuery);
                contextData.availableProducts = productsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            }

             // Fetch News/Trends
            if (lowerQuery.includes('news') || lowerQuery.includes('trend') || lowerQuery.includes('style') || lowerQuery.includes('fashion')) {
                // --- VERIFY 'createdAt' FIELD NAME ---
                const newsQuery = query(
                    collection(db, 'news'), // Assuming 'news' collection exists
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
            console.error('Error getting contextual data:', error); // <-- UNCOMMENTED
        }
        return contextData;
    };

    const callGeminiAI = async (userMessage, contextData) => {
        try {
            const userName = userProfile?.firstName || userProfile?.name || 'there';
            // --- Simplify the data included in the prompt ---
            const systemPrompt = `You are a friendly, enthusiastic personal shopping assistant for "${userName}" on the "Upcycled Streetwear" app - a sustainable fashion marketplace with bidding features.

USER PROFILE SUMMARY:
- Active Bids: ${contextData.stats.activeBids}
- Items Won: ${contextData.stats.wonItems}
- Total Spent: ~₱${contextData.stats.totalSpent.toLocaleString(undefined, {maximumFractionDigits: 0})}
- Pending Payments: ${contextData.stats.pendingPayments}
- Top Categories: ${contextData.stats.favoriteCategories.map(c => c.category).join(', ') || 'N/A'}

${contextData.stats.currentBids?.length > 0 ? `YOUR CURRENT BIDS (Top 5): ${JSON.stringify(contextData.stats.currentBids.map(bid => ({
    item: bid.productName, your_bid: `₱${bid.currentBid}`, highest_bid: `₱${bid.highestBid}`, winning: bid.isWinning ? 'YES' : 'NO'
})))}` : ''}

${contextData.biddingItems ? `ACTIVE AUCTIONS ENDING SOON (Top 5): ${JSON.stringify(contextData.biddingItems.slice(0, 5).map(item => ({
    name: item.name, current_bid: `₱${item.currentBid || item.price}`, category: item.category
})))}` : ''}

${contextData.userOrders ? `YOUR RECENT ORDERS (Last 5): ${JSON.stringify(contextData.userOrders.map(order => ({
    product: order.product, status: order.status
})))}` : ''}

${contextData.stats.recommendedItems?.length > 0 ? `RECOMMENDED FOR YOU (Based on history): ${JSON.stringify(contextData.stats.recommendedItems.map(product => ({
    name: product.name, price: `₱${product.currentBid}`, category: product.category
})))}` : ''}

${contextData.fashionNews ? `LATEST FASHION NEWS: ${JSON.stringify(contextData.fashionNews.map(news => ({
    title: news.title
})))}` : ''}

PERSONALITY & GUIDELINES:
1. Be enthusiastic about **thrifting vintage streetwear** and **sustainable fashion** (giving clothes a second life!) 🌿! Use emojis.
2. Give personalized recommendations based on the user's profile, purchase history, and bid activity.
3. Help with **bidding strategy** (e.g., "Looking good, you're the highest bidder!", "Quick! Someone just outbid you!").
4. Explain the benefits of **thrifting** (eco-friendly, finding unique gems ✨, supporting circular fashion) briefly if relevant.
5. Alert about **auctions ending soon**, especially for items they're actively bidding on.
6. Suggest styling tips for **vintage finds** if asked or relevant.
7. Keep responses CONCISE (under 80 words) and conversational – like chatting with a fashion buddy!
8. Use Philippine Peso (₱).
9. Encourage **thrifting** as a cool and conscious way to shop.
10. If data is missing for a query (e.g., no active bids), say so kindly ("Looks like you haven't placed any bids yet! Ready to find something awesome?"). Don't invent data.
11. Remember you represent **Upcycled Streetwear**, a cool Cebu-based online thrift shop! 🇵🇭

USER MESSAGE: ${userMessage}

Respond as their personal shopping buddy:`;

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
                        maxOutputTokens: 150, // Increased slightly for potentially detailed bid info
                    }
                })
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Gemini API error: ${response.status} - ${errorBody}`);
            }

            const data = await response.json();

             // Add basic safety check for response structure
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
                 console.error("Unexpected Gemini API response structure:", data);
                 throw new Error("Received an unexpected response format from the AI.");
            }

            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error('Gemini API Error:', error); // <-- UNCOMMENTED
             // Provide a user-friendly error message
             return "Oops! I'm having a little trouble connecting right now. Please try again in a moment. 🛠️";
        }
    };

    const sendMessage = async () => {
        if (!inputText.trim()) return;

         // --- API KEY CHECK ---
        if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
             const apiKeyErrorMessage = {
                 id: Date.now() + 1,
                 text: "⚠️ AI features are unavailable. Please ensure the Gemini API key is configured correctly.",
                 sender: "bot",
                 timestamp: new Date(),
             };
             setMessages(prev => [...prev, apiKeyErrorMessage]);
             return; // Stop execution
        }
        // --- END CHECK ---

        const userMessage = {
            id: Date.now(),
            text: inputText,
            sender: 'user',
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = inputText;
        setInputText('');
        setIsBotTyping(true);
        setLoading(true);


        try {
            const contextData = await getContextualData(currentInput);
            const aiResponse = await callGeminiAI(currentInput, contextData);

            const botMessage = {
                id: Date.now() + 1,
                text: aiResponse || "Sorry, I couldn't generate a response. Please try again.", // Fallback text
                sender: 'bot',
                timestamp: new Date(),
            };

             // Use functional update to ensure correct state
             setMessages(prev => [...prev, botMessage]);

        } catch (error) {
            console.error('AI Error during send:', error); // <-- UNCOMMENTED
            const errorBotMessage = {
                 id: Date.now() + 1,
                 text: "Something went wrong while getting your answer. Please try asking again!",
                 sender: 'bot',
                 timestamp: new Date(),
            };
             setMessages(prev => [...prev, errorBotMessage]);
        } finally {
            setIsBotTyping(false);
            setLoading(false);
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
        // Let state update before sending
        requestAnimationFrame(sendMessage);
    };

    const onPanGestureEvent = Animated.event(
        [{ nativeEvent: { translationX: position.x, translationY: position.y } }],
        { useNativeDriver: false } // Set to false for ValueXY
    );


    const onPanStateChange = ({ nativeEvent }) => {
        let currentX = 0;
        let currentY = 0;

        if (nativeEvent.state === State.BEGAN) {
            // Store the current absolute position when drag begins
             position.extractOffset(); // Apply existing offset to value before setting new offset
        } else if (nativeEvent.state === State.ACTIVE) {
             // While dragging, update position based on translation
             // Animated.event handles this if useNativeDriver is false
        } else if (nativeEvent.state === State.END || nativeEvent.state === State.CANCELLED || nativeEvent.state === State.FAILED) {
            position.flattenOffset(); // Consolidate offset into value

            // Get the final value after drag ends
            const finalPosition = position.__getValue();
            currentX = finalPosition.x;
            currentY = finalPosition.y;


            // Clamp Y position within safe boundaries
            const clampedY = Math.max(
                SAFE_TOP_MARGIN,
                Math.min(currentY, height - SAFE_BOTTOM_MARGIN - BUTTON_HEIGHT)
            );

            // Determine X snap position (left or right edge)
             const snapX = currentX + (BUTTON_WIDTH / 2) < width / 2
                 ? 15 // Snap to left
                 : width - BUTTON_WIDTH - 15; // Snap to right


            // Animate snapping
            Animated.spring(position, {
                toValue: { x: snapX, y: clampedY },
                friction: 7,
                tension: 40,
                useNativeDriver: false, // Must be false for ValueXY
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
            {/* Draggable Floating Button */}
            {!isOpen && (
                <PanGestureHandler
                    onGestureEvent={onPanGestureEvent}
                    onHandlerStateChange={onPanStateChange}
                >
                    <Animated.View
                        style={[
                            styles.floatingButton,
                             // Use position.getLayout() for Animated.ValueXY
                            position.getLayout(),
                             { opacity: isOpen ? 0 : 1 } // Fade out when open
                        ]}
                    >
                        <TouchableOpacity
                            onPress={() => setIsOpen(true)}
                            style={styles.chatButton}
                            disabled={isOpen}
                            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                        >
                            <Image
                                source={require("../assets/LogoBot.png")} // Make sure path is correct
                                style={{ width: BUTTON_WIDTH, height: BUTTON_HEIGHT, borderRadius: BUTTON_WIDTH / 2 }} // Added borderRadius
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
            )}

            {/* Chat Modal */}
            <Animated.View
                style={[
                    styles.chatModal,
                    { transform: [{ translateY: slideAnim }] },
                     // Ensure modal is only interactive when fully open
                     { opacity: slideAnim.interpolate({ inputRange: [0, height], outputRange: [1, 0] }) }
                ]}
                pointerEvents={isOpen ? 'auto' : 'none'}
            >
                 {/* Ensure KeyboardAvoidingView wraps the list and input */}
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined} // 'padding' is generally better for modals
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0} // Adjust offset if header/tabs overlap input
                >
                    <View style={styles.container}>
                        <View style={styles.header}>
                            <View style={styles.headerLeft}>
                                <View style={styles.avatarContainer}>
                                    <Icon name="assistant" size={16} color="white" />
                                </View>
                                <View>
                                    <Text style={styles.headerTitle}>Upcycled Assistant</Text>
                                    <Text style={styles.headerSubtitle}>Your Sustainable Style Guide</Text>
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


                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            renderItem={renderMessage}
                            keyExtractor={(item) => item.id.toString()}
                            style={styles.messagesList}
                            contentContainerStyle={{ paddingBottom: 10 }} // Add padding at the bottom
                           // Remove onContentSizeChange, rely on useEffect [messages]
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
                                    {/* Render Quick Actions only when chat is initialized */}
                                    {messages.length === 1 && !isBotTyping && (
                                        <View style={styles.quickActionsContainer}>
                                            <Text style={styles.quickActionsTitle}>Quick Questions:</Text>
                                            {quickActions.map((item, index) => (
                                                 <TouchableOpacity
                                                    key={index} // Use index as key here is acceptable
                                                    style={styles.quickActionButton}
                                                    onPress={() => sendQuickAction(item.text)}
                                                 >
                                                     <Icon name={item.icon} size={16} color="#135918" />
                                                     <Text style={styles.quickActionText}>{item.text}</Text>
                                                 </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            )}
                        />

                        <View style={styles.inputContainer}>
                            <TextInput
                                value={inputText}
                                onChangeText={setInputText}
                                placeholder="Ask about bids, trends..."
                                style={styles.textInput}
                                multiline
                                maxLength={500}
                                // onSubmitEditing={sendMessage} // Can be less intuitive on mobile multiline
                                returnKeyType="send" // Changes return key visually
                                blurOnSubmit={false} // Keep keyboard open on intermediate submits if needed
                                onEndEditing={sendMessage} // Send when keyboard dismisses or return pressed if not multiline
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

                    </View>
                </KeyboardAvoidingView>
            </Animated.View>
        </>
    );
};

// --- Styles (Keep your existing styles, maybe adjust padding/margins) ---
const styles = StyleSheet.create({
    floatingButton: {
        position: 'absolute',
        zIndex: 1000,
        width: BUTTON_WIDTH, // Ensure the view itself has dimensions for layout calculation
        height: BUTTON_HEIGHT,
    },
    chatButton: {
        width: BUTTON_WIDTH,
        height: BUTTON_HEIGHT,
        // backgroundColor: 'transparent', // Image provides background
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
        backgroundColor: '#ff4444', // Brighter red
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1, // Add border for visibility
        borderColor: 'white',
    },
    badgeText: {
        color: 'white',
        fontSize: 11, // Slightly smaller
        fontWeight: 'bold',
    },
    chatModal: {
        position: 'absolute',
        top: 0, // Cover entire screen initially
        left: 0,
        right: 0,
        bottom: 0, // Cover entire screen initially
        backgroundColor: '#FFFEF7', // Cream background
        zIndex: 999,
        // Remove border radius if it covers full screen
    },
    container: {
        flex: 1,
        backgroundColor: '#FFFEF7', // Ensure container background matches modal
    },
     header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#135918',
        paddingTop: Platform.OS === 'ios' ? SAFE_TOP_MARGIN + 20 : SAFE_TOP_MARGIN, // Adjust top padding
        paddingBottom: 15,
        paddingHorizontal: 15, // Consistent padding
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
        marginRight: 10, // Adjusted margin
    },
    headerTitle: {
        color: 'white',
        fontSize: 15, // Slightly smaller
        fontWeight: '600', // Semibold
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 11, // Slightly smaller
    },
    closeButton: {
        padding: 8, // Increase touch area
    },
    statsBar: {
        flexDirection: 'row',
        backgroundColor: '#f0f9f0', // Light green background
        paddingVertical: 10, // Reduced padding
        paddingHorizontal: 10, // Reduced padding
        borderBottomWidth: 1,
        borderBottomColor: '#dceddc', // Lighter border
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 2, // Add small horizontal padding
    },
    statValue: {
        fontSize: 14, // Slightly smaller
        fontWeight: 'bold',
        color: '#135918',
    },
    pendingValue: {
        color: '#ff8800', // Orange for pending
    },
    statLabel: {
        fontSize: 9, // Smaller label
        color: '#555', // Darker gray
        marginTop: 2,
        textAlign: 'center',
    },
     messagesList: {
        flex: 1, // Takes remaining space
        paddingHorizontal: 15,
        paddingTop: 10, // Reduced top padding
    },
    messageContainer: {
        marginBottom: 10, // Reduced margin
        maxWidth: '85%', // Allow slightly wider bubbles
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
        paddingHorizontal: 14, // Adjusted padding
        paddingVertical: 9, // Adjusted padding
        borderRadius: 16, // Slightly less rounded
    },
    userMessageText: {
        backgroundColor: '#135918',
        color: 'white',
        borderBottomRightRadius: 4, // Sharper edge
    },
    botMessageText: {
        backgroundColor: '#ffffff', // White background
        color: '#333',
        borderBottomLeftRadius: 4, // Sharper edge
        borderWidth: 1,
        borderColor: '#e8e8e8', // Lighter border
    },
    typingContainer: {
        alignSelf: 'flex-start',
        marginBottom: 10,
    },
    typingBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderBottomLeftRadius: 4,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderWidth: 1,
        borderColor: '#e8e8e8',
    },
    typingText: {
        marginLeft: 8,
        color: '#555', // Darker thinking text
        fontSize: 14,
    },
    quickActionsContainer: {
        marginTop: 10, // Reduced margin
        marginBottom: 5,
        paddingHorizontal: 5, // Add horizontal padding
    },
    quickActionsTitle: {
        fontSize: 12,
        color: '#666',
        marginBottom: 8,
        marginLeft: 5,
    },
    quickActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f9f0', // Light green
        borderRadius: 10, // Slightly less rounded
        padding: 10, // Adjusted padding
        marginBottom: 6, // Reduced margin
        borderWidth: 1,
        borderColor: '#dceddc', // Lighter border
    },
    quickActionText: {
        marginLeft: 10, // Increased margin
        fontSize: 12,
        color: '#135918',
        flex: 1, // Ensure text wraps
    },
     inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end', // Align items to bottom for multiline input
        paddingHorizontal: 10, // Reduced padding
        paddingVertical: 8, // Reduced padding
        paddingBottom: Platform.OS === 'ios' ? 25 : 8, // More padding for iOS home indicator area
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        backgroundColor: '#ffffff', // White input area background
    },
    textInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#d0d0d0',
        borderRadius: 18, // More rounded input
        paddingHorizontal: 15,
        paddingVertical: Platform.OS === 'ios' ? 10 : 8, // Adjust padding per platform
        paddingTop: Platform.OS === 'ios' ? 10 : 8, // Ensure consistent top padding
        marginRight: 8, // Reduced margin
        maxHeight: 100, // Allow more lines
        fontSize: 14,
        backgroundColor: '#ffffff', // White input background
        textAlignVertical: 'center', // Center text vertically
    },
    sendButton: {
        backgroundColor: '#135918',
        borderRadius: 18, // Match input rounding
        width: 36, // Slightly smaller
        height: 36, // Slightly smaller
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Platform.OS === 'ios' ? 0 : 2, // Align better on Android
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
});

export default UpcycledUserAssistant;