import { useState, useEffect } from 'react';
import {
  View, Text, Image, Pressable, TextInput, ScrollView,
  StyleSheet, Modal, Dimensions, Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ScreenContainer } from '../../src/components/layout';
import { Button } from '../../src/components/ui';
import { useImagePicker } from '../../src/hooks/useImagePicker';
import { COLORS, LIMITS } from '../../src/constants';
import { analyticsService } from '../../src/services/analytics';
import { logAction } from '../../src/services/analytics/sessionLogger';

const THUMB_SIZE = 72;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CaptureScreen() {
  const { t } = useTranslation();
  const { images, pickFromCamera, pickFromGallery, removeImage, getBase64Images, hasImages } =
    useImagePicker();
  const [description, setDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);

  const handleRecordVideo = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        videoMaxDuration: 60,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
      });
      if (!result.canceled && result.assets?.[0]) {
        setVideoUri(result.assets[0].uri);
        analyticsService.trackEvent('capture_video_recorded');
        logAction('video_recorded', 'capture');
      }
    } catch (err) {
      console.warn('Video recording failed:', err);
    }
  };

  const handleUploadVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        videoMaxDuration: 60,
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.[0]) {
        setVideoUri(result.assets[0].uri);
        analyticsService.trackEvent('capture_video_uploaded');
      }
    } catch (err) {
      console.warn('Video upload failed:', err);
    }
  };

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

  const [webPhotos, setWebPhotos] = useState<string[]>([]);
  const MIN_DESCRIPTION_LENGTH = 10;
  const isDescriptionValid = description.trim().length >= MIN_DESCRIPTION_LENGTH;

  const handleAnalyze = async () => {
    const photoList = Platform.OS === 'web' ? webPhotos : images;
    // Allow video-only (no photos) or photos-only (no video) or both
    if (photoList.length === 0 && !videoUri && !isDescriptionValid) return;
    if (!isDescriptionValid) return;
    setIsAnalyzing(true);
    logAction('capture_submitted', 'capture');
    try {
      if (Platform.OS === 'web') {
        router.push({
          pathname: '/capture/confirm',
          params: {
            images: JSON.stringify(webPhotos),
            base64Images: JSON.stringify([]),
            description: description.trim(),
            videoUri: videoUri || '',
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
            videoUri: videoUri || '',
          },
        });
      }
    } catch (err) {
      console.error('Error preparing images:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Web: use drag-and-drop upload zone instead of native camera/gallery
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </Pressable>
          <Text style={styles.title}>{t('capture.title')}</Text>
        </View>

        {/* Two clean buttons: Camera and Gallery */}
        <View style={styles.mediaRow}>
          <Pressable
            onPress={() => {
              // Open camera — user chooses photo or video in the camera UI
              pickFromCamera();
            }}
            style={styles.mediaBtn}
          >
            <View style={styles.mediaBtnIcon}>
              <Ionicons name="camera" size={28} color={COLORS.primary} />
            </View>
            <Text style={styles.mediaBtnTitle}>{t('capture.camera')}</Text>
            <Text style={styles.mediaBtnHint}>{t('capture.cameraHint')}</Text>
          </Pressable>

          <Pressable
            onPress={async () => {
              // Open gallery — supports both photos and videos
              try {
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ['images', 'videos'],
                  allowsMultipleSelection: true,
                  selectionLimit: LIMITS.MAX_IMAGES_PER_REQUEST,
                  quality: 0.8,
                  videoMaxDuration: 60,
                });
                if (!result.canceled && result.assets) {
                  for (const asset of result.assets) {
                    if (asset.type === 'video') {
                      setVideoUri(asset.uri);
                      analyticsService.trackEvent('capture_video_uploaded');
                    }
                    // Photos are handled by the useImagePicker hook
                    // but since we're using ImagePicker directly here,
                    // we'd need to add them manually
                  }
                  // For photos, use the existing pickFromGallery
                  if (result.assets.some(a => a.type !== 'video')) {
                    pickFromGallery();
                  }
                }
              } catch {
                // Fallback to standard gallery picker
                pickFromGallery();
              }
            }}
            style={styles.mediaBtn}
          >
            <View style={styles.mediaBtnIcon}>
              <Ionicons name="images" size={28} color={COLORS.primary} />
            </View>
            <Text style={styles.mediaBtnTitle}>{t('capture.gallery')}</Text>
            <Text style={styles.mediaBtnHint}>{t('capture.galleryHint')}</Text>
          </Pressable>
        </View>

        {images.length > 0 && (
          <Text style={styles.imageCount}>
            {t('capture.images', { count: images.length, max: LIMITS.MAX_IMAGES_PER_REQUEST })}
          </Text>
        )}

        {/* Image thumbnails grid */}
        {images.length > 0 && (
          <View style={styles.thumbGrid}>
            {images.map((uri, index) => (
              <Pressable key={index} onPress={() => setPreviewUri(uri)} style={styles.thumbWrap}>
                <Image source={{ uri }} style={styles.thumb} />
                <Pressable onPress={() => removeImage(index)} style={styles.removeBtn}>
                  <Ionicons name="close" size={14} color="#FFF" />
                </Pressable>
              </Pressable>
            ))}
          </View>
        )}

        {/* Video indicator */}
        {videoUri && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, backgroundColor: COLORS.surface, padding: 10, borderRadius: 10 }}>
            <Ionicons name="videocam" size={20} color={COLORS.success} />
            <Text style={{ color: COLORS.text, flex: 1, fontSize: 13 }}>{t('capture.videoAttached')}</Text>
            <Pressable onPress={() => setVideoUri(null)}>
              <Ionicons name="close-circle" size={20} color={COLORS.error} />
            </Pressable>
          </View>
        )}

        {/* Tip — push for detail + video */}
        <View style={styles.tipCard}>
          <Ionicons name="information-circle" size={18} color={COLORS.primary} />
          <Text style={styles.tipText}>
            {t('capture.tipBody')}
          </Text>
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
          style={[
            styles.descInput,
            description.length > 0 && !isDescriptionValid && { borderColor: COLORS.warning }
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

      {/* Fixed bottom button */}
      <View style={styles.bottomBar}>
        <Button
          title={t('confirm.sendAndFind')}
          onPress={handleAnalyze}
          isLoading={isAnalyzing}
          disabled={(!hasImages && !videoUri) || !isDescriptionValid}
        />
      </View>

      {/* Image preview modal */}
      <Modal visible={!!previewUri} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setPreviewUri(null)}>
          <Image
            source={{ uri: previewUri || '' }}
            style={styles.previewImage}
            resizeMode="contain"
          />
          <Pressable style={styles.modalClose} onPress={() => setPreviewUri(null)}>
            <Ionicons name="close-circle" size={36} color="#FFFFFF" />
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
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
    marginBottom: 20,
  },
  mediaBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  mediaBtnIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaBtnTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  mediaBtnHint: {
    color: COLORS.textTertiary,
    fontSize: 12,
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
  imageCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  thumbGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  thumbWrap: {
    position: 'relative',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 10,
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
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background,
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
  modalClose: {
    position: 'absolute',
    top: 60,
    right: 20,
  },
});
