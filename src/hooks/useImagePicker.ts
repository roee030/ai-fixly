import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LIMITS } from '../constants/limits';

export function useImagePicker() {
  const { t } = useTranslation();
  const [images, setImages] = useState<string[]>([]);

  const pickFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('imagePicker.permissionNeeded'), t('imagePicker.cameraAccessRequired'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      if (images.length >= LIMITS.MAX_IMAGES_PER_REQUEST) {
        Alert.alert(
          t('imagePicker.maxImagesTitle'),
          t('imagePicker.maxImagesBody', { max: LIMITS.MAX_IMAGES_PER_REQUEST }),
        );
        return;
      }
      setImages((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('imagePicker.permissionNeeded'), t('imagePicker.galleryAccessRequired'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: LIMITS.MAX_IMAGES_PER_REQUEST - images.length,
      base64: true,
    });

    if (!result.canceled) {
      const newUris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...newUris].slice(0, LIMITS.MAX_IMAGES_PER_REQUEST));
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const getBase64Images = async (): Promise<string[]> => {
    const base64Images: string[] = [];
    for (const uri of images) {
      const response = await fetch(uri);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(blob);
      });
      base64Images.push(base64);
    }
    return base64Images;
  };

  return { images, pickFromCamera, pickFromGallery, removeImage, getBase64Images, hasImages: images.length > 0 };
}
