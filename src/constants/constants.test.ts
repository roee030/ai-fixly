import { COLORS, SPACING, RADII, FONT_SIZES } from './theme';
import { LIMITS } from './limits';
import { SERVICE_CATEGORIES } from './categories';
import { REQUEST_STATUS, BID_STATUS, REQUEST_STATUS_LABELS } from './status';
import { ANIMATION } from './animation';

describe('Theme constants', () => {
  it('has all required colors', () => {
    expect(COLORS.primary).toBeDefined();
    expect(COLORS.background).toBeDefined();
    expect(COLORS.text).toBeDefined();
    expect(COLORS.error).toBeDefined();
    expect(COLORS.success).toBeDefined();
    expect(COLORS.warning).toBeDefined();
  });

  it('colors are valid hex or rgba', () => {
    Object.values(COLORS).forEach((color) => {
      expect(color).toMatch(/^(#[0-9A-Fa-f]{6}|rgba?\(.+\))$/);
    });
  });

  it('spacing values are positive numbers', () => {
    Object.values(SPACING).forEach((val) => {
      expect(typeof val).toBe('number');
      expect(val).toBeGreaterThan(0);
    });
  });

  it('font sizes are positive numbers', () => {
    Object.values(FONT_SIZES).forEach((val) => {
      expect(typeof val).toBe('number');
      expect(val).toBeGreaterThan(0);
    });
  });
});

describe('Limits constants', () => {
  it('has reasonable file limits', () => {
    expect(LIMITS.MAX_IMAGE_SIZE_MB).toBeGreaterThan(0);
    expect(LIMITS.MAX_IMAGE_SIZE_MB).toBeLessThanOrEqual(50);
    expect(LIMITS.MAX_IMAGES_PER_REQUEST).toBeGreaterThan(0);
    expect(LIMITS.MAX_IMAGES_PER_REQUEST).toBeLessThanOrEqual(10);
  });

  it('OTP length is 6', () => {
    expect(LIMITS.OTP_LENGTH).toBe(6);
  });

  it('search radius is reasonable', () => {
    expect(LIMITS.SEARCH_RADIUS_KM).toBeGreaterThan(0);
    expect(LIMITS.SEARCH_RADIUS_KM).toBeLessThanOrEqual(100);
  });
});

describe('Categories', () => {
  it('has at least 5 categories', () => {
    expect(SERVICE_CATEGORIES.length).toBeGreaterThanOrEqual(5);
  });

  it('each category has required fields', () => {
    SERVICE_CATEGORIES.forEach((cat) => {
      expect(cat.id).toBeTruthy();
      expect(cat.labelHe).toBeTruthy();
      expect(cat.labelEn).toBeTruthy();
      expect(cat.icon).toBeTruthy();
    });
  });

  it('category IDs are unique', () => {
    const ids = SERVICE_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Status constants', () => {
  it('has all request statuses', () => {
    expect(REQUEST_STATUS.DRAFT).toBe('draft');
    expect(REQUEST_STATUS.OPEN).toBe('open');
    expect(REQUEST_STATUS.IN_PROGRESS).toBe('in_progress');
    expect(REQUEST_STATUS.PAUSED).toBe('paused');
    expect(REQUEST_STATUS.CLOSED).toBe('closed');
  });

  it('has labels for all statuses', () => {
    Object.values(REQUEST_STATUS).forEach((status) => {
      expect(REQUEST_STATUS_LABELS[status]).toBeDefined();
      expect(REQUEST_STATUS_LABELS[status].he).toBeTruthy();
      expect(REQUEST_STATUS_LABELS[status].en).toBeTruthy();
    });
  });

  it('has all bid statuses', () => {
    expect(BID_STATUS.PENDING).toBe('pending');
    expect(BID_STATUS.ACCEPTED).toBe('accepted');
    expect(BID_STATUS.REJECTED).toBe('rejected');
    expect(BID_STATUS.EXPIRED).toBe('expired');
  });
});

describe('Animation constants', () => {
  it('durations are positive', () => {
    expect(ANIMATION.FAST).toBeGreaterThan(0);
    expect(ANIMATION.NORMAL).toBeGreaterThan(ANIMATION.FAST);
    expect(ANIMATION.SLOW).toBeGreaterThan(ANIMATION.NORMAL);
  });
});
