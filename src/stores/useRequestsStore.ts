import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestService } from '../services/requests';
import { bidService } from '../services/bids';
import { REQUEST_STATUS } from '../constants/status';
import type { ServiceRequest } from '../services/requests';

/**
 * Central cache for the signed-in user's requests and unread state.
 *
 * Why this exists:
 *   - Before: the My Requests screen re-fetched requests on every focus,
 *     which was slow and wasted bandwidth.
 *   - Now: a single Firestore listener keeps the list fresh in the
 *     background, and every consumer just reads from the store.
 *   - The tab bar badge reads `totalUnread` and updates in real time.
 *   - When the user opens a request, we mark it "read" (persisting the
 *     current bid count as the baseline).
 */

interface UnreadInfo {
  /**
   * Number of bids when the user last viewed this request.
   * Any bids above this count are "new" and contribute to the badge.
   */
  lastSeenBidCount: number;
}

interface RequestsState {
  requests: ServiceRequest[];
  bidCounts: Record<string, number>;
  unreadBaseline: Record<string, UnreadInfo>;
  isInitialized: boolean;

  /** Start listening to requests + bids for a user. Safe to call multiple times. */
  startListening: (userId: string) => void;
  /** Stop all listeners. Call on sign out. */
  stopListening: () => void;
  /** Mark a request as fully read (baseline = current bid count). */
  markRead: (requestId: string) => void;
  /** Bid count for a request (defaults to 0). */
  getBidCount: (requestId: string) => number;
  /** Number of unread bids for a request. */
  getUnreadCount: (requestId: string) => number;
  /** Total unread across all requests. Used by the tab bar badge. */
  getTotalUnread: () => number;
}

// Module-level listener handles. Kept outside the store so they survive
// React Strict Mode double invocations.
let requestsUnsub: (() => void) | null = null;
const bidUnsubs: Record<string, () => void> = {};
let currentUserId: string | null = null;

const UNREAD_STORAGE_KEY = 'unreadBaseline_v1';

async function loadBaselineFromStorage(): Promise<Record<string, UnreadInfo>> {
  try {
    const raw = await AsyncStorage.getItem(UNREAD_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}

async function saveBaselineToStorage(data: Record<string, UnreadInfo>): Promise<void> {
  try {
    await AsyncStorage.setItem(UNREAD_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export const useRequestsStore = create<RequestsState>((set, get) => ({
  requests: [],
  bidCounts: {},
  unreadBaseline: {},
  isInitialized: false,

  startListening: (userId) => {
    if (currentUserId === userId && requestsUnsub) return; // already listening
    // If user changed, tear down previous listeners first
    if (requestsUnsub) get().stopListening();
    currentUserId = userId;

    // Load persisted "last seen" baseline before attaching listeners so the
    // first render of My Requests already reflects unread state correctly.
    loadBaselineFromStorage().then((baseline) => {
      set({ unreadBaseline: baseline });
    });

    requestsUnsub = requestService.onUserRequestsChanged(userId, (requests) => {
      set({ requests, isInitialized: true });

      // Diff: attach bid listeners for new requests, detach for removed ones
      const currentIds = new Set(requests.map((r) => r.id));

      // Clean up listeners for requests that no longer exist
      for (const id of Object.keys(bidUnsubs)) {
        if (!currentIds.has(id)) {
          bidUnsubs[id]();
          delete bidUnsubs[id];
          set((state) => {
            const next = { ...state.bidCounts };
            delete next[id];
            return { bidCounts: next };
          });
        }
      }

      // Attach bid listeners for requests we don't already watch
      for (const req of requests) {
        if (bidUnsubs[req.id]) continue;
        bidUnsubs[req.id] = bidService.onBidsChanged(req.id, (bids) => {
          set((state) => ({
            bidCounts: { ...state.bidCounts, [req.id]: bids.length },
          }));
        });
      }
    });
  },

  stopListening: () => {
    if (requestsUnsub) {
      requestsUnsub();
      requestsUnsub = null;
    }
    for (const unsub of Object.values(bidUnsubs)) unsub();
    for (const key of Object.keys(bidUnsubs)) delete bidUnsubs[key];
    currentUserId = null;
    set({ requests: [], bidCounts: {}, isInitialized: false });
  },

  markRead: (requestId) => {
    const bidCount = get().bidCounts[requestId] || 0;
    set((state) => {
      const next = {
        ...state.unreadBaseline,
        [requestId]: { lastSeenBidCount: bidCount },
      };
      saveBaselineToStorage(next);
      return { unreadBaseline: next };
    });
  },

  getBidCount: (requestId) => get().bidCounts[requestId] || 0,

  getUnreadCount: (requestId) => {
    const state = get();
    const bidCount = state.bidCounts[requestId] || 0;
    const seen = state.unreadBaseline[requestId]?.lastSeenBidCount || 0;
    return Math.max(0, bidCount - seen);
  },

  getTotalUnread: () => {
    const state = get();
    let total = 0;
    for (const req of state.requests) {
      // Only count unread for active requests — closed/in-progress don't nag
      if (req.status !== REQUEST_STATUS.OPEN && req.status !== REQUEST_STATUS.PAUSED) {
        continue;
      }
      const bidCount = state.bidCounts[req.id] || 0;
      const seen = state.unreadBaseline[req.id]?.lastSeenBidCount || 0;
      total += Math.max(0, bidCount - seen);
    }
    return total;
  },
}));
