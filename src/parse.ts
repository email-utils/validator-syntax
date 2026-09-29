// The address parser. One pass finds the last `@` outside a quoted string,
// comment, or domain literal; then the local part and the domain are each
// scanned left to right against the preset's rules, and the lengths, the
// dot, and the TLD are checked last. The first failure wins, in the order
// the corpus sets out (src/fixtures/index.ts).
import { inClass, isWhitespace, nonAsciiAt, utf8Length } from './chars';
import { toALabel } from './idn';
import { isAddressLiteral } from './ip';
import type { Rules } from './options';
import type { ReasonCode, Result } from './result';
import { isKnownTld } from './tld';

/** An address split into its parts, as {@link parseAddress} returns it. */
export interface ParsedAddress {
  /** The local part, without comments or folding whitespace. */
  local: string;
  /** The domain, without comments or folding whitespace. */
  domain: string;
  /**
   * The last label; absent for a domain literal, or a dotless domain the
   * preset allows.
   */
  tld?: string;
  /** Comments in input order; empty when there are none or they aren't allowed. */
  comments: AddressComment[];
}

/** A comment lifted out of an address. */
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

type Failure = Extract<Result<never>, { ok: false }>;

const messages: Readonly<Record<ReasonCode, string>> = {
  'syntax.address.empty': 'The address is empty',
  'syntax.address.no_at': 'The address has no @',
  'syntax.address.too_long': 'The address is longer than 254 characters',
  'syntax.local.empty': 'Nothing comes before the @',
  'syntax.local.too_long': 'The local part is longer than 64 characters',
  'syntax.local.invalid_char': 'The local part has a character it can’t hold',
  'syntax.local.consecutive_dots': 'The local part has two dots in a row',
  'syntax.local.unquoted_space': 'The local part has a space outside quotes',
  'syntax.domain.empty': 'Nothing comes after the @',
  'syntax.domain.no_dot': 'The domain has no dot',
  'syntax.domain.label_invalid':
    'A domain label is empty, too long, or starts or ends with a hyphen',
  'syntax.domain.literal_invalid': 'The domain literal isn’t accepted',
  'syntax.domain.too_long': 'The domain is longer than 253 characters',
  'syntax.domain.invalid_char': 'The domain has a character it can’t hold',
  'syntax.comment.not_allowed': 'Comments aren’t allowed here',
  'syntax.comment.unterminated': 'A comment is missing its closing parenthesis',
  'syntax.tld.unknown': 'The TLD isn’t in the IANA set',
};

function fail(reason: ReasonCode, index?: number): Failure {
  const message = messages[reason];
  return index === undefined
    ? { ok: false, reason, message }
    : { ok: false, reason, message, index };
}

const NORMAL = 0;
const QUOTED = 1;
const COMMENT = 2;
const LITERAL = 3;

/**
 * Finds the `@` that splits `email`: the last one outside a quoted string,
 * comment, or domain literal, or -1 when there's none.
 *
 * @remarks
 * A quoted string opens only at the start of a word, and a literal only at
 * the start of the domain; both, and comments, take backslash escapes. One
 * left open runs to the end, taking any `@` with it.
 */
export function findAt(email: string, rules: Readonly<Rules>): number {
  let state = NORMAL;
  // Whitespace and comments don't end a word start or a domain start.
  let wordStart = true;
  let domainStart = false;
  let depth = 0;
  let at = -1;
  for (let i = 0; i < email.length; i++) {
    const code = email.charCodeAt(i);
    if (state === NORMAL) {
      if (code === 64 /* @ */) {
        at = i;
        wordStart = true;
        domainStart = true;
      } else if (code === 40 /* ( */ && rules.comments) {
        state = COMMENT;
        depth = 1;
      } else if (!isWhitespace(code)) {
        if (code === 34 /* " */ && rules.quotes && wordStart) {
          state = QUOTED;
        } else if (code === 91 /* [ */ && rules.literals && domainStart) {
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
      }
    } else if (code === (state === QUOTED ? 34 : 93) /* " or ] */) {
      state = NORMAL;
    }
  }
  return at;
}

/**
 * Parses `email` under `rules`.
 *
 * @throws TypeError when `email` isn't a string.
 */
export function parse(
  email: string,
  rules: Readonly<Rules>,
): Result<ParsedAddress> {
  if (typeof email !== 'string') {
    throw new TypeError(`Expected a string, got ${typeof email}`);
  }
  if (email === '') {
    return fail('syntax.address.empty');
  }
  const at = findAt(email, rules);
  if (at < 0) {
    return fail('syntax.address.no_at');
  }
  const comments: AddressComment[] = [];
  const local = scanLocal(email, at, rules, comments);
  if (typeof local !== 'string') {
    return local;
  }
  // RFC 6531 keeps the caps in octets, and DNS counts a domain's A-labels.
  const localSize = rules.unicode ? utf8Length(local) : local.length;
  if (localSize > rules.localCap) {
    return fail('syntax.local.too_long');
  }
  const domain = scanDomain(email, at, rules, comments);
  if ('reason' in domain) {
    return domain;
  }
  if (domain.size > rules.domainCap) {
    return fail('syntax.domain.too_long');
  }
  if (localSize + 1 + domain.size > 254) {
    return fail('syntax.address.too_long');
  }
  const { tld } = domain;
  if (tld === undefined && !domain.literal && !rules.allowNoTld) {
    return fail('syntax.domain.no_dot');
  }
  if (tld !== undefined && rules.checkTld && !isKnownTld(tld)) {
    return fail('syntax.tld.unknown');
  }
  return {
    ok: true,
    value:
      tld === undefined
        ? { local, domain: domain.domain, comments }
        : { local, domain: domain.domain, tld, comments },
  };
}

/**
 * Scans the local part, `email` up to `at`, and returns it without comments
 * or folding whitespace.
 */
function scanLocal(
  email: string,
  at: number,
  rules: Readonly<Rules>,
  comments: AddressComment[],
): string | Failure {
  let local = '';
  let words = 0;
  // The last token was a word, so a dot or the end comes next.
  let afterWord = false;
  // An rfc5321 quoted string, which must be the whole local part.
  let closed = false;
  // The dot a word should follow next, or -1.
  let dot = -1;
  // The first whitespace since the last word, or -1.
  let space = -1;
  // A comment after a word where only the end may follow it, or -1.
  let edge = -1;
  // Comments from here on have no word after them.
  let trailing = comments.length;

  let i = 0;
  while (i < at) {
    const code = email.charCodeAt(i);
    const quote = code === 34 && rules.quotes && (rules.obs || i === 0);
    const atom = inClass(code, rules.local);
    if (quote || atom || (rules.unicode && nonAsciiAt(email, i, at) > 0)) {
      if (edge >= 0) {
        return fail('syntax.comment.not_allowed', edge);
      }
      if (afterWord) {
        return space >= 0
          ? fail('syntax.local.unquoted_space', space)
          : fail('syntax.local.invalid_char', i);
      }
      let next: number;
      if (quote) {
        next = skipQuoted(email, i, at, rules.obs, rules.unicode);
        if (next < 0) {
          return fail('syntax.local.invalid_char', -1 - next);
        }
        closed = !rules.obs;
      } else {
        next = atom ? i + 1 : i;
        while (next < at && inClass(email.charCodeAt(next), rules.local)) {
          next++;
        }
        if (rules.unicode) {
          next = skipUnicode(email, next, at, rules.local);
        }
      }
      local += unfold(email.slice(i, next));
      words++;
      afterWord = true;
      dot = -1;
      space = -1;
      trailing = comments.length;
      i = next;
    } else if (code === 46 /* . */) {
      if (edge >= 0) {
        return fail('syntax.comment.not_allowed', edge);
      }
      if (!afterWord || closed) {
        return dot >= 0
          ? fail('syntax.local.consecutive_dots', i)
          : fail('syntax.local.invalid_char', i);
      }
      local += '.';
      afterWord = false;
      dot = i;
      space = -1;
      i++;
    } else if (code === 40 /* ( */ && rules.comments) {
      if (!rules.obs && words > 0) {
        // Without the obsolete syntax, comments sit only at the ends.
        if (!afterWord) {
          return fail('syntax.comment.not_allowed', i);
        }
        edge = edge < 0 ? i : edge;
      }
      const next = skipComment(email, i, at, rules.unicode);
      if (next < 0) {
        return fail('syntax.local.invalid_char', -1 - next);
      }
      comments.push({
        text: email.slice(i + 1, next - 1),
        position: words === 0 ? 'before-local' : 'inside-local',
      });
      i = next;
    } else if (code === 40) {
      return fail('syntax.comment.not_allowed', i);
    } else if (rules.obs && isWhitespace(code)) {
      const next = skipSpace(email, i, at);
      if (next < 0) {
        return fail('syntax.local.invalid_char', i);
      }
      space = space < 0 ? i : space;
      i = next;
    } else {
      return code === 32
        ? fail('syntax.local.unquoted_space', i)
        : fail('syntax.local.invalid_char', i);
    }
  }

  if (words === 0) {
    return fail('syntax.local.empty');
  }
  if (dot >= 0) {
    return fail('syntax.local.invalid_char', dot);
  }
  settle(comments, trailing, 'after-local');
  return local;
}

interface Domain {
  domain: string;
  tld?: string;
  literal: boolean;
  /** The domain's length with its U-labels as A-labels. */
  size: number;
}

/**
 * Scans the domain, `email` after `at`, and returns it without comments or
 * folding whitespace.
 */
function scanDomain(
  email: string,
  at: number,
  rules: Readonly<Rules>,
  comments: AddressComment[],
): Domain | Failure {
  const end = email.length;
  let domain = '';
  let labels = 0;
  let afterLabel = false;
  let literal = false;
  let dot = -1;
  let space = -1;
  let edge = -1;
  let trailing = comments.length;
  let tld = '';
  // What converting the U-labels to A-labels adds to the length.
  let growth = 0;

  let i = at + 1;
  while (i < end) {
    const code = email.charCodeAt(i);
    const opensLiteral = code === 91 && rules.literals && labels === 0;
    const ldh = inClass(code, rules.domain);
    if (opensLiteral || ldh || (rules.idn && nonAsciiAt(email, i, end) > 0)) {
      if (edge >= 0) {
        return fail('syntax.comment.not_allowed', edge);
      }
      if (afterLabel) {
        return fail('syntax.domain.invalid_char', space >= 0 ? space : i);
      }
      let next: number;
      if (opensLiteral) {
        next = rules.obs
          ? skipLiteral(email, i, end)
          : skipAddressLiteral(email, i, end);
        if (next < 0) {
          return fail('syntax.domain.literal_invalid', i);
        }
        literal = true;
      } else {
        next = ldh ? i + 1 : i;
        while (next < end && inClass(email.charCodeAt(next), rules.domain)) {
          next++;
        }
        const ascii = next;
        if (rules.idn) {
          next = skipUnicode(email, next, end, rules.domain);
        }
        let size = next - i;
        // The ASCII run stopped short, so the label is a U-label.
        if (next > ascii) {
          const aLabel = toALabel(email.slice(i, next));
          if (aLabel === undefined) {
            return fail('syntax.domain.label_invalid', i);
          }
          size = aLabel.length;
          growth += size - (next - i);
        }
        const bad = checkLabel(email, i, next, size);
        if (bad >= 0) {
          return fail('syntax.domain.label_invalid', bad);
        }
      }
      tld = unfold(email.slice(i, next));
      domain += tld;
      labels++;
      afterLabel = true;
      dot = -1;
      space = -1;
      trailing = comments.length;
      i = next;
    } else if (code === 46 /* . */) {
      if (edge >= 0) {
        return fail('syntax.comment.not_allowed', edge);
      }
      if (!afterLabel || literal) {
        return literal
          ? fail('syntax.domain.invalid_char', i)
          : fail('syntax.domain.label_invalid', i);
      }
      domain += '.';
      afterLabel = false;
      dot = i;
      space = -1;
      i++;
    } else if (code === 40 /* ( */ && rules.comments) {
      if (!rules.obs && labels > 0) {
        if (!afterLabel) {
          return fail('syntax.comment.not_allowed', i);
        }
        edge = edge < 0 ? i : edge;
      }
      const next = skipComment(email, i, end, rules.unicode);
      if (next < 0) {
        return -1 - next === i
          ? fail('syntax.comment.unterminated', i)
          : fail('syntax.domain.invalid_char', -1 - next);
      }
      comments.push({
        text: email.slice(i + 1, next - 1),
        position: labels === 0 ? 'before-domain' : 'inside-domain',
      });
      i = next;
    } else if (code === 40) {
      return fail('syntax.comment.not_allowed', i);
    } else if (rules.obs && isWhitespace(code)) {
      const next = skipSpace(email, i, end);
      if (next < 0) {
        return fail('syntax.domain.invalid_char', i);
      }
      space = space < 0 ? i : space;
      i = next;
    } else {
      return fail('syntax.domain.invalid_char', i);
    }
  }

  if (labels === 0) {
    return fail('syntax.domain.empty');
  }
  if (dot >= 0) {
    return fail('syntax.domain.label_invalid', dot);
  }
  settle(comments, trailing, 'after-domain');
  const size = domain.length + growth;
  return literal || labels === 1
    ? { domain, literal, size }
    : { domain, tld, literal, size };
}

/**
 * Carries an atom or label on from `i`, where its ASCII run stopped, through
 * any non-ASCII characters and the class-`flag` characters after them.
 */
function skipUnicode(
  email: string,
  i: number,
  end: number,
  flag: number,
): number {
  let width = i < end ? nonAsciiAt(email, i, end) : 0;
  while (width > 0) {
    i += width;
    while (i < end && inClass(email.charCodeAt(i), flag)) {
      i++;
    }
    width = i < end ? nonAsciiAt(email, i, end) : 0;
  }
  return i;
}

/**
 * Checks the hostname label from `start` to `end`, `size` characters long as
 * an A-label: returns the index of a leading or trailing hyphen, the start of
 * a label over 63 characters, or -1.
 */
function checkLabel(
  email: string,
  start: number,
  end: number,
  size: number,
): number {
  if (email.charCodeAt(start) === 45 /* - */) {
    return start;
  }
  if (size > 63) {
    return start;
  }
  return email.charCodeAt(end - 1) === 45 ? end - 1 : -1;
}

/** Marks the comments from `from` on, which no word follows, as trailing. */
function settle(
  comments: AddressComment[],
  from: number,
  position: 'after-local' | 'after-domain',
): void {
  for (let c = from; c < comments.length; c++) {
    const comment = comments[c]!;
    if (comment.position.startsWith('inside')) {
      comment.position = position;
    }
  }
}

/** Removes the CRLFs of folding whitespace, keeping the space or tab after. */
function unfold(text: string): string {
  return text.includes('\r') ? text.replaceAll('\r\n', '') : text;
}

// The skip functions below return the index after what they scanned, or
// `-1 - j` for the first character `j` that breaks it.

/**
 * Skips one character of folding whitespace: a space, a tab, or a CRLF with
 * a space or tab after it. A lone CR or LF breaks it.
 */
function skipSpace(email: string, i: number, end: number): number {
  const code = email.charCodeAt(i);
  if (code === 32 || code === 9) {
    return i + 1;
  }
  return code === 13 &&
    i + 2 < end &&
    email.charCodeAt(i + 1) === 10 &&
    (email.charCodeAt(i + 2) === 32 || email.charCodeAt(i + 2) === 9)
    ? i + 2
    : -1 - i;
}

/** Whether a backslash may escape `code`: any ASCII with `obs`, else VCHAR and space. */
function escapable(code: number, obs: boolean): boolean {
  return obs ? code < 128 : code >= 32 && code <= 126;
}

/**
 * Skips the quoted string opening at `open`. `obs` allows folding whitespace
 * and control characters other than NUL; without it, the string follows
 * RFC 5321: printable ASCII and spaces only. `unicode` adds non-ASCII.
 */
function skipQuoted(
  email: string,
  open: number,
  end: number,
  obs: boolean,
  unicode: boolean,
): number {
  let i = open + 1;
  while (i < end) {
    const code = email.charCodeAt(i);
    if (code === 34) {
      return i + 1;
    }
    if (code === 92) {
      if (!escapable(email.charCodeAt(i + 1), obs)) {
        return -2 - i;
      }
      i += 2;
    } else if (obs && isWhitespace(code)) {
      i = skipSpace(email, i, end);
      if (i < 0) {
        return i;
      }
    } else if (obs ? code === 0 || code > 127 : code < 32 || code > 126) {
      const width = unicode ? nonAsciiAt(email, i, end) : 0;
      if (width === 0) {
        return -1 - i;
      }
      i += width;
    } else {
      i++;
    }
  }
  // findAt only splits after a quoted string that closes.
  return -1 - open;
}

/**
 * Skips the comment opening at `open`, nested comments included. Its text
 * may hold any ASCII but NUL, with folding whitespace, and non-ASCII with
 * `unicode`; returns `-1 - open` when it never closes.
 */
function skipComment(
  email: string,
  open: number,
  end: number,
  unicode: boolean,
): number {
  let depth = 1;
  let i = open + 1;
  while (i < end) {
    const code = email.charCodeAt(i);
    if (code === 40 /* ( */ || code === 41 /* ) */) {
      depth += code === 40 ? 1 : -1;
      i++;
      if (depth === 0) {
        return i;
      }
    } else if (code === 92) {
      if (i + 1 >= end) {
        break;
      }
      if (!escapable(email.charCodeAt(i + 1), true)) {
        return -2 - i;
      }
      i += 2;
    } else if (isWhitespace(code)) {
      i = skipSpace(email, i, end);
      if (i < 0) {
        return i;
      }
    } else if (code === 0 || code > 127) {
      const width = unicode ? nonAsciiAt(email, i, end) : 0;
      if (width === 0) {
        return -1 - i;
      }
      i += width;
    } else {
      i++;
    }
  }
  return -1 - open;
}

/**
 * Skips the RFC 5322 domain literal opening at `open`: any ASCII but NUL,
 * `[`, and `]`, with escapes and folding whitespace. Returns -1 when it's
 * malformed or never closes.
 */
function skipLiteral(email: string, open: number, end: number): number {
  let i = open + 1;
  while (i < end) {
    const code = email.charCodeAt(i);
    if (code === 93 /* ] */) {
      return i + 1;
    }
    if (code === 92) {
      if (i + 1 >= end || !escapable(email.charCodeAt(i + 1), true)) {
        return -1;
      }
      i += 2;
    } else if (isWhitespace(code)) {
      i = skipSpace(email, i, end);
      if (i < 0) {
        return -1;
      }
    } else if (code === 0 || code === 91 || code > 127) {
      return -1;
    } else {
      i++;
    }
  }
  return -1;
}

/**
 * Skips the RFC 5321 address literal opening at `open`: an IPv4 address or
 * `IPv6:` and an IPv6 address. Returns -1 for anything else.
 */
function skipAddressLiteral(email: string, open: number, end: number): number {
  const close = email.indexOf(']', open + 1);
  return close >= 0 &&
    close < end &&
    isAddressLiteral(email.slice(open + 1, close))
    ? close + 1
    : -1;
}
