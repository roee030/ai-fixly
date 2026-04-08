import { providerService } from './firebaseProviders';
import { logger } from '../logger';

const SEED_PROVIDERS = [
  {
    name: 'שמעון - אינסטלציה מקצועית',
    phone: '+972501111111',
    categories: ['plumbing'],
    location: { lat: 32.0853, lng: 34.7818 },
    radiusKm: 30,
    rating: 4.8,
    isActive: true,
  },
  {
    name: 'דוד חשמל ותאורה',
    phone: '+972502222222',
    categories: ['electrical'],
    location: { lat: 32.0700, lng: 34.7700 },
    radiusKm: 25,
    rating: 4.5,
    isActive: true,
  },
  {
    name: 'יוסי תיקונים כלליים',
    phone: '+972503333333',
    categories: ['plumbing', 'electrical', 'appliances', 'general'],
    location: { lat: 32.0900, lng: 34.7900 },
    radiusKm: 40,
    rating: 4.2,
    isActive: true,
  },
  {
    name: 'אבי השרברב',
    phone: '+972504444444',
    categories: ['plumbing', 'hvac'],
    location: { lat: 32.1000, lng: 34.8000 },
    radiusKm: 20,
    rating: 4.9,
    isActive: true,
  },
  {
    name: 'מוטי מיזוג אוויר',
    phone: '+972505555555',
    categories: ['hvac', 'electrical'],
    location: { lat: 31.9500, lng: 34.8000 },
    radiusKm: 35,
    rating: 4.6,
    isActive: true,
  },
  {
    name: 'רועי מחשבים ורשתות',
    phone: '+972506666666',
    categories: ['computers'],
    location: { lat: 32.0600, lng: 34.7500 },
    radiusKm: 30,
    rating: 4.7,
    isActive: true,
  },
  {
    name: 'חיים המנעולן',
    phone: '+972507777777',
    categories: ['locksmith'],
    location: { lat: 32.0800, lng: 34.8100 },
    radiusKm: 25,
    rating: 4.4,
    isActive: true,
  },
  {
    name: 'ניר צבעי ושיפוצים',
    phone: '+972508888888',
    categories: ['painting', 'general'],
    location: { lat: 32.0500, lng: 34.7600 },
    radiusKm: 30,
    rating: 4.3,
    isActive: true,
  },
];

export async function seedProviders(): Promise<void> {
  logger.info('Seeding providers...');
  for (const provider of SEED_PROVIDERS) {
    try {
      await providerService.addProvider(provider);
    } catch (err) {
      logger.warn('Provider may already exist', { name: provider.name });
    }
  }
  logger.info('Providers seeded', { count: SEED_PROVIDERS.length });
}
