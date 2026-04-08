import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppState {
  hasSeenOnboarding: boolean;
  setHasSeenOnboarding: (seen: boolean) => void;
  loadOnboardingState: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  hasSeenOnboarding: false,
  setHasSeenOnboarding: async (seen) => {
    set({ hasSeenOnboarding: seen });
    await AsyncStorage.setItem('hasSeenOnboarding', JSON.stringify(seen));
  },
  loadOnboardingState: async () => {
    const value = await AsyncStorage.getItem('hasSeenOnboarding');
    if (value) set({ hasSeenOnboarding: JSON.parse(value) });
  },
}));
