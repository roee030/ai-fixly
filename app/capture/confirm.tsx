import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, ActivityIndicator, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../src/components/layout';
import { Button } from '../../src/components/ui';
import { localizeProfession } from '../../src/utils/professionLabel';
import { aiAnalysisService } from '../../src/services/ai';
import { mediaService } from '../../src/services/media';
import { requestService } from '../../src/services/requests';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { COLORS } from '../../src/constants';
import { FeedbackModal } from '../../src/components/ui/FeedbackModal';
import { REQUEST_STATUS } from '../../src/constants/status';
import { analyticsService } from '../../src/services/analytics';
import { logAction } from '../../src/services/analytics/sessionLogger';
import { broadcastToProviders } from '../../src/services/broadcast';
import { logger } from '../../src/services/logger';
import { getFirestore, doc, getDoc } from '../../src/services/firestore/imports';

import type { AIAnalysisResult } from '../../src/services/ai';

export default function ConfirmScreen() {
  const { t } = useTranslation();
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
  const [showFeedback, setShowFeedback] = useState(false);

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
      logAction('ai_analysis_completed', 'confirm', { profession: result.professions[0] });
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
      // Use the user's saved profile location instead of re-requesting GPS.
      // This saves 1-5 seconds per request. The location was already collected
      // during profile setup and is accurate enough for provider search (20km radius).
      let location = { lat: 32.0853, lng: 34.7818, address: 'Tel Aviv, Israel' };
      try {
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data?.() || {};
        if (userData.location?.lat && userData.location?.lng) {
          location = userData.location;
        }
      } catch {
        // Fall back to default location
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
      logAction('request_confirmed', 'confirm');

      // Navigate IMMEDIATELY — don't wait for broadcast
      router.replace('/capture/sent');

      // Fire-and-forget: the worker handles everything in the background
      // (finding providers, sending WhatsApp, saving bids + broadcastedProviders).
      broadcastToProviders({
        requestId: request.id,
        professions: analysis.professions,
        shortSummary: analysis.shortSummary,
        mediaUrls: uploadedMedia.map((m) => m.downloadUrl),
        location,
      }).catch((err) => logger.error('Broadcast failed', err as Error));
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
          <Text style={{ color: COLORS.text, marginTop: 16, fontSize: 18 }}>{t('confirm.analyzing')}</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (hasError && !analysis) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: COLORS.text, fontSize: 18, textAlign: 'center', marginBottom: 8 }}>
            {t('confirm.analysisFailed')}
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
            {t('confirm.analysisFailed2')}
          </Text>
          <Button title={t('common.retry')} onPress={analyzeImages} />
          <View style={{ height: 12 }} />
          <Button title={t('common.back')} onPress={() => router.back()} variant="ghost" />
          <Pressable onPress={() => setShowFeedback(true)} style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={COLORS.textTertiary} />
            <Text style={{ color: COLORS.textTertiary, fontSize: 13 }}>{t('common.reportProblem')}</Text>
          </Pressable>
        </View>
        <FeedbackModal
          visible={showFeedback}
          onClose={() => setShowFeedback(false)}
          screen="confirm"
          errorMessage="AI analysis failed"
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 24, gap: 12 }}>
          <Pressable
            onPress={() => router.back()}
            style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' }}
            accessibilityLabel="Back"
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </Pressable>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: COLORS.text }}>
            {t('confirm.title')}
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {imageUris.map((uri, i) => (
            <Image key={i} source={{ uri }} style={{ width: 100, height: 100, borderRadius: 8, marginRight: 8 }} />
          ))}
        </ScrollView>

        {description && description.length > 0 && (
          <View style={{ backgroundColor: COLORS.backgroundLight, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border }}>
            <Text style={{ color: COLORS.textTertiary, fontSize: 11, fontWeight: '600', marginBottom: 4 }}>
              {t('confirm.whatYouWrote')}
            </Text>
            <Text style={{ color: COLORS.text, fontSize: 14, lineHeight: 20 }}>
              {description}
            </Text>
          </View>
        )}

        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 8 }}>{t('confirm.relevantProfession')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {((analysis as any)?.professions || analysis?.professionLabelsHe || []).map((item: string, i: number) => (
              <View key={i} style={{ backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}>
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 }}>{localizeProfession(item, t)}</Text>
              </View>
            ))}
          </View>
          {analysis?.shortSummary && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
              <Ionicons name="sparkles" size={12} color={COLORS.primary} style={{ marginTop: 4 }} />
              <Text style={{ color: COLORS.textSecondary, fontSize: 14, lineHeight: 20, fontStyle: 'italic', flex: 1 }}>
                {analysis.shortSummary}
              </Text>
            </View>
          )}
        </View>

        {hasError && (
          <View style={{ backgroundColor: COLORS.error + '15', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <Text style={{ color: COLORS.text, textAlign: 'center' }}>
              {t('confirm.somethingWentWrong')}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={{ paddingVertical: 16, gap: 12 }}>
        <Button title={t('confirm.sendAndFind')} onPress={handleConfirmAndSend} isLoading={isSending} />
        <Button title={t('common.cancel')} onPress={() => router.back()} variant="ghost" />
      </View>
    </ScreenContainer>
  );
}
