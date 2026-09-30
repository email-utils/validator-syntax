// fast-check arbitraries for the property tests and the adversarial-input
// budget (test/budgets.worker.ts): arbitrary strings, address-shaped ones,
// which reach further into the parser than random text does, and options
// the entry points accept.
import * as fc from 'fast-check';
import type { SyntaxOptions } from '../src';
import { presets } from '../src/fixtures';

/** The characters an address's structure turns on, and the ones that trip it. */
export const significant: readonly string[] = [
  '@',
  '.',
  '"',
  '(',
  ')',
  '[',
  ']',
  '\\',
  ' ',
  '\t',
  '\r',
  '\n',
  '\r\n ',
  '\0',
  '-',
  '%',
  '!',
  ':',
  'IPv6:',
  'xn--',
  'ü',
  '用',
  '😀',
  '。',
  '\u200D',
  // Lone surrogates, which no UTF-8 text can hold.
  '\uD800',
  '\uDC00',
];

const noisyUnit = fc.oneof(
  fc.constantFrom(...significant),
  fc.string({ unit: 'binary', minLength: 1, maxLength: 1 }),
  fc.string({ unit: 'binary-ascii', minLength: 1, maxLength: 1 }),
  fc.constantFrom(...'abcxyzABC019'.split('')),
);

const alnum = 'abcxyzABC019'.split('');
export const atext: readonly string[] = [
  ...alnum,
  ..."!#$%&'*+-/=?^_`{|}~".split(''),
];
/** Mostly ASCII atoms; now and then, one with non-ASCII in it. */
const atom = fc.oneof(
  {
    weight: 6,
    arbitrary: fc.string({
      unit: fc.oneof(
        { weight: 20, arbitrary: fc.constantFrom(...alnum) },
        { weight: 1, arbitrary: fc.constantFrom(...atext) },
      ),
      minLength: 1,
      maxLength: 12,
    }),
  },
  {
    weight: 1,
    arbitrary: fc.string({
      unit: fc.constantFrom(...alnum, 'ü', '用', '😀'),
      minLength: 1,
      maxLength: 12,
    }),
  },
);
const word = fc.oneof(
  { weight: 8, arbitrary: atom },
  // Quoted strings, with spaces and escapes, and comments.
  {
    weight: 1,
    arbitrary: fc
      .array(fc.oneof(atom, fc.constantFrom(' ', '\\"', '\\\\', '@')))
      .map((parts) => `"${parts.join('')}"`),
  },
  { weight: 1, arbitrary: atom.map((text) => `(${text})`) },
);
const anyLabel = fc.oneof(
  {
    weight: 8,
    arbitrary: fc.string({
      unit: fc.oneof(
        { weight: 20, arbitrary: fc.constantFrom(...'abcxyz019'.split('')) },
        { weight: 1, arbitrary: fc.constant('-') },
      ),
      minLength: 1,
      maxLength: 10,
    }),
  },
  // U-labels, for allowIdn.
  {
    weight: 1,
    arbitrary: fc.string({
      unit: fc.constantFrom('a', 'b', 'c', '-', 'ü', '例', 'ب'),
      minLength: 1,
      maxLength: 10,
    }),
  },
  // Around the 63-character cap.
  {
    weight: 1,
    arbitrary: fc.integer({ min: 60, max: 66 }).map((n) => 'a'.repeat(n)),
  },
);
const anyTld = fc.constantFrom(
  'com',
  'uk',
  'COM',
  'xn--p1ai',
  'рф',
  'invalidtld',
  'x',
);
const anyDomain = fc.oneof(
  {
    weight: 8,
    arbitrary: fc
      .tuple(fc.array(anyLabel, { maxLength: 4 }), anyTld)
      .map(([labels, last]) => [...labels, last].join('.')),
  },
  {
    weight: 1,
    arbitrary: fc.constantFrom(
      '[192.0.2.1]',
      '[IPv6:2001:db8::1]',
      '[IPv6:::192.0.2.1]',
      '[x]',
      '[192.0.2.256]',
      'localhost',
    ),
  },
);

/** Something shaped like an address, a third of the time with noise put in. */
export const addressLike: fc.Arbitrary<string> = fc
  .tuple(fc.array(word, { minLength: 1, maxLength: 4 }), anyDomain)
  .map(([words, host]) => `${words.join('.')}@${host}`)
  .chain((address) =>
    fc.oneof(
      { weight: 2, arbitrary: fc.constant(address) },
      {
        weight: 1,
        arbitrary: fc
          .tuple(fc.nat({ max: address.length }), noisyUnit)
          .map(([i, noise]) => address.slice(0, i) + noise + address.slice(i)),
      },
    ),
  );

/** Any string at all: unicode, control characters, lone surrogates, and long runs. */
export const anyString: fc.Arbitrary<string> = fc.oneof(
  fc.string({ unit: 'binary', maxLength: 80 }),
  fc.string({ unit: 'grapheme', maxLength: 40 }),
  fc.string({ unit: noisyUnit, maxLength: 80 }),
  { weight: 4, arbitrary: addressLike },
  // Long enough to pass every cap many times over.
  fc
    .tuple(
      fc.string({ unit: noisyUnit, minLength: 1, maxLength: 20 }),
      fc.integer({ min: 10, max: 2000 }),
    )
    .map(([chunk, times]) => chunk.repeat(times)),
);

const flag = fc.constantFrom(true, false, undefined);

/**
 * Options that are well-formed: no override turned on that the preset's
 * grammar has no room for, which is documented to throw.
 */
export const validOptions: fc.Arbitrary<SyntaxOptions | undefined> = fc.option(
  fc
    .record(
      {
        preset: fc.constantFrom(...presets, undefined),
        checkTld: flag,
        allowNoTld: flag,
        allowComments: flag,
        allowUnicode: flag,
        allowIdn: flag,
        allowIpLiteral: flag,
      },
      { requiredKeys: [] },
    )
    .map((options) => {
      const off =
        options.preset === 'html5'
          ? ([
              'allowComments',
              'allowUnicode',
              'allowIdn',
              'allowIpLiteral',
            ] as const)
          : options.preset === 'rfc5321'
            ? (['allowComments'] as const)
            : [];
      const valid = { ...options };
      for (const key of off) {
        if (valid[key] === true) {
          valid[key] = false;
        }
      }
      return valid;
    }),
  { nil: undefined },
);
