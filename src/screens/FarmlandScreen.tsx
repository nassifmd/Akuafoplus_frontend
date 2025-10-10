import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { fetchFarmlands } from '../services/farmlandApi';
import Config from '../Config/config';

const { width } = Dimensions.get('window');

// Define navigation type for farmland screens
type FarmlandStackParamList = {
  FarmlandScreen: undefined;
  FarmlandListing: undefined;
  FarmlandDetails: { farmlandId: string };
  InquiryForm: { farmlandId: string };
  MyInquiries: undefined;
  FarmlandInquiry: undefined;
  CreateFarmland: undefined;
};

interface Farmland {
  _id: string;
  name: string;
  location: string;
  size: number;
  price: number;
  description: string;
  images?: string[];
  available: boolean;
}

const FarmlandScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<FarmlandStackParamList>>();
  const [featuredFarmlands, setFeaturedFarmlands] = useState<Farmland[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalListings: 0,
    availableListings: 0,
    averagePrice: 0,
  });

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      console.log('Fetching farmlands...'); // Debug log
      const response = await fetchFarmlands({ limit: 6 }) as Farmland[] | { data: Farmland[], pagination?: any };
      console.log('API Response:', response); // Debug log

      // Handle both direct array and nested data structure
      let farmlands: Farmland[] = [];
      if (Array.isArray(response)) {
        farmlands = response;
      } else if (response && 'data' in response && Array.isArray(response.data)) {
        farmlands = response.data;
      }

      console.log('Processed farmlands:', farmlands); // Debug log
      setFeaturedFarmlands(farmlands);

      // Calculate stats
      const available = farmlands.filter(f => f.available);
      const totalPrice = farmlands.reduce((sum, f) => sum + f.price, 0);
      setStats({
        totalListings: farmlands.length,
        availableListings: available.length,
        averagePrice: farmlands.length > 0 ? Math.round(totalPrice / farmlands.length) : 0,
      });
    } catch (error) {
      console.error('Error fetching featured farmlands:', error);
      setFeaturedFarmlands([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Only refresh if we're not already loading or refreshing
      // and if we have been away from the screen (simple focus refresh)
      loadData(true);
    }, []) // Remove dependencies to prevent infinite loop
  );

  // Navigation handlers
  const handleViewAllFarmlands = () => {
    navigation.navigate('FarmlandListing');
  };

  const handleViewMyInquiries = () => {
    navigation.navigate('MyInquiries');
  };

  const handleViewFarmDetails = (farmlandId: string) => {
    navigation.navigate('FarmlandDetails', { farmlandId });
  };

  const handleCreateInquiry = () => {
    navigation.navigate('FarmlandInquiry');
  };

  const handleCreateListing = () => {
    navigation.navigate('CreateFarmland');
  };

  const handleRefresh = () => {
    loadData(true);
  };

  // Helper function to get image URI with fallback
  const getImageUri = (image: any): string => {
    if (typeof image === 'string') {
      // If it's already a full URL, return as is
      if (image.startsWith('http')) {
        return image;
      }
      // If it's a local path, construct the full URL
      return `${Config.API_BASE_URL}/uploads/farmland/${image}`;
    }
    if (image && typeof image === 'object' && image.url) {
      if (image.url.startsWith('http')) {
        return image.url;
      }
      return `${Config.API_BASE_URL}/uploads/farmland/${image.url}`;
    }
    return '';
  };

  const renderFarmCard = (farmland: Farmland) => (
    <TouchableOpacity
      key={farmland._id}
      style={styles.farmCard}
      onPress={() => handleViewFarmDetails(farmland._id)}
      activeOpacity={0.8}
    >
      {/* Farm Image */}
      <View style={styles.farmImageContainer}>
        {farmland.images && farmland.images.length > 0 ? (
          <Image
            source={{ uri: getImageUri(farmland.images[0]) }}
            style={styles.farmImage}
            onError={(error) => {
              console.log('Image load error:', error);
              // Fallback to local image on error
            }}
          />
        ) : (
          <Image
            source={require('../assets/logo.png')}
            style={styles.farmImage}
          />
        )}

        {/* Status Badge */}
        {farmland.available && (
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Available</Text>
          </View>
        )}
        
        {/* Image Count Badge */}
        {farmland.images && farmland.images.length > 1 && (
          <View style={styles.imageCountBadge}>
            <MaterialIcons name="photo-library" size={12} color="#fff" />
            <Text style={styles.imageCountText}>{farmland.images.length}</Text>
          </View>
        )}
        
        {/* Price Tag */}
        <View style={styles.priceTag}>
          <Text style={styles.priceText}>${farmland.price.toLocaleString()}</Text>
        </View>
      </View>

      {/* Farm Info */}
      <View style={styles.farmInfo}>
        <Text style={styles.farmName} numberOfLines={2}>{farmland.name}</Text>
        <View style={styles.locationRow}>
          <MaterialIcons name="location-on" size={14} color="#64748B" />
          <Text style={styles.farmLocation} numberOfLines={1}>{farmland.location}</Text>
        </View>
        <View style={styles.detailsRow}>
          <View style={styles.sizeInfo}>
            <MaterialIcons name="crop-landscape" size={14} color="#F59E0B" />
            <Text style={styles.farmSize}>{farmland.size} acres</Text>
          </View>
        </View>
        
        {farmland.description && (
          <Text style={styles.farmDescription} numberOfLines={2}>
            {farmland.description}
          </Text>
        )}
      </View>

      {/* Actions */}
      <View style={styles.farmActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            handleViewFarmDetails(farmland._id);
          }}
        >
          <MaterialIcons name="visibility" size={16} color="#F59E0B" />
          <Text style={styles.actionButtonText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryActionButton]}
          onPress={(e) => {
            e.stopPropagation();
            navigation.navigate('InquiryForm', { farmlandId: farmland._id });
          }}
        >
          <MaterialIcons name="message" size={16} color="#fff" />
          <Text style={[styles.actionButtonText, { color: '#fff' }]}>Inquire</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderStatsCard = (icon: string, label: string, value: string | number, color: string) => (
    <View style={styles.statsCard} key={label}>
      <View style={[styles.statsIcon, { backgroundColor: `${color}20` }]}>
        <MaterialIcons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statsValue}>{value}</Text>
      <Text style={styles.statsLabel}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Farm Land Services</Text>
        {/* <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreateListing}
        >
          <MaterialIcons name="add" size={24} color="#F59E0B" />
        </TouchableOpacity> */}
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#F59E0B']}
            tintColor="#F59E0B"
          />
        }
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Discover Premium Farmlands</Text>
          <Text style={styles.heroSubtitle}>
            Find the perfect agricultural property for your farming needs
          </Text>
        </View>

        {/* Stats Section */}
        {/* <View style={styles.statsSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsContainer}>
            {renderStatsCard('landscape', 'Total Listings', stats.totalListings, '#F59E0B')}
            {renderStatsCard('check-circle', 'Available', stats.availableListings, '#10B981')}
            {renderStatsCard('attach-money', 'Avg. Price', `$${stats.averagePrice.toLocaleString()}`, '#3B82F6')}
          </ScrollView>
        </View> */}

        {/* Quick Actions Section */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity
            style={[styles.actionCard, styles.primaryAction]}
            onPress={handleViewAllFarmlands}
            activeOpacity={0.8}
          >
            <MaterialIcons name="landscape" size={32} color="#fff" />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Browse All Farmlands</Text>
              <Text style={styles.actionDescription}>
                Explore our complete collection of agricultural properties
              </Text>
            </View>
            <MaterialIcons name="arrow-forward-ios" size={20} color="#fff" />
          </TouchableOpacity>

          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={[styles.actionCard, styles.secondaryAction, styles.gridAction]}
              onPress={handleViewMyInquiries}
              activeOpacity={0.8}
            >
              <MaterialIcons name="inbox" size={24} color="#F59E0B" />
              <Text style={[styles.actionTitle, { color: '#1E293B', fontSize: 14 }]}>
                My Inquiries
              </Text>
            </TouchableOpacity>

            {/* <TouchableOpacity
              style={[styles.actionCard, styles.secondaryAction, styles.gridAction]}
              onPress={handleCreateListing}
              activeOpacity={0.8}
            >
              <MaterialIcons name="add-circle" size={24} color="#10B981" />
              <Text style={[styles.actionTitle, { color: '#1E293B', fontSize: 14 }]}>
                List Property
              </Text>
            </TouchableOpacity> */}
          </View>
        </View>

        {/* Featured Farm Listings */}
        <View style={styles.featuredSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Properties</Text>
            <TouchableOpacity onPress={handleViewAllFarmlands}>
              <Text style={styles.viewAllLink}>View All</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#F59E0B" />
              <Text style={styles.loadingText}>Loading featured farmlands...</Text>
            </View>
          ) : featuredFarmlands.length > 0 ? (
            <View style={styles.farmCardsContainer}>
              {featuredFarmlands.map(renderFarmCard)}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="landscape" size={48} color="#94A3B8" />
              <Text style={styles.emptyText}>No farmlands available</Text>
              <Text style={styles.emptySubtext}>Check back later for new listings</Text>
              <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          )}
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
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  addButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  heroSection: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  },
  statsSection: {
    paddingVertical: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  statsContainer: {
    paddingHorizontal: 20,
  },
  statsCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginRight: 12,
    minWidth: 120,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  quickActionsSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  actionCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryAction: {
    backgroundColor: '#F59E0B',
  },
  secondaryAction: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  gridAction: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    padding: 16,
  },
  actionContent: {
    flex: 1,
    marginLeft: 16,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  featuredSection: {
    padding: 20,
    backgroundColor: '#fff',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllLink: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '600',
  },
  farmCardsContainer: {
    gap: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  farmCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  farmImageContainer: {
    position: 'relative',
    height: 180,
  },
  farmImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginRight: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  imageCountBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },
  priceTag: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  priceText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  farmInfo: {
    padding: 16,
    flex: 1,
  },
  farmName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    lineHeight: 22,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  farmLocation: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 4,
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sizeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  farmSize: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '600',
    marginLeft: 4,
  },
  farmDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 4,
  },
  farmActions: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  primaryActionButton: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 4,
  },
});

export default FarmlandScreen;