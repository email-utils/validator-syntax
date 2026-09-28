// The address parser's first stage: one pass that splits an address on its
// last `@` outside a quoted string, comment, or domain literal, and lifts the
// comments out. It checks structure only. The presets' character, length,
// and TLD rules build on it (validator-syntax#10, #11, #12).
import type { Result } from './result';

/** Which of RFC 5322's bracketing constructs a preset recognizes. */
export interface Grammar {
  /**
   * A `"` at the start of a local-part word opens a quoted string, which
   * hides any `@` inside it. Otherwise `"` is an ordinary character.
   */
  quotes: boolean;
  /**
   * `(` opens a comment, which nests, takes backslash escapes, and hides any
   * `@` inside it. Otherwise the first `(` fails with
   * `syntax.comment.not_allowed`.
   */
  comments: boolean;
  /**
   * A `[` at the start of the domain opens a domain literal, which hides any
   * `@` inside it. Otherwise `[` is an ordinary character.
   */
  literals: boolean;
}

/** Each preset's grammar, for the presets to pick from (validator-syntax#10). */
export const grammars: Readonly<
  Record<'practical' | 'rfc5321' | 'rfc5322' | 'html5', Grammar>
> = {
  practical: { quotes: false, comments: false, literals: false },
  rfc5321: { quotes: true, comments: false, literals: true },
  rfc5322: { quotes: true, comments: true, literals: true },
  html5: { quotes: false, comments: false, literals: false },
};

export interface ParsedAddress {
  /** The local part, without comments. */
  local: string;
  /** The domain, without comments. */
  domain: string;
  /** The last label; absent for a domain literal or a dotless domain. */
  tld?: string;
  /** Comments in input order; empty when there are none. */
  comments: AddressComment[];
}

export interface AddressComment {
  /** The comment's text, without the parentheses. */
  text: string;
  /**
   * Where the comment sat. RFC 5322's obsolete syntax also allows comments
   * between the words of the local part and the labels of the domain
   * (`test.(comment)test@example.com`): those are `inside-local` and
   * `inside-domain`.
   */
  position:
    | 'before-local'
    | 'inside-local'
    | 'after-local'
    | 'before-domain'
    | 'inside-domain'
    | 'after-domain';
}

const NORMAL = 0;
const QUOTED = 1;
const COMMENT = 2;
const LITERAL = 3;

/** Space, tab, CR, and LF: the characters folding whitespace is made of. */
function isWhitespace(code: number): boolean {
  return code === 32 || code === 9 || code === 13 || code === 10;
}

/**
 * Splits `email` into its local part and domain, lifting out the comments.
 *
 * @remarks
 * The first failure wins, in this order: empty input; no `@` outside a
 * quoted string, comment, or literal; an empty local part; a disallowed
 * comment in the local part; an unterminated comment; a disallowed comment
 * in the domain; an empty domain. A quoted string or literal left open runs
 * to the end, taking any `@` with it; so does a comment, unless a split `@`
 * came before it, in which case it's `syntax.comment.unterminated`.
 *
 * @throws TypeError when `email` isn't a string.
 */
export function splitAddress(
  email: string,
  grammar: Grammar,
): Result<ParsedAddress> {
  if (typeof email !== 'string') {
    throw new TypeError(`Expected a string, got ${typeof email}`);
  }
  if (email === '') {
    return { ok: false, reason: 'syntax.address.empty' };
  }

  let state = NORMAL;
  // A quoted string opens only at the start of a word, and a literal only at
  // the start of the domain. Whitespace and comments don't end either.
  let wordStart = true;
  let domainStart = false;
  let depth = 0;
  let open = -1;
  let at = -1;
  let paren = -1;
  // Closed comments as [start, end), parentheses included.
  const ranges: [number, number][] = [];

  for (let i = 0; i < email.length; i++) {
    const code = email.charCodeAt(i);
    if (state === NORMAL) {
      if (code === 64 /* @ */) {
        at = i;
        wordStart = true;
        domainStart = true;
      } else if (code === 40 /* ( */) {
        if (grammar.comments) {
          state = COMMENT;
          depth = 1;
          open = i;
        } else if (paren < 0) {
          paren = i;
        }
      } else if (!isWhitespace(code)) {
        if (code === 34 /* " */ && grammar.quotes && wordStart) {
          state = QUOTED;
        } else if (code === 91 /* [ */ && grammar.literals && domainStart) {
          state = LITERAL;
        }
        wordStart = code === 46; /* . */
        domainStart = false;
      }
    } else if (code === 92 /* \ */) {
      i++;
    } else if (state === COMMENT) {
      if (code === 40) {
        depth++;
      } else if (code === 41 /* ) */ && --depth === 0) {
        state = NORMAL;
        ranges.push([open, i + 1]);
      }
    } else if (code === (state === QUOTED ? 34 : 93) /* " or ] */) {
      state = NORMAL;
    }
  }

  if (at < 0) {
    return { ok: false, reason: 'syntax.address.no_at' };
  }

  const comments: AddressComment[] = [];
  const local = strip(email, 0, at, ranges, comments, 'local');
  if (local === '') {
    return { ok: false, reason: 'syntax.local.empty' };
  }
  if (paren >= 0 && paren < at) {
    return notAllowed(paren);
  }
  if (state === COMMENT) {
    return {
      ok: false,
      reason: 'syntax.comment.unterminated',
      message: 'A comment is missing its closing parenthesis',
      index: open,
    };
  }
  if (paren >= 0) {
    return notAllowed(paren);
  }
  const domain = strip(email, at + 1, email.length, ranges, comments, 'domain');
  if (domain === '') {
    return { ok: false, reason: 'syntax.domain.empty' };
  }

  const dot = domain.lastIndexOf('.');
  return {
    ok: true,
    value:
      domain.charCodeAt(0) === 91 || dot < 0 || dot === domain.length - 1
        ? { local, domain, comments }
        : { local, domain, tld: domain.slice(dot + 1), comments },
  };
}

function notAllowed(index: number): Result<ParsedAddress> {
  return {
    ok: false,
    reason: 'syntax.comment.not_allowed',
    message: 'Comments are not allowed',
    index,
  };
}

/**
 * Returns `email` from `start` to `end` with the comments in `ranges` cut
 * out, and appends those comments to `comments`.
 */
function strip(
  email: string,
  start: number,
  end: number,
  ranges: readonly (readonly [number, number])[],
  comments: AddressComment[],
  part: 'local' | 'domain',
): string {
  const cut = ranges.filter(([open]) => open >= start && open < end);
  if (cut.length === 0) {
    return email.slice(start, end);
  }
  let text = '';
  // The part's first and last characters that aren't whitespace or comment.
  let first = -1;
  let last = -1;
  let from = start;
  for (let r = 0; r <= cut.length; r++) {
    const [to, next] = cut[r] ?? [end, end];
    for (let i = from; i < to; i++) {
      if (!isWhitespace(email.charCodeAt(i))) {
        first = first < 0 ? i : first;
        last = i;
      }
    }
    text += email.slice(from, to);
    from = next;
  }
  for (const [open, close] of cut) {
    comments.push({
      text: email.slice(open + 1, close - 1),
      position:
        first < 0 || open < first
          ? `before-${part}`
          : open > last
            ? `after-${part}`
            : `inside-${part}`,
    });
  }
  return text;
}
