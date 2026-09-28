// The shape of a fixture. Each one carries its expected result under every
// preset, so one table drives the tests, the benches, dependents'
// consistency tests, and the docs' support matrix.
import type { ReasonCode } from '../result';

export type Preset = 'practical' | 'rfc5321' | 'rfc5322' | 'html5';

export const presets: readonly Preset[] = [
  'practical',
  'rfc5321',
  'rfc5322',
  'html5',
];

/** The `syntax.*` codes from the reason-code catalogue (meta docs/api/reason-codes.md). */
export type SyntaxReasonCode = ReasonCode;

export type Expected =
  { ok: true } | { ok: false; reason: SyntaxReasonCode; index?: number };

/**
 * The address features the support matrix has a row for. A fixture is tagged
 * with one only when it's a well-formed example of that feature, so counting
 * which presets accept the tagged fixtures gives the matrix.
 */
export type SyntaxFeature =
  | 'dot-atom'
  | 'atext-specials'
  | 'route-chars'
  | 'misplaced-dots'
  | 'long-local'
  | 'quoted-local'
  | 'quoted-pair'
  | 'obs-local'
  | 'comments'
  | 'fws'
  | 'obs-control'
  | 'ipv4-literal'
  | 'ipv6-literal'
  | 'general-literal'
  | 'dotless-domain'
  | 'unknown-tld';

/** The support matrix's rows, in order, with each feature's label. */
export const syntaxFeatures: readonly {
  feature: SyntaxFeature;
  label: string;
}[] = [
  { feature: 'dot-atom', label: 'Letters, digits, and single dots' },
  {
    feature: 'atext-specials',
    label: 'Printable specials like `+`, `/`, `=`, and `_`',
  },
  { feature: 'route-chars', label: 'Route characters (`%`, `!`)' },
  {
    feature: 'misplaced-dots',
    label: 'Leading, trailing, or consecutive dots',
  },
  { feature: 'long-local', label: 'Local part over 64 characters' },
  { feature: 'quoted-local', label: 'Quoted local part' },
  { feature: 'quoted-pair', label: 'Backslash escapes in a quoted string' },
  {
    feature: 'obs-local',
    label: 'Dot-separated atoms and quoted strings mixed',
  },
  { feature: 'comments', label: 'Comments' },
  { feature: 'fws', label: 'Whitespace and line folding between tokens' },
  { feature: 'obs-control', label: 'Control characters (obsolete syntax)' },
  { feature: 'ipv4-literal', label: 'IPv4 address literal' },
  { feature: 'ipv6-literal', label: 'IPv6 address literal' },
  { feature: 'general-literal', label: 'Other domain literals' },
  { feature: 'dotless-domain', label: 'Domain with no dot' },
  { feature: 'unknown-tld', label: 'TLD outside the IANA set' },
];

export interface SyntaxFixture {
  address: string;
  description: string;
  /** The result with each preset's default options. */
  expected: Record<Preset, Expected>;
  /** The support-matrix row this fixture is a well-formed example of. */
  feature?: SyntaxFeature;
}

export interface LegacyFixture extends SyntaxFixture {
  /** What 0.0.1's `validate()` returned with its default config. */
  legacy: boolean;
  /**
   * Why v1's default preset (`practical`) disagrees with `legacy`: the 0.0.1
   * bug it was, or the v1 rule that changed. Required exactly when they
   * disagree.
   */
  flipped?: string;
}

export interface IsemailFixture extends SyntaxFixture {
  /** The test's `id` in isemail's tests.xml. */
  isemail: number;
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

/** Valid under both RFC presets; `practical` and `html5` both give `rejected`. */
export function rfcOnly(rejected: Expected): Record<Preset, Expected> {
  return {
    practical: rejected,
    rfc5321: valid,
    rfc5322: valid,
    html5: rejected,
  };
}

/** Valid only under `rfc5322`; every other preset gives `rejected`. */
export function rfc5322Only(rejected: Expected): Record<Preset, Expected> {
  return { ...everywhere(rejected), rfc5322: valid };
}
