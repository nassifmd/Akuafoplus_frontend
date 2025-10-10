import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, TouchableOpacity, ScrollView } from "react-native";
import AlertPro from 'react-native-alert-pro';
import axios from "axios";
import Config from '../Config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from "react-native-vector-icons/MaterialIcons";

type KnowledgeItem = {
  _id: string;
  title: string;
  content: string;
  image?: string;
  tags?: string[];
  category: string;
};

// Helper to convert relative backend paths to absolute URLs for React Native Image
const apiOrigin = (Config.API_BASE_URL || '').replace(/\/+$/, '').replace(/\/api(?:\/)?$/, '');
const toAbsoluteUrl = (u?: string) => {
  if (!u) return u as undefined;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('/')) return `${apiOrigin}${u}`;
  return `${apiOrigin}/${u}`;
};

const categoryData = {
  crop: { name: 'Crop', icon: 'grass', color: '#4CAF50' },
  livestock: { name: 'Livestock', icon: 'pets', color: '#795548' },
  poultry: { name: 'Poultry', icon: 'egg', color: '#FF9800' },
  default: { name: 'General', icon: 'article', color: '#607D8B' }
};

const getCategoryInfo = (categoryKey: string) => {
  if (categoryKey && categoryData[categoryKey as keyof typeof categoryData]) {
    return categoryData[categoryKey as keyof typeof categoryData];
  }
  return categoryData.default;
};

const KnowledgeScreen = ({ navigation }: any) => {
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // AlertPro state
  const alertRef = useRef<AlertPro>(null);
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string; button?: string }>({
    title: '',
    message: '',
    button: 'OK'
  });

  const showAlert = ({ title, message, button = 'OK' }: { title: string; message: string; button?: string }) => {
    setAlertConfig({ title, message, button });
    // small timeout to ensure ref exists
    setTimeout(() => alertRef.current?.open(), 0);
  };

  const fetchKnowledge = async () => {
    try {
      const token = await AsyncStorage.getItem("accessToken");

      let url = activeCategory 
        ? `${Config.API_BASE_URL}/knowledge?category=${activeCategory}`
        : `${Config.API_BASE_URL}/knowledge`;

      const response = await axios.get(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });

      // Backend already supports ?category=..., no need to refilter
      setKnowledge(response.data);
    } catch (error: any) {
      handleFetchError(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleFetchError = (error: any) => {
    console.error("Knowledge base fetch error:", error);
    
    if (error.response) {
      const statusCode = error.response.status;
      if (statusCode === 401) {
        showAlert({
          title: 'Session Expired',
          message: 'Please log in again to continue.'
        });
      } else if (statusCode === 403) {
        showAlert({
          title: 'Access Denied',
          message: 'You don\'t have permission to view this content.'
        });
      } else if (statusCode === 404) {
        showAlert({
          title: 'Not Found',
          message: 'The requested content is unavailable.'
        });
      } else {
        showAlert({
          title: 'Server Error',
          message: 'We\'re experiencing technical difficulties. Please try again later.'
        });
      }
    } else if (error.request) {
      showAlert({
        title: 'Connection Error',
        message: 'Please check your internet connection and try again.'
      });
    } else {
      showAlert({
        title: 'Error',
        message: 'An unexpected error occurred. Please try again.'
      });
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchKnowledge();
  };

  useEffect(() => {
    fetchKnowledge();
  }, [activeCategory]);

  const filteredKnowledge = activeCategory 
    ? knowledge.filter(item => item.category === activeCategory)
    : knowledge;

  const renderCategoryButton = (category: string) => {
    const isActive = activeCategory === category;
    const categoryInfo = getCategoryInfo(category);
    
    return (
      <TouchableOpacity
        key={category}
        style={[
          styles.categoryButton,
          isActive && styles.activeCategoryButton,
          { backgroundColor: isActive ? categoryInfo.color : '#FFFFFF' }
        ]}
        onPress={() => setActiveCategory(isActive ? null : category)}
      >
        <Icon 
          name={categoryInfo.icon} 
          size={20} 
          color={isActive ? 'white' : categoryInfo.color} 
        />
        <Text style={[styles.categoryText, isActive && styles.activeCategoryText]}>
          {categoryInfo.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderKnowledgeItem = ({ item }: { item: KnowledgeItem }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={() => navigation.navigate("KnowledgeContentScreen", { item: { ...item, image: toAbsoluteUrl(item.image) } })}
    >
      {item.image && (
        <Image 
          source={{ uri: toAbsoluteUrl(item.image) }}
          style={styles.image}
          resizeMode="cover"
        />
      )}
      
      <View style={styles.cardContent}>
        <View style={[
          styles.categoryBadge,
          { backgroundColor: getCategoryInfo(item.category).color }
        ]}>
          <Text style={styles.categoryBadgeText}>
            {getCategoryInfo(item.category).name}
          </Text>
        </View>
        
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.content} numberOfLines={3} ellipsizeMode="tail">
          {item.content}
        </Text>
        
        {Array.isArray(item.tags) && item.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {item.tags.map((tag) => (
              <Text key={tag} style={styles.tag}>
                #{tag}
              </Text>
            ))}
          </View>
        )}
        
        <View style={styles.readMoreContainer}>
          <Text style={styles.readMoreText}>Read more</Text>
          <Icon name="chevron-right" size={18} color="#388E3C" />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading Knowledge Base</Text>
        <AlertPro
          ref={alertRef}
          title={alertConfig.title}
          message={alertConfig.message}
          textConfirm={alertConfig.button}
          showCancel={false}
          onConfirm={() => alertRef.current?.close()}
        />
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Knowledge Base</Text>
        <Text style={styles.headerSubtitle}>Expert advice for your farming needs</Text>
      </View>
      
      {/* Category Filter */}
      <View style={styles.categorySection}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContainer}
        >
          <TouchableOpacity
            style={[
              styles.categoryButton,
              !activeCategory && styles.activeCategoryButton,
              { backgroundColor: !activeCategory ? '#3F51B5' : '#FFFFFF' }
            ]}
            onPress={() => setActiveCategory(null)}
          >
            <Icon 
              name="all-inclusive" 
              size={20} 
              color={!activeCategory ? 'white' : '#3F51B5'} 
            />
            <Text style={[styles.categoryText, !activeCategory && styles.activeCategoryText]}>
              All
            </Text>
          </TouchableOpacity>
          
          {Object.keys(categoryData).filter(key => key !== 'default').map(renderCategoryButton)}
        </ScrollView>
      </View>

      {/* Knowledge List */}
      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>
          {activeCategory ? getCategoryInfo(activeCategory).name : 'All'} Articles
          {filteredKnowledge.length > 0 && ` (${filteredKnowledge.length})`}
        </Text>
        
        {filteredKnowledge.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="info-outline" size={50} color="#E0E0E0" />
            <Text style={styles.emptyTitle}>No articles found</Text>
            <Text style={styles.emptyMessage}>
              {activeCategory 
                ? `We couldn't find any articles in the ${getCategoryInfo(activeCategory).name} category.`
                : "The knowledge base is currently empty."
              }
            </Text>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={handleRefresh}
            >
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredKnowledge}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContainer}
            renderItem={renderKnowledgeItem}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>

      <AlertPro
        ref={alertRef}
        title={alertConfig.title}
        message={alertConfig.message}
        textConfirm={alertConfig.button}
        showCancel={false}
        onConfirm={() => alertRef.current?.close()}
        customStyles={{
          mask: { backgroundColor: 'rgba(0,0,0,0.4)' },
          container: { borderRadius: 16 }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: "#F9F9F9",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#616161",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2E7D32",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#757575",
    marginTop: 4,
  },
  categorySection: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
  },
  listSection: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#424242",
    marginBottom: 12,
  },
  categoryContainer: {
    paddingBottom: 12,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activeCategoryButton: {
    borderWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
    color: "#616161",
  },
  activeCategoryText: {
    color: 'white',
  },
  listContainer: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  image: {
    width: "100%",
    height: 160,
  },
  cardContent: {
    padding: 16,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  categoryBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2E7D32",
    marginBottom: 8,
    lineHeight: 24,
  },
  content: {
    fontSize: 15,
    color: "#616161",
    lineHeight: 22,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  tag: {
    backgroundColor: "#E8F5E9",
    color: "#388E3C",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '500',
  },
  readMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  readMoreText: {
    color: "#388E3C",
    fontWeight: '600',
    fontSize: 14,
    marginRight: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: "#424242",
    marginTop: 16,
  },
  emptyMessage: {
    fontSize: 15,
    color: "#757575",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
  refreshButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#4CAF50",
    borderRadius: 8,
  },
  refreshButtonText: {
    color: "white",
    fontWeight: '600',
    fontSize: 15,
  },
  separator: {
    height: 16,
  },
});

export default KnowledgeScreen;