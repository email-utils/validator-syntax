import { describe, expect, it } from 'vitest';
import { isAddressLiteral, isIPv4, isIPv6 } from '../src/ip';

describe('isIPv4', () => {
  it.each([
    '0.0.0.0',
    '192.0.2.1',
    '255.255.255.255',
    '001.02.3.4',
    // The longest, at 15 characters.
    '001.002.003.004',
  ])('accepts %s', (text) => {
    expect(isIPv4(text)).toBe(true);
  });

  it.each([
    '1.2.3',
    '1.2.3.4.5',
    '1.2.3.256',
    '1.2.3.',
    '1.2.3.1234',
    'a.b.c.d',
    '0001.002.003.004',
  ])('rejects %s', (text) => {
    expect(isIPv4(text)).toBe(false);
  });
});

describe('isIPv6', () => {
  it.each([
    '2001:db8:0:0:0:0:0:1',
    '2001:DB8::1',
    '::',
    '::1',
    '1::',
    '1:2:3:4:5::6',
    '1:2:3:4:5:6:192.0.2.1',
    '::192.0.2.1',
    '1:2:3:4::192.0.2.1',
    // The longest, at 45 characters.
    'ffff:ffff:ffff:ffff:ffff:ffff:255.255.255.255',
  ])('accepts %s', (text) => {
    expect(isIPv6(text)).toBe(true);
  });

  it.each([
    '1:2:3:4:5:6:7',
    '1:2:3:4:5:6:7:8:9',
    '1:2:3:4:5:6:7::8',
    '1:2:3:4:5:6::7',
    '1::2::3',
    ':1:2:3:4:5:6:7',
    '1:2:3:4:5:6:7:',
    '12345::1',
    'g::1',
    ':::',
    '1:2:3:4:5:192.0.2.1',
    '1:2:3:4:5::192.0.2.1',
    '::192.0.2.256',
    'ffff:ffff:ffff:ffff:ffff:ffff:0255.255.255.255',
    `${'1:'.repeat(250)}1`,
  ])('rejects %s', (text) => {
    expect(isIPv6(text)).toBe(false);
  });
});

describe('isAddressLiteral', () => {
  it('takes IPv4, or IPv6 after a case-insensitive IPv6: tag', () => {
    expect(isAddressLiteral('192.0.2.1')).toBe(true);
    expect(isAddressLiteral('IPv6:2001:db8::1')).toBe(true);
    expect(isAddressLiteral('ipv6:2001:db8::1')).toBe(true);
  });

  it('rejects untagged IPv6 and other tags', () => {
    expect(isAddressLiteral('2001:db8::1')).toBe(false);
    expect(isAddressLiteral('IPv4:192.0.2.1')).toBe(false);
  });
});
