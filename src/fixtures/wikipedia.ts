// The examples from Wikipedia's "Email address" article, revision
// 1374714890 (2026-09-13):
// https://en.wikipedia.org/w/index.php?title=Email_address&oldid=1374714890#Examples
// Those already in legacy.ts, word for word, are left out.
import {
  type SyntaxFixture,
  allBut5322,
  everywhere,
  fail,
  rfcOnly,
  valid,
} from './types';

export const wikipediaFixtures: readonly SyntaxFixture[] = [
  // Listed as valid.
  {
    address: 'FirstName.LastName@EasierReading.org',
    description: 'Mixed case',
    feature: 'dot-atom',
    expected: everywhere(valid),
  },
  {
    address: 'long.email-address-with-hyphens@and.subdomains.example.com',
    description: 'Hyphens in the local part, subdomains',
    feature: 'atext-specials',
    expected: everywhere(valid),
  },
  {
    address: 'name/surname@example.com',
    description: 'Slash in the local part',
    feature: 'atext-specials',
    expected: everywhere(valid),
  },
  {
    address: 'admin@example',
    description: 'Domain with no dot',
    feature: 'dotless-domain',
    expected: { ...everywhere(fail('syntax.domain.no_dot')), html5: valid },
  },
  {
    address: 'example@s.example',
    description: 'Reserved TLD',
    feature: 'unknown-tld',
    expected: { ...everywhere(valid), practical: fail('syntax.tld.unknown') },
  },
  {
    address: '"jane..doe"@example.org',
    description: 'Consecutive dots inside a quoted local part',
    feature: 'quoted-local',
    expected: rfcOnly(fail('syntax.local.invalid_char', 0)),
  },
  {
    address:
      '"very.(),:;<>[]\\".VERY.\\"very@\\\\ \\"very\\".unusual"@strange.example.com',
    description: 'Quoted string with specials, an @, and escapes',
    feature: 'quoted-pair',
    expected: rfcOnly(fail('syntax.local.invalid_char', 0)),
  },
  {
    address: 'postmaster@[123.123.123.123]',
    description: 'IPv4 address literal',
    feature: 'ipv4-literal',
    expected: rfcOnly(fail('syntax.domain.invalid_char', 11)),
  },
  {
    address: 'postmaster@[IPv6:2001:0db8:85a3:0000:0000:8a2e:0370:7334]',
    description: 'IPv6 address literal',
    feature: 'ipv6-literal',
    expected: rfcOnly(fail('syntax.domain.invalid_char', 11)),
  },
  {
    address: '_test@[IPv6:2001:0db8:85a3:0000:0000:8a2e:0370:7334]',
    description: 'Underscore first, IPv6 address literal',
    feature: 'ipv6-literal',
    expected: rfcOnly(fail('syntax.domain.invalid_char', 6)),
  },

  // Listed as valid with SMTPUTF8, which no preset accepts without
  // allowUnicode.
  {
    address: 'I❤️CHOCOLATE@example.com',
    description: 'Emoji in the local part',
    expected: everywhere(fail('syntax.local.invalid_char', 1)),
  },

  // Listed as invalid.
  {
    address: 'abc.example.com',
    description: 'No @',
    expected: everywhere(fail('syntax.address.no_at')),
  },
  {
    address: 'a@b@c@example.com',
    description: 'More than one @',
    expected: everywhere(fail('syntax.local.invalid_char', 1)),
  },
  {
    address: 'this is"not\\allowed@example.com',
    description: 'Unquoted space, quote, and backslash',
    expected: everywhere(fail('syntax.local.unquoted_space', 4)),
  },
  {
    address: 'this\\ still\\"not\\\\allowed@example.com',
    description: 'Backslash escapes outside a quoted string',
    expected: everywhere(fail('syntax.local.invalid_char', 4)),
  },
  {
    address: 'i.like.underscores@but_they_are_not_allowed_in_this_part',
    description: 'Underscores in a dotless domain',
    // `_` is atext under rfc5322, which still requires a dot.
    expected: allBut5322(
      fail('syntax.domain.invalid_char', 22),
      fail('syntax.domain.no_dot'),
    ),
  },
];
