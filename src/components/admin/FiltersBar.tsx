import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADII } from '../../constants';
import { CITY_BOXES, CITY_LABELS_HE } from '../../constants/cities';

export interface FilterState {
  status: 'all' | 'open' | 'in_progress' | 'closed';
  city: string | 'all';
  hasReview: 'all' | 'yes' | 'no';
  dateRange: 'today' | '7d' | '30d' | '90d' | 'all';
}

interface Props {
  value: FilterState;
  onChange: (next: FilterState) => void;
}

/**
 * Horizontal filter strip above the admin requests table. Each chip
 * is a quick toggle — no dropdowns, no modal, so the admin can narrow
 * results in one tap. Multi-select is NOT supported intentionally —
 * keeping the filter state a flat tuple keeps the Firestore query cheap.
 */
export function FiltersBar({ value, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.wrap}>
      <ChipRow
        label="טווח"
        options={[
          { k: 'today', l: 'היום' },
          { k: '7d', l: '7 ימים' },
          { k: '30d', l: '30 ימים' },
          { k: '90d', l: '90 ימים' },
          { k: 'all', l: 'הכל' },
        ]}
        selected={value.dateRange}
        onSelect={(k) => onChange({ ...value, dateRange: k as FilterState['dateRange'] })}
      />

      <ChipRow
        label="סטטוס"
        options={[
          { k: 'all', l: 'הכל' },
          { k: 'open', l: 'פתוחה' },
          { k: 'in_progress', l: 'בתהליך' },
          { k: 'closed', l: 'נסגרה' },
        ]}
        selected={value.status}
        onSelect={(k) => onChange({ ...value, status: k as FilterState['status'] })}
      />

      <ChipRow
        label="דירוג"
        options={[
          { k: 'all', l: 'הכל' },
          { k: 'yes', l: 'יש ביקורת' },
          { k: 'no', l: 'אין ביקורת' },
        ]}
        selected={value.hasReview}
        onSelect={(k) => onChange({ ...value, hasReview: k as FilterState['hasReview'] })}
      />

      <Pressable onPress={() => setExpanded((e) => !e)} style={styles.cityToggle}>
        <Text style={styles.cityToggleText}>
          {expanded ? 'סגור ערים' : `עיר: ${value.city === 'all' ? 'הכל' : CITY_LABELS_HE[value.city] || value.city}`}
        </Text>
      </Pressable>

      {expanded && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cityStrip}>
          <CityChip label="הכל" active={value.city === 'all'} onPress={() => onChange({ ...value, city: 'all' })} />
          {CITY_BOXES.map((b) => (
            <CityChip
              key={b.city}
              label={CITY_LABELS_HE[b.city] || b.city}
              active={value.city === b.city}
              onPress={() => onChange({ ...value, city: b.city })}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function ChipRow({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: Array<{ k: string; l: string }>;
  selected: string;
  onSelect: (k: string) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {options.map((o) => (
        <Pressable
          key={o.k}
          onPress={() => onSelect(o.k)}
          style={[styles.chip, selected === o.k && styles.chipActive]}
        >
          <Text style={[styles.chipText, selected === o.k && styles.chipTextActive]}>
            {o.l}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function CityChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginBottom: SPACING.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  rowLabel: { fontSize: 12, color: COLORS.textTertiary, marginRight: 4 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  chipText: { fontSize: 12, color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.primary, fontWeight: '700' },
  cityToggle: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cityToggleText: { fontSize: 12, color: COLORS.text, fontWeight: '600' },
  cityStrip: { marginTop: 4 },
});
