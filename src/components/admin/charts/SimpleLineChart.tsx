import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import { COLORS, SPACING, RADII } from '../../../constants';

interface Props {
  title: string;
  data: Array<{ x: string; y: number }>;
  color?: string;
  height?: number;
  /** Format Y-axis values — e.g. `(v) => v + ' min'`. */
  formatValue?: (v: number) => string;
}

/**
 * Minimal line chart — hand-rolled SVG. We avoid pulling victory's full
 * chart runtime for what is structurally just "a polyline over N points".
 * Renders on web, iOS, and Android with identical output.
 */
export function SimpleLineChart({
  title, data, color = '#6366F1', height = 120, formatValue,
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

  const ys = data.map((d) => d.y);
  const maxY = Math.max(1, ...ys);
  const minY = 0;

  const points = data
    .map((d, i) => {
      const x = padX + (i * innerW) / Math.max(1, data.length - 1);
      const y = padY + innerH - ((d.y - minY) / (maxY - minY || 1)) * innerH;
      return `${x},${y}`;
    })
    .join(' ');

  const last = data[data.length - 1];
  const lastX = padX + innerW;
  const lastY = padY + innerH - ((last.y - minY) / (maxY - minY || 1)) * innerH;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={[styles.lastValue, { color }]}>
          {formatValue ? formatValue(last.y) : String(last.y)}
        </Text>
      </View>
      <Svg width={width} height={height}>
        {/* Baseline grid line */}
        <Line x1={padX} y1={padY + innerH} x2={padX + innerW} y2={padY + innerH}
              stroke={COLORS.border} strokeWidth={1} />
        <Polyline points={points} fill="none" stroke={color} strokeWidth={2} />
        <Circle cx={lastX} cy={lastY} r={4} fill={color} />
      </Svg>
      <View style={styles.footer}>
        <Text style={styles.axisLabel}>{data[0]?.x || ''}</Text>
        <Text style={styles.axisLabel}>{last?.x || ''}</Text>
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
  lastValue: { fontSize: 14, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
  axisLabel: { fontSize: 10, color: COLORS.textTertiary },
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLORS.textTertiary, fontSize: 12 },
});
