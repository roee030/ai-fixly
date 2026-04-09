/**
 * Firebase Cloud Messaging (FCM) v1 API client.
 *
 * Sends push notifications to the customer app when:
 * - A new bid arrives
 * - A provider sends a chat message
 * - A provider confirms selection
 *
 * Uses the same service account as Firestore but with a different OAuth scope.
 */

import { getAccessToken, getProjectId, SCOPES } from './googleAuth';

export interface FcmPushParams {
  serviceAccountJson: string;
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendPush(params: FcmPushParams): Promise<boolean> {
  const { serviceAccountJson, token, title, body, data } = params;

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

    const message = {
      message: {
        token,
        notification: { title, body },
        data: data || {},
        android: {
          priority: 'high' as const,
          notification: {
            sound: 'default',
            // default channel
            channel_id: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
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
