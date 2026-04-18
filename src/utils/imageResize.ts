import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Shrink a picked image before we base64-encode it for Gemini.
 *
 * expo-image-picker returns full-resolution files (often 4K, 2-4 MB) even
 * when `quality: 0.8` is set — the quality flag only affects the JPEG
 * compressor, not the dimensions. Sending those through the AI pipeline
 * was the main reason analysis took ~20 s.
 *
 * We resize the long edge to `maxDim` (preserving aspect ratio) and
 * re-compress at `quality`. 1024 px is plenty for the profession
 * classifier — the model doesn't need to count pixels, just identify
 * "this is a leaking sink".
 *
 * Returns the base64 payload along with its byte size so the caller can
 * log it.
 */
export interface ResizedBase64 {
  base64: string;
  /** Approximate size of the encoded image in kilobytes. */
  sizeKB: number;
}

const DEFAULTS = {
  maxDim: 1024,
  quality: 0.6,
};

export async function resizeToBase64(
  uri: string,
  options: { maxDim?: number; quality?: number } = {},
): Promise<ResizedBase64> {
  const { maxDim = DEFAULTS.maxDim, quality = DEFAULTS.quality } = options;

  // `resize: { width: maxDim }` keeps aspect ratio and only scales DOWN
  // (image-manipulator never upsamples when only width is supplied) —
  // so portrait photos still come out ≤ maxDim on the long edge.
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxDim } }],
    {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    },
  );
  const b64 = result.base64 || '';
  return {
    base64: b64,
    // base64 is 4/3 the size of the raw bytes. Round to the nearest KB.
    sizeKB: Math.round((b64.length * 3) / 4 / 1024),
  };
}
