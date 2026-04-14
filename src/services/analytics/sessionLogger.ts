import { Platform } from 'react-native';
import { getFirestore, collection, doc, setDoc, serverTimestamp } from '../firestore/imports';

/**
 * Lightweight session logger for CTO-level funnel tracking.
 * Every key user action is logged to Firestore for analyzing
 * where users drop off in the capture -> bid -> select -> review funnel.
 *
 * All writes are fire-and-forget -- never blocks UI.
 */

let _sessionId: string | null = null;
let _userId: string | null = null;

function getSessionId(): string {
  if (!_sessionId) {
    _sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
  return _sessionId;
}

export function setSessionUser(userId: string): void {
  _userId = userId;
}

export function logAction(
  action: string,
  screen: string,
  metadata?: Record<string, any>
): void {
  try {
    const db = getFirestore();
    const docRef = doc(collection(db, 'session_logs'));
    setDoc(docRef, {
      sessionId: getSessionId(),
      userId: _userId || 'anonymous',
      action,
      screen,
      platform: Platform.OS,
      metadata: metadata || {},
      createdAt: serverTimestamp(),
    }).catch(() => {}); // fire-and-forget
  } catch {
    // never block UI
  }
}
