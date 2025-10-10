import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "react-native-vector-icons/Ionicons";
import Config from "../Config/config";
import AlertPro from 'react-native-alert-pro';

interface MarketPrice {
  id: string;
  commodity: string;
  price: number;
  unit: string;
  location: string;
  category: string;
}

const MarketPricesScreen = () => {
  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([]);
  const [filteredPrices, setFilteredPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [refreshing, setRefreshing] = useState(false);

  const alertRef = useRef<AlertPro | null>(null);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const showAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    // Open after state update tick
    setTimeout(() => alertRef.current?.open(), 0);
  };

  useEffect(() => {
    fetchMarketPrices();
  }, []);

  useEffect(() => {
    filterPrices();
  }, [searchQuery, marketPrices, activeTab]);

  const filterPrices = () => {
    let filtered = marketPrices;
    
    if (searchQuery) {
      filtered = filtered.filter((item) =>
        item.commodity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (activeTab !== "All") {
      filtered = filtered.filter(item => 
        item.category.toLowerCase() === activeTab.toLowerCase()
      );
    }
    
    setFilteredPrices(filtered);
  };

  const fetchMarketPrices = async () => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token) {
        setError("Authentication required. Please login.");
        showAlert('Authentication Required', 'Please login to view market prices.');
        setLoading(false);
        return;
      }

      const response = await axios.get(`${Config.API_BASE_URL}/market/prices`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMarketPrices(response.data);

      if (refreshing) {
        showAlert('Updated', 'Market prices have been refreshed');
      }
    } catch (err) {
      const errorMessage = (err as any).response?.data?.message || "Network error. Please try again.";
      setError(errorMessage);
      showAlert('Error', errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMarketPrices();
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    fetchMarketPrices();
  };

  // Render the main content
  const renderContent = () => {
    if (loading && !refreshing) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading market data...</Text>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        {/* Header - Compact version */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Market Prices</Text>
            <Text style={styles.headerSubtitle}>Current trends</Text>
          </View>
          <View style={styles.headerIconContainer}>
            <Ionicons name="stats-chart" size={22} color={COLORS.white} />
          </View>
        </View>

        {/* Search - Compact version */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={COLORS.gray} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search commodities or locations..."
            placeholderTextColor={COLORS.gray}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearSearchButton}>
              <Ionicons name="close" size={18} color={COLORS.gray} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Category Tabs - Original style */}
        <View style={styles.tabScrollContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabContainer}
          >
            {['All', 'Crop', 'Livestock', 'Poultry', 'Inputs'].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabButton,
                  activeTab === tab && styles.activeTabButton
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText
                ]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Results Info - Compact version */}
        <View style={styles.resultsInfo}>
          <Text style={styles.resultsText}>
            {filteredPrices.length} {filteredPrices.length === 1 ? 'result' : 'results'}
            {activeTab !== 'All' ? ` in ${activeTab}` : ''}
          </Text>
        </View>

        {/* Prices List */}
        <FlatList
          data={filteredPrices}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="pricetags-outline" size={36} color={COLORS.lightBrown} />
              <Text style={styles.emptyText}>No prices found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your search or filter</Text>
              {error && (
                <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          refreshing={refreshing}
          onRefresh={handleRefresh}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.commodity} numberOfLines={1}>{item.commodity}</Text>
                <View style={[
                  styles.categoryBadge,
                  { backgroundColor: getCategoryColor(item.category) }
                ]}>
                  <Text style={styles.categoryText}>{item.category}</Text>
                </View>
              </View>
              
              <View style={styles.cardBody}>
                <View style={styles.priceContainer}>
                  <Text style={styles.priceText}>GH₵{item.price.toLocaleString()}</Text>
                  <Text style={styles.unitText}>/{item.unit}</Text>
                </View>
                
                <View style={styles.locationContainer}>
                  <Ionicons name="location-outline" size={14} color={COLORS.gray} />
                  <Text style={styles.infoText} numberOfLines={1}>{item.location}</Text>
                </View>
              </View>
            </View>
          )}
        />
      </View>
    );
  };

  return (
    <>
      {renderContent()}
      <AlertPro
        ref={ref => { alertRef.current = ref; }}
        onConfirm={() => alertRef.current?.close()}
        title={alertTitle}
        message={alertMessage}
        showCancel={false}
        textConfirm="OK"
        customStyles={{
          mask: { backgroundColor: 'rgba(0,0,0,0.4)' },
          container: { 
            borderRadius: 12,
          },
          title: {
            color: COLORS.primaryDark,
            fontSize: 18,
            fontWeight: '600'
          },
          message: {
            color: COLORS.dark,
            fontSize: 14
          },
          buttonConfirm: {
            backgroundColor: COLORS.primary,
            borderRadius: 8,
            paddingVertical: 10,
          }
        }}
      />
    </>
  );
};

// Color palette with green, brown, and yellow
const COLORS = {
  primary: '#4CAF50',      // Green
  primaryDark: '#388E3C',  // Dark Green
  secondary: '#8D6E63',    // Brown
  lightBrown: '#D7CCC8',   // Light Brown
  accent: '#FFD54F',       // Yellow
  success: '#4CAF50',
  danger: '#F44336',
  warning: '#FFC107',
  info: '#2196F3',
  light: '#F5F5F5',
  dark: '#333333',
  gray: '#9E9E9E',
  white: '#FFFFFF',
  background: '#FAFAFA',
};

const getCategoryColor = (category: string) => {
  switch (category.toLowerCase()) {
    case 'crop':
      return COLORS.primary;
    case 'livestock':
      return COLORS.secondary;
    case 'poultry':
      return COLORS.accent;
    case 'inputs':
      return '#78909C';
    default:
      return COLORS.gray;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.dark,
    fontWeight: '500',
  },

  // Header - Compact
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingTop: 20,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.gray,
  },
  headerIconContainer: {
    backgroundColor: COLORS.primary,
    padding: 10,
    borderRadius: 10,
  },

  // Search - Compact
  searchContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingHorizontal: 40,
    paddingVertical: 10,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    fontSize: 14,
    color: COLORS.dark,
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: 10,
    zIndex: 1,
  },
  clearSearchButton: {
    position: 'absolute',
    right: 12,
    top: 10,
    zIndex: 1,
  },

  // Tabs - Original style
  tabScrollContainer: {
    height: 50,
    marginBottom: 12,
  },
  tabContainer: {
    paddingHorizontal: 8,
    minWidth: '100%',
    justifyContent: 'space-evenly',
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    minWidth: 80,
    alignItems: 'center',
  },
  activeTabButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray,
  },
  activeTabText: {
    color: COLORS.white,
  },

  // Results Info - Compact
  resultsInfo: {
    marginBottom: 8,
  },
  resultsText: {
    fontSize: 13,
    color: COLORS.gray,
  },

  // List
  listContent: {
    paddingBottom: 16,
  },

  // Card - Compact
  card: {
    backgroundColor: COLORS.white,
    padding: 12,
    marginBottom: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commodity: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
    flex: 1,
    marginRight: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  unitText: {
    fontSize: 13,
    color: COLORS.gray,
    marginLeft: 2,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
    maxWidth: '50%',
  },
  infoText: {
    fontSize: 13,
    color: COLORS.gray,
    marginLeft: 4,
  },

  // Empty State - Compact
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.dark,
    marginTop: 12,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 6,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MarketPricesScreen;