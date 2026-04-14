import {
  getFirestore, collection, doc, setDoc, deleteDoc, getDocs, query,
  orderBy, onSnapshot, serverTimestamp,
} from '../firestore/imports';
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
    const snapshot = await getDocs(q).catch(() => null);
    if (!snapshot) return [];
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

    let lastSignature = '';

    return onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot || !Array.isArray(snapshot.docs)) {
          if (lastSignature !== '[]') {
            lastSignature = '[]';
            callback([]);
          }
          return;
        }
        const messages = snapshot.docs.map((d: any) => this.docToMessage(d));
        const signature = messages.map((m) => `${m.id}:${m.createdAt.getTime()}`).join('|');
        if (signature !== lastSignature) {
          lastSignature = signature;
          callback(messages);
        }
      },
      (error) => {
        console.warn('[onNewMessages] snapshot error', error);
        callback([]);
      }
    );
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

  /**
   * Delete every message in a request's chat subcollection.
   * Used when the customer cancels a provider selection — we want the next
   * provider to start with a clean slate, not see the previous conversation.
   */
  async clearMessages(requestId: string): Promise<void> {
    try {
      const colPath = this.getCollectionPath(requestId);
      const snapshot = await getDocs(collection(this.db, colPath));
      if (!snapshot || !snapshot.docs || snapshot.docs.length === 0) return;
      await Promise.all(
        snapshot.docs.map((d: any) => deleteDoc(doc(this.db, colPath, d.id)))
      );
      logger.info('Chat cleared', { requestId, deleted: snapshot.docs.length });
    } catch (err) {
      logger.error('clearMessages failed', err as Error);
    }
  }

  private docToMessage(d: any): ChatMessage {
    const data = d.data();
    let createdAt = new Date();
    if (data.createdAt && typeof data.createdAt.toDate === 'function') {
      try {
        createdAt = data.createdAt.toDate();
      } catch {
        // ignore
      }
    }
    return {
      id: d.id,
      requestId: data.requestId || '',
      senderId: data.senderId || '',
      senderType: data.senderType || 'customer',
      text: data.text || '',
      createdAt,
    };
  }
}

export const chatService: ChatService = new FirebaseChatService();
