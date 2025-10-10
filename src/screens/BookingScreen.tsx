import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Linking, // Add this import
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../Config/config';

interface Booking {
  _id: string;
  expert: {
    _id: string;
    firstName: string;
    lastName: string;
    title: string;
    profileImage?: string;
  };
  service: string;
  date: string;
  duration: number;
  location: string;
  status: string;
  amount: number;
  currency: string;
  paymentStatus: string;
  meetingLink?: string;
  rating?: {
    score: number;
    comment: string;
    createdAt: string;
  };
}

const BookingScreen: React.FC = () => {
  const navigation = useNavigation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userToken, setUserToken] = useState<string | null>(null);

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      setUserToken(token);
      await fetchBookings(token ?? undefined);
    } catch (error) {
      console.error('Error initializing screen:', error);
      Alert.alert('Error', 'Failed to initialize. Please try again.');
    }
  };


const fetchBookings = async (token?: string) => {
    try {
        if (!token) {
        setBookings([]);
        setLoading(false);
        return;
        }

        const response = await fetch(`${Config.API_BASE_URL}/bookings/my-bookings`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        });

        if (!response.ok) {
        if (response.status === 401) {
            await handleTokenExpiration();
            return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.data) {
        setBookings(data.data);
        } else if (data.bookings) { // Handle alternative response format
        setBookings(data.bookings);
        } else {
        setBookings([]);
        }
    } catch (error: any) {
        console.error('Error fetching bookings:', error);
        Alert.alert('Error', 'Failed to load bookings. Please try again.');
    } finally {
        setLoading(false);
        setRefreshing(false);
    }
};

  const handleTokenExpiration = async () => {
    try {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userId', 'userEmail']);
      setUserToken(null);
      
      Alert.alert(
        'Session Expired',
        'Your session has expired. Please login again.',
        [
          {
            text: 'Login',
            onPress: () => navigation.navigate('LoginScreen' as never)
          }
        ]
      );
    } catch (error) {
      console.error('Error handling token expiration:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBookings(userToken ?? undefined);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#10B981';
      case 'pending':
      case 'payment_pending':
        return '#F59E0B';
      case 'completed':
        return '#3B82F6';
      case 'cancelled':
      case 'payment_failed':
        return '#EF4444';
      default:
        return '#64748B';
    }
  };

  const handleJoinMeeting = (meetingLink: string) => {
    Linking.openURL(meetingLink).catch(err => {
      console.error('Failed to open meeting link:', err);
      Alert.alert('Error', 'Could not open the meeting link. Please check the URL.');
    });
  };

  const renderBookingItem = ({ item }: { item: Booking }) => (
    <TouchableOpacity style={styles.bookingCard}>
      <View style={styles.bookingHeader}>
        <Text style={styles.expertName}>
          {item.expert.firstName} {item.expert.lastName}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>
      
      <Text style={styles.bookingDate}>{formatDate(item.date)}</Text>
      <Text style={styles.bookingDetails}>Duration: {item.duration} hour(s)</Text>
      <Text style={styles.bookingDetails}>Location: {item.location}</Text>
      
      <View style={styles.bookingFooter}>
        <Text style={styles.bookingAmount}>
          {item.currency} {item.amount.toFixed(2)}
        </Text>
        {item.meetingLink && (
          <TouchableOpacity 
            style={styles.meetingButton}
            onPress={() => handleJoinMeeting(item.meetingLink!)}
          >
            <MaterialIcons name="videocam" size={16} color="#3B82F6" />
            <Text style={styles.meetingText}>Join Meeting</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Bookings</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <TouchableOpacity onPress={handleRefresh}>
          <MaterialIcons name="refresh" size={24} color="#10B981" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={bookings}
        renderItem={renderBookingItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#10B981']}
            tintColor="#10B981"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="event-busy" size={64} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Bookings Yet</Text>
            <Text style={styles.emptyText}>
              You haven't made any bookings yet. Start by exploring our experts and their services.
            </Text>
            <TouchableOpacity 
              style={styles.exploreButton}
              onPress={() => navigation.navigate('ExpertScreen' as never)}
            >
              <Text style={styles.exploreButtonText}>Explore Experts</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  listContent: {
    padding: 20,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  expertName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bookingDate: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  bookingDetails: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 2,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  bookingAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  meetingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  meetingText: {
    fontSize: 12,
    color: '#3B82F6',
    marginLeft: 4,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default BookingScreen;