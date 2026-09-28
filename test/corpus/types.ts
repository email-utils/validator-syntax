// The shape of a corpus case. Each case carries its expected result under
// every preset, so one table drives the tests, the benches, and the docs'
// support matrix.

export type Preset = 'practical' | 'rfc5321' | 'rfc5322' | 'html5';

export const presets: readonly Preset[] = [
  'practical',
  'rfc5321',
  'rfc5322',
  'html5',
];

/** The `syntax.*` codes from the reason-code catalogue (meta docs/api/reason-codes.md). */
export type SyntaxReasonCode =
  | 'syntax.address.empty'
  | 'syntax.address.no_at'
  | 'syntax.address.too_long'
  | 'syntax.local.empty'
  | 'syntax.local.too_long'
  | 'syntax.local.invalid_char'
  | 'syntax.local.consecutive_dots'
  | 'syntax.local.unquoted_space'
  | 'syntax.domain.empty'
  | 'syntax.domain.no_dot'
  | 'syntax.domain.label_invalid'
  | 'syntax.domain.too_long'
  | 'syntax.domain.invalid_char'
  | 'syntax.comment.not_allowed'
  | 'syntax.comment.unterminated'
  | 'syntax.tld.unknown';

export type Expected =
  { ok: true } | { ok: false; reason: SyntaxReasonCode; index?: number };

export interface CorpusCase {
  address: string;
  description: string;
  /** The result with each preset's default options. */
  expected: Record<Preset, Expected>;
  /** What 0.0.1's `validate()` returned with its default config. */
  legacy: boolean;
  /**
   * Why v1's default preset (`practical`) disagrees with `legacy`: the 0.0.1
   * bug it was, or the v1 rule that changed. Required exactly when they
   * disagree.
   */
  flipped?: string;
}

export const valid: Expected = { ok: true };

export function fail(reason: SyntaxReasonCode, index?: number): Expected {
  return index === undefined
    ? { ok: false, reason }
    : { ok: false, reason, index };
}

/** The same result under every preset. */
export function everywhere(expected: Expected): Record<Preset, Expected> {
  return {
    practical: expected,
    rfc5321: expected,
    rfc5322: expected,
    html5: expected,
  };
}
