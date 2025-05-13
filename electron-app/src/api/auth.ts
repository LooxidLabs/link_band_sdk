import { api } from './interceptor';
import type { UserResponse } from '../types/user';

const API_BASE_URL = '/api/v1';

export const authApi = {
  // Firebase 토큰으로 서버 인증
  signInWithFirebaseToken: async (email: string, idToken: string): Promise<{ token: string }> => {
    const response = await api.post(`${API_BASE_URL}/auth/signin`, { 
      id_token: idToken,
      email: email,
      password: ''
    });
    return response;
  },

  // 이메일/비밀번호로 서버 인증
  signInWithEmail: async (email: string, password: string): Promise<{ token: string }> => {
    const response = await api.post(`${API_BASE_URL}/auth/signin`, { 
      id_token: '',
      email,
      password
    });
    return response;
  },

  // 구글 로그인으로 서버 인증
  signInWithGoogle: async (idToken: string): Promise<{ token: string }> => {
    const response = await api.post(`${API_BASE_URL}/auth/signin`, { 
      id_token: idToken,
      email: '',
      password: ''
    });
    return response;
  },

  // 회원가입
  signUp: async (email: string, password: string): Promise<UserResponse> => {
    const response = await api.post(`${API_BASE_URL}/auth/signup`, { 
      email,
      password
    });
    return response;
  },

  // 로그아웃
  signOut: async (): Promise<void> => {
    localStorage.removeItem('token');
  },
}; 