// Every address the 0.0.1 mocha suite tested, once each, with its expected
// result under v1's presets. The old suite ran most addresses under several
// configs of the 0.0.1 option tree; v1 replaces that tree with presets, so
// each address appears here once, tagged per preset. `legacy` is what 0.0.1
// returned with its default config, and `flipped` explains every case where
// the default preset now disagrees.
//
// The preset rules behind the expectations are in ./index.ts.
import { type LegacyFixture, everywhere, fail, valid } from './types';

const quotedLocalRejected =
  'practical rejects quoted local parts, which are legal but never seen on real mailboxes';

const routeRejected =
  'practical rejects `%` and `!`, the source-route and bang-path characters, which are legal but never seen on real mailboxes';

/** The 0.0.1 suite reran these cases uppercased, under `local.alphaLower: false`. */
function withUppercase(fixture: LegacyFixture): LegacyFixture[] {
  return [
    fixture,
    {
      ...fixture,
      address: fixture.address.toUpperCase(),
      description: `${fixture.description}, uppercased`,
    },
  ];
}

export const legacyFixtures: readonly LegacyFixture[] = [
  // Plain dot-atom addresses.
  ...withUppercase({
    address: 'simple@example.com',
    description: 'Simple address',
    feature: 'dot-atom',
    expected: everywhere(valid),
    legacy: true,
  }),
  ...withUppercase({
    address: 'x@example.com',
    description: 'Single-letter local part',
    feature: 'dot-atom',
    expected: everywhere(valid),
    legacy: true,
  }),
  ...withUppercase({
    address: 'admin@test.co',
    description: 'Two-letter TLD',
    feature: 'dot-atom',
    expected: everywhere(valid),
    legacy: true,
  }),
  ...withUppercase({
    address: 'test@gmail.com',
    description: 'Gmail address',
    feature: 'dot-atom',
    expected: everywhere(valid),
    legacy: true,
  }),
  ...withUppercase({
    address: 'tesT@example.com',
    description: 'Uppercase letter in the local part',
    feature: 'dot-atom',
    expected: everywhere(valid),
    legacy: true,
  }),
  ...withUppercase({
    address: 'test1@example.com',
    description: 'Digit in the local part',
    feature: 'dot-atom',
    expected: everywhere(valid),
    legacy: true,
  }),
  {
    address: 'simple1@example.com',
    description: 'Digit at the end of the local part',
    feature: 'dot-atom',
    expected: everywhere(valid),
    legacy: true,
  },
  ...withUppercase({
    address: 'very.common@example.com',
    description: 'Dot in the local part',
    feature: 'dot-atom',
    expected: everywhere(valid),
    legacy: true,
  }),
  {
    address: 'disposable.style.email.with+symbol@example.com',
    description: 'Dots and a plus sign in the local part',
    feature: 'atext-specials',
    expected: everywhere(valid),
    legacy: true,
  },
  {
    address: 'other.email-with-hyphen@example.com',
    description: 'Dots and hyphens in the local part',
    feature: 'atext-specials',
    expected: everywhere(valid),
    legacy: true,
  },
  {
    address: 'user.name+tag+sorting@example.com',
    description: 'Dot and plus-sign tags in the local part',
    feature: 'atext-specials',
    expected: everywhere(valid),
    legacy: true,
  },

  // Printable specials in the local part.
  ...withUppercase({
    address: 'disposablestyleemailwith+symbol@example.com',
    description: 'Plus sign in the local part',
    feature: 'atext-specials',
    expected: everywhere(valid),
    legacy: true,
  }),
  ...withUppercase({
    address: 'username+tag+sorting@example.com',
    description: 'Plus-sign tags in the local part',
    feature: 'atext-specials',
    expected: everywhere(valid),
    legacy: true,
  }),
  ...withUppercase({
    address: 'test/test@test.com',
    description: 'Slash in the local part',
    feature: 'atext-specials',
    expected: everywhere(valid),
    legacy: true,
  }),

  // Routes: legal atext, but never seen on real mailboxes.
  ...withUppercase({
    address: 'mailhost.com!username@example.org',
    description: 'Bang path in the local part, dotted relay host',
    feature: 'route-chars',
    expected: {
      ...everywhere(valid),
      practical: fail('syntax.local.invalid_char', 12),
    },
    legacy: true,
    flipped: routeRejected,
  }),
  {
    // Not a flip: 0.0.1 rejected it too, but for its dotless relay host;
    // practical rejects the `!` itself, like the dotted case above.
    address: 'mailhost!username@example.org',
    description: 'Bang path in the local part, dotless relay host',
    feature: 'route-chars',
    expected: {
      ...everywhere(valid),
      practical: fail('syntax.local.invalid_char', 8),
    },
    legacy: false,
  },
  ...withUppercase({
    address: 'user%example.com@example.org',
    description: 'Percent route in the local part, dotted relay host',
    feature: 'route-chars',
    expected: {
      ...everywhere(valid),
      practical: fail('syntax.local.invalid_char', 4),
    },
    legacy: true,
    flipped: routeRejected,
  }),
  {
    // Not a flip: 0.0.1 rejected it too, but for its dotless relay host;
    // practical rejects the `%` itself, like the dotted case above.
    address: 'user%example@example.org',
    description: 'Percent route in the local part, dotless relay host',
    feature: 'route-chars',
    expected: {
      ...everywhere(valid),
      practical: fail('syntax.local.invalid_char', 4),
    },
    legacy: false,
  },

  // Hyphens.
  ...withUppercase({
    address: 'fully-qualified-domain@example.com',
    description: 'Hyphens in the local part',
    feature: 'atext-specials',
    expected: everywhere(valid),
    legacy: true,
  }),
  ...withUppercase({
    address: 'otheremail-with-hyphen@example.com',
    description: 'Hyphens in the local part',
    feature: 'atext-specials',
    expected: everywhere(valid),
    legacy: true,
  }),
  ...withUppercase({
    address: 'user-@example.org',
    description: 'Local part ending in a hyphen',
    feature: 'atext-specials',
    expected: everywhere(valid),
    legacy: true,
  }),
  ...withUppercase({
    address: 'exampleindeed@strange-example.com',
    description: 'Hyphenated domain',
    feature: 'dot-atom',
    expected: everywhere(valid),
    legacy: true,
  }),
  ...withUppercase({
    address: 'example-indeed@strange-example.com',
    description: 'Hyphens in the local part and the domain',
    feature: 'atext-specials',
    expected: everywhere(valid),
    legacy: true,
  }),

  // Quoted local parts.
  ...withUppercase({
    address: '" "@example.org',
    description: 'Quoted space as the whole local part',
    feature: 'quoted-local',
    expected: {
      practical: fail('syntax.local.invalid_char', 0),
      rfc5321: valid,
      rfc5322: valid,
      html5: fail('syntax.local.invalid_char', 0),
    },
    legacy: true,
    flipped: quotedLocalRejected,
  }),
  ...withUppercase({
    address: '"john..doe"@example.com',
    description: 'Consecutive dots inside a quoted local part',
    feature: 'quoted-local',
    expected: {
      practical: fail('syntax.local.invalid_char', 0),
      rfc5321: valid,
      rfc5322: valid,
      html5: fail('syntax.local.invalid_char', 0),
    },
    legacy: true,
    flipped: quotedLocalRejected,
  }),
  ...withUppercase({
    address: '"justactually"@example.com',
    description: 'Quoted local part',
    feature: 'quoted-local',
    expected: {
      practical: fail('syntax.local.invalid_char', 0),
      rfc5321: valid,
      rfc5322: valid,
      html5: fail('syntax.local.invalid_char', 0),
    },
    legacy: true,
    flipped: quotedLocalRejected,
  }),
  ...withUppercase({
    address: 'just."actually".right@example.com',
    description: 'Quoted string between dot-separated atoms',
    feature: 'obs-local',
    expected: {
      // RFC 5321 allows a Dot-string or a Quoted-string, never both.
      practical: fail('syntax.local.invalid_char', 5),
      rfc5321: fail('syntax.local.invalid_char', 5),
      rfc5322: valid,
      html5: fail('syntax.local.invalid_char', 5),
    },
    legacy: true,
    flipped: quotedLocalRejected,
  }),
  {
    address: 'just."not".right@example.com',
    description: 'Quoted string between dot-separated atoms',
    feature: 'obs-local',
    expected: {
      practical: fail('syntax.local.invalid_char', 5),
      rfc5321: fail('syntax.local.invalid_char', 5),
      rfc5322: valid,
      html5: fail('syntax.local.invalid_char', 5),
    },
    legacy: true,
    flipped: quotedLocalRejected,
  },
  {
    // The Wikipedia example with its escapes lost in the 0.0.1 suite, so it
    // isn't the valid address it was meant to be. The original is in
    // wikipedia.ts.
    address:
      '"very.(),:;<>[]".VERY."very@\\ "very".unusual"@strange.example.com',
    description: 'Quoted strings with specials, missing their escapes',
    expected: {
      practical: fail('syntax.local.invalid_char', 0),
      rfc5321: fail('syntax.local.invalid_char', 16),
      rfc5322: fail('syntax.local.invalid_char', 31),
      html5: fail('syntax.local.invalid_char', 0),
    },
    legacy: false,
  },

  // Malformed quoting.
  ...withUppercase({
    address: 'just"not"right@example.com',
    description: 'Quotes inside an atom',
    expected: everywhere(fail('syntax.local.invalid_char', 4)),
    legacy: false,
  }),
  ...withUppercase({
    address: 'just."not"right@example.com',
    description: 'Quoted string with no dot after it',
    expected: {
      practical: fail('syntax.local.invalid_char', 5),
      rfc5321: fail('syntax.local.invalid_char', 5),
      rfc5322: fail('syntax.local.invalid_char', 10),
      html5: fail('syntax.local.invalid_char', 5),
    },
    legacy: false,
  }),
  ...withUppercase({
    address: 'just."not."right@example.com',
    description: 'Quoted string ending in a dot, with no dot after it',
    expected: {
      practical: fail('syntax.local.invalid_char', 5),
      rfc5321: fail('syntax.local.invalid_char', 5),
      rfc5322: fail('syntax.local.invalid_char', 11),
      html5: fail('syntax.local.invalid_char', 5),
    },
    legacy: false,
  }),
  ...withUppercase({
    address: '"john..doe@example.com',
    description: 'Unterminated quote',
    expected: {
      // The quote runs to the end, so no `@` is outside it.
      practical: fail('syntax.local.invalid_char', 0),
      rfc5321: fail('syntax.address.no_at'),
      rfc5322: fail('syntax.address.no_at'),
      html5: fail('syntax.local.invalid_char', 0),
    },
    legacy: false,
  }),
  ...withUppercase({
    address: '"john"..doe@example.com',
    description: 'Consecutive dots after a quoted string',
    expected: {
      practical: fail('syntax.local.invalid_char', 0),
      rfc5321: fail('syntax.local.invalid_char', 6),
      rfc5322: fail('syntax.local.consecutive_dots', 7),
      html5: fail('syntax.local.invalid_char', 0),
    },
    legacy: false,
  }),
  ...withUppercase({
    address: 'a"b(c)d,e:f;g<h>i[j\\k]l@example.com',
    description: 'Unquoted specials',
    expected: everywhere(fail('syntax.local.invalid_char', 1)),
    legacy: false,
  }),

  // Spaces.
  ...withUppercase({
    address: 'james richards@google.com',
    description: 'Unquoted space',
    expected: everywhere(fail('syntax.local.unquoted_space', 5)),
    legacy: false,
  }),
  ...withUppercase({
    address: 'james" richards@google.com',
    description: 'Space after a stray quote',
    expected: everywhere(fail('syntax.local.invalid_char', 5)),
    legacy: false,
  }),
  ...withUppercase({
    address: 'this is"notallowed@example.com',
    description: 'Unquoted space and a stray quote',
    expected: everywhere(fail('syntax.local.unquoted_space', 4)),
    legacy: false,
  }),
  ...withUppercase({
    address: 'this still"not\\allowed@example.com',
    description: 'Unquoted space, a stray quote, and a backslash',
    expected: everywhere(fail('syntax.local.unquoted_space', 4)),
    legacy: false,
  }),

  // Dots.
  ...withUppercase({
    address: 'john..doe@example.com',
    description: 'Consecutive dots in the local part',
    feature: 'misplaced-dots',
    expected: {
      practical: fail('syntax.local.consecutive_dots', 5),
      rfc5321: fail('syntax.local.consecutive_dots', 5),
      rfc5322: fail('syntax.local.consecutive_dots', 5),
      html5: valid,
    },
    legacy: false,
  }),
  ...withUppercase({
    address: 'john.doe@example..com',
    description: 'Consecutive dots in the domain',
    expected: everywhere(fail('syntax.domain.label_invalid', 17)),
    legacy: false,
  }),

  // The @ separator.
  ...withUppercase({
    address: 'Abc.example.com',
    description: 'No @',
    expected: everywhere(fail('syntax.address.no_at')),
    legacy: false,
  }),
  {
    address: 'Abc+example.com',
    description: 'No @',
    expected: everywhere(fail('syntax.address.no_at')),
    legacy: false,
  },
  ...withUppercase({
    address: '@Abc.example.com',
    description: 'Nothing before the @',
    expected: everywhere(fail('syntax.local.empty')),
    legacy: false,
  }),
  ...withUppercase({
    address: 'A@b@c@example.com',
    description: 'More than one @',
    expected: everywhere(fail('syntax.local.invalid_char', 1)),
    legacy: false,
  }),

  // Characters outside the allowed sets.
  ...withUppercase({
    address: 'QA☕CHOCOLATE☕@test.com',
    description: 'Non-ASCII characters in the local part',
    expected: everywhere(fail('syntax.local.invalid_char', 2)),
    legacy: false,
  }),
  ...withUppercase({
    address: 'i_like_underscore@but_its_not_allowed_in_this_part.example.com',
    description: 'Underscores in the domain',
    expected: everywhere(fail('syntax.domain.invalid_char', 21)),
    legacy: false,
  }),
  ...withUppercase({
    address: 'james@cb$.com',
    description: 'Dollar sign in the domain',
    expected: everywhere(fail('syntax.domain.invalid_char', 8)),
    legacy: false,
  }),

  // Lengths.
  ...withUppercase({
    address:
      '1234567890123456789012345678901234567890123456789012345678901234+x@example.com',
    description: 'Local part over 64 characters',
    feature: 'long-local',
    expected: {
      practical: fail('syntax.local.too_long'),
      rfc5321: fail('syntax.local.too_long'),
      rfc5322: valid,
      html5: valid,
    },
    legacy: false,
  }),
  {
    address:
      'uayuYfBgRktoqVPCAJLhkcyVHFsZygReesttpNWTTiETtbQFfDUMZjyCdeaEhcotf+x@example.com',
    description: 'Local part over 64 characters, letters only',
    feature: 'long-local',
    expected: {
      practical: fail('syntax.local.too_long'),
      rfc5321: fail('syntax.local.too_long'),
      rfc5322: valid,
      html5: valid,
    },
    legacy: false,
  },

  // Domain shape.
  ...withUppercase({
    address: 'james@google',
    description: 'Domain with no dot',
    feature: 'dotless-domain',
    expected: {
      practical: fail('syntax.domain.no_dot'),
      rfc5321: fail('syntax.domain.no_dot'),
      rfc5322: fail('syntax.domain.no_dot'),
      html5: valid,
    },
    legacy: false,
  }),
  {
    address: 'admin@mailserver1',
    description: 'Domain with no dot, ending in a digit',
    feature: 'dotless-domain',
    expected: {
      practical: fail('syntax.domain.no_dot'),
      rfc5321: fail('syntax.domain.no_dot'),
      rfc5322: fail('syntax.domain.no_dot'),
      html5: valid,
    },
    legacy: false,
  },
  {
    address: 'james@g.com',
    description: 'Single-character domain label',
    feature: 'dot-atom',
    expected: everywhere(valid),
    legacy: false,
    flipped:
      '0.0.1 required two characters before the last dot (`charsBeforeDot`), rejecting real single-letter domains (validator-syntax#12)',
  },
  {
    address: 'james@google.c',
    description: 'Single-character TLD',
    feature: 'unknown-tld',
    expected: {
      practical: fail('syntax.tld.unknown'),
      rfc5321: valid,
      rfc5322: valid,
      html5: valid,
    },
    legacy: false,
  },
  {
    address: 'test@example.thisisnotavalidtld',
    description: 'TLD outside the IANA set',
    feature: 'unknown-tld',
    expected: {
      practical: fail('syntax.tld.unknown'),
      rfc5321: valid,
      rfc5322: valid,
      html5: valid,
    },
    legacy: false,
  },
];
