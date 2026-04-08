import { locationSchema, mediaItemSchema, createRequestSchema, bidSchema } from './serviceRequest';

describe('locationSchema', () => {
  it('accepts valid location', () => {
    expect(() => locationSchema.parse({ lat: 32.08, lng: 34.78, address: 'Tel Aviv' })).not.toThrow();
  });

  it('rejects invalid latitude', () => {
    expect(() => locationSchema.parse({ lat: 100, lng: 34.78, address: 'Test' })).toThrow();
  });

  it('rejects missing address', () => {
    expect(() => locationSchema.parse({ lat: 32, lng: 34, address: '' })).toThrow();
  });
});

describe('mediaItemSchema', () => {
  it('accepts valid image', () => {
    expect(() => mediaItemSchema.parse({
      type: 'image',
      url: 'https://example.com/img.jpg',
      storagePath: 'requests/123/img.jpg',
    })).not.toThrow();
  });

  it('rejects invalid type', () => {
    expect(() => mediaItemSchema.parse({
      type: 'pdf',
      url: 'https://example.com/file.pdf',
      storagePath: 'test',
    })).toThrow();
  });
});

describe('createRequestSchema', () => {
  const validMedia = {
    type: 'image' as const,
    url: 'https://example.com/img.jpg',
    storagePath: 'requests/123/img.jpg',
  };

  it('accepts valid request', () => {
    expect(() => createRequestSchema.parse({
      userId: 'user123',
      media: [validMedia],
      location: { lat: 32.08, lng: 34.78, address: 'Tel Aviv' },
    })).not.toThrow();
  });

  it('rejects empty media', () => {
    expect(() => createRequestSchema.parse({
      userId: 'user123',
      media: [],
      location: { lat: 32.08, lng: 34.78, address: 'Tel Aviv' },
    })).toThrow();
  });

  it('rejects missing userId', () => {
    expect(() => createRequestSchema.parse({
      userId: '',
      media: [validMedia],
      location: { lat: 32.08, lng: 34.78, address: 'Tel Aviv' },
    })).toThrow();
  });
});

describe('bidSchema', () => {
  it('accepts valid bid', () => {
    expect(() => bidSchema.parse({
      price: 350,
      availability: 'מחר בבוקר',
      providerName: 'יוסי',
    })).not.toThrow();
  });

  it('rejects price below minimum', () => {
    expect(() => bidSchema.parse({
      price: 10,
      availability: 'היום',
      providerName: 'Test',
    })).toThrow();
  });

  it('rejects empty availability', () => {
    expect(() => bidSchema.parse({
      price: 200,
      availability: '',
      providerName: 'Test',
    })).toThrow();
  });
});
