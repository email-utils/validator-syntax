import { test } from 'vitest';
import { createSyntaxValidator, parseAddress } from '../src';

// validator-syntax#9 targets 300 ns for a typical address. The corpus-wide
// bench and its gates arrive with the performance work (validator-syntax#15).
const rfc5321 = createSyntaxValidator({ preset: 'rfc5321' });
const rfc5322 = createSyntaxValidator({ preset: 'rfc5322' });
// validator-syntax#14 targets 5 µs with the international options on, and
// no more than 5% on the default path when they're off.
const international = createSyntaxValidator({
  allowUnicode: true,
  allowIdn: true,
});

test('parseAddress', async ({ bench }) => {
  await bench('typical address', () => {
    parseAddress('ada.lovelace@example.co.uk');
  }).run();
  await bench('invalid address', () => {
    parseAddress('ada@example..com');
  }).run();
  await bench('quoted local part', () => {
    rfc5321.parse('"ada@home"@example.com');
  }).run();
  await bench('comments', () => {
    rfc5322.parse('(work)ada@example.com(home)');
  }).run();
  await bench('Unicode local part', () => {
    international.parse('josé.garcía@example.com');
  }).run();
  await bench('IDN domain', () => {
    international.parse('ada@bücher.example.de');
  }).run();
});
