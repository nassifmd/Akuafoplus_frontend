import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Config from '../Config/config';
import Icon from 'react-native-vector-icons/Feather';

const { width } = Dimensions.get('window');

// Define navigation types
type RootStackParamList = {
  Dashboard: undefined;
  OrderDetail: { orderId: string };
  ProductDetail: { productId: string };
  PaymentStatus: { orderId: string; clientReference?: string }; // Add this line
};

type OrderScreenNavigationProp = StackNavigationProp<RootStackParamList>;

interface OrderItem {
  _id: string;
  product: {
    _id: string;
    name: string;
    images: string[];
  };
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

interface Order {
  _id: string;
  items: OrderItem[];
  totalPrice: number;
  status: string;
  isPaid: boolean;
  paymentMethod: string;
  createdAt: string;
  shippingAddress: {
    street: string;
    city: string;
    region: string;
    postalCode: string;
  };
}

const OrderScreen = () => {
  const navigation = useNavigation<OrderScreenNavigationProp>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  const showAlert = (title: string, message: string, type: 'success' | 'error' = 'success') => {
    Alert.alert(title, message);
  };

  // Add this function to navigate to payment status
  const navigateToPaymentStatus = (orderId: string, clientReference?: string) => {
    navigation.navigate('PaymentStatus', { orderId, clientReference });
  };

  // Add these functions for payment actions
  const retryPayment = async (orderId: string) => {
    try {
      const headers = await getAuthHeaders();
      
      Alert.alert(
        'Retry Payment',
        'Do you want to retry payment for this order?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Retry', 
            onPress: async () => {
              try {
                const response = await axios.post(
                  `${Config.API_BASE_URL}/payments/initiate`,
                  { orderId },
                  { headers }
                );

                if (response.data.status === 'success') {
                  showAlert('Success', 'Payment initiated! Please check your phone.');
                } else {
                  showAlert('Error', 'Failed to initiate payment', 'error');
                }
              } catch (error) {
                console.error('❌ Error retrying payment:', error);
                showAlert('Error', 'Failed to retry payment', 'error');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error in retry payment:', error);
    }
  };

  const checkOrderPaymentStatus = async (orderId: string) => {
    try {
      const headers = await getAuthHeaders();
      
      const response = await axios.get(
        `${Config.API_BASE_URL}/payments/verify/${orderId}`,
        { headers }
      );

      if (response.data.status === 'success') {
        const status = response.data.data.paymentStatus;
        
        Alert.alert(
          'Payment Status',
          `Current payment status: ${status}`,
          [
            { text: 'OK' },
            ...(status === 'Pending' ? [{ 
              text: 'Retry Payment', 
              onPress: () => retryPayment(orderId) 
            }] : [])
          ]
        );
        
        // Refresh orders to get updated status
        if (status === 'Completed') {
          fetchOrders();
        }
      }
    } catch (error) {
      console.error('❌ Error checking payment status:', error);
      showAlert('Error', 'Failed to check payment status', 'error');
    }
  };

  const fetchOrders = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(`${Config.API_BASE_URL}/orders/my-orders`, {
        headers,
      });

      if (response.data.status === 'success') {
        setOrders(response.data.data.orders);
      }
    } catch (error) {
      console.error('❌ Error fetching orders:', error);
      showAlert('Error', 'Failed to fetch orders', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchOrders();
    }, [])
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return '#FF9800';
      case 'processing':
        return '#2196F3';
      case 'shipped':
        return '#9C27B0';
      case 'delivered':
        return '#4CAF50';
      case 'cancelled':
        return '#F44336';
      default:
        return '#666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'clock';
      case 'processing':
        return 'package';
      case 'shipped':
        return 'truck';
      case 'delivered':
        return 'check-circle';
      case 'cancelled':
        return 'x-circle';
      default:
        return 'info';
    }
  };

  const renderOrderItem = ({ item }: { item: Order }) => {
    const firstItem = item.items[0];
    const additionalItemsCount = item.items.length - 1;

    // Add this inside the renderOrderItem function, just before the return statement:
    console.log('Order Debug:', {
      orderId: item._id,
      isPaid: item.isPaid,
      paymentMethod: item.paymentMethod,
      shouldShowButtons: !item.isPaid && item.paymentMethod === 'Hubtel'
    });

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => navigation.navigate('OrderDetail', { orderId: item._id })}
      >
        {/* Order Header */}
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderId}>Order #{item._id.slice(-8).toUpperCase()}</Text>
            <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Icon name={getStatusIcon(item.status)} size={12} color="white" />
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        {/* Order Items Preview */}
        <View style={styles.itemsPreview}>
          {firstItem && (
            <Image
              source={{ uri: firstItem.image || firstItem.product?.images?.[0] }}
              style={styles.itemImage}
              resizeMode="cover"
            />
          )}
          <View style={styles.itemDetails}>
            <Text style={styles.itemName} numberOfLines={1}>
              {firstItem?.name || firstItem?.product?.name || 'Product'}
            </Text>
            <Text style={styles.itemQuantity}>Qty: {firstItem?.quantity || 1}</Text>
            {additionalItemsCount > 0 && (
              <Text style={styles.moreItems}>
                +{additionalItemsCount} more item{additionalItemsCount > 1 ? 's' : ''}
              </Text>
            )}
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.orderSummary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Payment:</Text>
            <View style={styles.paymentStatus}>
              <Icon 
                name={item.isPaid ? 'check-circle' : 'clock'} 
                size={14} 
                color={item.isPaid ? '#4CAF50' : '#FF9800'} 
              />
              <Text style={[styles.paymentText, { color: item.isPaid ? '#4CAF50' : '#FF9800' }]}>
                {item.isPaid ? 'Paid' : 'Pending'}
              </Text>
            </View>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total:</Text>
            <Text style={styles.totalAmount}>GH₵{item.totalPrice.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Items:</Text>
            <Text style={styles.summaryValue}>{item.items.length}</Text>
          </View>
        </View>

        {/* Delivery Address */}
        <View style={styles.deliveryInfo}>
          <Icon name="map-pin" size={14} color="#666" />
          <Text style={styles.deliveryText} numberOfLines={1}>
            {item.shippingAddress.city}, {item.shippingAddress.region}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.viewButton}>
            <Text style={styles.viewButtonText}>View Details</Text>
            <Icon name="chevron-right" size={16} color="#2E7D32" />
          </TouchableOpacity>
          
          {/* Add payment action buttons for unpaid orders */}
          {!item.isPaid && item.paymentMethod === 'Hubtel' && (
            <View style={styles.paymentActions}>
              <TouchableOpacity
                style={styles.paymentStatusButton}
                onPress={() => navigateToPaymentStatus(item._id)}
              >
                <Icon name="activity" size={14} color="#2196F3" />
                <Text style={styles.paymentStatusText}>Payment Status</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.checkPaymentButton}
                onPress={() => checkOrderPaymentStatus(item._id)}
              >
                <Icon name="refresh-cw" size={14} color="#FF9800" />
                <Text style={styles.checkPaymentText}>Check Payment</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.retryPaymentButton}
                onPress={() => retryPayment(item._id)}
              >
                <Icon name="credit-card" size={14} color="#2E7D32" />
                <Text style={styles.retryPaymentText}>Retry Payment</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color="#2E7D32" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Orders</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#2E7D32" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Icon name="refresh-cw" size={20} color="#2E7D32" />
        </TouchableOpacity>
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="shopping-bag" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>No Orders Yet</Text>
          <Text style={styles.emptySubtitle}>
            You haven't placed any orders yet. Start shopping to see your orders here.
          </Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => navigation.navigate('Dashboard')}
          >
            <Text style={styles.shopButtonText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.ordersList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  refreshButton: {
    padding: 5,
  },
  placeholder: {
    width: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  shopButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  shopButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ordersList: {
    padding: 20,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
    marginLeft: 4,
  },
  itemsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  itemQuantity: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  moreItems: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600',
    marginTop: 2,
  },
  orderSummary: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  paymentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  deliveryText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },
  actionContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E8',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginRight: 4,
  },
  // Payment action buttons styles
  paymentActions: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 6,
    flexWrap: 'wrap',
  },
  paymentStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
    minWidth: '30%',
  },
  paymentStatusText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#2196F3',
    marginLeft: 3,
  },
  checkPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
    minWidth: '30%',
  },
  checkPaymentText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FF9800',
    marginLeft: 3,
  },
  retryPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
    minWidth: '30%',
  },
  retryPaymentText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#2E7D32',
    marginLeft: 3,
  },
});

export default OrderScreen;