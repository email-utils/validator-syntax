// What the benches run: the built bundle, and 0.0.1 from npm. Not src: under
// Vitest's module runner every call between src's modules goes through an
// export getter, which makes a typical parse about 8× slower than the bundle
// (https://vitest.dev/guide/benchmarking#module-runner-overhead). The bundle
// is also what users run. `npm run bench` builds it first.
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import type * as Syntax from '../src';
import type { EmailSyntaxValidator } from '../test/legacy/validator';

const built = new URL('../dist/index.mjs', import.meta.url);
if (!existsSync(fileURLToPath(built))) {
  throw new Error('The benches run the built package: run `npm run build`');
}

/** The v1 root entry, as built. */
// oxlint-disable-next-line typescript/no-unsafe-assignment -- typed by the annotation
export const syntax: typeof Syntax = await import(
  /* @vite-ignore */ built.href
);

/**
 * The 0.0.1 validator, from the `validator-syntax-0.0.1` alias of
 * `@email-utils/validator-syntax@0.0.1-9`. It's CommonJS, with the class on
 * `exports.default` and no types, so it's required and typed from the
 * verbatim copy in test/legacy.
 */
// oxlint-disable-next-line typescript/no-unsafe-assignment -- typed by the annotation
const legacy: { default: typeof EmailSyntaxValidator } = createRequire(
  import.meta.url,
)('validator-syntax-0.0.1');
export const LegacyValidator: typeof EmailSyntaxValidator = legacy.default;
