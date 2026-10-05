import { type TestContext, test } from 'vitest';
import { syntaxFixtures } from '../src/fixtures';
import { LegacyValidator, syntax } from './load';

// 0.0.1 and v1 side by side on the same input: 0.0.1's async `validate`
// with its default config, against v1's `isValidSyntax` with the default
// `practical` preset. Each pair shares a test, so the comparison table shows
// the ratio, and its `task.meta.bench` (bench/meta.ts) names the pair for the
// PR bench leg's legacy column (meta#20). meta#19 set the one ratio target,
// on the typical address, which the PR bench leg checks.
const { createSyntaxValidator, isValidSyntax } = syntax;
const legacy = new LegacyValidator();

/**
 * Benches one input under both versions, with v1 at least `faster` times
 * faster than 0.0.1 when that's given.
 */
async function pair(
  { bench, task }: TestContext,
  email: string,
  faster?: number,
): Promise<void> {
  task.meta.bench = {
    'v1 isValidSyntax': {
      legacy: '0.0.1 validate',
      ...(faster === undefined ? {} : { faster, source: 'meta#19' }),
    },
  };
  await bench.compare(
    bench('0.0.1 validate', async () => {
      await legacy.validate(email);
    }),
    bench('v1 isValidSyntax', () => {
      isValidSyntax(email);
    }),
  );
}

test('0.0.1 vs v1: typical address', async (context) => {
  await pair(context, 'first.last+tag@sub.example.co.uk', 3);
});

test('0.0.1 vs v1: simple address', async (context) => {
  await pair(context, 'simple@example.com');
});

test('0.0.1 vs v1: no @', async (context) => {
  await pair(context, 'first.last.example.com');
});

test('0.0.1 vs v1: unknown TLD', async (context) => {
  await pair(context, 'first.last@example.invalidtld');
});

test('0.0.1 vs v1: 254-character address', async (context) => {
  await pair(
    context,
    `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(57)}.com`,
  );
});

test('0.0.1 vs v1: 1 MB input', async (context) => {
  await pair(context, `${'a'.repeat((1 << 20) - 12)}@example.com`);
});

test('0.0.1 vs v1: corpus', async ({ bench, task }) => {
  // Every corpus address, one pass per iteration, but the empty one: 0.0.1
  // writes to the console for it, which would time the logging.
  task.meta.bench = { 'v1 isValidSyntax': { legacy: '0.0.1 validate' } };
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
