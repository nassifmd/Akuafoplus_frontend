import React, { useEffect, useState, useRef } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  Image, 
  TouchableOpacity, 
  ScrollView,
  Animated,
  StatusBar 
} from "react-native";
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
  crop: { name: 'Crop', icon: 'grass', color: '#10B981', gradient: ['#10B981', '#059669'] },
  livestock: { name: 'Livestock', icon: 'pets', color: '#F59E0B', gradient: ['#F59E0B', '#D97706'] },
  poultry: { name: 'Poultry', icon: 'egg', color: '#EF4444', gradient: ['#EF4444', '#DC2626'] },
  default: { name: 'General', icon: 'article', color: '#6B7280', gradient: ['#6B7280', '#4B5563'] }
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
  const [searchQuery, setSearchQuery] = useState('');
  const scrollY = useRef(new Animated.Value(0)).current;

  // AlertPro state
  const alertRef = useRef<AlertPro>(null);
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string; button?: string }>({
    title: '',
    message: '',
    button: 'OK'
  });

  const showAlert = ({ title, message, button = 'OK' }: { title: string; message: string; button?: string }) => {
    setAlertConfig({ title, message, button });
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

  const filteredKnowledge = knowledge.filter(item => {
    const matchesCategory = !activeCategory || item.category === activeCategory;
    const matchesSearch = !searchQuery || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

  const renderCategoryButton = (category: string) => {
    const isActive = activeCategory === category;
    const categoryInfo = getCategoryInfo(category);
    
    return (
      <TouchableOpacity
        key={category}
        style={[
          styles.categoryButton,
          isActive && styles.activeCategoryButton,
        ]}
        onPress={() => setActiveCategory(isActive ? null : category)}
      >
        <View style={[
          styles.categoryIconContainer,
          { backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : `${categoryInfo.color}15` }
        ]}>
          <Icon 
            name={categoryInfo.icon} 
            size={20} 
            color={isActive ? 'white' : categoryInfo.color} 
          />
        </View>
        <Text style={[styles.categoryText, isActive && styles.activeCategoryText]}>
          {categoryInfo.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderKnowledgeItem = ({ item, index }: { item: KnowledgeItem; index: number }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={() => navigation.navigate("KnowledgeContentScreen", { 
        item: { ...item, image: toAbsoluteUrl(item.image) } 
      })}
    >
      <View style={styles.cardHeader}>
        <View style={[
          styles.categoryBadge,
          { backgroundColor: getCategoryInfo(item.category).color }
        ]}>
          <Text style={styles.categoryBadgeText}>
            {getCategoryInfo(item.category).name}
          </Text>
        </View>
        <View style={styles.readTime}>
          <Text style={styles.readTimeText}>
            {Math.ceil(item.content.length / 200)} min read
          </Text>
        </View>
      </View>

      {item.image && (
        <Image 
          source={{ uri: toAbsoluteUrl(item.image) }}
          style={styles.image}
          resizeMode="cover"
        />
      )}
      
      <View style={styles.cardContent}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.content} numberOfLines={3} ellipsizeMode="tail">
          {item.content}
        </Text>
        
        {Array.isArray(item.tags) && item.tags.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.tagsContainer}
          >
            {item.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </ScrollView>
        )}
        
        <View style={styles.cardFooter}>
          <TouchableOpacity style={styles.readMoreButton}>
            <Text style={styles.readMoreText}>Read Article</Text>
            <Icon name="arrow-forward" size={16} color="#10B981" />
          </TouchableOpacity>
          {/* <TouchableOpacity style={styles.bookmarkButton}>
            <Icon name="bookmark-border" size={20} color="#9CA3AF" />
          </TouchableOpacity> */}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Animated Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Knowledge Base</Text>
            <Text style={styles.headerSubtitle}>Expert farming advice & guides</Text>
          </View>
          {/* <TouchableOpacity style={styles.searchButton}>
            <Icon name="search" size={24} color="#374151" />
          </TouchableOpacity> */}
        </View>
      </Animated.View>

      {/* Enhanced Category Filter with More Space */}
      <View style={styles.categorySection}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContainer}
        >
          <TouchableOpacity
            style={[
              styles.categoryButton,
              !activeCategory && styles.activeAllCategoryButton,
            ]}
            onPress={() => setActiveCategory(null)}
          >
            <View style={[
              styles.categoryIconContainer,
              { backgroundColor: !activeCategory ? 'rgba(59, 130, 246, 0.2)' : '#F3F4F6' }
            ]}>
              <Icon 
                name="dashboard" 
                size={20} 
                color={!activeCategory ? '#3B82F6' : '#6B7280'} 
              />
            </View>
            <Text style={[styles.categoryText, !activeCategory && styles.activeAllCategoryText]}>
              All
            </Text>
          </TouchableOpacity>
          
          {Object.keys(categoryData).filter(key => key !== 'default').map(renderCategoryButton)}
        </ScrollView>
      </View>

      {/* Knowledge List - Now starts immediately after categories */}
      <View style={styles.listSection}>
        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>
            {activeCategory ? getCategoryInfo(activeCategory).name : 'Featured'} Articles
          </Text>
          <View style={styles.resultsBadge}>
            <Text style={styles.resultsCount}>{filteredKnowledge.length}</Text>
          </View>
        </View>
        
        {filteredKnowledge.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIllustration}>
              <Icon name="auto-stories" size={80} color="#E5E7EB" />
            </View>
            <Text style={styles.emptyTitle}>No articles found</Text>
            <Text style={styles.emptyMessage}>
              {activeCategory 
                ? `No articles available in ${getCategoryInfo(activeCategory).name}. Try another category.`
                : "The knowledge base is being updated. Check back soon!"
              }
            </Text>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={handleRefresh}
            >
              <Icon name="refresh" size={20} color="white" />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Animated.FlatList
            data={filteredKnowledge}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContainer}
            renderItem={renderKnowledgeItem}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
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
          mask: { backgroundColor: 'rgba(0,0,0,0.6)' },
          container: { 
            borderRadius: 20,
            padding: 24,
          },
          title: {
            fontSize: 20,
            fontWeight: '700',
            color: '#1F2937',
          },
          message: {
            fontSize: 16,
            color: '#6B7280',
            textAlign: 'center',
          },
          buttonConfirm: {
            backgroundColor: '#10B981',
            borderRadius: 12,
            paddingVertical: 12,
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
    fontWeight: '500',
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 4,
    fontWeight: '500',
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: 'center',
    alignItems: 'center',
  },
  categorySection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
  },
  categoryContainer: {
    paddingRight: 24,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 5,
    borderRadius: 16,
    marginRight: 10,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    minWidth: 100,
  },
  activeCategoryButton: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  activeAllCategoryButton: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  categoryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  categoryText: {
    fontSize: 15,
    fontWeight: '600',
    color: "#6B7280",
  },
  activeCategoryText: {
    color: 'white',
  },
  activeAllCategoryText: {
    color: 'white',
  },
  listSection: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  resultsBadge: {
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  resultsCount: {
    fontSize: 14,
    color: "white",
    fontWeight: '700',
  },
  listContainer: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: "#F3F4F6",
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  readTime: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  readTimeText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: '600',
  },
  image: {
    width: "100%",
    height: 180,
  },
  cardContent: {
    padding: 16,
    paddingTop: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    lineHeight: 24,
  },
  content: {
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 22,
    marginBottom: 16,
  },
  tagsContainer: {
    marginBottom: 16,
  },
  tag: {
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  tagText: {
    color: "#1E40AF",
    fontSize: 12,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  readMoreText: {
    color: "#10B981",
    fontWeight: '700',
    fontSize: 15,
    marginRight: 6,
  },
  bookmarkButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyIllustration: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F9FAFB",
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: "#111827",
    marginTop: 16,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 24,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#10B981",
    borderRadius: 12,
  },
  refreshButtonText: {
    color: "white",
    fontWeight: '700',
    fontSize: 15,
    marginLeft: 8,
  },
  separator: {
    height: 0,
  },
});

export default KnowledgeScreen;