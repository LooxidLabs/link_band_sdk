import type { UserResponse, UserUpdate } from '../types/user';
import { api } from './interceptor';

const API_BASE_URL = '/api/v1';

export const userApi = {
  // Get current user profile
  getCurrentUser: async (): Promise<UserResponse> => {
    console.log('Getting current user...');
    return api.get(`${API_BASE_URL}/users/me`);
  },

  // Update user profile
  updateUser: async (userData: UserUpdate): Promise<UserResponse> => {
    console.log('Updating user with data:', userData);
    return api.put(`${API_BASE_URL}/users/me`, userData);
  },

  // Sign in with Firebase token
  signInWithFirebase: async (idToken: string, email: string): Promise<UserResponse> => {
    console.log('Signing in with Firebase token...');
    const response = await api.post(`${API_BASE_URL}/auth/signin`, { 
      idToken,
      email,
      password: '' // Firebase 인증이므로 비밀번호는 필요 없습니다
    });
    console.log('Sign in response:', response);
    return response;
  },
};

// Test function to verify token flow
export const testTokenFlow = async (firebaseIdToken: string) => {
  try {
    console.log('=== Testing Token Flow ===');
    
    // 1. Test Firebase ID Token
    console.log('1. Firebase ID Token:', firebaseIdToken);
    
    // 2. Test /auth/signin
    console.log('2. Testing /auth/signin...');
    const signInResponse = await api.post(`${API_BASE_URL}/auth/signin`, {
      id_token: firebaseIdToken
    });
    console.log('Sign in response:', signInResponse);
    
    // 3. Verify token storage
    const storedToken = localStorage.getItem('token');
    console.log('3. Stored token:', storedToken);
    
    // 4. Test /users/me with stored token
    console.log('4. Testing /users/me...');
    const userResponse = await api.get(`${API_BASE_URL}/users/me`);
    console.log('User response:', userResponse);
    
    return {
      success: true,
      signInResponse,
      userResponse
    };
  } catch (error) {
    console.error('Token flow test failed:', error);
    return {
      success: false,
      error
    };
  }
};

// // GET 요청
// const data = await api.get('/some-endpoint');

// // POST 요청
// const result = await api.post('/some-endpoint', { key: 'value' }); 