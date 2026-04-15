import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LIMITS } from '../constants/limits';

export interface PickResult {
  imageUris: string[];
  videoUris: string[];
}

/**
 * Unified media picker hook. Stores photos and videos in separate arrays so
 * callers can render thumbnails uniformly while still knowing the media type.
 *
 * Design note: earlier versions of this hook restricted camera to a combined
 * "photo or video" mediaType. On some devices this caused video recordings
 * to be saved as a single still frame (iOS's "mixed" mode sometimes behaves
 * that way). We now expose `takePhoto` and `recordVideo` as distinct actions
 * so the caller can make the intent explicit and the system camera always
 * launches in the correct mode.
 */
export function useImagePicker() {
  const { t } = useTranslation();
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);

  const ensureCameraPermission = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('imagePicker.permissionNeeded'), t('imagePicker.cameraAccessRequired'));
      return false;
    }
    return true;
  };

  const ensureLibraryPermission = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('imagePicker.permissionNeeded'), t('imagePicker.galleryAccessRequired'));
      return false;
    }
    return true;
  };

  const addImage = (uri: string) =>
    setImages((prev) => {
      if (prev.length >= LIMITS.MAX_IMAGES_PER_REQUEST) {
        Alert.alert(
          t('imagePicker.maxImagesTitle'),
          t('imagePicker.maxImagesBody', { max: LIMITS.MAX_IMAGES_PER_REQUEST }),
        );
        return prev;
      }
      return [...prev, uri];
    });

  const addVideo = (uri: string) => setVideos((prev) => [...prev, uri]);

  const takePhoto = async (): Promise<PickResult | null> => {
    if (!(await ensureCameraPermission())) return null;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: false,
    });
    if (result.canceled || !result.assets[0]) return null;
    addImage(result.assets[0].uri);
    return { imageUris: [result.assets[0].uri], videoUris: [] };
  };

  const recordVideo = async (): Promise<PickResult | null> => {
    if (!(await ensureCameraPermission())) return null;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      quality: 0.8,
      videoMaxDuration: 60,
    });
    if (result.canceled || !result.assets[0]) return null;
    addVideo(result.assets[0].uri);
    return { imageUris: [], videoUris: [result.assets[0].uri] };
  };

  const pickFromGallery = async (): Promise<PickResult | null> => {
    if (!(await ensureLibraryPermission())) return null;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
      allowsMultipleSelection: true,
      videoMaxDuration: 60,
    });
    if (result.canceled || !result.assets || result.assets.length === 0) return null;

    const newImages: string[] = [];
    const newVideos: string[] = [];
    for (const asset of result.assets) {
      if (asset.type === 'video') newVideos.push(asset.uri);
      else newImages.push(asset.uri);
    }
    if (newImages.length > 0) {
      setImages((prev) => [...prev, ...newImages].slice(0, LIMITS.MAX_IMAGES_PER_REQUEST));
    }
    if (newVideos.length > 0) {
      setVideos((prev) => [...prev, ...newVideos]);
    }
    return { imageUris: newImages, videoUris: newVideos };
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    setVideos((prev) => prev.filter((_, i) => i !== index));
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

  return {
    images,
    videos,
    takePhoto,
    recordVideo,
    pickFromGallery,
    removeImage,
    removeVideo,
    getBase64Images,
    hasMedia: images.length > 0 || videos.length > 0,
    hasImages: images.length > 0,
  };
}
