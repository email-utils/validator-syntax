// Character classes as bit flags over ASCII, so each preset names the class
// its atoms and labels are made of and the scanner tests one table entry.

// oxlint-disable-next-line typescript/unbound-method -- only ever called with `.call`
const charCodeAt = String.prototype.charCodeAt;

/**
 * `text.charCodeAt(i)`, through the builtin itself. Called as a method,
 * `charCodeAt` is looked up on the string, and a call site that has seen
 * enough kinds of string (one-byte and two-byte, flat, sliced, and
 * concatenated) goes megamorphic: V8 stops inlining it, and after arbitrary
 * Unicode input every scan ran 2–3× slower (validator-syntax#15).
 */
export function codeAt(text: string, i: number): number {
  return charCodeAt.call(text, i);
}

/** RFC 5322 atext: letters, digits, and ``!#$%&'*+-/=?^_`{|}~``. */
export const ATEXT = 1;
/** atext without the `%` and `!` route characters. */
export const PRACTICAL = 2;
/** The WHATWG `input[type=email]` local part: atext plus `.` anywhere. */
export const HTML5 = 4;
/** A hostname label: letters, digits, and `-`. */
export const LDH = 8;

const table = new Uint8Array(128);

function mark(chars: string, flag: number): void {
  for (let i = 0; i < chars.length; i++) {
    table[codeAt(chars, i)]! |= flag;
  }
}

const alnum = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
mark(alnum + "!#$%&'*+-/=?^_`{|}~", ATEXT);
mark(alnum + "#$&'*+-/=?^_`{|}~", PRACTICAL);
mark(alnum + "!#$%&'*+-/=?^_`{|}~.", HTML5);
mark(alnum + '-', LDH);

/** Whether the character with this code is in the class `flag`. */
export function inClass(code: number, flag: number): boolean {
  return code < 128 && (table[code]! & flag) !== 0;
}

/** Space, tab, CR, and LF: the characters folding whitespace is made of. */
export function isWhitespace(code: number): boolean {
  return code === 32 || code === 9 || code === 13 || code === 10;
}

/**
 * The code units in the non-ASCII code point at `i`, before `end`: 2 for a
 * surrogate pair, 1 for anything else outside ASCII, and 0 for ASCII or a
 * lone surrogate, which no UTF-8 text can hold.
 */
export function nonAsciiAt(text: string, i: number, end: number): number {
  const code = codeAt(text, i);
  if (code < 128 || (code >= 0xdc00 && code <= 0xdfff)) {
    return 0;
  }
  if (code < 0xd800 || code > 0xdbff) {
    return 1;
  }
  const low = i + 1 < end ? codeAt(text, i + 1) : 0;
  return low >= 0xdc00 && low <= 0xdfff ? 2 : 0;
}

/** The length of `text` in UTF-8 octets, the unit RFC 6531 caps a local part in. */
export function utf8Length(text: string): number {
  const end = text.length;
  let octets = end;
  for (let i = 0; i < end; i++) {
    const code = codeAt(text, i);
    // A surrogate pair is 2 units and 4 octets; the rest outside ASCII are
    // 1 unit and 2 or 3 octets.
    if (code >= 0x800 && (code < 0xd800 || code > 0xdfff)) {
      octets += 2;
    } else if (code >= 0x80) {
      octets += 1;
    }
  }
  return octets;
}

/**
 * The code points in `text` from `start` to `end`, which must not split a
 * surrogate pair: its length with each pair counted once.
 */
export function codePoints(text: string, start: number, end: number): number {
  let count = end - start;
  for (let i = start; i < end; i++) {
    const code = codeAt(text, i);
    if (code >= 0xdc00 && code <= 0xdfff) {
      count--;
    }
  }
  return count;
}
