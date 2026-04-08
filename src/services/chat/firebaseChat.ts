import {
  getFirestore, collection, doc, setDoc, getDocs, query,
  orderBy, onSnapshot, serverTimestamp,
} from '@react-native-firebase/firestore';
import { ChatService, ChatMessage } from './types';
import { logger } from '../logger';

class FirebaseChatService implements ChatService {
  private db = getFirestore();

  private getCollectionPath(requestId: string) {
    return `serviceRequests/${requestId}/messages`;
  }

  async getMessages(requestId: string): Promise<ChatMessage[]> {
    const q = query(
      collection(this.db, this.getCollectionPath(requestId)),
      orderBy('createdAt', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => this.docToMessage(d));
  }

  async sendMessage(
    requestId: string,
    senderId: string,
    senderType: 'customer' | 'provider',
    text: string
  ): Promise<ChatMessage> {
    const colPath = this.getCollectionPath(requestId);
    const docRef = doc(collection(this.db, colPath));

    const messageData = {
      requestId,
      senderId,
      senderType,
      text,
      createdAt: serverTimestamp(),
    };

    await setDoc(docRef, messageData);

    logger.info('Chat message sent', { requestId, senderType });

    return {
      id: docRef.id,
      requestId,
      senderId,
      senderType,
      text,
      createdAt: new Date(),
    };
  }

  onNewMessages(requestId: string, callback: (messages: ChatMessage[]) => void): () => void {
    const q = query(
      collection(this.db, this.getCollectionPath(requestId)),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map((d) => this.docToMessage(d));
      callback(messages);
    });
  }

  async sendSystemMessage(requestId: string, text: string): Promise<void> {
    const colPath = this.getCollectionPath(requestId);
    const docRef = doc(collection(this.db, colPath));

    await setDoc(docRef, {
      requestId,
      senderId: 'system',
      senderType: 'system',
      text,
      createdAt: serverTimestamp(),
    });
  }

  private docToMessage(d: any): ChatMessage {
    const data = d.data();
    return {
      id: d.id,
      requestId: data.requestId,
      senderId: data.senderId,
      senderType: data.senderType,
      text: data.text,
      createdAt: data.createdAt?.toDate() || new Date(),
    };
  }
}

export const chatService: ChatService = new FirebaseChatService();
