import { test } from 'vitest';
import { grammars, splitAddress } from '../src/parse';

// validator-syntax#9 targets 300 ns for a typical address. The corpus-wide
// bench and its gates arrive with the performance work (validator-syntax#15).
test('splitAddress', async ({ bench }) => {
  await bench('typical address', () => {
    splitAddress('ada.lovelace@example.co.uk', grammars.practical);
  }).run();
  await bench('quoted local part', () => {
    splitAddress('"ada@home"@example.com', grammars.rfc5321);
  }).run();
  await bench('comments', () => {
    splitAddress('(work)ada@example.com(home)', grammars.rfc5322);
  }).run();
});
