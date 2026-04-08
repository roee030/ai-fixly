import { z } from 'zod';
import { LIMITS } from '../constants/limits';

export const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().min(1),
});

export const mediaItemSchema = z.object({
  type: z.enum(['image', 'video', 'voice']),
  url: z.string().url(),
  storagePath: z.string().min(1),
});

export const createRequestSchema = z.object({
  userId: z.string().min(1),
  media: z.array(mediaItemSchema).min(1).max(LIMITS.MAX_IMAGES_PER_REQUEST),
  textDescription: z.string().max(1000).optional(),
  location: locationSchema,
});

export const bidSchema = z.object({
  price: z.number().min(LIMITS.MIN_BID_PRICE),
  availability: z.string().min(1),
  providerName: z.string().min(1),
});

export type LocationInput = z.infer<typeof locationSchema>;
export type MediaItemInput = z.infer<typeof mediaItemSchema>;
export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type BidInput = z.infer<typeof bidSchema>;
