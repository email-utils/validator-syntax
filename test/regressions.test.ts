// The 0.0.1 bugs each issue fixed, pinned under every preset. `legacy` is
// what 0.0.1 returned with its default config, checked against it here so
// each case keeps showing the bug it was.
import { describe, expect, it } from 'vitest';
import { parseAddress } from '../src';
import { type Expected, type Preset, presets } from '../src/fixtures';
import { everywhere, fail, rfcOnly, valid } from '../src/fixtures/types';
import { EmailSyntaxValidator } from './legacy/validator';
import { outcome } from './outcome';

interface Regression {
  address: string;
  legacy: boolean;
  expected: Record<Preset, Expected>;
}

function pin(regressions: readonly Regression[]): void {
  describe.each(regressions)('$address', ({ address, legacy, expected }) => {
    it('records what 0.0.1 returned', async () => {
      expect(await new EmailSyntaxValidator().validate(address)).toBe(legacy);
    });

    it.each(presets)('gives the expected result under %s', (preset) => {
      expect(outcome(parseAddress(address, { preset }))).toEqual(
        expected[preset],
      );
    });
  });
}

describe('local-part dots and quoting (validator-syntax#11)', () => {
  describe('rejects a leading or trailing dot', () => {
    // 0.0.1 allowed a dot anywhere. WHATWG's pattern does too.
    pin([
      {
        address: '.john@example.com',
        legacy: true,
        expected: {
          ...everywhere(fail('syntax.local.invalid_char', 0)),
          html5: valid,
        },
      },
      {
        address: 'john.@example.com',
        legacy: true,
        expected: {
          ...everywhere(fail('syntax.local.invalid_char', 4)),
          html5: valid,
        },
      },
    ]);
  });

  describe('rejects every `..` outside quotes, not just the first', () => {
    // 0.0.1 checked only the first `..`, so one inside quotes hid the rest.
    pin([
      {
        address: '"a..b"@example..com',
        legacy: true,
        expected: {
          ...rfcOnly(fail('syntax.local.invalid_char', 0)),
          rfc5321: fail('syntax.domain.label_invalid', 15),
          rfc5322: fail('syntax.domain.label_invalid', 15),
        },
      },
      {
        address: '"a..b".c..d@example.com',
        legacy: false,
        expected: {
          ...everywhere(fail('syntax.local.invalid_char', 0)),
          rfc5321: fail('syntax.local.invalid_char', 6),
          rfc5322: fail('syntax.local.consecutive_dots', 9),
        },
      },
    ]);
  });

  describe('finds the closing quote in the address itself', () => {
    // 0.0.1 looked for the last quote in the comma-joined characters, so
    // any text after it pushed the index back past the `..` it guarded.
    pin([
      {
        address: '"a..b".cdef@example.com',
        legacy: false,
        expected: {
          ...everywhere(fail('syntax.local.invalid_char', 0)),
          rfc5321: fail('syntax.local.invalid_char', 6),
          rfc5322: valid,
        },
      },
    ]);
  });

  describe('accepts escapes and specials in a quoted string', () => {
    // 0.0.1 split on the first `@` and checked quoted characters against
    // the dot-atom set.
    pin(
      [
        '"john@doe"@example.com',
        '"john\\"doe"@example.com',
        '"john\\\\doe"@example.com',
        '"a(b),c:d;e<f>g[h]"@example.com',
      ].map((address) => ({
        address,
        legacy: false,
        expected: rfcOnly(fail('syntax.local.invalid_char', 0)),
      })),
    );
  });
});
