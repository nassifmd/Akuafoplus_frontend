import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Config from '../Config/config';
import AlertPro from 'react-native-alert-pro';

type RootStackParamList = {
  ProductDetail: { productId: string };
  TradeScreen: undefined;
  Cart: undefined;
  Wishlist: undefined;
};

type ProductDetailScreenRouteProp = RouteProp<RootStackParamList, 'ProductDetail'>;
type ProductDetailScreenNavigationProp = StackNavigationProp<RootStackParamList>;

interface Props {
  route: ProductDetailScreenRouteProp;
}

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  comparePrice?: number;
  category: string;
  subCategory: string;
  images: string[];
  quantity: number;
  ratingsAverage: number;
  ratingsQuantity: number;
  seller: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  isFeatured: boolean;
  specifications?: { [key: string]: string };
  tags?: string[];
  reviews?: Review[];
}

interface Review {
  _id: string;
  user: {
    _id: string;
    name: string;
  };
  rating: number;
  comment: string;
  createdAt: string;
}

const { width, height } = Dimensions.get('window');

const ProductDetailScreen: React.FC<Props> = ({ route }) => {
  const { productId } = route.params;
  const navigation = useNavigation<ProductDetailScreenNavigationProp>();
  const alertRef = useRef<AlertPro>(null);
  
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'description' | 'reviews' | 'specifications'>('description');

  // Show alert using AlertPro
  const showAlert = (title: string, message: string, type: 'success' | 'error' = 'success') => {
    if (alertRef.current) {
      alertRef.current.open();
    }
  };

  // Get auth headers - Updated to use the correct token key
  const getAuthHeaders = async () => {
    // Try both token keys for backward compatibility
    let token = await AsyncStorage.getItem('accessToken'); // This is what LoginScreen stores
    if (!token) {
      token = await AsyncStorage.getItem('authToken'); // Fallback for older versions
    }
    
    console.log('🔑 Retrieved token for headers:', token ? 'Token found' : 'No token');
    
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  // Extract reviews from product data
  const extractReviewsFromProduct = (productData: any) => {
    console.log('🔍 Extracting reviews from product data:', productData.reviews);
    // Check if reviews are included in the product response
    if (productData.reviews && Array.isArray(productData.reviews)) {
      console.log('✅ Found embedded reviews:', productData.reviews.length);
      setReviews(productData.reviews);
    } else {
      console.log('❌ No embedded reviews found');
      setReviews([]);
    }
  };

  // Fetch product reviews - Updated to handle embedded reviews
  const fetchReviews = async () => {
    try {
      console.log('📡 Fetching reviews for product:', productId);
      
      // First try to get reviews from the product data (embedded approach)
      if (product && product.reviews) {
        console.log('✅ Using embedded reviews from product');
        setReviews(product.reviews);
        return;
      }
      
      // If not found in product, try the dedicated endpoint (for backward compatibility)
      const reviewsUrl = `${Config.API_BASE_URL}/products/${productId}/reviews`;
      console.log('📡 Fetching reviews from URL:', reviewsUrl);
      
      const response = await axios.get(reviewsUrl, {
        headers: await getAuthHeaders(),
      });

      console.log('📡 Reviews API Response:', response.data);

      if (response.data.status === 'success') {
        const reviewsData = response.data.data.reviews || [];
        console.log('✅ Reviews fetched successfully:', reviewsData.length);
        setReviews(reviewsData);
      } else {
        console.log('❌ Reviews API returned unsuccessful status:', response.data.status);
      }
    } catch (error: any) {
      console.error('❌ Error fetching reviews:', error);
      console.log('📊 Error details:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        url: error.config?.url
      });
      
      // If reviews endpoint doesn't exist (404), try to extract from product
      if (error.response?.status === 404 && product) {
        console.log('🔄 Reviews endpoint not available (404), checking for embedded reviews');
        extractReviewsFromProduct(product);
      } else {
        // For other errors, set empty reviews
        console.log('🔄 Setting empty reviews due to error');
        setReviews([]);
      }
    }
  };

  // Fetch product details
  const fetchProduct = async () => {
    try {
      setLoading(true);
      const productUrl = `${Config.API_BASE_URL}/products/${productId}`;
      console.log('📡 Fetching product from URL:', productUrl);
      
      const response = await axios.get(productUrl, {
        headers: await getAuthHeaders(),
      });

      console.log('📡 Product API Response:', response.data);

      if (response.data.status === 'success') {
        const productData = response.data.data.product;
        console.log('✅ Product fetched successfully:', productData.name);
        console.log('📊 Product data structure:', {
          hasReviews: !!productData.reviews,
          reviewsCount: productData.reviews?.length || 0,
          category: productData.category,
          quantity: productData.quantity
        });
        
        setProduct(productData);
        
        // Extract reviews from product data if available
        if (productData.reviews && productData.reviews.length > 0) {
          console.log('✅ Using embedded reviews from product response');
          setReviews(productData.reviews);
        } else {
          // Only try to fetch reviews separately if not in product data
          console.log('🔄 No embedded reviews, attempting separate fetch');
          await fetchReviews().catch(() => console.log('❌ Reviews fetch failed, continuing without reviews'));
        }
        
        console.log('🔄 Starting parallel requests for related products and wishlist');
        await Promise.all([
          fetchRelatedProducts(productData.category).catch(() => console.log('❌ Related products fetch failed')),
          checkIfInWishlist().catch(() => console.log('❌ Wishlist check failed')),
        ]);
      } else {
        console.log('❌ Product API returned unsuccessful status:', response.data.status);
      }
    } catch (error: any) {
      console.error('❌ Error fetching product:', error);
      console.log('📊 Product fetch error details:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        url: error.config?.url
      });
      showAlert('Error', 'Failed to load product details', 'error');
    } finally {
      setLoading(false);
      console.log('✅ Product fetch completed');
    }
  };

  // Fetch related products
  const fetchRelatedProducts = async (category: string) => {
    try {
      const relatedUrl = `${Config.API_BASE_URL}/products?category=${category}&limit=10`;
      console.log('📡 Fetching related products from URL:', relatedUrl);
      
      const response = await axios.get(relatedUrl, {
        headers: await getAuthHeaders(),
      });

      console.log('📡 Related Products API Response:', response.data);

      if (response.data.status === 'success') {
        const allProducts = response.data.data.products;
        const filtered = allProducts.filter((p: Product) => p._id !== productId);
        const relatedProducts = filtered.slice(0, 6);
        
        console.log('✅ Related products fetched:', {
          total: allProducts.length,
          filtered: filtered.length,
          final: relatedProducts.length
        });
        
        setRelatedProducts(relatedProducts);
      } else {
        console.log('❌ Related products API returned unsuccessful status:', response.data.status);
      }
    } catch (error: any) {
      console.error('❌ Error fetching related products:', error);
      console.log('📊 Related products error details:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        url: error.config?.url
      });
    }
  };

  // Check if product is in wishlist - Updated token retrieval
  const checkIfInWishlist = async () => {
    try {
      // Use the same token retrieval logic
      let token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        token = await AsyncStorage.getItem('authToken');
      }
      
      if (!token) {
        console.log('⚠️ No auth token found, skipping wishlist check');
        return;
      }

      console.log('🔑 Using token for wishlist check:', token ? 'Token available' : 'No token');

      const wishlistUrl = `${Config.API_BASE_URL}/wishlist`;
      console.log('📡 Checking wishlist from URL:', wishlistUrl);

      const response = await axios.get(wishlistUrl, {
        headers: await getAuthHeaders(),
      });

      console.log('📡 Wishlist API Response:', response.data);

      if (response.data.status === 'success') {
        const wishlistData = response.data.data.wishlist || response.data.data;
        let wishlistProductIds: string[] = [];

        if (wishlistData && wishlistData.products) {
          wishlistProductIds = wishlistData.products.map((product: any) => product._id);
          console.log('✅ Wishlist products format detected:', wishlistProductIds.length);
        } else if (wishlistData && wishlistData.items) {
          wishlistProductIds = wishlistData.items.map((item: any) => 
            typeof item.product === 'string' ? item.product : item.product._id
          );
          console.log('✅ Wishlist items format detected:', wishlistProductIds.length);
        }

        const isInWishlist = wishlistProductIds.includes(productId);
        console.log('📊 Wishlist check result:', {
          productId,
          isInWishlist,
          wishlistIds: wishlistProductIds
        });

        setIsInWishlist(isInWishlist);
      } else {
        console.log('❌ Wishlist API returned unsuccessful status:', response.data.status);
      }
    } catch (error: any) {
      console.error('❌ Error checking wishlist:', error);
      console.log('📊 Wishlist check error details:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        url: error.config?.url
      });
    }
  };

  // Toggle wishlist - Updated with better error handling and logging
  const toggleWishlist = async () => {
    try {
      // Use the same token retrieval logic
      let token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        token = await AsyncStorage.getItem('authToken');
      }
      
      if (!token) {
        console.log('⚠️ No auth token found for wishlist toggle');
        showAlert('Authentication Required', 'Please login to manage wishlist', 'error');
        return;
      }

      console.log('🔑 Using token for wishlist toggle:', token ? 'Token available' : 'No token');
      console.log('🔄 Toggling wishlist for product:', productId, 'Current state:', isInWishlist);

      if (isInWishlist) {
        // Remove from wishlist
        const removeUrl = `${Config.API_BASE_URL}/wishlist/${productId}`;
        console.log('📡 Removing from wishlist, URL:', removeUrl);
        
        const response = await axios.delete(removeUrl, {
          headers: await getAuthHeaders(),
        });
        
        console.log('📡 Remove from wishlist response:', response.data);
        setIsInWishlist(false);
        console.log('✅ Product removed from wishlist');
        showAlert('Success', 'Removed from wishlist', 'success');
      } else {
        // Add to wishlist - Fixed payload structure
        const addUrl = `${Config.API_BASE_URL}/wishlist`;
        
        // Try different payload structures that the backend might expect
        const requestData = { 
          productId: productId.toString().trim() // Ensure it's a clean string
        };
        
        console.log('📡 Adding to wishlist, URL:', addUrl);
        console.log('📊 Request data:', JSON.stringify(requestData, null, 2));
        console.log('📊 Product ID validation:', {
          productId,
          type: typeof productId,
          length: productId?.length,
          trimmed: productId?.toString().trim()
        });
        
        // Validate productId before sending
        if (!productId || typeof productId !== 'string' || productId.trim() === '') {
          console.error('❌ Invalid productId:', productId);
          showAlert('Error', 'Invalid product ID', 'error');
          return;
        }
        
        // Check if productId looks like a valid MongoDB ObjectId (24 hex characters)
        const objectIdRegex = /^[0-9a-fA-F]{24}$/;
        if (!objectIdRegex.test(productId.trim())) {
          console.error('❌ Invalid MongoDB ObjectId format:', productId);
          showAlert('Error', 'Invalid product ID format', 'error');
          return;
        }
        
        const headers = await getAuthHeaders();
        console.log('📊 Request headers:', JSON.stringify(headers, null, 2));
        
        const response = await axios.post(addUrl, requestData, {
          headers: headers,
          timeout: 15000, // 15 second timeout
          validateStatus: (status) => status < 500, // Don't throw for 4xx errors
        });
        
        console.log('📡 Add to wishlist response status:', response.status);
        console.log('📡 Add to wishlist response:', JSON.stringify(response.data, null, 2));
        
        if (response.status === 200 || response.status === 201) {
          if (response.data.status === 'success') {
            setIsInWishlist(true);
            console.log('✅ Product added to wishlist');
            showAlert('Success', 'Added to wishlist', 'success');
          } else {
            console.log('❌ API returned unsuccessful status:', response.data.status);
            const errorMessage = response.data.message || 'Failed to add to wishlist';
            showAlert('Error', errorMessage, 'error');
          }
        } else {
          // Handle 4xx errors
          console.log('❌ HTTP error status:', response.status);
          const errorMessage = response.data?.message || `HTTP ${response.status} error`;
          showAlert('Error', errorMessage, 'error');
        }
      }
    } catch (error: any) {
      console.error('❌ Error toggling wishlist:', error);
      
      // Enhanced error logging
      if (error.response) {
        console.log('📊 Error response status:', error.response.status);
        console.log('📊 Error response headers:', JSON.stringify(error.response.headers, null, 2));
        console.log('📊 Error response data:', JSON.stringify(error.response.data, null, 2));
      }
      
      if (error.request) {
        console.log('📊 Error request config:', {
          url: error.request._url || error.config?.url,
          method: error.request._method || error.config?.method,
          headers: error.request._headers || error.config?.headers,
          data: error.config?.data
        });
      }
      
      // More specific error handling
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        console.log('🔍 400 Error Details:', {
          message: errorData?.message,
          error: errorData?.error,
          details: errorData?.details,
          productId: productId,
          productIdType: typeof productId,
          requestData: error.config?.data
        });
        
        // Try to provide specific error messages based on common issues
        let userMessage = 'Bad request';
        if (errorData?.message) {
          userMessage = errorData.message;
        } else if (errorData?.error?.includes('productId')) {
          userMessage = 'Invalid product ID provided';
        } else if (errorData?.error?.includes('validation')) {
          userMessage = 'Product validation failed';
        } else if (errorData?.error?.includes('ObjectId')) {
          userMessage = 'Invalid product ID format';
        }
        
        showAlert('Error', userMessage, 'error');
      } else if (error.response?.status === 401) {
        console.log('🔍 401 Error - Unauthorized');
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'authToken']);
        showAlert('Authentication Required', 'Please login again', 'error');
      } else if (error.response?.status === 404) {
        console.log('🔍 404 Error - Endpoint not found');
        showAlert('Error', 'Wishlist service not available', 'error');
      } else if (error.response?.status === 409) {
        console.log('🔍 409 Error - Conflict (item might already be in wishlist)');
        setIsInWishlist(true); // Update state to reflect reality
        showAlert('Info', 'Item is already in your wishlist', 'success');
      } else if (error.code === 'ECONNABORTED') {
        console.log('🔍 Request timeout');
        showAlert('Error', 'Request timeout - please try again', 'error');
      } else if (error.code === 'NETWORK_ERROR') {
        console.log('🔍 Network error');
        showAlert('Error', 'Network error - check your connection', 'error');
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to update wishlist';
        showAlert('Error', errorMessage, 'error');
      }
    }
  };

  // Add to cart - Updated token retrieval
  const addToCart = async () => {
    try {
      setAddingToCart(true);
      
      // Use the same token retrieval logic
      let token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        token = await AsyncStorage.getItem('authToken');
      }
      
      if (!token) {
        console.log('⚠️ No auth token found for add to cart');
        showAlert('Authentication Required', 'Please login to add items to cart', 'error');
        return;
      }

      console.log('🔑 Using token for add to cart:', token ? 'Token available' : 'No token');

      const cartUrl = `${Config.API_BASE_URL}/cart`;
      const cartData = { productId, quantity };
      
      console.log('📡 Adding to cart, URL:', cartUrl);
      console.log('📊 Cart data:', cartData);
      console.log('📊 Request headers:', await getAuthHeaders());

      const response = await axios.post(cartUrl, cartData, { 
        headers: await getAuthHeaders() 
      });

      console.log('📡 Add to cart response:', response.data);

      if (response.data.status === 'success') {
        console.log('✅ Product added to cart successfully');
        showAlert('Success', `Added ${quantity} item(s) to cart!`, 'success');
      } else {
        console.log('❌ Add to cart returned unsuccessful status:', response.data.status);
        showAlert('Error', response.data.message || 'Failed to add to cart', 'error');
      }
    } catch (error: any) {
      console.error('❌ Error adding to cart:', error);
      console.log('📊 Add to cart error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.response?.data?.message,
        url: error.config?.url,
        method: error.config?.method,
        requestData: error.config?.data,
        headers: error.config?.headers
      });
      
      // More specific error handling
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.message || 'Invalid request format';
        console.log('🔍 400 Error - Bad Request:', errorMessage);
        showAlert('Error', `Request failed: ${errorMessage}`, 'error');
      } else if (error.response?.status === 401) {
        console.log('🔍 401 Error - Unauthorized');
        showAlert('Authentication Required', 'Please login again', 'error');
      } else {
        const errorMessage = error.response?.data?.message || 'Failed to add to cart';
        showAlert('Error', errorMessage, 'error');
      }
    } finally {
      setAddingToCart(false);
      console.log('🏁 Add to cart process completed');
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  // Render image carousel
  const renderImageCarousel = () => (
    <View style={styles.imageCarousel}>
      <FlatList
        data={product?.images || []}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentImageIndex(index);
        }}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={styles.productImage} resizeMode="cover" />
        )
        }
        keyExtractor={(item, index) => index.toString()}
      />
      
      {/* Image indicators */}
      <View style={styles.imageIndicators}>
        {product?.images?.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              { backgroundColor: index === currentImageIndex ? '#2E7D32' : '#ccc' }
            ]}
          />
        ))}
      </View>

      {/* Wishlist button */}
      <TouchableOpacity style={styles.wishlistBtn} onPress={toggleWishlist}>
        <MaterialIcon
          name={isInWishlist ? "favorite" : "favorite-border"}
          size={24}
          color={isInWishlist ? "#FF6B6B" : "#666"}
        />
      </TouchableOpacity>

      {/* Discount badge */}
      {product?.comparePrice && product.comparePrice > product.price && (
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>
            {Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)}% OFF
          </Text>
        </View>
      )}
    </View>
  );

  // Render rating stars
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Icon
          key={i}
          name="star"
          size={16}
          color={i <= rating ? "#FFD700" : "#E0E0E0"}
          style={{ marginRight: 2 }}
        />
      );
    }
    return stars;
  };

  // Render related product item
  const renderRelatedProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.relatedProductCard}
      onPress={() => navigation.push('ProductDetail', { productId: item._id })}
    >
      <Image source={{ uri: item.images[0] }} style={styles.relatedProductImage} />
      <Text style={styles.relatedProductName} numberOfLines={2}>{item.name}</Text>
      <Text style={styles.relatedProductPrice}>GH₵{item.price.toFixed(2)}</Text>
    </TouchableOpacity>
  );

  // Updated Tab Content to handle missing reviews gracefully
  const renderTabContent = () => {
    return (
      <View style={styles.tabContent}>
        {selectedTab === 'description' && (
          <Text style={styles.description}>{product?.description}</Text>
        )}

        {selectedTab === 'reviews' && (
          <View>
            {reviews.length === 0 ? (
              <View style={styles.noReviewsContainer}>
                <Icon name="message-circle" size={48} color="#ccc" />
                <Text style={styles.noReviews}>No reviews available</Text>
                <Text style={styles.noReviewsSubtext}>
                  Be the first to review this product!
                </Text>
              </View>
            ) : (
              reviews.map((review) => (
                <View key={review._id} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewerName}>{review.user.name}</Text>
                    <View style={styles.reviewStars}>
                      {renderStars(review.rating)}
                    </View>
                  </View>
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                  <Text style={styles.reviewDate}>
                    {new Date(review.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {selectedTab === 'specifications' && product?.specifications && (
          <View>
            {Object.entries(product.specifications).map(([key, value]) => (
              <View key={key} style={styles.specItem}>
                <Text style={styles.specKey}>{key}:</Text>
                <Text style={styles.specValue}>{value}</Text>
              </View>
            ))}
          </View>
        )}

        {selectedTab === 'specifications' && !product?.specifications && (
          <View style={styles.noSpecsContainer}>
            <Icon name="file-text" size={48} color="#ccc" />
            <Text style={styles.noSpecs}>No specifications available</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="white" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Loading product details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="white" />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={64} color="#FF6B6B" />
          <Text style={styles.errorTitle}>Product Not Found</Text>
          <Text style={styles.errorSubtitle}>The product you're looking for doesn't exist.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{product.name}</Text>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('Cart')}>
          <Icon name="shopping-cart" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image Carousel */}
        {renderImageCarousel()}

        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.name}</Text>
          
          <View style={styles.ratingContainer}>
            <View style={styles.stars}>
              {renderStars(Math.round(product.ratingsAverage))}
            </View>
            <Text style={styles.ratingText}>
              {product.ratingsAverage.toFixed(1)} ({product.ratingsQuantity} reviews)
            </Text>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.price}>GH₵{product.price.toFixed(2)}</Text>
            {product.comparePrice && product.comparePrice > product.price && (
              <Text style={styles.comparePrice}>GH₵{product.comparePrice.toFixed(2)}</Text>
            )}
          </View>

          <View style={styles.sellerInfo}>
            <Icon name="user" size={16} color="#666" />
            <Text style={styles.sellerText}>Sold by {product.seller.name}</Text>
          </View>

          <View style={styles.stockInfo}>
            <Icon name="package" size={16} color={product.quantity > 0 ? "#2E7D32" : "#FF6B6B"} />
            <Text style={[styles.stockText, { color: product.quantity > 0 ? "#2E7D32" : "#FF6B6B" }]}>
              {product.quantity > 0 ? `${product.quantity} in stock` : 'Out of stock'}
            </Text>
          </View>
        </View>

        {/* Quantity Selector */}
        {product.quantity > 0 && (
          <View style={styles.quantitySection}>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Icon name="minus" size={20} color="#333" />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setQuantity(Math.min(product.quantity, quantity + 1))}
              >
                <Icon name="plus" size={20} color="#333" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'description' && styles.activeTab]}
            onPress={() => setSelectedTab('description')}
          >
            <Text style={[styles.tabText, selectedTab === 'description' && styles.activeTabText]}>
              Description
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'reviews' && styles.activeTab]}
            onPress={() => setSelectedTab('reviews')}
          >
            <Text style={[styles.tabText, selectedTab === 'reviews' && styles.activeTabText]}>
              Reviews ({reviews.length})
            </Text>
          </TouchableOpacity>
          {product.specifications && (
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'specifications' && styles.activeTab]}
              onPress={() => setSelectedTab('specifications')}
            >
              <Text style={[styles.tabText, selectedTab === 'specifications' && styles.activeTabText]}>
                Specs
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tab Content */}
        {renderTabContent()}

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <View style={styles.relatedSection}>
            <Text style={styles.sectionTitle}>Related Products</Text>
            <FlatList
              data={relatedProducts}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={renderRelatedProduct}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.relatedProductsList}
            />
          </View>
        )}
      </ScrollView>

      {/* Bottom Action Bar */}
      {product.quantity > 0 && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.buyNowButton} onPress={addToCart} disabled={addingToCart}>
            {addingToCart ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Icon name="shopping-cart" size={20} color="white" />
                <Text style={styles.buyNowText}>Add to Cart</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <AlertPro
        ref={alertRef}
        title="Alert"
        message="Alert message"
        onConfirm={() => alertRef.current?.close()}
        showCancel={false}
        textConfirm="OK"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerButton: {
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginHorizontal: 10,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  backButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageCarousel: {
    height: 300,
    position: 'relative',
  },
  productImage: {
    width: width,
    height: 300,
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 15,
    alignSelf: 'center',
    flexDirection: 'row',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  wishlistBtn: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: 15,
    left: 15,
    backgroundColor: '#FF5722',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  productInfo: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 10,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  comparePrice: {
    fontSize: 18,
    color: '#999',
    textDecorationLine: 'line-through',
    marginLeft: 10,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sellerText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  quantitySection: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 20,
    minWidth: 30,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2E7D32',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  tabContent: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 10,
    minHeight: 150,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  noReviewsContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noReviews: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 10,
  },
  noReviewsSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
  },
  reviewItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 15,
    marginBottom: 15,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  reviewStars: {
    flexDirection: 'row',
  },
  reviewComment: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 5,
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
  },
  specItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  specKey: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  specValue: {
    fontSize: 14,
    color: '#666',
    flex: 2,
    textAlign: 'right',
  },
  relatedSection: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 100,
  },
  relatedProductsList: {
    paddingVertical: 10,
  },
  relatedProductCard: {
    width: 120,
    marginRight: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    overflow: 'hidden',
  },
  relatedProductImage: {
    width: '100%',
    height: 100,
  },
  relatedProductName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    padding: 8,
    paddingBottom: 4,
  },
  relatedProductPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buyNowButton: {
    backgroundColor: '#2E7D32',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 8,
  },
  buyNowText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  noSpecsContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noSpecs: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 10,
  },
});

export default ProductDetailScreen;