export type ReviewCategory = 'punctuality' | 'professionalism' | 'fair_price' | 'cleanliness';

export const REVIEW_CATEGORIES: { key: ReviewCategory; labelHe: string; icon: string }[] = [
  { key: 'punctuality', labelHe: 'דייקנות', icon: 'time-outline' },
  { key: 'professionalism', labelHe: 'מקצועיות', icon: 'ribbon-outline' },
  { key: 'fair_price', labelHe: 'מחיר הוגן', icon: 'pricetag-outline' },
  { key: 'cleanliness', labelHe: 'ניקיון', icon: 'sparkles-outline' },
];

export interface Review {
  id: string;
  requestId: string;
  userId: string;
  providerPhone: string;
  providerName: string;
  rating: number; // 1-5
  categories: ReviewCategory[]; // which tags were selected
  comment: string; // optional free text
  pricePaid: number | null; // actual price the customer paid (optional)
  /** Did the AI send the right type of professional? null = not answered */
  classificationCorrect: boolean | null;
  /** If classificationCorrect=false, what did they actually need? */
  wrongProfessionNote: string | null;
  createdAt: Date;
}

export interface ReviewService {
  submitReview(review: Omit<Review, 'id' | 'createdAt'>): Promise<void>;
  getReviewsForProvider(providerPhone: string): Promise<Review[]>;
  hasReviewForRequest(requestId: string): Promise<boolean>;
}
