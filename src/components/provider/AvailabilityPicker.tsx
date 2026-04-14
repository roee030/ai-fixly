import { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants';

/**
 * Two-step availability picker for the provider quote form.
 * Step 1: pick a day (today / tomorrow / day-after).
 * Step 2: pick a time-of-day window (morning / noon / afternoon / evening).
 *
 * The picker emits a canonical UTC ISO timestamp (start of the chosen
 * window in Israel local time) plus a human label for display. The
 * customer-side `formatAvailability` then renders that timestamp in
 * whichever language the customer is using.
 */

type DayOption = 'today' | 'tomorrow' | 'dayAfter';
type SlotOption = 'morning' | 'noon' | 'afternoon' | 'evening';

// Hours that anchor each window (Israel local).
const SLOT_HOURS: Record<SlotOption, number> = {
  morning: 9,
  noon: 12,
  afternoon: 16,
  evening: 19,
};

const DAY_OFFSET: Record<DayOption, number> = {
  today: 0,
  tomorrow: 1,
  dayAfter: 2,
};

interface Props {
  onChange: (selection: { iso: string; label: string } | null) => void;
}

export function AvailabilityPicker({ onChange }: Props) {
  const { t } = useTranslation();
  const [day, setDay] = useState<DayOption | null>(null);
  const [slot, setSlot] = useState<SlotOption | null>(null);

  // Persist current selection upward whenever it changes.
  const apply = (nextDay: DayOption | null, nextSlot: SlotOption | null) => {
    setDay(nextDay);
    setSlot(nextSlot);
    if (!nextDay || !nextSlot) {
      onChange(null);
      return;
    }
    const iso = computeIsoFor(nextDay, nextSlot);
    const label = `${t(`providerForm.day_${nextDay}`)} • ${t(`providerForm.slot_${nextSlot}`)}`;
    onChange({ iso, label });
  };

  const days: DayOption[] = useMemo(() => ['today', 'tomorrow', 'dayAfter'], []);
  const slots: SlotOption[] = useMemo(() => ['morning', 'noon', 'afternoon', 'evening'], []);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('providerForm.whenLabel')}</Text>

      {/* Step 1: day */}
      <View style={styles.row}>
        {days.map((d) => {
          const active = day === d;
          return (
            <Pressable key={d} onPress={() => apply(d, slot)} style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {t(`providerForm.day_${d}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Step 2: time-of-day, revealed once a day is picked */}
      {day && (
        <View style={[styles.row, { marginTop: 10 }]}>
          {slots.map((s) => {
            const active = slot === s;
            return (
              <Pressable key={s} onPress={() => apply(day, s)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {t(`providerForm.slot_${s}`)}
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
 * Compute the ISO timestamp (UTC) of the start of the picked window.
 * Israel offset is approximated month-based (matches the rest of the app).
 */
function computeIsoFor(day: DayOption, slot: SlotOption): string {
  const offsetDays = DAY_OFFSET[day];
  const hourLocal = SLOT_HOURS[slot];

  const now = new Date();
  const israelOffsetH = israelOffsetHours(now);

  // Build "today midnight Israel" first, then add the offset days + hour.
  const utcMidnightToday = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    -israelOffsetH,  // shift back so 00:00 Israel == this UTC
  );
  const ts = utcMidnightToday + (offsetDays * 24 + hourLocal) * 60 * 60 * 1000;
  return new Date(ts).toISOString();
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
