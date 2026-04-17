import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Image, ActivityIndicator, Pressable, Modal, FlatList, StyleSheet, Dimensions, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { VideoPreview } from '../../src/components/ui/VideoPreview';
import { ScreenContainer } from '../../src/components/layout';
import { Button } from '../../src/components/ui';
import { localizeProfession } from '../../src/utils/professionLabel';
import { aiAnalysisService } from '../../src/services/ai';
import { mediaService } from '../../src/services/media';
import { requestService } from '../../src/services/requests';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { COLORS } from '../../src/constants';
import { PROFESSIONS } from '../../src/constants/problemMatrix';
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
  const { images, base64Images, description, videoAssets: videoAssetsParam } = useLocalSearchParams<{
    images: string;
    base64Images: string;
    description: string;
    videoAssets?: string;
  }>();

  const user = useAuthStore((s) => s.user);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [chosenProfessions, setChosenProfessions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showProfessionPicker, setShowProfessionPicker] = useState(false);
  const [preview, setPreview] = useState<
    | { kind: 'image'; uri: string }
    | { kind: 'video'; uri: string; posterUri?: string }
    | null
  >(null);

  const imageUris: string[] = JSON.parse(images || '[]');
  const videoAssets: { uri: string; thumbnailUri?: string }[] = JSON.parse(videoAssetsParam || '[]');
  const videoUris: string[] = videoAssets.map((v) => v.uri);

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
      // Initialize the editable profession list with what the AI chose.
      setChosenProfessions(((result as any).professions || result.professionLabelsHe || []).slice());
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
      // Upload everything in parallel — images and videos. Videos carry their
      // poster frame so the WhatsApp preview / provider quote page can show
      // a still frame next to the play link.
      const uploadedImages = await Promise.all(
        imageUris.map((uri) => mediaService.uploadImage(uri, user.uid, tempId)),
      );
      const uploadedVideos = await Promise.all(
        videoAssets.map((v) =>
          mediaService.uploadVideo(v.uri, user.uid, tempId, v.thumbnailUri),
        ),
      );
      const uploadedMedia = [...uploadedImages, ...uploadedVideos];

      // Override AI-chosen professions with whatever the user finalised in
      // the picker. This preserves the AI's other analysis (urgency, summary)
      // while honouring the user's correction.
      const finalAnalysis = { ...analysis, professions: chosenProfessions } as AIAnalysisResult;

      const request = await requestService.createRequest({
        userId: user.uid,
        media: uploadedMedia,
        aiAnalysis: finalAnalysis,
        location,
        textDescription: description,
      });

      await requestService.updateStatus(request.id, REQUEST_STATUS.OPEN);
      analyticsService.trackEvent('request_created', { requestId: request.id });
      logAction('request_confirmed', 'confirm');

      // Navigate IMMEDIATELY — pass the new request id so the sent screen
      // can offer "view my request".
      router.replace({ pathname: '/capture/sent', params: { requestId: request.id } });

      // Fire-and-forget broadcast. Send images first so the provider sees
      // photos at the top of the WhatsApp thread, then videos.
      broadcastToProviders({
        requestId: request.id,
        professions: chosenProfessions,
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

  if (isLoading) {
    return <AnalyzingView t={t} />;
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
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

        {(imageUris.length > 0 || videoAssets.length > 0) && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {imageUris.map((uri, i) => (
              <Pressable key={`p-${i}`} onPress={() => setPreview({ kind: 'image', uri })}>
                <Image source={{ uri }} style={confirmThumbStyles.thumb} />
              </Pressable>
            ))}
            {videoAssets.map((video, i) => (
              <Pressable
                key={`v-${i}`}
                onPress={() => setPreview({ kind: 'video', uri: video.uri, posterUri: video.thumbnailUri })}
                style={confirmThumbStyles.videoTile}
              >
                {video.thumbnailUri ? (
                  // Real poster frame from expo-video-thumbnails. Falls back
                  // to the dark placeholder if the thumb wasn't generated.
                  <Image source={{ uri: video.thumbnailUri }} style={confirmThumbStyles.thumb} />
                ) : (
                  <View style={[confirmThumbStyles.thumb, confirmThumbStyles.videoFallback]} />
                )}
                <View style={confirmThumbStyles.videoOverlay}>
                  <Ionicons name="play-circle" size={36} color="#FFFFFF" />
                </View>
                <View style={confirmThumbStyles.videoBadge}>
                  <Ionicons name="videocam" size={10} color="#FFFFFF" />
                  <Text style={confirmThumbStyles.videoBadgeText}>{t('capture.videoTag')}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}

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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>{t('confirm.relevantProfession')}</Text>
            <Pressable
              onPress={() => setShowProfessionPicker(true)}
              hitSlop={10}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Ionicons name="create-outline" size={16} color={COLORS.primary} />
              <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600' }}>
                {t('editProfession.editLabel')}
              </Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {chosenProfessions.length === 0 && (
              <Text style={{ color: COLORS.textTertiary, fontSize: 13 }}>
                {t('editProfession.notRight')}
              </Text>
            )}
            {chosenProfessions.map((item: string, i: number) => (
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
        <Button
          title={t('confirm.sendAndFind')}
          onPress={handleConfirmAndSend}
          isLoading={isSending}
          disabled={chosenProfessions.length === 0}
        />
        <Button title={t('common.cancel')} onPress={() => router.back()} variant="ghost" />
      </View>

      <ProfessionPickerModal
        visible={showProfessionPicker}
        selected={chosenProfessions}
        onClose={() => setShowProfessionPicker(false)}
        onSave={(next) => {
          setChosenProfessions(next);
          setShowProfessionPicker(false);
        }}
        t={t}
      />

      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <View style={previewStyles.overlay}>
          {preview?.kind === 'video' ? (
            <VideoPreview uri={preview.uri} posterUri={preview.posterUri} style={previewStyles.video} />
          ) : preview ? (
            <Pressable style={previewStyles.imgWrap} onPress={() => setPreview(null)}>
              <Image source={{ uri: preview.uri }} style={previewStyles.image} resizeMode="contain" />
            </Pressable>
          ) : null}
          <Pressable style={previewStyles.close} onPress={() => setPreview(null)} hitSlop={10}>
            <Ionicons name="close-circle" size={36} color="#FFFFFF" />
          </Pressable>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const PREVIEW_W = Dimensions.get('window').width - 32;
const previewStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imgWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' },
  image: { width: PREVIEW_W, height: PREVIEW_W, borderRadius: 12 },
  video: { width: PREVIEW_W, height: PREVIEW_W * 1.2, borderRadius: 12, backgroundColor: '#000' },
  close: { position: 'absolute', top: 60, right: 20 },
});

/**
 * Loading state with rotating tip messages so the AI wait feels purposeful.
 * The actual analysis time is dominated by the model + network — we can't
 * make it faster from the client, but we can make it feel shorter.
 */
function AnalyzingView({ t }: { t: (k: string) => string }) {
  const [tipIndex, setTipIndex] = useState(0);
  const tips = useMemo(
    () => [
      t('confirm.tip1'),
      t('confirm.tip2'),
      t('confirm.tip3'),
    ],
    [t],
  );
  useEffect(() => {
    const id = setInterval(() => setTipIndex((i) => (i + 1) % tips.length), 2500);
    return () => clearInterval(id);
  }, [tips.length]);

  return (
    <ScreenContainer>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ color: COLORS.text, marginTop: 16, fontSize: 18, fontWeight: '600' }}>
          {t('confirm.analyzing')}
        </Text>
        <Text
          key={tipIndex}
          style={{ color: COLORS.textSecondary, marginTop: 12, fontSize: 14, textAlign: 'center', lineHeight: 20 }}
        >
          {tips[tipIndex]}
        </Text>
      </View>
    </ScreenContainer>
  );
}

function ProfessionPickerModal({
  visible,
  selected,
  onClose,
  onSave,
  t,
}: {
  visible: boolean;
  selected: string[];
  onClose: () => void;
  onSave: (next: string[]) => void;
  t: (k: string, o?: any) => string;
}) {
  const [draft, setDraft] = useState<string[]>(selected);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (visible) {
      setDraft(selected);
      setQuery('');
    }
  }, [visible, selected]);

  const toggle = (label: string) => {
    setDraft((prev) =>
      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label],
    );
  };

  // Selected items first, then unselected ones, both filtered by the query.
  // Showing selected on top makes it clear what's already chosen even after
  // the user scrolls or searches.
  const normalisedQuery = query.trim().toLowerCase();
  const filteredItems = PROFESSIONS.filter((p) =>
    normalisedQuery.length === 0
      ? true
      : p.labelHe.toLowerCase().includes(normalisedQuery) ||
        p.key.toLowerCase().includes(normalisedQuery),
  );
  const selectedItems = filteredItems.filter((p) => draft.includes(p.labelHe));
  const unselectedItems = filteredItems.filter((p) => !draft.includes(p.labelHe));
  const orderedItems = [...selectedItems, ...unselectedItems];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.sheetHeader}>
            <Text style={modalStyles.sheetTitle}>{t('editProfession.selectTitle')}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </Pressable>
          </View>

          <View style={modalStyles.searchRow}>
            <Ionicons name="search" size={18} color={COLORS.textTertiary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('editProfession.searchPlaceholder')}
              placeholderTextColor={COLORS.textTertiary}
              style={modalStyles.searchInput}
              autoCorrect={false}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={10}>
                <Ionicons name="close-circle" size={18} color={COLORS.textTertiary} />
              </Pressable>
            )}
          </View>

          <FlatList
            data={orderedItems}
            keyExtractor={(item) => item.key}
            ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
            contentContainerStyle={{ paddingVertical: 8 }}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={() => (
              <View style={modalStyles.empty}>
                <Text style={modalStyles.emptyText}>
                  {t('editProfession.noResults')}
                </Text>
              </View>
            )}
            renderItem={({ item }) => {
              const isOn = draft.includes(item.labelHe);
              return (
                <Pressable
                  onPress={() => toggle(item.labelHe)}
                  style={[modalStyles.row, isOn && modalStyles.rowActive]}
                >
                  <Text style={[modalStyles.rowText, isOn && modalStyles.rowTextActive]}>
                    {item.labelHe}
                  </Text>
                  {isOn && <Ionicons name="checkmark" size={20} color={COLORS.primary} />}
                </Pressable>
              );
            }}
          />
          <View style={{ paddingTop: 8 }}>
            <Button
              title={t('editProfession.save')}
              onPress={() => onSave(draft)}
              disabled={draft.length === 0}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rowActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
  },
  rowText: {
    fontSize: 15,
    color: COLORS.text,
  },
  rowTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    padding: 0,
  },
  empty: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textTertiary,
    fontSize: 14,
  },
});

const confirmThumbStyles = StyleSheet.create({
  thumb: { width: 100, height: 100, borderRadius: 8, marginRight: 8 },
  videoTile: { width: 100, height: 100, borderRadius: 8, marginRight: 8, position: 'relative' },
  videoFallback: { backgroundColor: '#101015', marginRight: 0 },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 8,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 8,
  },
  videoBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  videoBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
});
