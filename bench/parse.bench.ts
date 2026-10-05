import { test } from 'vitest';
import { syntaxFixtures } from '../src/fixtures';
import { syntax } from './load';

// Each test gives its benches' targets in `task.meta.bench` (bench/meta.ts),
// with the issue that set them; meta#19's are the v1 plan's. The absolute
// ones are on Apple Silicon, so the nightly job checks them against a 3×
// bound for its runner (meta#21); the PR bench leg (meta#20) checks the
// ratio and compares these names between base and head, so keep them
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

test('parseAddress', async ({ bench, task }) => {
  task.meta.bench = {
    'typical address': { p50: 300, source: 'validator-syntax#9' },
    // The split finds no @.
    'no @': { p50: 150, source: 'meta#19' },
    'unknown TLD': { p50: 1000, source: 'meta#19' },
    '254-character address': { p50: 2000, source: 'meta#19' },
    // Past maxLength, at any size; test/budgets.test.ts gates it on every PR.
    '1 MB input': { p50: 1000, source: 'validator-syntax#15' },
    '4 MB input': { p50: 1000, source: 'validator-syntax#15' },
  };
  await bench('typical address', () => {
    parseAddress(typical);
  }).run();
  await bench('no @', () => {
    parseAddress('first.last.example.com');
  }).run();
  // No target of its own; a failure partway through the domain.
  await bench('invalid address', () => {
    parseAddress('ada@example..com');
  }).run();
  await bench('unknown TLD', () => {
    parseAddress('first.last@example.invalidtld');
  }).run();
  await bench('254-character address', () => {
    parseAddress(longest);
  }).run();
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

test('worst cases', async ({ bench, task }) => {
  // ≤ 3 µs at 256 characters and ≤ 6 µs at 512, the default maxLength.
  const targets = [
    [256, 3000],
    [512, 6000],
  ] as const;
  task.meta.bench = {};
  for (const [name, shape, options] of worst) {
    for (const [n, p50] of targets) {
      task.meta.bench[`${name}, ${n}`] = {
        p50,
        source: 'validator-syntax#15',
      };
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

test('worst cases with allowIdn', async ({ bench, task }) => {
  // ≤ 12 µs at 256 characters and ≤ 16 µs at 512: every U-label is scanned,
  // and each converts through the URL parser until the domain passes its
  // 253 cap.
  const targets = [
    [256, 12_000],
    [512, 16_000],
  ] as const;
  task.meta.bench = {};
  for (const [name, shape] of worstIdn) {
    for (const [n, p50] of targets) {
      task.meta.bench[`${name}, ${n}`] = {
        p50,
        source: 'validator-syntax#15',
      };
      const email = shape(n);
      // oxlint-disable-next-line no-await-in-loop -- one bench at a time
      await bench(`${name}, ${n}`, () => {
        parseAddress(email, { allowIdn: true });
      }).run();
    }
  }
});

test('presets', async ({ bench, task }) => {
  // rfc5321's quoted strings have no target of their own.
  task.meta.bench = {
    comments: { p50: 2000, source: 'meta#19' },
    html5: { p50: 1000, source: 'meta#19' },
  };
  await bench('quoted local part', () => {
    rfc5321.parse('"first last"@example.com');
  }).run();
  await bench('comments', () => {
    rfc5322.parse('(work)first.last@example.com(home)');
  }).run();
  await bench('html5', () => {
    html5.parse(typical);
  }).run();
});

test('international options', async ({ bench, task }) => {
  // Typical, with the options on. validator-syntax#14's ≤ 5% on the default
  // path with them off is a base-to-head comparison, the PR bench leg's
  // (meta#20).
  task.meta.bench = {
    'Unicode local part': { p50: 5000, source: 'validator-syntax#14' },
    'IDN domain': { p50: 5000, source: 'validator-syntax#14' },
  };
  await bench('Unicode local part', () => {
    international.parse('josé.garcía@example.com');
  }).run();
  await bench('IDN domain', () => {
    international.parse('ada@bücher.example.de');
  }).run();
});

test('isValidSyntax', async ({ bench, task }) => {
  task.meta.bench = {
    'typical address': { p50: 1000, p99: 5000, source: 'meta#19' },
  };
  await bench('typical address', () => {
    isValidSyntax(typical);
  }).run();
});

test('result object', async ({ bench, task }) => {
  // The value and message cost little over the boolean.
  task.meta.bench = {
    parseAddress: {
      within: { bench: 'isValidSyntax', max: 1.25 },
      source: 'meta#19',
    },
  };
  await bench.compare(
    bench('parseAddress', () => {
      parseAddress(typical);
    }),
    bench('isValidSyntax', () => {
      isValidSyntax(typical);
    }),
  );
});

test('corpus', async ({ bench, task }) => {
  // 1,000 addresses in ≤ 1 ms, so ≤ 287 µs for the corpus's 287.
  const addresses = syntaxFixtures.map(({ address }) => address);
  task.meta.bench = {};
  for (const preset of ['practical', 'rfc5321', 'rfc5322', 'html5'] as const) {
    task.meta.bench[preset] = { p50: 287_000, source: 'meta#19' };
    const validator = createSyntaxValidator({ preset });
    // oxlint-disable-next-line no-await-in-loop -- one bench at a time
    await bench(preset, () => {
      for (const address of addresses) {
        validator.isValid(address);
      }
    }).run();
  }
});
