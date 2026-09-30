import { test } from 'vitest';
import { syntaxFixtures } from '../src/fixtures';
import { syntax } from './load';

// Each bench's target sits beside it, from the issue that set it; meta#19's
// are the v1 plan's. They're absolute, on Apple Silicon, so the nightly job
// checks them against a 3× bound for its runner (meta#21); the PR bench leg
// (meta#20) compares these names between base and head, so keep them
// stable.
const { createSyntaxValidator, isValidSyntax, parseAddress } = syntax;

const typical = 'first.last+tag@sub.example.co.uk';
const rfc5321 = createSyntaxValidator({ preset: 'rfc5321' });
const rfc5322 = createSyntaxValidator({ preset: 'rfc5322' });
const html5 = createSyntaxValidator({ preset: 'html5' });
const international = createSyntaxValidator({
  allowUnicode: true,
  allowIdn: true,
});
// 254 characters: a 64-character local part and a 189-character domain.
const longest = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(57)}.com`;
const megabyte = `${'a'.repeat((1 << 20) - 12)}@example.com`;
const fourMegabytes = 'a'.repeat(1 << 22);

test('parseAddress', async ({ bench }) => {
  // ≤ 300 ns (validator-syntax#9).
  await bench('typical address', () => {
    parseAddress(typical);
  }).run();
  // ≤ 150 ns (meta#19): the split finds no @.
  await bench('no @', () => {
    parseAddress('first.last.example.com');
  }).run();
  // No target of its own; a failure partway through the domain.
  await bench('invalid address', () => {
    parseAddress('ada@example..com');
  }).run();
  // ≤ 1 µs (meta#19).
  await bench('unknown TLD', () => {
    parseAddress('first.last@example.invalidtld');
  }).run();
  // ≤ 2 µs (meta#19).
  await bench('254-character address', () => {
    parseAddress(longest);
  }).run();
  // Past maxLength, ≤ 1 µs at any size (validator-syntax#15);
  // test/budgets.test.ts gates it on every PR.
  await bench('1 MB input', () => {
    parseAddress(megabyte);
  }).run();
  await bench('4 MB input', () => {
    parseAddress(fourMegabytes);
  }).run();
});

/** `run` repeated between `prefix` and `suffix`, to `n` characters or less. */
function fill(prefix: string, run: string, suffix: string, n: number): string {
  const times = Math.floor((n - prefix.length - suffix.length) / run.length);
  return prefix + run.repeat(times) + suffix;
}

// The worst shapes test/budgets.worker.ts finds for the scanner, at half the
// default maxLength and at all of it.
const worst: readonly [
  string,
  (n: number) => string,
  Parameters<typeof parseAddress>[1],
][] = [
  ['Gmail dots', (n) => fill('', 'a.', 'a@gmail.com', n), undefined],
  ['many labels', (n) => fill('a@', 'a.', 'com', n), undefined],
  [
    'many comments',
    (n) => fill('a', '(c)', '@example.com', n),
    { preset: 'rfc5322' },
  ],
  [
    'obsolete words',
    (n) => fill('', 'a .', 'a@example.com', n),
    { preset: 'rfc5322' },
  ],
  [
    'Unicode comments',
    (n) => fill('a', '(用)', '@example.com', n),
    { preset: 'rfc5322', allowUnicode: true },
  ],
];

test('worst cases', async ({ bench }) => {
  // ≤ 3 µs at 256 characters and ≤ 6 µs at 512, the default maxLength
  // (validator-syntax#15).
  for (const [name, shape, options] of worst) {
    for (const n of [256, 512]) {
      const email = shape(n);
      // oxlint-disable-next-line no-await-in-loop -- one bench at a time
      await bench(`${name}, ${n}`, () => {
        parseAddress(email, options);
      }).run();
    }
  }
});

/** 60 distinct CJK ideographs: a U-label whose A-label is over 63. */
const ideographs = Array.from({ length: 60 }, (_, i) =>
  String.fromCodePoint(0x4e00 + i * 7),
).join('');

const worstIdn: readonly [string, (n: number) => string][] = [
  ['U-labels', (n) => fill('a@', 'ü.', 'de', n)],
  ['right-to-left U-labels', (n) => fill('a@', 'بب.', 'de', n)],
  ['U-labels of 60 ideographs', (n) => fill('a@', `${ideographs}.`, 'de', n)],
  [
    'a 63-character A-label, then U-labels',
    (n) => fill(`a@${'ü'.repeat(57)}.`, 'ü.', 'de', n),
  ],
  ['U-labels, the last invalid', (n) => fill('a@', 'ü.', 'x\u200Dy.de', n)],
];

test('worst cases with allowIdn', async ({ bench }) => {
  // ≤ 12 µs at 256 characters and ≤ 16 µs at 512 (validator-syntax#15):
  // every U-label is scanned, and each converts through the URL parser
  // until the domain passes its 253 cap.
  for (const [name, shape] of worstIdn) {
    for (const n of [256, 512]) {
      const email = shape(n);
      // oxlint-disable-next-line no-await-in-loop -- one bench at a time
      await bench(`${name}, ${n}`, () => {
        parseAddress(email, { allowIdn: true });
      }).run();
    }
  }
});

test('presets', async ({ bench }) => {
  // No target of its own; rfc5321's quoted strings.
  await bench('quoted local part', () => {
    rfc5321.parse('"first last"@example.com');
  }).run();
  // ≤ 2 µs for rfc5322 (meta#19).
  await bench('comments', () => {
    rfc5322.parse('(work)first.last@example.com(home)');
  }).run();
  // ≤ 1 µs for html5 (meta#19).
  await bench('html5', () => {
    html5.parse(typical);
  }).run();
});

test('international options', async ({ bench }) => {
  // ≤ 5 µs typical with the options on (validator-syntax#14). Its ≤ 5% on
  // the default path with them off is a base-to-head comparison, the PR
  // bench leg's (meta#20).
  await bench('Unicode local part', () => {
    international.parse('josé.garcía@example.com');
  }).run();
  await bench('IDN domain', () => {
    international.parse('ada@bücher.example.de');
  }).run();
});

test('isValidSyntax', async ({ bench }) => {
  // ≤ 1 µs p50 and ≤ 5 µs p99 (meta#19).
  await bench('typical address', () => {
    isValidSyntax(typical);
  }).run();
});

test('result object', async ({ bench }) => {
  // parseAddress within 1.25× isValidSyntax (meta#19): the value and message
  // cost little over the boolean.
  await bench.compare(
    bench('parseAddress', () => {
      parseAddress(typical);
    }),
    bench('isValidSyntax', () => {
      isValidSyntax(typical);
    }),
  );
});

test('corpus', async ({ bench }) => {
  // 1,000 addresses in ≤ 1 ms (meta#19), so ≤ 287 µs for the corpus's 287.
  const addresses = syntaxFixtures.map(({ address }) => address);
  for (const preset of ['practical', 'rfc5321', 'rfc5322', 'html5'] as const) {
    const validator = createSyntaxValidator({ preset });
    // oxlint-disable-next-line no-await-in-loop -- one bench at a time
    await bench(preset, () => {
      for (const address of addresses) {
        validator.isValid(address);
      }
    }).run();
  }
});
