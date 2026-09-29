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
 * The local part is checked before the domain, each left to right, then the
 * lengths, then a dotless domain, then the TLD. `index`, where a failure has
 * one, points at the offending character.
 *
 * @example
 * ```ts
 * const result = parseAddress('ada.lovelace@example.co.uk');
 * if (result.ok) {
 *   result.value.tld; // 'uk'
 * } else {
 *   result.reason; // e.g. 'syntax.local.invalid_char'
 * }
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
 * isValidSyntax('ada@example.com'); // true
 * isValidSyntax('"ada"@example.com'); // false
 * isValidSyntax('"ada"@example.com', { preset: 'rfc5321' }); // true
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
}

/**
 * Binds `options` once, checking them up front, and returns
 * {@link parseAddress} and {@link isValidSyntax} with them applied.
 *
 * @example
 * ```ts
 * const strict = createSyntaxValidator({ preset: 'rfc5321' });
 * strict.parse('a b@example.com'); // { ok: false, reason: 'syntax.local.unquoted_space', … }
 * strict.isValid('"a b"@example.com'); // true
 * ```
 *
 * @throws TypeError when `options` are malformed.
 */
export function createSyntaxValidator(
  options?: SyntaxOptions,
): SyntaxValidator {
  const rules = resolve(options);
  return {
    parse: (email) => parse(email, rules),
    isValid: (email) => parse(email, rules).ok,
  };
}
