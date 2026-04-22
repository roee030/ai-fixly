import { resolveCity } from './resolveCity';

describe('resolveCity', () => {
  it('returns hadera for Hadera center', () => {
    expect(resolveCity(32.4384, 34.9196)).toEqual({ city: 'hadera', region: 'sharon' });
  });

  it('returns netanya for Netanya center', () => {
    expect(resolveCity(32.3329, 34.8599)).toEqual({ city: 'netanya', region: 'sharon' });
  });

  it('returns tlv for Tel Aviv center', () => {
    expect(resolveCity(32.0853, 34.7818)).toEqual({ city: 'tlv', region: 'center' });
  });

  it('returns ramat_gan for a point inside Ramat Gan (not TLV)', () => {
    // Ramat Gan box sits above the TLV box in CITY_BOXES so it wins.
    expect(resolveCity(32.08, 34.82)).toEqual({ city: 'ramat_gan', region: 'center' });
  });

  it('returns haifa for Haifa center', () => {
    expect(resolveCity(32.80, 35.00)).toEqual({ city: 'haifa', region: 'north' });
  });

  it('returns jerusalem for Jerusalem center', () => {
    expect(resolveCity(31.78, 35.22)).toEqual({ city: 'jerusalem', region: 'center' });
  });

  it('returns unknown for coordinates outside every box', () => {
    expect(resolveCity(0, 0)).toEqual({ city: 'unknown', region: 'unknown' });
  });

  it('returns unknown for coordinates just outside a box boundary', () => {
    // Hadera max is 32.48 / 34.96 — these are outside.
    expect(resolveCity(32.49, 34.90)).toEqual({ city: 'unknown', region: 'unknown' });
    expect(resolveCity(32.45, 34.97)).toEqual({ city: 'unknown', region: 'unknown' });
  });
});
