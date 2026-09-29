// The configuration preview: the real parser's split of the corpus or the
// caller's addresses, and which of them the overrides move.
import { describe, expect, it } from 'vitest';
import { parseAddress } from '../src';
import {
  type Expected,
  presets,
  previewSyntaxOptions,
  syntaxFixtures,
} from '../src/fixtures';

/** `list`'s addresses in the order the corpus has them. */
function inCorpusOrder(list: readonly { address: string }[]): string[] {
  const listed = new Set(list.map(({ address }) => address));
  return syntaxFixtures
    .map(({ address }) => address)
    .filter((address) => listed.has(address));
}

describe('previewSyntaxOptions', () => {
  it.each(presets)(
    'matches the corpus with no overrides under %s',
    (preset) => {
      const { valid, invalid } = previewSyntaxOptions({ preset });
      const judged = new Map<string, Expected>([
        ...valid.map(({ address }) => [address, { ok: true }] as const),
        ...invalid.map(
          ({ address, reason, index }) =>
            [
              address,
              index === undefined
                ? { ok: false, reason }
                : { ok: false, reason, index },
            ] as const,
        ),
      ]);
      expect(judged.size).toBe(syntaxFixtures.length);
      expect(
        syntaxFixtures.map(({ address }) => [address, judged.get(address)]),
      ).toEqual(
        syntaxFixtures.map(({ address, expected }) => [
          address,
          expected[preset],
        ]),
      );
      expect([...valid, ...invalid].some(({ changed }) => changed)).toBe(false);
    },
  );

  it('previews the practical preset by default', () => {
    expect(previewSyntaxOptions()).toEqual(
      previewSyntaxOptions({ preset: 'practical' }),
    );
  });

  it('keeps the corpus order and descriptions', () => {
    const { valid, invalid } = previewSyntaxOptions();
    const fixture = syntaxFixtures.find(
      ({ expected }) => expected.practical.ok,
    )!;
    expect(valid.find(({ address }) => address === fixture.address)).toEqual({
      address: fixture.address,
      description: fixture.description,
      changed: false,
    });
    expect(valid.map(({ address }) => address)).toEqual(inCorpusOrder(valid));
    expect(invalid.map(({ address }) => address)).toEqual(
      inCorpusOrder(invalid),
    );
  });

  it('moves example@s.example when checkTld is off', () => {
    const before = previewSyntaxOptions();
    expect(before.invalid).toContainEqual(
      expect.objectContaining({
        address: 'example@s.example',
        reason: 'syntax.tld.unknown',
        changed: false,
      }),
    );
    const after = previewSyntaxOptions({ checkTld: false });
    expect(after.valid).toContainEqual(
      expect.objectContaining({ address: 'example@s.example', changed: true }),
    );
    expect(after.invalid.map(({ address }) => address)).not.toContain(
      'example@s.example',
    );
  });

  it('marks addresses an override rejects as changed', () => {
    const options = { preset: 'rfc5321', allowIpLiteral: false } as const;
    const { ok: _, ...failure } = parseAddress('ada@[192.0.2.1]', options);
    expect(
      previewSyntaxOptions(options, ['ada@[192.0.2.1]', 'ada@example.com']),
    ).toEqual({
      valid: [{ address: 'ada@example.com', changed: false }],
      invalid: [{ address: 'ada@[192.0.2.1]', ...failure, changed: true }],
    });
  });

  it('judges your own addresses, with no description', () => {
    const addresses = ['ada@example.com', 'ada@localhost', 'ada@example.com'];
    expect(previewSyntaxOptions({ preset: 'html5' }, addresses)).toEqual({
      valid: [
        { address: 'ada@example.com', changed: false },
        { address: 'ada@localhost', changed: false },
        { address: 'ada@example.com', changed: false },
      ],
      invalid: [],
    });
    const { ok: _, ...failure } = parseAddress('ada@localhost');
    expect(previewSyntaxOptions(undefined, ['ada@localhost'])).toEqual({
      valid: [],
      invalid: [{ address: 'ada@localhost', ...failure, changed: false }],
    });
  });

  it('previews nothing for an empty list', () => {
    expect(previewSyntaxOptions({ checkTld: false }, [])).toEqual({
      valid: [],
      invalid: [],
    });
  });

  it.each<[string, unknown, unknown]>([
    ['an unknown option', { strict: true }, undefined],
    ['an unknown preset', { preset: 'loose' }, undefined],
    [
      'an override the preset has no room for',
      { preset: 'html5', allowIdn: true },
      undefined,
    ],
    ['addresses that aren’t an array', undefined, 'ada@example.com'],
    ['a non-string address', undefined, ['ada@example.com', 42]],
  ])('throws a TypeError for %s', (_, options, addresses) => {
    expect(() =>
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      previewSyntaxOptions(options as never, addresses as never),
    ).toThrow(TypeError);
  });
});
