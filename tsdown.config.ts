import { defineConfig, type UserConfig } from 'tsdown';

const config: UserConfig = defineConfig({
  entry: ['src/index.ts'],
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
});

export default config;
