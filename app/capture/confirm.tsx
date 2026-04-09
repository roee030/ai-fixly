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
import { analyticsService } from '../../src/services/analytics';
import { broadcastToProviders } from '../../src/services/broadcast';
import { logger } from '../../src/services/logger';
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
  const [hasError, setHasError] = useState(false);

  const imageUris: string[] = JSON.parse(images || '[]');

  useEffect(() => {
    analyzeImages();
  }, []);

  const analyzeImages = async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const base64Array: string[] = JSON.parse(base64Images || '[]');
      const result = await aiAnalysisService.analyzeIssue({
        images: base64Array,
        textDescription: description,
      });
      setAnalysis(result);
      analyticsService.trackEvent('ai_analysis_completed', { profession: result.professions[0] });
    } catch (err: any) {
      console.error('AI analysis error:', err);
      analyticsService.trackEvent('ai_analysis_failed');
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAndSend = async () => {
    if (!analysis || !user) return;
    setIsSending(true);
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
      analyticsService.trackEvent('request_created', { requestId: request.id });

      // Broadcast to providers via Cloudflare Worker (async, don't block navigation)
      broadcastToProviders({
        requestId: request.id,
        professions: analysis.professions,
        shortSummary: analysis.shortSummary,
        mediaUrls: uploadedMedia.map((m) => m.downloadUrl),
        location,
      }).catch((err) => logger.error('Broadcast failed', err as Error));

      router.replace('/capture/sent');
    } catch (err: any) {
      console.error('Send error:', err);
      setHasError(true);
      setIsSending(false);
    }
  };

  // AI now returns profession labels in Hebrew directly — no lookup needed

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ color: COLORS.text, marginTop: 16, fontSize: 18 }}>מנתח את הבעיה...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (hasError && !analysis) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: COLORS.text, fontSize: 18, textAlign: 'center', marginBottom: 8 }}>
            לא הצלחנו לנתח את הבעיה
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
            נסה שוב או צלם תמונה ברורה יותר
          </Text>
          <Button title="נסה שוב" onPress={analyzeImages} />
          <View style={{ height: 12 }} />
          <Button title="חזור" onPress={() => router.back()} variant="ghost" />
        </View>
      </ScreenContainer>
    );
  }

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
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 8 }}>בעל מקצוע רלוונטי:</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {(analysis?.professionLabelsHe || []).map((label, i) => (
              <View key={i} style={{ backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}>
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 }}>{label}</Text>
              </View>
            ))}
          </View>
          {analysis?.shortSummary && (
            <Text style={{ color: COLORS.textSecondary, fontSize: 14, lineHeight: 20, fontStyle: 'italic' }}>
              {analysis.shortSummary}
            </Text>
          )}
        </View>

        {hasError && (
          <View style={{ backgroundColor: COLORS.error + '15', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <Text style={{ color: COLORS.text, textAlign: 'center' }}>
              משהו השתבש. נסה שוב.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={{ paddingVertical: 16, gap: 12 }}>
        <Button title="שלח ומצא בעלי מקצוע" onPress={handleConfirmAndSend} isLoading={isSending} />
        <Button title="ביטול" onPress={() => router.back()} variant="ghost" />
      </View>
    </ScreenContainer>
  );
}
