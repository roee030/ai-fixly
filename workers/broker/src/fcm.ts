/**
 * Firebase Cloud Messaging (FCM) v1 API client.
 *
 * Sends push notifications to the customer app when:
 * - A new bid arrives
 * - A provider sends a chat message
 * - A provider confirms selection
 *
 * Uses modern FCM v1 styling: accent color, big text expansion, high priority,
 * default sound, and optional image for big-picture layout.
 *
 * Uses the same service account as Firestore but with a different OAuth scope.
 */

import { getAccessToken, getProjectId, SCOPES } from './googleAuth';

// Brand accent color — matches COLORS.primary in the RN app (#6366F1 indigo).
// Shown as the small-icon tint and the left accent bar on Android.
const BRAND_COLOR = '#6366F1';

export interface FcmPushParams {
  serviceAccountJson: string;
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  /** Optional hero image URL (Android BigPictureStyle). */
  imageUrl?: string;
}

export async function sendPush(params: FcmPushParams): Promise<boolean> {
  const { serviceAccountJson, token, title, body, data, imageUrl } = params;

  if (!token) {
    console.log('[fcm] no token, skipping push');
    return false;
  }

  try {
    const projectId = getProjectId(serviceAccountJson);
    const accessToken = await getAccessToken({
      serviceAccountJson,
      scope: SCOPES.FCM,
    });

    const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    // FCM v1 message. Docs:
    //   https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages
    const message = {
      message: {
        token,
        notification: {
          title,
          body,
          ...(imageUrl ? { image: imageUrl } : {}),
        },
        data: data || {},
        android: {
          priority: 'high' as const,
          // Collapse key lets a newer push with the same requestId replace
          // the previous one in the tray instead of stacking — cleaner UX.
          collapse_key: data?.requestId || undefined,
          notification: {
            sound: 'default',
            // BigText lets the body wrap to multiple lines when expanded.
            // Without this, long bodies are truncated to one line.
            body,
            notification_priority: 'PRIORITY_HIGH' as const,
            visibility: 'PUBLIC' as const,
            // Accent color tints the small icon and the left edge bar.
            color: BRAND_COLOR,
            default_vibrate_timings: true,
            default_light_settings: true,
            ...(imageUrl ? { image: imageUrl } : {}),
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              'mutable-content': 1,
              'content-available': 1,
            },
          },
          ...(imageUrl
            ? {
                fcm_options: {
                  image: imageUrl,
                },
              }
            : {}),
        },
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`FCM send error ${response.status}: ${errText}`);
      return false;
    }

    console.log('[fcm] push sent', { title });
    return true;
  } catch (err) {
    console.error('FCM send failed:', err);
    return false;
  }
}
