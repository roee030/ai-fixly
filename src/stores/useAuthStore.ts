import { create } from 'zustand';
import { AuthUser } from '../services/auth/types';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasCompletedProfile: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  setHasCompletedProfile: (completed: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  hasCompletedProfile: false,
  setUser: (user) => {
    // Skip if the user hasn't actually changed (by uid). This prevents
    // Zustand from firing re-renders when Firebase's onAuthStateChanged
    // calls back with a freshly-constructed object containing the same data.
    const current = get().user;
    if (current?.uid === user?.uid && current?.phoneNumber === user?.phoneNumber) {
      // Still ensure loading is false
      if (get().isLoading) set({ isLoading: false });
      return;
    }
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    });
  },
  setLoading: (isLoading) => {
    if (get().isLoading !== isLoading) set({ isLoading });
  },
  setHasCompletedProfile: (hasCompletedProfile) => {
    if (get().hasCompletedProfile !== hasCompletedProfile) set({ hasCompletedProfile });
  },
  reset: () =>
    set({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      hasCompletedProfile: false,
    }),
}));
