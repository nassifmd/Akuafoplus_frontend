import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Config from '../Config/config';
import Icon from 'react-native-vector-icons/Feather';
import AlertPro from 'react-native-alert-pro';

const { width } = Dimensions.get('window');

// Define navigation types
type RootStackParamList = {
  ProductDetail: { productId: string };
  // Add other screens that WishlistScreen can navigate to
};

type WishlistScreenNavigationProp = StackNavigationProp<RootStackParamList>;

interface Product {
  _id: string;
  name: string;
  price: number;
  comparePrice?: number;
  images: string[];
  ratingsAverage: number;
  category: string;
}

interface Wishlist {
  _id: string;
  items: Array<{
    _id: string;
    product: Product;
    addedAt: string;
  }>;
  products?: Product[]; // Keep for backward compatibility
}

const WishlistScreen = () => {
  const navigation = useNavigation<WishlistScreenNavigationProp>();
  const alertRef = useRef<AlertPro>(null);
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const showAlert = (title: string, message: string, type: 'success' | 'error' = 'success') => {
    if (alertRef.current) {
      alertRef.current.open();
    }
  };

  const getAuthHeaders = async () => {
    // Try to get accessToken first (from LoginScreen), then fallback to authToken
    let token = await AsyncStorage.getItem('accessToken');
    if (!token) {
      token = await AsyncStorage.getItem('authToken');
    }
    
    console.log('🔑 Retrieved token:', token ? token.substring(0, 20) + '...' : 'No token found');
    
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      let token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        token = await AsyncStorage.getItem('authToken');
      }
      
      if (!token) {
        console.log('❌ No auth token found for fetchWishlist');
        showAlert('Authentication Required', 'Please login to view your wishlist', 'error');
        setLoading(false);
        return;
      }

      const endpoint = `${Config.API_BASE_URL}/wishlist`;
      console.log('🔄 Fetching wishlist from:', endpoint);

      const response = await axios.get(endpoint, {
        headers: await getAuthHeaders(),
      });

      console.log('✅ Wishlist response:', response.data);

      if (response.data.status === 'success') {
        const wishlistData = response.data.data.wishlist;
        
        // Transform the data structure to match frontend expectations
        if (wishlistData && wishlistData.items) {
          // Convert items array to products array
          const products = wishlistData.items
            .filter(item => item.product) // Filter out null products
            .map(item => item.product);
          
          setWishlist({
            ...wishlistData,
            products: products
          });
          console.log('✅ Wishlist set successfully, products count:', products.length);
        } else {
          setWishlist({ _id: '', items: [], products: [] });
        }
      }
    } catch (error: any) {
      console.error('❌ Error fetching wishlist:', error);
      
      if (error.response?.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'authToken']);
        showAlert('Authentication Required', 'Please login to view your wishlist', 'error');
        navigation.goBack();
      } else if (error.response?.status === 404) {
        setWishlist({ _id: '', items: [], products: [] });
      } else {
        showAlert('Error', 'Failed to load wishlist', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (productId: string) => {
    try {
      setUpdating(true);
      let token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        token = await AsyncStorage.getItem('authToken');
      }
      
      if (!token) {
        showAlert('Authentication Required', 'Please login to manage your wishlist', 'error');
        return;
      }

      const endpoint = `${Config.API_BASE_URL}/wishlist/${productId}`;
      console.log('🗑️ Removing from wishlist:', endpoint);

      const response = await axios.delete(endpoint, {
        headers: await getAuthHeaders(),
      });

      if (response.data.status === 'success') {
        // Update local state by filtering out the removed product
        setWishlist(prev => prev ? {
          ...prev,
          products: prev.products?.filter(product => product._id !== productId) || []
        } : null);
        showAlert('Success', 'Item removed from wishlist', 'success');
      }
    } catch (error: any) {
      console.error('❌ Error removing from wishlist:', error);
      
      if (error.response?.status === 401) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'authToken']);
        showAlert('Authentication Required', 'Please login to manage your wishlist', 'error');
        navigation.goBack();
      } else {
        showAlert('Error', 'Failed to remove item', 'error');
      }
    } finally {
      setUpdating(false);
    }
  };

  const addToCart = async (productId: string) => {
    try {
      setUpdating(true);
      const endpoint = `${Config.API_BASE_URL}/cart`;
      const payload = { productId, quantity: 1 };
      
      console.log('🛒 Adding to cart:', endpoint);
      console.log('📦 Cart payload:', JSON.stringify(payload, null, 2));
      
      const headers = await getAuthHeaders();
      console.log('🔑 Cart headers:', headers);

      const response = await axios.post(endpoint, payload, { headers });

      console.log('✅ Add to cart response status:', response.status);
      console.log('📦 Add to cart response data:', JSON.stringify(response.data, null, 2));

      if (response.data.status === 'success') {
        console.log('✅ Product added to cart successfully');
        showAlert('Success', 'Product added to cart!', 'success');
      }
    } catch (error: any) {
      console.error('❌ Error adding to cart:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      const errorMessage = error.response?.data?.message || 'Failed to add to cart';
      showAlert('Error', errorMessage, 'error');
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const renderWishlistItem = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <TouchableOpacity
        onPress={() => navigation.navigate('ProductDetail', { productId: item._id })}
      >
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
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeFromWishlist(item._id)}
        disabled={updating}
      >
        <Icon name="x" size={20} color="#FF5722" />
      </TouchableOpacity>

      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        
        <View style={styles.ratingContainer}>
          <Icon name="star" size={14} color="#FFD700" />
          <Text style={styles.rating}>{item.ratingsAverage.toFixed(1)}</Text>
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.price}>GH₵{item.price.toFixed(2)}</Text>
          {item.comparePrice && (
            <Text style={styles.comparePrice}>GH₵{item.comparePrice.toFixed(2)}</Text>
          )}
        </View>

        <Text style={styles.category}>{item.category}</Text>

        <TouchableOpacity
          style={styles.addToCartBtn}
          onPress={() => addToCart(item._id)}
          disabled={updating}
        >
          <Icon name="shopping-cart" size={16} color="white" />
          <Text style={styles.addToCartText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Loading wishlist...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#2E7D32" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wishlist</Text>
        <View style={styles.placeholder} />
      </View>

      {!wishlist || !wishlist.products || wishlist.products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="heart" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
          <Text style={styles.emptySubtitle}>Save products you love for later</Text>
          <TouchableOpacity
            style={styles.continueShoppingButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.continueShoppingText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={wishlist.products}
          renderItem={renderWishlistItem}
          keyExtractor={(item) => item._id}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          contentContainerStyle={styles.productsList}
          showsVerticalScrollIndicator={false}
        />
      )}

      <AlertPro
        ref={alertRef}
        onConfirm={() => alertRef.current?.close()}
        title="Notification"
        message="Operation completed"
        textCancel="Cancel"
        textConfirm="OK"
        customStyles={{
          mask: { backgroundColor: "rgba(0, 0, 0, 0.5)" },
          container: { borderWidth: 1, borderColor: "#2E7D32" },
          buttonConfirm: { backgroundColor: "#2E7D32" },
        }}
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
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 34,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  continueShoppingButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  continueShoppingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  productsList: {
    padding: 20,
  },
  productRow: {
    justifyContent: 'space-between',
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
    width: (width - 50) / 2,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 120,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF5722',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 1,
  },
  discountText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rating: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  comparePrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginLeft: 6,
  },
  category: {
    fontSize: 11,
    color: '#666',
    marginBottom: 8,
  },
  addToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
    paddingVertical: 6,
    borderRadius: 6,
  },
  addToCartText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default WishlistScreen;