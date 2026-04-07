import { userCreateSchema, phoneNumberSchema, otpSchema } from './user';

describe('phoneNumberSchema', () => {
  it('accepts valid Israeli phone number', () => {
    expect(() => phoneNumberSchema.parse('+972501234567')).not.toThrow();
  });

  it('rejects empty string', () => {
    expect(() => phoneNumberSchema.parse('')).toThrow();
  });

  it('rejects too short number', () => {
    expect(() => phoneNumberSchema.parse('+972')).toThrow();
  });
});

describe('otpSchema', () => {
  it('accepts 6-digit code', () => {
    expect(() => otpSchema.parse('123456')).not.toThrow();
  });

  it('rejects 5-digit code', () => {
    expect(() => otpSchema.parse('12345')).toThrow();
  });

  it('rejects non-numeric', () => {
    expect(() => otpSchema.parse('12345a')).toThrow();
  });
});

describe('userCreateSchema', () => {
  it('accepts valid input', () => {
    const result = userCreateSchema.parse({
      phone: '+972501234567',
      displayName: 'Test User',
    });
    expect(result.displayName).toBe('Test User');
  });

  it('trims displayName whitespace', () => {
    const result = userCreateSchema.parse({
      phone: '+972501234567',
      displayName: '  Test User  ',
    });
    expect(result.displayName).toBe('Test User');
  });

  it('rejects short displayName', () => {
    expect(() =>
      userCreateSchema.parse({ phone: '+972501234567', displayName: 'A' })
    ).toThrow();
  });
});
