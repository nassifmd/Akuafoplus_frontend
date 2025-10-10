import React, { useState, useEffect, useRef } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  ActivityIndicator, 
  Alert,
  RefreshControl,
  FlatList,
  SafeAreaView,
  StatusBar
} from "react-native";
import { launchImageLibrary, launchCamera, CameraOptions, ImageLibraryOptions, Asset } from "react-native-image-picker";
import axios, { AxiosError } from "axios";
import Config from '../Config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AlertPro from 'react-native-alert-pro';

type DiseaseResult = {
  _id: string;
  disease: string;
  confidence?: number;
  category: 'crop' | 'livestock' | 'poultry';
  createdAt: string;
  imageUrl?: string;
  description?: string;
  symptoms?: string[];
  treatment?: string;
  prevention?: string;
  isUserAdded?: boolean;
};

const DiseaseManagementScreen = ({ navigation }: { navigation: any }) => {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<DiseaseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<DiseaseResult[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'crop' | 'livestock' | 'poultry'>('crop');
  const [refreshing, setRefreshing] = useState(false);
  const [authError, setAuthError] = useState(false);

  // NEW alert handling state
  const alertRef = useRef<AlertPro | null>(null);
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string }>({ title: '', message: '' });
  const [onAlertConfirm, setOnAlertConfirm] = useState<(() => void) | null>(null);

  const showAlert = (title: string, message: string, onConfirm?: () => void) => {
    setAlertConfig({ title, message });
    setOnAlertConfirm(() => onConfirm || null);
    requestAnimationFrame(() => alertRef.current?.open());
  };

  useEffect(() => {
    fetchDiseaseHistory();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDiseaseHistory().finally(() => setRefreshing(false));
  };

  const verifyAuth = async (): Promise<boolean> => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        setAuthError(true);
        showAlert(
          'Session Expired',
            'Your session has expired. Please log in again.',
            () => navigation.navigate('Login')
        );
        return false;
      }
      return true;
    } catch {
      setAuthError(true);
      showAlert(
        'Authentication Error',
        'Unable to verify session. Please log in again.',
        () => navigation.navigate('Login')
      );
      return false;
    }
  };

  const handleImageResponse = (response: { assets?: Asset[]; errorCode?: string; errorMessage?: string; didCancel?: boolean }) => {
    if (response.didCancel) {
      console.log('User cancelled image picker');
    } else if (response.errorCode) {
      showAlert(
        'Error',
        `Image picker error: ${response.errorMessage || response.errorCode}`
      );
    } else if (response.assets?.[0]?.uri) {
      setImage(response.assets[0].uri);
    }
  };

  const pickImage = () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      quality: 1,
      maxWidth: 1000,
      maxHeight: 1000,
    };
    launchImageLibrary(options, handleImageResponse);
  };

  const takePhoto = () => {
    const options: CameraOptions = {
      mediaType: 'photo',
      quality: 1,
      saveToPhotos: true,
      cameraType: 'back',
    };
    launchCamera(options, handleImageResponse);
  };

  const uploadImage = async () => {
    if (!image) {
      showAlert('No Image Selected', 'Please select an image first.');
      return;
    }

    const isAuthenticated = await verifyAuth();
    if (!isAuthenticated) return;

    setLoading(true);
    setResult(null);

    try {
      const authToken = await AsyncStorage.getItem('accessToken');
      if (!authToken) {
        throw new Error('No authentication token found');
      }

      const formData = new FormData();
      formData.append('image', {
        uri: image,
        name: 'photo.jpg',
        type: 'image/jpeg',
      } as unknown as Blob);

      const endpoint = `${Config.API_BASE_URL}/disease-detection/${selectedCategory}`;

      const response = await axios.post<DiseaseResult>(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${authToken}`,
        },
        timeout: 30000,
      });

      setResult(response.data);
      fetchDiseaseHistory();
    } catch (error) {
      console.error('Error uploading image:', error);
      handleApiError(error as AxiosError, 'Failed to analyze image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDiseaseHistory = async () => {
    const isAuthenticated = await verifyAuth();
    if (!isAuthenticated) return;

    setHistoryLoading(true);
    try {
      const authToken = await AsyncStorage.getItem('accessToken');
      if (!authToken) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get<DiseaseResult[]>(
        `${Config.API_BASE_URL}/disease-detection/history`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
          params: {
            category: selectedCategory
          },
          timeout: 10000,
        }
      );
      
      if (response.status === 200) {
        setHistory(response.data || []);
        setAuthError(false);
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          setHistory([]);
          console.log('History endpoint not found, returning empty array');
        } else {
          handleApiError(error, 'Failed to load disease history.');
        }
      } else {
        Alert.alert('Error', 'An unexpected error occurred');
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleApiError = (error: AxiosError, defaultMessage: string) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      setAuthError(true);
      showAlert(
        'Session Expired',
        'Your session has expired. Please log in again.',
        () => navigation.navigate('Login')
      );
    } else {
      const message = error.response?.data && typeof error.response.data === 'object'
        ? (error.response.data as { message?: string }).message || defaultMessage
        : defaultMessage;
      showAlert('Error', message);
    }
  };

  const filterByCategory = (category: string) => {
    return history.filter(item => item.category === category);
  };

  if (authError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.authErrorContainer}>
          <Icon name="error-outline" size={60} color="#d32f2f" />
          <Text style={styles.authErrorText}>Authentication Required</Text>
          <Text style={styles.authErrorSubtext}>Please log in to access disease management features</Text>
          <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
      >
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Disease Management</Text>
          <Text style={styles.subHeader}>Identify and track plant and animal diseases</Text>
        </View>
        
        <View style={styles.categorySelector}>
          <TouchableOpacity
            style={[styles.categoryButton, selectedCategory === 'crop' && styles.selectedCategory]}
            onPress={() => setSelectedCategory('crop')}
          >
            <Icon name="grass" size={20} color={selectedCategory === 'crop' ? 'white' : '#4CAF50'} />
            <Text style={[styles.categoryText, selectedCategory === 'crop' && styles.selectedCategoryText]}>Crop</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.categoryButton, selectedCategory === 'livestock' && styles.selectedCategory]}
            onPress={() => setSelectedCategory('livestock')}
          >
            <Icon name="pets" size={20} color={selectedCategory === 'livestock' ? 'white' : '#4CAF50'} />
            <Text style={[styles.categoryText, selectedCategory === 'livestock' && styles.selectedCategoryText]}>Livestock</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.categoryButton, selectedCategory === 'poultry' && styles.selectedCategory]}
            onPress={() => setSelectedCategory('poultry')}
          >
            <Icon name="egg" size={20} color={selectedCategory === 'poultry' ? 'white' : '#4CAF50'} />
            <Text style={[styles.categoryText, selectedCategory === 'poultry' && styles.selectedCategoryText]}>Poultry</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Icon name="search" size={20} color="#4CAF50" />
            </View>
            <Text style={styles.sectionTitle}>Disease Detection</Text>
          </View>
          <View style={styles.imageSection}>
            {image ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: image }} style={styles.image} />
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => setImage(null)}
                >
                  <Icon name="close" size={20} color="white" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.placeholderContainer}>
                <Icon name="add-photo-alternate" size={50} color="#ccc" />
                <Text style={styles.placeholderText}>No image selected</Text>
              </View>
            )}
            
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                <Icon name="photo-library" size={20} color="white" />
                <Text style={styles.buttonText}> Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
                <Icon name="photo-camera" size={20} color="white" />
                <Text style={styles.buttonText}> Camera</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={[styles.analyzeButton, (!image || loading) && styles.disabledButton]} 
              onPress={uploadImage}
              disabled={!image || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="search" size={20} color="white" />
                  <Text style={styles.analyzeButtonText}> Analyze Image</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {result && (
          <View style={styles.resultContainer}>
            <View style={styles.resultHeaderContainer}>
              <View style={styles.resultIconContainer}>
                <Icon name="verified" size={20} color="white" />
              </View>
              <Text style={styles.resultHeader}>Analysis Result</Text>
            </View>
            
            <View style={styles.resultGrid}>
              <View style={styles.resultItem}>
                <View style={styles.resultIconWrapper}>
                  <Icon name="local-hospital" size={16} color="#4CAF50" />
                </View>
                <View>
                  <Text style={styles.resultLabel}>Disease</Text>
                  <Text style={styles.resultValue}>{result.disease}</Text>
                </View>
              </View>
              
              {result.confidence && (
                <View style={styles.resultItem}>
                  <View style={styles.resultIconWrapper}>
                    <Icon name="assessment" size={16} color="#4CAF50" />
                  </View>
                  <View>
                    <Text style={styles.resultLabel}>Confidence</Text>
                    <Text style={styles.resultValue}>{(result.confidence * 100).toFixed(2)}%</Text>
                  </View>
                </View>
              )}
              
              <View style={styles.resultItem}>
                <View style={styles.resultIconWrapper}>
                  <Icon name="category" size={16} color="#4CAF50" />
                </View>
                <View>
                  <Text style={styles.resultLabel}>Category</Text>
                  <Text style={styles.resultValue}>{result.category}</Text>
                </View>
              </View>
              
              <View style={styles.resultItem}>
                <View style={styles.resultIconWrapper}>
                  <Icon name="event" size={16} color="#4CAF50" />
                </View>
                <View>
                  <Text style={styles.resultLabel}>Date</Text>
                  <Text style={styles.resultValue}>{new Date(result.createdAt).toLocaleString()}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Icon name="history" size={20} color="#4CAF50" />
            </View>
            <Text style={styles.sectionTitle}>Disease History</Text>
          </View>
          
          {historyLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.loadingText}>Loading history...</Text>
            </View>
          ) : history.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Icon name="info-outline" size={40} color="#ccc" />
              <Text style={styles.noHistoryText}>No disease records found</Text>
              <Text style={styles.noHistorySubtext}>Analyze an image to start building your history</Text>
            </View>
          ) : (
            <>
              <View style={styles.tabContainer}>
                <TouchableOpacity 
                  style={[styles.tabButton, selectedCategory === 'crop' && styles.activeTab]}
                  onPress={() => setSelectedCategory('crop')}
                >
                  <Text style={[styles.tabText, selectedCategory === 'crop' && styles.activeTabText]}>Crop</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tabButton, selectedCategory === 'livestock' && styles.activeTab]}
                  onPress={() => setSelectedCategory('livestock')}
                >
                  <Text style={[styles.tabText, selectedCategory === 'livestock' && styles.activeTabText]}>Livestock</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tabButton, selectedCategory === 'poultry' && styles.activeTab]}
                  onPress={() => setSelectedCategory('poultry')}
                >
                  <Text style={[styles.tabText, selectedCategory === 'poultry' && styles.activeTabText]}>Poultry</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={filterByCategory(selectedCategory)}
                keyExtractor={(item) => item._id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View style={styles.historyItem}>
                    {item.imageUrl && (
                      <Image 
                        source={{ uri: `${Config.API_BASE_URL}${item.imageUrl}` }} 
                        style={styles.historyImage} 
                      />
                    )}
                    <View style={styles.historyDetails}>
                      <View style={styles.historyDiseaseContainer}>
                        <Text style={styles.historyDisease}>{item.disease}</Text>
                        {item.confidence && (
                          <View style={styles.confidenceBadge}>
                            <Text style={styles.confidenceText}>{(item.confidence * 100).toFixed(0)}%</Text>
                          </View>
                        )}
                      </View>
                      
                      {item.description && (
                        <Text style={styles.historyDescription} numberOfLines={2}>
                          {item.description}
                        </Text>
                      )}
                      
                      <View style={styles.historyMetaContainer}>
                        <View style={styles.historyDateContainer}>
                          <Icon name="event" size={14} color="#6b7280" />
                          <Text style={styles.historyDate}>
                            {new Date(item.createdAt).toLocaleDateString()}
                          </Text>
                        </View>
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>{item.category}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}
              />
            </>
          )}
        </View>
      </ScrollView>

      {/* AlertPro component */}
      <AlertPro
        ref={alertRef}
        title={alertConfig.title}
        message={alertConfig.message}
        textConfirm="OK"
        showCancel={false}
        onConfirm={() => {
          alertRef.current?.close();
          if (onAlertConfirm) {
            const fn = onAlertConfirm;
            setOnAlertConfirm(null);
            fn();
          }
        }}
        onClose={() => setOnAlertConfirm(null)}
        customStyles={{
          mask: { backgroundColor: 'rgba(0,0,0,0.4)' },
          container: { borderRadius: 12 }
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f8f9fa",
  },
  authErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  authErrorText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#374151',
    marginVertical: 12,
    textAlign: 'center',
  },
  authErrorSubtext: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  loginButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  headerContainer: {
    marginBottom: 24,
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  subHeader: {
    fontSize: 16,
    color: "#6b7280",
  },
  section: {
    marginBottom: 24,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  categorySelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  categoryButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: 'row',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  selectedCategory: {
    backgroundColor: "#4CAF50",
  },
  categoryText: {
    color: "#4B5563",
    fontWeight: "500",
    marginLeft: 6,
  },
  selectedCategoryText: {
    color: "white",
  },
  imageSection: {
    marginBottom: 15,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    resizeMode: "cover",
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: '#9ca3af',
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  imageButton: {
    flex: 1,
    backgroundColor: "#3B82F6",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: 'row',
    justifyContent: 'center',
    marginHorizontal: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    color: "white",
    fontWeight: "500",
    marginLeft: 6,
  },
  analyzeButton: {
    backgroundColor: "#4CAF50",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: 'row',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  disabledButton: {
    backgroundColor: "#9ca3af",
  },
  analyzeButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
  resultContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resultHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  resultIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resultHeader: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  resultGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  resultItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resultLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  resultValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
  },
  emptyHistory: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noHistoryText: {
    textAlign: "center",
    color: "#374151",
    marginTop: 12,
    fontWeight: '500',
  },
  noHistorySubtext: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 4,
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: 'white',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabText: {
    color: '#6b7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#4CAF50',
  },
  historyItem: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  historyImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  historyDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  historyDiseaseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  historyDisease: {
    fontSize: 16,
    fontWeight: "600",
    color: '#1f2937',
    marginRight: 8,
  },
  confidenceBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  confidenceText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  historyDescription: {
    color: "#6b7280",
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  historyMetaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyDate: {
    color: "#6b7280",
    fontSize: 12,
    marginLeft: 4,
  },
  categoryBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryBadgeText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
});

export default DiseaseManagementScreen;