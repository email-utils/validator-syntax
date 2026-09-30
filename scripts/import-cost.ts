// What importing each built entry costs, and whether the hot functions leak
// (validator-syntax#15). Each measurement runs in a fresh `node --expose-gc`
// process, the median of several is kept, and an empty module measured the
// same way is taken off, so what's left is the entry's own cost:
//
// - import time: loading, compiling, and running the entry;
// - retained heap: what the entry keeps after the import and a full GC;
// - calls: the heap the hot functions keep after a million calls over the
//   corpus, measured after a warm-up that builds the lazy TLD set.
//
// Fails when any exceeds its budget. The budgets have plenty of headroom,
// because import time on a shared CI runner is noisy.
//
//   npm run build && node scripts/import-cost.ts
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import pkg from '../package.json' with { type: 'json' };

/** Budgets for each entry's import, in milliseconds and bytes. */
const importBudgets: Readonly<Record<string, { ms: number; heap: number }>> = {
  // Measured at 0.39 ms and 152 KB on Apple Silicon; meta#19's target is
  // 2 ms, and a GitHub runner can be 2–3× slower.
  '.': { ms: 2, heap: 256 * 1024 },
  // Measured at 1.25 ms and 445 KB; it imports the root entry too.
  './fixtures': { ms: 5, heap: 768 * 1024 },
};

/** Heap the hot functions may keep after a million calls (meta#19). */
const callBudget = 1024 * 1024;

/** Processes per measurement; the median is kept. */
const runs = 9;

const root = pathToFileURL(join(import.meta.dirname, '..', '/'));

const entries = Object.entries(pkg.exports).flatMap(([subpath, target]) =>
  typeof target === 'string' ? [] : [[subpath, target.import] as const],
);

function entryOf(subpath: string): string {
  const entry = entries.find(([name]) => name === subpath);
  if (entry === undefined) {
    throw new Error(`No ${subpath} entry in package.json`);
  }
  return entry[1];
}

/** Runs `code` as a module in a fresh process and returns its JSON output. */
// oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- the caller names what `code` writes
function run<T>(code: string, ...args: string[]): T {
  const child = spawnSync(
    process.execPath,
    ['--expose-gc', '--input-type=module', '--eval', code, ...args],
    { encoding: 'utf8' },
  );
  if (child.status !== 0) {
    throw new Error(`The measuring process failed:\n${child.stderr}`);
  }
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- written by `code`
  return JSON.parse(child.stdout) as T;
}

// Two full GCs, since the first can leave garbage for the second.
const importOne = `
  const settle = () => { gc(); gc(); return process.memoryUsage().heapUsed; };
  const before = settle();
  const start = performance.now();
  await import(process.argv[1]);
  const ms = performance.now() - start;
  process.stdout.write(JSON.stringify({ ms, heap: settle() - before }));
`;

interface Cost {
  ms: number;
  heap: number;
}

function median(values: number[]): number {
  // oxlint-disable-next-line unicorn/no-array-sort -- a fresh array, and ES2022 has no toSorted
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1]!;
}

function measure(url: string): Cost {
  const costs = Array.from({ length: runs }, () => run<Cost>(importOne, url));
  return {
    ms: median(costs.map(({ ms }) => ms)),
    heap: median(costs.map(({ heap }) => heap)),
  };
}

const kb = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`;
const failures: string[] = [];

function report(name: string, value: string, budget: string, over: boolean) {
  process.stdout.write(
    `${over ? '✖' : '✔'} ${name.padEnd(56)} ${value.padStart(9)}  (budget ${budget})\n`,
  );
  if (over) {
    failures.push(name);
  }
}

const scratch = mkdtempSync(join(tmpdir(), 'import-cost-'));
try {
  const empty = join(scratch, 'empty.mjs');
  writeFileSync(empty, 'export {};\n');
  const baseline = measure(pathToFileURL(empty).href);

  for (const [subpath, target] of entries) {
    const budget = importBudgets[subpath];
    if (budget === undefined) {
      throw new Error(`No import budget for ${subpath}`);
    }
    const cost = measure(new URL(target, root).href);
    const ms = cost.ms - baseline.ms;
    const heap = cost.heap - baseline.heap;
    report(
      `import ${subpath}: time`,
      `${ms.toFixed(2)} ms`,
      `${budget.ms} ms`,
      ms > budget.ms,
    );
    report(
      `import ${subpath}: retained heap`,
      kb(heap),
      kb(budget.heap),
      heap > budget.heap,
    );
  }

  const calls = run<Record<string, number>>(
    `
    const settle = () => { gc(); gc(); return process.memoryUsage().heapUsed; };
    const { createSyntaxValidator, isValidSyntax, parseAddress } =
      await import(process.argv[1]);
    const { syntaxFixtures } = await import(process.argv[2]);
    const addresses = syntaxFixtures.map(({ address }) => address);
    const international = { preset: 'rfc5322', allowUnicode: true, allowIdn: true };
    const validator = createSyntaxValidator();
    const hot = {
      parseAddress: (email) => parseAddress(email),
      'parseAddress (rfc5322, Unicode, IDN)': (email) =>
        parseAddress(email, international),
      isValidSyntax: (email) => isValidSyntax(email),
      'SyntaxValidator.parse': (email) => validator.parse(email),
    };
    const retained = {};
    for (const [name, fn] of Object.entries(hot)) {
      addresses.forEach(fn);
      const before = settle();
      for (let i = 0; i < 1_000_000; i++) {
        fn(addresses[i % addresses.length]);
      }
      retained[name] = settle() - before;
    }
    process.stdout.write(JSON.stringify(retained));
    `,
    new URL(entryOf('.'), root).href,
    new URL(entryOf('./fixtures'), root).href,
  );
  for (const [name, heap] of Object.entries(calls)) {
    report(
      `1M calls of ${name}: retained heap`,
      kb(heap),
      kb(callBudget),
      heap > callBudget,
    );
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

if (failures.length > 0) {
  process.stderr.write(`Over budget: ${failures.join(', ')}\n`);
  process.exitCode = 1;
}
