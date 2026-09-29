// What parseAddress returns beyond the corpus, which records only whether
// each address passes and why not: the parsed value, and the rules the
// corpus has no fixture for. corpus.test.ts runs the corpus itself.
import { describe, expect, it } from 'vitest';
import { parseAddress } from '../src';

const rfc5321 = { preset: 'rfc5321' } as const;
const rfc5322 = { preset: 'rfc5322' } as const;
const html5 = { preset: 'html5' } as const;

describe('parseAddress', () => {
  it('throws TypeError on non-string input', () => {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    expect(() => parseAddress(1 as unknown as string)).toThrow(TypeError);
  });

  it('returns the parts, with the TLD as written', () => {
    expect(parseAddress('Ada.Lovelace@Example.CO.UK')).toEqual({
      ok: true,
      value: {
        local: 'Ada.Lovelace',
        domain: 'Example.CO.UK',
        tld: 'UK',
        comments: [],
      },
    });
  });

  it('gives a message with every failure', () => {
    expect(parseAddress('ada@example..com')).toEqual({
      ok: false,
      reason: 'syntax.domain.label_invalid',
      message: expect.any(String),
      index: 12,
    });
  });

  it('splits on the last @, not the first', () => {
    expect(parseAddress('"a@b"@example.com', rfc5321)).toMatchObject({
      ok: true,
      value: { local: '"a@b"', domain: 'example.com' },
    });
  });

  it('keeps a quoted local part with its quotes and escapes', () => {
    expect(parseAddress('"a\\"b c"@x.com', rfc5321)).toMatchObject({
      value: { local: '"a\\"b c"' },
    });
  });

  it('gives no TLD for a literal or a dotless domain', () => {
    expect(parseAddress('a@[192.0.2.1]', rfc5321)).toEqual({
      ok: true,
      value: { local: 'a', domain: '[192.0.2.1]', comments: [] },
    });
    expect(parseAddress('a@localhost', html5)).toEqual({
      ok: true,
      value: { local: 'a', domain: 'localhost', comments: [] },
    });
  });

  it('lifts comments out, with where each one sat', () => {
    expect(parseAddress('(a)x.(b)y(c)@(d)ex.(e)com (f)', rfc5322)).toEqual({
      ok: true,
      value: {
        local: 'x.y',
        domain: 'ex.com',
        tld: 'com',
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
    expect(parseAddress('(a(b)\\))x@y.com', rfc5322)).toMatchObject({
      value: { local: 'x', comments: [{ text: 'a(b)\\)' }] },
    });
  });

  it('drops folding whitespace, and unfolds it inside quotes and literals', () => {
    expect(
      parseAddress(' a .\r\n "b\r\n c" @ [x\r\n y] ', rfc5322),
    ).toMatchObject({
      ok: true,
      value: { local: 'a."b c"', domain: '[x y]' },
    });
  });

  it('fails an empty part once its comments are cut', () => {
    expect(parseAddress('(a)@x.com', rfc5322)).toMatchObject({
      reason: 'syntax.local.empty',
    });
    expect(parseAddress('a@(b)', rfc5322)).toMatchObject({
      reason: 'syntax.domain.empty',
    });
  });

  it('checks the local part before a disallowed comment in the domain', () => {
    expect(parseAddress('a"b@c(d')).toMatchObject({
      reason: 'syntax.local.invalid_char',
      index: 1,
    });
    expect(parseAddress('a@b(c')).toMatchObject({
      reason: 'syntax.comment.not_allowed',
      index: 3,
    });
  });

  describe('rfc5322', () => {
    it('points an unquoted space between words at the space', () => {
      expect(parseAddress('a "b"@x.com', rfc5322)).toMatchObject({
        reason: 'syntax.local.unquoted_space',
        index: 1,
      });
    });

    it('points whitespace between domain labels at the whitespace', () => {
      expect(parseAddress('a@b c.com', rfc5322)).toMatchObject({
        reason: 'syntax.domain.invalid_char',
        index: 3,
      });
    });

    it('allows only whitespace and comments after a domain literal', () => {
      expect(parseAddress('a@[x].com', rfc5322)).toMatchObject({
        reason: 'syntax.domain.invalid_char',
        index: 5,
      });
    });

    it('fails a bad character inside a domain comment', () => {
      expect(parseAddress('a@x.com(\0)', rfc5322)).toMatchObject({
        reason: 'syntax.domain.invalid_char',
        index: 8,
      });
      expect(parseAddress('a@x.com(\\é)', rfc5322)).toMatchObject({
        reason: 'syntax.domain.invalid_char',
        index: 9,
      });
    });

    it('fails a literal with a bad character, escape, or fold', () => {
      for (const literal of ['[a\0]', '[a\\é]', '[a\r\nb]', '[a\\']) {
        expect(parseAddress(`a@${literal}`, rfc5322)).toMatchObject({
          reason: 'syntax.domain.literal_invalid',
          index: 2,
        });
      }
    });

    it('fails a quoted string with a fold that nothing follows', () => {
      expect(parseAddress('"a\r\nb"@x.com', rfc5322)).toMatchObject({
        reason: 'syntax.local.invalid_char',
        index: 2,
      });
    });
  });

  describe('hostname labels', () => {
    it('accepts a 63-character label and fails a 64-character one', () => {
      const label = 'a'.repeat(63);
      expect(parseAddress(`a@${label}.com`).ok).toBe(true);
      expect(parseAddress(`a@${label}b.com`)).toMatchObject({
        reason: 'syntax.domain.label_invalid',
        index: 2,
      });
    });

    it('fails a dot after a literal', () => {
      expect(parseAddress('a@[192.0.2.1].com', rfc5321)).toMatchObject({
        reason: 'syntax.domain.invalid_char',
        index: 13,
      });
    });

    it('fails an unclosed address literal', () => {
      expect(parseAddress('a@[192.0.2.1', rfc5321)).toMatchObject({
        reason: 'syntax.domain.literal_invalid',
        index: 2,
      });
    });
  });
});

describe('options', () => {
  it('turns the TLD check off', () => {
    expect(parseAddress('a@example.invalidtld').ok).toBe(false);
    expect(parseAddress('a@example.invalidtld', { checkTld: false }).ok).toBe(
      true,
    );
    expect(
      parseAddress('a@example.invalidtld', {
        preset: 'rfc5321',
        checkTld: true,
      }).ok,
    ).toBe(false);
  });

  it('knows an IDN TLD by its A-label', () => {
    expect(parseAddress('user@example.xn--p1ai')).toMatchObject({
      ok: true,
      value: { domain: 'example.xn--p1ai', tld: 'xn--p1ai' },
    });
    expect(parseAddress('user@EXAMPLE.XN--P1AI').ok).toBe(true);
  });

  it('allows a dotless domain, which then has no TLD to check', () => {
    expect(parseAddress('a@localhost', { allowNoTld: true })).toMatchObject({
      ok: true,
      value: { domain: 'localhost' },
    });
    expect(
      parseAddress('a@localhost', { ...html5, allowNoTld: false }),
    ).toMatchObject({ reason: 'syntax.domain.no_dot' });
  });

  it('allows comments in practical only at the ends of each part', () => {
    const options = { allowComments: true };
    expect(parseAddress('(a)x.y(b)@(c)ex.com(d)', options)).toMatchObject({
      ok: true,
      value: { local: 'x.y', domain: 'ex.com' },
    });
    for (const [address, index] of [
      ['x.(a)y@ex.com', 2],
      ['x(a).y@ex.com', 1],
      ['x(a)y@ex.com', 1],
      ['x@ex.(a)com', 5],
      ['x@ex(a).com', 4],
      ['x@ex(a)com', 4],
    ] as const) {
      expect(parseAddress(address, options)).toMatchObject({
        reason: 'syntax.comment.not_allowed',
        index,
      });
    }
  });

  it('turns comments off in rfc5322, keeping folding whitespace', () => {
    const options = { ...rfc5322, allowComments: false };
    expect(parseAddress('a (b)@x.com', options)).toMatchObject({
      reason: 'syntax.comment.not_allowed',
      index: 2,
    });
    expect(parseAddress(' a @x.com', options).ok).toBe(true);
  });

  it('treats an undefined override as unset', () => {
    expect(parseAddress('a@x.com', { checkTld: undefined }).ok).toBe(true);
  });

  it.each([
    ['a non-object', 'practical'],
    ['null', null],
    ['an unknown option', { local: { quote: true } }],
    ['an unknown preset', { preset: 'rfc822' }],
    ['a non-boolean override', { checkTld: 'yes' }],
    ['comments under rfc5321', { preset: 'rfc5321', allowComments: true }],
    ['comments under html5', { preset: 'html5', allowComments: true }],
  ])('throws TypeError on %s', (_, options) => {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    expect(() => parseAddress('a@x.com', options as never)).toThrow(TypeError);
  });

  it('accepts allowComments: false under any preset', () => {
    expect(
      parseAddress('a@x.com', { preset: 'html5', allowComments: false }).ok,
    ).toBe(true);
  });
});
