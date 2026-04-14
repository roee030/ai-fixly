import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import i18n from '../../i18n';
import { COLORS } from '../../constants';

const LANGUAGES = [
  { code: 'he', label: 'עברית', flag: '🇮🇱' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
];

const A11Y_KEYS = {
  fontSize: 'aifixly_a11y_fontSize',
  contrast: 'aifixly_a11y_contrast',
  links: 'aifixly_a11y_links',
} as const;

type FontSize = 'small' | 'default' | 'large';

function useAccessibilityState() {
  const [fontSize, setFontSize] = useState<FontSize>('default');
  const [highContrast, setHighContrast] = useState(false);
  const [highlightLinks, setHighlightLinks] = useState(false);
  const [readingGuide, setReadingGuide] = useState(false);

  // Restore saved preferences on mount
  useEffect(() => {
    if (typeof localStorage === 'undefined' || typeof document === 'undefined') return;
    const savedSize = localStorage.getItem(A11Y_KEYS.fontSize) as FontSize | null;
    const savedContrast = localStorage.getItem(A11Y_KEYS.contrast) === 'true';
    const savedLinks = localStorage.getItem(A11Y_KEYS.links) === 'true';

    if (savedSize && savedSize !== 'default') {
      setFontSize(savedSize);
      applyFontSize(savedSize);
    }
    if (savedContrast) {
      setHighContrast(true);
      document.documentElement.classList.add('a11y-high-contrast');
    }
    if (savedLinks) {
      setHighlightLinks(true);
      document.documentElement.classList.add('a11y-highlight-links');
    }
  }, []);

  return { fontSize, setFontSize, highContrast, setHighContrast, highlightLinks, setHighlightLinks, readingGuide, setReadingGuide };
}

/**
 * Font size uses CSS zoom on #root because React Native Web sets inline
 * pixel values on every Text element — CSS font-size can't override inline
 * styles. Zoom scales EVERYTHING including inline-styled text.
 */
function applyFontSize(size: FontSize) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('a11y-font-small', 'a11y-font-large');
  if (size === 'small') root.classList.add('a11y-font-small');
  if (size === 'large') root.classList.add('a11y-font-large');
}

function AccessibilityPanel({ onNavigate }: { onNavigate: () => void }) {
  const { fontSize, setFontSize, highContrast, setHighContrast, highlightLinks, setHighlightLinks, readingGuide, setReadingGuide } = useAccessibilityState();

  const handleFontSize = (size: FontSize) => {
    applyFontSize(size);
    setFontSize(size);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(A11Y_KEYS.fontSize, size);
    }
  };

  const handleContrast = () => {
    const next = !highContrast;
    setHighContrast(next);
    if (typeof document !== 'undefined') {
      if (next) {
        document.documentElement.classList.add('a11y-high-contrast');
      } else {
        document.documentElement.classList.remove('a11y-high-contrast');
      }
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(A11Y_KEYS.contrast, String(next));
    }
  };

  const handleHighlightLinks = () => {
    const next = !highlightLinks;
    setHighlightLinks(next);
    if (typeof document !== 'undefined') {
      if (next) {
        document.documentElement.classList.add('a11y-highlight-links');
      } else {
        document.documentElement.classList.remove('a11y-highlight-links');
      }
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(A11Y_KEYS.links, String(next));
    }
  };

  const handleReadingGuide = useCallback(() => {
    const next = !readingGuide;
    setReadingGuide(next);
    if (typeof document === 'undefined') return;

    const existing = document.getElementById('a11y-reading-guide');
    if (next) {
      if (!existing) {
        const el = document.createElement('div');
        el.id = 'a11y-reading-guide';
        el.className = 'a11y-reading-guide';
        el.style.top = '50%';
        document.body.appendChild(el);
      }
      const handler = (e: MouseEvent) => {
        const guide = document.getElementById('a11y-reading-guide');
        if (guide) guide.style.top = `${e.clientY - 25}px`;
      };
      document.addEventListener('mousemove', handler);
      (window as any).__a11yGuideHandler = handler;
    } else {
      if (existing) existing.remove();
      const handler = (window as any).__a11yGuideHandler;
      if (handler) {
        document.removeEventListener('mousemove', handler);
        delete (window as any).__a11yGuideHandler;
      }
    }
  }, [readingGuide, setReadingGuide]);

  return (
    <View style={panelStyles.container}>
      <Text style={panelStyles.title}>♿ נגישות</Text>

      {/* Font size */}
      <Text style={panelStyles.label}>גודל טקסט</Text>
      <View style={panelStyles.fontRow}>
        {(['small', 'default', 'large'] as FontSize[]).map((size) => {
          const label = size === 'small' ? 'A⁻' : size === 'large' ? 'A⁺' : 'A';
          const isActive = fontSize === size;
          return (
            <Pressable
              key={size}
              style={[panelStyles.fontBtn, isActive && panelStyles.fontBtnActive]}
              onPress={() => handleFontSize(size)}
              accessibilityLabel={`Font size ${size}`}
              accessibilityRole="button"
            >
              <Text style={[panelStyles.fontBtnText, isActive && panelStyles.fontBtnTextActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Toggles */}
      <ToggleRow label="ניגודיות גבוהה" active={highContrast} onToggle={handleContrast} />
      <ToggleRow label="הדגשת קישורים" active={highlightLinks} onToggle={handleHighlightLinks} />
      <ToggleRow label="סרגל קריאה" active={readingGuide} onToggle={handleReadingGuide} />

      {/* Link to accessibility statement */}
      <Pressable onPress={onNavigate} style={panelStyles.linkRow} accessibilityRole="link">
        <Text style={panelStyles.linkText}>הצהרת נגישות</Text>
        <Text style={panelStyles.linkArrow}>←</Text>
      </Pressable>
    </View>
  );
}

function ToggleRow({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <Pressable
      style={panelStyles.toggleRow}
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: active }}
    >
      <Text style={panelStyles.toggleLabel}>{label}</Text>
      <View style={[panelStyles.toggle, active && panelStyles.toggleActive]}>
        <View style={[panelStyles.toggleKnob, active && panelStyles.toggleKnobActive]} />
      </View>
    </Pressable>
  );
}

export function WebSettingsBar() {
  if (Platform.OS !== 'web') return null;

  const [isExpanded, setIsExpanded] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showA11yPanel, setShowA11yPanel] = useState(false);
  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  const handleToggleTheme = () => {
    setIsDark(prev => !prev);
  };

  const handleChangeLang = (code: string) => {
    i18n.changeLanguage(code);
    setShowLangDropdown(false);
    if (typeof document !== 'undefined') {
      const isRTL = ['he', 'ar'].includes(code);
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
      document.documentElement.lang = code;
    }
  };

  const handleAccessibility = () => {
    setShowA11yPanel(prev => !prev);
    setShowLangDropdown(false);
  };

  const handleA11yNavigate = () => {
    setShowA11yPanel(false);
    router.push('/legal/accessibility' as any);
  };

  const handleCollapse = () => {
    setIsExpanded(false);
    setShowLangDropdown(false);
    setShowA11yPanel(false);
  };

  // Collapsed: just a small FAB circle
  if (!isExpanded) {
    return (
      <View style={styles.container}>
        <Pressable
          onPress={() => setIsExpanded(true)}
          style={styles.fab}
          accessibilityLabel="Open settings"
          accessibilityRole="button"
        >
          <Text style={styles.fabIcon}>♿</Text>
        </Pressable>
      </View>
    );
  }

  // Expanded: full settings bar + panels
  return (
    <View style={styles.container}>
      {showA11yPanel && (
        <AccessibilityPanel onNavigate={handleA11yNavigate} />
      )}

      {showLangDropdown && !showA11yPanel && (
        <View style={styles.dropdown}>
          {LANGUAGES.map((lang) => (
            <Pressable
              key={lang.code}
              style={[
                styles.dropdownItem,
                i18n.language === lang.code && styles.dropdownItemActive,
              ]}
              onPress={() => handleChangeLang(lang.code)}
            >
              <Text style={styles.dropdownFlag}>{lang.flag}</Text>
              <Text style={[
                styles.dropdownLabel,
                i18n.language === lang.code && styles.dropdownLabelActive,
              ]}>
                {lang.label}
              </Text>
              {i18n.language === lang.code && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.bar}>
        <Pressable
          onPress={handleCollapse}
          style={styles.iconButton}
          accessibilityLabel="Close settings bar"
          accessibilityRole="button"
        >
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          onPress={handleToggleTheme}
          style={styles.iconButton}
          accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          accessibilityRole="button"
        >
          <Text style={styles.icon}>{isDark ? '🌙' : '☀️'}</Text>
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          onPress={() => { setShowLangDropdown(prev => !prev); setShowA11yPanel(false); }}
          style={styles.langButton}
          accessibilityLabel="Change language"
          accessibilityRole="button"
        >
          <Text style={styles.icon}>🌐</Text>
          <Text style={styles.langText}>{currentLang.label}</Text>
          <Text style={styles.chevron}>{showLangDropdown ? '▲' : '▼'}</Text>
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          onPress={handleAccessibility}
          style={[styles.iconButton, showA11yPanel && { backgroundColor: 'rgba(99, 102, 241, 0.2)' }]}
          accessibilityLabel="Accessibility settings"
          accessibilityRole="button"
        >
          <Text style={styles.icon}>♿</Text>
        </Pressable>
      </View>
    </View>
  );
}

const panelStyles = StyleSheet.create({
  container: {
    marginBottom: 8,
    backgroundColor: 'rgba(30, 30, 50, 0.98)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    minWidth: 240,
    // @ts-ignore - web-only
    backdropFilter: 'blur(10px)',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
    writingDirection: 'rtl',
  },
  label: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    writingDirection: 'rtl',
  },
  fontRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  fontBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    // @ts-ignore
    cursor: 'pointer',
  },
  fontBtnActive: {
    backgroundColor: COLORS.primary,
  },
  fontBtnText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  fontBtnTextActive: {
    color: '#FFFFFF',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    // @ts-ignore
    cursor: 'pointer',
  },
  toggleLabel: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    writingDirection: 'rtl',
  },
  toggle: {
    width: 36,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: COLORS.primary,
  },
  toggleKnob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    // @ts-ignore
    cursor: 'pointer',
  },
  linkText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
    writingDirection: 'rtl',
  },
  linkArrow: {
    color: COLORS.primary,
    fontSize: 14,
  },
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute' as any,
    bottom: 20,
    right: 20,
    zIndex: 9999,
    alignItems: 'flex-end',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 50, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    // @ts-ignore - web-only property
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(30, 30, 50, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    // @ts-ignore
    cursor: 'pointer',
  },
  fabIcon: {
    fontSize: 20,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-ignore
    cursor: 'pointer',
  },
  icon: {
    fontSize: 18,
  },
  closeIcon: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: 'bold' as any,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 2,
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    // @ts-ignore
    cursor: 'pointer',
  },
  langText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '500',
  },
  chevron: {
    color: COLORS.textTertiary,
    fontSize: 10,
  },
  dropdown: {
    marginBottom: 8,
    backgroundColor: 'rgba(30, 30, 50, 0.98)',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    minWidth: 160,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    // @ts-ignore
    cursor: 'pointer',
  },
  dropdownItemActive: {
    backgroundColor: `rgba(99, 102, 241, 0.15)`,
  },
  dropdownFlag: {
    fontSize: 18,
  },
  dropdownLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    flex: 1,
  },
  dropdownLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  checkmark: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
