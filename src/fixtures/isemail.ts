// Dominic Sayers' is_email test set, version 3.05, from
// https://github.com/dominicsayers/isemail/blob/e731ebbe49c7c666b4479894ea330acf06cf8b77/test/tests.xml
// with each test's expected result under v1's presets. `isemail` is the
// test's id there. Tests 103 and 122 repeat the addresses of 50 and 7, so
// they're left out. Control characters, which tests.xml writes as the
// U+2400 control pictures, are the real characters here.
//
// Copyright (c) 2016, Dominic Sayers. All rights reserved.
// Used under the BSD 3-Clause License; the full notice is in
// THIRD_PARTY_NOTICES.md.
import {
  type Expected,
  type IsemailFixture,
  type Preset,
  everywhere,
  fail,
  rfc5322Only,
  rfcOnly,
  valid,
} from './types';

/** A domain literal that only rfc5322's dtext accepts. */
const rfc5322Literal: Record<Preset, Expected> = {
  practical: fail('syntax.domain.invalid_char', 5),
  rfc5321: fail('syntax.domain.literal_invalid', 5),
  rfc5322: valid,
  html5: fail('syntax.domain.invalid_char', 5),
};

/** Fails the same way under every preset but rfc5322, which gives `rfc5322`. */
function allBut5322(
  others: Expected,
  rfc5322: Expected,
): Record<Preset, Expected> {
  return { ...everywhere(others), rfc5322 };
}

/** Quote-unaware presets fail at the opening quote; the RFC presets give `rfc`. */
function quotedLocal(rfc: Expected): Record<Preset, Expected> {
  return {
    practical: fail('syntax.local.invalid_char', 0),
    rfc5321: rfc,
    rfc5322: rfc,
    html5: fail('syntax.local.invalid_char', 0),
  };
}

const longLabel =
  'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghikl';

export const isemailFixtures: readonly IsemailFixture[] = [
  // The @ separator and the plain parts.
  {
    isemail: 1,
    address: '',
    description: 'Empty string',
    expected: everywhere(fail('syntax.address.empty')),
  },
  {
    isemail: 2,
    address: 'test',
    description: 'No @',
    expected: everywhere(fail('syntax.address.no_at')),
  },
  {
    isemail: 3,
    address: '@',
    description: 'Only an @',
    expected: everywhere(fail('syntax.local.empty')),
  },
  {
    isemail: 4,
    address: 'test@',
    description: 'Nothing after the @',
    expected: everywhere(fail('syntax.domain.empty')),
  },
  {
    isemail: 5,
    address: 'test@io',
    description: 'Domain with no dot, a real TLD',
    feature: 'dotless-domain',
    expected: { ...everywhere(fail('syntax.domain.no_dot')), html5: valid },
  },
  {
    isemail: 6,
    address: '@io',
    description: 'Nothing before the @, dotless domain',
    expected: everywhere(fail('syntax.local.empty')),
  },
  {
    isemail: 7,
    address: '@iana.org',
    description: 'Nothing before the @',
    expected: everywhere(fail('syntax.local.empty')),
  },
  {
    isemail: 8,
    address: 'test@iana.org',
    description: 'Simple address',
    feature: 'dot-atom',
    expected: everywhere(valid),
  },
  {
    isemail: 9,
    address: 'test@nominet.org.uk',
    description: 'Three-label domain',
    feature: 'dot-atom',
    expected: everywhere(valid),
  },
  {
    isemail: 10,
    address: 'test@about.museum',
    description: 'Six-letter TLD',
    feature: 'dot-atom',
    expected: everywhere(valid),
  },
  {
    isemail: 11,
    address: 'a@iana.org',
    description: 'Single-letter local part',
    feature: 'dot-atom',
    expected: everywhere(valid),
  },
  {
    isemail: 12,
    address: 'test@e.com',
    description: 'Single-letter domain label',
    feature: 'dot-atom',
    expected: everywhere(valid),
  },
  {
    isemail: 13,
    address: 'test@iana.a',
    description: 'Single-letter TLD',
    feature: 'unknown-tld',
    expected: { ...everywhere(valid), practical: fail('syntax.tld.unknown') },
  },
  {
    isemail: 14,
    address: 'test.test@iana.org',
    description: 'Dot in the local part',
    feature: 'dot-atom',
    expected: everywhere(valid),
  },

  // Dots.
  {
    isemail: 15,
    address: '.test@iana.org',
    description: 'Local part starting with a dot',
    feature: 'misplaced-dots',
    expected: {
      ...everywhere(fail('syntax.local.invalid_char', 0)),
      html5: valid,
    },
  },
  {
    isemail: 16,
    address: 'test.@iana.org',
    description: 'Local part ending with a dot',
    feature: 'misplaced-dots',
    expected: {
      ...everywhere(fail('syntax.local.invalid_char', 4)),
      html5: valid,
    },
  },
  {
    isemail: 17,
    address: 'test..iana.org',
    description: 'No @, consecutive dots',
    expected: everywhere(fail('syntax.address.no_at')),
  },
  {
    isemail: 18,
    address: 'test_exa-mple.com',
    description: 'No @, underscore and hyphen',
    expected: everywhere(fail('syntax.address.no_at')),
  },

  // Local-part characters.
  {
    isemail: 19,
    address: '!#$%&`*+/=?^`{|}~@iana.org',
    description: 'Local part of printable specials only',
    feature: 'route-chars',
    expected: {
      ...everywhere(valid),
      practical: fail('syntax.local.invalid_char', 0),
    },
  },
  {
    isemail: 20,
    address: 'test\\@test@iana.org',
    description: 'Backslash-escaped @ outside a quoted string',
    expected: everywhere(fail('syntax.local.invalid_char', 4)),
  },
  {
    isemail: 21,
    address: '123@iana.org',
    description: 'All-digit local part',
    feature: 'dot-atom',
    expected: everywhere(valid),
  },
  {
    isemail: 22,
    address: 'test@123.com',
    description: 'All-digit domain label',
    feature: 'dot-atom',
    expected: everywhere(valid),
  },
  {
    isemail: 23,
    address: 'test@iana.123',
    description: 'All-digit TLD',
    feature: 'unknown-tld',
    expected: { ...everywhere(valid), practical: fail('syntax.tld.unknown') },
  },
  {
    // RFC 5321's grammar reads a dotted quad outside brackets as a domain;
    // only a literal in brackets is an IP address.
    isemail: 24,
    address: 'test@255.255.255.255',
    description: 'Dotted quad without brackets',
    feature: 'unknown-tld',
    expected: { ...everywhere(valid), practical: fail('syntax.tld.unknown') },
  },

  // Lengths.
  {
    isemail: 25,
    address:
      'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghiklm@iana.org',
    description: 'Local part of exactly 64 characters',
    feature: 'dot-atom',
    expected: everywhere(valid),
  },
  {
    isemail: 26,
    address:
      'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghiklmn@iana.org',
    description: 'Local part of 65 characters',
    feature: 'long-local',
    expected: {
      practical: fail('syntax.local.too_long'),
      rfc5321: fail('syntax.local.too_long'),
      rfc5322: valid,
      html5: valid,
    },
  },
  {
    isemail: 27,
    address: `test@${longLabel}.com`,
    description: 'Domain label of exactly 63 characters',
    feature: 'dot-atom',
    expected: everywhere(valid),
  },
  {
    isemail: 28,
    address: `test@${longLabel}m.com`,
    description: 'Domain label of 64 characters',
    expected: everywhere(fail('syntax.domain.label_invalid', 5)),
  },

  // Domain labels.
  {
    isemail: 29,
    address: 'test@mason-dixon.com',
    description: 'Hyphen inside a domain label',
    feature: 'dot-atom',
    expected: everywhere(valid),
  },
  {
    isemail: 30,
    address: 'test@-iana.org',
    description: 'Domain label starting with a hyphen',
    expected: everywhere(fail('syntax.domain.label_invalid', 5)),
  },
  {
    isemail: 31,
    address: 'test@iana-.com',
    description: 'Domain label ending with a hyphen',
    expected: everywhere(fail('syntax.domain.label_invalid', 9)),
  },
  {
    isemail: 32,
    address: 'test@c--n.com',
    description: 'Consecutive hyphens inside a domain label',
    feature: 'dot-atom',
    expected: everywhere(valid),
  },
  {
    isemail: 33,
    address: 'test@iana.co-uk',
    description: 'Hyphenated TLD',
    feature: 'unknown-tld',
    expected: { ...everywhere(valid), practical: fail('syntax.tld.unknown') },
  },
  {
    isemail: 34,
    address: 'test@.iana.org',
    description: 'Domain starting with a dot',
    expected: everywhere(fail('syntax.domain.label_invalid', 5)),
  },
  {
    isemail: 35,
    address: 'test@iana.org.',
    description: 'Domain ending with a dot',
    expected: everywhere(fail('syntax.domain.label_invalid', 13)),
  },
  {
    isemail: 36,
    address: 'test@iana..com',
    description: 'Consecutive dots in the domain',
    expected: everywhere(fail('syntax.domain.label_invalid', 10)),
  },
  {
    isemail: 37,
    address:
      'a@a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p.q.r.s.t.u.v.w.x.y.z.a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p.q.r.s.t.u.v.w.x.y.z.a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p.q.r.s.t.u.v.w.x.y.z.a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p.q.r.s.t.u.v.w.x.y.z.a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p.q.r.s.t.u.v',
    description: '126 single-letter domain labels',
    expected: { ...everywhere(valid), practical: fail('syntax.tld.unknown') },
  },
  {
    isemail: 38,
    address: `abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghiklm@${longLabel}.${longLabel}.abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghi`,
    description: 'Address of exactly 254 characters',
    expected: { ...everywhere(valid), practical: fail('syntax.tld.unknown') },
  },
  {
    isemail: 39,
    address: `abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghiklm@${longLabel}.${longLabel}.abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghij`,
    description: 'Address of 255 characters',
    expected: everywhere(fail('syntax.address.too_long')),
  },
  {
    // html5 has only the address cap, so it reports that instead.
    isemail: 40,
    address: `a@${longLabel}.${longLabel}.${longLabel}.abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefg.hij`,
    description: 'Domain of 255 characters',
    expected: {
      ...everywhere(fail('syntax.domain.too_long')),
      html5: fail('syntax.address.too_long'),
    },
  },
  {
    isemail: 41,
    address: `a@${longLabel}.${longLabel}.${longLabel}.abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefg.hijk`,
    description: 'Domain of 256 characters',
    expected: {
      ...everywhere(fail('syntax.domain.too_long')),
      html5: fail('syntax.address.too_long'),
    },
  },

  // Quoted local parts. A quote opens a quoted string only at the start of
  // a word; anywhere else it's an invalid character.
  {
    isemail: 42,
    address: '"test"@iana.org',
    description: 'Quoted local part',
    feature: 'quoted-local',
    expected: rfcOnly(fail('syntax.local.invalid_char', 0)),
  },
  {
    isemail: 43,
    address: '""@iana.org',
    description: 'Empty quoted local part',
    feature: 'quoted-local',
    expected: rfcOnly(fail('syntax.local.invalid_char', 0)),
  },
  {
    isemail: 44,
    address: '"""@iana.org',
    description: 'Stray quote after an empty quoted string',
    expected: quotedLocal(fail('syntax.local.invalid_char', 2)),
  },
  {
    isemail: 45,
    address: '"\\a"@iana.org',
    description: 'Escaped letter in a quoted string',
    feature: 'quoted-pair',
    expected: rfcOnly(fail('syntax.local.invalid_char', 0)),
  },
  {
    isemail: 46,
    address: '"\\""@iana.org',
    description: 'Escaped quote in a quoted string',
    feature: 'quoted-pair',
    expected: rfcOnly(fail('syntax.local.invalid_char', 0)),
  },
  {
    // The escaped closing quote leaves the string open to the end.
    isemail: 47,
    address: '"\\"@iana.org',
    description: 'Quoted string whose closing quote is escaped',
    expected: quotedLocal(fail('syntax.address.no_at')),
  },
  {
    isemail: 48,
    address: '"\\\\"@iana.org',
    description: 'Escaped backslash in a quoted string',
    feature: 'quoted-pair',
    expected: rfcOnly(fail('syntax.local.invalid_char', 0)),
  },
  {
    isemail: 49,
    address: 'test"@iana.org',
    description: 'Stray quote at the end of an atom',
    expected: everywhere(fail('syntax.local.invalid_char', 4)),
  },
  {
    isemail: 50,
    address: '"test@iana.org',
    description: 'Unterminated quoted string',
    expected: quotedLocal(fail('syntax.address.no_at')),
  },
  {
    isemail: 51,
    address: '"test"test@iana.org',
    description: 'Atom straight after a quoted string',
    expected: quotedLocal(fail('syntax.local.invalid_char', 6)),
  },
  {
    isemail: 52,
    address: 'test"text"@iana.org',
    description: 'Quoted string straight after an atom',
    expected: everywhere(fail('syntax.local.invalid_char', 4)),
  },
  {
    isemail: 53,
    address: '"test""test"@iana.org',
    description: 'Two quoted strings with no dot between',
    expected: quotedLocal(fail('syntax.local.invalid_char', 6)),
  },
  {
    isemail: 54,
    address: '"test"."test"@iana.org',
    description: 'Dot-separated quoted strings',
    feature: 'obs-local',
    expected: {
      ...quotedLocal(valid),
      rfc5321: fail('syntax.local.invalid_char', 6),
    },
  },
  {
    isemail: 55,
    address: '"test\\ test"@iana.org',
    description: 'Escaped space in a quoted string',
    feature: 'quoted-pair',
    expected: rfcOnly(fail('syntax.local.invalid_char', 0)),
  },
  {
    isemail: 56,
    address: '"test".test@iana.org',
    description: 'Quoted string then a dot-separated atom',
    feature: 'obs-local',
    expected: {
      ...quotedLocal(valid),
      rfc5321: fail('syntax.local.invalid_char', 6),
    },
  },
  {
    // NUL isn't even obs-qtext.
    isemail: 57,
    address: '"test\u0000"@iana.org',
    description: 'NUL in a quoted string',
    expected: quotedLocal(fail('syntax.local.invalid_char', 5)),
  },
  {
    // obs-qp allows an escaped NUL; RFC 5321's quoted-pair doesn't.
    isemail: 58,
    address: '"test\\\u0000"@iana.org',
    description: 'Escaped NUL in a quoted string',
    feature: 'obs-control',
    expected: {
      ...quotedLocal(valid),
      rfc5321: fail('syntax.local.invalid_char', 6),
    },
  },
  {
    isemail: 59,
    address:
      '"abcdefghijklmnopqrstuvwxyz abcdefghijklmnopqrstuvwxyz abcdefghj"@iana.org',
    description: 'Quoted local part of 65 characters',
    expected: {
      ...quotedLocal(valid),
      rfc5321: fail('syntax.local.too_long'),
    },
  },
  {
    isemail: 60,
    address:
      '"abcdefghijklmnopqrstuvwxyz abcdefghijklmnopqrstuvwxyz abcdefg\\h"@iana.org',
    description: 'Quoted local part of 65 characters with an escape',
    expected: {
      ...quotedLocal(valid),
      rfc5321: fail('syntax.local.too_long'),
    },
  },

  // Domain literals. rfc5321 takes IPv4 and IPv6 address literals, IPv6
  // being the only registered tag; rfc5322 takes any dtext.
  {
    isemail: 61,
    address: 'test@[255.255.255.255]',
    description: 'IPv4 address literal',
    feature: 'ipv4-literal',
    expected: rfcOnly(fail('syntax.domain.invalid_char', 5)),
  },
  {
    isemail: 62,
    address: 'test@a[255.255.255.255]',
    description: 'Domain literal after a label',
    expected: everywhere(fail('syntax.domain.invalid_char', 6)),
  },
  {
    isemail: 63,
    address: 'test@[255.255.255]',
    description: 'IPv4 literal with three octets',
    feature: 'general-literal',
    expected: rfc5322Literal,
  },
  {
    isemail: 64,
    address: 'test@[255.255.255.255.255]',
    description: 'IPv4 literal with five octets',
    feature: 'general-literal',
    expected: rfc5322Literal,
  },
  {
    isemail: 65,
    address: 'test@[255.255.255.256]',
    description: 'IPv4 literal with an octet over 255',
    feature: 'general-literal',
    expected: rfc5322Literal,
  },
  {
    isemail: 66,
    address: 'test@[1111:2222:3333:4444:5555:6666:7777:8888]',
    description: 'IPv6 literal without the IPv6 tag',
    feature: 'general-literal',
    expected: rfc5322Literal,
  },
  {
    isemail: 67,
    address: 'test@[IPv6:1111:2222:3333:4444:5555:6666:7777]',
    description: 'IPv6 literal with seven groups',
    feature: 'general-literal',
    expected: rfc5322Literal,
  },
  {
    isemail: 68,
    address: 'test@[IPv6:1111:2222:3333:4444:5555:6666:7777:8888]',
    description: 'IPv6 literal with eight groups',
    feature: 'ipv6-literal',
    expected: rfcOnly(fail('syntax.domain.invalid_char', 5)),
  },
  {
    isemail: 69,
    address: 'test@[IPv6:1111:2222:3333:4444:5555:6666:7777:8888:9999]',
    description: 'IPv6 literal with nine groups',
    feature: 'general-literal',
    expected: rfc5322Literal,
  },
  {
    isemail: 70,
    address: 'test@[IPv6:1111:2222:3333:4444:5555:6666:7777:888G]',
    description: 'IPv6 literal with a non-hex digit',
    feature: 'general-literal',
    expected: rfc5322Literal,
  },
  {
    // RFC 5321 allows no more than six groups besides the `::`.
    isemail: 71,
    address: 'test@[IPv6:1111:2222:3333:4444:5555:6666::8888]',
    description: 'IPv6 literal with :: standing for one group',
    feature: 'general-literal',
    expected: rfc5322Literal,
  },
  {
    isemail: 72,
    address: 'test@[IPv6:1111:2222:3333:4444:5555::8888]',
    description: 'Compressed IPv6 literal',
    feature: 'ipv6-literal',
    expected: rfcOnly(fail('syntax.domain.invalid_char', 5)),
  },
  {
    isemail: 73,
    address: 'test@[IPv6:1111:2222:3333:4444:5555:6666::7777:8888]',
    description: 'Compressed IPv6 literal with eight groups',
    feature: 'general-literal',
    expected: rfc5322Literal,
  },
  {
    isemail: 74,
    address: 'test@[IPv6::3333:4444:5555:6666:7777:8888]',
    description: 'IPv6 literal starting with a single colon',
    feature: 'general-literal',
    expected: rfc5322Literal,
  },
  {
    isemail: 75,
    address: 'test@[IPv6:::3333:4444:5555:6666:7777:8888]',
    description: 'IPv6 literal starting with ::',
    feature: 'ipv6-literal',
    expected: rfcOnly(fail('syntax.domain.invalid_char', 5)),
  },
  {
    isemail: 76,
    address: 'test@[IPv6:1111::4444:5555::8888]',
    description: 'IPv6 literal with two ::',
    feature: 'general-literal',
    expected: rfc5322Literal,
  },
  {
    isemail: 77,
    address: 'test@[IPv6:::]',
    description: 'IPv6 unspecified address literal',
    feature: 'ipv6-literal',
    expected: rfcOnly(fail('syntax.domain.invalid_char', 5)),
  },
  {
    isemail: 78,
    address: 'test@[IPv6:1111:2222:3333:4444:5555:255.255.255.255]',
    description: 'IPv4-in-IPv6 literal with five groups',
    feature: 'general-literal',
    expected: rfc5322Literal,
  },
  {
    isemail: 79,
    address: 'test@[IPv6:1111:2222:3333:4444:5555:6666:255.255.255.255]',
    description: 'IPv4-in-IPv6 literal with six groups',
    feature: 'ipv6-literal',
    expected: rfcOnly(fail('syntax.domain.invalid_char', 5)),
  },
  {
    isemail: 80,
    address: 'test@[IPv6:1111:2222:3333:4444:5555:6666:7777:255.255.255.255]',
    description: 'IPv4-in-IPv6 literal with seven groups',
    feature: 'general-literal',
    expected: rfc5322Literal,
  },
  {
    isemail: 81,
    address: 'test@[IPv6:1111:2222:3333:4444::255.255.255.255]',
    description: 'Compressed IPv4-in-IPv6 literal',
    feature: 'ipv6-literal',
    expected: rfcOnly(fail('syntax.domain.invalid_char', 5)),
  },
  {
    isemail: 82,
    address: 'test@[IPv6:1111:2222:3333:4444:5555:6666::255.255.255.255]',
    description: 'Compressed IPv4-in-IPv6 literal with six groups',
    feature: 'general-literal',
    expected: rfc5322Literal,
  },
  {
    isemail: 83,
    address: 'test@[IPv6:1111:2222:3333:4444:::255.255.255.255]',
    description: 'IPv4-in-IPv6 literal with :::',
    feature: 'general-literal',
    expected: rfc5322Literal,
  },
  {
    isemail: 84,
    address: 'test@[IPv6::255.255.255.255]',
    description: 'IPv4-in-IPv6 literal starting with a single colon',
    feature: 'general-literal',
    expected: rfc5322Literal,
  },

  // Whitespace and comments. rfc5322 allows them around every word and
  // label (obs-local-part and obs-domain included); the other presets have
  // no CFWS.
  {
    isemail: 85,
    address: ' test @iana.org',
    description: 'Spaces around the local part',
    feature: 'fws',
    expected: allBut5322(fail('syntax.local.unquoted_space', 0), valid),
  },
  {
    isemail: 86,
    address: 'test@ iana .com',
    description: 'Spaces around a domain label',
    feature: 'fws',
    expected: allBut5322(fail('syntax.domain.invalid_char', 5), valid),
  },
  {
    isemail: 87,
    address: 'test . test@iana.org',
    description: 'Spaces around a dot in the local part',
    feature: 'fws',
    expected: allBut5322(fail('syntax.local.unquoted_space', 4), valid),
  },
  {
    isemail: 88,
    address: '\r\n test@iana.org',
    description: 'Folded whitespace before the local part',
    feature: 'fws',
    expected: allBut5322(fail('syntax.local.invalid_char', 0), valid),
  },
  {
    isemail: 89,
    address: '\r\n \r\n test@iana.org',
    description: 'Whitespace folded twice before the local part',
    feature: 'fws',
    expected: allBut5322(fail('syntax.local.invalid_char', 0), valid),
  },
  {
    isemail: 90,
    address: '(comment)test@iana.org',
    description: 'Comment before the local part',
    feature: 'comments',
    expected: rfc5322Only(fail('syntax.comment.not_allowed', 0)),
  },
  {
    // The unclosed outer comment runs to the end, so no @ is outside it.
    isemail: 91,
    address: '((comment)test@iana.org',
    description: 'Unterminated comment around a nested one',
    expected: allBut5322(
      fail('syntax.comment.not_allowed', 0),
      fail('syntax.address.no_at'),
    ),
  },
  {
    isemail: 92,
    address: '(comment(comment))test@iana.org',
    description: 'Nested comment',
    feature: 'comments',
    expected: rfc5322Only(fail('syntax.comment.not_allowed', 0)),
  },
  {
    isemail: 93,
    address: 'test@(comment)iana.org',
    description: 'Comment before the domain',
    feature: 'comments',
    expected: rfc5322Only(fail('syntax.comment.not_allowed', 5)),
  },
  {
    isemail: 94,
    address: 'test(comment)test@iana.org',
    description: 'Comment between two atoms with no dot',
    expected: allBut5322(
      fail('syntax.comment.not_allowed', 4),
      fail('syntax.local.invalid_char', 13),
    ),
  },
  {
    isemail: 95,
    address: 'test@(comment)[255.255.255.255]',
    description: 'Comment before a domain literal',
    feature: 'comments',
    expected: rfc5322Only(fail('syntax.comment.not_allowed', 5)),
  },
  {
    isemail: 96,
    address:
      '(comment)abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghiklm@iana.org',
    description: 'Comment before a 64-character local part',
    feature: 'comments',
    expected: rfc5322Only(fail('syntax.comment.not_allowed', 0)),
  },
  {
    isemail: 97,
    address: `test@(comment)${longLabel}.com`,
    description: 'Comment before a 63-character domain label',
    feature: 'comments',
    expected: rfc5322Only(fail('syntax.comment.not_allowed', 5)),
  },
  {
    // 263 characters, but the length caps don't count comments, so it's
    // 254 to rfc5322.
    isemail: 98,
    address:
      '(comment)test@abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghik.abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghik.abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijk.abcdefghijklmnopqrstuvwxyzabcdefghijk.abcdefghijklmnopqrstu',
    description: 'Comment before a 254-character address',
    feature: 'comments',
    expected: rfc5322Only(fail('syntax.comment.not_allowed', 0)),
  },
  {
    isemail: 99,
    address: 'test@iana.org\n',
    description: 'Trailing line feed',
    expected: everywhere(fail('syntax.domain.invalid_char', 13)),
  },

  // Punycode.
  {
    isemail: 100,
    address: 'test@xn--hxajbheg2az3al.xn--jxalpdlp',
    description: 'Punycode domain with a retired test TLD',
    feature: 'unknown-tld',
    expected: { ...everywhere(valid), practical: fail('syntax.tld.unknown') },
  },
  {
    isemail: 101,
    address: 'xn--test@iana.org',
    description: 'Punycode prefix in the local part',
    feature: 'dot-atom',
    expected: everywhere(valid),
  },
  {
    isemail: 102,
    address: 'test@iana.org-',
    description: 'TLD ending with a hyphen',
    expected: everywhere(fail('syntax.domain.label_invalid', 13)),
  },

  // Unterminated constructs. One that swallows the @ leaves none outside it.
  {
    isemail: 104,
    address: '(test@iana.org',
    description: 'Unterminated comment before the @',
    expected: allBut5322(
      fail('syntax.comment.not_allowed', 0),
      fail('syntax.address.no_at'),
    ),
  },
  {
    isemail: 105,
    address: 'test@(iana.org',
    description: 'Unterminated comment in the domain',
    expected: allBut5322(
      fail('syntax.comment.not_allowed', 5),
      fail('syntax.comment.unterminated', 5),
    ),
  },
  {
    isemail: 106,
    address: 'test@[1.2.3.4',
    description: 'Unterminated domain literal',
    expected: {
      practical: fail('syntax.domain.invalid_char', 5),
      rfc5321: fail('syntax.domain.literal_invalid', 5),
      rfc5322: fail('syntax.domain.literal_invalid', 5),
      html5: fail('syntax.domain.invalid_char', 5),
    },
  },
  {
    isemail: 107,
    address: '"test\\"@iana.org',
    description: 'Quoted string whose closing quote is escaped',
    expected: quotedLocal(fail('syntax.address.no_at')),
  },
  {
    isemail: 108,
    address: '(comment\\)test@iana.org',
    description: 'Comment whose closing parenthesis is escaped',
    expected: allBut5322(
      fail('syntax.comment.not_allowed', 0),
      fail('syntax.address.no_at'),
    ),
  },
  {
    isemail: 109,
    address: 'test@iana.org(comment\\)',
    description: 'Trailing comment whose closing parenthesis is escaped',
    expected: allBut5322(
      fail('syntax.comment.not_allowed', 13),
      fail('syntax.comment.unterminated', 13),
    ),
  },
  {
    isemail: 110,
    address: 'test@iana.org(comment\\',
    description: 'Trailing comment ending in a backslash',
    expected: allBut5322(
      fail('syntax.comment.not_allowed', 13),
      fail('syntax.comment.unterminated', 13),
    ),
  },

  // General domain literals.
  {
    isemail: 112,
    address: 'test@[RFC-5322-domain-literal]',
    description: "Domain literal that isn't an address",
    feature: 'general-literal',
    expected: rfc5322Literal,
  },
  {
    isemail: 113,
    address: 'test@[RFC-5322]-domain-literal]',
    description: 'Text after a domain literal',
    expected: {
      ...rfc5322Literal,
      rfc5322: fail('syntax.domain.invalid_char', 15),
    },
  },
  {
    isemail: 114,
    address: 'test@[RFC-5322-[domain-literal]',
    description: 'Unescaped [ inside a domain literal',
    expected: {
      ...rfc5322Literal,
      rfc5322: fail('syntax.domain.literal_invalid', 5),
    },
  },
  {
    isemail: 115,
    address: 'test@[RFC-5322-\\\u0007-domain-literal]',
    description: 'Escaped BEL in a domain literal',
    feature: 'obs-control',
    expected: rfc5322Literal,
  },
  {
    isemail: 116,
    address: 'test@[RFC-5322-\\\t-domain-literal]',
    description: 'Escaped tab in a domain literal',
    feature: 'general-literal',
    expected: rfc5322Literal,
  },
  {
    isemail: 117,
    address: 'test@[RFC-5322-\\]-domain-literal]',
    description: 'Escaped ] in a domain literal',
    feature: 'general-literal',
    expected: rfc5322Literal,
  },
  {
    isemail: 118,
    address: 'test@[RFC-5322-domain-literal\\]',
    description: 'Domain literal whose closing bracket is escaped',
    expected: {
      ...rfc5322Literal,
      rfc5322: fail('syntax.domain.literal_invalid', 5),
    },
  },
  {
    isemail: 119,
    address: 'test@[RFC-5322-domain-literal\\',
    description: 'Domain literal ending in a backslash',
    expected: {
      ...rfc5322Literal,
      rfc5322: fail('syntax.domain.literal_invalid', 5),
    },
  },
  {
    isemail: 120,
    address: 'test@[RFC 5322 domain literal]',
    description: 'Spaces in a domain literal',
    feature: 'general-literal',
    expected: rfc5322Literal,
  },
  {
    isemail: 121,
    address: 'test@[RFC-5322-domain-literal] (comment)',
    description: 'Comment after a domain literal',
    expected: rfc5322Literal,
  },
  {
    isemail: 123,
    address: 'test@.org',
    description: 'Domain starting with a dot before the TLD',
    expected: everywhere(fail('syntax.domain.label_invalid', 5)),
  },

  // Control characters. rfc5322's obsolete syntax allows most of them in
  // quoted strings, comments, and escapes; CR and LF only as folding.
  {
    isemail: 124,
    address: '"\u007f"@iana.org',
    description: 'DEL in a quoted string',
    feature: 'obs-control',
    expected: {
      ...quotedLocal(valid),
      rfc5321: fail('syntax.local.invalid_char', 1),
    },
  },
  {
    isemail: 125,
    address: '"\\\u007f"@iana.org',
    description: 'Escaped DEL in a quoted string',
    feature: 'obs-control',
    expected: {
      ...quotedLocal(valid),
      rfc5321: fail('syntax.local.invalid_char', 2),
    },
  },
  {
    isemail: 126,
    address: '(\u007f)test@iana.org',
    description: 'DEL in a comment',
    feature: 'obs-control',
    expected: rfc5322Only(fail('syntax.comment.not_allowed', 0)),
  },
  {
    isemail: 127,
    address: 'test@iana.org\r',
    description: 'Trailing CR',
    expected: everywhere(fail('syntax.domain.invalid_char', 13)),
  },
  {
    isemail: 128,
    address: '\rtest@iana.org',
    description: 'Leading CR',
    expected: everywhere(fail('syntax.local.invalid_char', 0)),
  },
  {
    isemail: 129,
    address: '"\rtest"@iana.org',
    description: 'CR in a quoted string',
    expected: quotedLocal(fail('syntax.local.invalid_char', 1)),
  },
  {
    isemail: 130,
    address: '(\r)test@iana.org',
    description: 'CR in a comment',
    expected: allBut5322(
      fail('syntax.comment.not_allowed', 0),
      fail('syntax.local.invalid_char', 1),
    ),
  },
  {
    isemail: 131,
    address: 'test@iana.org(\r)',
    description: 'CR in a trailing comment',
    expected: allBut5322(
      fail('syntax.comment.not_allowed', 13),
      fail('syntax.domain.invalid_char', 14),
    ),
  },
  {
    isemail: 132,
    address: '\ntest@iana.org',
    description: 'Leading LF',
    expected: everywhere(fail('syntax.local.invalid_char', 0)),
  },
  {
    isemail: 133,
    address: '"\n"@iana.org',
    description: 'LF in a quoted string',
    expected: quotedLocal(fail('syntax.local.invalid_char', 1)),
  },
  {
    isemail: 134,
    address: '"\\\n"@iana.org',
    description: 'Escaped LF in a quoted string',
    feature: 'obs-control',
    expected: {
      ...quotedLocal(valid),
      rfc5321: fail('syntax.local.invalid_char', 2),
    },
  },
  {
    isemail: 135,
    address: '(\n)test@iana.org',
    description: 'LF in a comment',
    expected: allBut5322(
      fail('syntax.comment.not_allowed', 0),
      fail('syntax.local.invalid_char', 1),
    ),
  },
  {
    isemail: 136,
    address: '\u0007@iana.org',
    description: 'BEL as the local part',
    expected: everywhere(fail('syntax.local.invalid_char', 0)),
  },
  {
    isemail: 137,
    address: 'test@\u0007.org',
    description: 'BEL as a domain label',
    expected: everywhere(fail('syntax.domain.invalid_char', 5)),
  },
  {
    isemail: 138,
    address: '"\u0007"@iana.org',
    description: 'BEL in a quoted string',
    feature: 'obs-control',
    expected: {
      ...quotedLocal(valid),
      rfc5321: fail('syntax.local.invalid_char', 1),
    },
  },
  {
    isemail: 139,
    address: '"\\\u0007"@iana.org',
    description: 'Escaped BEL in a quoted string',
    feature: 'obs-control',
    expected: {
      ...quotedLocal(valid),
      rfc5321: fail('syntax.local.invalid_char', 2),
    },
  },
  {
    isemail: 140,
    address: '(\u0007)test@iana.org',
    description: 'BEL in a comment',
    feature: 'obs-control',
    expected: rfc5322Only(fail('syntax.comment.not_allowed', 0)),
  },

  // Folding. A CRLF must be followed by a space or tab; `index` points at
  // the CR of the first one that isn't.
  {
    isemail: 141,
    address: '\r\ntest@iana.org',
    description: 'Leading CRLF with no whitespace after it',
    expected: everywhere(fail('syntax.local.invalid_char', 0)),
  },
  {
    isemail: 142,
    address: '\r\n \r\ntest@iana.org',
    description: 'Folded whitespace ending in a CRLF',
    expected: allBut5322(
      fail('syntax.local.invalid_char', 0),
      fail('syntax.local.invalid_char', 3),
    ),
  },
  {
    isemail: 143,
    address: ' \r\ntest@iana.org',
    description: 'Space then a CRLF with no whitespace after it',
    expected: allBut5322(
      fail('syntax.local.unquoted_space', 0),
      fail('syntax.local.invalid_char', 1),
    ),
  },
  {
    isemail: 144,
    address: ' \r\n test@iana.org',
    description:
      'Folded whitespace before the local part, starting with a space',
    feature: 'fws',
    expected: allBut5322(fail('syntax.local.unquoted_space', 0), valid),
  },
  {
    isemail: 145,
    address: ' \r\n \r\ntest@iana.org',
    description: 'Folded whitespace ending in a CRLF, starting with a space',
    expected: allBut5322(
      fail('syntax.local.unquoted_space', 0),
      fail('syntax.local.invalid_char', 4),
    ),
  },
  {
    isemail: 146,
    address: ' \r\n\r\ntest@iana.org',
    description: 'Two CRLFs in a row',
    expected: allBut5322(
      fail('syntax.local.unquoted_space', 0),
      fail('syntax.local.invalid_char', 1),
    ),
  },
  {
    isemail: 147,
    address: ' \r\n\r\n test@iana.org',
    description: 'Two CRLFs in a row, then a space',
    expected: allBut5322(
      fail('syntax.local.unquoted_space', 0),
      fail('syntax.local.invalid_char', 1),
    ),
  },
  {
    isemail: 148,
    address: 'test@iana.org\r\n ',
    description: 'Folded whitespace after the domain',
    feature: 'fws',
    expected: allBut5322(fail('syntax.domain.invalid_char', 13), valid),
  },
  {
    isemail: 149,
    address: 'test@iana.org\r\n \r\n ',
    description: 'Whitespace folded twice after the domain',
    feature: 'fws',
    expected: allBut5322(fail('syntax.domain.invalid_char', 13), valid),
  },
  {
    isemail: 150,
    address: 'test@iana.org\r\n',
    description: 'Trailing CRLF',
    expected: everywhere(fail('syntax.domain.invalid_char', 13)),
  },
  {
    isemail: 151,
    address: 'test@iana.org\r\n \r\n',
    description: 'Folded whitespace after the domain, ending in a CRLF',
    expected: allBut5322(
      fail('syntax.domain.invalid_char', 13),
      fail('syntax.domain.invalid_char', 16),
    ),
  },
  {
    isemail: 152,
    address: 'test@iana.org \r\n',
    description: 'Trailing space then a CRLF',
    expected: allBut5322(
      fail('syntax.domain.invalid_char', 13),
      fail('syntax.domain.invalid_char', 14),
    ),
  },
  {
    isemail: 153,
    address: 'test@iana.org \r\n ',
    description: 'Folded whitespace after the domain, starting with a space',
    feature: 'fws',
    expected: allBut5322(fail('syntax.domain.invalid_char', 13), valid),
  },
  {
    isemail: 154,
    address: 'test@iana.org \r\n \r\n',
    description:
      'Folded whitespace after the domain, starting with a space and ending in a CRLF',
    expected: allBut5322(
      fail('syntax.domain.invalid_char', 13),
      fail('syntax.domain.invalid_char', 17),
    ),
  },
  {
    isemail: 155,
    address: 'test@iana.org \r\n\r\n',
    description: 'Trailing space then two CRLFs',
    expected: allBut5322(
      fail('syntax.domain.invalid_char', 13),
      fail('syntax.domain.invalid_char', 14),
    ),
  },
  {
    isemail: 156,
    address: 'test@iana.org \r\n\r\n ',
    description: 'Trailing space then two CRLFs and a space',
    expected: allBut5322(
      fail('syntax.domain.invalid_char', 13),
      fail('syntax.domain.invalid_char', 14),
    ),
  },
  {
    isemail: 157,
    address: ' test@iana.org',
    description: 'Leading space',
    feature: 'fws',
    expected: allBut5322(fail('syntax.local.unquoted_space', 0), valid),
  },
  {
    isemail: 158,
    address: 'test@iana.org ',
    description: 'Trailing space',
    feature: 'fws',
    expected: allBut5322(fail('syntax.domain.invalid_char', 13), valid),
  },

  // Odds and ends.
  {
    isemail: 159,
    address: 'test@[IPv6:1::2:]',
    description: 'IPv6 literal ending with a single colon',
    feature: 'general-literal',
    expected: rfc5322Literal,
  },
  {
    isemail: 160,
    address: '"test\\©"@iana.org',
    description: 'Escaped non-ASCII character in a quoted string',
    expected: quotedLocal(fail('syntax.local.invalid_char', 6)),
  },
  {
    // `/` is atext, and RFC 5322's domain is a dot-atom.
    isemail: 161,
    address: 'test@iana/icann.org',
    description: 'Slash in the domain',
    expected: allBut5322(fail('syntax.domain.invalid_char', 9), valid),
  },
  {
    isemail: 165,
    address: 'test.(comment)test@iana.org',
    description: 'Comment after a dot in the local part',
    feature: 'comments',
    expected: rfc5322Only(fail('syntax.comment.not_allowed', 5)),
  },
  {
    isemail: 166,
    address: 'test@org',
    description: 'TLD alone as the domain',
    feature: 'dotless-domain',
    expected: { ...everywhere(fail('syntax.domain.no_dot')), html5: valid },
  },
  {
    isemail: 167,
    address: 'test@test.com',
    description: 'Common test domain',
    feature: 'dot-atom',
    expected: everywhere(valid),
  },
  {
    isemail: 168,
    address: 'test@nic.no',
    description: 'Country-code TLD',
    feature: 'dot-atom',
    expected: everywhere(valid),
  },
];
