import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Dimensions, FlatList } from 'react-native';
import { useNavigation, useRoute, NavigationProp } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { fetchFarmlandDetails } from '../services/farmlandApi';
import { Farmland } from '../types/farmland';

const { width } = Dimensions.get('window');

// Define your stack param list
type RootStackParamList = {
  FarmlandDetailsScreen: { farmlandId: string };
  InquiryForm: { farmlandId: string };
  // ...add other screens as needed
};

const FarmlandDetailsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { farmlandId } = route.params as { farmlandId: string };
  const [farmland, setFarmland] = useState<Farmland | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const farmlandData = (await fetchFarmlandDetails(farmlandId)) as Partial<Farmland>;
        setFarmland({
          ...farmlandData,
          id: farmlandData.id ?? farmlandId,
          name: farmlandData.name ?? '',
          location: farmlandData.location ?? '',
          size: farmlandData.size ?? 0,
          price: farmlandData.price ?? 0,
          description: farmlandData.description ?? '',
          images: farmlandData.images ?? [],
          available: farmlandData.available ?? false,
        });
      } catch (error) {
        console.error('Error fetching farmland details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [farmlandId]);

  // Helper function to get image URI
  const getImageUri = (image: any): string => {
    if (typeof image === 'string') {
      return image;
    }
    if (image && typeof image === 'object' && image.url) {
      return image.url;
    }
    return '';
  };

  // Render image carousel item
  const renderImageItem = ({ item, index }: { item: any; index: number }) => (
    <View style={styles.imageSlide}>
      <Image
        source={{ uri: getImageUri(item) }}
        style={styles.farmImage}
        onError={(error) => {
          console.log('Image load error:', error);
        }}
      />
    </View>
  );

  // Render thumbnail item
  const renderThumbnail = ({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity
      style={[
        styles.thumbnail,
        currentImageIndex === index && styles.activeThumbnail
      ]}
      onPress={() => setCurrentImageIndex(index)}
    >
      <Image
        source={{ uri: getImageUri(item) }}
        style={styles.thumbnailImage}
      />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#22C55E" />
            <Text style={styles.loadingText}>Loading farmland details...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!farmland) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <View style={styles.errorIconContainer}>
              <MaterialIcons name="error-outline" size={48} color="#EF4444" />
            </View>
            <Text style={styles.errorText}>Farmland not found</Text>
            <Text style={styles.errorSubtext}>The farmland you're looking for could not be found.</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.retryButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const hasMultipleImages = farmland.images && farmland.images.length > 1;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Image Section with Carousel */}
        <View style={styles.imageContainer}>
          {farmland.images && farmland.images.length > 0 ? (
            <>
              {/* Main Image Carousel */}
              <FlatList
                data={farmland.images}
                renderItem={renderImageItem}
                keyExtractor={(item, index) => index.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) => {
                  const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
                  setCurrentImageIndex(newIndex);
                }}
                initialScrollIndex={currentImageIndex}
                getItemLayout={(data, index) => ({
                  length: width,
                  offset: width * index,
                  index,
                })}
              />
              
              {/* Image Counter */}
              {hasMultipleImages && (
                <View style={styles.imageCounter}>
                  <Text style={styles.imageCounterText}>
                    {currentImageIndex + 1} / {farmland.images.length}
                  </Text>
                </View>
              )}
              
              {/* Pagination Dots */}
              {hasMultipleImages && (
                <View style={styles.paginationContainer}>
                  {farmland.images.map((_, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.paginationDot,
                        currentImageIndex === index && styles.activePaginationDot
                      ]}
                      onPress={() => setCurrentImageIndex(index)}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <Image
              source={require('../assets/logo.png')}
              style={styles.farmImage}
            />
          )}
          
          {/* Floating Header */}
          <View style={styles.floatingHeader}>
            <TouchableOpacity 
              style={styles.floatingBackButton}
              onPress={() => navigation.goBack()}
            >
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            {farmland.available && (
              <View style={styles.floatingAvailabilityBadge}>
                <Text style={styles.floatingAvailabilityText}>Available</Text>
              </View>
            )}
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentCard}>
          {/* Image Thumbnails */}
          {hasMultipleImages && (
            <View style={styles.thumbnailSection}>
              <Text style={styles.thumbnailSectionTitle}>Property Photos</Text>
              <FlatList
                data={farmland.images}
                renderItem={renderThumbnail}
                keyExtractor={(item, index) => `thumb-${index}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbnailContainer}
              />
            </View>
          )}

          {/* Title and Location */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>{farmland.name}</Text>
            <View style={styles.locationContainer}>
              <View style={styles.locationIcon}>
                <MaterialIcons name="location-on" size={16} color="#22C55E" />
              </View>
              <Text style={styles.location}>{farmland.location}</Text>
            </View>
          </View>

          {/* Quick Info Cards */}
          <View style={styles.quickInfoContainer}>
            <View style={styles.quickInfoCard}>
              <View style={styles.quickInfoIcon}>
                <MaterialIcons name="landscape" size={24} color="#22C55E" />
              </View>
              <Text style={styles.quickInfoLabel}>Size</Text>
              <Text style={styles.quickInfoValue}>{farmland.size} acres</Text>
            </View>
            
            <View style={styles.quickInfoCard}>
              <View style={styles.quickInfoIcon}>
                <MaterialIcons name="attach-money" size={24} color="#22C55E" />
              </View>
              <Text style={styles.quickInfoLabel}>Price</Text>
              <Text style={styles.quickInfoValue}>${farmland.price.toLocaleString()}</Text>
            </View>

            {farmland.images && farmland.images.length > 0 && (
              <View style={styles.quickInfoCard}>
                <View style={styles.quickInfoIcon}>
                  <MaterialIcons name="photo-library" size={24} color="#22C55E" />
                </View>
                <Text style={styles.quickInfoLabel}>Photos</Text>
                <Text style={styles.quickInfoValue}>{farmland.images.length}</Text>
              </View>
            )}
          </View>

          {/* Description Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About This Property</Text>
            <Text style={styles.description}>{farmland.description}</Text>
          </View>

          {/* Features Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Features</Text>
            <View style={styles.featuresContainer}>
              <View style={styles.featureItem}>
                <MaterialIcons name="eco" size={20} color="#22C55E" />
                <Text style={styles.featureText}>Fertile Soil</Text>
              </View>
              <View style={styles.featureItem}>
                <MaterialIcons name="water-drop" size={20} color="#3B82F6" />
                <Text style={styles.featureText}>Water Access</Text>
              </View>
              <View style={styles.featureItem}>
                <MaterialIcons name="verified" size={20} color="#F59E0B" />
                <Text style={styles.featureText}>Verified Land</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Action */}
      <View style={styles.bottomAction}>
        <TouchableOpacity
          style={styles.inquireButton}
          onPress={() => navigation.navigate('InquiryForm', { farmlandId })}
        >
          <MaterialIcons name="message" size={20} color="#fff" />
          <Text style={styles.inquireButtonText}>Inquire About This Property</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingCard: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorCard: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  errorIconContainer: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 50,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  imageContainer: {
    position: 'relative',
    height: 320,
  },
  imageSlide: {
    width: width,
    height: 320,
  },
  farmImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageCounter: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  imageCounterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  activePaginationDot: {
    backgroundColor: '#fff',
    width: 24,
  },
  floatingHeader: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  floatingBackButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingAvailabilityBadge: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  floatingAvailabilityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contentCard: {
    backgroundColor: '#fff',
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  thumbnailSection: {
    marginBottom: 24,
  },
  thumbnailSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  thumbnailContainer: {
    paddingRight: 20,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  activeThumbnail: {
    borderColor: '#22C55E',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  titleSection: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 36,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    width: 24,
    height: 24,
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  location: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  quickInfoContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  quickInfoCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickInfoIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#DCFCE7',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickInfoLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  quickInfoValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    fontWeight: '400',
  },
  featuresContainer: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  featureText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
    marginLeft: 12,
  },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 20,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inquireButton: {
    backgroundColor: '#22C55E',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  inquireButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 8,
  },
});

export default FarmlandDetailsScreen;