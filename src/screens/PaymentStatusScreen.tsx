import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Config from '../Config/config';
import Icon from 'react-native-vector-icons/Feather';

type RootStackParamList = {
  OrderDetail: { orderId: string };
  Dashboard: undefined;
  OrderScreen: undefined; // Add this line
};

type PaymentStatusNavigationProp = StackNavigationProp<RootStackParamList>;

interface PaymentStatusProps {
  orderId: string;
  clientReference?: string;
}

const PaymentStatusScreen = () => {
  const navigation = useNavigation<PaymentStatusNavigationProp>();
  const route = useRoute();
  const { orderId, clientReference } = route.params as PaymentStatusProps;
  
  const [paymentStatus, setPaymentStatus] = useState<'checking' | 'pending' | 'completed' | 'failed'>('checking');
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 30; // 5 minutes with 10-second intervals

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  const checkPaymentStatus = async () => {
    try {
      const headers = await getAuthHeaders();
      
      // Check payment verification
      const verifyResponse = await axios.get(
        `${Config.API_BASE_URL}/payments/verify/${orderId}`,
        { headers }
      );

      console.log('💰 Payment verification:', verifyResponse.data);

      if (verifyResponse.data.status === 'success') {
        const status = verifyResponse.data.data.paymentStatus;
        setPaymentDetails(verifyResponse.data.data);
        
        if (status === 'Completed') {
          setPaymentStatus('completed');
          return true;
        } else if (status === 'Failed') {
          setPaymentStatus('failed');
          return true;
        } else {
          setPaymentStatus('pending');
        }
      }

      // Also check transaction status if we have client reference
      if (clientReference) {
        const statusResponse = await axios.get(
          `${Config.API_BASE_URL}/payments/status?clientReference=${clientReference}`,
          { headers }
        );

        console.log('📊 Transaction status:', statusResponse.data);

        if (statusResponse.data.transactionStatus === 'Paid') {
          setPaymentStatus('completed');
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('❌ Error checking payment status:', error);
      return false;
    }
  };

  const fetchOrderDetails = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(
        `${Config.API_BASE_URL}/orders/${orderId}`,
        { headers }
      );

      if (response.data.status === 'success') {
        setOrderDetails(response.data.data.order);
      }
    } catch (error) {
      console.error('❌ Error fetching order details:', error);
    }
  };

  const startPaymentMonitoring = async () => {
    setLoading(true);
    await fetchOrderDetails();
    
    const checkStatus = async () => {
      const completed = await checkPaymentStatus();
      
      if (completed) {
        setLoading(false);
        return;
      }

      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        setTimeout(checkStatus, 10000); // Check every 10 seconds
      } else {
        setPaymentStatus('failed');
        setLoading(false);
        Alert.alert(
          'Payment Timeout',
          'Payment verification timed out. Please contact support if payment was deducted.',
          [
            { text: 'Contact Support', onPress: () => {} },
            { text: 'Check Again', onPress: () => {
              setRetryCount(0);
              startPaymentMonitoring();
            }},
          ]
        );
      }
    };

    await checkStatus();
  };

  useEffect(() => {
    startPaymentMonitoring();
  }, []);

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'completed':
        return <Icon name="check-circle" size={60} color="#4CAF50" />;
      case 'failed':
        return <Icon name="x-circle" size={60} color="#F44336" />;
      case 'pending':
        return <Icon name="clock" size={60} color="#FF9800" />;
      default:
        return <ActivityIndicator size={60} color="#2E7D32" />;
    }
  };

  const getStatusMessage = () => {
    switch (paymentStatus) {
      case 'completed':
        return {
          title: 'Payment Successful!',
          message: 'Your payment has been processed successfully.',
          color: '#4CAF50'
        };
      case 'failed':
        return {
          title: 'Payment Failed',
          message: 'Your payment could not be processed. Please try again.',
          color: '#F44336'
        };
      case 'pending':
        return {
          title: 'Payment Pending',
          message: 'Please complete the mobile money transaction on your phone.',
          color: '#FF9800'
        };
      default:
        return {
          title: 'Checking Payment...',
          message: 'Please wait while we verify your payment.',
          color: '#2E7D32'
        };
    }
  };

  const statusInfo = getStatusMessage();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#2E7D32" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Status</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.statusContainer}>
          {getStatusIcon()}
          <Text style={[styles.statusTitle, { color: statusInfo.color }]}>
            {statusInfo.title}
          </Text>
          <Text style={styles.statusMessage}>
            {statusInfo.message}
          </Text>
        </View>

        {orderDetails && (
          <View style={styles.orderInfo}>
            <Text style={styles.sectionTitle}>Order Details</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Order ID:</Text>
              <Text style={styles.infoValue}>
                #{orderDetails._id.slice(-8).toUpperCase()}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Amount:</Text>
              <Text style={styles.infoValue}>
                GH₵{orderDetails.totalPrice?.toFixed(2)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Payment Method:</Text>
              <Text style={styles.infoValue}>{orderDetails.paymentMethod}</Text>
            </View>
          </View>
        )}

        {paymentDetails && (
          <View style={styles.paymentInfo}>
            <Text style={styles.sectionTitle}>Payment Details</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <Text style={[styles.infoValue, { color: statusInfo.color }]}>
                {paymentDetails.paymentStatus}
              </Text>
            </View>
            {paymentDetails.hubtelResponse && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Transaction ID:</Text>
                <Text style={styles.infoValue}>
                  {paymentDetails.hubtelResponse.transactionId || 'N/A'}
                </Text>
              </View>
            )}
          </View>
        )}

        {paymentStatus === 'pending' && (
          <View style={styles.retryInfo}>
            <Text style={styles.retryText}>
              Checking payment status... ({retryCount}/{maxRetries})
            </Text>
            <ActivityIndicator size="small" color="#FF9800" style={styles.retrySpinner} />
          </View>
        )}
      </ScrollView>

      <View style={styles.actionContainer}>
        {paymentStatus === 'completed' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
            onPress={() => navigation.navigate('OrderDetail', { orderId })}
          >
            <Text style={styles.actionButtonText}>View Order</Text>
          </TouchableOpacity>
        )}

        {paymentStatus === 'failed' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#F44336' }]}
            onPress={() => {
              setRetryCount(0);
              startPaymentMonitoring();
            }}
          >
            <Text style={styles.actionButtonText}>Try Again</Text>
          </TouchableOpacity>
        )}

        {paymentStatus === 'pending' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
            onPress={() => checkPaymentStatus()}
          >
            <Text style={styles.actionButtonText}>Check Now</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('OrderScreen')} // Navigate back to OrderScreen
        >
          <Text style={styles.secondaryButtonText}>Back to Orders</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.secondaryButton, { marginTop: 8 }]}
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Text style={styles.secondaryButtonText}>Continue Shopping</Text>
        </TouchableOpacity>
      </View>
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
    width: 34,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  statusContainer: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 30,
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
  },
  statusMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  orderInfo: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  paymentInfo: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  retryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  retryText: {
    fontSize: 14,
    color: '#E65100',
    marginRight: 10,
  },
  retrySpinner: {
    marginLeft: 5,
  },
  actionContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionButton: {
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2E7D32',
  },
  secondaryButtonText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PaymentStatusScreen;