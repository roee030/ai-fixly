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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  hasCompletedProfile: false,
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),
  setLoading: (isLoading) => set({ isLoading }),
  setHasCompletedProfile: (hasCompletedProfile) => set({ hasCompletedProfile }),
  reset: () =>
    set({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      hasCompletedProfile: false,
    }),
}));
