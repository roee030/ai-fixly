/**
 * Safe wrapper around `expo-video-thumbnails`.
 *
 * Like the VideoPreview component, this optional-requires the native module
 * so APK builds that haven't yet been rebuilt to include it keep working —
 * they just don't get thumbnails (the UI falls back to a play-icon tile).
 *
 * After a fresh `npx expo run:android` the native module is present and
 * real thumbnails appear automatically.
 */

let VideoThumbnailsModule: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  VideoThumbnailsModule = require('expo-video-thumbnails');
} catch {
  VideoThumbnailsModule = null;
}

/**
 * Generate a static JPG thumbnail from a video URI.
 * Returns undefined if the native module isn't available or generation fails.
 * Never throws — the caller can safely ignore a missing thumbnail.
 */
export async function generateVideoThumbnail(videoUri: string): Promise<string | undefined> {
  if (!VideoThumbnailsModule?.getThumbnailAsync) return undefined;
  try {
    const { uri } = await VideoThumbnailsModule.getThumbnailAsync(videoUri, {
      // Pull a frame from ~1 second in — the very first frame is often
      // black (auto-exposure hasn't kicked in yet on most phones).
      time: 1000,
      quality: 0.6,
    });
    return uri;
  } catch {
    return undefined;
  }
}
