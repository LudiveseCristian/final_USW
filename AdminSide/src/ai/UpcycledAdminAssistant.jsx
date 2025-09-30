import React, { useState, useRef, useEffect } from "react";
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
} from "firebase/firestore";
import { db } from "../firebase/config";
import { 
  X, 
  Send, 
  MessageCircle,
  BarChart3,
  Users,
  Package,
  ShoppingBag,
  FileText,
  TrendingUp,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react";

const UpcycledAdminAssistant = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const chatEndRef = useRef(null);
  // Admin data states
  const [adminStats, setAdminStats] = useState({
    totalCustomers: 0,
    totalOrders: 0,
    totalProducts: 0,
    monthlyRevenue: 0,
    pendingOrders: 0,
    availableItems: 0,
    soldItems: 0,
    todayOrders: 0,
    todayRevenue: 0,
    topProducts: [],
    recentCustomers: []
  });
  const GEMINI_API_KEY = import.meta.env.REACT_APP_GEMINI_API_KEY || 'AIzaSyAaPvPC74fmPjlUiUNZxKihfSOC01Ud76g';
  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      initializeChat();
    }
  }, [isOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // Load admin statistics when component mounts and set up real-time updates
    loadAdminStats();
    const interval = setInterval(loadAdminStats, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const initializeChat = () => {
    const welcomeMessage = {
      id: 1,
      text: "Hello Admin! I'm your intelligent Upcycled Streetwear assistant powered by AI. I can help you with real-time data analysis, customer management, order processing, inventory tracking, and much more. Just ask me anything about your business!",
      sender: 'bot',
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  };

  // Enhanced admin statistics loader with more detailed data
  const loadAdminStats = async () => {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Customers
      const customersQuery = query(collection(db, 'users'));
      const customersSnap = await getDocs(customersQuery);

      // Recent customers (last 7 days)
      const recentCustomersQuery = query(
        collection(db, 'users'),
        where('createdAt', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const recentCustomersSnap = await getDocs(recentCustomersQuery);

      // Orders analysis
      const ordersQuery = query(collection(db, 'orders'));
      const ordersSnap = await getDocs(ordersQuery);
      
      let monthlyRevenue = 0;
      let todayRevenue = 0;
      let pendingOrders = 0;
      let todayOrders = 0;
      const productSales = {};

      ordersSnap.docs.forEach(doc => {
        const orderData = doc.data();
        const orderDate = orderData.createdAt?.toDate() || new Date(orderData.createdAt);
        
        // Monthly revenue
        if (orderDate >= startOfMonth) {
          monthlyRevenue += orderData.total || 0;
        }
        
        // Today's metrics
        if (orderDate >= startOfDay) {
          todayRevenue += orderData.total || 0;
          todayOrders++;
        }
        
        // Pending orders
        if (orderData.status === 'pending') {
          pendingOrders++;
        }

        // Product popularity
        if (orderData.items) {
          orderData.items.forEach(item => {
            productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
          });
        }
      });

      // Products and inventory
      const productsQuery = query(collection(db, 'products'));
      const productsSnap = await getDocs(productsQuery);
      let availableItems = 0;
      let soldItems = 0;

      productsSnap.docs.forEach(doc => {
        const productData = doc.data();
        if (productData.status === "available") {
          availableItems++;
        } else if (productData.status === "sold") {
          soldItems++;
        }
      });

      // Top products
      const topProducts = Object.entries(productSales)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name, sales]) => ({ name, sales }));

      setAdminStats({
        totalCustomers: customersSnap.size,
        totalOrders: ordersSnap.size,
        totalProducts: productsSnap.size,
        monthlyRevenue,
        todayRevenue,
        pendingOrders,
        todayOrders,
        availableItems,
        soldItems,
        topProducts,
        recentCustomers: recentCustomersSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      });
    } catch (error) {
      console.error('Error loading admin stats:', error);
    }
  };

  // Get specific data based on user query
  const getContextualData = async (query) => {
    const lowerQuery = query.toLowerCase();
    let contextData = { stats: adminStats };

    try {
      // Orders context
      if (lowerQuery.includes('order') || lowerQuery.includes('claim') || lowerQuery.includes('sale')) {
        const ordersQuery = query(
          collection(db, 'orders'),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        const ordersSnap = await getDocs(ordersQuery);
        contextData.recentOrders = ordersSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }

      // Customer context
      if (lowerQuery.includes('customer') || lowerQuery.includes('user')) {
        const customersQuery = query(
          collection(db, 'users'),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        const customersSnap = await getDocs(customersQuery);
        contextData.customers = customersSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }

      // Product context
      if (lowerQuery.includes('product') || lowerQuery.includes('inventory') || lowerQuery.includes('stock')) {
        const productsQuery = query(collection(db, 'products'));
        const productsSnap = await getDocs(productsQuery);
        contextData.products = productsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }

      // Low stock specific
      if (lowerQuery.includes('low stock') || lowerQuery.includes('inventory alert')) {
        const lowStockQuery = query(
          collection(db, 'products'),
          where('quantity', '<=', 5)
        );
        const lowStockSnap = await getDocs(lowStockQuery);
        contextData.lowStockProducts = lowStockSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }

      // News/announcements context
      if (lowerQuery.includes('news') || lowerQuery.includes('announcement')) {
        const newsQuery = query(
          collection(db, 'news'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const newsSnap = await getDocs(newsQuery);
        contextData.news = newsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }

    } catch (error) {
      console.error('Error getting contextual data:', error);
    }

    return contextData;
  };

  // Call Gemini AI with context
  const callGeminiAI = async (userMessage, contextData) => {
    try {
      const systemPrompt = `You are an intelligent admin assistant for "Upcycled Streetwear", a sustainable fashion e-commerce platform with bidding features.
CONTEXT DATA:
- Total Customers: ${contextData.stats.totalCustomers}
- Total Orders: ${contextData.stats.totalOrders}
- Total Products: ${contextData.stats.totalProducts}
- Monthly Revenue: ₱${contextData.stats.monthlyRevenue.toLocaleString()}
- Today's Revenue: ₱${contextData.stats.todayRevenue.toLocaleString()}
- Today's Orders: ${contextData.stats.todayOrders}
- Pending Orders: ${contextData.stats.pendingOrders}
- Available Items: ${contextData.stats.availableItems}
- Sold Items: ${contextData.stats.soldItems}
- Top Products: ${contextData.stats.topProducts.map(p => `${p.name} (${p.sales} orders)`).join(', ')}

DATABASE STRUCTURE NOTES:
- Orders use 'date' field (not createdAt), 'price' field (not total), single product per order
- Products can have bidding enabled with bids array, status: 'sold' or 'available'
- Users have detailed profiles with firstName, lastName, middleName, totalOrders, totalSpent
- News items have mainImage and secondaryImages arrays

${contextData.recentOrders ?
`RECENT ORDERS: ${JSON.stringify(contextData.recentOrders.slice(0, 5).map(order => ({
  id: order.id.slice(-6),
  customer: order.customerName,
  product: order.product,
  price: order.price,
  status: order.status,
  address: order.address,
  date: order.date
})))}` : ''}

${contextData.customers ?
`CUSTOMERS: ${JSON.stringify(contextData.customers.slice(0, 5).map(user => ({
  name: user.name,
  email: user.email,
  status: user.status,
  totalOrders: user.totalOrders,
  totalSpent: user.totalSpent,
  joinDate: user.joinDate
})))}` : ''}

${contextData.products ?
`PRODUCTS: ${JSON.stringify(contextData.products.slice(0, 10).map(product => ({
  name: product.name,
  price: product.price,
  status: product.status,
  category: product.category,
  condition: product.condition,
  biddingEnabled: product.biddingEnabled,
  currentBid: product.currentBid,
  highestBidder: product.highestBidder
})))}` : ''}

${contextData.biddingProducts ?
`BIDDING PRODUCTS: ${JSON.stringify(contextData.biddingProducts)}` : ''}
${contextData.soldProducts ? `SOLD PRODUCTS: ${JSON.stringify(contextData.soldProducts.slice(0, 5))}` : ''}
${contextData.news ?
`NEWS: ${JSON.stringify(contextData.news.map(news => ({
  title: news.title,
  description: news.description,
  createdAt: news.createdAt
})))}` : ''}

GUIDELINES:
1. Use the provided CONTEXT DATA to answer the user's query directly.
2. Be factual and to the point. Do not provide extra insights, suggestions, or conversational filler.
3. Do not use emojis or extensive formatting. Present the information clearly and concisely.
4. Ensure all information is supported by the provided CONTEXT DATA.
5. Format currency in Philippine Peso (₱).

USER QUERY: ${userMessage}

Respond as the admin assistant with specific data-driven insights:`;
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
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 512,
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
      throw error;
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    // Check if API key is configured
    if (GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
      const errorMessage = {
        id: Date.now() + 1,
        text: "⚠️ Please configure your Gemini API key in the environment variables (REACT_APP_GEMINI_API_KEY) to enable AI features. Get your free API key at: https://makersuite.google.com/app/apikey",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    try {
      setLoading(true);
      setIsBotTyping(true);

      // Add user message
      const userMessage = {
        id: Date.now(),
        text: inputText,
        sender: "user",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      const currentInput = inputText;
      setInputText("");

      // Get contextual data based on user query
      const contextData = await getContextualData(currentInput);

      // Call Gemini AI
      const aiResponse = await callGeminiAI(currentInput, contextData);

      const botMessage = {
        id: Date.now() + 1,
        text: aiResponse,
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error("AI Error:", error);
      let errorText = "I'm having trouble processing your request right now. ";
      if (error.message.includes('API key')) {
        errorText += "Please check your API key configuration.";
      } else if (error.message.includes('quota')) {
        errorText += "API quota exceeded. Please try again later.";
      } else {
        errorText += "Please try again in a moment.";
      }

      const errorMessage = {
        id: Date.now() + 1,
        text: errorText,
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setIsBotTyping(false);
    }
  };

  const quickAdminActions = [
    { text: "Show today's sales performance", icon: <DollarSign size={16} /> },
    { text: "What orders need immediate attention?", icon: <AlertTriangle size={16} /> },
    { text: "Which products are running low on stock?", icon: <Package size={16} /> },
    { text: "Show me customer insights this week", icon: <Users size={16} /> },
    { text: "Help me plan a new product announcement", icon: <Calendar size={16} /> },
  ];

  const sendQuickAction = (action) => {
    setInputText(action);
    setTimeout(() => sendMessage(), 100);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 relative"
          style={{ backgroundColor: '#135918' }}
        >
          <MessageCircle size={24} />
          {adminStats.pendingOrders > 0 && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
              {adminStats.pendingOrders}
            </div>
          )}
        </button>
      )}

      {/* Chat Modal */}
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl w-96 h-[500px] flex flex-col border-2 border-green-100"
             style={{ backgroundColor: '#FFFEF7' }}>
          {/* Header */}
          <div className="p-4 rounded-t-2xl flex items-center justify-between"
               style={{ backgroundColor: '#135918' }}>
            <div 
className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <BarChart3 size={16} className="text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">AI Admin Assistant</h3>
                <p className="text-green-100 text-xs">Powered by Gemini AI</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-green-200 p-1 rounded"
            >
              <X size={20} />
            </button>
          </div>

          {/* Enhanced Stats Bar */}
          <div className="px-4 py-3 bg-green-50 border-b border-green-100">
            <div className="grid grid-cols-5 gap-2 text-xs">
              <div className="text-center">
                <div className="font-bold text-green-800">{adminStats.todayOrders}</div>
                <div className="text-green-600">Today</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-green-800 flex items-center justify-center gap-1">
                  {adminStats.pendingOrders}
                  {adminStats.pendingOrders > 0 && <Clock size={10} className="text-orange-500" />}
                </div>
                <div className="text-green-600">Pending</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-green-800">{adminStats.availableItems}</div>
                <div className="text-green-600">Available</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-green-800">{adminStats.soldItems}</div>
                <div className="text-green-600">Sold</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-green-800">₱{(adminStats.todayRevenue / 1000).toFixed(1)}k</div>
                <div className="text-green-600">Revenue</div>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.sender === "user" ?
"justify-end" : "justify-start"}`}
              >
                <div
                  className={`p-3 rounded-2xl max-w-xs text-sm ${
                    msg.sender === "user"
                      ? "text-white rounded-br-sm"
                      : "bg-gray-50 text-gray-800 rounded-bl-sm border border-green-100"
                  }`}
                  style={msg.sender === "user" ?
{ backgroundColor: '#135918' } : {}}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}

            {isBotTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-50 border border-green-100 p-3 rounded-2xl rounded-bl-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            {messages.length <= 1 && (
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-2">Quick Questions:</p>
                <div className="space-y-2">
                  {quickAdminActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => sendQuickAction(action.text)}
                      className="w-full p-2 text-left text-xs bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 flex items-center gap-2 transition-colors"
                    >
                      {action.icon}
                      {action.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-green-100">
            <div className="flex items-end gap-2">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask anything about your business..."
                className="flex-1 px-3 py-2 text-sm border border-green-200 rounded-xl resize-none focus:outline-none 
focus:ring-2 focus:ring-green-300 bg-white max-h-20"
                rows="1"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <button
                onClick={sendMessage}
                disabled={loading ||
!inputText.trim()}
                className="p-2 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ backgroundColor: '#135918' }}
              >
                {loading ?
(
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpcycledAdminAssistant;