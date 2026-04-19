import { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, TIME_WINDOWS, formatWindowRange, type TimeWindow } from '../../constants';

/**
 * Two-step availability picker for the provider quote form.
 *   Step 1: pick a day (today / tomorrow / day-after).
 *   Step 2: pick ONE 2-hour time window from the canonical TIME_WINDOWS list.
 *
 * Emits canonical UTC ISO timestamps for both the start and end of the
 * chosen window. The customer's BidCard renders the same range so what
 * the provider promised matches what the customer sees, byte-for-byte.
 */

type DayOption = 'today' | 'tomorrow' | 'dayAfter';

const DAY_OFFSET: Record<DayOption, number> = {
  today: 0,
  tomorrow: 1,
  dayAfter: 2,
};

export interface AvailabilitySelection {
  startIso: string;
  endIso: string;
  /** Human-readable label like "מחר 09:00–11:00", for the UI confirmation. */
  label: string;
}

interface Props {
  onChange: (selection: AvailabilitySelection | null) => void;
}

export function AvailabilityPicker({ onChange }: Props) {
  const { t } = useTranslation();
  const [day, setDay] = useState<DayOption | null>(null);
  const [windowKey, setWindowKey] = useState<string | null>(null);

  // Persist current selection upward whenever it changes.
  const apply = (nextDay: DayOption | null, nextWindowKey: string | null) => {
    setDay(nextDay);
    setWindowKey(nextWindowKey);
    if (!nextDay || !nextWindowKey) {
      onChange(null);
      return;
    }
    const w = TIME_WINDOWS.find((x) => x.key === nextWindowKey);
    if (!w) {
      onChange(null);
      return;
    }
    const { startIso, endIso } = computeRangeIsosFor(nextDay, w);
    const label = `${t(`providerForm.day_${nextDay}`)} ${formatWindowRange(w)}`;
    onChange({ startIso, endIso, label });
  };

  const days: DayOption[] = useMemo(() => ['today', 'tomorrow', 'dayAfter'], []);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('providerForm.whenLabel')}</Text>

      {/* Step 1: day */}
      <View style={styles.row}>
        {days.map((d) => {
          const active = day === d;
          return (
            <Pressable key={d} onPress={() => apply(d, windowKey)} style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {t(`providerForm.day_${d}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Step 2: 2-hour windows, revealed once a day is picked */}
      {day && (
        <View style={[styles.row, { marginTop: 10 }]}>
          {TIME_WINDOWS.map((w) => {
            const active = windowKey === w.key;
            return (
              <Pressable
                key={w.key}
                onPress={() => apply(day, w.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {formatWindowRange(w)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

/**
 * Compute UTC ISO timestamps for the start and end of the chosen window
 * on the chosen day, in Israel local time.
 */
function computeRangeIsosFor(day: DayOption, w: TimeWindow): { startIso: string; endIso: string } {
  const offsetDays = DAY_OFFSET[day];
  const now = new Date();
  const israelOffsetH = israelOffsetHours(now);

  // Build "today midnight Israel" first, then add the offset days + hour.
  const utcMidnightToday = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    -israelOffsetH,  // shift back so 00:00 Israel == this UTC
  );
  const startTs = utcMidnightToday + (offsetDays * 24 + w.startHour) * 60 * 60 * 1000;
  const endTs = utcMidnightToday + (offsetDays * 24 + w.endHour) * 60 * 60 * 1000;
  return {
    startIso: new Date(startTs).toISOString(),
    endIso: new Date(endTs).toISOString(),
  };
}

function israelOffsetHours(d: Date): number {
  const month = d.getUTCMonth();
  if (month < 2 || month > 9) return 2;
  if (month > 2 && month < 9) return 3;
  const inSummer = month === 2 ? d.getUTCDate() >= 25 : d.getUTCDate() < 25;
  return inSummer ? 3 : 2;
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row' as any,
    flexWrap: 'wrap' as any,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600' as any,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
});
