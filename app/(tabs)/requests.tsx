import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '../../src/components/layout';
import { RequestListSkeleton } from '../../src/components/ui';
import { useRequestsStore } from '../../src/stores/useRequestsStore';
import { REQUEST_STATUS } from '../../src/constants/status';
import { COLORS } from '../../src/constants';

import type { ServiceRequest } from '../../src/services/requests';

/**
 * My Requests screen. Reads from the central requests store which maintains
 * a persistent Firestore listener -- no refetch on every focus.
 */
export default function RequestsScreen() {
  const { t } = useTranslation();
  const requests = useRequestsStore((s) => s.requests);
  const isInitialized = useRequestsStore((s) => s.isInitialized);
  // Subscribe to bidCounts and baseline so the unread badge stays live
  const bidCounts = useRequestsStore((s) => s.bidCounts);
  const unreadBaseline = useRequestsStore((s) => s.unreadBaseline);

  const openRequest = (id: string) => {
    router.push({ pathname: '/request/[id]', params: { id } });
  };

  const renderRequest = ({ item }: { item: ServiceRequest }) => {
    const ai = item.aiAnalysis as any;
    // Always use the generic Hebrew title. The Hebrew profession label
    // appears as a smaller subtitle -- never show English keys like
    // "general" or "cleaning" that leaked from old AI responses.
    const professionLabelHe = Array.isArray(ai?.professionLabelsHe)
      ? ai.professionLabelsHe[0]
      : null;
    const shortSummary = ai?.shortSummary || ai?.summary || '';

    const bidCount = bidCounts[item.id] || 0;
    const lastSeen = unreadBaseline[item.id]?.lastSeenBidCount || 0;
    const unread = Math.max(0, bidCount - lastSeen);
    const showBadge =
      unread > 0 &&
      (item.status === REQUEST_STATUS.OPEN || item.status === REQUEST_STATUS.PAUSED);

    return (
      <Pressable onPress={() => openRequest(item.id)} style={styles.requestCard}>
        <View style={styles.requestIcon}>
          <Ionicons name="build" size={22} color={COLORS.primary} />
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.requestTitle}>{t('requests.serviceRequest')}</Text>
          <Text style={styles.requestSummary} numberOfLines={1}>
            {showBadge
              ? t('requests.newOffers', { count: unread })
              : professionLabelHe
              ? professionLabelHe
              : shortSummary}
          </Text>
        </View>

        {showBadge && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unread}</Text>
          </View>
        )}

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.status === 'open'
                  ? COLORS.success + '20'
                  : item.status === 'in_progress'
                  ? COLORS.warning + '20'
                  : COLORS.textTertiary + '20',
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color:
                  item.status === 'open'
                    ? COLORS.success
                    : item.status === 'in_progress'
                    ? COLORS.warning
                    : COLORS.textTertiary,
              },
            ]}
          >
            {t(`status.${item.status}`)}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <ScreenContainer>
      <Text style={styles.header}>{t('requests.title')}</Text>

      {!isInitialized ? (
        <View style={{ flex: 1, paddingTop: 8 }}>
          <RequestListSkeleton />
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color={COLORS.textTertiary} />
          <Text style={styles.emptyTitle}>{t('requests.empty')}</Text>
          <Text style={styles.emptySubtitle}>{t('requests.emptyHint')}</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequest}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 24,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  requestCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  requestIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  requestSummary: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 7,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 14,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
});
