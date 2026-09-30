import { type Bench, expect, test } from 'vitest';
import { syntaxFixtures } from '../src/fixtures';
import { LegacyValidator, syntax } from './load';

// 0.0.1 and v1 side by side on the same input: 0.0.1's async `validate`
// with its default config, against v1's `isValidSyntax` with the default
// `practical` preset. Each pair shares a test, so the comparison table shows
// the ratio. meta#19 set the one ratio target, on the typical address; the
// rest are recorded for the PR bench leg's table (meta#20).
const { createSyntaxValidator, isValidSyntax } = syntax;
const legacy = new LegacyValidator();

/** Benches one input under both versions, and returns the results. */
async function pair(bench: Bench, email: string) {
  return bench.compare(
    bench('0.0.1 validate', async () => {
      await legacy.validate(email);
    }),
    bench('v1 isValidSyntax', () => {
      isValidSyntax(email);
    }),
  );
}

test('0.0.1 vs v1: typical address', async ({ bench }) => {
  // v1 at least 3× faster than 0.0.1 (meta#19).
  const results = await pair(bench, 'first.last+tag@sub.example.co.uk');
  expect(results.get('v1 isValidSyntax')).toBeFasterThan(
    results.get('0.0.1 validate'),
    { delta: 2 / 3 },
  );
});

test('0.0.1 vs v1: simple address', async ({ bench }) => {
  await pair(bench, 'simple@example.com');
});

test('0.0.1 vs v1: no @', async ({ bench }) => {
  await pair(bench, 'first.last.example.com');
});

test('0.0.1 vs v1: unknown TLD', async ({ bench }) => {
  await pair(bench, 'first.last@example.invalidtld');
});

test('0.0.1 vs v1: 254-character address', async ({ bench }) => {
  await pair(
    bench,
    `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(57)}.com`,
  );
});

test('0.0.1 vs v1: 1 MB input', async ({ bench }) => {
  await pair(bench, `${'a'.repeat((1 << 20) - 12)}@example.com`);
});

test('0.0.1 vs v1: corpus', async ({ bench }) => {
  // Every corpus address, one pass per iteration, but the empty one: 0.0.1
  // writes to the console for it, which would time the logging.
  const addresses = syntaxFixtures
    .map(({ address }) => address)
    .filter((address) => address !== '');
  const practical = createSyntaxValidator();
  await bench.compare(
    bench('0.0.1 validate', async () => {
      for (const address of addresses) {
        // oxlint-disable-next-line no-await-in-loop -- 0.0.1's API is async
        await legacy.validate(address);
      }
    }),
    bench('v1 isValidSyntax', () => {
      for (const address of addresses) {
        practical.isValid(address);
      }
    }),
  );
});
