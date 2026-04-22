import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Persists an in-progress service-request capture to AsyncStorage so the
 * user can pick up where they left off after force-kill / crash / network
 * failure mid-upload. Drafts older than 24h are silently discarded.
 *
 * Storage key: `draft:request:{userId}` — per-user, per-device. If the
 * user signs in on another device mid-capture, the draft does not follow.
 * Acceptable trade-off for zero server cost.
 */

export const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const ANALYSIS_VERSION = 'v1';

export interface RequestDraft {
  createdAt: string;  // ISO timestamp
  imageUris: string[];
  videoAssets: { uri: string; thumbnailUri?: string }[];
  description: string;
  analysis: unknown | null;
  chosenProfessions: string[];
  analysisKey?: string;
  analysisVersion: string;
}

export type RequestDraftInput = Omit<RequestDraft, 'createdAt' | 'analysisVersion'>;

function storageKey(userId: string): string {
  return `draft:request:${userId}`;
}

async function save(userId: string, data: RequestDraftInput): Promise<void> {
  const draft: RequestDraft = {
    ...data,
    createdAt: new Date().toISOString(),
    analysisVersion: ANALYSIS_VERSION,
  };
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(draft));
}

async function load(userId: string): Promise<RequestDraft | null> {
  const raw = await AsyncStorage.getItem(storageKey(userId));
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw) as RequestDraft;
    const age = Date.now() - new Date(draft.createdAt).getTime();
    if (age > DRAFT_TTL_MS) {
      await AsyncStorage.removeItem(storageKey(userId));
      return null;
    }
    if (draft.analysisVersion !== ANALYSIS_VERSION) {
      // Prompt format changed under our feet — drop the stale analysis
      // but keep the media + text so the user can re-run silently.
      await AsyncStorage.removeItem(storageKey(userId));
      return null;
    }
    return draft;
  } catch {
    // Corrupted JSON — wipe and bail.
    await AsyncStorage.removeItem(storageKey(userId));
    return null;
  }
}

async function remove(userId: string): Promise<void> {
  await AsyncStorage.removeItem(storageKey(userId));
}

export const draftService = { save, load, remove };
