import { View, Text, Pressable, StyleSheet } from 'react-native';
import { usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants';

interface Props {
  onDismiss: () => void;
}

export function AppBanner({ onDismiss }: Props) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const deepLink = `aifixly://${pathname.replace(/^\//, '')}`;

  const handleOpen = () => {
    if (typeof window !== 'undefined') window.location.href = deepLink;
  };

  return (
    <View style={styles.banner}>
      <Ionicons name="construct" size={20} color={COLORS.primary} />
      <Text style={styles.bannerText} numberOfLines={1}>
        {t('appPromo.bannerText')}
      </Text>
      <Pressable style={styles.openBtn} onPress={handleOpen}>
        <Text style={styles.openBtnText}>{t('appPromo.bannerOpen')}</Text>
      </Pressable>
      <Pressable onPress={onDismiss} hitSlop={10}>
        <Ionicons name="close" size={18} color={COLORS.textTertiary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row' as any,
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  bannerText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },
  openBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  openBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600' as any,
  },
});
