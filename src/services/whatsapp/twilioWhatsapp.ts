import { WhatsAppService, WhatsAppMessage } from './types';
import { logger } from '../logger';

const TWILIO_API_URL = 'https://api.twilio.com/2010-04-01/Accounts';

class TwilioWhatsAppService implements WhatsAppService {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.fromNumber = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
  }

  async sendMessage(message: WhatsAppMessage): Promise<{ success: boolean; messageId?: string }> {
    const url = `${TWILIO_API_URL}/${this.accountSid}/Messages.json`;

    const body = new URLSearchParams();
    body.append('To', `whatsapp:${message.to}`);
    body.append('From', this.fromNumber);
    body.append('Body', message.body);

    if (message.mediaUrls) {
      message.mediaUrls.forEach((mediaUrl) => {
        body.append('MediaUrl', mediaUrl);
      });
    }

    const credentials = btoa(`${this.accountSid}:${this.authToken}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error('Twilio send failed', new Error(data.message || 'Unknown error'), {
          status: response.status.toString(),
          to: message.to,
        });
        return { success: false };
      }

      logger.info('WhatsApp message sent', { to: message.to, sid: data.sid });
      return { success: true, messageId: data.sid };
    } catch (err: unknown) {
      logger.error('WhatsApp send error', err as Error);
      return { success: false };
    }
  }
}

export const twilioWhatsAppService: WhatsAppService = new TwilioWhatsAppService();
