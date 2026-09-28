import { describe, expect, it } from 'vitest';
import { type Expected, presets, syntaxFixtures } from '../src/fixtures';
import { grammars, splitAddress } from '../src/parse';

// The codes the split decides on its own. Every other code comes from the
// presets' rules, which run after it (validator-syntax#10, #11, #12).
const structural = new Set<string>([
  'syntax.address.empty',
  'syntax.address.no_at',
  'syntax.local.empty',
  'syntax.domain.empty',
  'syntax.comment.not_allowed',
  'syntax.comment.unterminated',
]);

const rfc5322 = grammars.rfc5322;
const practical = grammars.practical;

const cases = syntaxFixtures.flatMap(({ address, expected }) =>
  presets.map((preset) => ({ address, preset, want: expected[preset] })),
);

/** The result without its message, which isn't part of the contract. */
function outcome(result: ReturnType<typeof splitAddress>): Expected {
  if (result.ok) {
    return { ok: true };
  }
  const { reason, index } = result;
  return index === undefined
    ? { ok: false, reason }
    : { ok: false, reason, index };
}

describe('corpus', () => {
  it.each(cases.filter(({ want }) => want.ok))(
    'splits $address under $preset',
    ({ address, preset }) => {
      expect(splitAddress(address, grammars[preset]).ok).toBe(true);
    },
  );

  it.each(cases.filter(({ want }) => !want.ok && structural.has(want.reason)))(
    'fails $address under $preset',
    ({ address, preset, want }) => {
      expect(outcome(splitAddress(address, grammars[preset]))).toEqual(want);
    },
  );

  // A later rule fails these first, so the split mustn't give up on the
  // address as a whole.
  it.each(cases.filter(({ want }) => !want.ok && !structural.has(want.reason)))(
    'finds an @ in $address under $preset',
    ({ address, preset }) => {
      const result = splitAddress(address, grammars[preset]);
      expect(result.ok || !result.reason.startsWith('syntax.address.')).toBe(
        true,
      );
    },
  );
});

describe('splitAddress', () => {
  it('throws TypeError on non-string input', () => {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    expect(() => splitAddress(1 as unknown as string, practical)).toThrow(
      TypeError,
    );
  });

  it('splits on the last @, not the first', () => {
    expect(splitAddress('"a@b"@example.com', practical)).toEqual({
      ok: true,
      value: {
        local: '"a@b"',
        domain: 'example.com',
        tld: 'com',
        comments: [],
      },
    });
  });

  it('ignores an @ inside a quoted string', () => {
    expect(splitAddress('"john@doe"@x.com', rfc5322)).toMatchObject({
      ok: true,
      value: { local: '"john@doe"', domain: 'x.com' },
    });
    expect(splitAddress('"a@b', rfc5322)).toEqual({
      ok: false,
      reason: 'syntax.address.no_at',
    });
  });

  it('treats an escaped quote as part of the quoted string', () => {
    expect(splitAddress('"a\\"@b"@x.com', rfc5322)).toMatchObject({
      ok: true,
      value: { local: '"a\\"@b"', domain: 'x.com' },
    });
  });

  it('opens a quoted string only at the start of a word', () => {
    expect(splitAddress('a"b@x.com', rfc5322)).toMatchObject({
      ok: true,
      value: { local: 'a"b', domain: 'x.com' },
    });
    expect(splitAddress('a."b@c".d@x.com', rfc5322)).toMatchObject({
      ok: true,
      value: { local: 'a."b@c".d', domain: 'x.com' },
    });
  });

  it('ignores an @ inside a domain literal', () => {
    expect(splitAddress('a@[b@c]', rfc5322)).toEqual({
      ok: true,
      value: { local: 'a', domain: '[b@c]', comments: [] },
    });
    expect(splitAddress('a@[b@c]', practical)).toMatchObject({
      ok: true,
      value: { local: 'a@[b', domain: 'c]' },
    });
  });

  it('gives no TLD for a literal, a dotless domain, or a trailing dot', () => {
    for (const address of ['a@[192.0.2.1]', 'a@localhost', 'a@example.']) {
      const result = splitAddress(address, rfc5322);
      expect(result.ok && 'tld' in result.value).toBe(false);
    }
  });

  it('lifts comments out, with where each one sat', () => {
    expect(splitAddress('(a)x.(b)y(c)@(d)ex.(e)com (f)', rfc5322)).toEqual({
      ok: true,
      value: {
        local: 'x.y',
        domain: 'ex.com ',
        tld: 'com ',
        comments: [
          { text: 'a', position: 'before-local' },
          { text: 'b', position: 'inside-local' },
          { text: 'c', position: 'after-local' },
          { text: 'd', position: 'before-domain' },
          { text: 'e', position: 'inside-domain' },
          { text: 'f', position: 'after-domain' },
        ],
      },
    });
  });

  it('keeps nested comments and escapes whole', () => {
    expect(splitAddress('(a(b)\\))x@y.z', rfc5322)).toMatchObject({
      ok: true,
      value: {
        local: 'x',
        comments: [{ text: 'a(b)\\)', position: 'before-local' }],
      },
    });
  });

  it('fails an empty part once its comments are cut', () => {
    expect(splitAddress('(a)@x.com', rfc5322)).toEqual({
      ok: false,
      reason: 'syntax.local.empty',
    });
    expect(splitAddress('a@(b)', rfc5322)).toEqual({
      ok: false,
      reason: 'syntax.domain.empty',
    });
  });

  it('checks the local part before the domain', () => {
    expect(splitAddress('a(b@(c', practical)).toMatchObject({
      reason: 'syntax.comment.not_allowed',
      index: 1,
    });
    expect(splitAddress('a@b(c', practical)).toMatchObject({
      reason: 'syntax.comment.not_allowed',
      index: 3,
    });
    expect(splitAddress('a(b@', practical)).toMatchObject({
      reason: 'syntax.comment.not_allowed',
      index: 1,
    });
  });
});
