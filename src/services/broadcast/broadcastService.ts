import { providerService } from '../providers';
import { whatsAppService } from '../whatsapp';
import { logger } from '../logger';
import { analyticsService } from '../analytics';

interface BroadcastInput {
  requestId: string;
  category: string;
  proFacingSummary: string;
  mediaUrls: string[];
  location: { lat: number; lng: number };
}

export async function broadcastToProviders(input: BroadcastInput): Promise<number> {
  const { requestId, category, proFacingSummary, mediaUrls, location } = input;

  logger.info('Broadcasting request to providers', { requestId, category });

  const providers = await providerService.findProviders(
    category,
    location.lat,
    location.lng
  );

  if (providers.length === 0) {
    logger.warn('No providers found', { category, lat: location.lat.toString(), lng: location.lng.toString() });
    return 0;
  }

  logger.info(`Found ${providers.length} providers`, { requestId });

  let sentCount = 0;

  for (const provider of providers) {
    const message = [
      `שלום ${provider.name},`,
      '',
      'קיבלנו בקשת שירות חדשה באזור שלך:',
      '',
      proFacingSummary,
      '',
      'מעוניין? אנא השב עם:',
      '1. מחיר משוער',
      '2. מתי תוכל להגיע? (ימים ושעות)',
      '',
      'תודה!',
    ].join('\n');

    const result = await whatsAppService.sendMessage({
      to: provider.phone,
      body: message,
      mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
    });

    if (result.success) {
      sentCount++;
    }
  }

  analyticsService.trackEvent('request_sent', {
    requestId,
    providerCount: sentCount,
  });

  logger.info('Broadcast complete', { requestId, sent: sentCount.toString(), total: providers.length.toString() });
  return sentCount;
}
