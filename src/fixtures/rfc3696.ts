// The examples from RFC 3696 section 3, and the corrected forms from its
// verified erratum 246: https://www.rfc-editor.org/errata/eid246
// The erratum points out that backslash escapes are only valid inside a
// quoted string, so the section's first three examples are invalid as
// printed.
import { type SyntaxFixture, everywhere, fail, rfcOnly, valid } from './types';

/**
 * RFC 3696's examples, as corrected by its erratum 246.
 *
 * @example
 * ```ts
 * import { rfc3696Fixtures } from '@email-utils/validator-syntax/fixtures';
 *
 * // Printed as valid, but a backslash escape needs a quoted string.
 * rfc3696Fixtures
 *   .filter((fixture) => !fixture.expected.rfc5322.ok)
 *   .map((fixture) => fixture.address);
 * // => [
 * //   'Abc\\@def@example.com',
 * //   'Fred\\ Bloggs@example.com',
 * //   'Joe.\\\\Blow@example.com',
 * // ]
 * ```
 */
export const rfc3696Fixtures: readonly SyntaxFixture[] = [
  // Printed as valid; invalid per erratum 246.
  {
    address: 'Abc\\@def@example.com',
    description: 'Backslash-escaped @ outside a quoted string',
    expected: everywhere(fail('syntax.local.invalid_char', 3)),
  },
  {
    address: 'Fred\\ Bloggs@example.com',
    description: 'Backslash-escaped space outside a quoted string',
    expected: everywhere(fail('syntax.local.invalid_char', 4)),
  },
  {
    address: 'Joe.\\\\Blow@example.com',
    description: 'Backslash-escaped backslash outside a quoted string',
    expected: everywhere(fail('syntax.local.invalid_char', 4)),
  },

  // Erratum 246's corrections.
  {
    address: '"Abc\\@def"@example.com',
    description: 'Escaped @ in a quoted string',
    feature: 'quoted-pair',
    expected: rfcOnly(fail('syntax.local.invalid_char', 0)),
  },
  {
    address: '"Fred\\ Bloggs"@example.com',
    description: 'Escaped space in a quoted string',
    feature: 'quoted-pair',
    expected: rfcOnly(fail('syntax.local.invalid_char', 0)),
  },
  {
    address: '"Joe.\\\\Blow"@example.com',
    description: 'Escaped backslash in a quoted string',
    feature: 'quoted-pair',
    expected: rfcOnly(fail('syntax.local.invalid_char', 0)),
  },

  // The quoted forms.
  {
    address: '"Abc@def"@example.com',
    description: 'Quoted @',
    feature: 'quoted-local',
    expected: rfcOnly(fail('syntax.local.invalid_char', 0)),
  },
  {
    address: '"Fred Bloggs"@example.com',
    description: 'Quoted space',
    feature: 'quoted-local',
    expected: rfcOnly(fail('syntax.local.invalid_char', 0)),
  },

  // Unquoted specials.
  {
    address: 'user+mailbox@example.com',
    description: 'Plus sign',
    feature: 'atext-specials',
    expected: everywhere(valid),
  },
  {
    address: 'customer/department=shipping@example.com',
    description: 'Slash and equals sign',
    feature: 'atext-specials',
    expected: everywhere(valid),
  },
  {
    address: '$A12345@example.com',
    description: 'Dollar sign first',
    feature: 'atext-specials',
    expected: everywhere(valid),
  },
  {
    address: '!def!xyz%abc@example.com',
    description: 'Bang path and percent route',
    feature: 'route-chars',
    expected: {
      ...everywhere(valid),
      practical: fail('syntax.local.invalid_char', 0),
    },
  },
  {
    address: '_somename@example.com',
    description: 'Underscore first',
    feature: 'atext-specials',
    expected: everywhere(valid),
  },
];
