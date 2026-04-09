import { useState, useEffect } from 'react';
import {
  View, Text, Image, Pressable, TextInput, ScrollView,
  StyleSheet, Modal, Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../src/components/layout';
import { Button } from '../../src/components/ui';
import { useImagePicker } from '../../src/hooks/useImagePicker';
import { COLORS, LIMITS } from '../../src/constants';
import { analyticsService } from '../../src/services/analytics';

const THUMB_SIZE = 72;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CaptureScreen() {
  const { images, pickFromCamera, pickFromGallery, removeImage, getBase64Images, hasImages } =
    useImagePicker();
  const [description, setDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  useEffect(() => {
    analyticsService.trackEvent('capture_started');
  }, []);

  useEffect(() => {
    if (images.length > 0) {
      analyticsService.trackEvent('capture_photo_added', { count: images.length });
    }
  }, [images.length]);

  const MIN_DESCRIPTION_LENGTH = 10;
  const isDescriptionValid = description.trim().length >= MIN_DESCRIPTION_LENGTH;

  const handleAnalyze = async () => {
    if (!hasImages || !isDescriptionValid) return;
    setIsAnalyzing(true);
    try {
      const base64Images = await getBase64Images();
      router.push({
        pathname: '/capture/confirm',
        params: {
          images: JSON.stringify(images),
          base64Images: JSON.stringify(base64Images),
          description: description.trim(),
        },
      });
    } catch (err) {
      console.error('Error preparing images:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

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
          <Text style={styles.title}>מה הבעיה?</Text>
        </View>

        {/* Action buttons - always visible */}
        <View style={styles.actionRow}>
          <Pressable onPress={pickFromCamera} style={styles.actionBtn}>
            <Ionicons name="camera" size={24} color={COLORS.primary} />
            <Text style={styles.actionLabel}>צלם</Text>
          </Pressable>
          <Pressable onPress={pickFromGallery} style={styles.actionBtn}>
            <Ionicons name="images" size={24} color={COLORS.primary} />
            <Text style={styles.actionLabel}>גלריה</Text>
          </Pressable>
        </View>

        {images.length > 0 && (
          <Text style={styles.imageCount}>
            {images.length}/{LIMITS.MAX_IMAGES_PER_REQUEST} תמונות
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

        {/* Text description - MANDATORY */}
        <View style={styles.descLabelRow}>
          <Text style={styles.descLabel}>תאר את הבעיה</Text>
          <Text style={styles.required}> *</Text>
        </View>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="למשל: יש נזילה מתחת לכיור במטבח, הצינור מטפטף כבר כמה ימים..."
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
            ? 'תיאור מפורט יעזור לבעלי המקצוע להבין את הבעיה'
            : !isDescriptionValid
            ? `נדרשות לפחות ${MIN_DESCRIPTION_LENGTH} תווים (${description.length}/${MIN_DESCRIPTION_LENGTH})`
            : `${description.length} תווים`}
        </Text>
      </ScrollView>

      {/* Fixed bottom button */}
      <View style={styles.bottomBar}>
        <Button
          title="שלח לניתוח"
          onPress={handleAnalyze}
          isLoading={isAnalyzing}
          disabled={!hasImages || !isDescriptionValid}
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
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionLabel: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
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
