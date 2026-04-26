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

/**
 * Result of an FCM send attempt. The caller can react to specific
 * failure modes:
 *   - `kind: 'no_token'` — user has no registered FCM token (skip).
 *   - `kind: 'invalid_token'` — FCM 404 / NotRegistered. Caller should
 *     delete the token from the user doc so we don't keep retrying it.
 *   - `kind: 'transient'` — 5xx or network. Caller may retry or alert.
 *   - `kind: 'ok'` — push delivered to FCM (the device may still drop it,
 *     but the service accepted it).
 */
export type FcmSendResult =
  | { kind: 'ok' }
  | { kind: 'no_token' }
  | { kind: 'invalid_token'; statusCode: number; body: string }
  | { kind: 'transient'; statusCode: number; body: string }
  | { kind: 'fatal'; error: string };

/**
 * Send a push and return a structured result. The legacy `sendPush`
 * boolean wrapper is kept below for callers that don't care about
 * specifics, but new code should prefer this so it can react to
 * "token revoked" by clearing the stale token.
 */
export async function sendPushDetailed(params: FcmPushParams): Promise<FcmSendResult> {
  const { serviceAccountJson, token, title, body, data, imageUrl, tag, badge } = params;

  if (!token) {
    console.log('[fcm] no token, skipping push');
    return { kind: 'no_token' };
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
          collapse_key: tag || data?.requestId || undefined,
          notification: {
            // Deliberately NOT specifying channel_id. When omitted, Android
            // routes the message to the FCM-auto-created "Miscellaneous"
            // channel that RN Firebase creates on first token registration.
            // Specifying a channel_id that doesn't exist on the device
            // suppresses the banner silently.
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
      return mapFcmErrorResponse(response.status, errText);
    }

    console.log('[fcm] push sent', { title });
    return { kind: 'ok' };
  } catch (err) {
    console.error('FCM send failed:', err);
    return { kind: 'fatal', error: String(err).slice(0, 200) };
  }
}

/**
 * Pure decoder: turn an FCM error response into the discriminated result
 * the caller acts on. Exported so tests can assert the mapping without
 * wiring up the full sign-JWT-call-FCM dance.
 *
 * Rules:
 *   - 404 / 410 / UNREGISTERED / NOT_FOUND → invalid_token (delete it)
 *   - 5xx / 429                            → transient (caller may retry)
 *   - everything else                      → fatal (log and move on)
 */
export function mapFcmErrorResponse(statusCode: number, body: string): FcmSendResult {
  // 404 = the registration token was deleted on the device side
  // (user uninstalled, cleared data, or token rotated). 410 is the
  // legacy NotRegistered status. FCM v1 sometimes returns 400 with
  // `errorCode: UNREGISTERED` in the body. In every case the token is
  // dead forever — caller should delete it.
  if (
    statusCode === 404 ||
    statusCode === 410 ||
    body.includes('UNREGISTERED') ||
    body.includes('NOT_FOUND')
  ) {
    return { kind: 'invalid_token', statusCode, body: body.slice(0, 500) };
  }
  // 5xx or 429 are retryable; surface as transient so caller can decide.
  if (statusCode >= 500 || statusCode === 429) {
    return { kind: 'transient', statusCode, body: body.slice(0, 500) };
  }
  return { kind: 'fatal', error: `FCM ${statusCode}: ${body.slice(0, 200)}` };
}

/**
 * Legacy boolean wrapper. Prefer sendPushDetailed in new code so you can
 * tell apart "token is dead, delete it" from "FCM had a bad minute, retry".
 */
export async function sendPush(params: FcmPushParams): Promise<boolean> {
  const result = await sendPushDetailed(params);
  return result.kind === 'ok';
}
