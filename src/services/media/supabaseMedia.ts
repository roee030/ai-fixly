import { supabase } from '../../config/supabase';
import { MediaService, UploadedMedia } from './types';
import { captureException } from '../errorReporting';

const BUCKET_NAME = 'request-media';

class SupabaseMediaService implements MediaService {
  async uploadImage(
    uri: string,
    userId: string,
    requestId: string
  ): Promise<UploadedMedia> {
    return this.uploadFile({
      uri,
      requestId,
      extension: 'jpg',
      contentType: 'image/jpeg',
      type: 'image',
    });
  }

  async uploadVideo(
    uri: string,
    userId: string,
    requestId: string,
    thumbnailUri?: string,
  ): Promise<UploadedMedia> {
    // Upload the video itself first — the mp4 blob is the source of truth.
    const videoMedia = await this.uploadFile({
      uri,
      requestId,
      extension: 'mp4',
      contentType: 'video/mp4',
      type: 'video',
    });

    // Optional companion poster. We upload it under a predictable suffix so
    // the two assets stay linked even though Supabase treats them as
    // independent objects. Failure to upload the poster should NOT fail the
    // video upload — the video is what matters.
    if (thumbnailUri) {
      try {
        const posterMedia = await this.uploadFile({
          uri: thumbnailUri,
          requestId,
          extension: 'jpg',
          contentType: 'image/jpeg',
          type: 'image',
          suffix: 'poster',
        });
        videoMedia.thumbnailUrl = posterMedia.downloadUrl;
      } catch (err) {
        // Poster upload is best-effort — videos still play without it,
        // they just look uglier in the bid card thumbnail. Capture so we
        // can spot a systemic poster-extraction regression.
        captureException(err, {
          tags: { service: 'media', kind: 'video_poster' },
          extra: { requestId },
          level: 'warning',
        });
      }
    }

    return videoMedia;
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

  /**
   * Shared upload path used by both image and video flows. Keeps the Supabase
   * auth + public-URL logic in one place so the two entry points stay in
   * sync (same bucket, same key format, same headers).
   */
  private async uploadFile(args: {
    uri: string;
    requestId: string;
    extension: string;
    contentType: string;
    type: 'image' | 'video';
    /** Optional suffix appended to the filename before the extension. */
    suffix?: string;
  }): Promise<UploadedMedia> {
    const { uri, requestId, extension, contentType, type, suffix } = args;
    const baseName = `${Date.now()}${suffix ? `_${suffix}` : ''}`;
    const filename = `${baseName}.${extension}`;
    const storagePath = `${requestId}/${filename}`;

    // Use FormData for React Native file upload — works for mp4 the same way
    // it works for jpg as long as the `type` field is correct.
    const formData = new FormData();
    formData.append('file', {
      uri,
      name: filename,
      type: contentType,
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
      type,
    };
  }
}

export const mediaService: MediaService = new SupabaseMediaService();
