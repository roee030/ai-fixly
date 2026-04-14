/**
 * Single source of truth for test mock data.
 * Used by BOTH the automated screen tests AND the dev gallery.
 *
 * Every mock object represents a realistic state that a real user would see.
 * Keep them consistent — if mockRequest references mockBid.id, they must match.
 */

import type { ServiceRequest } from '../../src/services/requests';
import type { Bid } from '../../src/services/bids';
import type { ChatMessage } from '../../src/services/chat';
import type { AuthUser } from '../../src/services/auth/types';

// ============================================================================
// Auth
// ============================================================================

export const mockUser: AuthUser = {
  uid: 'test-user-123',
  phoneNumber: '+972541234567',
  displayName: 'ישראל ישראלי',
  email: null,
};

// ============================================================================
// Requests
// ============================================================================

export const mockRequestOpen: ServiceRequest = {
  id: 'req-open-001',
  userId: mockUser.uid,
  status: 'open',
  media: [
    {
      type: 'image',
      uri: 'https://via.placeholder.com/300x200',
      downloadUrl: 'https://via.placeholder.com/300x200',
      fileName: 'leak.jpg',
    },
  ],
  aiAnalysis: {
    professions: ['plumber'],
    professionLabelsHe: ['אינסטלטור'],
    shortSummary: 'נזילה מתחת לכיור במטבח',
    problemId: 'leaking_faucet',
    urgency: 'normal',
  },
  location: {
    lat: 32.0853,
    lng: 34.7818,
    address: 'תל אביב, רחוב דיזנגוף 50',
  },
  textDescription: 'יש נזילה מתחת לכיור כבר יומיים',
  createdAt: new Date('2026-04-10T08:00:00Z'),
  updatedAt: new Date('2026-04-10T08:00:00Z'),
};

export const mockRequestInProgress: ServiceRequest = {
  ...mockRequestOpen,
  id: 'req-progress-001',
  status: 'in_progress',
  updatedAt: new Date('2026-04-10T10:00:00Z'),
};

export const mockRequestClosed: ServiceRequest = {
  ...mockRequestOpen,
  id: 'req-closed-001',
  status: 'closed',
  updatedAt: new Date('2026-04-10T14:00:00Z'),
};

// ============================================================================
// Bids
// ============================================================================

export const mockBidReal: Bid = {
  id: 'bid-001',
  requestId: mockRequestOpen.id,
  providerName: 'יוסי האינסטלטור',
  providerPhone: '+972521234567',
  price: 350,
  availability: 'מחר בבוקר',
  availabilityStartAt: '2026-04-11T06:00:00.000Z',
  rating: 4.7,
  address: 'תל אביב',
  isReal: true,
  source: 'whatsapp',
  createdAt: new Date('2026-04-10T09:00:00Z'),
};

export const mockBidDemo: Bid = {
  id: 'bid-002',
  requestId: mockRequestOpen.id,
  providerName: 'שרברב מקצועי בע"מ',
  providerPhone: '+972531234567',
  price: 450,
  availability: 'היום אחה"צ',
  availabilityStartAt: '2026-04-10T12:00:00.000Z',
  rating: 4.2,
  address: 'רמת גן',
  isReal: false,
  source: 'google_places_demo',
  createdAt: new Date('2026-04-10T09:05:00Z'),
};

export const mockBids: Bid[] = [mockBidReal, mockBidDemo];

// ============================================================================
// Chat
// ============================================================================

export const mockChatMessages: ChatMessage[] = [
  {
    id: 'msg-001',
    requestId: mockRequestInProgress.id,
    senderId: 'system',
    senderType: 'system',
    text: 'יוסי האינסטלטור אישר את העבודה ומוכן להתחיל',
    createdAt: new Date('2026-04-10T10:00:00Z'),
  },
  {
    id: 'msg-002',
    requestId: mockRequestInProgress.id,
    senderId: '+972521234567',
    senderType: 'provider',
    text: 'שלום! אני יוסי. קיבלתי את הפרטים. אגיע מחר ב-9 בבוקר.',
    createdAt: new Date('2026-04-10T10:01:00Z'),
  },
  {
    id: 'msg-003',
    requestId: mockRequestInProgress.id,
    senderId: mockUser.uid,
    senderType: 'customer',
    text: 'מעולה, תודה! הכתובת היא דיזנגוף 50 תל אביב.',
    createdAt: new Date('2026-04-10T10:05:00Z'),
  },
];

// ============================================================================
// AI Analysis result (for confirm screen)
// ============================================================================

export const mockAiResult = {
  professions: ['plumber'] as string[],
  professionLabelsHe: ['אינסטלטור'] as string[],
  shortSummary: 'נזילה מתחת לכיור במטבח',
  problemId: 'leaking_faucet',
  urgency: 'normal' as const,
};

// ============================================================================
// All screens registry (used by dev gallery)
// ============================================================================

export interface ScreenInfo {
  name: string;
  nameHe: string;
  route: string;
  /** Props/params needed to render this screen in the gallery */
  params?: Record<string, string>;
}

export const ALL_SCREENS: ScreenInfo[] = [
  { name: 'Onboarding', nameHe: 'הצגה ראשונית', route: '/onboarding' },
  { name: 'Phone Auth', nameHe: 'הזנת טלפון', route: '/(auth)/phone' },
  { name: 'Verify OTP', nameHe: 'אימות קוד', route: '/(auth)/verify', params: { verificationId: 'mock' } },
  { name: 'Profile Setup', nameHe: 'הגדרת פרופיל', route: '/(auth)/profile-setup' },
  { name: 'Permissions', nameHe: 'הרשאות', route: '/(auth)/permissions' },
  { name: 'Home', nameHe: 'דף הבית', route: '/(tabs)' },
  { name: 'My Requests', nameHe: 'הקריאות שלי', route: '/(tabs)/requests' },
  { name: 'Profile', nameHe: 'פרופיל', route: '/(tabs)/profile' },
  { name: 'Capture', nameHe: 'צילום', route: '/capture' },
  { name: 'Confirm', nameHe: 'אישור בקשה', route: '/capture/confirm' },
  { name: 'Sent', nameHe: 'נשלח', route: '/capture/sent' },
  { name: 'Request Details', nameHe: 'פרטי בקשה', route: '/request/req-open-001', params: { id: 'req-open-001' } },
  { name: 'Chat', nameHe: 'צ\'אט', route: '/chat/req-progress-001', params: { requestId: 'req-progress-001' } },
  { name: 'Service Page', nameHe: 'דף שירות', route: '/services/plumber', params: { profession: 'plumber' } },
];
