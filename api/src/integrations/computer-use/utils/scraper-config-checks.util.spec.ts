import {
  findDisjointnessErrors,
  isBareDataUri,
} from './scraper-config-checks.util';

describe('findDisjointnessErrors', () => {
  it('returns no errors when field values are distinct', () => {
    const errors = findDisjointnessErrors(
      { title: 'Widget Alpha', price: '$19.99' },
      'card 0',
    );
    expect(errors).toEqual([]);
  });

  it('flags two fields that resolve to the same normalized value', () => {
    const errors = findDisjointnessErrors(
      { title: 'Widget Alpha', name: 'Widget Alpha' },
      'card 0',
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('title');
    expect(errors[0]).toContain('name');
    expect(errors[0]).toContain('card 0');
  });

  it('treats whitespace-normalized values as equal', () => {
    const errors = findDisjointnessErrors(
      { title: '  Widget   Alpha ', name: 'Widget Alpha' },
      'card 0',
    );
    expect(errors).toHaveLength(1);
  });

  it('ignores null/empty values', () => {
    const errors = findDisjointnessErrors(
      { title: null, name: undefined, price: '' },
      'card 0',
    );
    expect(errors).toEqual([]);
  });

  it('flattens array values before comparing', () => {
    const errors = findDisjointnessErrors(
      { emails: ['a@example.com'], contact: 'a@example.com' },
      'card 0',
    );
    expect(errors).toHaveLength(1);
  });
});

describe('isBareDataUri', () => {
  it('returns true for a data: URI', () => {
    expect(isBareDataUri('data:image/gif;base64,R0lGODlh')).toBe(true);
  });

  it('is case-insensitive and tolerant of leading whitespace', () => {
    expect(isBareDataUri('  DATA:image/png;base64,AAAA')).toBe(true);
  });

  it('returns false for a regular URL', () => {
    expect(isBareDataUri('https://example.com/image.jpg')).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isBareDataUri(null)).toBe(false);
    expect(isBareDataUri(undefined)).toBe(false);
  });

  it('checks only the first element of an array value', () => {
    expect(
      isBareDataUri(['data:image/png;base64,AAAA', 'https://example.com']),
    ).toBe(true);
    expect(
      isBareDataUri(['https://example.com', 'data:image/png;base64,AAAA']),
    ).toBe(false);
  });
});
