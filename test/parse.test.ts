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

    it.each([
      ['a tab', 'a\t"b"@x.com'],
      ['a folded line', 'a\r\n "b"@x.com'],
    ])('points %s between words at its first character', (_, address) => {
      expect(parseAddress(address, rfc5322)).toMatchObject({
        reason: 'syntax.local.unquoted_space',
        message: 'The local part has whitespace outside quotes',
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
    ['Unicode under html5', { preset: 'html5', allowUnicode: true }],
    ['IDNs under html5', { preset: 'html5', allowIdn: true }],
    ['IP literals under html5', { preset: 'html5', allowIpLiteral: true }],
  ])('throws TypeError on %s', (_, options) => {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    expect(() => parseAddress('a@x.com', options as never)).toThrow(TypeError);
  });

  it('accepts the overrides as false under html5', () => {
    expect(
      parseAddress('a@x.com', {
        ...html5,
        allowComments: false,
        allowUnicode: false,
        allowIdn: false,
        allowIpLiteral: false,
      }).ok,
    ).toBe(true);
  });
});

describe('allowUnicode', () => {
  const unicode = { allowUnicode: true };

  it('accepts non-ASCII atoms, surrogate pairs included', () => {
    expect(parseAddress('用户@example.com')).toMatchObject({
      reason: 'syntax.local.invalid_char',
      index: 0,
    });
    for (const address of [
      '用户@example.com',
      'I❤️CHOCOLATE@example.com',
      'josé.garcía@example.com',
      '😀@example.com',
    ]) {
      expect(parseAddress(address, unicode)).toMatchObject({
        ok: true,
        value: { local: address.slice(0, address.indexOf('@')) },
      });
    }
  });

  it('fails a lone surrogate', () => {
    for (const [address, index] of [
      ['\uD800a@x.com', 0],
      ['a\uDC00@x.com', 1],
      ['a\uD83D@x.com', 1],
    ] as const) {
      expect(parseAddress(address, unicode)).toMatchObject({
        reason: 'syntax.local.invalid_char',
        index,
      });
    }
  });

  it('accepts non-ASCII in quoted strings and comments', () => {
    expect(
      parseAddress('"用 户"@example.com', { ...rfc5321, ...unicode }).ok,
    ).toBe(true);
    expect(parseAddress('"用 户"@example.com', rfc5321)).toMatchObject({
      reason: 'syntax.local.invalid_char',
      index: 1,
    });
    expect(
      parseAddress('(注)a@x.com(注)', { ...rfc5322, ...unicode }),
    ).toMatchObject({
      ok: true,
      value: {
        comments: [
          { text: '注', position: 'before-local' },
          { text: '注', position: 'after-domain' },
        ],
      },
    });
    expect(parseAddress('(注)a@x.com', rfc5322)).toMatchObject({
      reason: 'syntax.local.invalid_char',
      index: 1,
    });
  });

  it('caps the local part at 64 UTF-8 octets', () => {
    // 用 is 3 octets and é is 2.
    expect(parseAddress(`${'用'.repeat(21)}@x.com`, unicode).ok).toBe(true);
    expect(parseAddress(`${'用'.repeat(22)}@x.com`, unicode)).toMatchObject({
      reason: 'syntax.local.too_long',
    });
    expect(parseAddress(`${'é'.repeat(32)}@x.com`, unicode).ok).toBe(true);
    expect(parseAddress(`${'é'.repeat(33)}@x.com`, unicode)).toMatchObject({
      reason: 'syntax.local.too_long',
    });
  });

  it('caps the address at 254 octets', () => {
    // A 195-character domain leaves 58 octets for the local part: 29 é's,
    // which would be 29 characters.
    const domain = `${'a'.repeat(63)}.${'b'.repeat(63)}.${'c'.repeat(63)}.com`;
    expect(parseAddress(`${'é'.repeat(29)}@${domain}`, unicode).ok).toBe(true);
    expect(parseAddress(`${'é'.repeat(29)}x@${domain}`, unicode)).toMatchObject(
      { reason: 'syntax.address.too_long' },
    );
  });

  it('leaves the domain ASCII', () => {
    expect(parseAddress('a@bücher.de', unicode)).toMatchObject({
      reason: 'syntax.domain.invalid_char',
      index: 3,
    });
  });
});

describe('allowIdn', () => {
  const idn = { allowIdn: true };

  it('accepts U-labels, keeping them as written', () => {
    expect(parseAddress('ada@bücher.de')).toMatchObject({
      reason: 'syntax.domain.invalid_char',
      index: 5,
    });
    expect(parseAddress('ada@Bücher.de', idn)).toEqual({
      ok: true,
      value: { local: 'ada', domain: 'Bücher.de', tld: 'de', comments: [] },
    });
    expect(parseAddress('ada@例え.jp', idn).ok).toBe(true);
  });

  it('checks a U-label TLD against the IANA set', () => {
    expect(parseAddress('ada@пример.рф', idn)).toMatchObject({
      ok: true,
      value: { tld: 'рф' },
    });
    expect(parseAddress('ada@пример.РФ', idn).ok).toBe(true);
    expect(parseAddress('ada@example.ёжик', idn)).toMatchObject({
      reason: 'syntax.tld.unknown',
    });
  });

  it.each([
    ['a zero-width joiner out of context', 'a@x\u200Dy.com', 2],
    ['a right-to-left label mixed with Latin', 'a@باa.com', 2],
    ['fullwidth letters, which map to ASCII', 'a@ｅｘａｍｐｌｅ.com', 2],
    ['an ideographic full stop, which maps to a dot', 'a@x。y.com', 2],
    ['a leading hyphen', 'a@-ü.de', 2],
    ['a trailing hyphen', 'a@ü-.de', 3],
    ['ASCII outside LDH in rfc5322', 'a@ü$.de', 2],
  ])('fails %s', (_, address, index) => {
    expect(
      parseAddress(address, { ...rfc5322, ...idn, allowComments: false }),
    ).toMatchObject({ reason: 'syntax.domain.label_invalid', index });
  });

  it('caps a label at 63 characters as an A-label', () => {
    // 57 ü's make a 63-character A-label, and 58 make 64.
    expect(parseAddress(`a@${'ü'.repeat(57)}.de`, idn).ok).toBe(true);
    expect(parseAddress(`a@${'ü'.repeat(58)}.de`, idn)).toMatchObject({
      reason: 'syntax.domain.label_invalid',
      index: 2,
    });
  });

  it('caps the domain at 253 characters as A-labels', () => {
    // 252 characters as written, but bücher is xn--bcher-kva, 7 longer.
    const labels = `${'a'.repeat(63)}.${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(50)}`;
    expect(parseAddress(`a@${labels}.bucher.de`, idn).ok).toBe(true);
    expect(parseAddress(`a@${labels}.bücher.de`, idn)).toMatchObject({
      reason: 'syntax.domain.too_long',
    });
  });

  it('leaves the local part ASCII', () => {
    expect(parseAddress('用户@example.com', idn)).toMatchObject({
      reason: 'syntax.local.invalid_char',
      index: 0,
    });
  });
});

describe('allowIpLiteral', () => {
  it('adds address literals to practical', () => {
    const options = { allowIpLiteral: true };
    expect(parseAddress('a@[192.0.2.1]')).toMatchObject({
      reason: 'syntax.domain.invalid_char',
      index: 2,
    });
    expect(parseAddress('a@[192.0.2.1]', options)).toEqual({
      ok: true,
      value: { local: 'a', domain: '[192.0.2.1]', comments: [] },
    });
    expect(parseAddress('a@[IPv6:2001:db8::1]', options).ok).toBe(true);
    expect(parseAddress('a@[example]', options)).toMatchObject({
      reason: 'syntax.domain.literal_invalid',
      index: 2,
    });
  });

  it('turns literals off in the RFC presets', () => {
    for (const preset of [rfc5321, rfc5322]) {
      expect(parseAddress('a@[192.0.2.1]', preset).ok).toBe(true);
      expect(
        parseAddress('a@[192.0.2.1]', { ...preset, allowIpLiteral: false }),
      ).toMatchObject({ reason: 'syntax.domain.invalid_char', index: 2 });
    }
  });
});
