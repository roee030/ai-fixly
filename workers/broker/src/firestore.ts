/**
 * Firestore REST API client for Cloudflare Workers.
 *
 * The Firebase Admin SDK doesn't work in Workers (requires Node APIs), so we
 * use the Firestore REST API directly. Auth is shared with FCM via googleAuth.ts.
 */

import { getAccessToken, SCOPES } from './googleAuth';

export interface RequestDoc {
  id: string;
  userId: string;
  status: string;
  selectedBidId?: string;
  selectedProviderPhone?: string;
  selectedProviderName?: string;
}

export class FirestoreClient {
  private projectId: string;
  private serviceAccountJson: string;

  constructor(projectId: string, serviceAccountJson: string) {
    this.projectId = projectId;
    this.serviceAccountJson = serviceAccountJson;
  }

  /**
   * Fetch a request document. Returns null if not found or on error.
   */
  async getRequest(requestId: string): Promise<RequestDoc | null> {
    try {
      const accessToken = await this.getToken();
      const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/serviceRequests/${requestId}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        const errText = await response.text();
        console.error(`Firestore getRequest error ${response.status}: ${errText}`);
        return null;
      }

      const data = (await response.json()) as any;
      const fields = data.fields || {};

      return {
        id: requestId,
        userId: fields.userId?.stringValue || '',
        status: fields.status?.stringValue || 'unknown',
        selectedBidId: fields.selectedBidId?.stringValue,
        selectedProviderPhone: fields.selectedProviderPhone?.stringValue,
        selectedProviderName: fields.selectedProviderName?.stringValue,
      };
    } catch (err) {
      console.error('getRequest failed:', err);
      return null;
    }
  }

  /**
   * Get a user's FCM token from their user document.
   */
  async getUserFcmToken(userId: string): Promise<string | null> {
    try {
      const accessToken = await this.getToken();
      const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/users/${userId}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) return null;

      const data = (await response.json()) as any;
      return data.fields?.fcmToken?.stringValue || null;
    } catch {
      return null;
    }
  }

  /**
   * Write a chat message to /serviceRequests/{requestId}/messages.
   * Used by the webhook when a provider replies after being selected.
   */
  async addChatMessage(params: {
    requestId: string;
    senderId: string;
    senderType: 'customer' | 'provider' | 'system';
    text: string;
  }): Promise<void> {
    const { requestId, senderId, senderType, text } = params;
    const accessToken = await this.getToken();

    const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/serviceRequests/${requestId}/messages`;

    const firestoreDoc = {
      fields: {
        requestId: { stringValue: requestId },
        senderId: { stringValue: senderId },
        senderType: { stringValue: senderType },
        text: { stringValue: text },
        createdAt: { timestampValue: new Date().toISOString() },
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(firestoreDoc),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`addChatMessage error ${response.status}: ${errText}`);
    }
  }

  async updateRequestBroadcast(params: {
    requestId: string;
    providers: Array<{ name: string; phone: string; sent: boolean }>;
  }): Promise<void> {
    const { requestId, providers } = params;
    const accessToken = await this.getToken();

    const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/serviceRequests/${requestId}?updateMask.fieldPaths=broadcastedProviders&updateMask.fieldPaths=broadcastedAt`;

    const firestoreDoc = {
      fields: {
        broadcastedProviders: {
          arrayValue: {
            values: providers.map((p) => ({
              mapValue: {
                fields: {
                  name: { stringValue: p.name },
                  phone: { stringValue: p.phone },
                  sent: { booleanValue: p.sent },
                },
              },
            })),
          },
        },
        broadcastedAt: { timestampValue: new Date().toISOString() },
      },
    };

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(firestoreDoc),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`updateRequestBroadcast error ${response.status}: ${errText}`);
    }
  }

  async createBid(params: {
    requestId: string;
    bidId: string;
    data: {
      providerName: string;
      providerPhone: string;
      price: number | null;
      availability: string | null;
      rating?: number | null;
      address?: string;
      rawReply: string;
      receivedAt: string;
      isReal: boolean;
      source: 'whatsapp' | 'google_places_demo' | 'mock';
    };
  }): Promise<void> {
    const { requestId, bidId, data } = params;
    const accessToken = await this.getToken();

    const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/bids?documentId=${bidId}`;

    const firestoreDoc: any = {
      fields: {
        requestId: { stringValue: requestId },
        providerName: { stringValue: data.providerName },
        providerPhone: { stringValue: data.providerPhone },
        price: data.price !== null ? { integerValue: data.price.toString() } : { nullValue: null },
        availability: data.availability
          ? { stringValue: data.availability }
          : { nullValue: null },
        rawReply: { stringValue: data.rawReply },
        receivedAt: { timestampValue: data.receivedAt },
        isReal: { booleanValue: data.isReal },
        source: { stringValue: data.source },
      },
    };

    if (data.rating !== undefined && data.rating !== null) {
      firestoreDoc.fields.rating = { doubleValue: data.rating };
    }
    if (data.address) {
      firestoreDoc.fields.address = { stringValue: data.address };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(firestoreDoc),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`createBid error ${response.status}: ${errText}`);
    }
  }

  private getToken(): Promise<string> {
    return getAccessToken({
      serviceAccountJson: this.serviceAccountJson,
      scope: SCOPES.FIRESTORE,
    });
  }
}
