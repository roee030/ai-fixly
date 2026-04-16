import { useState, useEffect, useRef } from 'react';
import {
  View, Text, Image, Pressable, TextInput, ScrollView,
  StyleSheet, Modal, Dimensions, Platform, KeyboardAvoidingView,
  Alert, ActionSheetIOS,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../src/components/layout';
import { Button } from '../../src/components/ui';
import { VideoPreview } from '../../src/components/ui/VideoPreview';
import { useImagePicker } from '../../src/hooks/useImagePicker';
import { COLORS, LIMITS } from '../../src/constants';
import { analyticsService } from '../../src/services/analytics';
import { logAction } from '../../src/services/analytics/sessionLogger';

const THUMB_SIZE = 84;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CaptureScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ prefillDescription?: string }>();
  const {
    images,
    videos,
    takePhoto,
    recordVideo,
    pickFromGallery,
    removeImage,
    removeVideo,
    getBase64Images,
    totalVideoBytes,
    hasMedia,
  } = useImagePicker();
  const [description, setDescription] = useState(() => (params.prefillDescription || '').slice(0, 500));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // Single preview slot. `kind` tells the modal what to render. Videos use
  // expo-video; images use the existing <Image> path. One state object means
  // there's never an inconsistent "image AND video previewed" combination.
  const [preview, setPreview] = useState<{ uri: string; kind: 'image' | 'video' } | null>(null);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    analyticsService.trackEvent('capture_started');
    logAction('capture_started', 'capture');
  }, []);

  useEffect(() => {
    if (images.length > 0) {
      analyticsService.trackEvent('capture_photo_added', { count: images.length });
      logAction('photo_added', 'capture', { count: images.length });
    }
  }, [images.length]);

  useEffect(() => {
    if (videos.length > 0) {
      logAction('video_added', 'capture', { count: videos.length });
    }
  }, [videos.length]);

  const [webPhotos, setWebPhotos] = useState<string[]>([]);
  const MIN_DESCRIPTION_LENGTH = 10;
  const isDescriptionValid = description.trim().length >= MIN_DESCRIPTION_LENGTH;

  // Single "Camera" entry point that asks the user whether they want a photo
  // or a video. This matches a normal camera-button mental model and
  // guarantees the system camera launches in the right mode (some Android
  // devices ignore mixed mediaTypes and default to photos).
  const openCameraSheet = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('common.cancel'), t('capture.takePhoto'), t('capture.recordVideo')],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) void takePhoto();
          else if (buttonIndex === 2) void recordVideo();
        },
      );
      return;
    }
    Alert.alert(
      t('capture.cameraSheetTitle'),
      undefined,
      [
        { text: t('capture.takePhoto'), onPress: () => { void takePhoto(); } },
        { text: t('capture.recordVideo'), onPress: () => { void recordVideo(); } },
        { text: t('common.cancel'), style: 'cancel' },
      ],
      { cancelable: true },
    );
  };

  const handleAnalyze = async () => {
    const photoList = Platform.OS === 'web' ? webPhotos : images;
    if (photoList.length === 0 && videos.length === 0 && !isDescriptionValid) return;
    if (!isDescriptionValid) return;

    // Block submit if combined video size exceeds the upload budget. Per-file
    // limits are already enforced at pick-time; this catches the case where
    // several individually-OK videos add up to too much.
    const totalMB = totalVideoBytes / (1024 * 1024);
    if (totalMB > LIMITS.MAX_TOTAL_UPLOAD_MB) {
      Alert.alert(
        t('imagePicker.totalTooLargeTitle'),
        t('imagePicker.totalTooLargeBody', {
          size: totalMB.toFixed(1),
          max: LIMITS.MAX_TOTAL_UPLOAD_MB,
        }),
      );
      return;
    }

    setIsAnalyzing(true);
    logAction('capture_submitted', 'capture');
    try {
      // Downstream only needs the video URIs for upload; thumbnails are a
      // render-only concern so we don't bother shipping them through params.
      const videoUris = videos.map((v) => v.uri);
      if (Platform.OS === 'web') {
        router.push({
          pathname: '/capture/confirm',
          params: {
            images: JSON.stringify(webPhotos),
            base64Images: JSON.stringify([]),
            description: description.trim(),
            videoUris: JSON.stringify([]),
          },
        });
      } else {
        const base64Images = await getBase64Images();
        router.push({
          pathname: '/capture/confirm',
          params: {
            images: JSON.stringify(images),
            base64Images: JSON.stringify(base64Images),
            description: description.trim(),
            videoUris: JSON.stringify(videoUris),
          },
        });
      }
    } catch (err) {
      console.error('Error preparing images:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Web: drag-and-drop upload zone (photos only)
  if (Platform.OS === 'web') {
    const { WebUploadZone } = require('../../src/components/web/WebUploadZone.web');
    const webHasPhotos = webPhotos.length > 0;
    return (
      <ScreenContainer>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </Pressable>
            <Text style={styles.title}>{t('capture.title')}</Text>
          </View>

          <WebUploadZone
            onPhotosSelected={setWebPhotos}
            maxPhotos={LIMITS.MAX_IMAGES_PER_REQUEST}
          />

          <View style={{ marginTop: 20 }}>
            <View style={styles.descLabelRow}>
              <Text style={styles.descLabel}>{t('capture.describeLabel')}</Text>
              <Text style={styles.required}> *</Text>
            </View>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t('capture.describePlaceholder')}
              placeholderTextColor={COLORS.textTertiary}
              multiline
              numberOfLines={4}
              style={[
                styles.descInput,
                description.length > 0 && !isDescriptionValid && { borderColor: COLORS.warning },
              ]}
            />
            <Text style={styles.descHint}>
              {description.length === 0
                ? t('capture.descriptionHint')
                : !isDescriptionValid
                ? t('capture.minChars', { min: MIN_DESCRIPTION_LENGTH, current: description.length })
                : t('capture.chars', { count: description.length })}
            </Text>
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <Button
            title={t('confirm.sendAndFind')}
            onPress={handleAnalyze}
            isLoading={isAnalyzing}
            disabled={!webHasPhotos || !isDescriptionValid}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </Pressable>
            <Text style={styles.title}>{t('capture.title')}</Text>
          </View>

          {/* Two clean entry points: Camera (photo OR video via action sheet)
              and Gallery (multi-select photos + videos). */}
          <View style={styles.mediaRow}>
            <MediaTile icon="camera" title={t('capture.camera')} onPress={openCameraSheet} />
            <MediaTile
              icon="images"
              title={t('capture.gallery')}
              onPress={async () => { await pickFromGallery(); }}
            />
          </View>

          {/* Horizontal media strip — keeps thumbnails in a fixed-height row
              so adding media doesn't push the description off-screen. */}
          {(images.length > 0 || videos.length > 0) && (
            <>
              <View style={styles.mediaCountRow}>
                <Text style={styles.imageCount}>
                  {t('capture.mediaCount', {
                    photos: images.length,
                    videos: videos.length,
                    max: LIMITS.MAX_IMAGES_PER_REQUEST,
                  })}
                </Text>
                {videos.length > 0 && totalVideoBytes / (1024 * 1024) >= LIMITS.WARN_VIDEO_SIZE_MB && (
                  <Text style={styles.sizeHint}>
                    {t('imagePicker.warnLargeFile', {
                      size: (totalVideoBytes / (1024 * 1024)).toFixed(1),
                    })}
                  </Text>
                )}
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbStripContent}
                style={styles.thumbStrip}
              >
                {images.map((uri, index) => (
                  <Pressable
                    key={`p-${index}`}
                    onPress={() => setPreview({ uri, kind: 'image' })}
                    style={styles.thumbWrap}
                  >
                    <Image source={{ uri }} style={styles.thumb} />
                    <Pressable
                      onPress={() => removeImage(index)}
                      style={styles.removeBtn}
                      hitSlop={6}
                    >
                      <Ionicons name="close" size={14} color="#FFF" />
                    </Pressable>
                  </Pressable>
                ))}
                {videos.map((video, index) => {
                  const sizeMB = video.sizeBytes / (1024 * 1024);
                  const isLarge = sizeMB >= LIMITS.WARN_VIDEO_SIZE_MB;
                  return (
                    <Pressable
                      key={`v-${index}`}
                      onPress={() => setPreview({ uri: video.uri, kind: 'video' })}
                      style={styles.thumbWrap}
                    >
                      {/* Real poster frame if expo-video-thumbnails is
                          available in the build; dark tile fallback otherwise. */}
                      {video.thumbnailUri ? (
                        <Image source={{ uri: video.thumbnailUri }} style={styles.thumb} />
                      ) : (
                        <View style={[styles.thumb, styles.videoThumbBg]} />
                      )}
                      <View style={styles.videoPlayOverlay} pointerEvents="none">
                        <Ionicons name="play-circle" size={36} color="#FFFFFF" />
                      </View>
                      <View style={styles.videoBadge}>
                        <Ionicons name="videocam" size={10} color="#FFFFFF" />
                        <Text style={styles.videoBadgeText}>
                          {sizeMB >= 0.1 ? `${sizeMB.toFixed(1)}MB` : t('capture.videoTag')}
                        </Text>
                      </View>
                      {isLarge && (
                        <View style={[styles.videoBadge, styles.videoBadgeWarn]}>
                          <Ionicons name="warning" size={10} color="#000" />
                        </View>
                      )}
                      <Pressable
                        onPress={() => removeVideo(index)}
                        style={styles.removeBtn}
                        hitSlop={6}
                      >
                        <Ionicons name="close" size={14} color="#FFF" />
                      </Pressable>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          )}

          {/* Tip */}
          <View style={styles.tipCard}>
            <Ionicons name="information-circle" size={18} color={COLORS.primary} />
            <Text style={styles.tipText}>{t('capture.tipBody')}</Text>
          </View>

          {/* Text description - MANDATORY */}
          <View style={styles.descLabelRow}>
            <Text style={styles.descLabel}>{t('capture.describeLabel')}</Text>
            <Text style={styles.required}> *</Text>
          </View>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={t('capture.describePlaceholder')}
            placeholderTextColor={COLORS.textTertiary}
            multiline
            numberOfLines={4}
            // Scroll the textarea into view when the keyboard appears.
            // Without this, the keyboard can sit on top of the input.
            onFocus={() => {
              setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
            }}
            style={[
              styles.descInput,
              description.length > 0 && !isDescriptionValid && { borderColor: COLORS.warning },
            ]}
          />
          <Text style={styles.descHint}>
            {description.length === 0
              ? t('capture.descriptionHint')
              : !isDescriptionValid
              ? t('capture.minChars', { min: MIN_DESCRIPTION_LENGTH, current: description.length })
              : t('capture.chars', { count: description.length })}
          </Text>
        </ScrollView>

        {/* Bottom button */}
        <View style={styles.bottomBar}>
          <Button
            title={t('confirm.sendAndFind')}
            onPress={handleAnalyze}
            isLoading={isAnalyzing}
            disabled={!hasMedia || !isDescriptionValid}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Unified preview modal. Images render with <Image>; videos delegate
          to the optional VideoPreview component (which gracefully falls back
          to a placeholder when expo-video's native module isn't compiled
          into the current build). */}
      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <View style={styles.modalOverlay}>
          {preview?.kind === 'video' ? (
            <VideoPreview uri={preview.uri} style={styles.previewVideo} />
          ) : preview ? (
            <Pressable style={{ flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' }} onPress={() => setPreview(null)}>
              <Image
                source={{ uri: preview.uri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            </Pressable>
          ) : null}
          <Pressable style={styles.modalClose} onPress={() => setPreview(null)} hitSlop={10}>
            <Ionicons name="close-circle" size={36} color="#FFFFFF" />
          </Pressable>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function MediaTile({
  icon,
  title,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.mediaBtn}>
      <View style={styles.mediaBtnIcon}>
        <Ionicons name={icon} size={28} color={COLORS.primary} />
      </View>
      <Text style={styles.mediaBtnTitle}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  backBtn: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  mediaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  mediaBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  mediaBtnIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaBtnTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  tipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  mediaCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  imageCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  sizeHint: {
    fontSize: 11,
    color: COLORS.warning,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  thumbStrip: {
    marginBottom: 14,
  },
  thumbStripContent: {
    gap: 8,
    paddingRight: 4,
  },
  thumbWrap: {
    position: 'relative',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 12,
  },
  videoThumbBg: {
    backgroundColor: '#101015',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
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
  videoBadgeWarn: {
    top: 4,
    left: 'auto',
    right: 4,
    bottom: 'auto',
    backgroundColor: COLORS.warning,
  },
  videoPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    // Slight scrim so the play icon is readable over any poster frame.
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
  },
  removeBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  descLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  required: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: 'bold',
  },
  descInput: {
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  descHint: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 6,
    marginBottom: 4,
  },
  bottomBar: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_WIDTH - 32,
    borderRadius: 12,
  },
  previewVideo: {
    width: SCREEN_WIDTH - 32,
    height: (SCREEN_WIDTH - 32) * 1.2,
    borderRadius: 12,
    backgroundColor: '#000',
  },
  modalClose: {
    position: 'absolute',
    top: 60,
    right: 20,
  },
});
