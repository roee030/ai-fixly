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

export interface SendWhatsAppTemplateParams {
  accountSid: string;
  authToken: string;
  from: string;
  to: string;
  /** Pre-approved Twilio Content SID (HXxxxxxxxxxxxxxxxxxx). */
  contentSid: string;
  /**
   * Template variables keyed by the number Twilio expects in the template
   * body, e.g. { "1": "תל אביב", "2": "abc123", "3": "+972501234567" }.
   */
  contentVariables: Record<string, string>;
  mediaUrls?: string[];
}

/**
 * Send a WhatsApp message using a pre-approved Twilio Content Template.
 * Use this for interactive / CTA-button messages — the plain-text
 * sendWhatsAppMessage can only attach inline links, not buttons.
 *
 * Template creation is a one-time manual step in the Twilio Console:
 *   https://console.twilio.com/us1/develop/content/templates
 * and requires WhatsApp approval (24–72h). See
 *   docs/plans/2026-04-17-whatsapp-interactive-buttons.md
 * for the full recipe we use for the provider-intro template.
 */
export async function sendWhatsAppTemplate(
  params: SendWhatsAppTemplateParams,
): Promise<TwilioSendResult> {
  const { accountSid, authToken, from, to, contentSid, contentVariables, mediaUrls } = params;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const formData = new URLSearchParams();
  formData.append('From', from);
  formData.append('To', toWhatsAppAddress(to));
  formData.append('ContentSid', contentSid);
  formData.append('ContentVariables', JSON.stringify(contentVariables));

  if (mediaUrls && mediaUrls.length > 0) {
    mediaUrls.slice(0, 10).forEach((mediaUrl) => formData.append('MediaUrl', mediaUrl));
  }

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
