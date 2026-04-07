export const REQUEST_STATUS = {
  DRAFT: 'draft',
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  PAUSED: 'paused',
  CLOSED: 'closed',
} as const;

export type RequestStatus = typeof REQUEST_STATUS[keyof typeof REQUEST_STATUS];

export const REQUEST_STATUS_LABELS: Record<RequestStatus, { he: string; en: string }> = {
  draft: { he: 'טיוטה', en: 'Draft' },
  open: { he: 'פתוח', en: 'Open' },
  in_progress: { he: 'בטיפול', en: 'In Progress' },
  paused: { he: 'מושהה', en: 'Paused' },
  closed: { he: 'סגור', en: 'Closed' },
};

export const BID_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
} as const;

export type BidStatus = typeof BID_STATUS[keyof typeof BID_STATUS];
