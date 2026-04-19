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
  /** URL of the first media item (used as notification hero image) */
  heroImageUrl?: string;
}

/**
 * Public-facing view of a request shown to providers in the quote form.
 * Includes ALL media URLs and the customer description, but NEVER the
 * customer's identity (userId, name, phone, exact address are stripped).
 */
import { normaliseCityName } from './cityNames';

export interface PublicMediaItem {
  url: string;
  type: 'image' | 'video';
  /** JPG poster frame for videos. */
  thumbnailUrl?: string;
}

export interface PublicRequestView {
  requestId: string;
  status: string;
  city: string;
  textDescription: string;
  /** Legacy flat URL list; kept so older clients don't break. */
  mediaUrls: string[];
  /** Type-aware list. New clients should prefer this. */
  mediaItems: PublicMediaItem[];
  createdAt: string | null;
}

export class FirestoreClient {
  private projectId: string;
  private serviceAccountJson: string;

  constructor(projectId: string, serviceAccountJson: string) {
    this.projectId = projectId;
    this.serviceAccountJson = serviceAccountJson;
  }

  /**
   * Query: return the set of provider phone numbers that are currently
   * busy with an active (in_progress) request. Used by /broadcast to
   * exclude them from new broadcasts.
   */
  async getBusyProviderPhones(): Promise<Set<string>> {
    try {
      const accessToken = await this.getToken();
      const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents:runQuery`;

      const body = {
        structuredQuery: {
          from: [{ collectionId: 'serviceRequests' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'status' },
              op: 'EQUAL',
              value: { stringValue: 'in_progress' },
            },
          },
          select: { fields: [{ fieldPath: 'selectedProviderPhone' }] },
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) return new Set();

      const data = (await response.json()) as any[];
      const phones = new Set<string>();
      for (const row of data) {
        const phone = row?.document?.fields?.selectedProviderPhone?.stringValue;
        if (phone) phones.add(phone);
      }
      return phones;
    } catch (err) {
      console.error('getBusyProviderPhones failed:', err);
      return new Set();
    }
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

      // Extract the first media downloadUrl to use as the notification
      // hero image. Tolerates missing/empty media arrays.
      let heroImageUrl: string | undefined;
      try {
        const mediaValues = fields.media?.arrayValue?.values;
        if (Array.isArray(mediaValues) && mediaValues.length > 0) {
          const first = mediaValues[0]?.mapValue?.fields;
          heroImageUrl = first?.downloadUrl?.stringValue;
        }
      } catch {
        // ignore — heroImageUrl stays undefined
      }

      return {
        id: requestId,
        userId: fields.userId?.stringValue || '',
        status: fields.status?.stringValue || 'unknown',
        selectedBidId: fields.selectedBidId?.stringValue,
        selectedProviderPhone: fields.selectedProviderPhone?.stringValue,
        selectedProviderName: fields.selectedProviderName?.stringValue,
        heroImageUrl,
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

  /**
   * Public view of a request — privacy-stripped and safe to expose to
   * unauthenticated providers via the /provider/quote/[id] form.
   * Returns null if the request is missing or already CLOSED (no point
   * letting a provider quote on something the customer abandoned).
   */
  async getPublicRequestView(requestId: string): Promise<PublicRequestView | null> {
    try {
      const accessToken = await this.getToken();
      const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/serviceRequests/${requestId}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) return null;

      const data = (await response.json()) as any;
      const fields = data.fields || {};
      const status = fields.status?.stringValue || 'unknown';
      if (status === 'closed') return null;

      // Pull the array of media items. We expose two shapes for backward
      // compatibility: `mediaUrls` is the legacy flat list of download URLs;
      // `mediaItems` carries the type + optional thumbnail so the provider
      // page can render videos as videos.
      const mediaUrls: string[] = [];
      const mediaItems: Array<{ url: string; type: 'image' | 'video'; thumbnailUrl?: string }> = [];
      try {
        const mediaValues = fields.media?.arrayValue?.values;
        if (Array.isArray(mediaValues)) {
          for (const m of mediaValues) {
            const inner = m?.mapValue?.fields || {};
            const url: string | undefined = inner.downloadUrl?.stringValue;
            if (!url) continue;
            const rawType = inner.type?.stringValue || 'image';
            const type: 'image' | 'video' = rawType === 'video' ? 'video' : 'image';
            const thumbnailUrl: string | undefined = inner.thumbnailUrl?.stringValue || undefined;
            mediaUrls.push(url);
            mediaItems.push({ url, type, thumbnailUrl });
          }
        }
      } catch {
        // ignore — empty array is fine
      }

      // Strip the address down to just the city (last comma-separated part).
      // Normalise English → Hebrew for known Israeli cities — the address
      // is whatever locale the customer's device was in, and our provider
      // forms are Hebrew-first.
      const fullAddress = fields.location?.mapValue?.fields?.address?.stringValue || '';
      const city = (() => {
        if (!fullAddress) return '';
        const parts = fullAddress.split(',').map((p: string) => p.trim()).filter(Boolean);
        const raw = parts.length >= 2 ? parts[parts.length - 2] : parts[0] || '';
        return normaliseCityName(raw);
      })();

      return {
        requestId,
        status,
        city,
        textDescription: fields.textDescription?.stringValue || '',
        mediaUrls,
        mediaItems,
        createdAt: fields.createdAt?.timestampValue || null,
      };
    } catch (err) {
      console.error('getPublicRequestView failed:', err);
      return null;
    }
  }

  /**
   * Persist a "this request was a wrong fit" complaint from a provider
   * (submitted via the public /provider/report form). Stored in a flat
   * `providerReports` collection — admins triage manually for now.
   */
  async writeProviderReport(params: {
    requestId: string;
    providerPhone: string;
    reason: string;
    receivedAt: string;
  }): Promise<void> {
    const accessToken = await this.getToken();
    const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/providerReports`;
    const doc = {
      fields: {
        requestId: { stringValue: params.requestId },
        providerPhone: { stringValue: params.providerPhone },
        reason: { stringValue: params.reason },
        receivedAt: { timestampValue: params.receivedAt },
      },
    };
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`writeProviderReport error ${response.status}: ${errText}`);
    }
  }

  /**
   * Total number of bids attached to a request. Used to build a
   * "you have N offers" push instead of spamming the customer with one
   * notification per arriving bid.
   */
  async countBidsForRequest(requestId: string): Promise<number> {
    try {
      const accessToken = await this.getToken();
      const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents:runQuery`;
      const body = {
        structuredQuery: {
          from: [{ collectionId: 'bids' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'requestId' },
              op: 'EQUAL',
              value: { stringValue: requestId },
            },
          },
        },
      };
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) return 0;
      const rows = (await response.json()) as Array<{ document?: unknown }>;
      return Array.isArray(rows) ? rows.filter((r) => !!r.document).length : 0;
    } catch (err) {
      console.warn('countBidsForRequest failed:', err);
      return 0;
    }
  }

  /**
   * Returns true if a bid for {requestId} already exists for this provider
   * phone number. Used by the public quote form to reject duplicate
   * submissions from providers who tap the link twice.
   *
   * We query the `bids` collection filtered by requestId + providerPhone;
   * a single hit is enough to short-circuit.
   */
  async providerAlreadyBidOnRequest(requestId: string, providerPhone: string): Promise<boolean> {
    try {
      const accessToken = await this.getToken();
      const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents:runQuery`;
      const body = {
        structuredQuery: {
          from: [{ collectionId: 'bids' }],
          where: {
            compositeFilter: {
              op: 'AND',
              filters: [
                {
                  fieldFilter: {
                    field: { fieldPath: 'requestId' },
                    op: 'EQUAL',
                    value: { stringValue: requestId },
                  },
                },
                {
                  fieldFilter: {
                    field: { fieldPath: 'providerPhone' },
                    op: 'EQUAL',
                    value: { stringValue: providerPhone },
                  },
                },
              ],
            },
          },
          limit: 1,
        },
      };
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) return false;
      const rows = (await response.json()) as Array<{ document?: unknown }>;
      return Array.isArray(rows) && rows.some((r) => !!r.document);
    } catch (err) {
      console.warn('providerAlreadyBidOnRequest failed — assuming not duplicate:', err);
      return false;
    }
  }

  async createBid(params: {
    requestId: string;
    bidId: string;
    data: {
      providerName: string;
      displayName?: string;
      providerPhone: string;
      price: number | null;
      availability: string | null;
      /**
       * Canonical UTC ISO timestamp when the provider said they could
       * start. Enables date-aware display on the customer side (so
       * "tomorrow morning" becomes concrete and ages gracefully).
       */
      availabilityStartAt?: string | null;
      /**
       * UTC ISO end of the provider's offered window (always 2 hours after
       * `availabilityStartAt` for new bids). Optional for legacy WhatsApp
       * bids parsed by Gemini before the time-window refactor.
       */
      availabilityEndAt?: string | null;
      rating?: number | null;
      address?: string;
      rawReply: string;
      /**
       * Provider's own free-text notes (from the web form's "notes"
       * textarea, or the prose portion of a WhatsApp reply). Stored
       * separately from rawReply so the customer-facing bid card can
       * surface it without showing raw-log noise.
       */
      notes?: string;
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
        ...(data.notes ? { notes: { stringValue: data.notes } } : {}),
        receivedAt: { timestampValue: data.receivedAt },
        isReal: { booleanValue: data.isReal },
        source: { stringValue: data.source },
      },
    };

    if (data.availabilityStartAt) {
      firestoreDoc.fields.availabilityStartAt = {
        timestampValue: data.availabilityStartAt,
      };
    }
    if (data.availabilityEndAt) {
      firestoreDoc.fields.availabilityEndAt = {
        timestampValue: data.availabilityEndAt,
      };
    }
    if (data.rating !== undefined && data.rating !== null) {
      firestoreDoc.fields.rating = { doubleValue: data.rating };
    }
    if (data.address) {
      firestoreDoc.fields.address = { stringValue: data.address };
    }
    if (data.displayName) {
      firestoreDoc.fields.displayName = { stringValue: data.displayName };
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

  async updateRequestWave(params: {
    requestId: string;
    wave: number;
    nextWaveAt: string | null;
  }): Promise<void> {
    const accessToken = await this.getToken();
    const url =
      `https://firestore.googleapis.com/v1/projects/${this.projectId}` +
      `/databases/(default)/documents/serviceRequests/${params.requestId}` +
      `?updateMask.fieldPaths=broadcastWave&updateMask.fieldPaths=nextWaveAt`;

    const fields: Record<string, unknown> = {
      broadcastWave: { integerValue: params.wave.toString() },
    };

    if (params.nextWaveAt) {
      fields.nextWaveAt = { stringValue: params.nextWaveAt };
    } else {
      fields.nextWaveAt = { nullValue: null };
    }

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`updateRequestWave error ${response.status}: ${errText}`);
    }
  }

  /**
   * Read the full request doc in the shape /broadcast needs. Used by the
   * /request/expand-radius handler so we can rebuild the broadcast payload
   * from Firestore without trusting the client's body (which would be
   * brittle and a small attack surface). Returns null when the doc doesn't
   * exist or can't be parsed.
   */
  async getRequestForReBroadcast(requestId: string): Promise<{
    status: string;
    professions: string[];
    shortSummary: string;
    mediaUrls: string[];
    location: { lat: number; lng: number; address: string };
  } | null> {
    try {
      const accessToken = await this.getToken();
      const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/serviceRequests/${requestId}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) return null;
      const data = (await response.json()) as any;
      const fields = data.fields || {};
      const status = fields.status?.stringValue || '';

      const professions: string[] = [];
      const aiProfs = fields.aiAnalysis?.mapValue?.fields?.professions?.arrayValue?.values;
      if (Array.isArray(aiProfs)) {
        for (const p of aiProfs) {
          if (p?.stringValue) professions.push(p.stringValue);
        }
      }

      const mediaUrls: string[] = [];
      const mediaValues = fields.media?.arrayValue?.values;
      if (Array.isArray(mediaValues)) {
        for (const m of mediaValues) {
          const url2 = m?.mapValue?.fields?.downloadUrl?.stringValue;
          if (url2) mediaUrls.push(url2);
        }
      }

      const locFields = fields.location?.mapValue?.fields;
      const lat = Number(locFields?.lat?.doubleValue ?? locFields?.lat?.integerValue ?? NaN);
      const lng = Number(locFields?.lng?.doubleValue ?? locFields?.lng?.integerValue ?? NaN);
      const address = locFields?.address?.stringValue || '';

      if (!isFinite(lat) || !isFinite(lng)) return null;

      return {
        status,
        professions,
        shortSummary: fields.aiAnalysis?.mapValue?.fields?.shortSummary?.stringValue || '',
        mediaUrls,
        location: { lat, lng, address },
      };
    } catch (err) {
      console.error('getRequestForReBroadcast failed:', err);
      return null;
    }
  }

  /**
   * Flag a request as having had its search radius expanded. Used by the
   * client to hide the "no replies yet, expand?" banner after the user
   * acts on it, and by admins to spot patterns of stuck requests.
   */
  async markRequestRadiusExpanded(requestId: string, multiplier: number): Promise<void> {
    const accessToken = await this.getToken();
    const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/serviceRequests/${requestId}?updateMask.fieldPaths=radiusExpandedAt&updateMask.fieldPaths=radiusExpandedMultiplier`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          radiusExpandedAt: { timestampValue: new Date().toISOString() },
          radiusExpandedMultiplier: { doubleValue: multiplier },
        },
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error(`markRequestRadiusExpanded error ${response.status}: ${errText}`);
    }
  }

  async getRequestsForReviewReminder(): Promise<Array<{ id: string; selectedProviderName: string }>> {
    try {
      const accessToken = await this.getToken();
      const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents:runQuery`;

      const body = {
        structuredQuery: {
          from: [{ collectionId: 'serviceRequests' }],
          where: {
            compositeFilter: {
              op: 'AND',
              filters: [
                {
                  fieldFilter: {
                    field: { fieldPath: 'status' },
                    op: 'EQUAL',
                    value: { stringValue: 'in_progress' },
                  },
                },
              ],
            },
          },
          select: {
            fields: [
              { fieldPath: 'selectedProviderName' },
              { fieldPath: 'updatedAt' },
              { fieldPath: 'reviewReminderSent' },
              { fieldPath: 'hasReview' },
              { fieldPath: 'userId' },
            ],
          },
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) return [];

      const data = await response.json();
      if (!Array.isArray(data)) return [];

      const now = Date.now();
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

      return data
        .filter((item: any) => {
          const doc = item.document;
          if (!doc) return false;

          const fields = doc.fields || {};

          if (fields.reviewReminderSent?.booleanValue) return false;
          if (fields.hasReview?.booleanValue) return false;

          const updatedAt = fields.updatedAt?.timestampValue;
          if (!updatedAt) return false;
          const updatedTime = new Date(updatedAt).getTime();
          if (now - updatedTime < TWENTY_FOUR_HOURS) return false;

          return true;
        })
        .map((item: any) => {
          const doc = item.document;
          const docPath = doc.name.split('/');
          const id = docPath[docPath.length - 1];
          return {
            id,
            selectedProviderName: doc.fields?.selectedProviderName?.stringValue || 'בעל מקצוע',
          };
        });
    } catch (err) {
      console.error('getRequestsForReviewReminder failed:', err);
      return [];
    }
  }

  async markReviewReminderSent(requestId: string): Promise<void> {
    try {
      const accessToken = await this.getToken();
      const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/serviceRequests/${requestId}?updateMask.fieldPaths=reviewReminderSent`;

      await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            reviewReminderSent: { booleanValue: true },
          },
        }),
      });
    } catch (err) {
      console.error('markReviewReminderSent failed:', err);
    }
  }

  async getStaleRequestsWithNoBids(minHours: number): Promise<Array<{ id: string; userId: string; profession: string; hoursOpen: number }>> {
    try {
      const accessToken = await this.getToken();
      const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents:runQuery`;

      const body = {
        structuredQuery: {
          from: [{ collectionId: 'serviceRequests' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'status' },
              op: 'EQUAL',
              value: { stringValue: 'open' },
            },
          },
          select: {
            fields: [
              { fieldPath: 'userId' },
              { fieldPath: 'createdAt' },
              { fieldPath: 'aiAnalysis' },
              { fieldPath: 'alertSentNoBids' },
            ],
          },
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) return [];

      const data = await response.json();
      if (!Array.isArray(data)) return [];

      const now = Date.now();
      const cutoff = minHours * 60 * 60 * 1000;

      return data
        .filter((item: any) => {
          const doc = item.document;
          if (!doc) return false;
          const fields = doc.fields || {};

          if (fields.alertSentNoBids?.booleanValue) return false;

          const createdAt = fields.createdAt?.timestampValue;
          if (!createdAt) return false;
          const age = now - new Date(createdAt).getTime();
          return age >= cutoff;
        })
        .map((item: any) => {
          const doc = item.document;
          const fields = doc.fields || {};
          const docPath = doc.name.split('/');
          const id = docPath[docPath.length - 1];
          const age = now - new Date(fields.createdAt.timestampValue).getTime();

          let profession = '';
          try {
            const profs = fields.aiAnalysis?.mapValue?.fields?.professionLabelsHe?.arrayValue?.values;
            if (profs && profs.length > 0) profession = profs[0].stringValue || '';
          } catch { /* ignore */ }

          return {
            id,
            userId: fields.userId?.stringValue || '',
            profession,
            hoursOpen: Math.round(age / (60 * 60 * 1000)),
          };
        });
    } catch (err) {
      console.error('getStaleRequestsWithNoBids failed:', err);
      return [];
    }
  }

  async createAdminAlert(alert: {
    type: string;
    severity: string;
    message: string;
    metadata: Record<string, any>;
  }): Promise<void> {
    try {
      const accessToken = await this.getToken();
      const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/admin_alerts`;

      const metadataFields: Record<string, any> = {};
      for (const [key, value] of Object.entries(alert.metadata)) {
        if (typeof value === 'string') {
          metadataFields[key] = { stringValue: value };
        } else if (typeof value === 'number') {
          metadataFields[key] = { integerValue: value.toString() };
        }
      }

      const firestoreDoc = {
        fields: {
          type: { stringValue: alert.type },
          severity: { stringValue: alert.severity },
          message: { stringValue: alert.message },
          metadata: { mapValue: { fields: metadataFields } },
          read: { booleanValue: false },
          createdAt: { timestampValue: new Date().toISOString() },
        },
      };

      await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(firestoreDoc),
      });
    } catch (err) {
      console.error('createAdminAlert failed:', err);
    }
  }

  async markAlertSentNoBids(requestId: string): Promise<void> {
    try {
      const accessToken = await this.getToken();
      const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/serviceRequests/${requestId}?updateMask.fieldPaths=alertSentNoBids`;

      await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: { alertSentNoBids: { booleanValue: true } },
        }),
      });
    } catch {
      // ignore
    }
  }

  private getToken(): Promise<string> {
    return getAccessToken({
      serviceAccountJson: this.serviceAccountJson,
      scope: SCOPES.FIRESTORE,
    });
  }
}
