import type {
  FunnelData, ProviderStat, EngagementData, AdminAlert,
  DemandEntry,
} from './types';

// ================================================
// HEADLINE STATS
// ================================================
export const MOCK_HEADLINE = {
  todayRequests: 8,
  todayMatches: 3,
  avgResponseMinutes: 18,
  activeRequests: 5,
  openWave1: 2,
  openWave2: 1,
  openWave3: 0,
};

// ================================================
// FUNNEL (conversion metrics)
// ================================================
export const MOCK_FUNNEL: FunnelData = {
  steps: [
    { name: 'app_opened', nameHe: 'פתחו את האפליקציה', count: 245, dropOff: 0, conversionPercent: 100, issue: '' },
    { name: 'capture_started', nameHe: 'התחילו לצלם/לתאר', count: 127, dropOff: 118, conversionPercent: 52, issue: '48% לא התחילו — אולי המסך הראשי לא מספיק מושך' },
    { name: 'media_added', nameHe: 'הוסיפו תמונה/סרטון', count: 98, dropOff: 29, conversionPercent: 40, issue: '23% לא הוסיפו מדיה — האם שלב הצילום מסובך?' },
    { name: 'submitted', nameHe: 'שלחו בקשה', count: 89, dropOff: 9, conversionPercent: 36, issue: '' },
    { name: 'received_bid', nameHe: 'קיבלו לפחות הצעה אחת', count: 64, dropOff: 25, conversionPercent: 26, issue: '28% לא קיבלו הצעות — חסרים ספקים?' },
    { name: 'selected_provider', nameHe: 'בחרו ספק', count: 45, dropOff: 19, conversionPercent: 18, issue: 'נטישה הגדולה ביותר — מחירים גבוהים?' },
    { name: 'job_completed', nameHe: 'עבודה הושלמה', count: 33, dropOff: 12, conversionPercent: 13, issue: '' },
    { name: 'review_left', nameHe: 'השאירו ביקורת', count: 22, dropOff: 11, conversionPercent: 9, issue: '33% לא דירגו — התזכורת ב-24 שעות עוזרת?' },
  ],
  avgTimeToFirstBid: 18,
  avgBidsPerRequest: 3.2,
  requestsWithZeroBids: 25,
  totalRequests: 89,
  conversionRate: 37,
  abandonedAfterBids: 19,
  returningCustomers: 12,
  totalCustomers: 82,
};

// ================================================
// PROVIDERS (supply health)
// ================================================
export const MOCK_PROVIDERS: ProviderStat[] = [
  { displayName: 'שלומי א.', phone: '+972521111111', profession: 'אינסטלטור', area: 'חדרה', offersSent: 18, accepted: 12, completed: 9, customerConfirmed: 7, avgRating: 4.8, avgPrice: 380, replyRate: 67, avgResponseMinutes: 12, verified: true, grossValue: 3420 },
  { displayName: 'יוסי כ.', phone: '+972522222222', profession: 'חשמלאי', area: 'נתניה', offersSent: 15, accepted: 8, completed: 6, customerConfirmed: 5, avgRating: 4.5, avgPrice: 420, replyRate: 53, avgResponseMinutes: 25, verified: true, grossValue: 2520 },
  { displayName: 'מוחמד ח.', phone: '+972523333333', profession: 'טכנאי מזגנים', area: 'חדרה', offersSent: 12, accepted: 7, completed: 5, customerConfirmed: 4, avgRating: 4.3, avgPrice: 350, replyRate: 58, avgResponseMinutes: 35, verified: false, grossValue: 1750 },
  { displayName: 'אלכס ר.', phone: '+972524444444', profession: 'צבעי', area: 'בנימינה', offersSent: 10, accepted: 4, completed: 3, customerConfirmed: 2, avgRating: 3.9, avgPrice: 450, replyRate: 40, avgResponseMinutes: 48, verified: true, grossValue: 1350 },
  { displayName: 'דוד מ.', phone: '+972525555555', profession: 'אינסטלטור', area: 'נתניה', offersSent: 8, accepted: 2, completed: 1, customerConfirmed: 1, avgRating: 2.5, avgPrice: 500, replyRate: 25, avgResponseMinutes: 120, verified: false, grossValue: 500 },
  { displayName: 'חיים ב.', phone: '+972526666666', profession: 'מנעולן', area: 'קיסריה', offersSent: 7, accepted: 5, completed: 4, customerConfirmed: 3, avgRating: 4.7, avgPrice: 300, replyRate: 71, avgResponseMinutes: 8, verified: true, grossValue: 1200 },
  { displayName: 'ויקטור ג.', phone: '+972527777777', profession: 'חשמלאי', area: 'חדרה', offersSent: 5, accepted: 1, completed: 0, customerConfirmed: 0, avgRating: null, avgPrice: null, replyRate: 20, avgResponseMinutes: 180, verified: false, grossValue: 0 },
];

// ================================================
// ACTIVE REQUESTS (live queue)
// ================================================
export const MOCK_ACTIVE_REQUESTS = [
  { id: 'req-1', customerPhone: '054-***-1234', profession: 'אינסטלטור', area: 'חדרה', wave: 1, bidCount: 2, minutesOpen: 45, description: 'צינור דולף במטבח' },
  { id: 'req-2', customerPhone: '052-***-5678', profession: 'חשמלאי', area: 'נתניה', wave: 2, bidCount: 0, minutesOpen: 120, description: 'שקע לא עובד בסלון' },
  { id: 'req-3', customerPhone: '050-***-9012', profession: 'טכנאי מזגנים', area: 'קיסריה', wave: 1, bidCount: 3, minutesOpen: 30, description: 'מזגן לא מקרר' },
  { id: 'req-4', customerPhone: '058-***-3456', profession: 'מנעולן', area: 'אור עקיבא', wave: 1, bidCount: 1, minutesOpen: 15, description: 'ננעלתי בחוץ' },
  { id: 'req-5', customerPhone: '053-***-7890', profession: 'צבעי', area: 'פרדס חנה', wave: 3, bidCount: 0, minutesOpen: 240, description: 'צביעת חדר שינה' },
];

// ================================================
// GEO INSIGHTS
// ================================================
export const MOCK_WAITLIST_BY_CITY = [
  { city: 'תל אביב', count: 34 },
  { city: 'חיפה', count: 18 },
  { city: 'הרצליה', count: 12 },
  { city: 'כפר סבא', count: 8 },
  { city: 'רעננה', count: 6 },
  { city: 'ראשון לציון', count: 5 },
];

export const MOCK_DEMAND: DemandEntry[] = [
  { profession: 'אינסטלטור', professionKey: 'plumber', city: 'חדרה', requests: 12, avgBids: 3.5 },
  { profession: 'חשמלאי', professionKey: 'electrician', city: 'נתניה', requests: 8, avgBids: 2.1 },
  { profession: 'טכנאי מזגנים', professionKey: 'hvac_contractor', city: 'קיסריה', requests: 5, avgBids: 0.4 },
  { profession: 'מנעולן', professionKey: 'locksmith', city: 'חדרה', requests: 4, avgBids: 4.0 },
  { profession: 'צבעי', professionKey: 'painter', city: 'בנימינה', requests: 3, avgBids: 1.2 },
  { profession: 'אינסטלטור', professionKey: 'plumber', city: 'נתניה', requests: 7, avgBids: 2.8 },
  { profession: 'טכנאי מחשבים', professionKey: 'computer_repair', city: 'נתניה', requests: 3, avgBids: 0 },
  { profession: 'טכנאי תריסים', professionKey: 'shutter_technician', city: 'פרדס חנה', requests: 2, avgBids: 0 },
  { profession: 'חשמלאי', professionKey: 'electrician', city: 'חדרה', requests: 6, avgBids: 3.8 },
];

// ================================================
// REVENUE (financial)
// ================================================
export const MOCK_REVENUE = {
  avgJobValue: 385,
  totalJobValue: 12705,
  potentialCommission10: 1271,
  totalCompleted: 33,
  categoryAvgPrices: [
    { category: 'אינסטלטור', avgPrice: 380, count: 12 },
    { category: 'חשמלאי', avgPrice: 420, count: 8 },
    { category: 'מנעולן', avgPrice: 300, count: 5 },
    { category: 'צבעי', avgPrice: 450, count: 4 },
    { category: 'טכנאי מזגנים', avgPrice: 350, count: 4 },
  ],
};

// ================================================
// ERRORS & FEEDBACK
// ================================================
export const MOCK_ERRORS = {
  totalFeedback: 8,
  criticalCount: 2,
  bugCount: 4,
  suggestionCount: 2,
  aiFailures: 3,
  recentFeedback: [
    { severity: 'critical' as const, text: 'האפליקציה נתקעת אחרי שליחת הבקשה', screen: 'confirm', time: 'לפני שעתיים' },
    { severity: 'bug' as const, text: 'לא מצליח להעלות סרטון', screen: 'capture', time: 'לפני 4 שעות' },
    { severity: 'bug' as const, text: 'הצ\'אט לא מציג הודעות ישנות', screen: 'chat', time: 'לפני 6 שעות' },
    { severity: 'suggestion' as const, text: 'שווה להוסיף חיפוש לפי שם ספק', screen: 'requests', time: 'לפני יום' },
  ],
};

// ================================================
// LOW-RATED PROVIDERS (alerts)
// ================================================
export const MOCK_LOW_RATED = [
  { name: 'דוד מ.', profession: 'אינסטלטור', rating: 2.5, reviews: 3, lastReview: 'הגיע באיחור של שעתיים, לא סיים את העבודה' },
];

// Keep existing exports for backward compat
export const MOCK_ENGAGEMENT: EngagementData = {
  messagesSent: 75,
  providerReplied: 39,
  replyWithin1h: 22,
  replyWithin4h: 31,
  positiveReplyRate: 52,
  avgResponseTimeMinutes: 42,
};

export const MOCK_ALERTS: AdminAlert[] = [
  { id: 'a1', type: 'no_bids', severity: 'critical', message: 'בקשה לחשמלאי בנתניה ללא הצעות — 2 שעות', metadata: { requestId: 'req-2' }, read: false, createdAt: new Date(Date.now() - 30 * 60000) },
  { id: 'a2', type: 'low_rating', severity: 'warning', message: 'דוד מ. קיבל 2.5 כוכבים — שקול חסימה', metadata: { providerPhone: '+972525555555' }, read: false, createdAt: new Date(Date.now() - 2 * 3600000) },
  { id: 'a3', type: 'unresponsive', severity: 'warning', message: 'ויקטור ג. לא ענה ל-5 הצעות', metadata: { providerPhone: '+972527777777' }, read: true, createdAt: new Date(Date.now() - 5 * 3600000) },
  { id: 'a4', type: 'new_signup', severity: 'info', message: 'ספק חדש נרשם: רון לוי (חשמלאי)', metadata: {}, read: true, createdAt: new Date(Date.now() - 8 * 3600000) },
];
