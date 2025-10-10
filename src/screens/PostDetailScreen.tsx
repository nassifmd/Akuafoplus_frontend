import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../Config/config';
import { ALERT_TYPE, Dialog, Toast } from 'react-native-alert-notification';

// Types
type PostDetailScreenRouteProp = RouteProp<
  { PostDetail: { postId: string } },
  'PostDetail'
>;

type PostDetailScreenNavigationProp = StackNavigationProp<any, any>;

interface Comment {
  _id: string;
  content: string;
  author: {
    _id: string;
    name?: string;
    username: string;
    avatar?: string;
  };
  createdAt: string;
  isAnswer: boolean;
}

interface ForumPost {
  _id: string;
  title: string;
  content: string;
  category: string;
  author: {
    _id: string;
    name?: string;
    username: string;
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

const PostDetailScreen = () => {
  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const route = useRoute<PostDetailScreenRouteProp>();
  const navigation = useNavigation<PostDetailScreenNavigationProp>();
  const { postId } = route.params;

  // Check authentication status
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const accessToken = await AsyncStorage.getItem('accessToken');
        if (accessToken) {
          setIsAuthenticated(true);
          const userInfoString = await AsyncStorage.getItem('userInfo');
          if (userInfoString) {
            setUserInfo(JSON.parse(userInfoString));
          }
        } else {
          setIsAuthenticated(false);
          setUserInfo(null);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        setIsAuthenticated(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Fetch post and comments
  useEffect(() => {
    const fetchPostAndComments = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`Fetching post from: ${Config.API_BASE_URL}/forum/${postId}`);
        
        // Fetch post details
        const postResponse = await axios.get(`${Config.API_BASE_URL}/forum/${postId}`);
        
        // Check for the correct response structure
        if (!postResponse.data || !postResponse.data.data || !postResponse.data.data.post) {
          throw new Error('Failed to fetch post: Invalid response structure');
        }
        
        setPost(postResponse.data.data.post);
        
        // Fetch comments
        console.log(`Fetching comments from: ${Config.API_BASE_URL}/posts/${postId}/comments`);
        const commentsResponse = await axios.get(`${Config.API_BASE_URL}/posts/${postId}/comments`);
        
        // Check for the correct response structure
        if (!commentsResponse.data || !commentsResponse.data.data || !commentsResponse.data.data.comments) {
          throw new Error('Failed to fetch comments: Invalid response structure');
        }
        
        setComments(commentsResponse.data.data.comments);
      } catch (error) {
        console.error('Error fetching post details:', error);
        let errorMessage = 'Failed to load post details';
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 404) {
            errorMessage = 'Post not found';
          } else if (error.response?.status === 500) {
            errorMessage = 'Server error occurred';
          } else if (error.message) {
            errorMessage = error.message;
          }
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      fetchPostAndComments();
    }
  }, [postId]);

  // Submit comment
  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      Toast.show({
        type: ALERT_TYPE.DANGER,
        title: 'Error',
        textBody: 'Comment cannot be empty',
      });
      return;
    }

    try {
      setSubmittingComment(true);
      const accessToken = await AsyncStorage.getItem('accessToken');
      
      if (!accessToken) {
        Dialog.show({
          type: ALERT_TYPE.WARNING,
          title: 'Authentication Required',
          textBody: 'Please login to comment',
          button: 'Login',
          onPressButton: () => {
            Dialog.hide();
            navigation.navigate('LoginScreen', { 
              redirectTo: 'PostDetail', 
              params: { postId } 
            });
          }
        });
        return;
      }

      console.log(`Posting comment to: ${Config.API_BASE_URL}/posts/${postId}/comments`);
      
      const response = await axios.post(
        `${Config.API_BASE_URL}/posts/${postId}/comments`,
        { content: commentText },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data?.status === 'success') {
        const newComment = response.data.data.comment;
        setComments([newComment, ...comments]);
        setCommentText('');
        Toast.show({
          type: ALERT_TYPE.SUCCESS,
          title: 'Success',
          textBody: 'Comment posted successfully',
        });
      } else {
        throw new Error('Failed to post comment: Invalid response structure');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      let errorMessage = 'Failed to post comment';
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          errorMessage = 'Session expired. Please login again';
        } else if (error.message) {
          errorMessage = error.message;
        }
      }
      Toast.show({
        type: ALERT_TYPE.DANGER,
        title: 'Error',
        textBody: errorMessage,
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  // Upvote post
  const handleUpvote = async () => {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      if (!accessToken) {
        Dialog.show({
          type: ALERT_TYPE.WARNING,
          title: 'Authentication Required',
          textBody: 'Please login to vote',
          button: 'Login',
          onPressButton: () => {
            Dialog.hide();
            navigation.navigate('LoginScreen', { 
              redirectTo: 'PostDetail', 
              params: { postId } 
            });
          }
        });
        return;
      }

      console.log(`Upvoting post at: ${Config.API_BASE_URL}/forum/${postId}/upvote`);
      
      const response = await axios.post(
        `${Config.API_BASE_URL}/forum/${postId}/upvote`,
        {},
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      if (response.data?.status === 'success' && response.data?.data?.post && post) {
        setPost(response.data.data.post);
      } else {
        throw new Error('Failed to upvote: Invalid response structure');
      }
    } catch (error) {
      console.error('Error upvoting post:', error);
      Toast.show({
        type: ALERT_TYPE.DANGER,
        title: 'Error',
        textBody: 'Failed to upvote post',
      });
    }
  };

  // Downvote post
  const handleDownvote = async () => {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      if (!accessToken) {
        Dialog.show({
          type: ALERT_TYPE.WARNING,
          title: 'Authentication Required',
          textBody: 'Please login to vote',
          button: 'Login',
          onPressButton: () => {
            Dialog.hide();
            navigation.navigate('LoginScreen', { 
              redirectTo: 'PostDetail', 
              params: { postId } 
            });
          }
        });
        return;
      }

      console.log(`Downvoting post at: ${Config.API_BASE_URL}/forum/${postId}/downvote`);
      
      const response = await axios.post(
        `${Config.API_BASE_URL}/forum/${postId}/downvote`,
        {},
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      if (response.data?.status === 'success' && response.data?.data?.post && post) {
        setPost(response.data.data.post);
      } else {
        throw new Error('Failed to downvote: Invalid response structure');
      }
    } catch (error) {
      console.error('Error downvoting post:', error);
      Toast.show({
        type: ALERT_TYPE.DANGER,
        title: 'Error',
        textBody: 'Failed to downvote post',
      });
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Add helper function to display author name
  const getAuthorDisplayName = (author: { name?: string; username: string }) => {
    return author.name ? `${author.name}` : author.username;
  };

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar backgroundColor="#2D5016" barStyle="light-content" />
        <ActivityIndicator size="large" color="#E8B954" />
      </SafeAreaView>
    );
  }

  // Render error state
  if (error || !post) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#2D5016" barStyle="light-content" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Error Loading Post</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={60} color="#8B4513" />
          <Text style={styles.errorText}>
            {error || 'Post not found or has been deleted.'}
          </Text>
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[styles.actionButton, styles.retryButton]}
              onPress={() => {
                setLoading(true);
                setError(null);
                const fetchData = async () => {
                  try {
                    const postResponse = await axios.get(`${Config.API_BASE_URL}/posts/${postId}`);
                    setPost(postResponse.data.data.post);
                    const commentsResponse = await axios.get(`${Config.API_BASE_URL}/posts/${postId}/comments`);
                    setComments(commentsResponse.data.data.comments);
                    setError(null);
                  } catch (err) {
                    setError('Failed to load post. Please try again.');
                  } finally {
                    setLoading(false);
                  }
                };
                fetchData();
              }}
            >
              <Text style={styles.actionButtonText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.returnButton]}
              onPress={() => navigation.navigate('ForumScreen')}
            >
              <Text style={styles.actionButtonText}>Return to Forum</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#2D5016" barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {post.title}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Post Content */}
          <View style={styles.postContainer}>
            <Text style={styles.postTitle}>{post.title}</Text>
            
            <View style={styles.postMeta}>
              <View style={styles.categoryBadge}>
                <Text style={styles.postCategory}>{post.category}</Text>
              </View>
              <View style={styles.authorInfo}>
                <Icon name="account-circle" size={16} color="#8B4513" />
                <Text style={styles.postAuthor}>By {getAuthorDisplayName(post.author)}</Text>
              </View>
              <View style={styles.dateInfo}>
                <Icon name="clock-outline" size={14} color="#8B4513" />
                <Text style={styles.postDate}>{formatDate(post.createdAt)}</Text>
              </View>
            </View>
            
            <Text style={styles.postContent}>{post.content}</Text>
            
            <View style={styles.postStats}>
              <TouchableOpacity 
                style={styles.voteContainer}
                onPress={handleUpvote}
              >
                <Icon name="thumb-up-outline" size={20} color="#2D5016" />
                <Text style={styles.voteCount}>{post.upvotes}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.voteContainer}
                onPress={handleDownvote}
              >
                <Icon name="thumb-down-outline" size={20} color="#8B4513" />
                <Text style={styles.voteCount}>{post.downvotes}</Text>
              </TouchableOpacity>
              
              <View style={styles.viewsContainer}>
                <Icon name="eye-outline" size={20} color="#8B4513" />
                <Text style={styles.viewsCount}>{post.views} views</Text>
              </View>
            </View>

            <View style={styles.commentsHeader}>
              <View style={styles.commentsTitleContainer}>
                <Icon name="comment-multiple-outline" size={20} color="#2D5016" />
                <Text style={styles.commentsTitle}>
                  Comments ({comments.length})
                </Text>
              </View>
            </View>

            {post.isClosed && (
              <View style={styles.closedBanner}>
                <Icon name="lock" size={16} color="#fff" />
                <Text style={styles.closedText}>
                  This post is closed. New comments are disabled.
                </Text>
              </View>
            )}

            {!isAuthenticated && !post.isClosed && (
              <TouchableOpacity
                style={styles.loginPrompt}
                onPress={() => navigation.navigate('LoginScreen', { 
                  redirectTo: 'PostDetail', 
                  params: { postId } 
                })}
              >
                <Icon name="login" size={16} color="#2D5016" />
                <Text style={styles.loginPromptText}>
                  Log in to join the conversation
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Comments List */}
          {comments.length > 0 ? (
            comments.map((item) => (
              <View 
                key={item._id}
                style={[
                  styles.commentCard,
                  item.isAnswer && styles.answerCommentCard
                ]}
              >
                <View style={styles.commentHeader}>
                  <View style={styles.commentAuthorInfo}>
                    <Icon name="account-circle" size={16} color="#8B4513" />
                    <Text style={styles.commentAuthor}>{getAuthorDisplayName(item.author)}</Text>
                  </View>
                  {item.isAnswer && (
                    <View style={styles.answerBadge}>
                      <Icon name="check-circle" size={14} color="#fff" />
                      <Text style={styles.answerText}>Answer</Text>
                    </View>
                  )}
                  <Text style={styles.commentDate}>{formatDate(item.createdAt)}</Text>
                </View>
                <Text style={styles.commentContent}>{item.content}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyComments}>
              <Icon name="comment-outline" size={40} color="#D3D3C3" />
              <Text style={styles.emptyCommentsText}>No comments yet</Text>
              <Text style={styles.emptyCommentsSubText}>
                Be the first to share your thoughts!
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Comment Input (fixed at bottom) */}
        {isAuthenticated && !post.isClosed && (
          <View style={styles.commentFormContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Write a comment..."
              placeholderTextColor="#8B8970"
              value={commentText}
              onChangeText={setCommentText}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.commentButton,
                (!commentText.trim() || submittingComment) && styles.disabledButton,
              ]}
              onPress={handleSubmitComment}
              disabled={!commentText.trim() || submittingComment}
            >
              {submittingComment ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icon name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F2',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2D5016',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#2D5016',
    borderBottomWidth: 1,
    borderBottomColor: '#3A6630',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#3A6630',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  postContainer: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 8,
    borderRadius: 12,
    margin: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  postTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D5016',
    marginBottom: 12,
    lineHeight: 28,
  },
  postMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: '#E8B954',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  postCategory: {
    fontSize: 12,
    color: '#2D5016',
    fontWeight: '600',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postAuthor: {
    fontSize: 12,
    color: '#8B4513',
    fontWeight: '500',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postDate: {
    fontSize: 12,
    color: '#8B4513',
  },
  postContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 16,
  },
  postStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E8E8D0',
    paddingTop: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  voteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 12,
    gap: 4,
  },
  voteCount: {
    fontSize: 14,
    color: '#2D5016',
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
  viewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    backgroundColor: '#F8F8F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  viewsCount: {
    fontSize: 14,
    color: '#8B4513',
    fontWeight: '500',
  },
  commentsHeader: {
    borderTopWidth: 2,
    borderTopColor: '#E8E8D0',
    paddingTop: 16,
    marginBottom: 16,
  },
  commentsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D5016',
  },
  commentFormContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E8E8D0',
    gap: 8,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F8F8F2',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 50,
    color: '#2D5016',
    borderWidth: 1,
    borderColor: '#E8E8D0',
  },
  commentButton: {
    backgroundColor: '#2D5016',
    borderRadius: 20,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
    height: 50,
  },
  disabledButton: {
    backgroundColor: '#8B8970',
  },
  commentCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    marginHorizontal: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#E8B954',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  answerCommentCard: {
    backgroundColor: '#F8F8F2',
    borderLeftWidth: 4,
    borderLeftColor: '#2D5016',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  commentAuthorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D5016',
  },
  commentDate: {
    fontSize: 12,
    color: '#8B8970',
    marginLeft: 'auto',
  },
  commentContent: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
  answerBadge: {
    backgroundColor: '#2D5016',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  answerText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  emptyComments: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
    margin: 12,
    borderRadius: 12,
  },
  emptyCommentsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D5016',
    marginTop: 12,
  },
  emptyCommentsSubText: {
    fontSize: 14,
    color: '#8B8970',
    textAlign: 'center',
    marginTop: 4,
  },
  loginPrompt: {
    backgroundColor: '#F8F8F2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E8E8D0',
  },
  loginPromptText: {
    fontSize: 14,
    color: '#2D5016',
    fontWeight: '600',
  },
  closedBanner: {
    backgroundColor: '#8B4513',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  closedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#8B4513',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
    elevation: 2,
  },
  retryButton: {
    backgroundColor: '#2D5016',
  },
  returnButton: {
    backgroundColor: '#8B4513',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default PostDetailScreen;