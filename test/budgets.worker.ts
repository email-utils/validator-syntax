// Times the parser for test/budgets.test.ts, in a worker thread that Node
// runs directly. v8 coverage, which the CI test leg always collects, counts
// every block the code runs and makes a scan over a long input about 10×
// slower; Vitest's module runner adds an export getter to every call between
// src's files. Coverage is enabled per thread, so a worker isn't
// instrumented, and the budgets measure the code as it ships under
// `npm test` and `npm run test:coverage` alike.
//
// Each time is the average over a batch of calls, best of several batches,
// so a shared runner or a GC pause doesn't count against the budget. Every
// adversarial input is parsed once before anything is timed, so the times
// are taken after V8 has seen Unicode, lone surrogates, and every option,
// not only the ASCII it compiles for first.
import { registerHooks } from 'node:module';
import { parentPort, workerData } from 'node:worker_threads';
import type { Arbitrary } from 'fast-check';
import type { SyntaxOptions } from '../src';

// src imports its own files without extensions, as the bundler resolves
// them; Node needs the `.ts`. The hook has to be registered before src is
// imported, so everything else is imported dynamically below.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (/^\.\.?\//.test(specifier) && !/\.[cm]?[jt]s(?:on)?$/.test(specifier)) {
      for (const suffix of ['.ts', '/index.ts']) {
        try {
          return nextResolve(specifier + suffix, context);
        } catch {
          // Not this one; try the next.
        }
      }
    }
    return nextResolve(specifier, context);
  },
});

const fc = await import('fast-check');
const { parseAddress } = await import('../src/index.ts');
const { addressLike, anyString, significant, validOptions } =
  await import('./arbitraries.ts');

/** What the worker measured, in nanoseconds per call. */
export interface Report {
  /** Each oversized shape: whether every size was rejected, and its times. */
  oversized: {
    name: string;
    rejected: boolean;
    times: { size: number; ns: number }[];
  }[];
  /**
   * Each worst-case shape: whether every size is within `maxLength`, so it's
   * scanned rather than rejected for its length, and its times.
   */
  linear: {
    name: string;
    scanned: boolean;
    times: { size: number; ns: number }[];
  }[];
  /** Each arbitrary: its slowest input, with the options it ran under. */
  adversarial: {
    name: string;
    ns: number;
    email: string;
    options: SyntaxOptions | undefined;
  }[];
}

/** How many calls of `run` take at least `ms` milliseconds. */
function calibrate(run: () => unknown, ms: number): number {
  for (let calls = 1; ; calls *= 2) {
    const start = performance.now();
    for (let i = 0; i < calls; i++) {
      run();
    }
    if (performance.now() - start >= ms) {
      return calls;
    }
  }
}

/**
 * Nanoseconds per call of each of `runs`, the best of `batches` batches of
 * about `ms` milliseconds. The runs take turns, so a slow patch on the
 * runner lands on all of them rather than on one.
 */
function nsPerCall(runs: (() => unknown)[], batches = 7, ms = 0.5): number[] {
  const calls = runs.map((run) => calibrate(run, ms));
  const best = runs.map(() => Infinity);
  for (let batch = 0; batch < batches; batch++) {
    runs.forEach((run, r) => {
      const count = calls[r]!;
      const start = performance.now();
      for (let i = 0; i < count; i++) {
        run();
      }
      best[r] = Math.min(best[r]!, ((performance.now() - start) * 1e6) / count);
    });
  }
  return best;
}

function isLinear(times: readonly number[]): boolean {
  return times.every((ns, i) => i === 0 || ns / times[i - 1]! <= 2.5);
}

function tooLong(email: string, options?: SyntaxOptions): boolean {
  const result = parseAddress(email, options);
  return !result.ok && result.reason === 'syntax.address.too_long';
}

// The default maxLength and a smaller and a larger one, each with options
// that reach every part of the scanner.
const limits: readonly [string, number, SyntaxOptions?][] = [
  ['practical', 512],
  ['rfc5321', 512, { preset: 'rfc5321' }],
  ['html5', 512, { preset: 'html5' }],
  ['rfc5322', 512, { preset: 'rfc5322', allowUnicode: true, allowIdn: true }],
  ['maxLength 64', 64, { maxLength: 64, allowComments: true }],
  ['maxLength 2048', 2048, { preset: 'rfc5322', maxLength: 2048 }],
];

// Input past maxLength, from just over it to 4 MB.
const oversized: readonly [string, (n: number) => string][] = [
  ['a long local part', (n) => `${'a'.repeat(n - 12)}@example.com`],
  ['a long domain', (n) => `ada@${'a'.repeat(n - 8)}.com`],
  ['no @', (n) => 'a'.repeat(n)],
  ['a local part of dots', (n) => `${'a.'.repeat(n / 2 - 6)}ab@gmail.com`],
  ['nested comments', (n) => `${'('.repeat(n / 2)}${')'.repeat(n / 2)}`],
  ['a quoted string', (n) => `"${'a'.repeat(n - 14)}"@example.com`],
  ['U-labels', (n) => `a@${'ü.'.repeat(n / 2 - 2)}de`],
];
const oversizes = [65_536, 1_048_576, 4_194_304];

/** 60 distinct CJK ideographs: a U-label whose A-label is over 63. */
const ideographs = Array.from({ length: 60 }, (_, i) =>
  String.fromCodePoint(0x4e00 + i * 7),
).join('');

/**
 * `text` as one flat string, as an address typed into a form arrives. V8
 * builds a long `repeat` out of pieces, and reading one character at a time
 * costs more until the first read joins them: a step in the times that isn't
 * the parser's.
 */
function flat(text: string): string {
  return text.split('').join('');
}

/** `run` repeated between `prefix` and `suffix`, to `n` characters or less. */
function fill(prefix: string, run: string, suffix: string, n: number): string {
  const room = n - prefix.length - suffix.length;
  const times = Math.max(0, Math.floor(room / run.length));
  return prefix + run.repeat(times) + suffix;
}

// Worst cases for the scanner, doubling up to the default maxLength of 512.
const rfc5321 = { preset: 'rfc5321' } as const;
const rfc5322 = { preset: 'rfc5322' } as const;
const idn = { allowIdn: true } as const;
const sizes = [32, 64, 128, 256, 512];
const linear: readonly [
  string,
  (n: number) => string,
  SyntaxOptions?,
  (readonly number[])?,
][] = [
  ['a local part of dots', (n) => fill('', 'a.', 'a@gmail.com', n)],
  ['many labels', (n) => fill('a@', 'a.', 'com', n)],
  ['an overlong label', (n) => fill('a@', 'a', '.com', n)],
  ['a run of @s', (n) => '@'.repeat(n)],
  [
    'a quoted string of escapes',
    (n) => fill('"', '\\"', '"@example.com', n),
    rfc5321,
  ],
  [
    'an IPv6 literal of many groups',
    (n) => fill('a@[IPv6:', '1:', '1]', n),
    rfc5321,
  ],
  [
    'nested comments',
    (n) => `${'('.repeat(n / 2 - 7)}${')'.repeat(n / 2 - 7)}a@example.com`,
    rfc5322,
  ],
  ['an unclosed comment', (n) => '('.repeat(n), rfc5322],
  ['many comments', (n) => fill('a', '(c)', '@example.com', n), rfc5322],
  ['folding whitespace', (n) => fill('a', '\r\n ', '@example.com', n), rfc5322],
  ['obsolete words', (n) => fill('', 'a .', 'a@example.com', n), rfc5322],
  ['a quoted string of @s', (n) => fill('"', '@', '"@example.com', n), rfc5322],
  ['a domain literal', (n) => fill('a@[', 'a', ']', n), rfc5322],
  ['backslashes', (n) => '\\'.repeat(n), rfc5322],
  ['html5 dots', (n) => fill('', '.', '@example', n), { preset: 'html5' }],
  [
    'a Unicode local part',
    (n) => fill('', '用', '@example.com', n),
    { allowUnicode: true },
  ],
  [
    'Unicode comments',
    (n) => fill('a', '(用)', '@example.com', n),
    { ...rfc5322, allowUnicode: true },
  ],
  ['U-labels', (n) => fill('a@', 'ü.', 'de', n), idn],
  ['right-to-left U-labels', (n) => fill('a@', 'بب.', 'de', n), idn],
  [
    'U-labels of 60 ideographs',
    (n) => fill('a@', `${ideographs}.`, 'de', n),
    { ...rfc5322, allowIdn: true },
    // From two labels: fewer is a step, not a trend.
    [128, 256, 512],
  ],
  [
    'a 63-character A-label, then U-labels',
    (n) => fill(`a@${'ü'.repeat(57)}.`, 'ü.', 'de', n),
    idn,
    [128, 256, 512],
  ],
  [
    'U-labels, the last invalid',
    (n) => fill('a@', 'ü.', 'x\u200Dy.de', n),
    idn,
  ],
];

// The characters that steer the parser, and a letter of each script.
const token = fc.constantFrom('a', 'ü', 'ب', ...significant);

// Runs of those characters, up to the default maxLength.
const tokens = fc
  .array(token, { maxLength: 300, size: 'max' })
  .map((parts) => parts.join('').slice(0, 512));

// A short run of them repeated to fill the default maxLength or half of it,
// the shape the worst cases in `linear` take.
const repeated = fc
  .tuple(
    fc.array(token, { minLength: 1, maxLength: 8 }),
    fc.constantFrom(256, 512),
  )
  .map(([parts, n]) => {
    const run = parts.join('');
    return run.repeat(Math.floor(n / run.length));
  });

// Past the default maxLength is the oversized budget's.
const adversarial: readonly [string, Arbitrary<string>][] = [
  ['any string', anyString.map((email) => email.slice(0, 512))],
  ['address-shaped strings', addressLike],
  ['runs of the characters that matter', tokens],
  ['a run repeated to the cap', repeated],
];

const samples = adversarial.map(([name, arbitrary]) => ({
  name,
  inputs: fc.sample(
    fc.tuple(arbitrary, validOptions),
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test/budgets.test.ts passes the seed
    { numRuns: 300, seed: workerData as number },
  ),
}));
for (const { inputs } of samples) {
  for (const [email, options] of inputs) {
    parseAddress(email, options);
  }
}

const report: Report = {
  oversized: limits.flatMap(([limit, maxLength, options]) =>
    oversized.map(([name, shape]) => {
      const lengths = [maxLength + 2, ...oversizes];
      const emails = lengths.map(shape);
      const times = nsPerCall(
        emails.map((email) => () => parseAddress(email, options)),
        5,
        0.2,
      );
      return {
        name: `${name}, ${limit}`,
        rejected: emails.every(
          (email, i) => email.length === lengths[i] && tooLong(email, options),
        ),
        times: lengths.map((size, i) => ({ size, ns: times[i]! })),
      };
    }),
  ),

  linear: linear.map(([name, shape, options, lengths = sizes]) => {
    const emails = lengths.map((n) => flat(shape(n)));
    const runs = emails.map((email) => () => parseAddress(email, options));
    // A series with a step over 2.5 is measured again, twice at most,
    // keeping each size's best: a slow patch on the runner can't hold up a
    // linear shape three times running, and a quadratic one is over every
    // time.
    let times = nsPerCall(runs, 9, 1);
    for (let retry = 0; retry < 2 && !isLinear(times); retry++) {
      const again = nsPerCall(runs, 9, 1);
      times = times.map((ns, i) => Math.min(ns, again[i]!));
    }
    return {
      name,
      scanned: emails.every((email) => email.length <= 512),
      times: lengths.map((size, i) => ({ size, ns: times[i]! })),
    };
  }),

  adversarial: samples.map(({ name, inputs }) => {
    const timed = inputs.map(([email, options]) => ({
      name,
      ns: perInput(email, options, 3),
      email,
      options,
    }));
    // The slowest ten again, over more batches: an input that's slow only
    // because the runner was busy then gets a fair time.
    // oxlint-disable-next-line unicorn/no-array-sort -- timed is a fresh array
    const slowest = timed.sort((a, b) => b.ns - a.ns).slice(0, 10);
    for (const input of slowest) {
      input.ns = Math.min(input.ns, perInput(input.email, input.options, 20));
    }
    return slowest.reduce((a, b) => (b.ns > a.ns ? b : a));
  }),
};

/** One input's time: the best of `batches` batches of 10 calls. */
function perInput(
  email: string,
  options: SyntaxOptions | undefined,
  batches: number,
): number {
  let best = Infinity;
  for (let batch = 0; batch < batches; batch++) {
    const start = performance.now();
    for (let call = 0; call < 10; call++) {
      parseAddress(email, options);
    }
    best = Math.min(best, ((performance.now() - start) * 1e6) / 10);
  }
  return best;
}

// oxlint-disable-next-line unicorn/require-post-message-target-origin -- a worker_threads port, not a window: it takes no origin
parentPort?.postMessage(report);
