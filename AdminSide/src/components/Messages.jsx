import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Search, Users, Bell, MoreVertical, Image, Paperclip, Smile, Check, CheckCheck, Clock, Filter, Package, ShoppingBag } from 'lucide-react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  where,
  getDoc,
  getDocs
} from 'firebase/firestore';
import { db, storage } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const AdminMessages = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [isTyping, setIsTyping] = useState(false);
  const [stats, setStats] = useState({
    activeChats: 0,
    pending: 0,
    resolvedToday: 0,
    avgResponse: '2m'
  });
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (event) => {
  const file = event.target.files[0];
  if (!file || !selectedChat?.id) return;

  try {
    setUploadingImage(true);

    // Upload to Firebase Storage
    const filename = `chat-images/${selectedChat.id}/${Date.now()}-${file.name}`;
    const imageRef = ref(storage, filename);
    
    await uploadBytes(imageRef, file);
    const downloadURL = await getDownloadURL(imageRef);

    // Send message with image
    const messagesRef = collection(db, 'conversations', selectedChat.id, 'messages');
    await addDoc(messagesRef, {
      senderId: 'admin',
      senderType: 'admin',
      imageUrl: downloadURL,
      type: 'image',
      timestamp: serverTimestamp(),
      status: 'delivered'
    });

    // Update conversation metadata
    const conversationRef = doc(db, 'conversations', selectedChat.id);
    const conversationDoc = await getDoc(conversationRef);
    const userUid = conversationDoc.data()?.userProfile?.uid;
    const currentUnread = conversationDoc.data()?.unreadCount?.[userUid] || 0;
    
    await updateDoc(conversationRef, {
      lastMessage: '📷 Photo',
      lastMessageTime: serverTimestamp(),
      [`unreadCount.${userUid}`]: currentUnread + 1,
    });

  } catch (error) {
    console.error('Upload error:', error);
    alert('Failed to send image');
  } finally {
    setUploadingImage(false);
  }
};

  // Listen to all conversations
  useEffect(() => {
    const conversationsRef = collection(db, 'conversations');
    const q = query(conversationsRef, orderBy('lastMessageTime', 'desc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const convos = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          
          // Get user's order count
          let orderCount = 0;
          try {
            const ordersQuery = query(
              collection(db, 'orders'),
              where('customerId', '==', data.userProfile?.uid)
            );
            const ordersSnapshot = await getDocs(ordersQuery);
            orderCount = ordersSnapshot.size;
          } catch (error) {
            console.error('Error fetching orders:', error);
          }

          return {
            id: docSnap.id,
            ...data,
            user: {
              name: data.userProfile?.name || 'Unknown User',
              email: data.userProfile?.email || '',
              avatar: data.userProfile?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U',
              status: 'online',
              orderCount
            },
            lastMessage: data.lastMessage || '',
            timestamp: formatTimestamp(data.lastMessageTime?.toDate()),
            unread: data.unreadCount?.admin || 0,
            type: data.status || 'inquiry',
            lastMessageTime: data.lastMessageTime?.toDate() || new Date(),
          };
        })
      );

      setConversations(convos);
      updateStats(convos);
    });

    return () => unsubscribe();
  }, []);

  // Listen to messages for selected conversation
  useEffect(() => {
    if (!selectedChat?.id) return;

    const messagesRef = collection(db, 'conversations', selectedChat.id, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date(),
      }));
      setMessages(msgs);
      scrollToBottom();
      markMessagesAsRead();
    });

    return () => unsubscribe();
  }, [selectedChat?.id]);

  const markMessagesAsRead = async () => {
    if (!selectedChat?.id) return;
    
    try {
      const conversationRef = doc(db, 'conversations', selectedChat.id);
      await updateDoc(conversationRef, {
        'unreadCount.admin': 0
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const formatTimestamp = (date) => {
    if (!date) return 'Just now';
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const updateStats = (convos) => {
    const activeChats = convos.filter(c => c.status === 'active').length;
    const pending = convos.filter(c => c.unread > 0).length;
    
    setStats({
      activeChats,
      pending,
      resolvedToday: convos.filter(c => c.status === 'resolved').length,
      avgResponse: '2m'
    });
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedChat?.id) return;

    const messageText = message.trim();
    setMessage('');
    setIsTyping(false);

    try {
      // Add message to Firestore
      const messagesRef = collection(db, 'conversations', selectedChat.id, 'messages');
      await addDoc(messagesRef, {
        senderId: 'admin',
        senderType: 'admin',
        text: messageText,
        timestamp: serverTimestamp(),
        status: 'delivered'
      });

      // Update conversation metadata
      const conversationRef = doc(db, 'conversations', selectedChat.id);
      const conversationDoc = await getDoc(conversationRef);
      const currentUnread = conversationDoc.data()?.unreadCount?.[conversationDoc.data()?.userProfile?.uid] || 0;
      
      await updateDoc(conversationRef, {
        lastMessage: messageText,
        lastMessageTime: serverTimestamp(),
        [`unreadCount.${conversationDoc.data()?.userProfile?.uid}`]: currentUnread + 1,
        adminTyping: false
      });

    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleTyping = (text) => {
    setMessage(text);
    
    if (!selectedChat?.id) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing indicator
    if (!isTyping && text.trim()) {
      setIsTyping(true);
      updateTypingStatus(true);
    }

    // Clear typing indicator after 2 seconds of no typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      updateTypingStatus(false);
    }, 2000);
  };

  const updateTypingStatus = async (typing) => {
    if (!selectedChat?.id) return;
    
    try {
      const conversationRef = doc(db, 'conversations', selectedChat.id);
      await updateDoc(conversationRef, {
        adminTyping: typing
      });
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'active': return 'text-red-600 bg-red-50';
      case 'inquiry': return 'text-blue-600 bg-blue-50';
      case 'resolved': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const handleResolveChat = async () => {
    if (!selectedChat?.id) return;
    
    try {
      const conversationRef = doc(db, 'conversations', selectedChat.id);
      await updateDoc(conversationRef, {
        status: 'resolved'
      });
    } catch (error) {
      console.error('Error resolving chat:', error);
    }
  };

  const filteredConversations = conversations
    .filter(conv => {
      const matchesSearch = conv.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          conv.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter = filterType === 'all' ? true :
                          filterType === 'active' ? conv.status === 'active' :
                          filterType === 'resolved' ? conv.status === 'resolved' : true;
      
      return matchesSearch && matchesFilter;
    });

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <MessageCircle className="text-green-600" size={28} />
                Admin Messaging Center
              </h1>
              <p className="text-sm text-gray-500 mt-1">Manage customer conversations in real-time</p>
            </div>
            <div className="flex items-center gap-4">
              <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell size={20} className="text-gray-600" />
                {stats.pending > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
              <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                  A
                </div>
                <span className="text-sm font-medium text-gray-700">Admin</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="px-6 pb-4 grid grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Active Chats</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.activeChats}</p>
              </div>
              <div className="w-10 h-10 bg-green-500 rounded-lg opacity-20"></div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Pending</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.pending}</p>
              </div>
              <div className="w-10 h-10 bg-yellow-500 rounded-lg opacity-20"></div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Resolved Today</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.resolvedToday}</p>
              </div>
              <div className="w-10 h-10 bg-blue-500 rounded-lg opacity-20"></div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Avg Response</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.avgResponse}</p>
              </div>
              <div className="w-10 h-10 bg-purple-500 rounded-lg opacity-20"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Conversations List */}
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
          {/* Search Bar */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2 mt-3">
              <button 
                onClick={() => setFilterType('all')}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  filterType === 'all' ? 'bg-green-600 text-white' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button 
                onClick={() => setFilterType('active')}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  filterType === 'active' ? 'bg-green-600 text-white' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Active
              </button>
              <button 
                onClick={() => setFilterType('resolved')}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  filterType === 'resolved' ? 'bg-green-600 text-white' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Resolved
              </button>
              <button className="p-1.5 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                <Filter size={16} />
              </button>
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedChat(conv)}
                className={`p-4 border-b border-gray-100 cursor-pointer transition-all hover:bg-gray-50 ${
                  selectedChat?.id === conv.id ? 'bg-green-50 border-l-4 border-l-green-600' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold">
                      {conv.user.avatar}
                    </div>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 ${getStatusColor(conv.user.status)} rounded-full border-2 border-white`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold text-gray-800 truncate">{conv.user.name}</h3>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{conv.timestamp}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 truncate">{conv.lastMessage || 'No messages yet'}</p>
                      {conv.unread > 0 && (
                        <span className="ml-2 flex-shrink-0 w-5 h-5 bg-green-600 text-white text-xs rounded-full flex items-center justify-center font-medium">
                          {conv.unread}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${getTypeColor(conv.type)}`}>
                        {conv.type}
                      </span>
                      {conv.user.orderCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <Package size={12} />
                          {conv.user.orderCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold">
                      {selectedChat.user.avatar}
                    </div>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 ${getStatusColor(selectedChat.user.status)} rounded-full border-2 border-white`}></div>
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-800">{selectedChat.user.name}</h2>
                    <p className="text-xs text-gray-500">{selectedChat.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleResolveChat}
                    className="px-4 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    Mark Resolved
                  </button>
                  <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <MoreVertical size={20} />
                  </button>
                </div>
              </div>

              {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => {
                const isWinNotification = msg.type === 'win_notification';
                
                return (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-md ${msg.senderType === 'admin' ? 'order-2' : 'order-1'}`}>
                      <div
                        className={`px-4 py-3 rounded-2xl ${
                          isWinNotification 
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white border-2 border-green-400'
                            : msg.senderType === 'admin'
                            ? 'bg-green-600 text-white rounded-br-sm'
                            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                        }`}
                      >
                        {/* Show image if exists (for both win notifications and regular images) */}
                        {msg.imageUrl && (
                          <img 
                            src={msg.imageUrl} 
                            alt="Product image"
                            className="max-w-full h-auto rounded-lg mb-2"
                            style={{ maxWidth: '300px', maxHeight: '300px' }}
                          />
                        )}
                        
                        {/* Show text if exists */}
                        {msg.text && (
                          <p className={`text-sm leading-relaxed ${isWinNotification ? 'font-semibold' : ''}`}>
                            {msg.text}
                          </p>
                        )}
                        
                        {/* Win notification badge */}
                        {isWinNotification && (
                          <div className="mt-2 inline-flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full text-xs">
                            🏆 Auction Won
                          </div>
                        )}
                      </div>
                      <div className={`flex items-center gap-1 mt-1 px-1 ${msg.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-xs text-gray-500">
                          {msg.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                        {msg.senderType === 'admin' && (
                          <span className="text-green-600">
                            {msg.status === 'read' ? <CheckCheck size={14} /> : 
                            msg.status === 'delivered' ? <CheckCheck size={14} /> : 
                            <Check size={14} />}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

              {/* Input Area */}
              <div className="bg-white border-t border-gray-200 p-4">
                <div className="flex items-end gap-3">
                  <div className="flex gap-2">
                          <label className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
                            {uploadingImage ? (
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                            ) : (
                              <Image size={20} />
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                              disabled={uploadingImage}
                            />
                          </label>
                  </div>
                  <div className="flex-1 relative">
                    <textarea
                      value={message}
                      onChange={(e) => handleTyping(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type your message..."
                      rows="1"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                      style={{ minHeight: '48px', maxHeight: '120px' }}
                    />
                  </div>
                  <button 
                    onClick={handleSendMessage}
                    disabled={!message.trim()}
                    className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center gap-2 font-medium shadow-lg shadow-green-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={18} />
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle size={40} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Select a conversation</h3>
                <p className="text-sm text-gray-500">Choose a conversation from the list to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMessages;