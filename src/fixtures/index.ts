/**
 * The syntax corpus, published as `@email-utils/validator-syntax/fixtures`
 * so dependents can check they split and judge addresses exactly as
 * `parseAddress` does, and so the docs can build the support matrix.
 *
 * @remarks
 * Every fixture's `expected` is the result under each preset's default
 * options. The rules behind them:
 *
 * - `practical`: a dot-atom local part (letters, digits, and
 *   ``#$&'*+/=?^_`{|}~-`` with single inner dots), so no quoted strings, no
 *   `%` or `!` routes, and no comments or whitespace; hostname labels with at
 *   least one dot, and no domain literals; the TLD in the IANA set.
 * - `rfc5321`: an RFC 5321 Dot-string or Quoted-string local part, never
 *   both mixed, capped at 64 characters; hostname labels with at least one
 *   dot, or an IPv4 or `IPv6:` address literal (IPv6 is the only registered
 *   tag, and no more than six groups may sit beside a `::`); no comments or
 *   whitespace.
 * - `rfc5322`: RFC 5322's addr-spec with its obsolete syntax: dot-separated
 *   atoms and quoted strings mixed, comments and folding whitespace around
 *   every word and label, control characters in quoted strings, comments,
 *   and escapes, and any dtext in a domain literal. Domain labels are
 *   atext, since RFC 5322's domain is a dot-atom, with the hostname rules
 *   for hyphens and length on top. A CRLF must be followed by a space or
 *   tab. No 64-character local cap, but a dotted domain is still required.
 * - `html5`: exactly the WHATWG `input[type=email]` regex.
 *
 * Every preset caps a domain label at 63 characters and the address at 254;
 * all but `html5` cap the domain at 253. Comments and folding whitespace
 * don't count toward the caps.
 *
 * The address splits on the last `@` outside a quoted string, comment, or
 * domain literal (validator-syntax#9). A quote opens a quoted string only at
 * the start of a word; anywhere else it's an invalid character. A quoted
 * string, comment, or literal left open runs to the end, taking any `@`
 * with it.
 *
 * The first failure wins, checked in this order: empty input; the split;
 * the local part, left to right, then its length; the domain, left to right,
 * then its length; the address length; a dotless domain; the TLD. Where a
 * failure has a position, `index` points at the first offending character
 * in the whole address: the `(` of a disallowed or unterminated comment,
 * the `[` of a bad domain literal, the start of an overlong label, and the
 * CR of a CRLF that isn't followed by whitespace.
 *
 * @packageDocumentation
 */
import { createSyntaxValidator } from '../index';
import type { SyntaxOptions } from '../options';
import type { ReasonCode } from '../result';
import { isemailFixtures } from './isemail';
import { legacyFixtures } from './legacy';
import { rfc3696Fixtures } from './rfc3696';
import {
  type Preset,
  type SyntaxFeature,
  type SyntaxFixture,
  presets,
  syntaxFeatures,
} from './types';
import { wikipediaFixtures } from './wikipedia';

export type {
  Expected,
  IsemailFixture,
  LegacyFixture,
  Preset,
  SyntaxFeature,
  SyntaxFixture,
  SyntaxReasonCode,
} from './types';
export {
  isemailFixtures,
  legacyFixtures,
  presets,
  rfc3696Fixtures,
  syntaxFeatures,
  wikipediaFixtures,
};

/**
 * Every fixture from every source, each address once.
 *
 * @example
 * ```ts
 * import { isValidSyntax } from '@email-utils/validator-syntax';
 * import { syntaxFixtures } from '@email-utils/validator-syntax/fixtures';
 *
 * syntaxFixtures.every(
 *   ({ address, expected }) =>
 *     isValidSyntax(address, { preset: 'rfc5321' }) === expected.rfc5321.ok,
 * ); // => true
 * ```
 */
export const syntaxFixtures: readonly SyntaxFixture[] = [
  ...legacyFixtures,
  ...isemailFixtures,
  ...wikipediaFixtures,
  ...rfc3696Fixtures,
];

/** Whether a preset accepts all, some, or none of a feature's fixtures. */
export type Support = 'yes' | 'partial' | 'no';

/** A row of {@link supportMatrix}: one feature, and each preset's support. */
export interface SupportRow {
  feature: SyntaxFeature;
  label: string;
  /** Whether the preset accepts all, some, or none of the feature's fixtures. */
  support: Record<Preset, Support>;
  /** The feature's fixtures, for examples. */
  fixtures: readonly SyntaxFixture[];
}

/**
 * The docs' support matrix: one row per feature, one column per preset.
 *
 * @example
 * ```ts
 * import { supportMatrix } from '@email-utils/validator-syntax/fixtures';
 *
 * const row = supportMatrix().find(({ feature }) => feature === 'quoted-local');
 * row?.support;
 * // => { practical: 'no', rfc5321: 'yes', rfc5322: 'yes', html5: 'no' }
 * ```
 */
export function supportMatrix(): SupportRow[] {
  return syntaxFeatures.map(({ feature, label }) => {
    const fixtures = syntaxFixtures.filter(
      (fixture) => fixture.feature === feature,
    );
    const supportIn = (preset: Preset): Support => {
      const accepted = fixtures.filter(
        (fixture) => fixture.expected[preset].ok,
      ).length;
      if (accepted === fixtures.length) {
        return 'yes';
      }
      return accepted === 0 ? 'no' : 'partial';
    };
    const support = {
      practical: supportIn('practical'),
      rfc5321: supportIn('rfc5321'),
      rfc5322: supportIn('rfc5322'),
      html5: supportIn('html5'),
    };
    return { feature, label, support, fixtures };
  });
}

/** An address the configuration accepts. */
export interface ValidPreviewEntry {
  address: string;
  /** The fixture's description; absent for addresses you pass in. */
  description?: string;
  /** Whether the preset alone, without the overrides, would reject it. */
  changed: boolean;
}

/** An address the configuration rejects, and the first check it fails. */
export interface InvalidPreviewEntry {
  address: string;
  /** The fixture's description; absent for addresses you pass in. */
  description?: string;
  reason: ReasonCode;
  message?: string;
  index?: number;
  /** Whether the preset alone, without the overrides, would accept it. */
  changed: boolean;
}

/** The addresses split by whether the configuration accepts them. */
export interface SyntaxPreview {
  valid: ValidPreviewEntry[];
  invalid: InvalidPreviewEntry[];
}

/**
 * Runs `addresses` through `createSyntaxValidator(options)` and splits them
 * into the ones it accepts and the ones it rejects, each list in input
 * order.
 *
 * @remarks
 * `changed` marks the addresses the overrides move: those the preset alone
 * would judge the other way. With no overrides, nothing is changed.
 *
 * @example
 * ```ts
 * import { previewSyntaxOptions } from '@email-utils/validator-syntax/fixtures';
 *
 * const { valid } = previewSyntaxOptions({ checkTld: false });
 * valid.find((entry) => entry.address === 'example@s.example');
 * // => { changed: true }
 * previewSyntaxOptions({ preset: 'html5' }, ['ada@localhost', 'ada@example..com']);
 * // => {
 * //   valid: [{ address: 'ada@localhost', changed: false }],
 * //   invalid: [{ address: 'ada@example..com', reason: 'syntax.domain.label_invalid' }],
 * // }
 * ```
 *
 * @param addresses - The addresses to judge; `syntaxFixtures` by default.
 * @throws TypeError when `options` are malformed, or `addresses` isn't an
 * array of strings.
 */
export function previewSyntaxOptions(
  options?: SyntaxOptions,
  addresses?: readonly string[],
): SyntaxPreview {
  const validator = createSyntaxValidator(options);
  const preset = createSyntaxValidator({ preset: options?.preset });
  const entries = addresses === undefined ? syntaxFixtures : own(addresses);
  const valid: ValidPreviewEntry[] = [];
  const invalid: InvalidPreviewEntry[] = [];
  for (const { address, description } of entries) {
    const result = validator.parse(address);
    const described = description === undefined ? {} : { description };
    if (result.ok) {
      const changed = !preset.isValid(address);
      valid.push({ address, ...described, changed });
    } else {
      const { ok: _, ...failure } = result;
      invalid.push({
        address,
        ...described,
        ...failure,
        changed: preset.isValid(address),
      });
    }
  }
  return { valid, invalid };
}

/** Checks the caller's addresses, before any of them is parsed. */
function own(
  addresses: readonly string[],
): { address: string; description?: undefined }[] {
  if (!Array.isArray(addresses)) {
    throw new TypeError('Expected the addresses to be an array');
  }
  return addresses.map((address: unknown, i) => {
    if (typeof address !== 'string') {
      throw new TypeError(`Expected addresses[${i}] to be a string`);
    }
    return { address };
  });
}
