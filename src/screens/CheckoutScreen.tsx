import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Modal,
  FlatList,
  Linking,
  Platform,
  StatusBar
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Config from '../Config/config';
import Icon from 'react-native-vector-icons/Feather';
import AlertPro from 'react-native-alert-pro';

// Define navigation types
type RootStackParamList = {
  CartScreen: undefined;
  OrderConfirmation: { orderId: string };
  // Add other screens
};

type CheckoutScreenNavigationProp = StackNavigationProp<RootStackParamList>;

interface DeliveryAddress {
  _id?: string;
  fullName: string;
  phoneNumber: string;
  address: string;
  city: string;
  region: string;
  additionalInfo?: string;
  isDefault?: boolean;
}

interface CartItem {
  _id: string;
  product: {
    _id: string;
    name: string;
    price: number;
    images: string[];
  };
  quantity: number;
  price: number;
}

interface Cart {
  _id: string;
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}

interface CheckoutData {
  cart: Cart;
  shippingCost: number;
  taxCost: number;
  total: number;
}

const CheckoutScreen = () => {
  const navigation = useNavigation<CheckoutScreenNavigationProp>();
  const route = useRoute();
  const alertRef = useRef<AlertPro>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<DeliveryAddress | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'cash_on_delivery'>('mobile_money');
  
  // New address form
  const [newAddress, setNewAddress] = useState<DeliveryAddress>({
    fullName: '',
    phoneNumber: '',
    address: '',
    city: '',
    region: '',
    additionalInfo: '',
  });

  // Mobile Money fields
  const [mobileMoneyNumber, setMobileMoneyNumber] = useState('');
  const [customerName, setCustomerName] = useState('');

  // Payment status tracking
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'verifying' | 'success' | 'failed'>('idle');
  const [clientReference, setClientReference] = useState<string | null>(null);
  const [verificationInterval, setVerificationInterval] = useState<NodeJS.Timeout | null>(null);

  const regions = [
    'Greater Accra', 'Ashanti', 'Western', 'Central', 'Eastern',
    'Northern', 'Upper East', 'Upper West', 'Volta', 'Brong-Ahafo',
    'Western North', 'Ahafo', 'Bono', 'Bono East', 'Oti', 'Savannah',
    'North East'
  ];

  const showAlert = (title: string, message: string, type: 'success' | 'error' = 'success') => {
    Alert.alert(title, message);
  };

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  const fetchCheckoutData = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      
      const cartResponse = await axios.get(`${Config.API_BASE_URL}/cart`, { headers });
      
      if (cartResponse.data.status === 'success' && cartResponse.data.data.cart) {
        const cart = cartResponse.data.data.cart;
        const defaultShippingCost = 0.5;
        const total = cart.totalPrice + defaultShippingCost;
        
        setCheckoutData({
          cart,
          shippingCost: defaultShippingCost,
          taxCost: 0,
          total,
        });
      } else {
        showAlert('Error', 'No items in cart', 'error');
        navigation.goBack();
      }

      await fetchAddresses();
      
    } catch (error) {
      console.error('Error fetching checkout data:', error);
      showAlert('Error', 'Failed to load checkout data', 'error');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const fetchAddresses = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(`${Config.API_BASE_URL}/user/addresses`, { headers });
      
      if (response.data.status === 'success') {
        const userAddresses = response.data.data.addresses || [];
        setAddresses(userAddresses);
        
        const defaultAddress = userAddresses.find((addr: DeliveryAddress) => addr.isDefault);
        if (defaultAddress) {
          setSelectedAddress(defaultAddress);
        }
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  };

  const calculateShippingForRegion = async (region: string) => {
    try {
      if (!checkoutData) return;
      
      const response = await axios.get(
        `${Config.API_BASE_URL}/orders/shipping-rates?region=${region}&itemsPrice=${checkoutData.cart.totalPrice}`
      );
      
      if (response.data.status === 'success') {
        const { shippingCost, taxCost, totalCost } = response.data.data;
        
        setCheckoutData(prev => prev ? {
          ...prev,
          shippingCost,
          taxCost: taxCost || 0,
          total: totalCost
        } : null);
      }
    } catch (error) {
      console.error('Error calculating shipping:', error);
    }
  };

  const saveAddress = async () => {
    try {
      if (!newAddress.fullName || !newAddress.phoneNumber || !newAddress.address || !newAddress.city || !newAddress.region) {
        showAlert('Error', 'Please fill in all required fields', 'error');
        return;
      }

      const headers = await getAuthHeaders();
      const response = await axios.post(
        `${Config.API_BASE_URL}/user/addresses`,
        newAddress,
        { headers }
      );

      if (response.data.status === 'success') {
        await fetchAddresses();
        
        const savedAddresses = response.data.data.addresses;
        const newSavedAddress = savedAddresses[savedAddresses.length - 1];
        if (!selectedAddress || newAddress.isDefault) {
          selectAddress(newSavedAddress);
        }
        
        setNewAddress({
          fullName: '',
          phoneNumber: '',
          address: '',
          city: '',
          region: '',
          additionalInfo: '',
        });
        setShowAddressModal(false);
        showAlert('Success', 'Address saved successfully');
      }
    } catch (error) {
      console.error('Error saving address:', error);
      showAlert('Error', 'Failed to save address', 'error');
    }
  };

  const checkPaymentStatus = async (orderId: string, clientRef?: string) => {
    try {
      const headers = await getAuthHeaders();
      
      const verifyResponse = await axios.get(
        `${Config.API_BASE_URL}/payments/verify/${orderId}`,
        { headers }
      );

      if (verifyResponse.data.status === 'success') {
        const paymentStatus = verifyResponse.data.data.paymentStatus;
        
        if (paymentStatus === 'Completed') {
          setPaymentStatus('success');
          if (verificationInterval) {
            clearInterval(verificationInterval);
            setVerificationInterval(null);
          }
          showAlert('Success', 'Payment completed successfully!');
          navigation.navigate('OrderConfirmation', { orderId });
          return true;
        } else if (paymentStatus === 'Failed') {
          setPaymentStatus('failed');
          if (verificationInterval) {
            clearInterval(verificationInterval);
            setVerificationInterval(null);
          }
          showAlert('Error', 'Payment failed. Please try again.', 'error');
          return false;
        }
      }

      if (clientRef) {
        const statusResponse = await axios.get(
          `${Config.API_BASE_URL}/payments/status?clientReference=${clientRef}`,
          { headers }
        );

        if (statusResponse.data.transactionStatus === 'Paid') {
          setPaymentStatus('success');
          if (verificationInterval) {
            clearInterval(verificationInterval);
            setVerificationInterval(null);
          }
          showAlert('Success', 'Payment completed successfully!');
          navigation.navigate('OrderConfirmation', { orderId });
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('❌ Error checking payment status:', error);
      return false;
    }
  };

  const startPaymentVerification = (orderId: string, clientRef: string) => {
    setPaymentStatus('verifying');
    setClientReference(clientRef);

    checkPaymentStatus(orderId, clientRef);

    const interval = setInterval(async () => {
      const completed = await checkPaymentStatus(orderId, clientRef);
      if (completed) {
        clearInterval(interval);
      }
    }, 10000);

    setVerificationInterval(interval);

    setTimeout(() => {
      if (interval) {
        clearInterval(interval);
        setVerificationInterval(null);
        if (paymentStatus === 'verifying') {
          setPaymentStatus('failed');
          showAlert('Timeout', 'Payment verification timed out. Please check your order status.', 'error');
        }
      }
    }, 300000);
  };

  const handleCheckout = async () => {
    try {
      if (!selectedAddress) {
        showAlert('Error', 'Please select a delivery address', 'error');
        return;
      }

      if (paymentMethod === 'mobile_money' && (!mobileMoneyNumber || !customerName)) {
        showAlert('Error', 'Please fill in mobile money details', 'error');
        return;
      }

      if (!checkoutData) {
        showAlert('Error', 'Checkout data not available', 'error');
        return;
      }

      setSubmitting(true);
      setPaymentStatus('processing');

      const headers = await getAuthHeaders();
      
      const orderData = {
        items: checkoutData.cart.items.map(item => ({
          product: item.product._id,
          quantity: item.quantity,
          price: item.price,
        })),
        shippingAddress: selectedAddress,
        paymentMethod: paymentMethod === 'mobile_money' ? 'Hubtel' : 'Cash on Delivery',
        itemsPrice: checkoutData.cart.totalPrice,
        shippingPrice: checkoutData.shippingCost,
        taxPrice: checkoutData.taxCost,
        totalPrice: checkoutData.total,
        ...(paymentMethod === 'mobile_money' && {
          mobileMoneyDetails: {
            customerName,
            customerMsisdn: mobileMoneyNumber,
          }
        }),
      };

      const orderResponse = await axios.post(
        `${Config.API_BASE_URL}/orders`,
        orderData,
        { headers }
      );

      if (orderResponse.data.status === 'success') {
        const orderId = orderResponse.data.data.order._id;

        if (paymentMethod === 'mobile_money') {
          const paymentData = { orderId };

          const paymentResponse = await axios.post(
            `${Config.API_BASE_URL}/payments/initiate`,
            paymentData,
            { headers }
          );

          if (paymentResponse.data.status === 'success') {
            const clientRef = paymentResponse.data.data.clientReference;
            
            showAlert('Success', 'Payment initiated! Please check your phone for the mobile money prompt. We will verify your payment automatically.');
            
            startPaymentVerification(orderId, clientRef);
          } else {
            setPaymentStatus('failed');
            showAlert('Error', 'Payment initiation failed', 'error');
          }
        } else {
          setPaymentStatus('success');
          showAlert('Success', 'Order placed successfully!');
          navigation.navigate('OrderConfirmation', { orderId });
        }
      }
    } catch (error: any) {
      console.error('❌ Error during checkout:', error);
      setPaymentStatus('failed');
      
      const errorMessage = error.response?.data?.message || 'Checkout failed. Please try again.';
      showAlert('Error', errorMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchCheckoutData();
  }, []);

  const selectAddress = (address: DeliveryAddress) => {
    setSelectedAddress(address);
    if (address.region) {
      calculateShippingForRegion(address.region);
    }
  };

  const renderAddressItem = ({ item }: { item: DeliveryAddress }) => (
    <TouchableOpacity
      style={[
        styles.addressItem,
        selectedAddress?._id === item._id && styles.selectedAddress
      ]}
      onPress={() => selectAddress(item)}
    >
      <View style={styles.addressHeader}>
        <Text style={styles.addressName}>{item.fullName}</Text>
        {item.isDefault && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultBadgeText}>Default</Text>
          </View>
        )}
      </View>
      <Text style={styles.addressText}>{item.address}</Text>
      <Text style={styles.addressText}>{item.city}, {item.region}</Text>
      <Text style={styles.addressPhone}>{item.phoneNumber}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Loading checkout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!checkoutData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No checkout data available</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderCheckoutButton = () => {
    const getButtonText = () => {
      switch (paymentStatus) {
        case 'processing':
          return 'Creating Order...';
        case 'verifying':
          return 'Verifying Payment...';
        case 'success':
          return 'Payment Successful!';
        case 'failed':
          return 'Try Again';
        default:
          return `Place Order - GH₵${checkoutData?.total.toFixed(2)}`;
      }
    };

    const getButtonColor = () => {
      switch (paymentStatus) {
        case 'success':
          return '#10B981';
        case 'failed':
          return '#EF4444';
        case 'verifying':
          return '#F59E0B';
        default:
          return '#10B981';
      }
    };

    return (
      <View style={styles.checkoutContainer}>
        {paymentStatus === 'verifying' && (
          <View style={styles.verificationInfo}>
            <ActivityIndicator size="small" color="#F59E0B" />
            <Text style={styles.verificationText}>
              Checking payment status... Please complete the mobile money transaction if prompted.
            </Text>
          </View>
        )}
        
        <TouchableOpacity
          style={[
            styles.checkoutButton, 
            { backgroundColor: getButtonColor() }
          ]}
          onPress={handleCheckout}
          disabled={submitting || !selectedAddress || paymentStatus === 'verifying'}
        >
          {(submitting || paymentStatus === 'verifying') ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.checkoutText}>
              {getButtonText()}
            </Text>
          )}
        </TouchableOpacity>
        
        {clientReference && paymentStatus === 'verifying' && (
          <TouchableOpacity
            style={styles.manualCheckButton}
            onPress={() => checkPaymentStatus(checkoutData?.cart._id || '', clientReference)}
          >
            <Text style={styles.manualCheckText}>Check Payment Status Manually</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Items ({checkoutData.cart.totalItems}):</Text>
              <Text style={styles.summaryValue}>GH₵{checkoutData.cart.totalPrice.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping:</Text>
              <Text style={styles.summaryValue}>
                {checkoutData.shippingCost === 0 ? 'FREE' : `GH₵${checkoutData.shippingCost.toFixed(2)}`}
              </Text>
            </View>
            {checkoutData.taxCost > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tax (5%):</Text>
                <Text style={styles.summaryValue}>GH₵{checkoutData.taxCost.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>GH₵{checkoutData.total.toFixed(2)}</Text>
            </View>
            {checkoutData.cart.totalPrice >= 200 && (
              <View style={styles.freeShippingBadge}>
                <Icon name="truck" size={14} color="#10B981" />
                <Text style={styles.freeShippingText}>Free Shipping!</Text>
              </View>
            )}
          </View>
        </View>

        {/* Delivery Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddressModal(true)}
            >
              <Icon name="plus" size={16} color="#10B981" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {addresses.length > 0 ? (
            <FlatList
              data={addresses}
              renderItem={renderAddressItem}
              keyExtractor={(item) => item._id || item.fullName}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.addressList}
            />
          ) : (
            <TouchableOpacity
              style={styles.noAddressContainer}
              onPress={() => setShowAddressModal(true)}
            >
              <Icon name="map-pin" size={24} color="#9CA3AF" />
              <Text style={styles.noAddressText}>Add delivery address</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'mobile_money' && styles.selectedPayment
            ]}
            onPress={() => setPaymentMethod('mobile_money')}
          >
            <View style={styles.paymentIcon}>
              <Icon name="smartphone" size={20} color="#10B981" />
            </View>
            <Text style={styles.paymentText}>Mobile Money</Text>
            {paymentMethod === 'mobile_money' && (
              <Icon name="check-circle" size={20} color="#10B981" />
            )}
          </TouchableOpacity>

          {paymentMethod === 'mobile_money' && (
            <View style={styles.mobileMoneyForm}>
              <TextInput
                style={styles.input}
                placeholder="Customer Name"
                placeholderTextColor="#9CA3AF"
                value={customerName}
                onChangeText={setCustomerName}
              />
              <TextInput
                style={styles.input}
                placeholder="Mobile Money Number (e.g., 0241234567)"
                placeholderTextColor="#9CA3AF"
                value={mobileMoneyNumber}
                onChangeText={setMobileMoneyNumber}
                keyboardType="phone-pad"
              />
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'cash_on_delivery' && styles.selectedPayment
            ]}
            onPress={() => setPaymentMethod('cash_on_delivery')}
          >
            <View style={styles.paymentIcon}>
              <Icon name="dollar-sign" size={20} color="#10B981" />
            </View>
            <Text style={styles.paymentText}>Cash on Delivery</Text>
            {paymentMethod === 'cash_on_delivery' && (
              <Icon name="check-circle" size={20} color="#10B981" />
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Checkout Button */}
      {renderCheckoutButton()}

      {/* Add Address Modal */}
      <Modal
        visible={showAddressModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddressModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowAddressModal(false)}
            >
              <Icon name="x" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Address</Text>
            <TouchableOpacity 
              style={styles.modalSaveButton}
              onPress={saveAddress}
            >
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <TextInput
              style={styles.input}
              placeholder="Full Name *"
              placeholderTextColor="#9CA3AF"
              value={newAddress.fullName}
              onChangeText={(text) => setNewAddress({ ...newAddress, fullName: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone Number *"
              placeholderTextColor="#9CA3AF"
              value={newAddress.phoneNumber}
              onChangeText={(text) => setNewAddress({ ...newAddress, phoneNumber: text })}
              keyboardType="phone-pad"
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Street Address *"
              placeholderTextColor="#9CA3AF"
              value={newAddress.address}
              onChangeText={(text) => setNewAddress({ ...newAddress, address: text })}
              multiline
              numberOfLines={3}
            />
            <TextInput
              style={styles.input}
              placeholder="City *"
              placeholderTextColor="#9CA3AF"
              value={newAddress.city}
              onChangeText={(text) => setNewAddress({ ...newAddress, city: text })}
            />
            
            <Text style={styles.inputLabel}>Region *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.regionPicker}>
              {regions.map((region) => (
                <TouchableOpacity
                  key={region}
                  style={[
                    styles.regionOption,
                    newAddress.region === region && styles.selectedRegion
                  ]}
                  onPress={() => setNewAddress({ ...newAddress, region })}
                >
                  <Text style={[
                    styles.regionText,
                    newAddress.region === region && styles.selectedRegionText
                  ]}>
                    {region}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Additional Information (Optional)"
              placeholderTextColor="#9CA3AF"
              value={newAddress.additionalInfo}
              onChangeText={(text) => setNewAddress({ ...newAddress, additionalInfo: text })}
              multiline
              numberOfLines={2}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: 'System',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'System',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'System',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: 'System',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'System',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'System',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'System',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: 'System',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
    fontFamily: 'System',
  },
  freeShippingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 8,
    gap: 6,
  },
  freeShippingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    fontFamily: 'System',
  },
  addressList: {
    marginTop: 8,
  },
  addressItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginRight: 16,
    width: 280,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  selectedAddress: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: 'System',
  },
  defaultBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  addressText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
    fontFamily: 'System',
  },
  addressPhone: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
    fontFamily: 'System',
  },
  noAddressContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  noAddressText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    fontFamily: 'System',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  selectedPayment: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    fontFamily: 'System',
  },
  mobileMoneyForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
    fontFamily: 'System',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  checkoutContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  checkoutButton: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  checkoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'System',
  },
  verificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  verificationText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#92400E',
    flex: 1,
    fontFamily: 'System',
  },
  manualCheckButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  manualCheckText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'System',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: 'System',
  },
  modalSaveButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
  },
  saveText: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '600',
    fontFamily: 'System',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    fontFamily: 'System',
  },
  regionPicker: {
    marginBottom: 20,
  },
  regionOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 12,
    backgroundColor: '#FFFFFF',
  },
  selectedRegion: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  regionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    fontFamily: 'System',
  },
  selectedRegionText: {
    color: '#FFFFFF',
  },
});

export default CheckoutScreen;