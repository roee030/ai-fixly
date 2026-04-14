import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LIMITS } from '../constants/limits';

export interface PickResult {
  imageUri?: string;
  videoUri?: string;
}

export function useImagePicker() {
  const { t } = useTranslation();
  const [images, setImages] = useState<string[]>([]);

  /**
   * Open the camera and let the user choose photo OR video natively.
   * Returns the captured asset so the caller can route video to its own
   * state slot (the `images` array stores only photos).
   */
  const pickFromCamera = async (): Promise<PickResult | null> => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('imagePicker.permissionNeeded'), t('imagePicker.cameraAccessRequired'));
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
      base64: false,
      videoMaxDuration: 60,
    });

    if (result.canceled || !result.assets[0]) return null;
    const asset = result.assets[0];

    if (asset.type === 'video') {
      return { videoUri: asset.uri };
    }

    if (images.length >= LIMITS.MAX_IMAGES_PER_REQUEST) {
      Alert.alert(
        t('imagePicker.maxImagesTitle'),
        t('imagePicker.maxImagesBody', { max: LIMITS.MAX_IMAGES_PER_REQUEST }),
      );
      return null;
    }
    setImages((prev) => [...prev, asset.uri]);
    return { imageUri: asset.uri };
  };

  /**
   * Open the gallery for both photos and videos. Returns the picked video
   * URI (if any) so the caller can store it; photos are appended to the
   * internal images array.
   *
   * NOTE: previously this used `selectionLimit: MAX - images.length`,
   * which becomes 0 once the user has 5 images and silently blocks ALL
   * subsequent picker openings (the cause of the "stuck loop"). We now
   * just clamp the result to the limit.
   */
  const pickFromGallery = async (): Promise<PickResult | null> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('imagePicker.permissionNeeded'), t('imagePicker.galleryAccessRequired'));
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
      allowsMultipleSelection: true,
      videoMaxDuration: 60,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) return null;

    let pickedVideo: string | undefined;
    const newImages: string[] = [];
    for (const asset of result.assets) {
      if (asset.type === 'video') {
        if (!pickedVideo) pickedVideo = asset.uri;
      } else {
        newImages.push(asset.uri);
      }
    }
    if (newImages.length > 0) {
      setImages((prev) => [...prev, ...newImages].slice(0, LIMITS.MAX_IMAGES_PER_REQUEST));
    }
    return { videoUri: pickedVideo, imageUri: newImages[0] };
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
