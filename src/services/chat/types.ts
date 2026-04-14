export interface ChatMessage {
  id: string;
  requestId: string;
  senderId: string;
  senderType: 'customer' | 'provider' | 'system';
  text: string;
  createdAt: Date;
}

export interface ChatService {
  getMessages(requestId: string): Promise<ChatMessage[]>;
  sendMessage(requestId: string, senderId: string, senderType: 'customer' | 'provider', text: string): Promise<ChatMessage>;
  onNewMessages(requestId: string, callback: (messages: ChatMessage[]) => void): () => void;
  sendSystemMessage(requestId: string, text: string): Promise<void>;
  /**
   * Delete every message in a request's chat. Used when the customer
   * cancels a provider selection so the next provider gets a clean chat.
   */
  clearMessages(requestId: string): Promise<void>;
}
