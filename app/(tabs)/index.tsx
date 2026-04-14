import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '../../src/components/layout';
import { FadeInView, AnimatedPressable } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useRequestsStore } from '../../src/stores/useRequestsStore';
import { REQUEST_STATUS } from '../../src/constants/status';
import { COLORS } from '../../src/constants';
import { getFirestore, doc, getDoc } from '../../src/services/firestore/imports';

export default function HomeScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const requests = useRequestsStore((s) => s.requests);
  const [displayName, setDisplayName] = useState('');

  const activeRequests = requests.filter(
    (r) => r.status === REQUEST_STATUS.OPEN || r.status === REQUEST_STATUS.IN_PROGRESS,
  );
  const latestRequest = requests.length > 0 ? requests[0] : null;

  useEffect(() => {
    if (!user) return;
    getDoc(doc(getFirestore(), 'users', user.uid))
      .then((snap: any) => {
        const exists = typeof snap.exists === 'function' ? snap.exists() : snap.exists;
        if (exists) setDisplayName(snap.data()?.displayName || '');
      })
      .catch(() => {});
  }, [user]);

  const greeting = displayName ? t('home.greeting', { name: displayName }) : t('home.greetingNoName');

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Greeting */}
        <FadeInView>
          <Text style={styles.greeting}>{greeting}</Text>
          {activeRequests.length > 0 && (
            <Text style={styles.statsText}>
              {t('home.activeRequests', { count: activeRequests.length })}
            </Text>
          )}
        </FadeInView>

        {/* Hero CTA Card */}
        <FadeInView delay={100}>
          <Pressable onPress={() => router.push('/capture')} style={styles.heroCard}>
            <View style={styles.heroCardContent}>
              <View style={styles.heroIconWrap}>
                <Ionicons name="camera" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.heroCardTitle}>{t('home.heroTitle')}</Text>
              <Text style={styles.heroCardSubtitle}>
                {t('home.heroSubtitle')}
              </Text>
              <View style={styles.heroCtaBtn}>
                <Text style={styles.heroCtaBtnText}>{t('home.heroCta')}</Text>
                <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
              </View>
            </View>
          </Pressable>
        </FadeInView>

        {/* Latest request preview */}
        {latestRequest && (
          <FadeInView delay={200}>
            <Pressable
              onPress={() => router.push({ pathname: '/request/[id]', params: { id: latestRequest.id } })}
              style={styles.latestCard}
            >
              <View style={styles.latestHeader}>
                <Ionicons name="document-text-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.latestLabel}>{t('home.latestRequest')}</Text>
              </View>
              <Text style={styles.latestTitle} numberOfLines={1}>
                {(latestRequest.aiAnalysis as any)?.shortSummary || latestRequest.textDescription || t('home.requestFallback')}
              </Text>
              <View style={styles.latestStatus}>
                <View style={[styles.statusDot, {
                  backgroundColor: latestRequest.status === 'open' ? COLORS.success
                    : latestRequest.status === 'in_progress' ? COLORS.warning
                    : COLORS.textTertiary,
                }]} />
                <Text style={styles.latestStatusText}>
                  {t(`status.${latestRequest.status}`, { defaultValue: latestRequest.status })}
                </Text>
              </View>
            </Pressable>
          </FadeInView>
        )}

        {/* Quick info cards */}
        <FadeInView delay={300}>
          <View style={styles.infoRow}>
            <View style={styles.infoCard}>
              <Ionicons name="flash-outline" size={24} color={COLORS.warning} />
              <Text style={styles.infoTitle}>{t('home.fast')}</Text>
              <Text style={styles.infoDesc}>{t('home.fastDesc')}</Text>
            </View>
            <View style={styles.infoCard}>
              <Ionicons name="shield-checkmark-outline" size={24} color={COLORS.success} />
              <Text style={styles.infoTitle}>{t('home.reliable')}</Text>
              <Text style={styles.infoDesc}>{t('home.reliableDesc')}</Text>
            </View>
            <View style={styles.infoCard}>
              <Ionicons name="pricetag-outline" size={24} color={COLORS.info} />
              <Text style={styles.infoTitle}>{t('home.fair')}</Text>
              <Text style={styles.infoDesc}>{t('home.fairDesc')}</Text>
            </View>
          </View>
        </FadeInView>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: 24,
    paddingBottom: 120,
  },
  greeting: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  statsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  heroCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  heroCardContent: {
    padding: 24,
    alignItems: 'center',
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  heroCardSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 20,
  },
  heroCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  heroCtaBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  latestCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  latestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  latestLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  latestTitle: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: 8,
  },
  latestStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  latestStatusText: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  infoDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
