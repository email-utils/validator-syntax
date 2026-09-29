// Character classes as bit flags over ASCII, so each preset names the class
// its atoms and labels are made of and the scanner tests one table entry.

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
    table[chars.charCodeAt(i)]! |= flag;
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
