import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '../../src/components/layout';
import { Button } from '../../src/components/ui';
import { aiAnalysisService } from '../../src/services/ai';
import { mediaService } from '../../src/services/media';
import { requestService } from '../../src/services/requests';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { COLORS } from '../../src/constants';
import { REQUEST_STATUS } from '../../src/constants/status';
import { SERVICE_CATEGORIES } from '../../src/constants/categories';
import * as Location from 'expo-location';

import type { AIAnalysisResult } from '../../src/services/ai';

export default function ConfirmScreen() {
  const { images, base64Images, description } = useLocalSearchParams<{
    images: string;
    base64Images: string;
    description: string;
  }>();

  const user = useAuthStore((s) => s.user);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const imageUris: string[] = JSON.parse(images || '[]');

  useEffect(() => {
    analyzeImages();
  }, []);

  const analyzeImages = async () => {
    setIsLoading(true);
    setError('');
    try {
      const base64Array: string[] = JSON.parse(base64Images || '[]');
      const result = await aiAnalysisService.analyzeIssue({
        images: base64Array,
        textDescription: description,
      });
      setAnalysis(result);
    } catch (err: any) {
      console.error('AI analysis error:', err);
      setError(err?.message || 'ניתוח AI נכשל. נסה שוב.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAndSend = async () => {
    if (!analysis || !user) return;
    setIsSending(true);
    setError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let location = { lat: 32.0853, lng: 34.7818, address: 'Tel Aviv, Israel' };

      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        const [addr] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        location = {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          address: addr ? `${addr.street || ''} ${addr.city || ''}`.trim() : 'Unknown',
        };
      }

      const tempId = `req_${Date.now()}`;
      const uploadedMedia = await Promise.all(
        imageUris.map((uri) => mediaService.uploadImage(uri, user.uid, tempId))
      );

      const request = await requestService.createRequest({
        userId: user.uid,
        media: uploadedMedia,
        aiAnalysis: analysis,
        location,
        textDescription: description,
      });

      await requestService.updateStatus(request.id, REQUEST_STATUS.OPEN);

      router.replace({
        pathname: '/request/[id]',
        params: { id: request.id },
      });
    } catch (err: any) {
      console.error('Send error:', err);
      setError(err?.message || 'שליחה נכשלה. נסה שוב.');
    } finally {
      setIsSending(false);
    }
  };

  const getCategoryLabel = (categoryId: string) => {
    return SERVICE_CATEGORIES.find((c) => c.id === categoryId)?.labelHe || categoryId;
  };

  const getUrgencyInfo = (urgency: string) => {
    const map: Record<string, { text: string; color: string }> = {
      low: { text: 'לא דחוף', color: COLORS.success },
      medium: { text: 'בינוני', color: COLORS.warning },
      high: { text: 'דחוף', color: COLORS.error },
    };
    return map[urgency] || map.medium;
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ color: COLORS.text, marginTop: 16, fontSize: 18 }}>AI מנתח את הבעיה...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error && !analysis) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: COLORS.error, fontSize: 16, textAlign: 'center', marginBottom: 16 }}>{error}</Text>
          <Button title="נסה שוב" onPress={analyzeImages} />
        </View>
      </ScreenContainer>
    );
  }

  const urgency = getUrgencyInfo(analysis?.urgency || 'medium');

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginTop: 16, marginBottom: 24 }}>
          אישור בקשה
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {imageUris.map((uri, i) => (
            <Image key={i} source={{ uri }} style={{ width: 100, height: 100, borderRadius: 8, marginRight: 8 }} />
          ))}
        </ScrollView>

        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            <View style={{ backgroundColor: COLORS.primaryDark, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ color: COLORS.text, fontWeight: 'bold' }}>{getCategoryLabel(analysis?.category || '')}</Text>
            </View>
            <View style={{ backgroundColor: urgency.color + '20', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ color: urgency.color, fontWeight: 'bold' }}>{urgency.text}</Text>
            </View>
          </View>
          <Text style={{ color: COLORS.text, fontSize: 16, lineHeight: 24 }}>{analysis?.summary}</Text>
        </View>

        {error && <Text style={{ color: COLORS.error, marginBottom: 16 }}>{error}</Text>}
      </ScrollView>

      <View style={{ paddingVertical: 16, gap: 12 }}>
        <Button title="שלח ומצא בעלי מקצוע" onPress={handleConfirmAndSend} isLoading={isSending} />
        <Button title="ביטול" onPress={() => router.back()} variant="ghost" />
      </View>
    </ScreenContainer>
  );
}
