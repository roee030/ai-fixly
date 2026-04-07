import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, Pressable, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../src/components/layout';
import { Button } from '../../src/components/ui';
import { requestService } from '../../src/services/requests';
import { REQUEST_STATUS, REQUEST_STATUS_LABELS } from '../../src/constants/status';
import { SERVICE_CATEGORIES } from '../../src/constants/categories';
import { COLORS } from '../../src/constants';

import type { ServiceRequest } from '../../src/services/requests';

export default function RequestDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRequest();
  }, [id]);

  const loadRequest = async () => {
    if (!id) return;
    try {
      const req = await requestService.getRequest(id);
      setRequest(req);
    } catch (err) {
      console.error('Load request error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async () => {
    if (!request) return;
    await requestService.updateStatus(request.id, REQUEST_STATUS.PAUSED);
    loadRequest();
  };

  const handleResume = async () => {
    if (!request) return;
    await requestService.updateStatus(request.id, REQUEST_STATUS.OPEN);
    loadRequest();
  };

  const handleClose = async () => {
    if (!request) return;
    await requestService.updateStatus(request.id, REQUEST_STATUS.CLOSED);
    loadRequest();
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

  if (!request) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: COLORS.error }}>בקשה לא נמצאה</Text>
        </View>
      </ScreenContainer>
    );
  }

  const categoryLabel = SERVICE_CATEGORIES.find((c) => c.id === request.aiAnalysis.category)?.labelHe || request.aiAnalysis.category;
  const statusLabel = REQUEST_STATUS_LABELS[request.status];

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 24 }}>
          <Pressable onPress={() => router.replace('/(tabs)')} style={{ marginRight: 16 }}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </Pressable>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: COLORS.text, flex: 1 }}>
            פרטי בקשה
          </Text>
          <View style={{ backgroundColor: COLORS.primary + '30', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>
              {statusLabel?.he || request.status}
            </Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {request.media.map((m, i) => (
            <Image key={i} source={{ uri: m.downloadUrl }} style={{ width: 150, height: 150, borderRadius: 12, marginRight: 8 }} />
          ))}
        </ScrollView>

        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginBottom: 4 }}>קטגוריה</Text>
          <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>{categoryLabel}</Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginBottom: 4 }}>תיאור</Text>
          <Text style={{ color: COLORS.text, fontSize: 16, lineHeight: 24 }}>{request.aiAnalysis.summary}</Text>
        </View>

        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, marginBottom: 16, alignItems: 'center' }}>
          <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textTertiary} />
          <Text style={{ color: COLORS.textSecondary, marginTop: 12, textAlign: 'center' }}>
            ממתין לתשובות מבעלי מקצוע...
          </Text>
          <Text style={{ color: COLORS.textTertiary, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
            הודעות נשלחות לבעלי מקצוע באזור שלך
          </Text>
        </View>
      </ScrollView>

      <View style={{ paddingVertical: 16, gap: 12 }}>
        {request.status === REQUEST_STATUS.OPEN && (
          <Button title="השהה בקשה" onPress={handlePause} variant="secondary" />
        )}
        {request.status === REQUEST_STATUS.PAUSED && (
          <Button title="חדש בקשה" onPress={handleResume} />
        )}
        {request.status !== REQUEST_STATUS.CLOSED && (
          <Button title="סגור בקשה" onPress={handleClose} variant="ghost" />
        )}
      </View>
    </ScreenContainer>
  );
}
