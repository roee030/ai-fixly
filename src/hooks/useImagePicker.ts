import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
// Use the legacy entry point. SDK 54 deprecated the top-level `getInfoAsync`
// in favour of the new `File` / `Directory` classes, but the legacy API is
// still fully supported and keeps our size-check one-liner intact without
// a larger refactor.
import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LIMITS } from '../constants/limits';
import { generateVideoThumbnail } from '../utils/videoThumbnail';

export interface VideoAsset {
  uri: string;
  /** Optional poster frame (JPG URI) generated from the video. */
  thumbnailUri?: string;
  /** Size in bytes. Used to enforce per-file and total upload budgets. */
  sizeBytes: number;
}

export interface PickResult {
  imageUris: string[];
  videoAssets: VideoAsset[];
}

const MB = 1024 * 1024;

/**
 * Unified media picker hook.
 *
 * Videos are stored as `{ uri, thumbnailUri, sizeBytes }` rather than plain
 * URIs so the UI can render a real poster frame AND show / enforce size
 * budgets without re-stat'ing the file on every render.
 *
 * Size policy (see LIMITS):
 *   < WARN_VIDEO_SIZE_MB  — silent, looks normal.
 *   ≥ WARN_VIDEO_SIZE_MB  — accepted but the tile shows the MB in yellow
 *                           so the user knows the upload will be slow.
 *   > MAX_VIDEO_SIZE_MB   — rejected with a clear "too large" message.
 */
export function useImagePicker() {
  const { t } = useTranslation();
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<VideoAsset[]>([]);

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

  /**
   * Measure the video, generate a thumbnail, and reject if oversized.
   * Returns null if the file is too big or unreadable (an Alert has been
   * shown to the user in that case).
   */
  const enrichVideoAsset = async (uri: string): Promise<VideoAsset | null> => {
    const info = await FileSystem.getInfoAsync(uri).catch(() => null);
    const sizeBytes = (info && 'size' in info && typeof info.size === 'number') ? info.size : 0;
    const sizeMB = sizeBytes / MB;

    if (sizeMB > LIMITS.MAX_VIDEO_SIZE_MB) {
      Alert.alert(
        t('imagePicker.videoTooLargeTitle'),
        t('imagePicker.videoTooLargeBody', {
          size: sizeMB.toFixed(1),
          max: LIMITS.MAX_VIDEO_SIZE_MB,
        }),
      );
      return null;
    }

    const thumbnailUri = await generateVideoThumbnail(uri);
    return { uri, thumbnailUri, sizeBytes };
  };

  const addVideo = async (uri: string) => {
    const asset = await enrichVideoAsset(uri);
    if (!asset) return;
    setVideos((prev) => [...prev, asset]);
  };

  /**
   * Run an ImagePicker call and turn native "Failed to write a file" /
   * "Cannot access" errors into a human-readable Alert. Android copies the
   * picked asset into the app's cache; that copy can fail for huge files or
   * when the device is low on space, and we should not let that propagate
   * as an uncaught rejection.
   */
  const runPicker = async <T>(
    pick: () => Promise<T>,
  ): Promise<T | null> => {
    try {
      return await pick();
    } catch (err: any) {
      const message = String(err?.message || err || '');
      const isCopyFailure =
        message.includes('Failed to write a file') ||
        message.includes('ENOSPC') ||
        message.includes('No space');
      Alert.alert(
        t('imagePicker.pickFailedTitle'),
        isCopyFailure
          ? t('imagePicker.pickFailedLargeBody')
          : t('imagePicker.pickFailedBody'),
      );
      return null;
    }
  };

  const takePhoto = async (): Promise<PickResult | null> => {
    if (!(await ensureCameraPermission())) return null;
    const result = await runPicker(() =>
      ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        base64: false,
      }),
    );
    if (!result || result.canceled || !result.assets[0]) return null;
    addImage(result.assets[0].uri);
    return { imageUris: [result.assets[0].uri], videoAssets: [] };
  };

  const recordVideo = async (): Promise<PickResult | null> => {
    if (!(await ensureCameraPermission())) return null;
    const result = await runPicker(() =>
      ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        quality: 0.8,
        videoMaxDuration: LIMITS.MAX_VIDEO_DURATION_SEC,
      }),
    );
    if (!result || result.canceled || !result.assets[0]) return null;
    const asset = await enrichVideoAsset(result.assets[0].uri);
    if (!asset) return null;
    setVideos((prev) => [...prev, asset]);
    return { imageUris: [], videoAssets: [asset] };
  };

  const pickFromGallery = async (): Promise<PickResult | null> => {
    if (!(await ensureLibraryPermission())) return null;
    const result = await runPicker(() =>
      ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.8,
        allowsMultipleSelection: true,
        videoMaxDuration: LIMITS.MAX_VIDEO_DURATION_SEC,
      }),
    );
    if (!result || result.canceled || !result.assets || result.assets.length === 0) return null;

    const newImages: string[] = [];
    const rawVideoUris: string[] = [];
    for (const asset of result.assets) {
      if (asset.type === 'video') rawVideoUris.push(asset.uri);
      else newImages.push(asset.uri);
    }

    if (newImages.length > 0) {
      setImages((prev) => [...prev, ...newImages].slice(0, LIMITS.MAX_IMAGES_PER_REQUEST));
    }

    // Enrich each video sequentially so any size-rejection Alert fires
    // before we try to show the next one.
    const newAssets: VideoAsset[] = [];
    for (const uri of rawVideoUris) {
      const asset = await enrichVideoAsset(uri);
      if (asset) newAssets.push(asset);
    }
    if (newAssets.length > 0) {
      setVideos((prev) => [...prev, ...newAssets]);
    }

    return { imageUris: newImages, videoAssets: newAssets };
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

  /** Sum of all picked video sizes, in bytes. Images are bounded by count × quality. */
  const totalVideoBytes = videos.reduce((sum, v) => sum + v.sizeBytes, 0);

  return {
    images,
    videos,
    takePhoto,
    recordVideo,
    pickFromGallery,
    removeImage,
    removeVideo,
    getBase64Images,
    totalVideoBytes,
    hasMedia: images.length > 0 || videos.length > 0,
    hasImages: images.length > 0,
  };
}
