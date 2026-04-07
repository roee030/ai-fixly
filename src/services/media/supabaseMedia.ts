import { supabase } from '../../config/supabase';
import { MediaService, UploadedMedia } from './types';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

const BUCKET_NAME = 'request-media';

class SupabaseMediaService implements MediaService {
  async uploadImage(
    uri: string,
    userId: string,
    requestId: string
  ): Promise<UploadedMedia> {
    const filename = `${Date.now()}.jpg`;
    const storagePath = `${requestId}/${filename}`;

    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, decode(base64), {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    return {
      storagePath,
      downloadUrl: urlData.publicUrl,
      type: 'image',
    };
  }

  async getSignedUrl(storagePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, 3600); // 1 hour expiry

    if (error) {
      throw new Error(`Signed URL failed: ${error.message}`);
    }

    return data.signedUrl;
  }
}

export const mediaService: MediaService = new SupabaseMediaService();
