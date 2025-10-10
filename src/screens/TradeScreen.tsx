import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  SafeAreaView
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from '@react-navigation/stack';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Config from '../Config/config';
import AlertPro from 'react-native-alert-pro';

// Update the type definition to match your actual navigation structure
type RootStackParamList = {
  TradeScreen: undefined;
  ProductDetail: { productId: string };
  Cart: undefined;
  Wishlist: undefined;
  OrderScreen: undefined;
  // Add other screens as needed
};

type TradeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

// Types
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
  };
  isFeatured: boolean;
}

interface CartItem {
  _id: string;
  product: Product;
  quantity: number;
  price: number;
}

interface Cart {
  _id: string;
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}

const TradeScreen = () => {
  const navigation = useNavigation<TradeScreenNavigationProp>();
  const alertRef = useRef<AlertPro>(null);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [cart, setCart] = useState<Cart | null>(null);
  const [wishlistItems, setWishlistItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Show alert using AlertPro
  const showAlert = (title: string, message: string, type: 'success' | 'error' = 'success') => {
    if (alertRef.current) {
      alertRef.current.open();
    }
  };

  // Get auth headers
  const getAuthHeaders = async () => {
    let token = await AsyncStorage.getItem('accessToken');
    if (!token) {
      token = await AsyncStorage.getItem('authToken');
    }
    
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  // Fetch products using axios
  const fetchProducts = useCallback(async (pageNum = 1, reset = false) => {
    try {
      setLoading(pageNum === 1);
      
      const params = {
        page: pageNum,
        limit: 10,
        sort: sortBy,
        ...(selectedCategory !== "All" && { category: selectedCategory }),
        ...(searchQuery && { q: searchQuery }),
      };

      const endpoint = `${Config.API_BASE_URL}/products`;
      const headers = await getAuthHeaders();

      const response = await axios.get(endpoint, {
        params,
        headers,
      });

      if (response.data.status === 'success') {
        if (reset || pageNum === 1) {
          setProducts(response.data.data.products);
        } else {
          setProducts(prev => [...prev, ...response.data.data.products]);
        }
        setHasMore(response.data.data.pagination.hasNextPage);
      }
    } catch (error: any) {
      console.error('Error fetching products:', error);
      showAlert('Error', 'Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery, sortBy]);

  // Fetch featured products using axios
  const fetchFeaturedProducts = async () => {
    try {
      const endpoint = `${Config.API_BASE_URL}/ecommerce/featured`;
      const headers = await getAuthHeaders();
      const response = await axios.get(endpoint, { headers });

      if (response.data.status === 'success') {
        setFeaturedProducts(response.data.data.products);
      }
    } catch (error: any) {
      console.error('Error fetching featured products:', error);
    }
  };

  // Fetch categories using axios
  const fetchCategories = async () => {
    try {
      const endpoint = `${Config.API_BASE_URL}/ecommerce/categories`;
      const headers = await getAuthHeaders();
      const response = await axios.get(endpoint, { headers });

      if (response.data.status === 'success') {
        setCategories(['All', ...response.data.data.categories]);
      }
    } catch (error: any) {
      console.error('Error fetching categories:', error);
    }
  };

  // Fetch cart using axios
  const fetchCart = async () => {
    try {
      let token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        token = await AsyncStorage.getItem('authToken');
      }
      
      if (!token) {
        return;
      }

      const endpoint = `${Config.API_BASE_URL}/cart`;
      const headers = await getAuthHeaders();
      const response = await axios.get(endpoint, { headers });

      if (response.data.status === 'success') {
        setCart(response.data.data.cart);
      }
    } catch (error: any) {
      console.error('Error fetching cart:', error);
    }
  };

  // Fetch wishlist using axios
  const fetchWishlist = async () => {
    try {
      let token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        token = await AsyncStorage.getItem('authToken');
      }
      
      if (!token) {
        return;
      }

      const endpoint = `${Config.API_BASE_URL}/wishlist`;
      const headers = await getAuthHeaders();
      const response = await axios.get(endpoint, { headers });

      if (response.data.status === 'success') {
        const wishlistData = response.data.data.wishlist || response.data.data;
        
        if (wishlistData && wishlistData.products) {
          const wishlistProductIds = wishlistData.products.map((product: any) => product._id);
          setWishlistItems(wishlistProductIds);
        } else if (wishlistData && wishlistData.items) {
          const wishlistProductIds = wishlistData.items.map((item: any) => 
            typeof item.product === 'string' ? item.product : item.product._id
          );
          setWishlistItems(wishlistProductIds);
        } else if (Array.isArray(wishlistData)) {
          const wishlistProductIds = wishlistData.map((product: any) => product._id);
          setWishlistItems(wishlistProductIds);
        } else {
          setWishlistItems([]);
        }
      }
    } catch (error: any) {
      console.error('Error fetching wishlist:', error);
      if (error.response?.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'authToken']);
        setWishlistItems([]);
      } else if (error.response?.status === 404) {
        setWishlistItems([]);
      }
    }
  };

  // Add to cart using axios
  const addToCart = async (productId: string, quantity: number = 1) => {
    try {
      let token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        token = await AsyncStorage.getItem('authToken');
      }
      
      if (!token) {
        showAlert('Authentication Required', 'Please login to add items to cart', 'error');
        return;
      }

      const endpoint = `${Config.API_BASE_URL}/cart`;
      const payload = { productId, quantity };
      const headers = await getAuthHeaders();

      const response = await axios.post(endpoint, payload, { headers });

      if (response.data.status === 'success') {
        setCart(response.data.data.cart);
        showAlert('Success', 'Product added to cart!', 'success');
      } else {
        showAlert('Error', response.data.message || 'Failed to add to cart', 'error');
      }
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      
      if (error.response?.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'authToken']);
        showAlert('Authentication Required', 'Please login to add items to cart', 'error');
      } else {
        const errorMessage = error.response?.data?.message || 'Failed to add to cart';
        showAlert('Error', errorMessage, 'error');
      }
    }
  };

  // Toggle wishlist - Enhanced version with better conflict handling
  const toggleWishlist = async (productId: string) => {
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
      console.log('🔄 Toggling wishlist for product:', productId, 'Current state:', isInWishlist(productId));

      if (isInWishlist(productId)) {
        // Remove from wishlist
        const removeUrl = `${Config.API_BASE_URL}/wishlist/${productId}`;
        console.log('📡 Removing from wishlist, URL:', removeUrl);
        
        const response = await axios.delete(removeUrl, {
          headers: await getAuthHeaders(),
          timeout: 15000,
          validateStatus: (status) => status < 500,
        });
        
        console.log('📡 Remove from wishlist response:', response.status, response.data);
        
        if (response.status === 200 || response.status === 204) {
          if (response.data?.status === 'success' || response.status === 204) {
            setWishlistItems(prev => prev.filter(id => id !== productId));
            console.log('✅ Product removed from wishlist');
            showAlert('Success', 'Removed from wishlist', 'success');
            await fetchWishlist(); // Refresh wishlist
          } else {
            console.log('❌ API returned unsuccessful status:', response.data?.status);
            const errorMessage = response.data?.message || 'Failed to remove from wishlist';
            showAlert('Error', errorMessage, 'error');
          }
        } else {
          console.log('❌ HTTP error status:', response.status);
          const errorMessage = response.data?.message || `HTTP ${response.status} error`;
          showAlert('Error', errorMessage, 'error');
        }
      } else {
        // Add to wishlist - Enhanced validation and error handling
        const addUrl = `${Config.API_BASE_URL}/wishlist`;
        
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
            setWishlistItems(prev => [...prev, productId]);
            console.log('✅ Product added to wishlist');
            showAlert('Success', 'Added to wishlist', 'success');
            await fetchWishlist(); // Refresh wishlist
          } else {
            console.log('❌ API returned unsuccessful status:', response.data.status);
            const errorMessage = response.data.message || 'Failed to add to wishlist';
            showAlert('Error', errorMessage, 'error');
          }
        } else if (response.status === 400 && response.data?.message === 'Product already in wishlist') {
          // Handle the specific case where product is already in wishlist
          console.log('🔍 Product already in wishlist - updating local state');
          setWishlistItems(prev => {
            // Only add if not already present
            if (!prev.includes(productId)) {
              return [...prev, productId];
            }
            return prev;
          });
          showAlert('Info', 'Item is already in your wishlist', 'success');
          await fetchWishlist(); // Refresh wishlist to sync state
        } else {
          // Handle other 4xx errors
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
        
        // Special handling for "already in wishlist" case
        if (errorData?.message === 'Product already in wishlist') {
          console.log('🔍 Handling "already in wishlist" scenario');
          setWishlistItems(prev => {
            if (!prev.includes(productId)) {
              return [...prev, productId];
            }
            return prev;
          });
          showAlert('Info', 'Item is already in your wishlist', 'success');
          await fetchWishlist(); // Refresh wishlist to sync state
          return; // Exit early for this specific case
        }
        
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
        setWishlistItems(prev => {
          if (!prev.includes(productId)) {
            return [...prev, productId];
          }
          return prev;
        });
        showAlert('Info', 'Item is already in your wishlist', 'success');
        await fetchWishlist(); // Refresh wishlist
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

  // Check if product is in wishlist
  const isInWishlist = (productId: string) => {
    return wishlistItems.includes(productId);
  };

  useEffect(() => {
    fetchProducts(1, true);
    fetchFeaturedProducts();
    fetchCategories();
    fetchCart();
    fetchWishlist();
  }, [fetchProducts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await Promise.all([
      fetchProducts(1, true),
      fetchFeaturedProducts(),
      fetchCart(),
      fetchWishlist(),
    ]);
    setRefreshing(false);
  }, [fetchProducts]);

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchProducts(nextPage);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setPage(1);
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setPage(1);
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    setPage(1);
  };

  // Navigation handlers
  const handleProductPress = (productId: string) => {
    navigation.navigate('ProductDetail', { productId });
  };

  const handleCartPress = () => {
    navigation.navigate('Cart');
  };

  const handleWishlistPress = () => {
    navigation.navigate('Wishlist');
  };

  const handleOrdersPress = () => {
    navigation.navigate('OrderScreen');
  };

  // Render product card
  const renderProductCard = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => handleProductPress(item._id)}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.images[0] }}
          style={styles.productImage}
          resizeMode="cover"
        />
        
        {item.comparePrice && item.comparePrice > item.price && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>
              {Math.round(((item.comparePrice - item.price) / item.comparePrice) * 100)}% OFF
            </Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.wishlistButton}
          onPress={(e) => {
            e.stopPropagation(); // Prevent product card navigation when clicking wishlist
            toggleWishlist(item._id);
          }}
          activeOpacity={0.7}
        >
          <MaterialIcon 
            name={isInWishlist(item._id) ? "favorite" : "favorite-border"} 
            size={20} 
            color={isInWishlist(item._id) ? "#FF6B6B" : "#666"} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        
        <View style={styles.ratingContainer}>
          <Icon name="star" size={12} color="#FFD700" />
          <Text style={styles.rating}>
            {item.ratingsAverage.toFixed(1)} ({item.ratingsQuantity})
          </Text>
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.price}>GH₵{item.price.toFixed(2)}</Text>
          {item.comparePrice && item.comparePrice > item.price && (
            <Text style={styles.comparePrice}>GH₵{item.comparePrice.toFixed(2)}</Text>
          )}
        </View>

        <Text style={styles.seller}>by {item.seller.name}</Text>

        <TouchableOpacity
          style={styles.addToCartBtn}
          onPress={(e) => {
            e.stopPropagation();
            addToCart(item._id, 1);
          }}
          activeOpacity={0.8}
        >
          <Icon name="shopping-cart" size={16} color="white" />
          <Text style={styles.addToCartText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // Render featured product
  const renderFeaturedProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.featuredCard}
      onPress={() => handleProductPress(item._id)}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: item.images[0] }}
        style={styles.featuredImage}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.featuredOverlay}
      >
        <View style={styles.featuredContent}>
          <Text style={styles.featuredName} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.featuredPriceContainer}>
            <Text style={styles.featuredPrice}>GH₵{item.price.toFixed(2)}</Text>
            {item.comparePrice && item.comparePrice > item.price && (
              <Text style={styles.featuredComparePrice}>GH₵{item.comparePrice.toFixed(2)}</Text>
            )}
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  // Render category chip
  const renderCategory = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        selectedCategory === item && styles.selectedCategoryChip,
      ]}
      onPress={() => handleCategorySelect(item)}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.categoryText,
          selectedCategory === item && styles.selectedCategoryText,
        ]}
        numberOfLines={1}
      >
        {item}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>AgriConnect</Text>
          <Text style={styles.headerSubtitle}>Marketplace</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleOrdersPress}
            activeOpacity={0.7}
          >
            <Icon name="package" size={22} color="#4A6572" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleWishlistPress}
            activeOpacity={0.7}
          >
            <Icon name="heart" size={22} color="#4A6572" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cartButton}
            onPress={handleCartPress}
            activeOpacity={0.7}
          >
            <Icon name="shopping-cart" size={22} color="#4A6572" />
            {cart && cart.totalItems > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cart.totalItems}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Icon name="search" size={20} color="#A0A0A0" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search agricultural products..."
              placeholderTextColor="#A0A0A0"
              value={searchQuery}
              onChangeText={handleSearch}
              onSubmitEditing={() => fetchProducts(1, true)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                <Icon name="x" size={20} color="#A0A0A0" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.filterButton} activeOpacity={0.8}>
            <MaterialIcon name="tune" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <FlatList
            data={categories}
            renderItem={renderCategory}
            keyExtractor={(item) => item}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesList}
            contentContainerStyle={styles.categoriesContent}
          />
        </View>

        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <View style={styles.featuredSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Products</Text>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={featuredProducts}
              renderItem={renderFeaturedProduct}
              keyExtractor={(item) => item._id}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.featuredList}
              contentContainerStyle={styles.featuredContentContainer}
            />
          </View>
        )}

        {/* Sort Options */}
        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Sort by:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortOptions}>
            {[
              { key: 'newest', label: 'Newest' },
              { key: 'price_asc', label: 'Price: Low to High' },
              { key: 'price_desc', label: 'Price: High to Low' },
              { key: 'rating', label: 'Highest Rated' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.sortOption,
                  sortBy === option.key && styles.selectedSortOption,
                ]}
                onPress={() => handleSortChange(option.key)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortBy === option.key && styles.selectedSortOptionText,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Products Grid */}
        <View style={styles.productsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>All Products</Text>
            <Text style={styles.productCount}>{products.length} items</Text>
          </View>
          {loading && page === 1 ? (
            <ActivityIndicator size="large" color="#4CAF50" style={styles.loader} />
          ) : products.length > 0 ? (
            <FlatList
              data={products}
              renderItem={renderProductCard}
              keyExtractor={(item) => item._id}
              numColumns={2}
              columnWrapperStyle={styles.productRow}
              onEndReached={loadMore}
              onEndReachedThreshold={0.1}
              ListFooterComponent={
                loading && page > 1 ? (
                  <ActivityIndicator size="small" color="#4CAF50" style={styles.footerLoader} />
                ) : null
              }
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcon name="search-off" size={50} color="#DDD" />
              <Text style={styles.emptyStateText}>No products found</Text>
              <Text style={styles.emptyStateSubtext}>Try adjusting your search or filters</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* AlertPro Component */}
      <AlertPro
        ref={alertRef}
        onConfirm={() => alertRef.current?.close()}
        title="Message"
        message="Product added to cart successfully!"
        textCancel="Cancel"
        textConfirm="OK"
        customStyles={{
          mask: {
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          },
          container: {
            borderWidth: 1,
            borderColor: "#4CAF50",
            shadowColor: "#000000",
            shadowOpacity: 0.1,
            shadowRadius: 10,
            borderRadius: 20,
          },
          buttonCancel: {
            backgroundColor: "#f8f9fa",
            borderRadius: 12,
          },
          buttonConfirm: {
            backgroundColor: "#4CAF50",
            borderRadius: 12,
          },
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FFFE", // Light mint background
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E8F5E8", // Light green border
    shadowColor: "#2E7D32",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'column',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1B5E20", // Dark green
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#4CAF50", // Medium green
    marginTop: -2,
    fontWeight: '500',
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#E8F5E8', // Light green background
    borderWidth: 1,
    borderColor: '#C8E6C9', // Light green border
  },
  cartButton: {
    position: "relative",
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#FFF3E0', // Light orange background
    borderWidth: 1,
    borderColor: '#FFE0B2', // Light orange border
  },
  cartBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#FF5722", // Orange red
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: "#FF5722",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  cartBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "800",
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 20,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: "#E8F5E8", // Light green border
    height: 52,
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1B5E20', // Dark green text
    fontWeight: '500',
  },
  filterButton: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#2E7D32", // Dark green
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#2E7D32",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    height: 52,
    width: 52,
  },
  categoriesSection: {
    marginBottom: 24,
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    marginHorizontal: 10,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1B5E20", // Dark green
    letterSpacing: -0.5,
    marginLeft: 15,
  },
  seeAllText: {
    fontSize: 14,
    color: "#2E7D32", // Dark green
    fontWeight: '600',
  },
  categoriesList: {
    paddingLeft: 20,
  },
  categoriesContent: {
    paddingRight: 20,
    gap: 8,
  },
  categoryChip: {
    backgroundColor: "#F1F8E9", // Very light green
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#C8E6C9", // Light green border
  },
  selectedCategoryChip: {
    backgroundColor: "#4CAF50", // Medium green
    borderColor: "#4CAF50",
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  categoryText: {
    color: "#2E7D32", // Dark green
    fontWeight: "600",
    fontSize: 13,
  },
  selectedCategoryText: {
    color: "white",
  },
  featuredSection: {
    marginBottom: 24,
  },
  featuredList: {
    paddingLeft: 20,
  },
  featuredContentContainer: {
    paddingRight: 20,
    gap: 16,
  },
  featuredCard: {
    width: 280,
    height: 180,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#2E7D32",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 2,
    borderColor: "#E8F5E8", // Light green border
  },
  featuredImage: {
    width: "100%",
    height: "100%",
  },
  featuredOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    justifyContent: 'flex-end',
  },
  featuredContent: {
    padding: 20,
  },
  featuredName: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    textShadowColor: 'rgba(27, 94, 32, 0.8)', // Dark green shadow
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10
  },
  featuredPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featuredPrice: {
    color: "#81C784", // Light green
    fontSize: 16,
    fontWeight: "800",
    textShadowColor: 'rgba(27, 94, 32, 0.8)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10
  },
  featuredComparePrice: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    textDecorationLine: "line-through",
    textShadowColor: 'rgba(27, 94, 32, 0.8)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10
  },
  sortContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 10,
    borderRadius: 12,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sortLabel: {
    fontSize: 14,
    color: "#2E7D32", // Dark green
    marginRight: 12,
    fontWeight: '600',
  },
  sortOptions: {
    gap: 8,
  },
  sortOption: {
    backgroundColor: "#F1F8E9", // Very light green
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#C8E6C9", // Light green border
  },
  selectedSortOption: {
    backgroundColor: "#4CAF50", // Medium green
    borderColor: "#4CAF50",
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  sortOptionText: {
    fontSize: 12,
    color: "#2E7D32", // Dark green
    fontWeight: '600',
  },
  selectedSortOptionText: {
    color: "white",
  },
  productsSection: {
    marginBottom: 24,
  },
  productCount: {
    fontSize: 14,
    color: "#4CAF50", // Medium green
    fontWeight: '500',
  },
  productRow: {
    justifyContent: "space-between",
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 16,
  },
  productCard: {
    backgroundColor: "white",
    borderRadius: 20,
    overflow: "hidden",
    width: CARD_WIDTH,
    shadowColor: "#2E7D32", // Green shadow
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#E8F5E8", // Light green border
  },
  imageContainer: {
    position: 'relative',
  },
  productImage: {
    width: "100%",
    height: 140,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#FF5722", // Orange red
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 1,
    shadowColor: "#FF5722",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  discountText: {
    color: "white",
    fontSize: 10,
    fontWeight: "800",
  },
  wishlistButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    padding: 6,
    zIndex: 1,
    shadowColor: "#FF6B6B",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#FFE0E0", // Very light pink border
  },
  productInfo: {
    padding: 16,
    backgroundColor: "#FAFAFA", // Very light gray background
  },
  productName: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
    color: "#1B5E20", // Dark green
    lineHeight: 20,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: "#FFF8E1", // Very light yellow
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  rating: {
    fontSize: 12,
    color: "#F57C00", // Orange
    marginLeft: 4,
    fontWeight: '600',
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  price: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2E7D32", // Dark green
  },
  comparePrice: {
    fontSize: 12,
    color: "#FF5722", // Orange red for strikethrough
    textDecorationLine: "line-through",
    fontWeight: '500',
  },
  seller: {
    fontSize: 11,
    color: "#4CAF50", // Medium green
    marginBottom: 12,
    fontWeight: '600',
    backgroundColor: "#F1F8E9", // Very light green background
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  addToCartBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2E7D32", // Dark green
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    shadowColor: "#2E7D32",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#1B5E20", // Darker green border
  },
  addToCartText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
  loader: {
    marginVertical: 40,
  },
  footerLoader: {
    marginVertical: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 16,
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32', // Dark green
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#4CAF50', // Medium green
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default TradeScreen;