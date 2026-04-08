export interface WhatsAppMessage {
  to: string;
  body: string;
  mediaUrls?: string[];
}

export interface WhatsAppService {
  sendMessage(message: WhatsAppMessage): Promise<{ success: boolean; messageId?: string }>;
}
