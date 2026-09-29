import { test } from 'vitest';
import { EmailSyntaxValidator } from '../test/legacy/validator';

// The 0.0.1 validator, as a baseline for parseAddress. Targets and the ratio
// gates arrive with the performance work (validator-syntax#15).
const validator = new EmailSyntaxValidator();

test('0.0.1 validate', async ({ bench }) => {
  await bench('valid address', async () => {
    await validator.validate('simple@example.com');
  }).run();
  await bench('invalid address', async () => {
    await validator.validate('invalid@cb$.com');
  }).run();
});
