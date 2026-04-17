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
  /**
   * Stable tag used to REPLACE the previous tray notification with the same
   * tag (Android) and a matching iOS APNS thread. Perfect for "N offers"
   * style updates where we don't want to pile up a notification per bid.
   */
  tag?: string;
  /**
   * iOS badge count. Usually the current number of unread items (bids,
   * messages, etc.) — set to 0 to clear, undefined to leave the badge alone.
   */
  badge?: number;
}

export async function sendPush(params: FcmPushParams): Promise<boolean> {
  const { serviceAccountJson, token, title, body, data, imageUrl, tag, badge } = params;

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
          // Collapse key lets a newer push replace the previous one while the
          // device is offline. Tag additionally replaces the tray entry on
          // arrival, so repeat notifications (e.g. "2nd bid", "3rd bid") show
          // up as ONE updating entry instead of a stack.
          collapse_key: tag || data?.requestId || undefined,
          notification: {
            sound: 'default',
            body,
            notification_priority: 'PRIORITY_HIGH' as const,
            visibility: 'PUBLIC' as const,
            color: BRAND_COLOR,
            default_vibrate_timings: true,
            default_light_settings: true,
            ...(tag ? { tag } : {}),
            ...(imageUrl ? { image: imageUrl } : {}),
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              ...(typeof badge === 'number' ? { badge } : { badge: 1 }),
              'mutable-content': 1,
              'content-available': 1,
              // thread-id groups pushes in the iOS tray so multiple bids on
              // the same request collapse under one "ai-fixly" conversation.
              ...(tag ? { 'thread-id': tag } : {}),
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
