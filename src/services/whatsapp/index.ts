import { twilioWhatsAppService } from './twilioWhatsapp';
import { mockWhatsAppService } from './mockWhatsapp';
import type { WhatsAppService } from './types';

// Use mock in development, Twilio in production
// Change this flag to test with real Twilio sandbox
const USE_REAL_WHATSAPP = false;

export const whatsAppService: WhatsAppService = USE_REAL_WHATSAPP
  ? twilioWhatsAppService
  : mockWhatsAppService;

export type { WhatsAppService, WhatsAppMessage } from './types';
