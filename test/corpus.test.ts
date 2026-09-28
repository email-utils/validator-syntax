// Checks on the corpus data itself. The v1 functions run the corpus once
// they exist (validator-syntax#10); until then these keep the table honest.
import { describe, expect, it } from 'vitest';
import EmailSyntaxValidator from '../src';
import { legacyCorpus } from './corpus/legacy';
import { presets } from './corpus/types';

// The WHATWG input[type=email] pattern, verbatim from the HTML standard.
const whatwgEmail =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

describe('legacy corpus', () => {
  it('lists each address once', () => {
    const addresses = legacyCorpus.map((corpusCase) => corpusCase.address);
    expect(new Set(addresses).size).toBe(addresses.length);
  });

  describe.each(legacyCorpus)('$address', (corpusCase) => {
    it('records what 0.0.1 returned', async () => {
      expect(
        await new EmailSyntaxValidator().validate(corpusCase.address),
      ).toBe(corpusCase.legacy);
    });

    it('explains the flip exactly when practical disagrees with 0.0.1', () => {
      const flipped = corpusCase.expected.practical.ok !== corpusCase.legacy;
      expect(corpusCase.flipped !== undefined).toBe(flipped);
    });

    it('matches the WHATWG pattern under html5', () => {
      expect(corpusCase.expected.html5.ok).toBe(
        whatwgEmail.test(corpusCase.address),
      );
    });

    it('points failure indexes inside the address', () => {
      const indexes = presets.flatMap((preset) => {
        const expected = corpusCase.expected[preset];
        return expected.ok || expected.index === undefined
          ? []
          : [expected.index];
      });
      const outside = indexes.filter(
        (index) => index < 0 || index >= corpusCase.address.length,
      );
      expect(outside).toEqual([]);
    });
  });
});
