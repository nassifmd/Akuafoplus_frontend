import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../Config/config';
import { ALERT_TYPE, Dialog, Toast } from 'react-native-alert-notification';

// Define your navigation types properly
type RootStackParamList = {
  ForumScreen: undefined;
  CreatePost: undefined;
  LoginScreen: { redirectTo?: string };
  // Add other screens as needed
};

type CreatePostScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CreatePost'>;

const CreatePostScreen = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<CreatePostScreenNavigationProp>();

  const categories = [
    { id: 'general', name: 'General', icon: 'comment-text-outline' },
    { id: 'questions', name: 'Questions', icon: 'help-circle-outline' },
    { id: 'announcements', name: 'Announcements', icon: 'bullhorn-outline' },
    { id: 'feedback', name: 'Feedback', icon: 'message-alert-outline' },
    { id: 'help', name: 'Help', icon: 'lifebuoy' },
  ];

  const handleSubmit = async () => {
    if (!title.trim()) {
      Dialog.show({
        type: ALERT_TYPE.DANGER,
        title: 'Missing Title',
        textBody: 'Please enter a title for your post',
        button: 'OK',
      });
      return;
    }

    if (!content.trim()) {
      Dialog.show({
        type: ALERT_TYPE.DANGER,
        title: 'Missing Content',
        textBody: 'Please enter content for your post',
        button: 'OK',
      });
      return;
    }

    try {
      setLoading(true);
      const accessToken = await AsyncStorage.getItem('accessToken');
      
      if (!accessToken) {
        Dialog.show({
          type: ALERT_TYPE.WARNING,
          title: 'Authentication Error',
          textBody: 'Please login to create a post',
          button: 'Login',
          onPressButton: () => {
            navigation.navigate('LoginScreen', { redirectTo: 'CreatePost' });
          }
        });
        return;
      }

      let apiUrl = Config.API_BASE_URL;
      if (Platform.OS === 'android') {
        apiUrl = apiUrl.replace('localhost', '10.0.2.2');
      }

      const response = await axios.post(
        `${apiUrl}/forum`,
        { title, content, category },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        // Clear form fields immediately
        setTitle('');
        setContent('');
        setCategory('general');
        
        // Show success message
        Dialog.show({
          type: ALERT_TYPE.SUCCESS,
          title: 'Post Published',
          textBody: 'Your post has been published successfully!',
          button: 'View Posts',
          onPressButton: () => {
            // Navigate to ForumScreen and reset the navigation stack
            navigation.reset({
              index: 0,
              routes: [{ name: 'ForumScreen' }],
            });
          }
        });
      }
    } catch (error) {
      console.error('Error creating post:', error);
      
      let errorMessage = 'Failed to create post. Please try again.';
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      Toast.show({
        type: ALERT_TYPE.DANGER,
        title: 'Error',
        textBody: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="chevron-left" size={28} color="#5D4037" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create New Post</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView 
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Post Details</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="What's your post about?"
                placeholderTextColor="#A0AEC0"
                maxLength={200}
              />
              <Text style={styles.charHint}>Max 200 characters</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.categoryContainer}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryButton,
                      category === cat.id && styles.selectedCategory,
                    ]}
                    onPress={() => setCategory(cat.id)}
                  >
                    <Icon 
                      name={cat.icon} 
                      size={20} 
                      color={category === cat.id ? '#fff' : '#5D4037'} 
                      style={styles.categoryIcon}
                    />
                    <Text style={[
                      styles.categoryText,
                      category === cat.id && styles.selectedCategoryText,
                    ]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Content</Text>
              <TextInput
                style={styles.contentInput}
                value={content}
                onChangeText={setContent}
                placeholder="Share your thoughts..."
                placeholderTextColor="#A0AEC0"
                multiline
                textAlignVertical="top"
                maxLength={5000}
              />
              <View style={styles.charCountContainer}>
                <Text style={styles.charCount}>
                  {content.length}/5000 characters
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="send" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.submitButtonText}>Publish Post</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9F5EB',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2D1',
    elevation: 1,
    shadowColor: '#5D4037',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5D4037',
  },
  headerRight: {
    width: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#5D4037',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0EBDE',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5D4037',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#E8E2D1',
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#5D4037',
  },
  input: {
    backgroundColor: '#F9F5EB',
    borderWidth: 1,
    borderColor: '#E8E2D1',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#5D4037',
  },
  contentInput: {
    backgroundColor: '#F9F5EB',
    borderWidth: 1,
    borderColor: '#E8E2D1',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 180,
    color: '#5D4037',
    textAlignVertical: 'top',
  },
  charHint: {
    fontSize: 12,
    color: '#A0AEC0',
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  charCountContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  charCount: {
    fontSize: 12,
    color: '#A0AEC0',
    marginTop: 6,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F5EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#E8E2D1',
  },
  selectedCategory: {
    backgroundColor: '#8BC34A',
    borderColor: '#8BC34A',
  },
  categoryIcon: {
    marginRight: 8,
  },
  categoryText: {
    color: '#5D4037',
    fontWeight: '500',
    fontSize: 14,
  },
  selectedCategoryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#8BC34A',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 24,
    shadowColor: '#5D4037',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: '#C5E1A5',
  },
  buttonIcon: {
    marginRight: 10,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default CreatePostScreen;