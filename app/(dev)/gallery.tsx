/**
 * Dev-only screen gallery. Shows every screen in the app as a card.
 * Tap a card → navigates to that screen.
 *
 * Access: Profile tab → "כלי פיתוח" → "גלריית מסכים"
 * Or directly: http://localhost:8081/(dev)/gallery
 *
 * Only renders in __DEV__ builds — production bundles skip this entirely.
 */

import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants';
import { devBypass } from '../../src/stores/devBypass';
import { useRequestsStore } from '../../src/stores/useRequestsStore';

interface ScreenCard {
  name: string;
  nameHe: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  group: string;
}

const SCREENS: ScreenCard[] = [
  // Onboarding & Auth
  { name: 'Onboarding', nameHe: 'הצגה ראשונית', route: '/onboarding', icon: 'images-outline', group: 'אוט׳ והרשמה' },
  { name: 'Phone Auth', nameHe: 'הזנת טלפון', route: '/(auth)/phone', icon: 'call-outline', group: 'אוט׳ והרשמה' },
  { name: 'Verify OTP', nameHe: 'אימות קוד', route: '/(auth)/verify', icon: 'keypad-outline', group: 'אוט׳ והרשמה' },
  { name: 'Profile Setup', nameHe: 'הגדרת פרופיל', route: '/(auth)/profile-setup', icon: 'person-add-outline', group: 'אוט׳ והרשמה' },
  { name: 'Permissions', nameHe: 'הרשאות', route: '/(auth)/permissions', icon: 'shield-checkmark-outline', group: 'אוט׳ והרשמה' },

  // Main Tabs
  { name: 'Home', nameHe: 'דף הבית', route: '/(tabs)', icon: 'home-outline', group: 'ראשי' },
  { name: 'My Requests', nameHe: 'הקריאות שלי', route: '/(tabs)/requests', icon: 'document-text-outline', group: 'ראשי' },
  { name: 'Profile', nameHe: 'פרופיל', route: '/(tabs)/profile', icon: 'person-outline', group: 'ראשי' },

  // Capture Flow
  { name: 'Capture', nameHe: 'צילום', route: '/capture', icon: 'camera-outline', group: 'תהליך דיווח' },
  { name: 'Confirm', nameHe: 'אישור בקשה', route: '/capture/confirm', icon: 'checkmark-circle-outline', group: 'תהליך דיווח' },
  { name: 'Sent', nameHe: 'נשלח בהצלחה', route: '/capture/sent', icon: 'paper-plane-outline', group: 'תהליך דיווח' },

  // Request Details & Chat
  { name: 'Request Details', nameHe: 'פרטי בקשה', route: '/request/demo-request', icon: 'list-outline', group: 'בקשות' },
  { name: 'Chat', nameHe: 'צ\'אט', route: '/chat/demo-request', icon: 'chatbubbles-outline', group: 'בקשות' },

  // SEO / Web
  { name: 'Service: Plumber', nameHe: 'דף שירות: אינסטלטור', route: '/services/plumber', icon: 'water-outline', group: 'דפי שירות (SEO)' },
  { name: 'Service: Electrician', nameHe: 'דף שירות: חשמלאי', route: '/services/electrician', icon: 'flash-outline', group: 'דפי שירות (SEO)' },
  { name: 'Service: Locksmith', nameHe: 'דף שירות: מנעולן', route: '/services/locksmith', icon: 'lock-closed-outline', group: 'דפי שירות (SEO)' },
];

export default function GalleryScreen() {
  const [lastVisited, setLastVisited] = useState<string | null>(null);
  const requests = useRequestsStore((s) => s.requests);
  const latestRequestId = requests.length > 0 ? requests[0].id : null;

  // Group screens by their group field
  const groups = SCREENS.reduce((acc, screen) => {
    if (!acc[screen.group]) acc[screen.group] = [];
    acc[screen.group].push(screen);
    return acc;
  }, {} as Record<string, ScreenCard[]>);

  const handleNavigate = (route: string) => {
    let actualRoute = route;

    // Replace demo placeholders with real data if available
    if (route.includes('demo-request') && latestRequestId) {
      actualRoute = route.replace('demo-request', latestRequestId);
    }

    devBypass.set(true);
    setLastVisited(route);
    try {
      router.push(actualRoute as any);
    } catch (err) {
      console.warn('Navigation failed:', actualRoute, err);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>🔧 גלריית מסכים</Text>
          <Text style={styles.subtitle}>{SCREENS.length} מסכים • לחץ לניווט</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {Object.entries(groups).map(([groupName, screens]) => (
          <View key={groupName} style={styles.group}>
            <Text style={styles.groupTitle}>{groupName}</Text>
            <View style={styles.cardGrid}>
              {screens.map((screen) => (
                <Pressable
                  key={screen.route}
                  style={[
                    styles.card,
                    lastVisited === screen.route && styles.cardVisited,
                  ]}
                  onPress={() => handleNavigate(screen.route)}
                >
                  <View style={styles.cardIconRow}>
                    <View style={styles.cardIcon}>
                      <Ionicons name={screen.icon} size={22} color={COLORS.primary} />
                    </View>
                    {lastVisited === screen.route && (
                      <View style={styles.visitedBadge}>
                        <Ionicons name="checkmark" size={12} color="#FFF" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.cardName}>{screen.nameHe}</Text>
                  <Text style={styles.cardRoute}>{screen.route}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {/* Web-only hint */}
        {Platform.OS === 'web' && (
          <View style={styles.webHint}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.textTertiary} />
            <Text style={styles.webHintText}>
              ניתן גם לנווט ישירות דרך ה-URL בדפדפן
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  group: {
    marginBottom: 24,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  cardVisited: {
    borderColor: COLORS.success + '60',
    backgroundColor: COLORS.success + '08',
  },
  cardIconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  cardRoute: {
    fontSize: 10,
    color: COLORS.textTertiary,
    fontFamily: 'monospace',
  },
  webHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    justifyContent: 'center',
  },
  webHintText: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
});
