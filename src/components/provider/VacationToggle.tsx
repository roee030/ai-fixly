import { View, Text, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants';

interface Props {
  value: boolean;
  onChange: (next: boolean) => void;
  isUpdating?: boolean;
}

/**
 * The vacation switch on the Dashboard. When ON, the broker skips this
 * provider when dispatching new WhatsApp jobs. The optimistic prop is
 * rendered as a subtle activity indicator on the switch label.
 */
export function VacationToggle({ value, onChange, isUpdating }: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Ionicons
          name={value ? 'pause-circle' : 'checkmark-circle'}
          size={22}
          color={value ? COLORS.warning : COLORS.success}
        />
        <Text style={styles.title}>{t('providerDashboard.vacationCardTitle')}</Text>
        <View style={{ flex: 1 }} />
        <Switch
          value={value}
          onValueChange={onChange}
          disabled={isUpdating}
          trackColor={{ true: COLORS.warning, false: COLORS.border }}
          thumbColor="#FFFFFF"
        />
      </View>
      <Text style={styles.statusText}>
        {value ? t('providerDashboard.vacationOn') : t('providerDashboard.vacationOff')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row' as any,
    alignItems: 'center',
    gap: 8,
  },
  title: { color: COLORS.text, fontSize: 15, fontWeight: '700' as any },
  statusText: { color: COLORS.textSecondary, fontSize: 13 },
});
