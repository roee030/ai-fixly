import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../src/components/layout';
import { requestService } from '../../src/services/requests';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { REQUEST_STATUS_LABELS } from '../../src/constants/status';
import { SERVICE_CATEGORIES } from '../../src/constants/categories';
import { COLORS } from '../../src/constants';

import type { ServiceRequest } from '../../src/services/requests';

export default function HubScreen() {
  const user = useAuthStore((s) => s.user);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadRequests = async () => {
    if (!user) return;
    try {
      const data = await requestService.getUserRequests(user.uid);
      setRequests(data);
    } catch (err) {
      console.error('Load requests error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [user])
  );

  const handleCapture = () => {
    router.push('/capture');
  };

  const getCategoryLabel = (categoryId: string) => {
    return SERVICE_CATEGORIES.find((c) => c.id === categoryId)?.labelHe || categoryId;
  };

  const renderRequest = ({ item }: { item: ServiceRequest }) => {
    const statusLabel = REQUEST_STATUS_LABELS[item.status];
    return (
      <Pressable
        onPress={() => router.push({ pathname: '/request/[id]', params: { id: item.id } })}
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>
            {getCategoryLabel(item.aiAnalysis?.category || '')}
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 14 }} numberOfLines={1}>
            {item.aiAnalysis?.summary || 'טוען...'}
          </Text>
        </View>
        <View style={{ backgroundColor: COLORS.primary + '20', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
          <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: 'bold' }}>
            {statusLabel?.he || item.status}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <ScreenContainer>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginTop: 16, marginBottom: 24 }}>
        שלום{user?.phoneNumber ? ` 👋` : ''}
      </Text>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : requests.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Pressable
            onPress={handleCapture}
            style={{
              width: 80, height: 80, borderRadius: 40,
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 24, backgroundColor: COLORS.primary,
            }}
          >
            <Ionicons name="add" size={36} color="#FFFFFF" />
          </Pressable>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8, color: COLORS.text }}>
            יש תקלה?
          </Text>
          <Text style={{ fontSize: 14, textAlign: 'center', color: COLORS.textSecondary }}>
            לחץ על הכפתור כדי לצלם או להעלות תמונה של הבעיה
          </Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequest}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {/* Floating action button when there are requests */}
      {requests.length > 0 && (
        <Pressable
          onPress={handleCapture}
          style={{
            position: 'absolute', bottom: 24, right: 24,
            width: 56, height: 56, borderRadius: 28,
            backgroundColor: COLORS.primary,
            alignItems: 'center', justifyContent: 'center',
            elevation: 4,
            shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25, shadowRadius: 4,
          }}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>
      )}
    </ScreenContainer>
  );
}
