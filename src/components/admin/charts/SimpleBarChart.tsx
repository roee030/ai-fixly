import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line } from 'react-native-svg';
import { COLORS, SPACING, RADII } from '../../../constants';

interface Props {
  title: string;
  data: Array<{ x: string; y: number }>;
  color?: string;
  height?: number;
  formatValue?: (v: number) => string;
}

export function SimpleBarChart({
  title, data, color = '#22C55E', height = 120, formatValue,
}: Props) {
  if (data.length === 0) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>{title}</Text>
        <View style={[styles.empty, { height }]}>
          <Text style={styles.emptyText}>אין נתונים</Text>
        </View>
      </View>
    );
  }

  const width = 320;
  const padX = 8;
  const padY = 14;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const maxY = Math.max(1, ...data.map((d) => d.y));

  const total = data.reduce((s, d) => s + d.y, 0);
  const barW = innerW / data.length - 2;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={[styles.totalValue, { color }]}>
          {formatValue ? formatValue(total) : String(total)}
        </Text>
      </View>
      <Svg width={width} height={height}>
        <Line x1={padX} y1={padY + innerH} x2={padX + innerW} y2={padY + innerH}
              stroke={COLORS.border} strokeWidth={1} />
        {data.map((d, i) => {
          const h = Math.max(1, (d.y / maxY) * innerH);
          const x = padX + i * (innerW / data.length) + 1;
          const y = padY + innerH - h;
          return <Rect key={i} x={x} y={y} width={barW} height={h} fill={color} rx={1} />;
        })}
      </Svg>
      <View style={styles.footer}>
        <Text style={styles.axisLabel}>{data[0]?.x || ''}</Text>
        <Text style={styles.axisLabel}>{data[data.length - 1]?.x || ''}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    gap: 6,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  totalValue: { fontSize: 14, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
  axisLabel: { fontSize: 10, color: COLORS.textTertiary },
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLORS.textTertiary, fontSize: 12 },
});
