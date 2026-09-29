import type { Result } from '../src';
import type { Expected } from '../src/fixtures';

/** The result without its value or message, which the corpus doesn't record. */
export function outcome(result: Result<unknown>): Expected {
  if (result.ok) {
    return { ok: true };
  }
  const { reason, index } = result;
  return index === undefined
    ? { ok: false, reason }
    : { ok: false, reason, index };
}
