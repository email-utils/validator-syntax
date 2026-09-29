import tlds from 'tlds/index.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';
import { isKnownTld } from '../src/tld';

describe('isKnownTld', () => {
  it.each(['com', 'uk', 'COM', 'Museum'])('accepts %s', (tld) => {
    expect(isKnownTld(tld)).toBe(true);
  });

  it.each([
    ['рф', 'xn--p1ai'],
    ['中国', 'xn--fiqs8s'],
    ['vermögensberater', 'xn--vermgensberater-ctb'],
  ])('accepts both %s and %s', (uLabel, aLabel) => {
    expect(isKnownTld(uLabel)).toBe(true);
    expect(isKnownTld(aLabel)).toBe(true);
    expect(isKnownTld(aLabel.toUpperCase())).toBe(true);
  });

  it('has an A-label for every IDN TLD', () => {
    const idn = tlds.filter((tld) => !/^[a-z\d]+$/.test(tld));
    expect(idn.length).toBeGreaterThan(100);
    for (const tld of idn) {
      const aLabel = new URL(`http://x.${tld}`).hostname.slice(2);
      expect(aLabel).toMatch(/^xn--/);
      expect(isKnownTld(aLabel)).toBe(true);
    }
  });

  it.each(['invalidtld', 'xn--', 'xn--zzzz', ''])('rejects %j', (tld) => {
    expect(isKnownTld(tld)).toBe(false);
  });
});
