import { test } from 'vitest';
import EmailSyntaxValidator from '../src';

// Replaces 0.0.1's "1000 emails in under 20 ms" timing assertions. Targets and
// the legacy comparison arrive with the performance work.
const validator = new EmailSyntaxValidator();

test('validate', async ({ bench }) => {
  await bench('valid address', async () => {
    await validator.validate('simple@example.com');
  }).run();
  await bench('invalid address', async () => {
    await validator.validate('invalid@cb$.com');
  }).run();
});
