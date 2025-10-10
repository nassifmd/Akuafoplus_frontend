import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { fetchMyInquiries, deleteInquiry } from '../services/farmlandApi';
import Config from '../Config/config';

interface Inquiry {
  _id: string;
  farmlandId: string | { _id: string; name: string; location: string; price: number; images: string[] };
  message: string;
  status: 'pending' | 'approved' | 'rejected' | 'Pending' | 'Responded' | 'Closed';
  createdAt: string;
  response?: string;
  farmland?: {
    _id: string;
    title?: string;
    name?: string;
    location: string;
    price?: number;
    size?: string;
    images?: any[];
    description?: string;
  };
}

// Custom Image Component with Error Handling
const CustomImage: React.FC<{
  source: any;
  style: any;
  fallbackComponent?: React.ReactNode;
}> = ({ source, style, fallbackComponent }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Don't pre-validate - let the Image component handle loading
  if (!source?.uri) {
    return fallbackComponent || (
      <View style={[style, styles.fallbackImage]}>
        <MaterialIcons name="image" size={40} color="#94A3B8" />
        <Text style={styles.fallbackText}>No Image Available</Text>
      </View>
    );
  }

  return (
    <View style={style}>
      <Image
        source={source}
        style={style}
        resizeMode="cover"
        onError={(error) => {
          console.log('CustomImage: Error loading image:', source.uri);
          setHasError(true);
        }}
        onLoadStart={() => setIsLoading(true)}
        onLoad={() => {
          console.log('CustomImage: Image loaded successfully:', source.uri);
          setIsLoading(false);
        }}
        onLoadEnd={() => setIsLoading(false)}
      />
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#388E3C" />
          <Text style={styles.loadingImageText}>Loading image...</Text>
        </View>
      )}
      {hasError && (
        <View style={styles.errorOverlay}>
          <MaterialIcons name="error-outline" size={40} color="#EF4444" />
          <Text style={styles.errorText}>Failed to load image</Text>
        </View>
      )}
    </View>
  );
};

const MyInquiriesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Simplified validation function
  const isValidImageUrl = (url: string): boolean => {
    if (!url) return false;
    
    // For HTTP URLs, do basic validation
    if (url.startsWith('http')) {
      try {
        new URL(url);
        return true;
      } catch (error) {
        return false;
      }
    }
    
    // For relative paths, always return true since we'll construct the full URL
    return true;
  };

  // Get image URI with proper object handling
  const getImageUri = (image: any): string => {
    if (image && typeof image === 'object' && image.url) {
      const imageUrl = image.url;
      if (imageUrl.startsWith('http')) {
        return imageUrl;
      }
      // Remove /api if needed
      return `${Config.API_BASE_URL.replace(/\/api$/, '')}/uploads/farmland/${imageUrl}`;
    }
    if (typeof image === 'string') {
      if (image.startsWith('http')) {
        return image;
      }
      return `${Config.API_BASE_URL.replace(/\/api$/, '')}/uploads/farmland/${image}`;
    }
    
    // If image is an object but we're not sure of its structure, try to extract URL
    if (image && typeof image === 'object') {
      // Try common property names
      const possibleUrls = [
        image.url,
        image.uri,
        image.source,
        image.path,
        image.filename
      ].filter(Boolean);
      
      if (possibleUrls.length > 0) {
        const firstUrl = possibleUrls[0];
        if (typeof firstUrl === 'string') {
          if (firstUrl.startsWith('http')) {
            return firstUrl;
          }
          return `${Config.API_BASE_URL}/uploads/farmland/${firstUrl}`;
        }
      }
    }
    
    console.log('Could not extract valid URL from image:', image);
    return '';
  };

  const loadInquiries = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await fetchMyInquiries();
      console.log('API Response:', JSON.stringify(response, null, 2));
      
      let inquiriesData: any[] = [];
      
      if (Array.isArray(response)) {
        inquiriesData = response;
      } else if (response && typeof response === 'object') {
        if ('data' in response && Array.isArray(response.data)) {
          inquiriesData = response.data;
        } else if ('inquiries' in response && Array.isArray(response.inquiries)) {
          inquiriesData = response.inquiries;
        }
      }
      
      const sanitizedInquiries: Inquiry[] = inquiriesData.map((inquiry: any) => {
        let farmlandIdValue = '';
        let farmlandData = null;
        
        if (typeof inquiry.farmlandId === 'object' && inquiry.farmlandId !== null) {
          farmlandIdValue = inquiry.farmlandId._id || '';
          farmlandData = inquiry.farmlandId;
        } else {
          farmlandIdValue = inquiry.farmlandId || '';
        }
        
        return {
          _id: inquiry._id || '',
          farmlandId: farmlandIdValue,
          message: String(inquiry.message || ''),
          status: (['pending', 'approved', 'rejected', 'Pending', 'Responded', 'Closed'].includes(inquiry.status) 
            ? inquiry.status 
            : 'pending') as Inquiry['status'],
          createdAt: inquiry.createdAt || new Date().toISOString(),
          response: inquiry.response ? String(inquiry.response) : undefined,
          farmland: farmlandData || inquiry.farmland || undefined
        };
      });

      // Enhanced debug logging for images
      console.log('Farmland images debug:');
      sanitizedInquiries.forEach((inquiry, index) => {
        const farmland = inquiry.farmland;
        if (farmland && farmland.images && farmland.images.length > 0) {
          const firstImage = farmland.images[0];
          const imageUri = getImageUri(firstImage);
          
          console.log(`Inquiry ${index}:`, {
            rawImage: firstImage,
            imageType: typeof firstImage,
            hasUrlProperty: !!(firstImage && typeof firstImage === 'object' && firstImage.url),
            urlValue: firstImage && typeof firstImage === 'object' ? firstImage.url : 'N/A',
            constructedUrl: imageUri,
            apiBaseUrl: Config.API_BASE_URL
          });
          
          // Test the URL construction
          if (firstImage && typeof firstImage === 'object' && firstImage.url) {
            const testUrl = `${Config.API_BASE_URL}/uploads/farmland/${firstImage.url}`;
            console.log(`Test URL: ${testUrl}`);
          }
        } else {
          console.log(`Inquiry ${index}: No images available`);
        }
      });

      setInquiries(sanitizedInquiries);
    } catch (error) {
      console.error('Error loading inquiries:', error);
      Alert.alert('Error', 'Failed to load inquiries');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadInquiries(false);
  };

  const handleDeleteInquiry = (inquiryId: string) => {
    Alert.alert(
      'Delete Inquiry',
      'Are you sure you want to delete this inquiry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteInquiry(inquiryId);
              setInquiries(prev => prev.filter(inquiry => inquiry._id !== inquiryId));
              Alert.alert('Success', 'Inquiry deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete inquiry');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'responded':
        return '#22C55E';
      case 'rejected':
      case 'closed':
        return '#EF4444';
      default:
        return '#F59E0B';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'responded':
        return 'check-circle';
      case 'rejected':
      case 'closed':
        return 'cancel';
      default:
        return 'pending';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number | undefined) => {
    if (!price || typeof price !== 'number') return 'Price not specified';
    return `$${price.toLocaleString()}`;
  };

  useFocusEffect(
    useCallback(() => {
      loadInquiries();
    }, [])
  );

  const renderFarmlandDetails = (inquiry: Inquiry) => {
    const farmland = inquiry.farmland ||
      (typeof inquiry.farmlandId === 'object' ? inquiry.farmlandId : null);

    if (!farmland) {
      return (
        <View style={styles.farmlandInfo}>
          <Text style={styles.farmlandId}>Farmland ID: {typeof inquiry.farmlandId === 'string' ? inquiry.farmlandId : 'N/A'}</Text>
        </View>
      );
    }

    const title = ('title' in farmland && farmland.title)
      ? farmland.title
      : farmland.name || `Farmland ${farmland._id?.substring(0, 8) || ''}`;

    // Get the first available image
    const firstImage = farmland.images && farmland.images.length > 0 
      ? farmland.images[0]
      : null;

    const imageUri = firstImage ? getImageUri(firstImage) : null;

    return (
      <View style={styles.farmlandInfo}>
        <Text style={styles.farmlandTitle}>{title}</Text>

        {/* Improved image rendering */}
        <View style={styles.imageContainer}>
          {imageUri ? (
            <CustomImage
              source={{ uri: imageUri }}
              style={styles.farmlandImage}
              fallbackComponent={
                <View style={styles.fallbackImage}>
                  <MaterialIcons name="image" size={40} color="#94A3B8" />
                  <Text style={styles.fallbackText}>No Image Available</Text>
                </View>
              }
            />
          ) : (
            <View style={styles.fallbackImage}>
              <MaterialIcons name="image" size={40} color="#94A3B8" />
              <Text style={styles.fallbackText}>No Image Available</Text>
            </View>
          )}
        </View>

        <View style={styles.farmlandDetails}>
          {farmland.location && (
            <View style={styles.detailRow}>
              <MaterialIcons name="location-on" size={16} color="#64748B" />
              <Text style={styles.detailText}>{String(farmland.location)}</Text>
            </View>
          )}
          {farmland.price && (
            <View style={styles.detailRow}>
              <MaterialIcons name="attach-money" size={16} color="#64748B" />
              <Text style={styles.detailText}>{formatPrice(Number(farmland.price))}</Text>
            </View>
          )}
          {'size' in farmland && farmland.size && (
            <View style={styles.detailRow}>
              <MaterialIcons name="aspect-ratio" size={16} color="#64748B" />
              <Text style={styles.detailText}>{String(farmland.size)}</Text>
            </View>
          )}
        </View>
        {'description' in farmland && farmland.description && (
          <Text style={styles.farmlandDescription} numberOfLines={3}>
            {String(farmland.description)}
          </Text>
        )}
      </View>
    );
  };

  const renderInquiry = (inquiry: Inquiry) => (
    <View key={inquiry._id} style={styles.inquiryCard}>
      <View style={styles.inquiryHeader}>
        <View style={styles.statusContainer}>
          <MaterialIcons 
            name={getStatusIcon(inquiry.status)} 
            size={20} 
            color={getStatusColor(inquiry.status)} 
          />
          <Text style={[styles.statusText, { color: getStatusColor(inquiry.status) }]}>
            {inquiry.status.charAt(0).toUpperCase() + inquiry.status.slice(1)}
          </Text>
        </View>
        <Text style={styles.dateText}>{formatDate(inquiry.createdAt)}</Text>
      </View>

      <View style={styles.divider} />

      {renderFarmlandDetails(inquiry)}

      <View style={styles.divider} />

      <View style={styles.messageContainer}>
        <Text style={styles.messageLabel}>Your Message:</Text>
        <Text style={styles.inquiryMessage}>{inquiry.message}</Text>
      </View>

      {inquiry.response && (
        <View style={styles.responseContainer}>
          <Text style={styles.responseLabel}>Owner's Response:</Text>
          <Text style={styles.responseText}>{inquiry.response}</Text>
        </View>
      )}

      <View style={styles.inquiryFooter}>
        {inquiry.status.toLowerCase() === 'pending' && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteInquiry(inquiry._id)}
          >
            <MaterialIcons name="delete" size={20} color="#EF4444" />
            <Text style={styles.deleteButtonText}>Delete Inquiry</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

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
          <Text style={styles.headerTitle}>My Inquiries</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#388E3C" />
          <Text style={styles.loadingText}>Loading inquiries...</Text>
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
        <Text style={styles.headerTitle}>My Inquiries</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {inquiries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="inbox" size={64} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Inquiries Yet</Text>
            <Text style={styles.emptySubtitle}>
              You haven't submitted any farmland inquiries yet.
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => navigation.navigate('FarmlandListing')}
            >
              <Text style={styles.browseButtonText}>Browse Farmlands</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inquiriesList}>
            <Text style={styles.sectionTitle}>
              {inquiries.length} Inquir{inquiries.length === 1 ? 'y' : 'ies'}
            </Text>
            {inquiries.map(renderInquiry)}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#388E3C',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  inquiriesList: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  inquiryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inquiryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    textTransform: 'capitalize',
  },
  dateText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  farmlandInfo: {
    marginBottom: 12,
  },
  farmlandId: {
    fontSize: 14,
    color: '#64748B',
    fontStyle: 'italic',
  },
  farmlandTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  farmlandImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
  },
  farmlandDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 6,
  },
  farmlandDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  messageContainer: {
    marginBottom: 12,
  },
  messageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
  },
  inquiryMessage: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
  },
  responseContainer: {
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E',
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 6,
  },
  responseText: {
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
  },
  inquiryFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
  },
  deleteButtonText: {
    fontSize: 14,
    color: '#EF4444',
    marginLeft: 6,
    fontWeight: '500',
  },
  fallbackImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  fallbackText: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748B',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  loadingImageText: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748B',
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
});

export default MyInquiriesScreen;