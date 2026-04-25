import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants';

/**
 * Standard empty-state component used across the app.
 *
 * Goals:
 *   1. Stop every screen from rolling its own "no data" UI — they all
 *      ended up looking different, sometimes broken in RTL.
 *   2. Make it obvious whether the empty state is positive ("waiting for
 *      providers, all good") or a problem ("can't load, try again").
 *   3. Always offer a way out — primary CTA when there is one, else
 *      a hint that explains why we're empty.
 *
 * Variants:
 *   - 'waiting'  — neutral, low-key. "loading more / waiting for X"
 *   - 'empty'    — informational. "no items yet — make your first"
 *   - 'error'    — something went wrong. Always shows retry CTA when given.
 *   - 'offline'  — explicitly offline. Network icon + "check your connection"
 */

type Variant = 'waiting' | 'empty' | 'error' | 'offline';

interface EmptyStateProps {
  variant?: Variant;
  /** Big text. Use a noun phrase ("אין הצעות עדיין"). */
  title: string;
  /** Smaller line below — explains why or what to do. */
  subtitle?: string;
  /** Optional CTA button text. Renders only when onAction is also set. */
  actionLabel?: string;
  onAction?: () => void;
  /** Override the auto-picked icon. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Outer container style override (margin, flex, etc). */
  style?: ViewStyle;
  /** Accessibility hint for the action button. */
  actionHint?: string;
}

const ICON_BY_VARIANT: Record<Variant, keyof typeof Ionicons.glyphMap> = {
  waiting: 'hourglass-outline',
  empty: 'file-tray-outline',
  error: 'alert-circle-outline',
  offline: 'cloud-offline-outline',
};

const COLOR_BY_VARIANT: Record<Variant, string> = {
  waiting: COLORS.textTertiary,
  empty: COLORS.textTertiary,
  error: COLORS.error,
  offline: COLORS.warning,
};

export function EmptyState({
  variant = 'empty',
  title,
  subtitle,
  actionLabel,
  onAction,
  icon,
  style,
  actionHint,
}: EmptyStateProps) {
  const iconName = icon || ICON_BY_VARIANT[variant];
  const color = COLOR_BY_VARIANT[variant];

  return (
    <View style={[styles.container, style]} accessibilityRole="summary">
      <Ionicons name={iconName} size={56} color={color} />
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            styles.action,
            { borderColor: color, backgroundColor: color + '15' },
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          accessibilityHint={actionHint}
        >
          <Text style={[styles.actionText, { color }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 6,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
  action: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
