import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import he from './locales/he';
import en from './locales/en';
import ar from './locales/ar';
import ru from './locales/ru';

const SUPPORTED_LANGUAGES = ['he', 'en', 'ar', 'ru'] as const;
const RTL_LANGUAGES = ['he', 'ar'];
const DEFAULT_LANGUAGE = 'he';
const STORAGE_KEY = 'aifixly_language';

/**
 * Synchronously read the saved language preference on WEB.
 * Native has no sync storage API, so we bootstrap with DEFAULT and
 * apply the saved language async via `applyPersistedLanguage` below.
 */
function getSavedLanguageSync(): string | null {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Async read of the saved language on NATIVE (AsyncStorage).
 * Called on app boot AFTER initial render.
 */
async function getSavedLanguageAsync(): Promise<string | null> {
  try {
    if (Platform.OS !== 'web') {
      return await AsyncStorage.getItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Save language preference. Writes to the right storage per platform.
 */
export function saveLanguagePreference(lang: string): void {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang);
      return;
    }
    // Native: fire-and-forget (AsyncStorage is async, no need to await here)
    AsyncStorage.setItem(STORAGE_KEY, lang).catch(() => {});
  } catch {
    // ignore
  }
}

/**
 * Apply persisted language on native after app boot. On web this is a no-op
 * because the sync path already handled it during init.
 * Call this once at app startup (e.g., from the root layout).
 */
export async function applyPersistedLanguage(): Promise<void> {
  if (Platform.OS === 'web') return;
  const saved = await getSavedLanguageAsync();
  if (!saved) return;
  if (!(SUPPORTED_LANGUAGES as readonly string[]).includes(saved)) return;
  if (saved === i18n.language) return;
  const needsRTL = RTL_LANGUAGES.includes(saved);
  if (I18nManager.isRTL !== needsRTL) {
    I18nManager.forceRTL(needsRTL);
    // Note: RTL change requires app restart on native to fully take effect.
    // The language itself still switches immediately via i18n.changeLanguage.
  }
  await i18n.changeLanguage(saved);
}

// Hebrew is ALWAYS the default. Only switch if the user EXPLICITLY chose
// another language. Device language detection is NOT used — target is Israel.
const savedLang = getSavedLanguageSync();
const initialLang = savedLang && (SUPPORTED_LANGUAGES as readonly string[]).includes(savedLang)
  ? savedLang
  : DEFAULT_LANGUAGE;

// Set RTL/LTR based on initial language.
const isRTL = RTL_LANGUAGES.includes(initialLang);
if (Platform.OS !== 'web') {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(isRTL);
}

i18n.use(initReactI18next).init({
  resources: {
    he: { translation: he },
    en: { translation: en },
    ar: { translation: ar },
    ru: { translation: ru },
  },
  lng: initialLang,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

// When language changes (via the profile selector), save the preference.
i18n.on('languageChanged', (lang) => {
  saveLanguagePreference(lang);
});

export default i18n;

/** Check if current language is RTL. */
export function isCurrentLanguageRTL(): boolean {
  return RTL_LANGUAGES.includes(i18n.language);
}

/** Get text direction for the current language. */
export function getTextDirection(): 'rtl' | 'ltr' {
  return isCurrentLanguageRTL() ? 'rtl' : 'ltr';
}
