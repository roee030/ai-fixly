import { getStorage, ref, uploadBytes, getDownloadURL } from '@react-native-firebase/storage';
import { MediaService, UploadedMedia } from './types';

class FirebaseMediaService implements MediaService {
  private storage = getStorage();

  async uploadImage(
    uri: string,
    userId: string,
    requestId: string
  ): Promise<UploadedMedia> {
    const filename = `${Date.now()}.jpg`;
    const storagePath = `requests/${requestId}/${filename}`;
    const storageRef = ref(this.storage, storagePath);

    const response = await fetch(uri);
    const blob = await response.blob();

    await uploadBytes(storageRef, blob);
    const downloadUrl = await getDownloadURL(storageRef);

    return {
      storagePath,
      downloadUrl,
      type: 'image',
    };
  }

  async getSignedUrl(storagePath: string): Promise<string> {
    const storageRef = ref(this.storage, storagePath);
    return getDownloadURL(storageRef);
  }
}

export const mediaService: MediaService = new FirebaseMediaService();
