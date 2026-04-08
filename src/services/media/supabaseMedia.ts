import { supabase } from '../../config/supabase';
import { MediaService, UploadedMedia } from './types';
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

    // Use FormData for React Native file upload
    const formData = new FormData();
    formData.append('file', {
      uri,
      name: filename,
      type: 'image/jpeg',
    } as any);

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    const response = await fetch(
      `${supabaseUrl}/storage/v1/object/${BUCKET_NAME}/${storagePath}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey!,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${errorText}`);
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
      .createSignedUrl(storagePath, 3600);

    if (error) {
      throw new Error(`Signed URL failed: ${error.message}`);
    }

    return data.signedUrl;
  }
}

export const mediaService: MediaService = new SupabaseMediaService();
