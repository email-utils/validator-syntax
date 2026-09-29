import { defineConfig, type UserConfig } from 'tsdown';

const ROOT = '@email-utils/validator-syntax';

const config: UserConfig = defineConfig({
  // `fixtures` is the corpus, for dependents' consistency tests and the docs.
  entry: { index: 'src/index.ts', fixtures: 'src/fixtures/index.ts' },
  format: ['esm', 'cjs'],
  // Browsers, Deno, Bun and edge runtimes run this package too, so nothing
  // may assume Node.
  platform: 'neutral',
  target: 'es2022',
  dts: true,
  sourcemap: true,
  // .mjs/.cjs whatever package.json `type` says, matching the exports map.
  fixedExtension: true,
  // Keep a default export as `exports.default` in CJS, which is what the
  // generated .d.cts declares. The v1 API has named exports only.
  cjsDefault: false,
  // The TLD list is inlined at build time; nothing else may be bundled.
  deps: { onlyBundle: ['tlds'] },
  clean: true,
  // `fixtures` imports the parser from the root entry rather than bundling
  // its own copy or splitting it into a chunk, so the root entry is built
  // exactly as it would be alone.
  plugins: [
    {
      name: 'fixtures-import-root',
      resolveId(source, importer) {
        if (
          source === '../index' &&
          /[/\\]src[/\\]fixtures[/\\]/.test(importer ?? '')
        ) {
          return { id: ROOT, external: true };
        }
        return null;
      },
    },
  ],
  outputOptions: (options, format) => ({
    ...options,
    paths: { [ROOT]: format === 'cjs' ? './index.cjs' : './index.mjs' },
  }),
});

export default config;
