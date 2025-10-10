import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, NavigationProp } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { submitInquiry, getUserData, isAuthenticated } from '../services/farmlandApi';

type RootStackParamList = {
  InquiryForm: { farmlandId: string };
  LoginScreen: { redirectTo?: string };
  MyInquiries: undefined;
};

const InquiryFormScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { farmlandId } = route.params as { farmlandId: string };
  
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndGetUserData = async () => {
      try {
        const authenticated = await isAuthenticated();
        if (!authenticated) {
          Alert.alert(
            'Authentication Required',
            'Please login to submit an inquiry',
            [
              {
                text: 'Login',
                onPress: () => navigation.navigate('LoginScreen', { redirectTo: 'InquiryForm' })
              }
            ]
          );
          return;
        }

        const userData = await getUserData();
        if (userData.userId) {
          setUserId(userData.userId);
        }
        if (userData.userEmail) {
          setEmail(userData.userEmail);
        }
      } catch (error) {
        console.error('Error getting user data:', error);
        Alert.alert('Error', 'Failed to load user data');
      } finally {
        setInitialLoading(false);
      }
    };

    checkAuthAndGetUserData();
  }, [navigation]);

  const handleSubmit = async () => {
    if (!name || !email || !phone || !message) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!userId) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setLoading(true);
    try {
      await submitInquiry({ userId, farmlandId, message });
      Alert.alert(
        'Success', 
        'Your inquiry has been submitted successfully',
        [
          { 
            text: 'View My Inquiries', 
            onPress: () => navigation.navigate('MyInquiries')
          },
          { 
            text: 'OK', 
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error: any) {
      console.error('Inquiry submission error:', error);
      if (
        error &&
        error.message &&
        error.message.includes('pending inquiry')
      ) {
        Alert.alert(
          'Already Submitted',
          'You already have a pending inquiry for this farmland. Please wait for a response before submitting another.',
          [
            { 
              text: 'View My Inquiries', 
              onPress: () => navigation.navigate('MyInquiries')
            },
            { 
              text: 'OK', 
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        Alert.alert('Error', 'There was an error submitting your inquiry');
      }
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.screenContainer}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Submit Inquiry</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screenContainer}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Submit Inquiry</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Submit Your Inquiry</Text>
        {/* <Text style={styles.subtitle}>Farmland ID: {farmlandId}</Text> */}

        <TextInput
          style={styles.input}
          placeholder="Your Name"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Your Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Your Phone Number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Your message about this farmland..."
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        
        <TouchableOpacity 
          style={[styles.button, loading && styles.disabledButton]} 
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Submit Inquiry</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50, // Account for status bar
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
    textAlign: 'center',
    marginRight: 34,
  },
  headerSpacer: {
    width: 34,
  },
  container: {
    padding: 20,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#64748B',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  textArea: {
    height: 100,
    paddingTop: 15,
  },
  button: {
    backgroundColor: '#388E3C',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#A5D6A7',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default InquiryFormScreen;