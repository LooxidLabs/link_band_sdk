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
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => { // Type the user from Firebase
      set({ user: firebaseUser ? { uid: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName } : null, loading: false, error: null });
    });
    return unsubscribe; // Return the unsubscribe function for cleanup
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