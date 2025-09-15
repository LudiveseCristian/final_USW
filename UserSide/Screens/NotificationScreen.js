import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const NotificationScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, unread, read

  // Sample notification data
  const sampleNotifications = [
    {
      id: '1',
      title: 'Order Confirmed',
      message: 'Your order #12345 has been confirmed and is being prepared.',
      type: 'order',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      read: false,
      icon: 'checkmark-circle',
    },
    {
      id: '2',
      title: 'Order Out for Delivery',
      message: 'Your order #12344 is out for delivery. Expected delivery in 20 minutes.',
      type: 'delivery',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      read: false,
      icon: 'bicycle',
    },
    {
      id: '3',
      title: 'New Message',
      message: 'You have a new message from customer support.',
      type: 'message',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      read: true,
      icon: 'chatbubble-ellipses',
    },
    {
      id: '4',
      title: 'Order Delivered',
      message: 'Your order #12343 has been successfully delivered. Thank you for choosing us!',
      type: 'delivered',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      read: true,
      icon: 'checkmark-done-circle',
    },
    {
      id: '5',
      title: 'Special Offer',
      message: 'Get 20% off on your next order. Valid until tomorrow!',
      type: 'promotion',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      read: false,
      icon: 'gift',
    },
  ];

  useEffect(() => {
    setNotifications(sampleNotifications);
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setNotifications([...sampleNotifications]);
      setRefreshing(false);
    }, 2000);
  }, []);

  const markAsRead = (id) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const deleteNotification = (id) => {
    setNotifications(prev =>
      prev.filter(notification => notification.id !== id)
    );
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return `${days}d ago`;
    }
  };

  const getFilteredNotifications = () => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.read);
      case 'read':
        return notifications.filter(n => n.read);
      default:
        return notifications;
    }
  };

  const getNotificationIcon = (type, iconName) => {
    const iconColors = {
      order: '#135918',
      delivery: '#FF6B35',
      message: '#4A90E2',
      delivered: '#135918',
      promotion: '#F39C12',
    };

    return (
      <View style={[styles.iconContainer, { backgroundColor: iconColors[type] + '20' }]}>
        <Ionicons name={iconName} size={24} color={iconColors[type]} />
      </View>
    );
  };

  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.read && styles.unreadItem
      ]}
      onPress={() => markAsRead(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        {getNotificationIcon(item.type, item.icon)}
        
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.notificationTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.read && <View style={styles.unreadDot} />}
          </View>
          
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {item.message}
          </Text>
          
          <Text style={styles.timestamp}>
            {getTimeAgo(item.timestamp)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteNotification(item.id)}
        >
          <Ionicons name="close" size={20} color="#999" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const FilterButton = ({ label, value, active }) => (
    <TouchableOpacity
      style={[styles.filterButton, active && styles.activeFilterButton]}
      onPress={() => setFilter(value)}
    >
      <Text style={[styles.filterButtonText, active && styles.activeFilterButtonText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FilterButton label="All" value="all" active={filter === 'all'} />
        <FilterButton 
          label={`Unread ${unreadCount > 0 ? `(${unreadCount})` : ''}`} 
          value="unread" 
          active={filter === 'unread'} 
        />
        <FilterButton label="Read" value="read" active={filter === 'read'} />
      </View>

      {/* Notifications List */}
      <FlatList
        data={getFilteredNotifications()}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#135918']}
            tintColor="#135918"
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No notifications found</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'unread' 
                ? "You're all caught up!" 
                : "Pull down to refresh"}
            </Text>
          </View>
        )}
        contentContainerStyle={
          getFilteredNotifications().length === 0 ? styles.emptyList : {}
        }
      />
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
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#135918',
  },
  markAllText: {
    color: '#FFFCF3',
    fontSize: 12,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFCF3',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  activeFilterButton: {
    backgroundColor: '#135918',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeFilterButtonText: {
    color: '#FFFCF3',
  },
  notificationItem: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#135918',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#135918',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  deleteButton: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
});

export default NotificationScreen;