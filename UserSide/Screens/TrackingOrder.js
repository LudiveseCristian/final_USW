import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const ChatScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'track'
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const flatListRef = useRef();

  // Sample chat messages
  const initialMessages = [
    {
      id: '1',
      text: 'Hello! How can I help you today?',
      sender: 'admin',
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
      type: 'text',
    },
    {
      id: '2',
      text: 'Hi, I have a question about my order.',
      sender: 'user',
      timestamp: new Date(Date.now() - 9 * 60 * 1000),
      type: 'text',
    },
    {
      id: '3',
      text: 'Sure! What\'s your order number?',
      sender: 'admin',
      timestamp: new Date(Date.now() - 8 * 60 * 1000),
      type: 'text',
    },
  ];

  // Sample orders for tracking
  const orders = [
    {
      id: '12345',
      status: 'preparing',
      items: ['Burger Deluxe', 'Fries', 'Coke'],
      total: '$24.99',
      orderTime: new Date(Date.now() - 30 * 60 * 1000),
      estimatedDelivery: new Date(Date.now() + 20 * 60 * 1000),
      driverName: 'John Smith',
      driverPhone: '+1234567890',
      address: '123 Main St, City',
      trackingSteps: [
        { step: 'Order Placed', completed: true, time: new Date(Date.now() - 30 * 60 * 1000) },
        { step: 'Preparing', completed: true, time: new Date(Date.now() - 25 * 60 * 1000) },
        { step: 'Ready for Pickup', completed: false, time: null },
        { step: 'Out for Delivery', completed: false, time: null },
        { step: 'Delivered', completed: false, time: null },
      ],
    },
    {
      id: '12344',
      status: 'delivered',
      items: ['Pizza Margherita', 'Garlic Bread'],
      total: '$19.99',
      orderTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
      estimatedDelivery: new Date(Date.now() - 1 * 60 * 60 * 1000),
      driverName: 'Mike Johnson',
      driverPhone: '+1234567891',
      address: '456 Oak Ave, City',
      trackingSteps: [
        { step: 'Order Placed', completed: true, time: new Date(Date.now() - 2 * 60 * 60 * 1000) },
        { step: 'Preparing', completed: true, time: new Date(Date.now() - 110 * 60 * 1000) },
        { step: 'Ready for Pickup', completed: true, time: new Date(Date.now() - 90 * 60 * 1000) },
        { step: 'Out for Delivery', completed: true, time: new Date(Date.now() - 80 * 60 * 1000) },
        { step: 'Delivered', completed: true, time: new Date(Date.now() - 60 * 60 * 1000) },
      ],
    },
  ];

  useEffect(() => {
    setMessages(initialMessages);
  }, []);

  const sendMessage = () => {
    if (message.trim() === '') return;

    const newMessage = {
      id: Date.now().toString(),
      text: message.trim(),
      sender: 'user',
      timestamp: new Date(),
      type: 'text',
    };

    setMessages(prev => [...prev, newMessage]);
    setMessage('');
    
    // Simulate admin typing
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const adminReply = {
        id: (Date.now() + 1).toString(),
        text: 'Thanks for your message! I\'ll help you with that.',
        sender: 'admin',
        timestamp: new Date(),
        type: 'text',
      };
      setMessages(prev => [...prev, adminReply]);
    }, 2000);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatOrderTime = (date) => {
    return date.toLocaleString([], { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'preparing': return '#FF6B35';
      case 'ready': return '#135918';
      case 'delivering': return '#4A90E2';
      case 'delivered': return '#135918';
      default: return '#666';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'preparing': return 'Being Prepared';
      case 'ready': return 'Ready for Pickup';
      case 'delivering': return 'Out for Delivery';
      case 'delivered': return 'Delivered';
      default: return 'Unknown';
    }
  };

  const renderMessage = ({ item }) => (
    <View style={[
      styles.messageContainer,
      item.sender === 'user' ? styles.userMessage : styles.adminMessage
    ]}>
      <Text style={[
        styles.messageText,
        item.sender === 'user' ? styles.userMessageText : styles.adminMessageText
      ]}>
        {item.text}
      </Text>
      <Text style={[
        styles.messageTime,
        item.sender === 'user' ? styles.userMessageTime : styles.adminMessageTime
      ]}>
        {formatTime(item.timestamp)}
      </Text>
    </View>
  );

  const renderOrderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => {
        setSelectedOrder(item);
        setOrderModalVisible(true);
      }}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderNumber}>Order #{item.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>
      
      <Text style={styles.orderItems}>
        {item.items.join(', ')}
      </Text>
      
      <View style={styles.orderFooter}>
        <Text style={styles.orderTotal}>{item.total}</Text>
        <Text style={styles.orderTime}>
          {formatOrderTime(item.orderTime)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderTrackingStep = ({ item, index }) => (
    <View style={styles.trackingStep}>
      <View style={styles.trackingIconContainer}>
        <View style={[
          styles.trackingIcon,
          { backgroundColor: item.completed ? '#135918' : '#E0E0E0' }
        ]}>
          {item.completed && (
            <Ionicons name="checkmark" size={16} color="#FFFCF3" />
          )}
        </View>
        {index < selectedOrder?.trackingSteps.length - 1 && (
          <View style={[
            styles.trackingLine,
            { backgroundColor: item.completed ? '#135918' : '#E0E0E0' }
          ]} />
        )}
      </View>
      
      <View style={styles.trackingContent}>
        <Text style={[
          styles.trackingStepText,
          { color: item.completed ? '#135918' : '#666' }
        ]}>
          {item.step}
        </Text>
        {item.time && (
          <Text style={styles.trackingTime}>
            {formatOrderTime(item.time)}
          </Text>
        )}
      </View>
    </View>
  );

  const ChatTab = () => (
    <KeyboardAvoidingView 
      style={styles.chatContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      />
      
      {isTyping && (
        <View style={styles.typingIndicator}>
          <Text style={styles.typingText}>Admin is typing...</Text>
        </View>
      )}
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={message}
          onChangeText={setMessage}
          placeholder="Type your message..."
          placeholderTextColor="#999"
          multiline
          maxLength={500}
        />
        <TouchableOpacity 
          style={[styles.sendButton, { opacity: message.trim() ? 1 : 0.5 }]}
          onPress={sendMessage}
          disabled={!message.trim()}
        >
          <Ionicons name="send" size={20} color="#FFFCF3" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  const TrackTab = () => (
    <View style={styles.trackContainer}>
      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.ordersContainer}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>No orders found</Text>
            <Text style={styles.emptyStateSubtext}>Your orders will appear here</Text>
          </View>
        )}
      />
    </View>
  );

  const OrderTrackingModal = () => (
    <Modal
      visible={orderModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setOrderModalVisible(false)}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Order Details</Text>
          <View style={{ width: 24 }} />
        </View>
        
        {selectedOrder && (
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.orderDetailsCard}>
              <Text style={styles.orderDetailsNumber}>Order #{selectedOrder.id}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedOrder.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(selectedOrder.status) }]}>
                  {getStatusText(selectedOrder.status)}
                </Text>
              </View>
            </View>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Order Items</Text>
              {selectedOrder.items.map((item, index) => (
                <Text key={index} style={styles.itemText}>• {item}</Text>
              ))}
              <Text style={styles.totalText}>Total: {selectedOrder.total}</Text>
            </View>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Delivery Information</Text>
              <Text style={styles.infoText}>Address: {selectedOrder.address}</Text>
              <Text style={styles.infoText}>Driver: {selectedOrder.driverName}</Text>
              <Text style={styles.infoText}>Phone: {selectedOrder.driverPhone}</Text>
              <Text style={styles.infoText}>
                Estimated Delivery: {formatOrderTime(selectedOrder.estimatedDelivery)}
              </Text>
            </View>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Order Status</Text>
              <FlatList
                data={selectedOrder.trackingSteps}
                renderItem={renderTrackingStep}
                keyExtractor={(item, index) => index.toString()}
                scrollEnabled={false}
              />
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Support</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color="#135918" />
        </TouchableOpacity>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'chat' && styles.activeTab]}
          onPress={() => setActiveTab('chat')}
        >
          <Ionicons 
            name="chatbubble-outline" 
            size={20} 
            color={activeTab === 'chat' ? '#FFFCF3' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'chat' && styles.activeTabText]}>
            Chat
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'track' && styles.activeTab]}
          onPress={() => setActiveTab('track')}
        >
          <Ionicons 
            name="location-outline" 
            size={20} 
            color={activeTab === 'track' ? '#FFFCF3' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'track' && styles.activeTabText]}>
            Order Track
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'chat' ? <ChatTab /> : <TrackTab />}
      
      {/* Order Tracking Modal */}
      <OrderTrackingModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFCF3',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#135918',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    margin: 16,
    borderRadius: 25,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: '#135918',
  },
  tabText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#FFFCF3',
  },
  
  // Chat Tab Styles
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: 4,
    padding: 12,
    borderRadius: 16,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#135918',
    borderBottomRightRadius: 4,
  },
  adminMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8E8E8',
  }
});

export default ChatScreen;