import { requestService } from '../requests';
import { chatService } from './firebaseChat';
import { REQUEST_STATUS } from '../../constants/status';
import { logger } from '../logger';

const COMPLETION_SIGNALS = [
  'סיימתי',
  'סיימנו',
  'העבודה הסתיימה',
  'תודה רבה',
  'הכל בסדר',
  'מושלם',
  'עבודה יפה',
  'finished',
  'done',
  'completed',
];

const CANCELLATION_SIGNALS = [
  'ביטול',
  'מבטל',
  'לא מגיע',
  'לא יכול',
  'cancel',
];

export function detectStatusChange(text: string): 'closed' | 'cancelled' | null {
  const lower = text.toLowerCase().trim();

  for (const signal of COMPLETION_SIGNALS) {
    if (lower.includes(signal)) return 'closed';
  }

  for (const signal of CANCELLATION_SIGNALS) {
    if (lower.includes(signal)) return 'cancelled';
  }

  return null;
}

export async function monitorAndUpdateStatus(
  requestId: string,
  messageText: string,
  senderType: 'customer' | 'provider'
): Promise<void> {
  const detected = detectStatusChange(messageText);

  if (detected === 'closed') {
    logger.info('AI detected job completion', { requestId, senderType });
    await requestService.updateStatus(requestId, REQUEST_STATUS.CLOSED);
    await chatService.sendSystemMessage(
      requestId,
      'המערכת זיהתה שהעבודה הסתיימה. הסטטוס עודכן ל"סגור". תודה!'
    );
  } else if (detected === 'cancelled' && senderType === 'provider') {
    logger.info('AI detected provider cancellation', { requestId });
    await requestService.updateStatus(requestId, REQUEST_STATUS.OPEN);
    await chatService.sendSystemMessage(
      requestId,
      'בעל המקצוע ביטל. הבקשה חזרה למצב פתוח ואנחנו מחפשים חלופה.'
    );
  }
}
