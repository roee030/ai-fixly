jest.mock('../requests', () => ({}));
jest.mock('./firebaseChat', () => ({}));
jest.mock('../logger', () => ({ logger: { info: jest.fn() } }));

import { detectStatusChange } from './statusMonitor';

describe('detectStatusChange', () => {
  describe('completion signals', () => {
    it('detects "סיימתי"', () => {
      expect(detectStatusChange('סיימתי את העבודה')).toBe('closed');
    });

    it('detects "תודה רבה"', () => {
      expect(detectStatusChange('תודה רבה, הכל עובד')).toBe('closed');
    });

    it('detects "העבודה הסתיימה"', () => {
      expect(detectStatusChange('העבודה הסתיימה בהצלחה')).toBe('closed');
    });

    it('detects "מושלם"', () => {
      expect(detectStatusChange('מושלם, תודה!')).toBe('closed');
    });

    it('detects English "done"', () => {
      expect(detectStatusChange('All done!')).toBe('closed');
    });
  });

  describe('cancellation signals', () => {
    it('detects "ביטול"', () => {
      expect(detectStatusChange('ביטול, לא יכול להגיע')).toBe('cancelled');
    });

    it('detects "לא מגיע"', () => {
      expect(detectStatusChange('סליחה, לא מגיע היום')).toBe('cancelled');
    });

    it('detects English "cancel"', () => {
      expect(detectStatusChange('I need to cancel')).toBe('cancelled');
    });
  });

  describe('no signal', () => {
    it('returns null for regular messages', () => {
      expect(detectStatusChange('מתי אתה מגיע?')).toBeNull();
    });

    it('returns null for pricing messages', () => {
      expect(detectStatusChange('המחיר יהיה 350 שקל')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(detectStatusChange('')).toBeNull();
    });

    it('returns null for scheduling messages', () => {
      expect(detectStatusChange('אגיע מחר בבוקר בשעה 10')).toBeNull();
    });
  });
});
