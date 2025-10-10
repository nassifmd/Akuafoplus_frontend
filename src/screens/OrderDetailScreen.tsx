import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Config from '../Config/config';
import Icon from 'react-native-vector-icons/Feather';
import AlertPro from 'react-native-alert-pro';

const { width } = Dimensions.get('window');

// Define navigation types
type RootStackParamList = {
  Dashboard: undefined;
  OrderScreen: undefined;
  ProductDetail: { productId: string };
};

type OrderDetailScreenNavigationProp = StackNavigationProp<RootStackParamList>;
type OrderDetailScreenRouteProp = RouteProp<{ params: { orderId: string } }, 'params'>;

interface OrderItem {
  _id: string;
  product: {
    _id: string;
    name: string;
    images: string[];
  };
  quantity: number;
  price: number;
  name: string;
  image: string;
}

interface Order {
  _id: string;
  items: OrderItem[];
  shippingAddress: {
    fullName: string;
    phoneNumber: string;
    address: string;
    city: string;
    region: string;
    additionalInfo?: string;
  };
  paymentMethod: string;
  itemsPrice: number;
  shippingPrice: number;
  taxPrice: number;
  totalPrice: number;
  isPaid: boolean;
  paidAt?: string;
  isDelivered: boolean;
  deliveredAt?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const OrderDetailScreen = () => {
  const navigation = useNavigation<OrderDetailScreenNavigationProp>();
  const route = useRoute<OrderDetailScreenRouteProp>();
  const { orderId } = route.params;
  const alertRef = useRef<AlertPro>(null);
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const showAlert = (title: string, message: string, type: 'success' | 'error' = 'success') => {
    if (alertRef.current) {
      alertRef.current.open();
    }
  };

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      
      const response = await axios.get(`${Config.API_BASE_URL}/orders/${orderId}`, { headers });
      
      if (response.data.status === 'success') {
        setOrder(response.data.data.order);
        console.log('Order detail loaded successfully');
      } else {
        showAlert('Error', 'Failed to load order details', 'error');
      }
    } catch (error) {
      console.error('Error fetching order detail:', error);
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.message || 'Failed to load order details';
        showAlert('Error', errorMessage, 'error');
      } else {
        showAlert('Error', 'Network error. Please check your connection.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'processing':
        return '#FF9800';
      case 'shipped':
        return '#2196F3';
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
      case 'processing':
        return 'clock';
      case 'shipped':
        return 'truck';
      case 'delivered':
        return 'check-circle';
      case 'cancelled':
        return 'x-circle';
      default:
        return 'package';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [orderId]);

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
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color="#2E7D32" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.emptyContainer}>
          <Icon name="alert-circle" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>Order not found</Text>
          <Text style={styles.emptySubtitle}>
            The order you're looking for doesn't exist or has been removed.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#2E7D32" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Header */}
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderId}>Order #{order._id.slice(-8).toUpperCase()}</Text>
            <Text style={styles.orderDate}>Placed on {formatDate(order.createdAt)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
            <Icon name={getStatusIcon(order.status)} size={14} color="white" />
            <Text style={styles.statusText}>{order.status}</Text>
          </View>
        </View>

        {/* Order Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Status</Text>
          <View style={styles.timeline}>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineIcon, { backgroundColor: '#4CAF50' }]}>
                <Icon name="check" size={12} color="white" />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Order Placed</Text>
                <Text style={styles.timelineDate}>{formatDate(order.createdAt)}</Text>
              </View>
            </View>
            
            {order.isPaid && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineIcon, { backgroundColor: '#4CAF50' }]}>
                  <Icon name="credit-card" size={12} color="white" />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Payment Confirmed</Text>
                  <Text style={styles.timelineDate}>
                    {order.paidAt ? formatDate(order.paidAt) : 'Processing'}
                  </Text>
                </View>
              </View>
            )}

            {order.status === 'Shipped' && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineIcon, { backgroundColor: '#2196F3' }]}>
                  <Icon name="truck" size={12} color="white" />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Order Shipped</Text>
                  <Text style={styles.timelineDate}>In transit</Text>
                </View>
              </View>
            )}

            {order.isDelivered && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineIcon, { backgroundColor: '#4CAF50' }]}>
                  <Icon name="check-circle" size={12} color="white" />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Delivered</Text>
                  <Text style={styles.timelineDate}>
                    {order.deliveredAt ? formatDate(order.deliveredAt) : 'Pending'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items ({order.items.length})</Text>
          {order.items.map((item) => (
            <TouchableOpacity
              key={item._id}
              style={styles.itemCard}
              onPress={() => navigation.navigate('ProductDetail', { productId: item.product._id })}
            >
              <Image
                source={{ uri: item.image || item.product?.images?.[0] }}
                style={styles.itemImage}
                resizeMode="cover"
              />
              <View style={styles.itemDetails}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.name || item.product?.name || 'Product'}
                </Text>
                <Text style={styles.itemPrice}>GH₵{item.price.toFixed(2)}</Text>
                <Text style={styles.itemQuantity}>Quantity: {item.quantity}</Text>
                <Text style={styles.itemTotal}>
                  Total: GH₵{(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Shipping Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <View style={styles.addressCard}>
            <View style={styles.addressHeader}>
              <Icon name="map-pin" size={16} color="#2E7D32" />
              <Text style={styles.addressName}>{order.shippingAddress.fullName}</Text>
            </View>
            <Text style={styles.addressText}>{order.shippingAddress.address}</Text>
            <Text style={styles.addressText}>
              {order.shippingAddress.city}, {order.shippingAddress.region}
            </Text>
            <Text style={styles.addressPhone}>{order.shippingAddress.phoneNumber}</Text>
            {order.shippingAddress.additionalInfo && (
              <Text style={styles.addressNote}>
                Note: {order.shippingAddress.additionalInfo}
              </Text>
            )}
          </View>
        </View>

        {/* Payment Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          <View style={styles.paymentCard}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Payment Method:</Text>
              <Text style={styles.paymentValue}>{order.paymentMethod}</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Payment Status:</Text>
              <View style={styles.paymentStatusContainer}>
                <Icon 
                  name={order.isPaid ? 'check-circle' : 'clock'} 
                  size={16} 
                  color={order.isPaid ? '#4CAF50' : '#FF9800'} 
                />
                <Text style={[styles.paymentStatusText, { color: order.isPaid ? '#4CAF50' : '#FF9800' }]}>
                  {order.isPaid ? 'Paid' : 'Pending'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Items Total:</Text>
              <Text style={styles.summaryValue}>GH₵{order.itemsPrice.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping:</Text>
              <Text style={styles.summaryValue}>
                {order.shippingPrice === 0 ? 'FREE' : `GH₵${order.shippingPrice.toFixed(2)}`}
              </Text>
            </View>
            {order.taxPrice > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tax:</Text>
                <Text style={styles.summaryValue}>GH₵{order.taxPrice.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>GH₵{order.totalPrice.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      <AlertPro
        ref={alertRef}
        onConfirm={() => alertRef.current?.close()}
        title="Notification"
        message="Operation completed"
        textCancel="Cancel"
        textConfirm="OK"
        customStyles={{
          mask: { backgroundColor: "rgba(0, 0, 0, 0.5)" },
          container: { borderWidth: 1, borderColor: "#2E7D32" },
          buttonConfirm: { backgroundColor: "#2E7D32" },
        }}
      />
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
  },
  content: {
    flex: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 10,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
    marginLeft: 6,
  },
  section: {
    backgroundColor: 'white',
    marginBottom: 10,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  timeline: {
    paddingLeft: 10,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timelineIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timelineDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
    marginBottom: 2,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  addressCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  addressPhone: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
    marginBottom: 4,
  },
  addressNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  paymentCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#666',
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  paymentStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentStatusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  summaryCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  bottomSpacing: {
    height: 20,
  },
});

export default OrderDetailScreen;