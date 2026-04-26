import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Image, ActivityIndicator, Pressable, Modal, FlatList, StyleSheet, Dimensions, TextInput, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { VideoPreview } from '../../src/components/ui/VideoPreview';
import { ScreenContainer } from '../../src/components/layout';
import { Button } from '../../src/components/ui';
import { localizeProfession } from '../../src/utils/professionLabel';
import { aiAnalysisService } from '../../src/services/ai';
import { ContentModerationError } from '../../src/services/ai/geminiAnalysis';
import { startAnalysis, awaitAnalysis, clearAnalysis } from '../../src/services/ai/analysisStore';
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
import { recordSubmission } from '../../src/services/rateLimit/requestRateLimit';
import { logger } from '../../src/services/logger';
import { getFirestore, doc, getDoc, updateDoc } from '../../src/services/firestore/imports';
import { draftService } from '../../src/services/drafts';
import { eventLogger } from '../../src/services/observability';
import { resolveCity } from '../../src/utils/resolveCity';
import { withRetry } from '../../src/utils/retry';
import { captureException } from '../../src/services/errorReporting';

import type { AIAnalysisResult } from '../../src/services/ai';

export default function ConfirmScreen() {
  const { t } = useTranslation();
  const {
    images,
    base64Images,
    description,
    videoAssets: videoAssetsParam,
    analysisKey,
  } = useLocalSearchParams<{
    images: string;
    base64Images: string;
    description: string;
    videoAssets?: string;
    /** Key that links us to the analysis already kicked off in capture. */
    analysisKey?: string;
  }>();

  const user = useAuthStore((s) => s.user);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [chosenProfessions, setChosenProfessions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [moderationBlocked, setModerationBlocked] = useState(false);
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
    setModerationBlocked(false);
    try {
      // Preferred path — consume the analysis the capture screen kicked
      // off before navigation. By the time this screen mounts, the promise
      // is usually already resolved and this await is instantaneous.
      //
      // Fallback path — if we arrived here without a pre-started analysis
      // (e.g. the user hit retry, or the store was cleared) we start a
      // fresh one here.
      let inFlight = analysisKey ? awaitAnalysis(analysisKey) : null;
      if (!inFlight) {
        const base64Array: string[] = JSON.parse(base64Images || '[]');
        const key = analysisKey || `confirm-${Date.now()}`;
        inFlight = startAnalysis({
          requestKey: key,
          base64Images: base64Array,
          textDescription: description,
        });
      }
      const result = await inFlight;
      setAnalysis(result);
      // Initialize the editable profession list with what the AI chose.
      setChosenProfessions(((result as any).professions || result.professionLabelsHe || []).slice());
      analyticsService.trackEvent('ai_analysis_completed', { profession: result.professions[0] });
      logAction('ai_analysis_completed', 'confirm', { profession: result.professions[0] });
    } catch (err: any) {
      // Moderation blocks are user-facing and get their own UI — don't let
      // them bucket into the generic "analysis failed" retry state.
      if (err instanceof ContentModerationError) {
        setModerationBlocked(true);
        logAction('ai_analysis_blocked', 'confirm', { category: err.category });
      } else {
        // Sentry: failure in the AI analysis surface is the most user-visible
        // bug we have — the user lands here with a fresh photo and gets a
        // dead-end "try again" screen. Capture aggressively so we can spot
        // patterns (which model failed, payload size, image count).
        captureException(err, {
          tags: { screen: 'confirm', action: 'analyze' },
          extra: {
            imageCount: imageUris.length,
            videoCount: videoAssets.length,
            descriptionLength: (description || '').length,
          },
        });
        analyticsService.trackEvent('ai_analysis_failed');
        setHasError(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAndSend = async () => {
    if (!analysis || !user) return;
    setIsSending(true);

    // Location is captured at onboarding and required — never fall back.
    // If somehow the profile has no location (edge case from older builds),
    // tell the user to fix their permissions instead of broadcasting to
    // the wrong city.
    const db = getFirestore();
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.data?.() || {};
    if (!userData.location?.lat || !userData.location?.lng) {
      setIsSending(false);
      Alert.alert(
        t('auth.locationMissingTitle'),
        t('auth.locationMissingBody'),
      );
      return;
    }
    const location = userData.location;

    try {

      const tempId = `req_${Date.now()}`;

      // Save a resumable draft BEFORE we start uploading. If uploads or
      // createRequest fail, the draft survives so the user can resume
      // from the capture screen's resume-prompt modal.
      await draftService.save(user.uid, {
        imageUris,
        videoAssets,
        description,
        analysis,
        chosenProfessions,
        analysisKey: analysisKey as string | undefined,
      });

      // Upload everything in parallel — images and videos. Wrap each call
      // in timing so we can emit per-upload events once we have the real
      // request id a few lines later.
      const uploadStart = Date.now();
      const imageTimings: Array<{ sizeMB: number; durationMs: number; ok: boolean }> = [];
      const videoTimings: Array<{ sizeMB: number; durationMs: number; ok: boolean }> = [];

      // Wrap each upload with withRetry — flaky cellular gives lots of
      // 1-shot failures that succeed on the second try. 3 attempts with a
      // 1s base backoff is enough to ride out a brief signal drop without
      // making the user wait minutes.
      const uploadedImages = await Promise.all(
        imageUris.map(async (uri) => {
          const t0 = Date.now();
          try {
            const result = await withRetry(
              () => mediaService.uploadImage(uri, user.uid, tempId),
              3,
              1000,
              'media.uploadImage',
            );
            imageTimings.push({
              sizeMB: (result as any).sizeMB ?? 0,
              durationMs: Date.now() - t0,
              ok: true,
            });
            return result;
          } catch (err) {
            imageTimings.push({ sizeMB: 0, durationMs: Date.now() - t0, ok: false });
            captureException(err, {
              tags: { screen: 'confirm', action: 'upload_image' },
              extra: { tempId, attempts: 3, durationMs: Date.now() - t0 },
            });
            throw err;
          }
        }),
      );
      const uploadedVideos = await Promise.all(
        videoAssets.map(async (v) => {
          const t0 = Date.now();
          try {
            const result = await withRetry(
              () => mediaService.uploadVideo(v.uri, user.uid, tempId, v.thumbnailUri),
              3,
              1500,
              'media.uploadVideo',
            );
            videoTimings.push({
              sizeMB: (result as any).sizeMB ?? 0,
              durationMs: Date.now() - t0,
              ok: true,
            });
            return result;
          } catch (err) {
            videoTimings.push({ sizeMB: 0, durationMs: Date.now() - t0, ok: false });
            captureException(err, {
              tags: { screen: 'confirm', action: 'upload_video' },
              extra: { tempId, attempts: 3, durationMs: Date.now() - t0 },
            });
            throw err;
          }
        }),
      );
      const uploadMs = Date.now() - uploadStart;
      const uploadedMedia = [...uploadedImages, ...uploadedVideos];

      // Override AI-chosen professions with whatever the user finalised in
      // the picker. This preserves the AI's other analysis (urgency, summary)
      // while honouring the user's correction.
      const finalAnalysis = { ...analysis, professions: chosenProfessions } as AIAnalysisResult;

      const writeStart = Date.now();
      // Firestore writes are usually instantaneous but a flaky network can
      // make a single attempt fail. Retry twice — beyond that something's
      // structurally wrong (auth expired, rules denied) and retrying won't
      // help.
      const request = await withRetry(
        () => requestService.createRequest({
          userId: user.uid,
          media: uploadedMedia,
          aiAnalysis: finalAnalysis,
          location,
          textDescription: description,
        }),
        2,
        500,
        'requests.createRequest',
      );
      const writeMs = Date.now() - writeStart;

      await requestService.updateStatus(request.id, REQUEST_STATUS.OPEN);
      analyticsService.trackEvent('request_created', { requestId: request.id });
      logAction('request_confirmed', 'confirm');

      // ── Observability: fire-and-forget event stream ────────────────────
      // All four blocks below run in the background. None blocks navigation
      // or broadcast. Any failure inside eventLogger swallows silently.
      const perf = (analysis as any).__perf as AIAnalysisResult['__perf'];
      if (perf) {
        void eventLogger.log(request.id, {
          type: 'gemini',
          ok: true,
          durationMs: perf.ms,
          metadata: { model: perf.model, imageCount: perf.imageCount, payloadKB: perf.payloadKB },
        });
      }
      for (const timing of imageTimings) {
        void eventLogger.log(request.id, {
          type: 'upload_image',
          ok: timing.ok,
          durationMs: timing.durationMs,
          metadata: { sizeMB: timing.sizeMB },
        });
      }
      for (const timing of videoTimings) {
        void eventLogger.log(request.id, {
          type: 'upload_video',
          ok: timing.ok,
          durationMs: timing.durationMs,
          metadata: { sizeMB: timing.sizeMB },
        });
      }
      void eventLogger.log(request.id, {
        type: 'firestore_write',
        ok: true,
        durationMs: writeMs,
      });

      // Client-computed summaries denormalized onto the request doc for
      // fast admin list reads. locationSummary uses the bounding-box
      // resolver — zero API calls, no latency impact.
      try {
        const db = getFirestore();
        await updateDoc(doc(db, 'serviceRequests', request.id), {
          locationSummary: resolveCity(location.lat, location.lng),
          serviceSummary: {
            geminiMs: perf?.ms ?? 0,
            uploadMs,
            firestoreWriteMs: writeMs,
            totalMs: (perf?.ms ?? 0) + uploadMs + writeMs,
            hadError: false,
          },
        });
      } catch (err) {
        logger.warn('[confirm] summary write failed', { err: String(err) });
      }

      // Request is persisted — we no longer need the local draft.
      void draftService.remove(user.uid);

      // Record the successful submission for the client-side rate limiter.
      // Persistent → survives the next app-open so the throttle still
      // applies. Fire-and-forget; failure to persist is non-blocking.
      void recordSubmission();

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
      }).catch((err) => {
        logger.error('Broadcast failed', err as Error);
        // Already captured inside broadcastService with level: 'fatal',
        // but add a screen-level breadcrumb here so the Sentry trace shows
        // exactly which user flow surfaced the failure.
        captureException(err, {
          tags: { screen: 'confirm', action: 'broadcast_post_create' },
          extra: { requestId: request.id, professionCount: chosenProfessions.length },
        });
      });
    } catch (err: any) {
      // The whole upload-create-broadcast pipeline is one atomic UX from the
      // user's POV — if anything throws, the user sees a generic error and
      // we have to figure out which step it was. Capture with the step
      // we got the furthest into so we can chase the right cause.
      captureException(err, {
        tags: { screen: 'confirm', action: 'send_pipeline' },
        extra: {
          imageCount: imageUris.length,
          videoCount: videoAssets.length,
          professionCount: chosenProfessions.length,
        },
        level: 'fatal',
      });
      setHasError(true);
      setIsSending(false);
    }
  };

  if (isLoading) {
    return <AnalyzingView t={t} />;
  }

  if (moderationBlocked) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Ionicons name="shield-outline" size={64} color={COLORS.warning} />
          <Text style={{ color: COLORS.text, fontSize: 20, textAlign: 'center', marginTop: 16, fontWeight: '700' }}>
            {t('confirm.moderationBlockedTitle')}
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 8, marginBottom: 24, lineHeight: 22 }}>
            {t('confirm.moderationBlockedBody')}
          </Text>
          <Button title={t('common.back')} onPress={() => router.back()} />
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
/**
 * "Looking for your pro" waiting screen. Instead of a generic spinner, we
 * cycle through concrete profession icons + Hebrew labels every ~800ms
 * and pair them with a 3-step progress caption that advances on time.
 * The effect is that the user sees movement and a sense of progress even
 * when the backend is quiet.
 *
 * Styled as a stacked pair of fading circles with the icon centred so the
 * motion feels purposeful, not busy. Each icon + caption change is a React
 * key change to trigger the FadeIn re-animation.
 */
const ANALYZING_STEPS: Array<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
}> = [
  { icon: 'water-outline',       label: 'plumber',     color: '#3B82F6' },
  { icon: 'flash-outline',       label: 'electrician', color: '#F59E0B' },
  { icon: 'key-outline',         label: 'locksmith',   color: '#64748B' },
  { icon: 'thermometer-outline', label: 'hvac',        color: '#10B981' },
  { icon: 'color-palette-outline', label: 'painter',   color: '#EC4899' },
  { icon: 'hammer-outline',      label: 'handyman',    color: '#8B5CF6' },
];

function AnalyzingView({ t }: { t: (k: string) => string }) {
  const [iconIndex, setIconIndex] = useState(0);
  const [captionIndex, setCaptionIndex] = useState(0);

  const captions = useMemo(
    () => [
      t('confirm.tip1'),
      t('confirm.tip2'),
      t('confirm.tip3'),
    ],
    [t],
  );

  useEffect(() => {
    // Icons cycle faster than captions — feels alive, not pushy.
    const iconId = setInterval(() => {
      setIconIndex((i) => (i + 1) % ANALYZING_STEPS.length);
    }, 700);
    // Captions advance every ~3s, then stick on the last one so the
    // progression feels like we genuinely got to "almost done".
    const captionId = setInterval(() => {
      setCaptionIndex((i) => Math.min(i + 1, captions.length - 1));
    }, 3000);
    return () => {
      clearInterval(iconId);
      clearInterval(captionId);
    };
  }, [captions.length]);

  const step = ANALYZING_STEPS[iconIndex];
  const stepLabel = t(`analyzing.prof.${step.label}`);

  return (
    <ScreenContainer>
      <View style={analyzingStyles.center}>
        {/* Three concentric pulses of colour, with the icon in the middle. */}
        <View style={[analyzingStyles.ring1, { backgroundColor: step.color + '15' }]}>
          <View style={[analyzingStyles.ring2, { backgroundColor: step.color + '25' }]}>
            <View style={[analyzingStyles.iconCircle, { backgroundColor: step.color }]}>
              <Animated.View key={iconIndex} entering={FadeIn.duration(350)}>
                <Ionicons name={step.icon} size={48} color="#FFFFFF" />
              </Animated.View>
            </View>
          </View>
        </View>

        {/* Profession name re-keys on every swap so it FadeIn-s. */}
        <Animated.Text
          key={`name-${iconIndex}`}
          entering={FadeIn.duration(300)}
          style={[analyzingStyles.profName, { color: step.color }]}
        >
          {stepLabel}
        </Animated.Text>

        <Text style={analyzingStyles.title}>{t('confirm.analyzing')}</Text>

        <Animated.Text
          key={`cap-${captionIndex}`}
          entering={FadeIn.duration(300)}
          style={analyzingStyles.caption}
        >
          {captions[captionIndex]}
        </Animated.Text>

        {/* Bottom indeterminate bar — low-key, not a dominant element. */}
        <View style={analyzingStyles.progressTrack}>
          <Animated.View
            key={`bar-${captionIndex}`}
            entering={FadeIn.duration(400)}
            style={[
              analyzingStyles.progressFill,
              { width: `${((captionIndex + 1) / captions.length) * 100}%` },
            ]}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const analyzingStyles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 14,
  },
  ring1: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  ring2: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    // Soft glow only shows on Android at elevation + iOS shadow — fine on both.
    elevation: 8,
  },
  profName: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 8,
  },
  title: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  caption: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  progressTrack: {
    marginTop: 20,
    width: '60%',
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
});

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
