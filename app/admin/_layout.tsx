import { View, Text, Pressable, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Slot, router, usePathname } from 'expo-router';
import Head from 'expo-router/head';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { COLORS } from '../../src/constants';

/**
 * Admin UIDs — only these users can access the admin dashboard.
 * Everyone else sees "access denied" (no redirect, no jumping).
 *
 * Add your Firebase Auth UID here after signing in.
 * Find it in Firebase Console → Authentication → Users → copy UID.
 */
const ADMIN_UIDS = new Set([
  '6sLBVwm1vyWSDjkrK0DffMIJ2i03',
]);

// In dev mode, allow any authenticated user (so you can test without
// knowing your UID). In production, only ADMIN_UIDS are allowed.
const ALLOW_DEV_ACCESS = __DEV__;

const TABS = [
  { name: 'index', label: 'סקירה', icon: 'pulse-outline' as const },
  { name: 'requests', label: 'בקשות', icon: 'list-outline' as const },
  { name: 'funnel', label: 'משפך', icon: 'analytics-outline' as const },
  { name: 'providers', label: 'ספקים', icon: 'people-outline' as const },
  { name: 'geo', label: 'גיאוגרפיה', icon: 'map-outline' as const },
  { name: 'revenue', label: 'הכנסות', icon: 'cash-outline' as const },
];

export default function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  // Still loading auth — show nothing (no flash)
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>טוען...</Text>
        </View>
      </View>
    );
  }

  // Not logged in — show "please log in" (NOT a redirect)
  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="lock-closed" size={48} color={COLORS.textTertiary} />
          <Text style={styles.deniedTitle}>נדרשת התחברות</Text>
          <Text style={styles.deniedSubtitle}>התחבר לאפליקציה כדי לגשת ללוח הבקרה</Text>
          <Pressable style={styles.loginBtn} onPress={() => router.replace('/(auth)/phone')}>
            <Text style={styles.loginBtnText}>התחבר</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Logged in but not admin — show "access denied" (NOT a redirect)
  const isAdmin = ALLOW_DEV_ACCESS || ADMIN_UIDS.has(user.uid);
  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="shield-outline" size={48} color={COLORS.error} />
          <Text style={styles.deniedTitle}>אין גישה</Text>
          <Text style={styles.deniedSubtitle}>
            לוח הבקרה זמין למנהלי המערכת בלבד
          </Text>
          <Pressable style={styles.backBtn} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.backBtnText}>חזרה לאפליקציה</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Admin verified — show the dashboard
  return (
    <View style={styles.container}>
      {Platform.OS === 'web' && (
        <Head>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
      )}
      <AdminTopNav />
      <Slot />
    </View>
  );
}

function AdminTopNav() {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  return (
    <View style={[styles.nav, isDesktop && styles.navDesktop]}>
      <View style={styles.navHeader}>
        <Pressable onPress={() => {
          if (router.canGoBack()) { router.back(); } else { router.replace('/(tabs)'); }
        }} style={styles.navBackBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </Pressable>
        <Text style={styles.navTitle}>📊 לוח בקרה</Text>
      </View>
      <View style={styles.tabRow}>
        {TABS.map((tab) => {
          const isActive = tab.name === 'index'
            ? pathname === '/admin' || pathname === '/admin/' || pathname === '/admin/index'
            : pathname.includes(tab.name);
          return (
            <Pressable
              key={tab.name}
              onPress={() => router.replace(tab.name === 'index' ? '/admin' as never : `/admin/${tab.name}` as never)}
              style={[styles.tab, isActive && styles.tabActive]}
            >
              <Ionicons
                name={tab.icon}
                size={16}
                color={isActive ? COLORS.primary : COLORS.textTertiary}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  loadingText: { color: COLORS.textTertiary, fontSize: 16 },
  deniedTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 8,
  },
  deniedSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  loginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 8,
  },
  loginBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  backBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backBtnText: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  nav: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 8 },
  navDesktop: { maxWidth: 900, alignSelf: 'center', width: '100%' },
  navHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  navBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
  tabRow: { flexDirection: 'row', gap: 6 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
  },
  tabActive: { backgroundColor: COLORS.primary + '20' },
  tabLabel: { fontSize: 12, color: COLORS.textTertiary, fontWeight: '500' },
  tabLabelActive: { color: COLORS.primary, fontWeight: '700' },
});
