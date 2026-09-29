// The presets and the flat overrides on top of them (docs/api/
// validator-syntax.md in meta, decision S1), resolved once into the rules
// the parser runs.
import { ATEXT, HTML5, LDH, PRACTICAL } from './chars';

/** A base rule set; see {@link SyntaxOptions.preset}. */
export type Preset = 'practical' | 'rfc5321' | 'rfc5322' | 'html5';

/** Options for {@link parseAddress} and the other entry points. */
export interface SyntaxOptions {
  /**
   * The base rule set:
   *
   * - `practical`: what real mailboxes look like. Dot-atom local parts, hostname
   *   domains, a TLD from the IANA set.
   * - `rfc5321`: what SMTP accepts on the wire, quoted local parts and IP
   *   address literals included.
   * - `rfc5322`: RFC 5322's full addr-spec, comments, folding whitespace, and
   *   obsolete syntax included.
   * - `html5`: exactly what a browser's `input[type=email]` accepts.
   *
   * @defaultValue `'practical'`
   */
  preset?: Preset | undefined;
  /**
   * Check the TLD against the IANA set.
   *
   * @defaultValue `true` in `practical`, `false` elsewhere
   */
  checkTld?: boolean | undefined;
  /**
   * Accept a domain with no dot, like `localhost`.
   *
   * @defaultValue `true` in `html5`, `false` elsewhere
   */
  allowNoTld?: boolean | undefined;
  /**
   * Accept RFC 5322 comments, like `ada(work)@example.com`. In `practical`
   * they may sit only at the ends of the local part and the domain; in
   * `rfc5322`, around every word and label too.
   *
   * @remarks
   * Throws `TypeError` when `true` with `rfc5321` or `html5`, whose grammars
   * have no comments.
   *
   * @defaultValue `true` in `rfc5322`, `false` elsewhere
   */
  allowComments?: boolean | undefined;
}

/** What the parser checks, resolved from a preset and its overrides. */
export interface Rules {
  /** The character class of local-part atoms. */
  local: number;
  /** The character class of domain labels. */
  domain: number;
  /**
   * Quoted strings: the whole local part in `rfc5321`, any word of it with
   * `obs`.
   */
  quotes: boolean;
  /**
   * Domain literals: IPv4 and IPv6 address literals, or any dtext with `obs`.
   */
  literals: boolean;
  comments: boolean;
  /**
   * RFC 5322's obsolete syntax: folding whitespace between tokens, comments
   * between words and labels, quoted strings and atoms mixed, and control
   * characters in quoted strings, comments, escapes, and literals.
   */
  obs: boolean;
  /** The longest local part allowed. */
  localCap: number;
  /** The longest domain allowed. */
  domainCap: number;
  checkTld: boolean;
  allowNoTld: boolean;
}

const presets: Readonly<Record<Preset, Readonly<Rules>>> = {
  practical: {
    local: PRACTICAL,
    domain: LDH,
    quotes: false,
    literals: false,
    comments: false,
    obs: false,
    localCap: 64,
    domainCap: 253,
    checkTld: true,
    allowNoTld: false,
  },
  rfc5321: {
    local: ATEXT,
    domain: LDH,
    quotes: true,
    literals: true,
    comments: false,
    obs: false,
    localCap: 64,
    domainCap: 253,
    checkTld: false,
    allowNoTld: false,
  },
  rfc5322: {
    local: ATEXT,
    domain: ATEXT,
    quotes: true,
    literals: true,
    comments: true,
    obs: true,
    localCap: Infinity,
    domainCap: 253,
    checkTld: false,
    allowNoTld: false,
  },
  html5: {
    local: HTML5,
    domain: LDH,
    quotes: false,
    literals: false,
    comments: false,
    obs: false,
    localCap: Infinity,
    domainCap: Infinity,
    checkTld: false,
    allowNoTld: true,
  },
};

const overrides = ['checkTld', 'allowNoTld', 'allowComments'] as const;

/**
 * Resolves `options` into the rules they select.
 *
 * @throws TypeError when `options` isn't an object, names an unknown option
 * or preset, gives a non-boolean override, or allows comments in a preset
 * whose grammar has none.
 */
export function resolve(options: SyntaxOptions | undefined): Readonly<Rules> {
  if (options === undefined) {
    return presets.practical;
  }
  if (typeof options !== 'object' || options === null) {
    throw new TypeError('Expected the options to be an object');
  }
  for (const key of Object.keys(options)) {
    if (key !== 'preset' && !(overrides as readonly string[]).includes(key)) {
      throw new TypeError(`Unknown option: ${key}`);
    }
  }
  const preset = options.preset ?? 'practical';
  if (!Object.hasOwn(presets, preset)) {
    throw new TypeError(`Unknown preset: ${preset}`);
  }
  const base = presets[preset];
  for (const key of overrides) {
    const value = options[key];
    if (value !== undefined && typeof value !== 'boolean') {
      throw new TypeError(`Expected ${key} to be a boolean`);
    }
  }
  const { checkTld, allowNoTld, allowComments } = options;
  if (allowComments === true && (preset === 'rfc5321' || preset === 'html5')) {
    throw new TypeError(
      `The ${preset} preset has no comments, so allowComments can't be true`,
    );
  }
  if (
    checkTld === undefined &&
    allowNoTld === undefined &&
    allowComments === undefined
  ) {
    return base;
  }
  return {
    ...base,
    checkTld: checkTld ?? base.checkTld,
    allowNoTld: allowNoTld ?? base.allowNoTld,
    comments: allowComments ?? base.comments,
  };
}
