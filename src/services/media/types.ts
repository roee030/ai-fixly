export interface UploadedMedia {
  storagePath: string;
  downloadUrl: string;
  type: 'image' | 'video';
  /** Public URL of a JPG poster frame, for videos only. */
  thumbnailUrl?: string;
}

export interface MediaService {
  uploadImage(uri: string, userId: string, requestId: string): Promise<UploadedMedia>;
  /**
   * Upload a video file. Optional `thumbnailUri` is uploaded alongside the
   * video so the WhatsApp message + provider preview can show a still frame
   * instead of just a "video" placeholder.
   */
  uploadVideo(
    uri: string,
    userId: string,
    requestId: string,
    thumbnailUri?: string,
  ): Promise<UploadedMedia>;
  getSignedUrl(storagePath: string): Promise<string>;
}
