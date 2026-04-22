import { toCsv } from './csvExport';

describe('toCsv', () => {
  const cols = [
    { key: 'name' as const, header: 'Name' },
    { key: 'age' as const, header: 'Age' },
    { key: 'city' as const, header: 'City' },
  ];

  it('renders a simple header + body', () => {
    const csv = toCsv(
      [{ name: 'Roee', age: 30, city: 'tlv' }],
      cols,
    );
    expect(csv).toBe('Name,Age,City\nRoee,30,tlv');
  });

  it('quotes values containing commas', () => {
    const csv = toCsv(
      [{ name: 'Doe, John', age: 30, city: 'tlv' }],
      cols,
    );
    expect(csv).toBe('Name,Age,City\n"Doe, John",30,tlv');
  });

  it('escapes embedded quotes by doubling them', () => {
    const csv = toCsv(
      [{ name: 'a "big" name', age: 1, city: 'tlv' }],
      cols,
    );
    expect(csv).toBe('Name,Age,City\n"a ""big"" name",1,tlv');
  });

  it('renders null/undefined as empty', () => {
    const csv = toCsv(
      [{ name: null, age: undefined, city: 'tlv' } as any],
      cols,
    );
    expect(csv).toBe('Name,Age,City\n,,tlv');
  });

  it('renders dates as ISO', () => {
    const csv = toCsv(
      [{ name: 'x', age: new Date('2026-04-22T00:00:00.000Z'), city: 'tlv' } as any],
      cols,
    );
    expect(csv).toBe('Name,Age,City\nx,2026-04-22T00:00:00.000Z,tlv');
  });
});
