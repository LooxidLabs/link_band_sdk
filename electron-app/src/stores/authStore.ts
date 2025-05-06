import { create } from 'zustand';
import {
  User as FirebaseUser, // Rename imported User to avoid conflict
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';
import { linkCloudAPI } from '../api/linkCloud';
import { useDeviceManager } from './device_manager';

// Define the shape of the user object stored in the state
interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
}

// Define the persistence type
type PersistenceType = 'local' | 'session';

// Define the state structure
export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  subscribeToAuthState: () => () => void; // Function that returns an unsubscribe function
  signInWithGoogle: (persistence: PersistenceType) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string, persistence: PersistenceType) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true, // Track initial auth state loading
  error: null,

  // Method to subscribe to auth state changes
  subscribeToAuthState: () => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        set({ 
          user: { 
            uid: firebaseUser.uid, 
            email: firebaseUser.email, 
            displayName: firebaseUser.displayName 
          }, 
          loading: false, 
          error: null 
        });
        
        // Link Cloud API 토큰 설정
        const token = await firebaseUser.getIdToken();
        linkCloudAPI.setToken(token);

        // 디바이스 정보 동기화 (약간의 지연을 두어 토큰이 설정된 후 실행)
        setTimeout(async () => {
          const deviceManager = useDeviceManager.getState();
          await deviceManager.syncWithServer();
        }, 500);
      } else {
        set({ user: null, loading: false, error: null });
        linkCloudAPI.setToken(null);
      }
    });
    return unsubscribe;
  },

  // Google Sign-In
  signInWithGoogle: async (persistence) => {
    set({ loading: true, error: null });
    try {
      const persistenceToSet = persistence === 'local' ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistenceToSet);
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      set({ error: error.message, loading: false });
    }
  },

  // Email/Password Sign-Up
  signUpWithEmail: async (email, password) => {
    set({ loading: true, error: null });
    try {
      await setPersistence(auth, browserLocalPersistence);
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("Email Sign-Up Error:", error);
      set({ error: error.message, loading: false });
    }
  },

  // Email/Password Sign-In
  signInWithEmail: async (email, password, persistence) => {
    set({ loading: true, error: null });
    try {
      const persistenceToSet = persistence === 'local' ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistenceToSet);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("Email Sign-In Error:", error);
      set({ error: error.message, loading: false });
    }
  },

  // Sign Out
  signOutUser: async () => {
    set({ loading: true, error: null });
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error("Sign Out Error:", error);
      set({ error: error.message, loading: false });
    }
  },
}));

export default useAuthStore; 