import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  View, 
  Text, 
  Image, 
  ScrollView, 
  TouchableOpacity, 
  Linking, 
  ActivityIndicator, 
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Platform
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DatePicker from 'react-native-date-picker';
import Config from '../Config/config';

import type { StackNavigationProp } from '@react-navigation/stack';

// Replace this with your actual stack param list
type RootStackParamList = {
  Login: undefined;
  BookingDetails: { bookingId: string };
  // ...other routes
};

const ExpertDashboardScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const [expert, setExpert] = useState<Expert | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [meetingLink, setMeetingLink] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [profileImageError, setProfileImageError] = useState(false);

  useEffect(() => {
    if (isFocused) {
      fetchExpert();
    }
  }, [isFocused]);

  const fetchExpert = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        setError('Authentication required. Please login again.');
        setLoading(false);
        return;
      }

      const res = await axios.get(`${Config.API_BASE_URL}/experts/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (res.data && res.data.success) {
        setExpert(res.data.data);
        setError(null);
      } else {
        setError('Failed to load expert data');
      }
    } catch (err) {
      console.error('Error fetching expert:', err);
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError('Session expired. Please login again.');
          // Optionally navigate to login screen
          // navigation.navigate('Login');
        } else {
          setError(err.response?.data?.message || 'Failed to load expert data');
        }
      } else {
        setError('Failed to load expert data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchExpert();
  };

  interface User {
    _id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
  }

  interface Service {
    _id: string;
    name: string;
  }

  interface Booking {
    _id: string;
    user?: User;
    service?: Service;
    date: string;
    duration: number;
    amount: number;
    status: string;
    meetingLink?: string;
    notes?: string;
  }

  interface Expert {
    _id: string;
    firstName: string;
    lastName: string;
    title: string;
    email: string;
    phone?: string;
    profileImage?: string;
    isVerified: boolean;
    bookings?: Booking[];
  }

  const handleApprove = (booking: Booking) => {
    setSelectedBooking(booking);
    setScheduledDate(new Date(booking.date));
    setMeetingLink(booking.meetingLink || '');
    setModalVisible(true);
  };

  const confirmApprove = async () => {
    if (!selectedBooking) return;
    
    setApproving(selectedBooking._id);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        Alert.alert('Error', 'Authentication required');
        return;
      }

      const res = await axios.put(
        `${Config.API_BASE_URL}/bookings/${selectedBooking._id}/approve`,
        { 
          scheduledDate: scheduledDate.toISOString(), 
          meetingLink 
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data && res.data.success) {
        setModalVisible(false);
        // Refresh expert data to get updated bookings
        fetchExpert();
        Alert.alert('Success', 'Booking approved successfully');
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to approve booking');
      }
    } catch (err) {
      console.error('Error approving booking:', err);
      if (axios.isAxiosError(err)) {
        Alert.alert('Error', err.response?.data?.message || 'Failed to approve booking');
      } else {
        Alert.alert('Error', 'Failed to approve booking');
      }
    } finally {
      setApproving(null);
    }
  };

  interface CompleteBookingResponse {
    success: boolean;
    data?: any;
    message?: string;
  }

  const handleCompleteBooking = async (bookingId: string): Promise<void> => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        Alert.alert('Error', 'Authentication required');
        return;
      }

      const res = await axios.put<CompleteBookingResponse>(
        `${Config.API_BASE_URL}/bookings/${bookingId}/complete`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data && res.data.success) {
        // Refresh expert data to get updated bookings
        fetchExpert();
        Alert.alert('Success', 'Booking marked as completed');
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to complete booking');
      }
    } catch (err: any) {
      console.error('Error completing booking:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to complete booking');
    }
  };

  const handleDateChange = (
    event: import('@react-native-community/datetimepicker').DateTimePickerEvent,
    selectedDate?: Date | undefined
  ): void => {
    // Always close the picker on Android after any action
    setShowDatePicker(false);

    if (selectedDate) {
      setScheduledDate(selectedDate);
    }
  };

  interface StatusColorMap {
    [key: string]: string;
    confirmed: string;
    pending: string;
    completed: string;
    cancelled: string;
    payment_pending: string;
  }

  type BookingStatus = keyof StatusColorMap | string;

  const getStatusColor = (status: BookingStatus): string => {
    const colorMap: StatusColorMap = {
      confirmed: '#10B981',
      pending: '#F59E0B',
      completed: '#3B82F6',
      cancelled: '#EF4444',
      payment_pending: '#8B5CF6',
    };
    return colorMap[status] || '#6B7280';
  };

  interface FormatCurrencyOptions {
    amount: number;
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
    }).format(amount);
  };

  const filteredBookings = (): Booking[] => {
    if (!expert?.bookings) return [];
    
    if (activeTab === 'all') return expert.bookings;
    return expert.bookings.filter(booking => booking.status === activeTab);
  };

  interface StatusTextMap {
    [key: string]: string;
    confirmed: string;
    pending: string;
    completed: string;
    cancelled: string;
    payment_pending: string;
  }

  type BookingStatusText = keyof StatusTextMap | string;

  const getStatusText = (status: BookingStatusText): string => {
    switch (status) {
      case 'confirmed': return 'Confirmed';
      case 'pending': return 'Pending';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'payment_pending': return 'Payment Pending';
      default: return String(status);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="error-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchExpert}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: '#F3F4F6', marginTop: 12 }]} 
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={[styles.retryButtonText, { color: '#374151' }]}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!expert) {
    return (
      <View style={styles.centerContainer}>
        <Text>No expert data found.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <MaterialIcons name="arrow-back" size={24} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Dashboard</Text>
          </View>
          {expert.isVerified && (
            <View style={styles.verifiedBadge}>
              <MaterialIcons name="verified" size={16} color="#10B981" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            {(!profileImageError && expert.profileImage && expert.profileImage.trim() !== '') ? (
              <Image
                source={{
                  uri: expert.profileImage.startsWith('http')
                    ? expert.profileImage
                    : `${Config.API_BASE_URL.replace('/api', '')}${expert.profileImage}`
                }}
                style={styles.profileImage}
                onError={() => setProfileImageError(true)}
              />
            ) : (
              <View
                style={[
                  styles.profileImage,
                  { backgroundColor: '#D7CCC8', justifyContent: 'center', alignItems: 'center' }
                ]}
              >
                <Text style={{ fontSize: 36, fontWeight: '600', color: '#4E342E' }}>
                  {(expert.firstName?.[0] || 'U').toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {expert.firstName} {expert.lastName}
              </Text>
              <Text style={styles.profileTitle}>{expert.title}</Text>
              <View style={styles.contactRow}>
                <View style={styles.contactInfo}>
                  <MaterialIcons name="mail-outline" size={16} color="#6B7280" />
                  <Text style={styles.contactText}>{expert.email}</Text>
                </View>
                <View style={styles.contactInfo}>
                  <MaterialIcons name="call" size={16} color="#6B7280" />
                  <Text style={styles.contactText}>{expert.phone || 'Not provided'}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#EEF2FF' }]}>
              <MaterialIcons name="event" size={20} color="#6366F1" />
            </View>
            <Text style={styles.statNumber}>{expert.bookings?.length || 0}</Text>
            <Text style={styles.statLabel}>Total Bookings</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#ECFDF5' }]}>
              <MaterialIcons name="check-circle" size={20} color="#10B981" />
            </View>
            <Text style={styles.statNumber}>
              {expert.bookings?.filter(b => b.status === 'completed').length || 0}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#FFFBEB' }]}>
              <MaterialIcons name="pending" size={20} color="#F59E0B" />
            </View>
            <Text style={styles.statNumber}>
              {expert.bookings?.filter(b => b.status === 'pending' || b.status === 'payment_pending').length || 0}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {/* Bookings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Bookings</Text>
          </View>

          {/* Booking Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'all' && styles.activeTab]}
              onPress={() => setActiveTab('all')}
            >
              <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
              onPress={() => setActiveTab('pending')}
            >
              <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>Pending</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'confirmed' && styles.activeTab]}
              onPress={() => setActiveTab('confirmed')}
            >
              <Text style={[styles.tabText, activeTab === 'confirmed' && styles.activeTabText]}>Confirmed</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
              onPress={() => setActiveTab('completed')}
            >
              <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>Completed</Text>
            </TouchableOpacity>
          </View>

          {filteredBookings().length > 0 ? (
            filteredBookings().map((booking) => (
              <View key={booking._id} style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                  <View style={styles.userInfo}>
                    <Image
                      source={{ 
                        uri: booking.user?.profileImage || 'https://via.placeholder.com/40?text=User' 
                      }}
                      style={styles.userImage}
                      onError={() => console.log("Error loading user image")}
                    />
                    <View style={styles.userDetails}>
                      <Text style={styles.userName}>
                        {booking.user?.firstName} {booking.user?.lastName}
                      </Text>
                      <Text style={styles.serviceName}>
                        {booking.service?.name || 'N/A'}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                      {getStatusText(booking.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.bookingDetails}>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="calendar-today" size={16} color="#6B7280" />
                    <Text style={styles.detailText}>
                      {new Date(booking.date).toLocaleDateString()} • {new Date(booking.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="access-time" size={16} color="#6B7280" />
                    <Text style={styles.detailText}>{booking.duration} mins</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="payments" size={16} color="#6B7280" />
                    <Text style={styles.detailText}>{formatCurrency(booking.amount)}</Text>
                  </View>
                  {booking.meetingLink && (
                    <TouchableOpacity 
                      style={styles.meetingLink}
                      onPress={() => Linking.openURL(booking.meetingLink || '')}
                    >
                      <MaterialIcons name="videocam" size={16} color="#6366F1" />
                      <Text style={styles.linkText}>Join Meeting</Text>
                    </TouchableOpacity>
                  )}
                  {booking.notes && (
                    <View style={styles.notesContainer}>
                      <MaterialIcons name="notes" size={16} color="#6B7280" />
                      <Text style={styles.notesText} numberOfLines={2}>{booking.notes}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.bookingActions}>
                  {(booking.status === 'pending' || booking.status === 'payment_pending') && (
                    <TouchableOpacity
                      onPress={() => handleApprove(booking)}
                      disabled={approving === booking._id}
                      style={[
                        styles.actionButton,
                        styles.approveButton,
                        approving === booking._id && styles.actionButtonDisabled
                      ]}
                    >
                      {approving === booking._id ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <MaterialIcons name="check-circle" size={18} color="#FFFFFF" />
                          <Text style={styles.actionButtonText}>Approve</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                  
                  {booking.status === 'confirmed' && (
                    <TouchableOpacity
                      onPress={() => handleCompleteBooking(booking._id)}
                      style={[styles.actionButton, styles.completeButton]}
                    >
                      <MaterialIcons name="done" size={18} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Complete</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.detailsButton]}
                    onPress={() => navigation.navigate('BookingDetails', { bookingId: booking._id })}
                  >
                    <MaterialIcons name="visibility" size={18} color="#6366F1" />
                    <Text style={[styles.actionButtonText, { color: '#6366F1' }]}>Details</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="calendar-today" size={48} color="#D1D5DB" />
              <Text style={styles.emptyStateText}>No bookings found</Text>
              <Text style={styles.emptyStateSubtext}>
                Your {activeTab !== 'all' ? activeTab : ''} bookings will appear here
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Approval Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Booking</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Date & Time</Text>
              <TouchableOpacity 
                style={styles.dateInput}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateText}>{scheduledDate.toLocaleString()}</Text>
                <MaterialIcons name="calendar-today" size={20} color="#6366F1" />
              </TouchableOpacity>

              {showDatePicker && (
                <DatePicker
                  modal
                  open={showDatePicker}
                  date={scheduledDate}
                  mode="datetime"
                  minimumDate={new Date()}
                  onConfirm={(date) => {
                    setShowDatePicker(false);
                    setScheduledDate(date);
                  }}
                  onCancel={() => setShowDatePicker(false)}
                />
              )}

              <Text style={styles.inputLabel}>Meeting Link (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
                placeholderTextColor="#9CA3AF"
                value={meetingLink}
                onChangeText={setMeetingLink}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.confirmButton,
                  approving && styles.confirmButtonDisabled
                ]}
                onPress={confirmApprove}
                disabled={approving !== null}
              >
                {approving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm Schedule</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    color: '#6B7280',
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 4,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#EEF2FF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  profileTitle: {
    fontSize: 15,
    color: '#6366F1',
    marginBottom: 12,
    fontWeight: '500',
  },
  contactRow: {
    gap: 12,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    marginLeft: 8,
    color: '#6B7280',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 24,
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
    color: '#111827',
  },
  viewAllText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#6366F1',
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  serviceName: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bookingDetails: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    color: '#4B5563',
    fontSize: 14,
  },
  meetingLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  linkText: {
    marginLeft: 8,
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '500',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  notesText: {
    marginLeft: 8,
    color: '#6B7280',
    fontSize: 14,
    flex: 1,
  },
  bookingActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  approveButton: {
    backgroundColor: '#6366F1',
  },
  completeButton: {
    backgroundColor: '#10B981',
  },
  detailsButton: {
    backgroundColor: '#F3F4F6',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginTop: 8,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  dateText: {
    color: '#1F2937',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
    color: '#1F2937',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default ExpertDashboardScreen;