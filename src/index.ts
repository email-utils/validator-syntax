/**
 * Is the address well-formed? A quote-aware parser with four presets:
 * `practical` (the default), `rfc5321`, `rfc5322`, and `html5`.
 *
 * @packageDocumentation
 */
import { type SyntaxOptions, resolve } from './options';
import { type ParsedAddress, parse } from './parse';
import type { Result } from './result';

export type { Preset, SyntaxOptions } from './options';
export type { AddressComment, ParsedAddress } from './parse';
export type { ReasonCode, Result } from './result';

/**
 * Parses `email` into its local part, domain, TLD, and comments, or returns
 * the first check it fails.
 *
 * @remarks
 * Input longer than `maxLength` (512 UTF-16 code units by default) fails as
 * `syntax.address.too_long` before it's scanned. Otherwise the local part is
 * checked before the domain, each left to right, then the lengths, then a
 * dotless domain, then the TLD. `index`, where a failure has one, points at
 * the offending character.
 *
 * @example
 * ```ts
 * import { parseAddress } from '@email-utils/validator-syntax';
 *
 * parseAddress('ada.lovelace@example.co.uk');
 * // => { ok: true, value: { local: 'ada.lovelace', tld: 'uk' } }
 * parseAddress('ada..lovelace@example.com');
 * // => { ok: false, reason: 'syntax.local.consecutive_dots', index: 4 }
 * ```
 *
 * @throws TypeError when `email` isn't a string, or `options` are malformed.
 */
export function parseAddress(
  email: string,
  options?: SyntaxOptions,
): Result<ParsedAddress> {
  return parse(email, resolve(options));
}

/**
 * Whether `email` is well-formed: exactly `parseAddress(email, options).ok`.
 *
 * @example
 * ```ts
 * import { isValidSyntax } from '@email-utils/validator-syntax';
 *
 * isValidSyntax('ada@example.com'); // => true
 * isValidSyntax('"ada"@example.com'); // => false
 * isValidSyntax('"ada"@example.com', { preset: 'rfc5321' }); // => true
 * ```
 *
 * @throws TypeError when `email` isn't a string, or `options` are malformed.
 */
export function isValidSyntax(email: string, options?: SyntaxOptions): boolean {
  return parse(email, resolve(options)).ok;
}

/** {@link parseAddress} and {@link isValidSyntax} with options bound. */
export interface SyntaxValidator {
  parse(email: string): Result<ParsedAddress>;
  isValid(email: string): boolean;
  /**
   * The `maxLength` this validator applies: the one in its options, or the
   * default, 512. `Infinity` when there's no limit.
   *
   * @remarks
   * For a dependent that trims or otherwise pre-processes input before
   * parsing it: checking the raw input's length against this first rejects
   * oversized input before any of that work, and padding can't carry input
   * past the limit. The validator is frozen, so this can't be reassigned.
   *
   * @example
   * ```ts
   * import { createSyntaxValidator } from '@email-utils/validator-syntax';
   *
   * createSyntaxValidator().maxLength; // => 512
   * createSyntaxValidator({ maxLength: 1024 }).maxLength; // => 1024
   *
   * const validator = createSyntaxValidator();
   * const padded = `${' '.repeat(600)}ada@example.com`;
   * padded.length > validator.maxLength; // => true
   * validator.isValid(padded.trim()); // => true
   * ```
   */
  readonly maxLength: number;
}

/**
 * Binds `options` once, checking them up front, and returns
 * {@link parseAddress} and {@link isValidSyntax} with them applied, and the
 * `maxLength` they resolve to. The validator is frozen.
 *
 * @example
 * ```ts
 * import { createSyntaxValidator } from '@email-utils/validator-syntax';
 *
 * const strict = createSyntaxValidator({ preset: 'rfc5321' });
 * strict.parse('a b@example.com');
 * // => { ok: false, reason: 'syntax.local.unquoted_space', index: 1 }
 * strict.isValid('"a b"@example.com'); // => true
 * createSyntaxValidator({ preset: 'html5', allowComments: true });
 * // => throws TypeError
 * ```
 *
 * @throws TypeError when `options` are malformed.
 */
export function createSyntaxValidator(
  options?: SyntaxOptions,
): SyntaxValidator {
  const rules = resolve(options);
  return Object.freeze<SyntaxValidator>({
    parse: (email) => parse(email, rules),
    isValid: (email) => parse(email, rules).ok,
    maxLength: rules.maxLength,
  });
}
