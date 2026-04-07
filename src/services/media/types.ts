export interface UploadedMedia {
  storagePath: string;
  downloadUrl: string;
  type: 'image';
}

export interface MediaService {
  uploadImage(uri: string, userId: string, requestId: string): Promise<UploadedMedia>;
  getSignedUrl(storagePath: string): Promise<string>;
}
