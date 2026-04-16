export const LIMITS = {
  MAX_VIDEO_DURATION_SEC: 60,
  MAX_IMAGE_SIZE_MB: 10,
  MAX_IMAGES_PER_REQUEST: 5,
  // Video size limits. Chosen so a 60-second 720p clip (≈5–20 MB) always
  // fits comfortably, a 4K/HDR clip triggers a warning, and anything that
  // would blow past our Supabase upload budget (free tier is 50 MB/file by
  // default) is rejected. If those budgets change, update here.
  MAX_VIDEO_SIZE_MB: 50,
  WARN_VIDEO_SIZE_MB: 25,
  MAX_TOTAL_UPLOAD_MB: 150,
  BID_WINDOW_MINUTES: 30,
  SEARCH_RADIUS_KM: 15,
  MAX_ACTIVE_REQUESTS: 3,
  MIN_BID_PRICE: 50,
  OTP_LENGTH: 6,
  OTP_TIMEOUT_SEC: 60,
  PHONE_NUMBER_MIN_LENGTH: 10,
  DISPLAY_NAME_MIN_LENGTH: 2,
  DISPLAY_NAME_MAX_LENGTH: 50,
} as const;
