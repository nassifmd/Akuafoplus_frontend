// Create this file: /Applications/MAMP/htdocs/agricconnect_project/AkuafoPlus/src/screens/OrderConfirmationScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useNavigation, useRoute, NavigationProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';

type RootStackParamList = {
  Dashboard: undefined;
  OrderConfirmation: { orderId: string };
  // add other routes here if needed
};

const OrderConfirmationScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { orderId } = route.params as { orderId: string };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Icon name="check-circle" size={80} color="#2E7D32" />
        <Text style={styles.title}>Order Placed Successfully!</Text>
        <Text style={styles.subtitle}>Order ID: {orderId}</Text>
        <Text style={styles.description}>
          Your order has been placed successfully. You will receive a confirmation email shortly.
        </Text>
        
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Text style={styles.buttonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OrderConfirmationScreen;