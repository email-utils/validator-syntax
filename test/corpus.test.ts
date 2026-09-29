// Runs the corpus through every entry point under every preset, and checks
// the corpus data itself.
import { describe, expect, it } from 'vitest';
import {
  type Result,
  createSyntaxValidator,
  isValidSyntax,
  parseAddress,
} from '../src';
import {
  type Expected,
  isemailFixtures,
  legacyFixtures,
  presets,
  rfc3696Fixtures,
  supportMatrix,
  syntaxFeatures,
  syntaxFixtures,
  wikipediaFixtures,
} from '../src/fixtures';
import { EmailSyntaxValidator } from './legacy/validator';

// The WHATWG input[type=email] pattern, verbatim from the HTML standard.
const whatwgEmail =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/** The result without its value or message, which the corpus doesn't record. */
function outcome(result: Result<unknown>): Expected {
  if (result.ok) {
    return { ok: true };
  }
  const { reason, index } = result;
  return index === undefined
    ? { ok: false, reason }
    : { ok: false, reason, index };
}

/** The character each positioned reason code must point at, where there's one. */
const pointsAt: Partial<Record<string, string>> = {
  'syntax.comment.not_allowed': '(',
  'syntax.comment.unterminated': '(',
  'syntax.domain.literal_invalid': '[',
  'syntax.local.unquoted_space': ' ',
};

describe('corpus', () => {
  it('combines every source', () => {
    expect(syntaxFixtures).toEqual([
      ...legacyFixtures,
      ...isemailFixtures,
      ...wikipediaFixtures,
      ...rfc3696Fixtures,
    ]);
  });

  it('lists each address once', () => {
    const addresses = syntaxFixtures.map((fixture) => fixture.address);
    const repeated = addresses.filter(
      (address, i) => addresses.indexOf(address) !== i,
    );
    expect(repeated).toEqual([]);
  });

  it('lists each isemail test once', () => {
    const ids = isemailFixtures.map((fixture) => fixture.isemail);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has fixtures for every support-matrix feature', () => {
    const tagged = new Set(syntaxFixtures.map((fixture) => fixture.feature));
    const missing = syntaxFeatures
      .map(({ feature }) => feature)
      .filter((feature) => !tagged.has(feature));
    expect(missing).toEqual([]);
  });

  it('builds the support matrix', () => {
    const rows = supportMatrix().map(
      ({ label, support }) =>
        `| ${label} | ${presets.map((preset) => support[preset]).join(' | ')} |`,
    );
    expect(
      [
        `| Feature | ${presets.join(' | ')} |`,
        `| --- |${' --- |'.repeat(presets.length)}`,
        ...rows,
      ].join('\n'),
    ).toMatchSnapshot();
  });

  describe.each(syntaxFixtures)('$address', ({ address, expected }) => {
    it.each(presets)('gives the expected result under %s', (preset) => {
      expect(outcome(parseAddress(address, { preset }))).toEqual(
        expected[preset],
      );
    });

    it.each(presets)('agrees across the entry points under %s', (preset) => {
      const validator = createSyntaxValidator({ preset });
      const result = parseAddress(address, { preset });
      expect(validator.parse(address)).toEqual(result);
      expect(isValidSyntax(address, { preset })).toBe(result.ok);
      expect(validator.isValid(address)).toBe(result.ok);
    });

    const accepting = presets.filter((preset) => expected[preset].ok);
    const failures = presets.flatMap((preset) => {
      const result = expected[preset];
      return result.ok || result.index === undefined
        ? []
        : [{ preset, reason: result.reason, index: result.index }];
    });

    it('matches the WHATWG pattern and the 254 cap under html5', () => {
      expect(expected.html5.ok).toBe(
        whatwgEmail.test(address) && address.length <= 254,
      );
    });

    it('keeps accepted addresses within the length caps', () => {
      // rfc5322 is left out: its caps don't count comments or whitespace.
      const local = address.slice(0, address.lastIndexOf('@'));
      const overLong = accepting.filter(
        (preset) =>
          (preset !== 'rfc5322' && address.length > 254) ||
          ((preset === 'practical' || preset === 'rfc5321') &&
            local.length > 64),
      );
      expect(overLong).toEqual([]);
    });

    it('points failure indexes at the right character', () => {
      const misplaced = failures.filter(({ reason, index }) => {
        const char = pointsAt[reason];
        return (
          index < 0 ||
          index >= address.length ||
          (reason.startsWith('syntax.local.') &&
            index >= address.lastIndexOf('@')) ||
          (reason.startsWith('syntax.domain.') &&
            index <= address.indexOf('@')) ||
          (char !== undefined && address[index] !== char)
        );
      });
      expect(misplaced).toEqual([]);
    });
  });
});

describe.each(legacyFixtures)('legacy $address', (fixture) => {
  it('records what 0.0.1 returned', async () => {
    expect(await new EmailSyntaxValidator().validate(fixture.address)).toBe(
      fixture.legacy,
    );
  });

  it('explains the flip exactly when practical disagrees with 0.0.1', () => {
    const flipped = fixture.expected.practical.ok !== fixture.legacy;
    expect(fixture.flipped !== undefined).toBe(flipped);
  });
});
