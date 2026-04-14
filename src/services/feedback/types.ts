export type FeedbackSeverity = 'critical' | 'bug' | 'suggestion';

export interface Feedback {
  id: string;
  userId: string;
  userPhone: string;
  screen: string;
  errorMessage: string | null;
  freeText: string;
  severity: FeedbackSeverity;
  platform: string;
  createdAt: Date;
}

export const SEVERITY_OPTIONS: { key: FeedbackSeverity; labelHe: string; icon: string; color: string }[] = [
  { key: 'critical', labelHe: '\u05E7\u05E8\u05D9\u05D8\u05D9', icon: 'alert-circle', color: '#EF4444' },
  { key: 'bug', labelHe: '\u05D1\u05D0\u05D2', icon: 'bug', color: '#F59E0B' },
  { key: 'suggestion', labelHe: '\u05D4\u05E6\u05E2\u05D4', icon: 'bulb', color: '#6366F1' },
];
