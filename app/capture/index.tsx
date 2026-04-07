import { useState } from 'react';
import { View, Text, Image, ScrollView, Pressable, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../src/components/layout';
import { Button } from '../../src/components/ui';
import { useImagePicker } from '../../src/hooks/useImagePicker';
import { COLORS, LIMITS } from '../../src/constants';

export default function CaptureScreen() {
  const { images, pickFromCamera, pickFromGallery, removeImage, getBase64Images, hasImages } = useImagePicker();
  const [description, setDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!hasImages) return;
    setIsAnalyzing(true);
    try {
      const base64Images = await getBase64Images();
      router.push({
        pathname: '/capture/confirm',
        params: {
          images: JSON.stringify(images),
          base64Images: JSON.stringify(base64Images),
          description,
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
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 24 }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 16 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </Pressable>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: COLORS.text }}>מה הבעיה?</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, maxHeight: 160 }}>
        {images.map((uri, index) => (
          <View key={index} style={{ marginRight: 8, position: 'relative' }}>
            <Image source={{ uri }} style={{ width: 120, height: 150, borderRadius: 12 }} />
            <Pressable
              onPress={() => removeImage(index)}
              style={{
                position: 'absolute', top: 4, right: 4,
                backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12,
                width: 24, height: 24, alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={16} color="#FFF" />
            </Pressable>
          </View>
        ))}
        {images.length < LIMITS.MAX_IMAGES_PER_REQUEST && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={pickFromCamera}
              style={{
                width: 120, height: 150, borderRadius: 12, backgroundColor: COLORS.surface,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
              }}
            >
              <Ionicons name="camera" size={32} color={COLORS.primary} />
              <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 8 }}>צלם</Text>
            </Pressable>
            <Pressable
              onPress={pickFromGallery}
              style={{
                width: 120, height: 150, borderRadius: 12, backgroundColor: COLORS.surface,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
              }}
            >
              <Ionicons name="images" size={32} color={COLORS.primary} />
              <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 8 }}>גלריה</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 }}>תאר את הבעיה (אופציונלי)</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="למשל: יש נזילה מתחת לכיור במטבח..."
        placeholderTextColor={COLORS.textTertiary}
        multiline
        numberOfLines={4}
        style={{
          backgroundColor: COLORS.surface, color: COLORS.text, borderRadius: 12,
          padding: 16, fontSize: 16, minHeight: 100, textAlignVertical: 'top', marginBottom: 24,
        }}
      />
      <View style={{ flex: 1 }} />
      <Button title={isAnalyzing ? 'מנתח...' : 'שלח לניתוח AI'} onPress={handleAnalyze} isLoading={isAnalyzing} disabled={!hasImages} />
    </ScreenContainer>
  );
}
