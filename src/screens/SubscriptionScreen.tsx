import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  ActivityIndicator, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity,
  Platform,
  StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import Config from '../Config/config';
import { ALERT_TYPE, Dialog, Toast } from 'react-native-alert-notification';

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
}

interface User {
  name: string;
  phone: string;
  email: string;
}

interface Subscription {
  _id: string;
  plan: string;
  status: 'active' | 'inactive' | 'pending';
  startDate?: string;
  endDate?: string;
  paymentRef?: string;
  user?: User;
}

const plans: Plan[] = [
  {
    id: "basic",
    name: "BASIC",
    price: 10,
    features: [
      "Market Prices",
      "Learn To Grow",
      "Smart Crop Calendar",
      "Profit Calculator",
      "Subsidies, Grants & Loans",
      "Agritech News",
      "Forum"
    ]
  },
  {
    id: "premium",
    name: "PREMIUM",
    price: 20,
    features: [
      "All BASIC features",
      "Livestock Management",
      "Poultry Management",
      "Satellite Imaging & AI Insights"
    ]
  }
];

import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  SubscriptionHistoryScreen: undefined;
  // Add other screens here if needed
};

export default function SubscriptionScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>("basic");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: ""
  });
  const [paying, setPaying] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [userData, setUserData] = useState<User>({
    name: "",
    phone: "",
    email: ""
  });
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [phoneVerified, setPhoneVerified] = useState(false);

  // Add this ref to keep track of the interval
  const paymentStatusInterval = useRef<NodeJS.Timeout | null>(null);

  // Fetch subscription and user data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("accessToken");
      const res = await axios.get(`${Config.API_BASE_URL}/subscription/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Set user data from response
      const receivedUserData = res.data.user || res.data;
      setUserData({
        name: receivedUserData.name || "",
        phone: receivedUserData.phone || "",
        email: receivedUserData.email || ""
      });

      setPhoneVerified(!!receivedUserData.phoneVerified);

      // Pre-fill form with user data but allow editing
      setFormData({
        name: receivedUserData.name || "",
        phone: receivedUserData.phone || "",
        email: receivedUserData.email || ""
      });

      setSubscription(res.data);
      setError(null);

      // Check payment status if pending
      if (res.data?.status === 'pending' && res.data?.paymentRef) {
        checkPaymentStatus(res.data.paymentRef);
      }
    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        // No subscription found, but user is authenticated (likely Expert)
        setSubscription(null);
        setUserData({
          name: err.response.data?.user?.name || "",
          phone: err.response.data?.user?.phone || "",
          email: err.response.data?.user?.email || ""
        });
        setError(null); // Don't show error UI
      } else {
        setError("Could not load subscription data");
        console.error("Fetch error:", err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  // Check payment status
  const checkPaymentStatus = async (paymentRef: string) => {
    if (!paymentRef) return;
    
    setCheckingStatus(true);
    try {
      const token = await AsyncStorage.getItem("accessToken");
      const response = await axios.get(
        `${Config.API_BASE_URL}/subscription/status?clientReference=${paymentRef}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.transactionStatus === 'Paid') {
        Toast.show({
          type: ALERT_TYPE.SUCCESS,
          title: 'Payment Confirmed',
          textBody: 'Your subscription is now active!',
        });
        fetchData();
        // Stop interval if running
        if (paymentStatusInterval.current) {
          clearInterval(paymentStatusInterval.current);
          paymentStatusInterval.current = null;
        }
        return true;
      } else if (response.data.transactionStatus === 'Unpaid') {
        // Still pending, do nothing
        return false;
      }
      return false;
    } catch (error: any) {
      console.error('Status check error:', error);
      Toast.show({
        type: ALERT_TYPE.DANGER,
        title: 'Error',
        textBody: error.response?.data?.error || 'Approve the transaction to activate your account',
      });
      return false;
    } finally {
      setCheckingStatus(false);
    }
  };

  // Start auto-refresh when payment is pending
  useEffect(() => {
    if (subscription?.status === 'pending' && subscription?.paymentRef) {
      // Clear any existing interval
      if (paymentStatusInterval.current) {
        clearInterval(paymentStatusInterval.current);
      }
      // Start new interval
      paymentStatusInterval.current = setInterval(async () => {
        const isActive = await checkPaymentStatus(subscription.paymentRef!);
        if (isActive) {
          clearInterval(paymentStatusInterval.current!);
          paymentStatusInterval.current = null;
        }
      }, 300000); // 5 minutes
      // Clean up on unmount
      return () => {
        if (paymentStatusInterval.current) {
          clearInterval(paymentStatusInterval.current);
          paymentStatusInterval.current = null;
        }
      };
    }
    // Clean up if status changes
    return () => {
      if (paymentStatusInterval.current) {
        clearInterval(paymentStatusInterval.current);
        paymentStatusInterval.current = null;
      }
    };
  }, [subscription?.status, subscription?.paymentRef]);

  // Handle form input changes
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Initiate payment
  const handleSubscribe = async (planId: string) => {
    if (!formData.name || !formData.phone) {
      Toast.show({
        type: ALERT_TYPE.WARNING,
        title: 'Missing Info',
        textBody: 'Please enter your name and phone number',
      });
      return;
    }
    if (!phoneVerified) {
      Toast.show({
        type: ALERT_TYPE.WARNING,
        title: 'Verify Phone',
        textBody: 'Please verify your phone number before subscribing.',
      });
      return;
    }

    setPaying(true);
    try {
      const token = await AsyncStorage.getItem("accessToken");
      const res = await axios.post(
        `${Config.API_BASE_URL}/subscription/pay`,
        {
          plan: planId,
          name: formData.name,
          phone: formData.phone,
          email: formData.email
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (res.data?.message) {
        Toast.show({
          type: ALERT_TYPE.SUCCESS,
          title: 'Payment Initiated',
          textBody: res.data.message,
        });
        fetchData(); // Refresh data
        
        // Start checking payment status periodically
        if (res.data.data?.ClientReference) {
          const checkInterval = setInterval(async () => {
            const shouldStop = await checkPaymentStatus(res.data.data.ClientReference);
            if (shouldStop) {
              clearInterval(checkInterval);
            }
          }, 30000); // Check every 30 seconds
          
          // Clear after 10 minutes regardless of status
          setTimeout(() => clearInterval(checkInterval), 600000);
        }
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      Toast.show({
        type: ALERT_TYPE.DANGER,
        title: 'Error', 
        textBody: error.response?.data?.error || "Payment initialization failed",
      });
    } finally {
      setPaying(false);
    }
  };

  // Request OTP for phone verification
  const requestOtp = async () => {
    if (phoneVerified) {
      Toast.show({
        type: ALERT_TYPE.INFO,
        title: 'Already Verified',
        textBody: 'Your phone number is already verified.',
      });
      return;
    }
    setOtpLoading(true);
    setOtpError(null);
    try {
      const res = await axios.post(`${Config.API_BASE_URL}/auth/request-otp`, { phone: formData.phone });
      if (res.data.phoneVerified) {
        setPhoneVerified(true);
        setOtpSent(false);
        Toast.show({
          type: ALERT_TYPE.INFO,
          title: 'Already Verified',
          textBody: 'Your phone number is already verified.',
        });
      } else {
        setOtpSent(true);
        Toast.show({
          type: ALERT_TYPE.SUCCESS,
          title: 'OTP Sent',
          textBody: 'A verification code has been sent to your phone.',
        });
      }
    } catch (err: any) {
      setOtpError(err.response?.data?.error || "Failed to send OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  // Verify OTP for phone number
  const verifyOtp = async () => {
    setOtpLoading(true);
    setOtpError(null);
    try {
      await axios.post(`${Config.API_BASE_URL}/auth/verify-otp`, { phone: formData.phone, otp });
      setPhoneVerified(true);
      setOtpSent(false);
      Toast.show({
        type: ALERT_TYPE.SUCCESS,
        title: 'Verified',
        textBody: 'Phone number verified successfully.',
      });
    } catch (err: any) {
      setOtpError(err.response?.data?.error || "Invalid OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  // Reset form to user's account data
  const resetToAccountData = () => {
    setFormData({
      name: userData.name,
      phone: userData.phone,
      email: userData.email
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={48} color={COLORS.danger} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      {/* Modern Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription Plans</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* User Account Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="account-circle" size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Your Account Information</Text>
          </View>
          <View style={styles.userInfoContainer}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name:</Text>
              <Text style={styles.infoValue}>{userData.name || 'Not provided'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>{userData.phone || 'Not provided'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{userData.email || 'Not provided'}</Text>
            </View>
          </View>
        </View>

        {/* Payment Information Form */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="credit-card" size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Payment Information</Text>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor={COLORS.gray}
              value={formData.name}
              onChangeText={(text) => handleInputChange('name', text)}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 233200000000"
              placeholderTextColor={COLORS.gray}
              value={formData.phone}
              onChangeText={(text) => {
                handleInputChange('phone', text);
                setPhoneVerified(false);
                setOtpSent(false);
                setOtp("");
              }}
              keyboardType="phone-pad"
            />
            {!phoneVerified ? (
              <View style={{ marginTop: 8 }}>
                {!otpSent ? (
                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={requestOtp}
                    disabled={otpLoading || !formData.phone}
                  >
                    {otpLoading ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Text style={styles.resetButtonText}>Send OTP</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter OTP"
                      value={otp}
                      onChangeText={setOtp}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                    <TouchableOpacity
                      style={styles.resetButton}
                      onPress={verifyOtp}
                      disabled={otpLoading || otp.length !== 6}
                    >
                      {otpLoading ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                      ) : (
                        <Text style={styles.resetButtonText}>Verify OTP</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
                {otpError && <Text style={{ color: COLORS.danger, marginTop: 4 }}>{otpError}</Text>}
              </View>
            ) : (
              <Text style={{ color: COLORS.success, marginTop: 4 }}>Phone verified</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Email (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={COLORS.gray}
              value={formData.email}
              onChangeText={(text) => handleInputChange('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[
              styles.resetButton,
              (formData.name === userData.name &&
               formData.phone === userData.phone &&
               formData.email === userData.email) && styles.resetButtonDisabled
            ]}
            onPress={resetToAccountData}
            disabled={
              formData.name === userData.name &&
              formData.phone === userData.phone &&
              formData.email === userData.email
            }
          >
            <Text style={styles.resetButtonText}>Use My Account Information</Text>
          </TouchableOpacity>
        </View>

        {/* Current Subscription Status */}
        {subscription && (
          <View style={[styles.card, subscription.status === 'active' ? styles.activeCard : subscription.status === 'pending' ? styles.pendingCard : styles.inactiveCard]}>
            <View style={styles.cardHeader}>
              <MaterialIcons 
                name={subscription.status === 'active' ? 'check-circle' : subscription.status === 'pending' ? 'pending' : 'cancel'} 
                size={20} 
                color={subscription.status === 'active' ? COLORS.success : subscription.status === 'pending' ? COLORS.warning : COLORS.danger} 
              />
              <Text style={styles.cardTitle}>Current Subscription</Text>
            </View>
            
            <View style={styles.statusContainer}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Plan:</Text>
                <Text style={styles.statusValue}>{subscription.plan.toUpperCase()}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Status:</Text>
                <Text style={[
                  styles.statusValue,
                  subscription.status === 'active' && styles.activeStatus,
                  subscription.status === 'pending' && styles.pendingStatus,
                  subscription.status === 'inactive' && styles.inactiveStatus
                ]}>
                  {subscription.status.toUpperCase()}
                </Text>
              </View>
              {subscription.endDate && (
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Valid Until:</Text>
                  <Text style={styles.statusValue}>
                    {new Date(subscription.endDate).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>

            {subscription.status === 'pending' && (
              <View style={styles.pendingActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.checkStatusButton]}
                  onPress={async () => {
                    if (subscription.paymentRef) {
                      const shouldStop = await checkPaymentStatus(subscription.paymentRef);
                      if (shouldStop) {
                        // No need to keep checking
                      }
                    }
                  }}
                  disabled={checkingStatus}
                >
                  {checkingStatus ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Text style={styles.actionButtonText}>Check Payment Status</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.retryPaymentButton]}
                  onPress={() => handleSubscribe(subscription.plan)}
                  disabled={paying}
                >
                  {paying ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Text style={styles.actionButtonText}>Retry Payment</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Add this button at the bottom of the card */}
            <TouchableOpacity
              style={styles.viewHistoryButton}
              onPress={() => navigation.navigate('SubscriptionHistoryScreen')}
            >
              <MaterialIcons name="history" size={16} color="#FFFFFF" />
              <Text style={styles.viewHistoryButtonText}>View Payment History</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Subscription Plans */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="list-alt" size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Choose a Plan</Text>
          </View>
          
          <View style={styles.plansContainer}>
            {plans.map((plan) => {
              const isCurrentPlan = subscription?.plan === plan.id && subscription.status === 'active';
              return (
                <View
                  key={plan.id}
                  style={[
                    styles.planCard,
                    selectedPlan === plan.id && styles.planCardSelected,
                    isCurrentPlan && styles.currentPlanCard
                  ]}
                >
                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planPrice}>${plan.price}<Text style={styles.planPriceSmall}>/month</Text></Text>
                  </View>
                  
                  <View style={styles.featuresContainer}>
                    {plan.features.map((feature, index) => (
                      <View key={index} style={styles.featureItem}>
                        <MaterialIcons name="check-circle" size={16} color={COLORS.success} style={styles.featureIcon} />
                        <Text style={styles.planFeature}>{feature}</Text>
                      </View>
                    ))}
                  </View>

                  {!isCurrentPlan ? (
                    <TouchableOpacity
                      style={[
                        styles.subscribeButton,
                        paying && selectedPlan === plan.id && styles.subscribeButtonDisabled
                      ]}
                      onPress={() => {
                        setSelectedPlan(plan.id);
                        handleSubscribe(plan.id);
                      }}
                      disabled={paying}
                    >
                      {paying && selectedPlan === plan.id ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                      ) : (
                        <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.currentPlanBadge}>
                      <Text style={styles.currentPlanBadgeText}>Current Plan</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// Color palette
const COLORS = {
  primary: '#4CAF50', // Green
  primaryDark: '#388E3C',
  secondary: '#2196F3', // Blue
  success: '#4CAF50',
  warning: '#FFC107',
  danger: '#F44336',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#9E9E9E',
  lightGray: '#F5F5F5',
  darkGray: '#424242',
  text: '#212121',
  textSecondary: '#757575',
  background: '#FAFAFA'
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    elevation: 4,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  headerRightPlaceholder: {
    width: 24,
  },
  container: {
    padding: 16,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 16,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  activeCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  pendingCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  inactiveCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    paddingBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 8,
  },
  userInfoContainer: {
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontWeight: '600',
    color: COLORS.textSecondary,
    width: 80,
  },
  infoValue: {
    flex: 1,
    color: COLORS.text,
  },
  formGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: COLORS.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  resetButton: {
    backgroundColor: COLORS.secondary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  resetButtonDisabled: {
    backgroundColor: COLORS.gray,
    opacity: 0.7,
  },
  resetButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  statusContainer: {
    marginTop: 8,
  },
  statusRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  statusLabel: {
    fontWeight: '600',
    color: COLORS.textSecondary,
    width: 100,
  },
  statusValue: {
    flex: 1,
    fontWeight: '500',
    color: COLORS.text,
  },
  activeStatus: {
    color: COLORS.success,
  },
  pendingStatus: {
    color: COLORS.warning,
  },
  inactiveStatus: {
    color: COLORS.danger,
  },
  pendingActions: {
    flexDirection: 'row',
    marginTop: 16,
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkStatusButton: {
    backgroundColor: COLORS.secondary,
    marginRight: 8,
  },
  retryPaymentButton: {
    backgroundColor: COLORS.danger,
    marginLeft: 8,
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  plansContainer: {
    marginTop: 8,
  },
  planCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  planCardSelected: {
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  currentPlanCard: {
    borderColor: COLORS.success,
    backgroundColor: '#E8F5E9',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  planName: {
    fontWeight: '700',
    fontSize: 18,
    color: COLORS.text,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  planPriceSmall: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  featuresContainer: {
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureIcon: {
    marginRight: 8,
  },
  planFeature: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  subscribeButton: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  subscribeButtonDisabled: {
    backgroundColor: COLORS.primaryDark,
  },
  subscribeButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 16,
  },
  currentPlanBadge: {
    backgroundColor: COLORS.success,
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  currentPlanBadgeText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  viewHistoryButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  viewHistoryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
});