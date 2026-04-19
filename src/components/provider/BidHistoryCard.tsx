import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants';
import type { ProviderBidHistoryItem } from '../../types/providerProfile';
import { formatAvailability } from '../../utils/formatAvailability';

interface Props {
  item: ProviderBidHistoryItem;
}

/**
 * Single row on the provider's "ההצעות שלי" list. Color + icon track
 * the bid status so the provider can scan the list and see at a glance
 * what's pending, what they won, and what got away.
 */
export function BidHistoryCard({ item }: Props) {
  const { t } = useTranslation();
  const { icon, color } = STATUS_VISUALS[item.status];

  // Same formatter used everywhere — keeps the time format byte-identical
  // to what the customer saw on their bid card.
  const availability = formatAvailability(
    {
      availabilityStartAt: item.availabilityStartAt,
      availabilityEndAt: item.availabilityEndAt,
      availability: null,
    },
    new Date(),
    t,
  );

  const headline = item.problemSummary || t('providerDashboard.bidStatus_sent');
  const headlineWithCity = item.city ? `${headline} • ${item.city}` : headline;

  return (
    <View style={[styles.card, { borderColor: color + '55' }]}>
      <Text style={styles.headline} numberOfLines={1}>
        {headlineWithCity}
      </Text>

      <View style={styles.metaRow}>
        {item.price !== null && (
          <Text style={styles.price}>₪{item.price}</Text>
        )}
        {availability && <Text style={styles.availability}>{availability}</Text>}
      </View>

      <View style={[styles.statusRow, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon as any} size={14} color={color} />
        <Text style={[styles.statusText, { color }]}>
          {t(`providerDashboard.bidStatus_${item.status}`)}
        </Text>
      </View>
    </View>
  );
}

const STATUS_VISUALS: Record<
  ProviderBidHistoryItem['status'],
  { icon: string; color: string }
> = {
  sent: { icon: 'hourglass-outline', color: COLORS.info },
  selected: { icon: 'checkmark-circle', color: COLORS.success },
  completed: { icon: 'trophy', color: COLORS.success },
  lost: { icon: 'close-circle-outline', color: COLORS.textTertiary },
  expired: { icon: 'time-outline', color: COLORS.warning },
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 8,
  },
  headline: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600' as any,
  },
  metaRow: {
    flexDirection: 'row' as any,
    gap: 12,
    alignItems: 'center',
  },
  price: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700' as any,
  },
  availability: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  statusRow: {
    flexDirection: 'row' as any,
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700' as any,
  },
});
