import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from './Skeleton';
import { COLORS } from '../../constants';

export function RequestCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width={44} height={44} borderRadius={12} />
      <View style={{ flex: 1, marginLeft: 12, gap: 6 }}>
        <Skeleton width={120} height={16} />
        <Skeleton width="80%" height={12} />
      </View>
      <Skeleton width={50} height={24} borderRadius={8} />
    </View>
  );
}

export function RequestListSkeleton() {
  return (
    <View style={{ gap: 12 }}>
      {[0, 1, 2].map((i) => (
        <RequestCardSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
