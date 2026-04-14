import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppState {
  hasSeenOnboarding: boolean;
  hasCompletedPermissions: boolean;
  setHasSeenOnboarding: (seen: boolean) => void;
  setHasCompletedPermissions: (done: boolean) => void;
  loadPersistedState: () => Promise<void>;
}

const KEY_ONBOARDING = 'hasSeenOnboarding';
const KEY_PERMISSIONS = 'hasCompletedPermissions';

let loadPromise: Promise<void> | null = null;

export const useAppStore = create<AppState>((set, get) => ({
  hasSeenOnboarding: false,
  hasCompletedPermissions: false,

  setHasSeenOnboarding: async (seen) => {
    if (get().hasSeenOnboarding === seen) return;
    set({ hasSeenOnboarding: seen });
    try {
      await AsyncStorage.setItem(KEY_ONBOARDING, JSON.stringify(seen));
    } catch {
      // ignore
    }
  },

  setHasCompletedPermissions: async (done) => {
    if (get().hasCompletedPermissions === done) return;
    set({ hasCompletedPermissions: done });
    try {
      await AsyncStorage.setItem(KEY_PERMISSIONS, JSON.stringify(done));
    } catch {
      // ignore
    }
  },

  /**
   * Load all persisted flags from AsyncStorage in parallel.
   * AWAIT this before hiding the splash screen so the first render of
   * AuthGate already has the correct redirect target.
   */
  loadPersistedState: async () => {
    if (loadPromise) return loadPromise;
    loadPromise = (async () => {
      try {
        const [onboardingRaw, permsRaw] = await Promise.all([
          AsyncStorage.getItem(KEY_ONBOARDING),
          AsyncStorage.getItem(KEY_PERMISSIONS),
        ]);
        const next: Partial<AppState> = {};
        if (onboardingRaw) {
          const parsed = JSON.parse(onboardingRaw);
          if (typeof parsed === 'boolean') next.hasSeenOnboarding = parsed;
        }
        if (permsRaw) {
          const parsed = JSON.parse(permsRaw);
          if (typeof parsed === 'boolean') next.hasCompletedPermissions = parsed;
        }
        if (Object.keys(next).length > 0) set(next);
      } catch {
        // ignore
      }
    })();
    return loadPromise;
  },
}));
