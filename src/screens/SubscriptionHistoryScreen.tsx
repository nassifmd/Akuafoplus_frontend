import React, { useState, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  SafeAreaView,
  Modal,
  ScrollView,
  Platform
} from 'react-native';
import axios from 'axios';
import Config from '../Config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AlertPro from 'react-native-alert-pro';

// Define the payment log interface
interface PaymentLog {
  _id: string;
  amount: number;
  paymentRef?: string;  // Make optional
  status: 'pending' | 'success' | 'failed';
  provider: string;
  channel?: string;  // Make optional
  paymentDate?: string;
  createdAt: string;
  metadata?: {
    lastCallbackAt?: string;
    callback?: any; // raw Hubtel callback payload
  };
}

const SubscriptionHistoryScreen = ({ navigation }: any) => {
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [callbackVisible, setCallbackVisible] = useState(false);
  const [callbackTitle, setCallbackTitle] = useState<string>('Callback Log');
  const [callbackJson, setCallbackJson] = useState<string>('');
  const alertRef = useRef<any>(null);
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string }>({
    title: '',
    message: ''
  });

  // Fetch payment history
  const fetchPaymentHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        setError('Authentication required. Please log in again.');
        setLoading(false);
        return;
      }
      const response = await axios.get(
        `${Config.API_BASE_URL}/subscription/payments`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPaymentLogs(response.data);
    } catch (err: any) {
      console.error('Error fetching payment history:', err);
      setAlertConfig({
        title: 'Error',
        message: err.response?.data?.error || 'Failed to fetch payment history'
      });
      setTimeout(() => alertRef.current?.open(), 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPaymentHistory();
    }, [fetchPaymentHistory])
  );

  // Format date in a user-friendly way
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status color based on payment status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return '#4CAF50'; // green
      case 'pending':
        return '#FFC107'; // yellow
      case 'failed':
        return '#F44336'; // red
      default:
        return '#9E9E9E'; // gray
    }
  };

  // View detailed payment information
  const viewPaymentDetails = (payment: PaymentLog) => {
    const statusColor =
      payment.status === 'success' ? '#4CAF50' :
      payment.status === 'pending' ? '#FFC107' :
      '#F44336';

    setAlertConfig({
      title: 'Payment Details',
      message:
        `Payment Reference: ${payment.paymentRef || 'N/A'}\n` +
        `Amount: GH₵ ${payment.amount.toFixed(2)}\n` +
        `Status: ${payment.status.toUpperCase()}\n` +
        `Payment Date: ${formatDate(payment.paymentDate)}\n` +
        `Created: ${formatDate(payment.createdAt)}\n` +
        `Provider: ${payment.provider?.toUpperCase() || 'N/A'}\n` +
        `Channel: ${payment.channel || 'N/A'}\n` +
        `Last Callback: ${formatDate(payment.metadata?.lastCallbackAt)}`
    });
    alertRef.current?.open();
  };

  const openCallbackViewer = (payment: PaymentLog) => {
    const callbackPayload = payment.metadata?.callback;
    setCallbackTitle(`Callback • Ref: ${payment.paymentRef || 'N/A'}`);
    setCallbackJson(
      callbackPayload ? JSON.stringify(callbackPayload, null, 2) : 'No callback received yet.'
    );
    setCallbackVisible(true);
  };

  // Render each payment log item
  const renderPaymentItem = ({ item }: { item: PaymentLog }) => (
    <TouchableOpacity 
      style={styles.paymentCard}
      onPress={() => viewPaymentDetails(item)}
    >
      <View style={styles.paymentHeader}>
        <MaterialIcons 
          name={
            item.status === 'success' ? 'check-circle' : 
            item.status === 'pending' ? 'pending' : 'cancel'
          }
          size={20} 
          color={getStatusColor(item.status)} 
        />
        <Text style={styles.paymentRef} numberOfLines={1}>
          Ref: {item.paymentRef ? 
            (item.paymentRef.length > 18 ? 
              `${item.paymentRef.substring(0, 18)}...` : 
              item.paymentRef) : 
            'N/A'}
        </Text>
      </View>
      
      <View style={styles.paymentDetails}>
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Amount:</Text>
          <Text style={styles.paymentValue}>GH₵ {item.amount.toFixed(2)}</Text>
        </View>
        
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Status:</Text>
          <Text style={[
            styles.paymentStatus, 
            { color: getStatusColor(item.status) }
          ]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
        
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Date:</Text>
          <Text style={styles.paymentValue}>
            {formatDate(item.paymentDate || item.createdAt)}
          </Text>
        </View>
        
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Provider:</Text>
          <Text style={styles.paymentValue}>
            {item.provider.toUpperCase()} ({item.channel})
          </Text>
        </View>

        {item.metadata?.callback && (
          <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.paymentLabel, { flex: 1 }]}>
              Last Callback: {formatDate(item.metadata?.lastCallbackAt)}
            </Text>
            <TouchableOpacity
              onPress={() => openCallbackViewer(item)}
              style={styles.callbackButton}
            >
              <MaterialIcons name="visibility" size={16} color="#FFFFFF" />
              <Text style={styles.callbackButtonText}>View Callback</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  // Render empty state when no payment logs
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="receipt-long" size={64} color="#BDBDBD" />
      <Text style={styles.emptyText}>No payment history yet</Text>
      <Text style={styles.emptySubtext}>
        Your subscription payment records will appear here after you make a payment
      </Text>
      <TouchableOpacity 
        style={[styles.retryButton, { marginTop: 20 }]} 
        onPress={() => navigation.navigate('SubscriptionScreen')}
      >
        <Text style={styles.retryButtonText}>Subscribe Now</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription History</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      {/* Content */}
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={48} color="#F44336" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchPaymentHistory}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={paymentLogs}
            renderItem={renderPaymentItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Callback JSON Viewer */}
      <Modal
        visible={callbackVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCallbackVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{callbackTitle}</Text>
              <TouchableOpacity onPress={() => setCallbackVisible(false)}>
                <MaterialIcons name="close" size={22} color="#212121" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text selectable style={styles.monoText}>
                {callbackJson}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <AlertPro
        ref={alertRef}
        title={alertConfig.title}
        message={alertConfig.message}
        showCancel={false}
        textConfirm="Close"
        onConfirm={() => alertRef.current?.close()}
        customStyles={{
          buttonConfirm: { backgroundColor: '#4CAF50' },
          title: { fontSize: 16, fontWeight: '600' },
          message: { textAlign: 'left' }
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAFA'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#4CAF50',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  backButton: {
    padding: 4
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  headerRightPlaceholder: {
    width: 24
  },
  container: {
    flex: 1,
    padding: 16
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  errorText: {
    color: '#F44336',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center'
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16
  },
  listContainer: {
    paddingBottom: 24,
    flexGrow: 1
  },
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5'
  },
  paymentRef: {
    fontSize: 14,
    fontWeight: '500',
    color: '#424242',
    marginLeft: 8,
    flex: 1
  },
  paymentDetails: {
    marginTop: 4
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  paymentLabel: {
    fontSize: 14,
    color: '#757575',
    fontWeight: '500'
  },
  paymentValue: {
    fontSize: 14,
    color: '#212121',
    fontWeight: '400'
  },
  paymentStatus: {
    fontSize: 14,
    fontWeight: '600'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#424242',
    marginTop: 16
  },
  emptySubtext: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginTop: 8
  },
  callbackButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6
  },
  callbackButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 6
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 16
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    maxHeight: '80%',
    paddingBottom: 8
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomColor: '#EEEEEE',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121'
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  monoText: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 12,
    color: '#212121'
  }
});

export default SubscriptionHistoryScreen;