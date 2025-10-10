import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, SafeAreaView } from 'react-native';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import FarmlandCard from '../components/FarmlandCard';
import * as farmlandApi from '../services/farmlandApi';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Define your navigation type
type RootStackParamList = {
  FarmlandListing: undefined;
  FarmlandDetails: { farmlandId: string };
  // Add other screens as needed
};

interface Farmland {
  _id: string;
  id?: string;
  name: string;
  location: string;
  price: number;
  images?: string[];
  description?: string;
  size?: number;
  available?: boolean;
}

const FarmlandListingScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [farmlands, setFarmlands] = useState<Farmland[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Use ref to track if initial load is complete
  const hasLoadedRef = useRef(false);
  const requestIdRef = useRef<string>('farmlands-list');

  const loadFarmlands = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      console.log('Loading farmlands...');
      
      // Check if farmlandApi is properly imported
      if (!farmlandApi || typeof farmlandApi.fetchFarmlands !== 'function') {
        throw new Error('farmlandApi is not properly imported');
      }
      
      const data = await farmlandApi.fetchFarmlands({}, requestIdRef.current);
      console.log('Farmlands loaded:', data);
      
      if (Array.isArray(data)) {
        setFarmlands(data);
        hasLoadedRef.current = true;
      } else {
        console.error('Invalid data format received:', data);
        setFarmlands([]);
      }
    } catch (err: any) {
      console.error('Farmland loading error:', err);
      setError(err.message || 'Failed to load farmlands');
      setFarmlands([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []); // Remove dependencies to prevent infinite re-creation

  // Initial load only
  useEffect(() => {
    if (!hasLoadedRef.current) {
      loadFarmlands();
    }
  }, []); // Empty dependency array for initial load only

  // Handle focus effect without causing infinite re-renders
  useFocusEffect(
    useCallback(() => {
      // Only reload if we've already loaded data before (not on initial mount)
      // and we're not currently loading
      if (hasLoadedRef.current && !loading && !refreshing) {
        console.log('Screen focused, refreshing data...');
        loadFarmlands(true);
      }
      
      // Cleanup function
      return () => {
        // Cancel any pending requests when leaving the screen
        farmlandApi.cancelRequest(requestIdRef.current);
      };
    }, []) // Empty dependency array
  );

  const handleFarmlandPress = useCallback((farmlandId: string) => {
    console.log('Navigating to farmland details:', farmlandId);
    navigation.navigate('FarmlandDetails', { farmlandId });
  }, [navigation]);

  const handleRefresh = useCallback(() => {
    loadFarmlands(true);
  }, [loadFarmlands]);

  const handleRetry = useCallback(() => {
    hasLoadedRef.current = false; // Reset the loaded flag
    loadFarmlands();
  }, [loadFarmlands]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const renderFarmland = useCallback(({ item }: { item: Farmland }) => (
    <FarmlandCard 
      id={item._id || item.id || ''}
      name={item.name || 'Unknown Farmland'}
      location={item.location || 'Unknown Location'}
      price={item.price || 0}
      images={item.images}
      onPress={() => handleFarmlandPress(item._id || item.id || '')}
    />
  ), [handleFarmlandPress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      farmlandApi.cancelRequest(requestIdRef.current);
    };
  }, []);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header with back button */}
        <View style={styles.headerWithBack}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Icon name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Farmlands</Text>
          <View style={styles.headerSpacer} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Loading farmlands...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header with back button */}
        <View style={styles.headerWithBack}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Icon name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Farmlands</Text>
          <View style={styles.headerSpacer} />
        </View>
        
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorSubtext}>
            Please check your internet connection and try again
          </Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={handleRetry}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button */}
      <View style={styles.headerWithBack}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Icon name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Farmlands</Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <View style={styles.header}>
        <Text style={styles.title}>Available Farmlands</Text>
        <Text style={styles.subtitle}>
          {farmlands.length} {farmlands.length === 1 ? 'listing' : 'listings'} found
        </Text>
      </View>
      
      {farmlands.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <Icon name="landscape" size={64} color="#94A3B8" />
          <Text style={styles.emptyText}>No farmlands available</Text>
          <Text style={styles.emptySubtext}>Check back later for new listings</Text>
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={handleRefresh}
          >
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={farmlands}
          renderItem={renderFarmland}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={10}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerWithBack: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 5,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    flex: 1,
    marginRight: 34,
  },
  headerSpacer: {
    width: 40,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#64748B',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 10,
    fontWeight: '600',
  },
  errorSubtext: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#388E3C',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
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
  },
  refreshButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
});

export default FarmlandListingScreen;