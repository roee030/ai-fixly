import { useState, useCallback } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../src/components/layout';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { requestService } from '../../src/services/requests';
import { REQUEST_STATUS_LABELS } from '../../src/constants/status';
import { SERVICE_CATEGORIES } from '../../src/constants/categories';
import { COLORS } from '../../src/constants';

import type { ServiceRequest } from '../../src/services/requests';

export default function HubScreen() {
  const user = useAuthStore((s) => s.user);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      setIsLoading(true);
      requestService.getUserRequests(user.uid)
        .then(setRequests)
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }, [user])
  );

  const getCategoryLabel = (id: string) =>
    SERVICE_CATEGORIES.find((c) => c.id === id)?.labelHe || id;

  const renderRequest = ({ item }: { item: ServiceRequest }) => {
    const statusLabel = REQUEST_STATUS_LABELS[item.status];
    const categoryIcon = SERVICE_CATEGORIES.find((c) => c.id === item.aiAnalysis?.category);

    return (
      <Pressable
        onPress={() => router.push({ pathname: '/request/[id]', params: { id: item.id } })}
        style={styles.requestCard}
      >
        <View style={styles.requestIcon}>
          <Ionicons
            name={(categoryIcon?.icon as any) || 'build'}
            size={22}
            color={COLORS.primary}
          />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.requestTitle}>
            {getCategoryLabel(item.aiAnalysis?.category || '')}
          </Text>
          <Text style={styles.requestSummary} numberOfLines={1}>
            {item.aiAnalysis?.summary || ''}
          </Text>
        </View>
        <View style={[styles.statusBadge, {
          backgroundColor: item.status === 'open' ? COLORS.success + '20' :
                          item.status === 'in_progress' ? COLORS.warning + '20' :
                          COLORS.textTertiary + '20'
        }]}>
          <Text style={[styles.statusText, {
            color: item.status === 'open' ? COLORS.success :
                   item.status === 'in_progress' ? COLORS.warning :
                   COLORS.textTertiary
          }]}>
            {statusLabel?.he || item.status}
          </Text>
        </View>
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (requests.length === 0) {
    return (
      <ScreenContainer>
        <View style={styles.emptyState}>
          <Pressable onPress={() => router.push('/capture')} style={styles.bigCaptureButton}>
            <Ionicons name="scan-outline" size={48} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.emptyTitle}>{'יש תקלה? צריך שירות?'}</Text>
          <Text style={styles.emptySubtitle}>
            {'צלם תמונה של הבעיה ובעלי מקצוע באזור שלך יחזרו אליך עם הצעות'}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Text style={styles.header}>{'הקריאות שלי'}</Text>
      <FlatList
        data={requests}
        renderItem={renderRequest}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 24,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  bigCaptureButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    elevation: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  requestCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  requestIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  requestSummary: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
});
