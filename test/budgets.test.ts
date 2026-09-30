// validator-syntax#15's deterministic budgets: time that doesn't depend on
// the runner's speed, or only loosely. Oversized input is rejected in
// constant time, time grows linearly with the input up to the length caps,
// and no generated input takes long. test/budgets.worker.ts does the timing,
// in a thread v8 coverage doesn't instrument; this checks what it measured.
import { Worker } from 'node:worker_threads';
import { describe, expect, it } from 'vitest';
import type { Report } from './budgets.worker';

// The adversarial inputs' seed, in every failure message, so a run can be
// repeated.
const seed = Date.now();

const report = await new Promise<Report>((resolve, reject) => {
  const worker = new Worker(new URL('budgets.worker.ts', import.meta.url), {
    workerData: seed,
  });
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the worker posts one Report
  worker.once('message', (message) => resolve(message as Report));
  worker.once('error', reject);
  worker.once('exit', (code) => {
    reject(new Error(`The timing worker exited with code ${code}`));
  });
});

/** µs, to one decimal place, for failure messages. */
function µs(ns: number): string {
  return `${(ns / 1000).toFixed(1)} µs`;
}

// validator-syntax#15 budget: past maxLength, ≤ 1 µs at any size, a 4 MB
// string included.
describe('oversized input', () => {
  it.each(report.oversized)(
    '$name is rejected in ≤ 1 µs',
    ({ rejected, times }) => {
      expect(rejected).toBe(true);
      for (const { size, ns } of times) {
        expect(ns, `${size} characters: ${µs(ns)}`).toBeLessThanOrEqual(1000);
      }
    },
  );
});

// validator-syntax#15 budget: time(2n) / time(n) ≤ 2.5, up to the default
// maxLength.
describe('time grows linearly', () => {
  it.each(report.linear)('with $name', ({ scanned, times }) => {
    expect(scanned).toBe(true);
    for (let i = 1; i < times.length; i++) {
      const [before, after] = [times[i - 1], times[i]];
      const ratio = (after?.ns ?? Infinity) / (before?.ns ?? 0);
      expect(
        ratio,
        `${before?.size} → ${after?.size} characters`,
      ).toBeLessThanOrEqual(2.5);
    }
  });
});

// validator-syntax#15 budget: ≤ 50 µs for each input up to the default
// maxLength, under any options.
describe('adversarial input', () => {
  it.each(report.linear)('with $name takes ≤ 50 µs', ({ times }) => {
    const { size, ns } = times.at(-1)!;
    expect(ns, `${size} characters: ${µs(ns)}`).toBeLessThanOrEqual(50_000);
  });

  it.each(report.adversarial)(
    '$name take ≤ 50 µs each',
    ({ ns, email, options }) => {
      const input = `${JSON.stringify(email)} under ${JSON.stringify(options)}`;
      expect(
        ns,
        `${µs(ns)} with seed ${seed} for ${input}`,
      ).toBeLessThanOrEqual(50_000);
    },
  );
});
