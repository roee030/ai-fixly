/**
 * Firestore REST API client for Cloudflare Workers.
 *
 * The Firebase Admin SDK doesn't work in Workers (requires Node APIs), so we
 * use the Firestore REST API directly with a service account JWT for auth.
 *
 * Docs:
 *   https://firebase.google.com/docs/firestore/use-rest-api
 *   https://firebase.google.com/docs/auth/admin/custom-claims
 */

interface ServiceAccount {
  project_id: string;
  private_key: string;
  client_email: string;
}

export class FirestoreClient {
  private projectId: string;
  private serviceAccount: ServiceAccount;
  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor(projectId: string, serviceAccountJson: string) {
    this.projectId = projectId;
    this.serviceAccount = JSON.parse(serviceAccountJson);
  }

  /**
   * Write a bid document under serviceRequests/{requestId}/bids/{bidId}.
   * Using a subcollection keeps bids scoped to their parent request, which
   * matches the Firestore security rules we set up earlier.
   */
  /**
   * Update a service request document with the list of providers we broadcast to.
   * This lets the app display 'Sent to: X providers' in the request details.
   */
  async updateRequestBroadcast(params: {
    requestId: string;
    providers: Array<{ name: string; phone: string; sent: boolean }>;
  }): Promise<void> {
    const { requestId, providers } = params;
    const accessToken = await this.getAccessToken();

    // Use PATCH with updateMask to only update specific fields
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
      throw new Error(`Firestore updateRequestBroadcast error ${response.status}: ${errText}`);
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
      isReal: boolean; // true = from real WhatsApp reply, false = simulated demo bid
      source: 'whatsapp' | 'google_places_demo' | 'mock';
    };
  }): Promise<void> {
    const { requestId, bidId, data } = params;
    const accessToken = await this.getAccessToken();

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
      throw new Error(`Firestore createBid error ${response.status}: ${errText}`);
    }
  }

  /**
   * Get an OAuth2 access token using the service account JWT flow.
   * Tokens are cached until 5 minutes before expiry.
   */
  private async getAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (this.cachedToken && this.cachedToken.expiresAt > now + 300) {
      return this.cachedToken.token;
    }

    const jwt = await this.createJWT();

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }).toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OAuth token error ${response.status}: ${errText}`);
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };

    this.cachedToken = {
      token: data.access_token,
      expiresAt: now + data.expires_in,
    };

    return data.access_token;
  }

  /**
   * Create a signed JWT for the service account using RS256.
   * Uses Web Crypto API (available in Cloudflare Workers).
   */
  private async createJWT(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const claims = {
      iss: this.serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    };

    const headerB64 = base64UrlEncode(JSON.stringify(header));
    const claimsB64 = base64UrlEncode(JSON.stringify(claims));
    const unsigned = `${headerB64}.${claimsB64}`;

    // Import the private key
    const pem = this.serviceAccount.private_key.replace(/\\n/g, '\n');
    const keyData = pemToArrayBuffer(pem);

    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      keyData,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      new TextEncoder().encode(unsigned)
    );

    const signatureB64 = base64UrlEncode(
      String.fromCharCode(...new Uint8Array(signature))
    );

    return `${unsigned}.${signatureB64}`;
  }
}

function base64UrlEncode(input: string): string {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const binary = atob(b64);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i);
  }
  return buffer;
}
