import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants';
import type { ProviderMonthlyStats } from '../../types/providerProfile';

interface Props {
  stats: ProviderMonthlyStats;
}

/** 3-up tiles: bids sent, jobs completed, success rate. */
export function StatsCards({ stats }: Props) {
  const { t } = useTranslation();
  const successDisplay =
    stats.bidsSent === 0
      ? t('providerDashboard.statSuccessNA')
      : `${stats.successRatePct}%`;

  return (
    <View style={styles.row}>
      <Tile big={String(stats.bidsSent)} label={t('providerDashboard.statBidsSent')} />
      <Tile big={String(stats.jobsCompleted)} label={t('providerDashboard.statJobsCompleted')} />
      <Tile big={successDisplay} label={t('providerDashboard.statSuccessRate')} />
    </View>
  );
}

function Tile({ big, label }: { big: string; label: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.bigNum}>{big}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row' as any,
    gap: 8,
  },
  tile: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 4,
  },
  bigNum: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '800' as any,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600' as any,
  },
});
