import axios from 'axios';
import type { UserResponse, UserUpdate } from '../types/user';

const API_BASE_URL = 'http://localhost:8000/api/v1';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  console.log('Request Interceptor - Token:', token);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('Request Headers:', config.headers);
  }
  return config;
});

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('Response:', response);
    return response;
  },
  (error) => {
    console.error('API Error:', error.response || error);
    return Promise.reject(error);
  }
);

// Test function to verify token handling
export const testTokenFlow = async (firebaseIdToken: string) => {
  try {
    console.log('=== Testing Token Flow ===');
    
    // 1. Test Firebase ID Token
    console.log('1. Firebase ID Token:', firebaseIdToken);
    
    // 2. Test /auth/signin
    console.log('2. Testing /auth/signin...');
    const signInResponse = await api.post<UserResponse>('/auth/signin', {
      id_token: firebaseIdToken
    });
    console.log('Sign in response:', signInResponse.data);
    
    // 3. Verify token storage
    const storedToken = localStorage.getItem('token');
    console.log('3. Stored token:', storedToken);
    
    // 4. Test /users/me with stored token
    console.log('4. Testing /users/me...');
    const userResponse = await api.get<UserResponse>('/users/me');
    console.log('User response:', userResponse.data);
    
    return {
      success: true,
      signInResponse: signInResponse.data,
      userResponse: userResponse.data
    };
  } catch (error) {
    console.error('Token flow test failed:', error);
    return {
      success: false,
      error
    };
  }
};

export const userApi = {
  // Get current user profile
  getCurrentUser: async (): Promise<UserResponse> => {
    console.log('Getting current user...');
    const response = await api.get<UserResponse>('/users/me');
    return response.data;
  },

  // Update user profile
  updateUser: async (userData: UserUpdate): Promise<UserResponse> => {
    console.log('Updating user with data:', userData);
    const response = await api.patch<UserResponse>('/users/me', userData);
    return response.data;
  },

  // Sign in with Firebase token
  signInWithFirebase: async (idToken: string, email: string): Promise<UserResponse> => {
    console.log('Signing in with Firebase token...');
    const response = await api.post<UserResponse>('/auth/signin', { 
      idToken,
      email,
      password: '' // Firebase 인증이므로 비밀번호는 필요 없습니다
    });
    console.log('Sign in response:', response.data);
    // Store the token in localStorage
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      console.log('Token stored in localStorage');
    }
    return response.data;
  },
}; 