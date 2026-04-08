import { WhatsAppService, WhatsAppMessage } from './types';
import { logger } from '../logger';

class MockWhatsAppService implements WhatsAppService {
  async sendMessage(message: WhatsAppMessage): Promise<{ success: boolean; messageId?: string }> {
    logger.info('[MOCK WhatsApp] Would send message', {
      to: message.to,
      bodyLength: message.body.length.toString(),
      mediaCount: (message.mediaUrls?.length || 0).toString(),
    });

    if (__DEV__) {
      console.log('=== MOCK WHATSAPP MESSAGE ===');
      console.log('To:', message.to);
      console.log('Body:', message.body);
      console.log('Media:', message.mediaUrls);
      console.log('============================');
    }

    return { success: true, messageId: `mock_${Date.now()}` };
  }
}

export const mockWhatsAppService: WhatsAppService = new MockWhatsAppService();
