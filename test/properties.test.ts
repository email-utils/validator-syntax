// Properties the corpus can only sample: that no input makes an entry point
// throw, that the entry points agree, and the rules the docs promise for
// every address, run on arbitrary strings and on generated address-like
// ones, which reach further into the parser than random text does.
import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  type ParsedAddress,
  type ReasonCode,
  type Result,
  type SyntaxOptions,
  createSyntaxValidator,
  isValidSyntax,
  parseAddress,
} from '../src';
import { presets, previewSyntaxOptions } from '../src/fixtures';
import { resolve } from '../src/options';
import { findAt } from '../src/parse';
import {
  addressLike,
  anyString,
  atext,
  significant,
  validOptions,
} from './arbitraries';

/** Every reason code, checked against the union both ways. */
const reasonCodes = new Set(
  Object.keys({
    'syntax.address.empty': true,
    'syntax.address.no_at': true,
    'syntax.address.too_long': true,
    'syntax.local.empty': true,
    'syntax.local.too_long': true,
    'syntax.local.invalid_char': true,
    'syntax.local.consecutive_dots': true,
    'syntax.local.unquoted_space': true,
    'syntax.domain.empty': true,
    'syntax.domain.no_dot': true,
    'syntax.domain.label_invalid': true,
    'syntax.domain.literal_invalid': true,
    'syntax.domain.too_long': true,
    'syntax.domain.invalid_char': true,
    'syntax.comment.not_allowed': true,
    'syntax.comment.unterminated': true,
    'syntax.tld.unknown': true,
  } satisfies Record<ReasonCode, true>),
);

// The WHATWG input[type=email] pattern, verbatim from the HTML standard.
const whatwgEmail =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/** An address and options it passes. */
const accepted = fc
  .tuple(anyString, validOptions)
  .filter(([email, options]) => isValidSyntax(email, options));

/** An address and options it fails. */
const rejected = fc
  .tuple(anyString, validOptions)
  .filter(([email, options]) => !isValidSyntax(email, options));

/** The value of a result the arbitrary made sure is a success. */
function success(result: Result<ParsedAddress>): ParsedAddress {
  if (!result.ok) {
    throw new Error(`Expected a success, got ${result.reason}`);
  }
  return result.value;
}

/** The failure of a result the arbitrary made sure is one. */
function failure(
  result: Result<ParsedAddress>,
): Extract<Result<ParsedAddress>, { ok: false }> {
  if (result.ok) {
    throw new Error('Expected a failure, got a success');
  }
  return result;
}

/** Whether `email` fails only its TLD with `options` and the TLD check on. */
function failsOnlyTld(
  email: string,
  options: SyntaxOptions | undefined,
): boolean {
  const result = parseAddress(email, { ...options, checkTld: true });
  return !result.ok && result.reason === 'syntax.tld.unknown';
}

describe('every entry point', () => {
  it('never throws on any string, under any well-formed options', () => {
    fc.assert(
      fc.property(anyString, validOptions, (email, options) => {
        expect(() => parseAddress(email, options)).not.toThrow();
        expect(() => isValidSyntax(email, options)).not.toThrow();
        const validator = createSyntaxValidator(options);
        expect(() => validator.parse(email)).not.toThrow();
        expect(() => validator.isValid(email)).not.toThrow();
      }),
    );
  });

  it('never throws on a very long string', () => {
    for (const email of [
      'a'.repeat(100_000),
      `${'a'.repeat(100_000)}@${'b.'.repeat(50_000)}com`,
      `"${'a'.repeat(100_000)}"@x.com`,
      `(${'('.repeat(50_000)}a@x.com`,
      '\\'.repeat(100_001),
      `a@${'ü'.repeat(100_000)}.de`,
    ]) {
      for (const preset of presets) {
        expect(() => parseAddress(email, { preset })).not.toThrow();
      }
      expect(() =>
        parseAddress(email, { allowUnicode: true, allowIdn: true }),
      ).not.toThrow();
    }
  });

  it('previews any list of strings without throwing', () => {
    fc.assert(
      fc.property(
        validOptions,
        fc.array(anyString, { maxLength: 5 }),
        (options, addresses) => {
          expect(() => previewSyntaxOptions(options, addresses)).not.toThrow();
        },
      ),
    );
  });
});

describe('the entry points agree', () => {
  it('gives isValidSyntax exactly parseAddress’s ok', () => {
    fc.assert(
      fc.property(anyString, validOptions, (email, options) => {
        expect(isValidSyntax(email, options)).toBe(
          parseAddress(email, options).ok,
        );
      }),
    );
  });

  it('gives isValidSyntax exactly parseAddress’s ok under every preset', () => {
    fc.assert(
      fc.property(addressLike, (email) => {
        for (const preset of presets) {
          expect(isValidSyntax(email, { preset })).toBe(
            parseAddress(email, { preset }).ok,
          );
        }
      }),
    );
  });

  it('gives a bound validator the same results as the functions', () => {
    fc.assert(
      fc.property(anyString, validOptions, (email, options) => {
        const validator = createSyntaxValidator(options);
        const result = parseAddress(email, options);
        expect(validator.parse(email)).toEqual(result);
        expect(validator.isValid(email)).toBe(result.ok);
      }),
    );
  });

  it('previews exactly what parseAddress says, in order', () => {
    fc.assert(
      fc.property(
        validOptions,
        fc.array(anyString, { maxLength: 5 }),
        (options, addresses) => {
          const preset = { preset: options?.preset };
          expect(previewSyntaxOptions(options, addresses)).toEqual({
            valid: addresses
              .filter((address) => isValidSyntax(address, options))
              .map((address) => ({
                address,
                changed: !isValidSyntax(address, preset),
              })),
            invalid: addresses.flatMap((address) => {
              const result = parseAddress(address, options);
              if (result.ok) {
                return [];
              }
              const { ok: _, ...rest } = result;
              return [
                { address, ...rest, changed: isValidSyntax(address, preset) },
              ];
            }),
          });
        },
      ),
    );
  });
});

describe('every failure', () => {
  it('gives a known reason code and a message', () => {
    fc.assert(
      fc.property(rejected, ([email, options]) => {
        const { reason, message } = failure(parseAddress(email, options));
        expect(reasonCodes).toContain(reason);
        expect(message).toEqual(expect.any(String));
      }),
    );
  });

  it('points its index at a character on the right side of the @', () => {
    fc.assert(
      fc.property(rejected, ([email, options]) => {
        const { reason, index } = failure(parseAddress(email, options));
        const at = findAt(email, resolve(options));
        const misplaced =
          index !== undefined &&
          (!Number.isInteger(index) ||
            index < 0 ||
            index >= email.length ||
            (reason.startsWith('syntax.local.') && index >= at) ||
            (reason.startsWith('syntax.domain.') && index <= at) ||
            (reason.startsWith('syntax.comment.') && email[index] !== '(') ||
            (reason === 'syntax.domain.literal_invalid' &&
              email[index] !== '['));
        expect(misplaced).toBe(false);
      }),
    );
  });
});

describe('every success', () => {
  it('lifts no comments where they aren’t allowed', () => {
    fc.assert(
      fc.property(
        accepted.filter(([, options]) => !resolve(options).comments),
        ([email, options]) => {
          expect(success(parseAddress(email, options)).comments).toEqual([]);
        },
      ),
    );
  });

  it('gives the TLD, where there is one, as the domain’s last label', () => {
    fc.assert(
      fc.property(accepted, ([email, options]) => {
        const { domain, tld } = success(parseAddress(email, options));
        const last = domain.slice(domain.lastIndexOf('.') + 1);
        expect(
          tld === undefined || (domain.includes('.') && tld === last),
        ).toBe(true);
      }),
    );
  });
});

describe('practical', () => {
  it('splits an accepted address at the @, with the TLD after the last dot', () => {
    fc.assert(
      fc.property(
        fc
          .oneof(addressLike, anyString)
          .filter((email) => isValidSyntax(email)),
        (email) => {
          const at = email.lastIndexOf('@');
          expect(parseAddress(email)).toEqual({
            ok: true,
            value: {
              local: email.slice(0, at),
              domain: email.slice(at + 1),
              tld: email.slice(email.lastIndexOf('.') + 1),
              comments: [],
            },
          });
        },
      ),
    );
  });
});

describe('html5', () => {
  // The WHATWG pattern's alphabet, plus a few characters outside it.
  const html5Address = fc
    .tuple(
      fc.string({
        unit: fc.oneof(
          { weight: 20, arbitrary: fc.constantFrom(...atext, '.') },
          { weight: 1, arbitrary: fc.constantFrom(...significant) },
        ),
        maxLength: 70,
      }),
      fc.array(
        fc.oneof(
          {
            weight: 10,
            arbitrary: fc.string({
              unit: fc.constantFrom(...'abxz09-'.split('')),
              maxLength: 8,
            }),
          },
          {
            weight: 1,
            arbitrary: fc
              .integer({ min: 61, max: 65 })
              .map((n) => 'a'.repeat(n)),
          },
          { weight: 1, arbitrary: fc.constantFrom(...significant) },
        ),
        { minLength: 1, maxLength: 6 },
      ),
    )
    .map(([local, labels]) => `${local}@${labels.join('.')}`);

  it('accepts exactly what input[type=email] does, within 254 characters', () => {
    fc.assert(
      fc.property(fc.oneof(html5Address, anyString), (email) => {
        expect(isValidSyntax(email, { preset: 'html5' })).toBe(
          whatwgEmail.test(email) && email.length <= 254,
        );
      }),
      { numRuns: 500 },
    );
  });
});

describe('checkTld', () => {
  it('changes nothing when something before the TLD decides', () => {
    fc.assert(
      fc.property(
        fc
          .tuple(anyString, validOptions)
          .filter(([email, options]) => !failsOnlyTld(email, options)),
        ([email, options]) => {
          expect(parseAddress(email, { ...options, checkTld: false })).toEqual(
            parseAddress(email, { ...options, checkTld: true }),
          );
        },
      ),
    );
  });

  it('passes an address whose only failure is its TLD', () => {
    fc.assert(
      fc.property(
        fc
          .tuple(addressLike, validOptions)
          .filter(([email, options]) => failsOnlyTld(email, options)),
        ([email, options]) => {
          expect(isValidSyntax(email, { ...options, checkTld: false })).toBe(
            true,
          );
        },
      ),
    );
  });
});
