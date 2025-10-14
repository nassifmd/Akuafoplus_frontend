import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  SafeAreaView,
  Alert,
  Platform,
  StatusBar,
  Image,
} from "react-native";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AlertPro from 'react-native-alert-pro';
import Config from "../Config/config";

interface ForumPost {
  _id: string;
  title: string;
  content: string;
  category: string;
  author: {
    _id: string;
    username?: string;
    name?: string;
    avatar?: string;
  };
  createdAt: string;
  upvotes: number;
  downvotes: number;
  views: number;
  comments: string[];
  isPinned: boolean;
  isClosed: boolean;
  voteScore: number;
}

interface UserInfo {
  _id: string;
  username: string;
  name: string;
  role: string;
}

type ForumScreenNavigationProp = StackNavigationProp<any, any>;

const ForumScreen = () => {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [alertConfig, setAlertConfig] = useState<{title: string; message: string; type?: string}>({
    title: '',
    message: '',
    type: 'info'
  });
  const alertRef = useRef<AlertPro | null>(null);
  const navigation = useNavigation<ForumScreenNavigationProp>();

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // If can't go back, navigate to Dashboard
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Dashboard' }],
        })
      );
    }
  };

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const accessToken = await AsyncStorage.getItem('accessToken');
        if (accessToken) {
          setIsAuthenticated(true);
          
          const userInfoString = await AsyncStorage.getItem('userInfo');
          if (userInfoString) {
            const storedUserInfo = JSON.parse(userInfoString);
            setUserInfo(storedUserInfo);
          }
        } else {
          setIsAuthenticated(false);
          setUserInfo(null);
        }
      } catch (error) {
        console.error("Error checking auth status:", error);
        setIsAuthenticated(false);
      }
    };

    checkAuthStatus();
  }, []);

  const categories = [
    { id: "all", name: "All", icon: "view-grid-outline" },
    { id: "general", name: "General", icon: "chat-outline" },
    { id: "questions", name: "Questions", icon: "help-circle-outline" },
    { id: "announcements", name: "Announcements", icon: "bullhorn-outline" },
    { id: "feedback", name: "Feedback", icon: "message-alert-outline" },
    { id: "help", name: "Help", icon: "lifebuoy" },
  ];

  const showAlert = (type: 'success' | 'danger' | 'warning' | 'info', title: string, message: string) => {
    setAlertConfig({ title, message, type });
    alertRef.current?.open();
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      let url = `${Config.API_BASE_URL}/forum`;
      
      // Build query parameters
      const params = new URLSearchParams();
      
      if (activeCategory !== "all") {
        params.append('category', activeCategory);
      }
      
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
      
      console.log("Fetching posts from:", url);
      
      const response = await axios.get(url);
      
      // Updated response structure check
      if (response.data.status === 'success' && response.data.data && response.data.data.posts) {
        setPosts(response.data.data.posts);
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
      showAlert('danger','Connection Error','Could not connect to the server. Please check your internet connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [activeCategory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const handleSearch = () => {
    fetchPosts();
  };

  const handlePostPress = (post: ForumPost) => {
    navigation.navigate("PostDetail", { postId: post._id });
  };

  const handleCreatePost = async () => {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      if (accessToken) {
        navigation.navigate("CreatePost");
      } else {
        navigation.navigate("LoginScreen", { redirectTo: "CreatePost" });
      }
    } catch (error) {
      console.error("Error checking auth for post creation:", error);
      navigation.navigate("LoginScreen", { redirectTo: "CreatePost" });
    }
  };

  const handlePinPost = async (postId: string) => {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      if (!accessToken) {
        showAlert('warning','Authentication Required','Please login to pin posts');
        return;
      }

      const response = await axios.post(
        `${Config.API_BASE_URL}/forum/${postId}/pin`,
        {},
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      if (response.data.status === 'success') {
        // Update the post in the local state
        setPosts(posts.map(post => 
          post._id === postId 
            ? { ...post, isPinned: !post.isPinned } 
            : post
        ));
        showAlert('success','Success',`Post ${response.data.data.post.isPinned ? 'pinned' : 'unpinned'} successfully!`);
      }
    } catch (error) {
      console.error("Error pinning post:", error);
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        showAlert('danger','Permission Denied','You need admin/moderator privileges to pin posts');
      } else {
        showAlert('danger','Error','Failed to pin post');
      }
    }
  };

  const handleClosePost = async (postId: string) => {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      if (!accessToken) {
        showAlert('warning','Authentication Required','Please login to close posts');
        return;
      }

      const response = await axios.post(
        `${Config.API_BASE_URL}/forum/${postId}/close`,
        {},
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      if (response.data.status === 'success') {
        // Update the post in the local state
        setPosts(posts.map(post => 
          post._id === postId 
            ? { ...post, isClosed: !post.isClosed } 
            : post
        ));
        showAlert('success','Success',`Post ${response.data.data.post.isClosed ? 'closed' : 'reopened'} successfully!`);
      }
    } catch (error) {
      console.error("Error closing post:", error);
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        showAlert('danger','Permission Denied','You can only close your own posts or need admin privileges');
      } else {
        showAlert('danger','Error','Failed to close post');
      }
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      if (!accessToken) {
        showAlert('warning','Authentication Required','Please login to delete posts');
        return;
      }

      Alert.alert(
        "Confirm Delete",
        "Are you sure you want to delete this post? This action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                const response = await axios.delete(
                  `${Config.API_BASE_URL}/forum/${postId}`,
                  {
                    headers: { Authorization: `Bearer ${accessToken}` }
                  }
                );

                if (response.data.status === 'success' || response.status === 204) {
                  setPosts(posts.filter(post => post._id !== postId));
                  showAlert('success','Success','Post deleted successfully!');
                }
              } catch (error) {
                console.error("Error deleting post:", error);
                if (axios.isAxiosError(error) && error.response?.status === 403) {
                  showAlert('danger','Permission Denied','You can only delete your own posts or need admin privileges');
                } else {
                  showAlert('danger','Error','Failed to delete post');
                }
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error("Error initiating delete post:", error);
      showAlert('danger','Error','Failed to process delete request');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const canModifyPost = (post: ForumPost) => {
    if (!userInfo) return false;
    return userInfo.role === 'admin' || 
           userInfo.role === 'moderator' || 
           post.author._id === userInfo._id;
  };

  const canPinPost = () => {
    if (!userInfo) return false;
    return userInfo.role === 'admin' || userInfo.role === 'moderator';
  };

  const getDisplayName = (author: ForumPost['author']) => {
    if (!author) return 'Anonymous';
    return author.name || author.username || 'Anonymous';
  };

  const renderPostItem = ({ item }: { item: ForumPost }) => (
    <View style={[styles.postCard, item.isPinned && styles.pinnedPost]}>
      <TouchableOpacity
        onPress={() => handlePostPress(item)}
        style={styles.postContent}
        activeOpacity={0.8}
      >
        <View style={styles.postHeader}>
          <View style={styles.postBadges}>
            {item.isPinned && (
              <View style={[styles.badge, styles.pinnedBadge]}>
                <Icon name="pin" size={12} color="#fff" />
                <Text style={styles.badgeText}>Pinned</Text>
              </View>
            )}
            
            {item.isClosed && (
              <View style={[styles.badge, styles.closedBadge]}>
                <Icon name="lock" size={12} color="#fff" />
                <Text style={styles.badgeText}>Closed</Text>
              </View>
            )}
          </View>
          
          <View style={styles.authorContainer}>
            {item.author.avatar ? (
              <Image source={{ uri: item.author.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Icon name="account" size={16} color="#fff" />
              </View>
            )}
            <Text style={styles.postAuthor}>
              {getDisplayName(item.author)}
            </Text>
          </View>
        </View>
        
        <Text style={styles.postTitle}>{item.title}</Text>
        <Text style={styles.postContentText} numberOfLines={2}>
          {item.content}
        </Text>
        
        <View style={styles.postFooter}>
          <View style={styles.postCategory}>
            <Icon name={categories.find(c => c.id === item.category)?.icon || 'tag'} 
                  size={14} 
                  color="#8D6E63" />
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
          
          <View style={styles.postStats}>
            <View style={styles.statItem}>
              <Icon name="calendar" size={12} color="#8D6E63" />
              <Text style={styles.statText}>{formatDate(item.createdAt)}</Text>
            </View>
            
            <View style={styles.statItem}>
              <Icon name="comment" size={12} color="#8D6E63" />
              <Text style={styles.statText}>{item.comments?.length || 0}</Text>
            </View>
            
            <View style={styles.statItem}>
              <Icon name="eye" size={12} color="#8D6E63" />
              <Text style={styles.statText}>{item.views || 0}</Text>
            </View>

            <View style={styles.statItem}>
              <Icon name="thumb-up" size={12} color="#8D6E63" />
              <Text style={styles.statText}>{item.upvotes || 0}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
      
      {isAuthenticated && (
        <View style={styles.actionButtons}>
          {canModifyPost(item) && (
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => handleClosePost(item._id)}
            >
              <Icon 
                name={item.isClosed ? "lock-open-variant-outline" : "lock-outline"} 
                size={18} 
                color="#8D6E63" 
              />
            </TouchableOpacity>
          )}

          {canPinPost() && (
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => handlePinPost(item._id)}
            >
              <Icon 
                name={item.isPinned ? "pin-off-outline" : "pin-outline"} 
                size={18} 
                color="#8D6E63" 
              />
            </TouchableOpacity>
          )}

          {canModifyPost(item) && (
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => handleDeletePost(item._id)}
            >
              <Icon name="trash-can-outline" size={18} color="#D32F2F" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  const renderCategorySelector = () => (
    <FlatList
      horizontal
      data={categories}
      keyExtractor={(item) => item.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoriesList}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[
            styles.categoryItem,
            activeCategory === item.id && styles.activeCategoryItem,
          ]}
          onPress={() => setActiveCategory(item.id)}
          activeOpacity={0.7}
        >
          <Icon 
            name={item.icon} 
            size={18} 
            color={activeCategory === item.id ? "#fff" : "#5D4037"} 
            style={styles.categoryIcon}
          />
          <Text
            style={[
              styles.categoryText,
              activeCategory === item.id && styles.activeCategoryText,
            ]}
          >
            {item.name}
          </Text>
        </TouchableOpacity>
      )}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
      
      {/* Modern Header with Search */}
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          {/* <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackPress}
            >
              <MaterialIcons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity> */}
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Community Forum</Text>
            {userInfo?.name && (
              <Text style={styles.userGreeting}>Welcome, {userInfo.name}</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreatePost}
          >
            <Icon name="plus" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.searchContainer}>
          <Icon name="magnify" size={20} color="#8D6E63" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search discussions..."
            placeholderTextColor="#A1887F"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Icon name="close-circle" size={18} color="#8D6E63" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Category Selector */}
      <View style={styles.categorySelectorContainer}>
        {renderCategorySelector()}
      </View>

      {/* Content Area */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8BC34A" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item._id}
          renderItem={renderPostItem}
          contentContainerStyle={styles.postsList}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor="#8BC34A"
              colors={["#8BC34A"]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="forum-outline" size={60} color="#D7CCC8" />
              <Text style={styles.emptyText}>
                {searchQuery ? "No matching posts found" : "No posts yet"}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery
                  ? "Try adjusting your search or create a new post"
                  : "Be the first to start a discussion!"}
              </Text>
              <TouchableOpacity 
                style={styles.emptyActionButton}
                onPress={handleCreatePost}
              >
                <Text style={styles.emptyActionText}>Create Post</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Alert Component */}
      <AlertPro
        ref={alertRef}
        onConfirm={() => alertRef.current?.close()}
        title={alertConfig.title}
        message={alertConfig.message}
        showCancel={false}
        textConfirm="OK"
        customStyles={{
          container: { 
            borderWidth: 2, 
            borderColor: "#8BC34A",
            borderRadius: 12
          },
          buttonConfirm: { 
            backgroundColor: "#8BC34A",
            borderRadius: 8
          },
          title: {
            color: "#5D4037",
            fontWeight: "600"
          },
          message: {
            color: "#5D4037"
          }
        }}
      />
    </SafeAreaView>
  );
};

// ... (styles remain the same as in your original code)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#FFF8F0",
  },
  errorCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F5F0EB",
    width: 320,
    maxWidth: "100%",
  },
  errorIconContainer: {
    marginBottom: 12,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#EF4444",
    marginBottom: 6,
    textAlign: "center",
  },
  errorSubtext: {
    fontSize: 14,
    color: "#A1887F",
    marginBottom: 18,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#8BC34A",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  headerContainer: {
    backgroundColor: "#FFF8F0",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E0D9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    ...Platform.select({
      android: {
        paddingTop: StatusBar.currentHeight,
      },
    }),
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#5D4037",
    letterSpacing: 0.5,
  },
  createButton: {
    backgroundColor: "#8BC34A",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 10,
    marginHorizontal: 20,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: "#E8E0D9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#5D4037",
    paddingVertical: 6,
  },
  clearButton: {
    padding: 2,
  },
  categorySelectorContainer: {
    backgroundColor: "#FFF8F0",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E0D9",
  },
  categoriesList: {
    paddingHorizontal: 12,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E8E0D9",
  },
  activeCategoryItem: {
    backgroundColor: "#8BC34A",
    borderColor: "#8BC34A",
  },
  categoryIcon: {
    marginRight: 6,
  },
  categoryText: {
    fontSize: 13,
    color: "#8D6E63",
    fontWeight: "500",
  },
  activeCategoryText: {
    color: "#fff",
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  postsList: {
    paddingHorizontal: 12,
    paddingBottom: 16,
    paddingTop: 8,
  },
  postCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F5F0EB",
  },
  pinnedPost: {
    borderLeftWidth: 3,
    borderLeftColor: "#FFC107",
    backgroundColor: "#FFFDF5",
  },
  postContent: {
    padding: 14,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  postBadges: {
    flexDirection: "row",
    flex: 1,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "500",
    marginLeft: 2,
  },
  pinnedBadge: {
    backgroundColor: "#FFC107",
  },
  closedBadge: {
    backgroundColor: "#8D6E63",
  },
  authorContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#E8E0D9",
  },
  avatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#D7CCC8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  postAuthor: {
    fontSize: 12,
    color: "#8D6E63",
    fontWeight: "500",
  },
  postTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#5D4037",
    marginBottom: 6,
    lineHeight: 20,
  },
  postContentText: {
    fontSize: 14,
    color: "#8D6E63",
    marginBottom: 10,
    lineHeight: 18,
  },
  postFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F5F0EB",
    paddingTop: 10,
  },
  postCategory: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  postStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  statText: {
    fontSize: 11,
    color: "#A1887F",
    marginLeft: 4,
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    backgroundColor: "#F9F8F6",
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: "#F5F0EB",
  },
  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    minHeight: 250,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#5D4037",
    marginTop: 12,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 13,
    color: "#A1887F",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  emptyActionButton: {
    marginTop: 16,
    backgroundColor: "#8BC34A",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  emptyActionText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  headerLeft: {
    flex: 1,
  },
  userGreeting: {
    fontSize: 12,
    color: "#8D6E63",
    fontWeight: "400",
    marginTop: 2,
  },
    backButton: {
    padding: 4,
  },
    headerRight: {
    width: 40,
  },
});

export default ForumScreen;