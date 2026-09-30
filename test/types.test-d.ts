// The public types: how a result narrows, what the options take, and the
// exact unions a caller can switch on. `npm run typecheck` and Vitest's
// typecheck both run these; a `@ts-expect-error` that stops erroring fails.
import { describe, expectTypeOf, it } from 'vitest';
import {
  type AddressComment,
  type ParsedAddress,
  type Preset,
  type ReasonCode,
  type Result,
  type SyntaxOptions,
  type SyntaxValidator,
  createSyntaxValidator,
  isValidSyntax,
  parseAddress,
} from '../src';
import {
  type InvalidPreviewEntry,
  type Preset as FixturePreset,
  type SyntaxReasonCode,
  type ValidPreviewEntry,
  previewSyntaxOptions,
} from '../src/fixtures';

describe('Result', () => {
  it('narrows to the value on ok', () => {
    const result = parseAddress('ada@example.com');
    if (result.ok) {
      expectTypeOf(result).toEqualTypeOf<{ ok: true; value: ParsedAddress }>();
      expectTypeOf(result.value).toEqualTypeOf<ParsedAddress>();
      // @ts-expect-error: a success has no reason
      void result.reason;
    } else {
      expectTypeOf(result.reason).toEqualTypeOf<ReasonCode>();
      expectTypeOf(result.message).toEqualTypeOf<string | undefined>();
      expectTypeOf(result.index).toEqualTypeOf<number | undefined>();
      // @ts-expect-error: a failure has no value
      void result.value;
    }
  });

  it('can’t be read before it’s narrowed', () => {
    const result = parseAddress('ada@example.com');
    expectTypeOf(result.ok).toEqualTypeOf<boolean>();
    // @ts-expect-error: only a success has a value
    void result.value;
    // @ts-expect-error: only a failure has a reason
    void result.reason;
  });

  it('is generic in the value', () => {
    expectTypeOf<Result<number>>().toEqualTypeOf<
      | { ok: true; value: number }
      | { ok: false; reason: ReasonCode; message?: string; index?: number }
    >();
  });
});

describe('ParsedAddress', () => {
  it('has a TLD only sometimes, and comments always', () => {
    expectTypeOf<ParsedAddress>().toEqualTypeOf<{
      local: string;
      domain: string;
      tld?: string;
      comments: AddressComment[];
    }>();
  });

  it('places each comment in one of six positions', () => {
    expectTypeOf<AddressComment['position']>().toEqualTypeOf<
      | 'before-local'
      | 'inside-local'
      | 'after-local'
      | 'before-domain'
      | 'inside-domain'
      | 'after-domain'
    >();
  });
});

describe('ReasonCode', () => {
  it('is exactly the syntax.* codes', () => {
    expectTypeOf<ReasonCode>().toEqualTypeOf<
      | 'syntax.address.empty'
      | 'syntax.address.no_at'
      | 'syntax.address.too_long'
      | 'syntax.local.empty'
      | 'syntax.local.too_long'
      | 'syntax.local.invalid_char'
      | 'syntax.local.consecutive_dots'
      | 'syntax.local.unquoted_space'
      | 'syntax.domain.empty'
      | 'syntax.domain.no_dot'
      | 'syntax.domain.label_invalid'
      | 'syntax.domain.literal_invalid'
      | 'syntax.domain.too_long'
      | 'syntax.domain.invalid_char'
      | 'syntax.comment.not_allowed'
      | 'syntax.comment.unterminated'
      | 'syntax.tld.unknown'
    >();
  });

  it('is the same union the fixtures export', () => {
    expectTypeOf<SyntaxReasonCode>().toEqualTypeOf<ReasonCode>();
  });
});

describe('SyntaxOptions', () => {
  it('names exactly four presets, the same in the fixtures', () => {
    expectTypeOf<Preset>().toEqualTypeOf<
      'practical' | 'rfc5321' | 'rfc5322' | 'html5'
    >();
    expectTypeOf<FixturePreset>().toEqualTypeOf<Preset>();
  });

  it('takes a preset, boolean overrides, and a maxLength, each optional', () => {
    expectTypeOf<SyntaxOptions>().toEqualTypeOf<{
      preset?: Preset | undefined;
      checkTld?: boolean | undefined;
      allowNoTld?: boolean | undefined;
      allowComments?: boolean | undefined;
      allowUnicode?: boolean | undefined;
      allowIdn?: boolean | undefined;
      allowIpLiteral?: boolean | undefined;
      maxLength?: number | undefined;
    }>();
  });

  it('accepts no options, empty options, and undefined overrides', () => {
    expectTypeOf(parseAddress).toBeCallableWith('a@x.com');
    expectTypeOf(parseAddress).toBeCallableWith('a@x.com', undefined);
    expectTypeOf(parseAddress).toBeCallableWith('a@x.com', {});
    expectTypeOf(parseAddress).toBeCallableWith('a@x.com', {
      preset: 'rfc5322',
      checkTld: true,
      allowNoTld: false,
      allowComments: true,
      allowUnicode: true,
      allowIdn: true,
      allowIpLiteral: false,
      maxLength: Infinity,
    });
    expectTypeOf(parseAddress).toBeCallableWith('a@x.com', {
      preset: undefined,
      checkTld: undefined,
    });
  });

  it('rejects an unknown preset, option, or non-boolean override', () => {
    expectTypeOf(parseAddress).toBeCallableWith('a@x.com', {
      // @ts-expect-error: rfc822 isn't a preset
      preset: 'rfc822',
    });
    // @ts-expect-error: there's no strict option
    expectTypeOf(parseAddress).toBeCallableWith('a@x.com', { strict: true });
    // @ts-expect-error: overrides are booleans
    expectTypeOf(parseAddress).toBeCallableWith('a@x.com', { checkTld: 'yes' });
    // @ts-expect-error: overrides are booleans
    expectTypeOf(isValidSyntax).toBeCallableWith('a@x.com', { allowNoTld: 1 });
    // @ts-expect-error: maxLength is a number
    expectTypeOf(parseAddress).toBeCallableWith('a@x.com', { maxLength: '9' });
    // @ts-expect-error: options are an object or undefined
    expectTypeOf(createSyntaxValidator).toBeCallableWith(null);
    // @ts-expect-error: maxLength is a number
    expectTypeOf(parseAddress).toBeCallableWith('a@x.com', { maxLength: '9' });
    // @ts-expect-error: options are an object or undefined
    expectTypeOf(previewSyntaxOptions).toBeCallableWith('practical');
  });
});

describe('the entry points', () => {
  it('take a string and give a result or a boolean', () => {
    expectTypeOf(parseAddress).parameters.toEqualTypeOf<
      [email: string, options?: SyntaxOptions | undefined]
    >();
    expectTypeOf(parseAddress).returns.toEqualTypeOf<Result<ParsedAddress>>();
    expectTypeOf(isValidSyntax).parameters.toEqualTypeOf<
      [email: string, options?: SyntaxOptions | undefined]
    >();
    expectTypeOf(isValidSyntax).returns.toEqualTypeOf<boolean>();
  });

  it('reject a non-string address', () => {
    // @ts-expect-error: the address is a string
    expectTypeOf(parseAddress).toBeCallableWith(1);
    // @ts-expect-error: the address is a string
    expectTypeOf(isValidSyntax).toBeCallableWith(undefined);
    // @ts-expect-error: the address is a string
    expectTypeOf<SyntaxValidator['parse']>().toBeCallableWith(null);
  });

  it('bind the same pair in a validator', () => {
    expectTypeOf(
      createSyntaxValidator,
    ).returns.toEqualTypeOf<SyntaxValidator>();
    expectTypeOf<SyntaxValidator['parse']>().toEqualTypeOf<
      (email: string) => Result<ParsedAddress>
    >();
    expectTypeOf<SyntaxValidator['isValid']>().toEqualTypeOf<
      (email: string) => boolean
    >();
  });

  it('give a validator its maxLength, read-only', () => {
    expectTypeOf<SyntaxValidator['maxLength']>().toEqualTypeOf<number>();
    const validator = createSyntaxValidator();
    expectTypeOf(validator.maxLength).toEqualTypeOf<number>();
    // @ts-expect-error: maxLength is read-only
    validator.maxLength = 1024;
  });
});

describe('previewSyntaxOptions', () => {
  it('gives a failure’s reason only on invalid entries', () => {
    const { valid, invalid } = previewSyntaxOptions({ checkTld: false }, [
      'ada@example.com',
    ]);
    expectTypeOf(valid).toEqualTypeOf<ValidPreviewEntry[]>();
    expectTypeOf(invalid).toEqualTypeOf<InvalidPreviewEntry[]>();
    expectTypeOf<InvalidPreviewEntry['reason']>().toEqualTypeOf<ReasonCode>();
    expectTypeOf<ValidPreviewEntry>().not.toHaveProperty('reason');
  });

  it('takes a list of strings', () => {
    expectTypeOf(previewSyntaxOptions).toBeCallableWith(undefined, [
      'ada@example.com',
    ]);
    // @ts-expect-error: the addresses are strings
    expectTypeOf(previewSyntaxOptions).toBeCallableWith(undefined, [1]);
    expectTypeOf(previewSyntaxOptions).toBeCallableWith(
      undefined,
      // @ts-expect-error: the addresses are a list
      'ada@example.com',
    );
  });
});
