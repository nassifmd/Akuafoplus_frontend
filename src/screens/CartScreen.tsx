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
  ScrollView,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Config from '../Config/config';
import Icon from 'react-native-vector-icons/Feather';
import AlertPro from 'react-native-alert-pro';

const { width } = Dimensions.get('window');

// Update the navigation types to match App.tsx
type RootStackParamList = {
  ProductDetail: { productId: string };
  TradeScreen: undefined;
  CheckoutScreen: undefined;
  Dashboard: undefined;
  // Add other screens that CartScreen can navigate to
};

type CartScreenNavigationProp = StackNavigationProp<RootStackParamList>;

interface Product {
  _id: string;
  name: string;
  price: number;
  comparePrice?: number;
  images: string[];
  ratingsAverage: number;
  category: string;
  quantity: number;
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

const CartScreen = () => {
  const navigation = useNavigation<CartScreenNavigationProp>();
  const alertRef = useRef<AlertPro>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Shipping constants
  const FREE_SHIPPING_THRESHOLD = 200;
  const DEFAULT_SHIPPING_COST = 0.5;

  const showAlert = (title: string, message: string, type: 'success' | 'error' = 'success') => {
    if (alertRef.current) {
      alertRef.current.open();
    }
  };

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  const calculateShippingCost = (totalPrice: number) => {
    return totalPrice >= FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING_COST;
  };

  const calculateTotalPrice = (cartTotalPrice: number) => {
    const shippingCost = calculateShippingCost(cartTotalPrice);
    return cartTotalPrice + shippingCost;
  };

  const fetchCart = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        console.log('No auth token found for cart fetch');
        setCart(null);
        return;
      }

      const endpoint = `${Config.API_BASE_URL}/cart`;
      console.log('Fetching cart from endpoint:', endpoint);
      
      const response = await axios.get(endpoint, {
        headers: await getAuthHeaders(),
      });

      console.log('Cart fetch response:', response.data);
      console.log('Cart fetch status:', response.status);

      if (response.data.status === 'success') {
        setCart(response.data.data.cart);
        console.log('Cart loaded successfully:', response.data.data.cart);
      }

    } catch (error) {
      console.error('Error fetching cart:', error);
      if (axios.isAxiosError(error)) {
        console.error('Cart fetch error response:', error.response?.data);
        console.error('Cart fetch error status:', error.response?.status);
      }
      showAlert('Error', 'Failed to load cart', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateCartItem = async (productId: string, newQuantity: number) => {
    try {
      setUpdating(true);
      const endpoint = `${Config.API_BASE_URL}/cart`;
      console.log('Updating cart item at endpoint:', endpoint);
      console.log('Update payload:', { productId, quantity: newQuantity });
      
      const response = await axios.put(
        endpoint,
        { productId, quantity: newQuantity },
        { headers: await getAuthHeaders() }
      );

      console.log('Update cart response:', response.data);
      console.log('Update cart status:', response.status);

      if (response.data.status === 'success') {
        setCart(response.data.data.cart);
        console.log('Cart updated successfully');
      }
    } catch (error) {
      console.error('Error updating cart:', error);
      if (axios.isAxiosError(error)) {
        console.error('Update cart error response:', error.response?.data);
        console.error('Update cart error status:', error.response?.status);
        
        if (error.response?.status === 404) {
          showAlert('Error', 'Cart item not found or invalid endpoint', 'error');
        } else if (error.response?.status === 401) {
          showAlert('Error', 'Authentication required', 'error');
        } else {
          showAlert('Error', error.response?.data?.message || 'Failed to update cart', 'error');
        }
      } else {
        showAlert('Error', 'Network error. Please check your connection.', 'error');
      }
    } finally {
      setUpdating(false);
    }
  };

  const removeFromCart = async (productId: string) => {
    try {
      setUpdating(true);
      const endpoint = `${Config.API_BASE_URL}/cart/${productId}`;
      console.log('Removing item from cart at endpoint:', endpoint);
      
      const response = await axios.delete(endpoint, {
        headers: await getAuthHeaders(),
      });

      console.log('Remove from cart response:', response.data);
      console.log('Remove from cart status:', response.status);

      if (response.data.status === 'success') {
        setCart(response.data.data.cart);
        console.log('Item removed from cart successfully');
        showAlert('Success', 'Item removed from cart', 'success');
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
      if (axios.isAxiosError(error)) {
        console.error('Remove from cart error response:', error.response?.data);
        console.error('Remove from cart error status:', error.response?.status);
        
        if (error.response?.status === 404) {
          showAlert('Error', 'Cart item not found or invalid endpoint', 'error');
        } else if (error.response?.status === 401) {
          showAlert('Error', 'Authentication required', 'error');
        } else {
          showAlert('Error', error.response?.data?.message || 'Failed to remove item', 'error');
        }
      } else {
        showAlert('Error', 'Network error. Please check your connection.', 'error');
      }
    } finally {
      setUpdating(false);
    }
  };

  const clearCart = async () => {
    try {
      setUpdating(true);
      const endpoint = `${Config.API_BASE_URL}/cart`;
      console.log('Clearing cart at endpoint:', endpoint);
      
      const response = await axios.delete(endpoint, {
        headers: await getAuthHeaders(),
      });

      console.log('Clear cart response:', response.data);
      console.log('Clear cart status:', response.status);

      if (response.data.status === 'success') {
        setCart(response.data.data.cart);
        console.log('Cart cleared successfully');
        showAlert('Success', 'Cart cleared successfully', 'success');
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
      if (axios.isAxiosError(error)) {
        console.error('Clear cart error response:', error.response?.data);
        console.error('Clear cart error status:', error.response?.status);
      }
      showAlert('Error', 'Failed to clear cart', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleCheckout = () => {
    navigation.navigate('CheckoutScreen');
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCart();
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      <TouchableOpacity
        onPress={() => navigation.navigate('ProductDetail', { productId: item.product._id })}
      >
        <Image
          source={{ uri: item.product.images[0] }}
          style={styles.productImage}
          resizeMode="cover"
        />
      </TouchableOpacity>

      <View style={styles.itemDetails}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.product.name}
        </Text>
        <Text style={styles.productPrice}>GH₵{item.price.toFixed(2)}</Text>
        <Text style={styles.productCategory}>{item.product.category}</Text>

        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => {
              if (item.quantity > 1) {
                updateCartItem(item.product._id, item.quantity - 1);
              }
            }}
            disabled={updating || item.quantity <= 1}
          >
            <Icon name="minus" size={16} color={item.quantity <= 1 ? '#ccc' : '#2E7D32'} />
          </TouchableOpacity>

          <Text style={styles.quantityText}>{item.quantity}</Text>

          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateCartItem(item.product._id, item.quantity + 1)}
            disabled={updating}
          >
            <Icon name="plus" size={16} color="#2E7D32" />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeFromCart(item.product._id)}
        disabled={updating}
      >
        <Icon name="trash-2" size={20} color="#FF5722" />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Loading cart...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!cart || cart.items.length === 0) {
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
          <Text style={styles.headerTitle}>My Cart</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.emptyContainer}>
          <Icon name="shopping-cart" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>Add some products to get started</Text>
          <TouchableOpacity
            style={styles.continueShoppingButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.continueShoppingText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const shippingCost = calculateShippingCost(cart.totalPrice);
  const totalPrice = calculateTotalPrice(cart.totalPrice);

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
        <Text style={styles.headerTitle}>My Cart</Text>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={clearCart}
          disabled={updating}
        >
          <Icon name="trash" size={20} color="#FF5722" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={cart.items}
        renderItem={renderCartItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.cartList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListFooterComponent={
          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal ({cart.totalItems} items):</Text>
              <Text style={styles.summaryValue}>GH₵{cart.totalPrice.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping:</Text>
              <Text style={styles.summaryValue}>
                {shippingCost === 0 ? 'FREE' : `GH₵${shippingCost.toFixed(2)}`}
              </Text>
            </View>
            {cart.totalPrice >= FREE_SHIPPING_THRESHOLD && (
              <View style={styles.freeShippingRow}>
                <Icon name="check-circle" size={16} color="#2E7D32" />
                <Text style={styles.freeShippingText}>You qualify for free shipping!</Text>
              </View>
            )}
            {cart.totalPrice < FREE_SHIPPING_THRESHOLD && (
              <View style={styles.freeShippingRow}>
                <Icon name="truck" size={16} color="#666" />
                <Text style={styles.almostFreeText}>
                  Add GH₵{(FREE_SHIPPING_THRESHOLD - cart.totalPrice).toFixed(2)} more for free shipping
                </Text>
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>
                GH₵{totalPrice.toFixed(2)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={handleCheckout}
              disabled={updating}
            >
              <Text style={styles.checkoutText}>Proceed to Checkout</Text>
            </TouchableOpacity>
          </View>
        }
      />

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
  },
  clearButton: {
    padding: 5,
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
  cartList: {
    padding: 20,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    padding: 5,
    alignSelf: 'flex-start',
  },
  quantityButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 10,
    minWidth: 20,
    textAlign: 'center',
  },
  removeButton: {
    padding: 5,
    alignSelf: 'flex-start',
  },
  summaryContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginTop: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  freeShippingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 8,
    backgroundColor: '#E8F5E8',
    borderRadius: 6,
  },
  freeShippingText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
    marginLeft: 6,
  },
  almostFreeText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  checkoutButton: {
    backgroundColor: '#2E7D32',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  checkoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CartScreen;