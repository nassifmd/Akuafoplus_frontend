import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../Config/config';

interface Service {
  _id: string;
  name: string;
  description: string;
  category: string;
  price: {
    amount: number;
    currency: string;
    unit: string;
  };
  isActive: boolean;
}

interface Location {
  region?: string;
  district?: string;
  community?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface Rating {
  average: number;
  count: number;
}

// Updated Expert interface to match actual backend response
interface Expert {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profileImage?: string | null;
  title: string;
  bio: string;
  specializations: string[];
  location?: Location;
  yearsOfExperience: number;
  education?: string;
  services?: Service[];
  rating?: Rating;
  isVerified: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

type RootStackParamList = {
  ExpertScreen: undefined;
  ExpertDetails: { expert: Expert };
  LoginScreen: undefined;
  ExpertDashboardScreen: undefined;
};

const ExpertScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [isExpert, setIsExpert] = useState<boolean>(false); // NEW

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      setUserToken(token);
      if (token) {
        await fetchUserRole(token); // NEW
      } else {
        setIsExpert(false);
      }
      await fetchExperts(token ?? undefined);
    } catch (error) {
      console.error('Error initializing screen:', error);
      Alert.alert('Error', 'Failed to initialize. Please try again.');
    }
  };

  // NEW: Fetch current user to determine role
  const fetchUserRole = async (token: string) => {
    try {
      const res = await fetch(`${Config.API_BASE_URL}/user/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        setIsExpert(false);
        return;
      }
      const me = await res.json();
      setIsExpert(me?.role === 'Expert');
    } catch {
      setIsExpert(false);
    }
  };

  const fetchExperts = async (token?: string) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      console.log('Fetching experts from:', `${Config.API_BASE_URL}/experts`);

      const response = await fetch(`${Config.API_BASE_URL}/experts`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Raw API response:', data);
      
      if (data.success && data.data) {
        console.log('Experts data:', data.data);
        setExperts(data.data);
      } else if (Array.isArray(data)) {
        // Handle case where response is directly an array
        console.log('Experts data (array):', data);
        setExperts(data);
      } else {
        console.log('No experts data or unsuccessful response');
        setExperts([]);
      }
    } catch (error: any) {
      console.error('Error fetching experts:', error);
      
      if (error.message.includes('timeout') || error.message.includes('Network')) {
        Alert.alert('Network Error', 'Please check your internet connection and try again.');
      } else {
        Alert.alert('Error', error.message || 'Failed to load experts. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchExperts();
  };

  const handleConsultExpert = (expert: Expert) => {
    console.log('Navigating to expert details with:', expert);
    navigation.navigate('ExpertDetails', { expert });
  };

  const getSpecializationIcon = (specializations: string[]) => {
    // Use specialty field if specializations array is empty
    const specs = specializations && specializations.length > 0 ? specializations : [''];
    const firstSpec = specs[0]?.toLowerCase() || '';
    
    if (firstSpec.includes('crop') || firstSpec.includes('agronomy')) {
      return 'eco';
    } else if (firstSpec.includes('livestock') || firstSpec.includes('veterinary') || firstSpec.includes('cardio')) {
      return 'pets';
    } else if (firstSpec.includes('soil')) {
      return 'landscape';
    } else if (firstSpec.includes('pest')) {
      return 'bug-report';
    } else if (firstSpec.includes('irrigation')) {
      return 'water-drop';
    } else if (firstSpec.includes('organic') || firstSpec.includes('sustainable')) {
      return 'nature';
    } else {
      return 'agriculture';
    }
  };

  const formatSpecializations = (specializations: string[]) => {
    if (specializations && specializations.length > 0) {
      return specializations
        .map(spec => spec.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
        .slice(0, 2)
        .join(', ') + (specializations.length > 2 ? ` +${specializations.length - 2}` : '');
    }
    return 'General Agriculture';
  };

  const getLowestPrice = (services: Service[]) => {
    if (!services || services.length === 0) return null;
    const activeServices = services.filter(s => s?.isActive);
    if (activeServices.length === 0) return null;
    
    const lowestPrice = Math.min(...activeServices.map(s => s.price?.amount || 0));
    const currency = activeServices[0]?.price?.currency || 'GHS';
    return { amount: lowestPrice, currency };
  };

  const formatLocation = (location: Location | undefined) => {
    if (!location) return 'Location not specified';
    
    const parts = [];
    if (location.district) parts.push(location.district);
    if (location.region) parts.push(location.region);
    
    return parts.length > 0 ? parts.join(', ') : 'Location not specified';
  };

  const getExpertName = (expert: Expert) => {
    const firstName = expert.firstName?.trim() || '';
    const lastName = expert.lastName?.trim() || '';
    if (firstName && lastName) return `${firstName} ${lastName}`;
    if (firstName) return firstName;
    if (lastName) return lastName;
    return 'Agricultural Expert';
  };

  const getExpertTitle = (expert: Expert) => expert.title || 'Agricultural Expert';

  const getExpertExperience = (expert: Expert) => {
    return `${expert.yearsOfExperience} years experience`;
  };

  const getRating = (expert: Expert) => {
    if (expert.rating && typeof expert.rating === 'object') {
      return expert.rating;
    }
    return { average: 0, count: 0 };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Expert Advice</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Loading experts...</Text>
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
          <MaterialIcons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expert Advice</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
        >
          <MaterialIcons name="refresh" size={24} color="#10B981" />
        </TouchableOpacity>
      </View>

      {/* Show dashboard button only for Experts */}
      {isExpert && (
        <TouchableOpacity
          style={styles.dashboardButton}
          onPress={() => navigation.navigate('ExpertDashboardScreen')}
        >
          <Text style={styles.dashboardButtonText}>
            Go to Expert Dashboard
          </Text>
        </TouchableOpacity>
      )}

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#10B981']}
            tintColor="#10B981"
          />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agricultural Experts</Text>
          <Text style={styles.sectionDescription}>
            Connect with certified agricultural experts for personalized advice
          </Text>
          {experts.length > 0 && (
            <View style={styles.statsRow}>
              <MaterialIcons name="verified" size={16} color="#10B981" />
              <Text style={styles.statsText}>{experts.length} experts available</Text>
            </View>
          )}
        </View>

        {experts.map((expert) => {
          console.log('Rendering expert:', expert.firstName, expert.lastName, expert.specializations);
          const lowestPrice = getLowestPrice(expert.services || []);
          const rating = getRating(expert);
          
          return (
            <TouchableOpacity 
              key={expert._id}
              style={styles.expertCard}
              onPress={() => handleConsultExpert(expert)}
              activeOpacity={0.7}
            >
              <View style={styles.expertInfo}>
                <View style={styles.avatarContainer}>
                  {expert.profileImage ? (
                    <Image
                      source={{ uri: `${Config.API_BASE_URL}${expert.profileImage}` }}
                      style={{ width: 48, height: 48, borderRadius: 24 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <MaterialIcons 
                      name={getSpecializationIcon(expert.specializations)} 
                      size={40} 
                      color="#10B981" 
                    />
                  )}
                  {expert.isVerified && (
                    <View style={styles.verifiedBadge}>
                      <MaterialIcons name="verified" size={12} color="#fff" />
                    </View>
                  )}
                </View>
                <View style={styles.expertDetails}>
                  <Text style={styles.expertName}>
                    {getExpertName(expert)}
                  </Text>
                  <Text style={styles.expertTitle}>
                    {getExpertTitle(expert)}
                  </Text>
                  <Text style={styles.expertSpecialty}>
                    {formatSpecializations(expert.specializations)}
                  </Text>
                  <Text style={styles.expertLocation}>
                    {formatLocation(expert.location)}
                  </Text>
                  <Text style={styles.expertExperience}>
                    {getExpertExperience(expert)}
                  </Text>
                  <View style={styles.ratingContainer}>
                    <MaterialIcons name="star" size={16} color="#F59E0B" />
                    <Text style={styles.ratingText}>
                      {rating.average > 0 ? rating.average.toFixed(1) : 'New'}
                    </Text>
                    <Text style={styles.consultationsText}>
                      ({rating.count} reviews)
                    </Text>
                  </View>
                  {lowestPrice && (
                    <View style={styles.feeContainer}>
                      <MaterialIcons name="attach-money" size={14} color="#64748B" />
                      <Text style={styles.feeText}>
                        From {lowestPrice.currency} {lowestPrice.amount}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <TouchableOpacity 
                style={styles.consultButton}
                onPress={() => handleConsultExpert(expert)}
              >
                <MaterialIcons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}

        {experts.length === 0 && !loading && (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="person-search" size={64} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Experts Available</Text>
            <Text style={styles.emptyText}>
              We're working to bring you the best agricultural experts. 
              Please check back later.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  refreshButton: {
    marginLeft: 16,
  },
  dashboardButton: {
    backgroundColor: '#10B981',
    padding: 14,
    borderRadius: 8,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 0,
    alignItems: 'center',
  },
  dashboardButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 24,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statsText: {
    fontSize: 14,
    color: '#10B981',
    marginLeft: 4,
    fontWeight: '600',
  },
  expertCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  expertInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  verifiedBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#10B981',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expertDetails: {
    flex: 1,
  },
  expertName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  expertTitle: {
    fontSize: 14,
    color: '#10B981',
    marginBottom: 2,
    fontWeight: '500',
  },
  expertSpecialty: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  expertLocation: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 2,
  },
  expertExperience: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 12,
    color: '#F59E0B',
    marginLeft: 4,
    fontWeight: '600',
  },
  consultationsText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 8,
  },
  feeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feeText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  consultButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingVertical: 64,
    paddingHorizontal: 32,
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
  retryButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default ExpertScreen;