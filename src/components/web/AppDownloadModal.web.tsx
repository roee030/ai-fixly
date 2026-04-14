import { View, Text, Pressable, StyleSheet, Modal as RNModal } from 'react-native';
import { usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants';

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

const STORE_URL_ANDROID = 'https://play.google.com/store/apps/details?id=com.aifixly.app';
const STORE_URL_IOS = 'https://apps.apple.com/app/ai-fixly/id000000000';

export function AppDownloadModal({ visible, onDismiss }: Props) {
  const pathname = usePathname();
  const deepLink = `aifixly://${pathname.replace(/^\//, '')}`;

  const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);
  const storeUrl = isIOS ? STORE_URL_IOS : STORE_URL_ANDROID;

  const handleOpenInApp = () => {
    if (typeof window === 'undefined') return;
    window.location.href = deepLink;
    setTimeout(() => { window.location.href = storeUrl; }, 2000);
  };

  const handleDownload = () => {
    if (typeof window !== 'undefined') window.open(storeUrl, '_blank');
  };

  const VALUE_PROPS = [
    { icon: 'camera-outline' as const, text: 'צלם בעיה ← קבל הצעות' },
    { icon: 'notifications-outline' as const, text: 'התראות בזמן אמת' },
    { icon: 'chatbubbles-outline' as const, text: "צ'אט ישיר עם בעל מקצוע" },
  ];

  return (
    <RNModal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.logoCircle}>
            <Ionicons name="construct" size={40} color={COLORS.primary} />
          </View>

          <Text style={styles.title}>ai-fixly</Text>
          <Text style={styles.subtitle}>האפליקציה שלנו עובדת הרבה יותר טוב</Text>

          <View style={styles.props}>
            {VALUE_PROPS.map((prop, i) => (
              <View key={i} style={styles.propRow}>
                <Ionicons name={prop.icon} size={20} color={COLORS.primary} />
                <Text style={styles.propText}>{prop.text}</Text>
              </View>
            ))}
          </View>

          <Pressable style={styles.primaryBtn} onPress={handleOpenInApp}>
            <Ionicons name="phone-portrait-outline" size={20} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>פתח באפליקציה</Text>
          </Pressable>

          <Pressable style={styles.secondaryBtn} onPress={handleDownload}>
            <Ionicons name="download-outline" size={18} color={COLORS.primary} />
            <Text style={styles.secondaryBtnText}>הורד את האפליקציה</Text>
          </Pressable>

          <Pressable style={styles.dismissBtn} onPress={onDismiss}>
            <Text style={styles.dismissText}>{'המשך לאתר ←'}</Text>
          </Pressable>
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 24,
    padding: 32,
    maxWidth: 400,
    width: '90%' as any,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold' as any,
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center' as any,
    marginBottom: 24,
  },
  props: {
    gap: 12,
    marginBottom: 28,
    width: '100%' as any,
  },
  propRow: {
    flexDirection: 'row' as any,
    alignItems: 'center',
    gap: 12,
  },
  propText: {
    color: COLORS.text,
    fontSize: 15,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row' as any,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%' as any,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 10,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as any,
  },
  secondaryBtn: {
    flexDirection: 'row' as any,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%' as any,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginBottom: 10,
  },
  secondaryBtnText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600' as any,
  },
  dismissBtn: {
    paddingVertical: 10,
  },
  dismissText: {
    color: COLORS.textTertiary,
    fontSize: 14,
  },
});
