/**
 * Twilio WhatsApp send integration.
 *
 * Uses the Twilio Messages API to send WhatsApp messages via the sandbox or
 * production WhatsApp Business Account.
 *
 * Docs: https://www.twilio.com/docs/messaging/api/message-resource
 */

export interface SendWhatsAppParams {
  accountSid: string;
  authToken: string;
  from: string; // e.g. "whatsapp:+14155238886"
  to: string; // e.g. "+972501234567" (we prepend "whatsapp:")
  body: string;
  mediaUrls?: string[];
}

export interface TwilioSendResult {
  success: boolean;
  messageSid?: string;
  error?: string;
}

export async function sendWhatsAppMessage(params: SendWhatsAppParams): Promise<TwilioSendResult> {
  const { accountSid, authToken, from, to, body, mediaUrls } = params;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const formData = new URLSearchParams();
  formData.append('From', from);
  formData.append('To', toWhatsAppAddress(to));
  formData.append('Body', body);

  if (mediaUrls && mediaUrls.length > 0) {
    // Twilio supports up to 10 media URLs per message
    mediaUrls.slice(0, 10).forEach((mediaUrl) => {
      formData.append('MediaUrl', mediaUrl);
    });
  }

  // HTTP Basic auth with accountSid:authToken
  const credentials = btoa(`${accountSid}:${authToken}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = (await response.json()) as { sid?: string; message?: string };

    if (!response.ok) {
      return { success: false, error: data.message || `HTTP ${response.status}` };
    }

    return { success: true, messageSid: data.sid };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

function toWhatsAppAddress(phone: string): string {
  if (phone.startsWith('whatsapp:')) return phone;
  return `whatsapp:${phone}`;
}

/**
 * Send a WhatsApp message that may carry many media files.
 *
 * Twilio's WhatsApp transport (and the sandbox in particular) only delivers
 * ONE media attachment per outbound message. If we just pass MediaUrl 5 times
 * we either get rejected or only the first one is shown. To keep the provider
 * experience close to "I got all the photos and videos", we send the body
 * + first media as one message, then queue the rest as media-only follow-ups.
 *
 * Returns the result of the FIRST send, since that's the one the user reads
 * the body from. Failures of follow-up sends are logged but do not fail the
 * overall call — better to have the body+1 photo than nothing.
 */
export async function sendWhatsAppWithAllMedia(
  baseParams: Omit<SendWhatsAppParams, 'mediaUrls'> & { mediaUrls?: string[] },
): Promise<TwilioSendResult> {
  const { mediaUrls, body, ...rest } = baseParams;

  if (!mediaUrls || mediaUrls.length === 0) {
    return sendWhatsAppMessage({ ...rest, body, mediaUrls: undefined });
  }

  const first = await sendWhatsAppMessage({
    ...rest,
    body,
    mediaUrls: [mediaUrls[0]],
  });

  // Send remaining media in parallel, but skip the body — the recipient
  // already has the explanation from the first message. Cap at 10 total to
  // match Twilio's documented limit and to avoid spamming.
  const followups = mediaUrls.slice(1, 10);
  if (followups.length > 0) {
    await Promise.all(
      followups.map((url, i) =>
        sendWhatsAppMessage({ ...rest, body: '', mediaUrls: [url] }).catch((err) => {
          console.warn(`Follow-up media #${i + 2} failed:`, err);
          return { success: false } as TwilioSendResult;
        }),
      ),
    );
  }

  return first;
}
