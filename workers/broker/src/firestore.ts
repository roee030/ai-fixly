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
import { decideAutoSuspension } from './providerSuspension';

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
   * Query: return the set of provider phone numbers that are currently
   * suspended (auto or manually). Used by /broadcast to exclude them so
   * a low-rated provider doesn't keep getting jobs while their suspension
   * is being reviewed by the admin.
   */
  async getSuspendedProviderPhones(): Promise<Set<string>> {
    try {
      const accessToken = await this.getToken();
      const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents:runQuery`;

      const body = {
        structuredQuery: {
          from: [{ collectionId: 'providers_agg' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'suspended' },
              op: 'EQUAL',
              value: { booleanValue: true },
            },
          },
          select: { fields: [{ fieldPath: 'phone' }] },
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
        // Phone is the document id — also stored as a `phone` field, but
        // the doc name is the most reliable source.
        const docName = row?.document?.name as string | undefined;
        if (docName) {
          const phone = decodeURIComponent(docName.split('/').pop() || '');
          if (phone) phones.add(phone);
        }
      }
      return phones;
    } catch (err) {
      console.error('getSuspendedProviderPhones failed:', err);
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
   * Wipe a user's stored FCM token. Called when FCM tells us the token
   * is permanently invalid (UNREGISTERED / 404) — the device will
   * re-register on the next launch and the new token will land in the
   * user doc via the existing onTokenRefresh handler.
   *
   * Best-effort: if the patch fails, the next push attempt just hits the
   * same dead token and we'll try again. Never throw.
   */
  async clearUserFcmToken(userId: string): Promise<void> {
    try {
      const accessToken = await this.getToken();
      // PATCH with updateMask=fcmToken and an empty body for that field
      // = delete just the one field (vs. overwriting the whole doc).
      const url =
        `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/users/${userId}` +
        `?updateMask.fieldPaths=fcmToken`;
      await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields: {} }),
      });
    } catch (err) {
      console.warn('clearUserFcmToken failed:', err);
    }
  }

  /**
   * Look up a registered provider by phone number. Used during dispatch
   * to honor the vacation toggle: if the matched user is a registered
   * provider AND on vacation, we skip them and move to the next candidate.
   *
   * Returns null when no user has this phone in their providerProfile —
   * i.e., the phone came from Google Places but the provider hasn't been
   * onboarded into our app. They get the WhatsApp anyway (legacy behavior).
   */
  async getProviderProfileByPhone(phone: string): Promise<{
    uid: string;
    isOnVacation: boolean;
  } | null> {
    if (!phone) return null;
    try {
      const accessToken = await this.getToken();
      const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents:runQuery`;
      const body = {
        structuredQuery: {
          from: [{ collectionId: 'users' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'providerProfile.phone' },
              op: 'EQUAL',
              value: { stringValue: phone },
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
      if (!response.ok) return null;
      const rows = (await response.json()) as Array<{ document?: any }>;
      const doc = rows.find((r) => r.document)?.document;
      if (!doc) return null;
      const uid = String(doc.name || '').split('/').pop() || '';
      const profile = doc.fields?.providerProfile?.mapValue?.fields;
      const isOnVacation = profile?.isOnVacation?.booleanValue === true;
      return { uid, isOnVacation };
    } catch {
      return null;
    }
  }

  /**
   * Update the vacation flag on a user's providerProfile. Called from
   * the `/provider/vacation` endpoint after the caller's ID token has
   * been verified.
   */
  async setProviderVacation(uid: string, isOnVacation: boolean): Promise<void> {
    const accessToken = await this.getToken();
    // updateMask.fieldPaths uses dot-paths into a Map, properly URL-encoded.
    const fieldPath = encodeURIComponent('providerProfile.isOnVacation');
    const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/users/${uid}?updateMask.fieldPaths=${fieldPath}`;
    const body = {
      fields: {
        providerProfile: {
          mapValue: {
            fields: {
              isOnVacation: { booleanValue: isOnVacation },
            },
          },
        },
      },
    };
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`setProviderVacation error ${response.status}: ${errText}`);
    }
  }

  /**
   * Write the full providerProfile sub-document. Called by the
   * `/admin/register-provider` endpoint (used by the CLI scripts).
   * Overwrites the entire providerProfile field — this is intentional
   * so re-running the CLI with new data idempotently re-attaches the
   * provider with fresh values (e.g. updated location or radius).
   */
  async setProviderProfile(uid: string, profile: {
    profession: string;
    professionLabelHe: string;
    phone: string;
    location: { lat: number; lng: number };
    serviceRadiusKm: number;
    isOnVacation: boolean;
    approvedAt: string;  // ISO
  }): Promise<void> {
    const accessToken = await this.getToken();
    const fieldPath = encodeURIComponent('providerProfile');
    const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/users/${uid}?updateMask.fieldPaths=${fieldPath}`;
    const body = {
      fields: {
        providerProfile: {
          mapValue: {
            fields: {
              profession: { stringValue: profile.profession },
              professionLabelHe: { stringValue: profile.professionLabelHe },
              phone: { stringValue: profile.phone },
              location: {
                mapValue: {
                  fields: {
                    lat: { doubleValue: profile.location.lat },
                    lng: { doubleValue: profile.location.lng },
                  },
                },
              },
              serviceRadiusKm: { integerValue: String(profile.serviceRadiusKm) },
              isOnVacation: { booleanValue: profile.isOnVacation },
              approvedAt: { timestampValue: profile.approvedAt },
            },
          },
        },
      },
    };
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`setProviderProfile error ${response.status}: ${errText}`);
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
   *
   * Returns a discriminated result so callers can show different UIs for
   * "doesn't exist" (possibly a broken link — offer a report CTA) versus
   * "already closed" (customer picked someone or walked away — informational).
   */
  async getPublicRequestView(
    requestId: string,
  ): Promise<
    | { kind: 'ok'; view: PublicRequestView }
    | { kind: 'not_found' }
    | { kind: 'closed' }
  > {
    try {
      if (!requestId || requestId.trim().length === 0) {
        console.warn('[publicView] empty requestId');
        return { kind: 'not_found' };
      }
      const accessToken = await this.getToken();
      const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/serviceRequests/${requestId}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        console.warn(`[publicView] Firestore ${response.status} for requestId=${requestId}`);
        return { kind: 'not_found' };
      }

      const data = (await response.json()) as any;
      const fields = data.fields || {};
      const status = fields.status?.stringValue || 'unknown';
      // Only hard-reject CLOSED. DRAFT / OPEN / IN_PROGRESS / PAUSED
      // all surface the quote form — we'd rather let a provider submit
      // on a draft that's about to open than show a confusing 404.
      if (status === 'closed') {
        console.warn(`[publicView] rejecting closed request ${requestId}`);
        return { kind: 'closed' };
      }

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
        kind: 'ok',
        view: {
          requestId,
          status,
          city,
          textDescription: fields.textDescription?.stringValue || '',
          mediaUrls,
          mediaItems,
          createdAt: fields.createdAt?.timestampValue || null,
        },
      };
    } catch (err) {
      console.error('getPublicRequestView failed:', err);
      return { kind: 'not_found' };
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

  // ════════════════════════════════════════════════════════════════════════
  // Admin observability: events, broadcast summary, time-to-first-response
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Write a batch of events under `serviceRequests/{requestId}/events/*`.
   * Uses Firestore's batchWrite endpoint — one round-trip regardless of
   * event count. Fire-and-forget; errors are logged but swallowed so a
   * failed observability write never rolls back a successful broadcast.
   */
  async batchWriteEvents(
    requestId: string,
    events: Array<{
      type: string;
      ok: boolean;
      durationMs: number;
      error?: string;
      metadata?: Record<string, unknown>;
    }>,
  ): Promise<void> {
    if (!requestId || events.length === 0) return;
    try {
      const accessToken = await this.getToken();
      const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents:batchWrite`;
      const nowIso = new Date().toISOString();

      const writes = events.map((ev) => {
        const eventId = crypto.randomUUID();
        return {
          update: {
            name: `projects/${this.projectId}/databases/(default)/documents/serviceRequests/${requestId}/events/${eventId}`,
            fields: encodeEventFields(ev, nowIso),
          },
        };
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ writes }),
      });
      if (!response.ok) {
        const text = await response.text();
        console.warn(`[events] batch write returned ${response.status}: ${text}`);
      }
    } catch (err) {
      console.warn('[events] batchWriteEvents failed:', err);
    }
  }

  /**
   * Patch the broadcastSummary field on a request doc. Called at the end
   * of handleBroadcast with aggregate counts + duration so the admin
   * requests table + detail page can read it in one query.
   */
  async updateBroadcastSummary(requestId: string, summary: {
    sentCount: number;
    failedCount: number;
    providersFound: number;
    startedAt: string;
    finishedAt: string;
  }): Promise<void> {
    try {
      const accessToken = await this.getToken();
      const mask = [
        'broadcastSummary',
      ].map((p) => `updateMask.fieldPaths=${encodeURIComponent(p)}`).join('&');
      const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/serviceRequests/${requestId}?${mask}`;
      const body = {
        fields: {
          broadcastSummary: {
            mapValue: {
              fields: {
                sentCount:      { integerValue: summary.sentCount.toString() },
                failedCount:    { integerValue: summary.failedCount.toString() },
                providersFound: { integerValue: summary.providersFound.toString() },
                startedAt:      { timestampValue: summary.startedAt },
                finishedAt:     { timestampValue: summary.finishedAt },
              },
            },
          },
        },
      };
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const text = await response.text();
        console.warn(`[broadcast] updateBroadcastSummary ${response.status}: ${text}`);
      }
    } catch (err) {
      console.warn('[broadcast] updateBroadcastSummary failed:', err);
    }
  }

  /**
   * Read broadcastSummary.startedAt for a request so the Twilio webhook
   * can compute timeToFirstResponse. Returns null if the field is missing.
   */
  async getBroadcastStartedAt(requestId: string): Promise<string | null> {
    try {
      const accessToken = await this.getToken();
      const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/serviceRequests/${requestId}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) return null;
      const data = (await response.json()) as any;
      const started = data.fields?.broadcastSummary?.mapValue?.fields?.startedAt?.timestampValue;
      return typeof started === 'string' ? started : null;
    } catch {
      return null;
    }
  }

  /**
   * Check whether timeToFirstResponse has already been set on a request.
   * Twilio webhook uses this to guarantee idempotent first-response capture —
   * only the very first incoming bid writes the field.
   */
  async hasTimeToFirstResponse(requestId: string): Promise<boolean> {
    try {
      const accessToken = await this.getToken();
      const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/serviceRequests/${requestId}?mask.fieldPaths=timeToFirstResponse`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) return false;
      const data = (await response.json()) as any;
      return data.fields?.timeToFirstResponse !== undefined;
    } catch {
      return false;
    }
  }

  async setTimeToFirstResponse(requestId: string, minutes: number): Promise<void> {
    try {
      const accessToken = await this.getToken();
      const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/serviceRequests/${requestId}?updateMask.fieldPaths=timeToFirstResponse`;
      await fetch(url, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: { timeToFirstResponse: { integerValue: Math.max(0, Math.round(minutes)).toString() } },
        }),
      });
    } catch (err) {
      console.warn('[events] setTimeToFirstResponse failed:', err);
    }
  }

  /**
   * Denormalize the selected bid's price onto the request doc when the
   * customer picks a provider. Keeps admin list queries one-doc.
   */
  async setSelectedBidPrice(requestId: string, price: number): Promise<void> {
    try {
      const accessToken = await this.getToken();
      const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/serviceRequests/${requestId}?updateMask.fieldPaths=selectedBidPrice`;
      await fetch(url, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: { selectedBidPrice: { integerValue: Math.round(price).toString() } },
        }),
      });
    } catch (err) {
      console.warn('[bids] setSelectedBidPrice failed:', err);
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // Review submission: atomic transaction across 4 docs
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Submit a customer review. Runs as a Firestore transaction — either all
   * four writes land or none do. O(1) running-average aggregates; we do not
   * re-read the provider's entire review history.
   *
   *   1. reviews/{reviewId}                     (source of truth)
   *   2. serviceRequests/{requestId}.reviewSummary
   *   3. providers_agg/{phone}/jobs/{requestId}
   *   4. providers_agg/{phone}.stats            (running averages)
   *
   * Returns { ok: false, reason } with a matching HTTP status on any
   * validation failure so the worker handler can translate cleanly.
   */
  async runReviewTransaction(input: {
    uid: string;
    requestId: string;
    rating: number;
    comment: string;
    pricePaid: number;
    selectedCategories?: string[];
    classificationCorrect?: boolean | null;
  }): Promise<
    | { ok: true; reviewId: string }
    | { ok: false; reason: string; status: number }
  > {
    const token = await this.getToken();
    const db = `projects/${this.projectId}/databases/(default)`;

    // 1. Begin transaction.
    const beginRes = await fetch(
      `https://firestore.googleapis.com/v1/${db}/documents:beginTransaction`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    );
    if (!beginRes.ok) {
      return { ok: false, reason: 'transaction_begin_failed', status: 500 };
    }
    const { transaction } = (await beginRes.json()) as { transaction: string };

    // 2. Read request + provider aggregate inside the transaction.
    const batchGetRes = await fetch(
      `https://firestore.googleapis.com/v1/${db}/documents:batchGet`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documents: [
            `${db}/documents/serviceRequests/${input.requestId}`,
          ],
          transaction,
        }),
      },
    );
    if (!batchGetRes.ok) {
      return { ok: false, reason: 'batch_get_failed', status: 500 };
    }
    const reads = (await batchGetRes.json()) as any[];
    const requestDoc = reads.find((r) => r.found)?.found;
    if (!requestDoc) {
      return { ok: false, reason: 'request_not_found', status: 404 };
    }
    const fields = requestDoc.fields || {};
    if (fields.userId?.stringValue !== input.uid) {
      return { ok: false, reason: 'not_owner', status: 403 };
    }
    const status = fields.status?.stringValue || '';
    if (status !== 'closed' && status !== 'in_progress') {
      return { ok: false, reason: 'request_not_closed', status: 409 };
    }
    if (fields.reviewSummary) {
      return { ok: false, reason: 'already_reviewed', status: 409 };
    }
    const providerPhone = fields.selectedProviderPhone?.stringValue || '';
    const providerName = fields.selectedProviderName?.stringValue || '';
    const bidPrice = Number(fields.selectedBidPrice?.integerValue ?? 0);

    // 3. Read provider aggregate (separate call — cheaper than a batchGet
    // with a second doc that might not exist yet).
    let existingStats = {
      offersSent: 0,
      accepted: 0,
      completed: 0,
      avgRating: 0,
      avgPricePaid: 0,
      totalGrossValue: 0,
      replyRate: 0,
      avgResponseMinutes: 0,
    };
    // Auto-suspension state. We pull the rolling buffer of recent ratings
    // and the current `suspended` flag so decideAutoSuspension can decide
    // whether this review should auto-disable the provider.
    let recentRatings: number[] = [];
    let alreadySuspended = false;
    if (providerPhone) {
      try {
        const aggUrl = `https://firestore.googleapis.com/v1/${db}/documents/providers_agg/${encodeURIComponent(providerPhone)}`;
        const aggRes = await fetch(aggUrl, { headers: { Authorization: `Bearer ${token}` } });
        if (aggRes.ok) {
          const agg = (await aggRes.json()) as any;
          const s = agg.fields?.stats?.mapValue?.fields || {};
          existingStats = {
            offersSent:        Number(s.offersSent?.integerValue ?? 0),
            accepted:          Number(s.accepted?.integerValue ?? 0),
            completed:         Number(s.completed?.integerValue ?? 0),
            avgRating:         Number(s.avgRating?.doubleValue ?? 0),
            avgPricePaid:      Number(s.avgPricePaid?.doubleValue ?? 0),
            totalGrossValue:   Number(s.totalGrossValue?.integerValue ?? 0),
            replyRate:         Number(s.replyRate?.integerValue ?? 0),
            avgResponseMinutes: Number(s.avgResponseMinutes?.integerValue ?? 0),
          };
          // Decode the rolling buffer of last N ratings, oldest first.
          const recentArr = s.recentRatings?.arrayValue?.values || [];
          recentRatings = recentArr
            .map((v: any) => Number(v.integerValue ?? v.doubleValue ?? 0))
            .filter((n: number) => Number.isFinite(n) && n > 0);
          alreadySuspended = !!agg.fields?.suspended?.booleanValue;
        }
      } catch { /* treat as new provider */ }
    }

    // Run the auto-suspension decision before building writes so we know
    // whether to flip the suspended flag in the same commit.
    const suspensionDecision = decideAutoSuspension(
      recentRatings,
      input.rating,
      alreadySuspended,
    );

    // 4. Compute O(1) running averages for the new review.
    const n = existingStats.completed;
    const newAvgRating = (existingStats.avgRating * n + input.rating) / (n + 1);
    const newAvgPrice  = (existingStats.avgPricePaid * n + input.pricePaid) / (n + 1);
    const newCompleted = n + 1;
    const newGrossValue = existingStats.totalGrossValue + Math.round(input.pricePaid);

    // 5. Build the 4-write commit.
    const reviewId = crypto.randomUUID();
    const nowIso = new Date().toISOString();
    const writes: any[] = [
      // reviews/{reviewId}
      {
        update: {
          name: `${db}/documents/reviews/${reviewId}`,
          fields: {
            userId:           { stringValue: input.uid },
            requestId:        { stringValue: input.requestId },
            providerPhone:    { stringValue: providerPhone },
            providerName:     { stringValue: providerName },
            rating:           { integerValue: input.rating.toString() },
            comment:          { stringValue: input.comment },
            pricePaid:        { integerValue: Math.round(input.pricePaid).toString() },
            selectedCategories: {
              arrayValue: {
                values: (input.selectedCategories || []).map((c) => ({ stringValue: c })),
              },
            },
            classificationCorrect:
              input.classificationCorrect === null || input.classificationCorrect === undefined
                ? { nullValue: null }
                : { booleanValue: input.classificationCorrect },
            submittedAt:      { timestampValue: nowIso },
          },
        },
      },

      // serviceRequests/{requestId}.reviewSummary
      {
        updateMask: { fieldPaths: ['reviewSummary'] },
        update: {
          name: `${db}/documents/serviceRequests/${input.requestId}`,
          fields: {
            reviewSummary: {
              mapValue: {
                fields: {
                  rating:      { integerValue: input.rating.toString() },
                  comment:     { stringValue: input.comment },
                  pricePaid:   { integerValue: Math.round(input.pricePaid).toString() },
                  submittedAt: { timestampValue: nowIso },
                },
              },
            },
          },
        },
      },
    ];

    if (providerPhone) {
      writes.push(
        // providers_agg/{phone}/jobs/{requestId}
        {
          update: {
            name: `${db}/documents/providers_agg/${encodeURIComponent(providerPhone)}/jobs/${input.requestId}`,
            fields: {
              requestId:         { stringValue: input.requestId },
              bidPrice:          { integerValue: Math.round(bidPrice).toString() },
              pricePaid:         { integerValue: Math.round(input.pricePaid).toString() },
              rating:            { integerValue: input.rating.toString() },
              comment:           { stringValue: input.comment },
              customerReviewedAt: { timestampValue: nowIso },
              status:            { stringValue: 'completed' },
              completedAt:       { timestampValue: nowIso },
            },
          },
        },

        // providers_agg/{phone}.stats (running averages + rolling buffer)
        // + the suspended flag if auto-suspension fired this review.
        {
          updateMask: {
            fieldPaths: suspensionDecision.shouldSuspend && !alreadySuspended
              ? ['stats', 'updatedAt', 'suspended', 'suspendedAt', 'suspendReason']
              : ['stats', 'updatedAt'],
          },
          update: {
            name: `${db}/documents/providers_agg/${encodeURIComponent(providerPhone)}`,
            fields: {
              stats: {
                mapValue: {
                  fields: {
                    offersSent:        { integerValue: existingStats.offersSent.toString() },
                    accepted:          { integerValue: existingStats.accepted.toString() },
                    completed:         { integerValue: newCompleted.toString() },
                    avgRating:         { doubleValue: Number(newAvgRating.toFixed(3)) },
                    avgPricePaid:      { doubleValue: Number(newAvgPrice.toFixed(2)) },
                    totalGrossValue:   { integerValue: newGrossValue.toString() },
                    replyRate:         { integerValue: existingStats.replyRate.toString() },
                    avgResponseMinutes: { integerValue: existingStats.avgResponseMinutes.toString() },
                    lastJobAt:         { timestampValue: nowIso },
                    // Rolling buffer of last N ratings — oldest first.
                    // Used by decideAutoSuspension on every review.
                    recentRatings: {
                      arrayValue: {
                        values: suspensionDecision.recentRatings.map((r) => ({
                          integerValue: r.toString(),
                        })),
                      },
                    },
                  },
                },
              },
              updatedAt: { timestampValue: nowIso },
              // Top-level suspended flag — outside `stats` so admin UI can
              // flip it manually without touching running averages.
              ...(suspensionDecision.shouldSuspend && !alreadySuspended
                ? {
                    suspended: { booleanValue: true },
                    suspendedAt: { timestampValue: nowIso },
                    suspendReason: { stringValue: suspensionDecision.reason || 'auto-suspended' },
                  }
                : {}),
            },
          },
        },
      );

      // If we just auto-suspended this provider, write an admin alert so
      // the team sees it in the dashboard. Outside the providers_agg write
      // because alerts have their own collection.
      if (suspensionDecision.shouldSuspend && !alreadySuspended) {
        writes.push({
          update: {
            name: `${db}/documents/admin_alerts/${crypto.randomUUID()}`,
            fields: {
              type: { stringValue: 'provider_auto_suspended' },
              severity: { stringValue: 'warning' },
              message: {
                stringValue: `${providerName} (${providerPhone}) הושעה אוטומטית — ${
                  suspensionDecision.reason || 'דירוג נמוך'
                }`,
              },
              createdAt: { timestampValue: nowIso },
              read: { booleanValue: false },
              metadata: {
                mapValue: {
                  fields: {
                    providerPhone: { stringValue: providerPhone },
                    avgInBuffer: { doubleValue: Number(suspensionDecision.avgInBuffer.toFixed(2)) },
                    triggerRequestId: { stringValue: input.requestId },
                  },
                },
              },
            },
          },
        });
      }
    }

    // 6. Commit.
    const commitRes = await fetch(
      `https://firestore.googleapis.com/v1/${db}/documents:commit`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ writes, transaction }),
      },
    );
    if (!commitRes.ok) {
      const text = await commitRes.text();
      console.error(`[review] commit failed: ${commitRes.status} ${text}`);
      return { ok: false, reason: 'commit_failed', status: 500 };
    }

    return { ok: true, reviewId };
  }

  // ════════════════════════════════════════════════════════════════════════
  // Admin rollup: query requests in a time range (used by daily rollup cron)
  // ════════════════════════════════════════════════════════════════════════

  async getRequestsInRange(fromIso: string, toIso: string): Promise<Array<{
    id: string;
    city: string;
    timeToFirstResponse?: number;
    reviewRating?: number;
    reviewPricePaid?: number;
  }>> {
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
                { fieldFilter: { field: { fieldPath: 'createdAt' }, op: 'GREATER_THAN_OR_EQUAL', value: { timestampValue: fromIso } } },
                { fieldFilter: { field: { fieldPath: 'createdAt' }, op: 'LESS_THAN', value: { timestampValue: toIso } } },
              ],
            },
          },
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) return [];
      const data = (await response.json()) as any[];
      const rows: Array<{
        id: string; city: string; timeToFirstResponse?: number;
        reviewRating?: number; reviewPricePaid?: number;
      }> = [];
      for (const row of data) {
        const doc = row.document;
        if (!doc) continue;
        const path = String(doc.name || '').split('/');
        const id = path[path.length - 1];
        const f = doc.fields || {};
        const city = f.locationSummary?.mapValue?.fields?.city?.stringValue || 'unknown';
        const tfr = f.timeToFirstResponse?.integerValue;
        const review = f.reviewSummary?.mapValue?.fields;
        rows.push({
          id,
          city,
          timeToFirstResponse: tfr !== undefined ? Number(tfr) : undefined,
          reviewRating: review?.rating?.integerValue !== undefined ? Number(review.rating.integerValue) : undefined,
          reviewPricePaid: review?.pricePaid?.integerValue !== undefined ? Number(review.pricePaid.integerValue) : undefined,
        });
      }
      return rows;
    } catch (err) {
      console.error('getRequestsInRange failed:', err);
      return [];
    }
  }

  async writeAdminDailyStats(
    dateYmd: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      const accessToken = await this.getToken();
      const docId = `daily-${dateYmd.replace(/-/g, '')}`;
      const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/adminStats?documentId=${docId}`;
      // Best-effort: create then patch. If the doc exists, use PATCH on the
      // full set of fields.
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: encodeJsonToFields(payload) }),
      });
      if (res.status === 409) {
        const patchUrl = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/adminStats/${docId}`;
        await fetch(patchUrl, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: encodeJsonToFields(payload) }),
        });
      } else if (!res.ok) {
        const text = await res.text();
        console.warn(`[rollup] write ${dateYmd} returned ${res.status}: ${text}`);
      }
    } catch (err) {
      console.warn('[rollup] writeAdminDailyStats failed:', err);
    }
  }

  private getToken(): Promise<string> {
    return getAccessToken({
      serviceAccountJson: this.serviceAccountJson,
      scope: SCOPES.FIRESTORE,
    });
  }
}

// ══════════════════════════════════════════════════════════════════════════
// Encoding helpers — convert JS values into Firestore REST field shapes
// ══════════════════════════════════════════════════════════════════════════

function encodeEventFields(
  ev: { type: string; ok: boolean; durationMs: number; error?: string; metadata?: Record<string, unknown> },
  nowIso: string,
): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    type:        { stringValue: ev.type },
    ok:          { booleanValue: ev.ok },
    durationMs:  { integerValue: Math.round(ev.durationMs).toString() },
    startedAt:   { timestampValue: nowIso },
  };
  if (ev.error) fields.error = { stringValue: ev.error.slice(0, 500) };
  if (ev.metadata) {
    fields.metadata = { mapValue: { fields: encodeJsonToFields(ev.metadata) } };
  }
  return fields;
}

function encodeJsonToFields(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) {
      out[k] = { nullValue: null };
    } else if (typeof v === 'boolean') {
      out[k] = { booleanValue: v };
    } else if (typeof v === 'number') {
      out[k] = Number.isInteger(v) ? { integerValue: v.toString() } : { doubleValue: v };
    } else if (typeof v === 'string') {
      out[k] = { stringValue: v };
    } else if (Array.isArray(v)) {
      out[k] = {
        arrayValue: {
          values: v.map((item) => {
            if (typeof item === 'string') return { stringValue: item };
            if (typeof item === 'number') {
              return Number.isInteger(item) ? { integerValue: item.toString() } : { doubleValue: item };
            }
            if (typeof item === 'boolean') return { booleanValue: item };
            if (item && typeof item === 'object') {
              return { mapValue: { fields: encodeJsonToFields(item as Record<string, unknown>) } };
            }
            return { nullValue: null };
          }),
        },
      };
    } else if (typeof v === 'object') {
      out[k] = { mapValue: { fields: encodeJsonToFields(v as Record<string, unknown>) } };
    }
  }
  return out;
}
