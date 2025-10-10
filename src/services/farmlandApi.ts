import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, CancelTokenSource, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from "../Config/config";

// Types for better TypeScript support
interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  [key: string]: any;
}

interface UserData {
  userId: string | null;
  userEmail: string | null;
  accessToken: string | null;
  refreshToken?: string | null;
  isAuthenticated: boolean;
}

interface AuthTokens {
  accessToken: string | null;
  refreshToken?: string | null;
}

// Request cancellation sources
const requestCancellation: Record<string, CancelTokenSource> = {};

// Define your API base URL
const API_BASE_URL = Config.API_BASE_URL;

// Debug mode control
const DEBUG_MODE = __DEV__; // Automatically use dev mode in development

// Create axios instance with interceptors
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        } as typeof config.headers;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Log error details in debug mode
    if (DEBUG_MODE) {
      console.error('API Error:', {
        url: originalRequest?.url,
        method: originalRequest?.method,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    }

    // Handle token expiration (401 error)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Attempt to refresh the token
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = response.data;
          
          // Store the new tokens
          await AsyncStorage.setItem('accessToken', accessToken);
          if (newRefreshToken) {
            await AsyncStorage.setItem('refreshToken', newRefreshToken);
          }
          
          // Retry the original request with the new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // If refresh fails, clear storage and redirect to login
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userId', 'userEmail']);
        // You might want to navigate to login screen here
        console.error('Token refresh failed:', refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Generic API request function
const apiRequest = async <T>(
  method: 'get' | 'post' | 'put' | 'delete',
  url: string,
  data?: any,
  config?: AxiosRequestConfig,
  requestId?: string
): Promise<T> => {
  // Cancel previous request with the same ID if it exists
  if (requestId && requestCancellation[requestId]) {
    requestCancellation[requestId].cancel('Request canceled due to new request');
  }

  // Create a new cancel token for this request
  const source = axios.CancelToken.source();
  if (requestId) {
    requestCancellation[requestId] = source;
  }

  try {
    if (DEBUG_MODE) {
      console.log(`API ${method.toUpperCase()}:`, url, data || '');
    }

    const response = await apiClient({
      method,
      url,
      data,
      cancelToken: source.token,
      ...config,
    });

    if (DEBUG_MODE) {
      console.log(`API ${method.toUpperCase()} Response:`, url, response.data);
    }

    // Clean up cancellation record
    if (requestId) {
      delete requestCancellation[requestId];
    }

    return response.data.data || response.data;
  } catch (error: any) {
    if (DEBUG_MODE) {
      console.error(`API ${method.toUpperCase()} Error:`, url, error.response?.data || error.message);
    }

    // Clean up cancellation record
    if (requestId) {
      delete requestCancellation[requestId];
    }

    if (axios.isCancel(error)) {
      throw new Error('Request canceled');
    }

    const errorMessage = error.response?.data?.message || error.message;
    throw new Error(errorMessage || `Error with ${method.toUpperCase()} request to ${url}`);
  }
};

// Cancel a specific request
export const cancelRequest = (requestId: string) => {
  if (requestCancellation[requestId]) {
    requestCancellation[requestId].cancel('Request canceled by user');
    delete requestCancellation[requestId];
  }
};

// Cancel all pending requests
export const cancelAllRequests = () => {
  Object.keys(requestCancellation).forEach((requestId) => {
    requestCancellation[requestId].cancel('All requests canceled');
    delete requestCancellation[requestId];
  });
};

// API Functions
export const fetchFarmlands = async (params = {}, requestId?: string) => {
  return apiRequest('get', '/farmlands', undefined, { params }, requestId);
};

export const fetchFarmlandDetails = async (id: string, requestId?: string) => {
  return apiRequest('get', `/farmlands/${id}`, undefined, undefined, requestId);
};

export const submitInquiry = async (inquiryData: any, requestId?: string) => {
  return apiRequest('post', '/inquiries', inquiryData, undefined, requestId);
};

export const fetchMyInquiries = async (requestId?: string) => {
  return apiRequest('get', '/inquiries/my-inquiries', undefined, undefined, requestId);
};

export const fetchMyFarmlandInquiries = async (requestId?: string) => {
  return apiRequest('get', '/inquiries/my-farmland-inquiries', undefined, undefined, requestId);
};

export const updateInquiryStatus = async (
  id: string, 
  status: string, 
  responseText?: string, 
  requestId?: string
) => {
  const updateData: any = { status };
  if (responseText) updateData.response = responseText;
  
  return apiRequest('put', `/inquiries/${id}/status`, updateData, undefined, requestId);
};

export const deleteInquiry = async (id: string, requestId?: string) => {
  return apiRequest('delete', `/inquiries/${id}`, undefined, undefined, requestId);
};

// Helper functions
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const token = await AsyncStorage.getItem('accessToken');
    return !!token;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};

export const getUserData = async (): Promise<UserData> => {
  try {
    const [userId, userEmail, accessToken, refreshToken] = await AsyncStorage.multiGet([
      'userId',
      'userEmail', 
      'accessToken',
      'refreshToken'
    ]);
    
    return {
      userId: userId[1],
      userEmail: userEmail[1],
      accessToken: accessToken[1],
      refreshToken: refreshToken[1],
      isAuthenticated: !!accessToken[1]
    };
  } catch (error) {
    console.error('Error getting user data:', error);
    return {
      userId: null,
      userEmail: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false
    };
  }
};

export const setAuthTokens = async (tokens: AuthTokens): Promise<void> => {
  try {
    await AsyncStorage.multiSet([
      ['accessToken', tokens.accessToken || ''],
      ...(tokens.refreshToken !== undefined
        ? ([['refreshToken', tokens.refreshToken ?? '']] as [string, string][])
        : [])
    ]);
  } catch (error) {
    console.error('Error setting auth tokens:', error);
    throw error;
  }
};

export const clearAuthTokens = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
  } catch (error) {
    console.error('Error clearing auth tokens:', error);
    throw error;
  }
};

// Default export
export default {
  fetchFarmlands,
  fetchFarmlandDetails,
  submitInquiry,
  fetchMyInquiries,
  fetchMyFarmlandInquiries,
  updateInquiryStatus,
  deleteInquiry,
  isAuthenticated,
  getUserData,
  setAuthTokens,
  clearAuthTokens,
  cancelRequest,
  cancelAllRequests,
};