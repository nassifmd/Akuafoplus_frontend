import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Linking,
  ActivityIndicator,
  Image,
  Dimensions,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
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

// Update the Expert interface to match the actual backend response
interface Expert {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profileImage?: string | null;
  images?: (string | { url: string })[]; // Added images property
  title: string;
  bio: string;
  specializations: string[];
  location?: {
    region?: string;
    district?: string;
    community?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  yearsOfExperience: number;
  education?: string;
  services: Service[];
  rating?: { average: number; count: number };
  isVerified: boolean;
  isActive: boolean;
  consultationFee?: number;
  createdAt?: string;
  updatedAt?: string;
  availability?: string[];
}

interface RouteParams {
  expert: Expert;
}

interface BookingData {
  expertId: string;
  serviceId: string;
  date: string; // Changed from preferredDate to date
  duration: number; // Added duration (in hours)
  location: string; // Added location
  notes?: string; // Added notes (optional)
  message?: string; // Keep message for backward compatibility
}

const { width } = Dimensions.get('window');

// Helper to get image URI
const getImageUri = (image: any) => {
  if (typeof image === 'string') return image;
  if (image && typeof image === 'object' && image.url) return `${Config.API_BASE_URL.replace('/api', '')}${image.url}`;
  return '';
};

const ExpertDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { expert } = route.params as RouteParams;
  
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    initializeUserData();
  }, []);

  const initializeUserData = async () => {
    try {
      const [token, email, id] = await AsyncStorage.multiGet([
        'accessToken',
        'userEmail', 
        'userId'
      ]);
      
      setUserToken(token[1]);
      setUserEmail(email[1]);
      setUserId(id[1]);
      
      // Set default service if available
      if (expert.services && expert.services.length > 0) {
        const activeServices = expert.services.filter(s => s?.isActive);
        if (activeServices.length > 0) {
          setSelectedService(activeServices[0]);
        }
      }
    } catch (error) {
      console.error('Error getting user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTokenExpiration = async () => {
    try {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userId', 'userEmail']);
      
      setUserToken(null);
      setUserEmail(null);
      setUserId(null);
      
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

  const handleBookConsultation = () => {
    if (!userToken) {
      Alert.alert(
        'Authentication Required',
        'Please login to book a consultation.',
        [
          {
            text: 'Login',
            onPress: () => navigation.navigate('LoginScreen' as never)
          }
        ]
      );
      return;
    }

    // Handle both cases: selected service or consultation fee
    if (!selectedService && !expert.consultationFee) {
      Alert.alert('Error', 'Please select a service to book.');
      return;
    }

    const serviceName = selectedService ? selectedService.name : 'Standard Consultation';
    const servicePrice = selectedService 
      ? `${selectedService.price?.currency || 'GHS'} ${selectedService.price?.amount || 0}/${selectedService.price?.unit?.replace('_', ' ') || 'service'}`
      : `$${expert.consultationFee}/session`;

    Alert.alert(
      'Book Consultation',
      `Book ${serviceName} with ${getExpertName(expert)}?\n\nPrice: ${servicePrice}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Book Now', 
          onPress: () => processBooking()
        }
      ]
    );
  };

  const processBooking = async () => {
    if (!userToken || !userId) {
      Alert.alert('Error', 'Authentication required to book consultation.');
      return;
    }

    if (!selectedService && !expert.consultationFee) {
      Alert.alert('Error', 'No service selected and no consultation fee available.');
      return;
    }

    setBookingLoading(true);
    
    try {
      const bookingData: BookingData = {
        expertId: expert._id,
        serviceId: selectedService ? selectedService._id : 'consultation',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        duration: 1, // Default to 1 hour
        location: formatLocation(expert.location) || 'Remote Consultation',
        message: selectedService 
          ? `Consultation request for ${selectedService.name}.`
          : `Standard consultation request with ${getExpertName(expert)}.`
      };

      const response = await fetch(`${Config.API_BASE_URL}/bookings/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify(bookingData),
      });

      if (response.status === 401) {
        await handleTokenExpiration();
        return;
      }

      const data = await response.json();
      
      if (response.ok && data.success) {
        Alert.alert(
          'Booking Request Sent!',
          `Your consultation request with ${getExpertName(expert)} has been sent. The expert will review and confirm your booking.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('BookingScreen' as never)
            }
          ]
        );
      } else {
        throw new Error(data.message || 'Failed to book consultation');
      }
    } catch (error: any) {
      console.error('Booking error:', error);
      
      if (error.message.includes('timeout') || error.message.includes('Network')) {
        Alert.alert('Network Error', 'Please check your internet connection and try again.');
      } else {
        Alert.alert('Booking Failed', error.message || 'Unable to book consultation. Please try again.');
      }
    } finally {
      setBookingLoading(false);
    }
  };

  const handleContactExpert = () => {
    Alert.alert(
      'Contact Expert',
      'Choose how to contact the expert:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call', 
          onPress: () => Linking.openURL(`tel:${expert.phone || ''}`)
        },
        { 
          text: 'Email', 
          onPress: () => Linking.openURL(`mailto:${expert.email || ''}?subject=Consultation Inquiry&body=Hi ${getExpertName(expert)}, I would like to inquire about your expertise.`)
        }
      ]
    );
  };

  const formatSpecialization = (spec: string) => {
    if (!spec) return '';
    return spec.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getExperienceLevel = (years: number) => {
    if (!years || years < 2) return 'Junior';
    if (years < 5) return 'Mid-level';
    if (years < 10) return 'Senior';
    return 'Expert';
  };

  const formatLocation = (location: any) => {
    if (!location) return 'Location not specified';
    
    const parts = [];
    if (location.community) parts.push(location.community);
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

  const getExpertExperience = (expert: Expert) => expert.yearsOfExperience;

  const getRating = (expert: Expert) => {
    if (expert.rating && typeof expert.rating === 'object') {
      return expert.rating;
    }
    return { average: 0, count: 0 };
  };

  const rating = getRating(expert);
  const experienceYears = getExpertExperience(expert);
  
  // Add this line to define activeServices
  const activeServices = expert.services ? expert.services.filter(s => s?.isActive) : [];

  const renderImageItem = ({ item }: { item: any }) => (
    <View style={{ width, height: 220 }}>
      <Image
        source={{ uri: getImageUri(item) }}
        style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading expert details...</Text>
      </View>
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
        <Text style={styles.headerTitle}>Expert Details</Text>
        {expert.isVerified && (
          <View style={styles.verifiedBadge}>
            <MaterialIcons name="verified" size={20} color="#10B981" />
          </View>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.expertProfile}>
          <View style={{ position: 'relative', height: 220 }}>
            {expert.images && expert.images.length > 0 ? (
              <>
                <FlatList
                  data={expert.images}
                  renderItem={renderImageItem}
                  keyExtractor={(_, idx) => `img-${idx}`}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={event => {
                    const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
                    setCurrentImageIndex(newIndex);
                  }}
                />
                {/* Pagination Dots */}
                <View style={{
                  position: 'absolute',
                  bottom: 12,
                  left: 0,
                  right: 0,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  {expert.images.map((_, idx) => (
                    <View
                      key={idx}
                      style={{
                        width: currentImageIndex === idx ? 24 : 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: currentImageIndex === idx ? '#10B981' : '#D1D5DB',
                        marginHorizontal: 4
                      }}
                    />
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.avatarContainer}>
                {expert.profileImage ? (
                  <Image
                    source={{ uri: `${Config.API_BASE_URL.replace('/api', '')}${expert.profileImage}` }}
                    style={{ width: 100, height: 100, borderRadius: 50 }}
                    resizeMode="cover"
                  />
                ) : (
                  <MaterialIcons name="account-circle" size={100} color="#10B981" />
                )}
              </View>
            )}
          </View>
          <Text style={styles.expertName}>
            {getExpertName(expert)}
          </Text>
          <Text style={styles.expertTitle}>
            {getExpertTitle(expert)}
          </Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <MaterialIcons name="star" size={20} color="#F59E0B" />
              <Text style={styles.statValue}>
                {rating.average > 0 ? rating.average.toFixed(1) : 'New'}
              </Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialIcons name="rate-review" size={20} color="#10B981" />
              <Text style={styles.statValue}>{rating.count}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialIcons name="schedule" size={20} color="#3B82F6" />
              <Text style={styles.statValue}>{experienceYears}</Text>
              <Text style={styles.statLabel}>Years Exp.</Text>
            </View>
          </View>
          
          <View style={styles.experienceLevel}>
            <Text style={styles.experienceLevelText}>
              {getExperienceLevel(experienceYears)} Level
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bioText}>{expert.bio || 'No bio available.'}</Text>
        </View>

        {expert.education && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            <Text style={styles.bioText}>{expert.education}</Text>
          </View>
        )}

        {expert.specializations && expert.specializations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Specializations</Text>
            <View style={styles.specializationsContainer}>
              {expert.specializations.map((spec, index) => (
                <View key={index} style={styles.specTag}>
                  <Text style={styles.specText}>{formatSpecialization(spec)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* If you want to display a fallback when there are no specializations, you can add a message like below: */}
        {(!expert.specializations || expert.specializations.length === 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Specialty</Text>
            <View style={styles.specializationsContainer}>
              <View style={styles.specTag}>
                <Text style={styles.specText}>No specialty information available.</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.locationContainer}>
            <MaterialIcons name="location-on" size={20} color="#10B981" />
            <Text style={styles.locationText}>
              {formatLocation(expert.location)}
            </Text>
          </View>
        </View>

        {expert.availability && expert.availability.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Availability</Text>
            <View style={styles.specializationsContainer}>
              {expert.availability.map((day, index) => (
                <View key={index} style={styles.specTag}>
                  <Text style={styles.specText}>{day}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeServices.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services</Text>
            {activeServices.map((service) => (
              <TouchableOpacity
                key={service._id}
                style={[
                  styles.serviceCard,
                  selectedService?._id === service._id && styles.selectedServiceCard
                ]}
                onPress={() => setSelectedService(service)}
              >
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.name || 'Service'}</Text>
                  <Text style={styles.serviceDescription}>
                    {service.description || 'No description available'}
                  </Text>
                  <Text style={styles.serviceCategory}>
                    {formatSpecialization(service.category)}
                  </Text>
                </View>
                <View style={styles.servicePrice}>
                  <Text style={styles.priceAmount}>
                    {service.price?.currency || 'GHS'} {service.price?.amount || 0}
                  </Text>
                  <Text style={styles.priceUnit}>
                    /{service.price?.unit?.replace('_', ' ') || 'service'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.actionButtons}>
          {/* <TouchableOpacity 
            style={styles.contactButton}
            onPress={handleContactExpert}
          >
            <MaterialIcons name="contact-phone" size={20} color="#10B981" />
            <Text style={styles.contactButtonText}>Contact</Text>
          </TouchableOpacity> */}
          
          <TouchableOpacity 
            style={[
              styles.bookButton, 
              (bookingLoading || (!selectedService && !expert.consultationFee)) && styles.disabledButton
            ]}
            onPress={handleBookConsultation}
            disabled={bookingLoading || (!selectedService && !expert.consultationFee)}
          >
            {bookingLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="event" size={20} color="#fff" />
                <Text style={styles.bookButtonText}>Book Service</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* New: Go to Bookings button */}
        <View style={styles.secondaryAction}>
          <TouchableOpacity
            style={styles.bookingsNavButton}
            onPress={() => navigation.navigate('BookingScreen' as never)}
          >
            <MaterialIcons name="event-note" size={20} color="#3B82F6" />
            <Text style={styles.bookingsNavButtonText}>Go to Bookings</Text>
          </TouchableOpacity>
        </View>
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
  verifiedBadge: {
    marginLeft: 16,
  },
  content: {
    flex: 1,
  },
  expertProfile: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  avatarContainer: {
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  expertName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  expertTitle: {
    fontSize: 16,
    color: '#10B981',
    marginBottom: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    color: '#1E293B',
    marginTop: 4,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  experienceLevel: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  experienceLevelText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  bioText: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 24,
  },
  specializationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specTag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  specText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '600',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 16,
    color: '#64748B',
    marginLeft: 8,
    flex: 1,
  },
  serviceCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedServiceCard: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  serviceInfo: {
    flex: 1,
    marginRight: 16,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  serviceCategory: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  servicePrice: {
    alignItems: 'flex-end',
  },
  priceAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  priceUnit: {
    fontSize: 12,
    color: '#64748B',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    marginBottom: 8, // adjusted
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  contactButtonText: {
    color: '#10B981',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  bookButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
  },
  disabledButton: {
    backgroundColor: '#94A3B8',
  },
  bookButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  secondaryAction: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  bookingsNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    borderWidth: 1.5,
    paddingVertical: 14,
    borderRadius: 12,
  },
  bookingsNavButtonText: {
    color: '#3B82F6',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
});

export default ExpertDetailsScreen;
