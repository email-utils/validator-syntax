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

describe('domain labels and lengths (validator-syntax#12)', () => {
  const a63 = 'a'.repeat(63);

  /** A domain `length` characters long: three 63-character labels, then `.com`. */
  function domain(length: number): string {
    return `${a63}.${a63}.${a63}.${'a'.repeat(length - 196)}.com`;
  }

  describe('rejects an empty label and a leading or trailing hyphen', () => {
    // 0.0.1 checked only for `..`, and allowed hyphens anywhere.
    pin([
      {
        address: 'a@.example.com',
        legacy: true,
        expected: everywhere(fail('syntax.domain.label_invalid', 2)),
      },
      {
        address: 'a@-example.com',
        legacy: true,
        expected: everywhere(fail('syntax.domain.label_invalid', 2)),
      },
      {
        address: 'a@example-.com',
        legacy: true,
        expected: everywhere(fail('syntax.domain.label_invalid', 9)),
      },
    ]);
  });

  describe('rejects a trailing dot', () => {
    // 0.0.1 rejected it only because the empty TLD wasn't in its list, so
    // with its TLD check off it passed. v1 rejects the empty label itself.
    pin([
      {
        address: 'a@example.',
        legacy: false,
        expected: everywhere(fail('syntax.domain.label_invalid', 9)),
      },
    ]);
  });

  describe('caps a label at 63 characters', () => {
    // 0.0.1 had no label cap.
    pin([
      {
        address: `a@${a63}.com`,
        legacy: true,
        expected: everywhere(valid),
      },
      {
        address: `a@${a63}a.com`,
        legacy: true,
        expected: everywhere(fail('syntax.domain.label_invalid', 2)),
      },
    ]);
  });

  describe('caps the address at 254 characters and the domain at 253', () => {
    // 0.0.1 had neither cap. A 253-character domain can't fit in a
    // 254-character address, so the domain cap shows only past 253, where
    // it's checked first; html5 has no domain cap.
    pin([
      {
        address: `a@${domain(252)}`,
        legacy: true,
        expected: everywhere(valid),
      },
      {
        address: `ab@${domain(252)}`,
        legacy: true,
        expected: everywhere(fail('syntax.address.too_long')),
      },
      {
        address: `a@${domain(254)}`,
        legacy: true,
        expected: {
          ...everywhere(fail('syntax.domain.too_long')),
          html5: fail('syntax.address.too_long'),
        },
      },
    ]);
  });

  describe('accepts a single-character label', () => {
    // 0.0.1 wanted more than one character before the last dot, so it
    // rejected `x.com` but not `x.y.com`.
    pin([
      {
        address: 'user@x.com',
        legacy: false,
        expected: everywhere(valid),
      },
    ]);
  });
});
