// The shared result shapes from the API conventions
// (https://email-utils.github.io/meta/docs/reference/conventions#results),
// declared here so no package depends on another for types.

/**
 * The `syntax.*` codes from the reason-code catalogue
 * (https://email-utils.github.io/meta/docs/reference/reason-codes#validator-syntax).
 */
export type ReasonCode =
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
  | 'syntax.domain.literal_invalid'
  | 'syntax.domain.too_long'
  | 'syntax.domain.invalid_char'
  | 'syntax.comment.not_allowed'
  | 'syntax.comment.unterminated'
  | 'syntax.tld.unknown';

/**
 * A validation result: the value on success, or the first check that failed.
 * Branch on `reason`, never on `message`, which isn't semver-stable.
 */
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; reason: ReasonCode; message?: string; index?: number };
