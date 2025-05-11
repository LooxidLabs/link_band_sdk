import { create } from 'zustand';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { app } from '../firebase/config';
import { authApi } from '../api/auth';
import { userApi } from '../api/user';

// AuthState 인터페이스에 window.electronIPC 타입 정의 추가 (선택적이지만 권장)
declare global {
  interface Window {
    electron: {
      store: {
        getSavedCredentials: () => Promise<any>;
        setSavedCredentials: (credentials: any) => Promise<boolean>;
        clearSavedCredentials: () => Promise<boolean>;
      };
      ipcRenderer: {
        send: (channel: string, ...args: any[]) => void;
        on: (channel: string, func: (...args: any[]) => void) => void;
        once: (channel: string, func: (...args: any[]) => void) => void;
        removeListener: (channel: string, func: (...args: any[]) => void) => void;
      };
    };
    electronIPC: {
      send: (channel: string, ...args: any[]) => void;
      on: (channel: string, func: (...args: any[]) => void) => void;
      once: (channel: string, func: (...args: any[]) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}

// const API_BASE_URL = 'http://localhost:8000/api/v1'; // 서버 URL을 환경 변수로 관리하는 것이 좋습니다

interface AuthState {
  user: any | null;
  loading: boolean;
  error: string | null;
  savedCredentials: { email: string; password: string; rememberMe: boolean } | null;
  signInWithEmail: (email: string, password: string, persistence: 'session' | 'local') => Promise<void>;
  signInWithGoogle: (persistence: 'session' | 'local') => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signOutUser: () => Promise<void>;
  subscribeToAuthState: () => () => void;
  setSavedCredentials: (credentials: { email: string; password: string; rememberMe: boolean } | null) => Promise<void>;
  clearSavedCredentials: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,
  savedCredentials: null,

  signInWithEmail: async (email: string, password: string, persistence: 'session' | 'local') => {
    try {
      const auth = getAuth(app);
      await setPersistence(auth, persistence === 'local' ? browserLocalPersistence : browserSessionPersistence);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Firebase 토큰으로 서버 인증
      const idToken = await userCredential.user.getIdToken();
      console.log('idToken', idToken);
      console.log('email', email);
      const { token } = await authApi.signInWithFirebaseToken(email, idToken);
      localStorage.setItem('token', token);
      
      const user = await userApi.getCurrentUser();
      if (user?.id) {
        localStorage.setItem('user_id', user.id);
      }
      
      set({ user: userCredential.user, error: null });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  signInWithGoogle: async (persistence: 'session' | 'local') => {
    try {
      const auth = getAuth(app);
      await setPersistence(auth, persistence === 'local' ? browserLocalPersistence : browserSessionPersistence);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Firebase 토큰으로 서버 인증
      const idToken = await result.user.getIdToken();
      const { token } = await authApi.signInWithGoogle(idToken);
      localStorage.setItem('token', token);
      
      const user = await userApi.getCurrentUser();
      if (user?.id) {
        localStorage.setItem('user_id', user.id);
      }
      
      set({ user: result.user, error: null });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  signUpWithEmail: async (email: string, password: string) => {
    try {
      const auth = getAuth(app);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Firebase 토큰으로 서버 인증
      const idToken = await userCredential.user.getIdToken();
      const { token } = await authApi.signInWithFirebaseToken(email, idToken);
      localStorage.setItem('token', token);
      
      const user = await userApi.getCurrentUser();
      if (user?.id) {
        localStorage.setItem('user_id', user.id);
      }
      
      set({ user: userCredential.user, error: null });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  signOut: async () => {
    try {
      const auth = getAuth(app);
      await firebaseSignOut(auth);
      await authApi.signOut();
      localStorage.removeItem('user_id');
      set({ user: null, error: null });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  signOutUser: async () => {
    try {
      const auth = getAuth(app);
      await firebaseSignOut(auth);
      await authApi.signOut();
      localStorage.removeItem('user_id');
      set({ user: null, error: null });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  subscribeToAuthState: () => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      useAuthStore.setState({ user, loading: false });
    });
    return unsubscribe;
  },

  setSavedCredentials: async (credentials: { email: string; password: string; rememberMe: boolean } | null) => {
    try {
      if (credentials) {
        await window.electron.store.setSavedCredentials(credentials);
      } else {
        await window.electron.store.clearSavedCredentials();
      }
      set({ savedCredentials: credentials });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  clearSavedCredentials: async () => {
    try {
      await window.electron.store.clearSavedCredentials();
      set({ savedCredentials: null });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },
}));

// Subscribe to auth state changes
const auth = getAuth(app);
onAuthStateChanged(auth, (user) => {
  useAuthStore.setState({ user, loading: false });
});
