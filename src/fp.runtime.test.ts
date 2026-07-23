import { describe, expect, it } from 'vitest';
import {
  absurd,
  err,
  getBooleanField,
  getNumberField,
  getStringField,
  getTypedField,
  isErr,
  isOk,
  isRecord,
  none,
  ok,
  some,
  tap,
  tapErr,
  tryCatch,
  tryCatchAsync,
} from './fp.js';

describe('prelude tryCatch', () => {
  it('captures thrown errors as Err', () => {
    const result = tryCatch(
      () => { throw 'oops'; }, // eslint-disable-line functional/no-throw-statements -- intentional: testing that tryCatch captures thrown errors
      (e) => String(e),
    );
    expect(isErr(result)).toBe(true);
  });

  it('wraps successful return as Ok', () => {
    const result = tryCatch(() => 42, String);
    expect(isOk(result) && result.value).toBe(42);
  });
});

describe('prelude tryCatchAsync', () => {
  it('captures rejected promises as Err', async () => {
    const result = await tryCatchAsync(
      () => Promise.reject('async oops'),
      (e) => String(e),
    );
    expect(isErr(result)).toBe(true);
  });

  it('wraps resolved promise as Ok', async () => {
    const result = await tryCatchAsync(() => Promise.resolve(7), String);
    expect(isOk(result) && result.value).toBe(7);
  });
});

describe('prelude tap / tapErr', () => {
  it('tap calls observer for Ok and returns input', () => {
    const seen: number[] = []; // eslint-disable-line functional/prefer-readonly-type
    const r = ok<number, string>(3);
    const out = tap((n: number) => { seen.push(n); })(r); // eslint-disable-line functional/immutable-data
    expect(seen).toEqual([3]);
    expect(out).toEqual(r);
  });

  it('tap ignores Err', () => {
    const seen: number[] = []; // eslint-disable-line functional/prefer-readonly-type
    tap((n: number) => { seen.push(n); })(err<string, number>('e')); // eslint-disable-line functional/immutable-data
    expect(seen).toHaveLength(0);
  });

  it('tapErr calls observer for Err and returns input', () => {
    const seen: string[] = []; // eslint-disable-line functional/prefer-readonly-type
    const r = err<string, number>('bad');
    const out = tapErr((e: string) => { seen.push(e); })(r); // eslint-disable-line functional/immutable-data
    expect(seen).toEqual(['bad']);
    expect(out).toEqual(r);
  });
});

describe('prelude absurd', () => {
  it('throws on invocation (never-type witness)', () => {
    expect(() => absurd(undefined as never)).toThrow(); // eslint-disable-line @typescript-eslint/consistent-type-assertions -- test-only: force never-type to invoke absurd
  });
});

describe('prelude isRecord', () => {
  it('returns true for plain objects', () => {
    expect(isRecord({ a: 1 })).toBe(true);
  });

  it('returns false for arrays', () => {
    expect(isRecord([1, 2])).toBe(false);
  });

  it('returns false for null', () => {
    expect(isRecord(null)).toBe(false);
  });

  it('returns false for primitives', () => {
    expect(isRecord('hello')).toBe(false);
    expect(isRecord(42)).toBe(false);
  });
});

// eslint-disable-next-line max-lines-per-function
describe('prelude typed record field getters', () => {
  it('getStringField returns Some for non-empty strings', () => {
    const record = { name: 'Ada' };
    const result = getStringField(record, 'name');
    expect(result).toEqual(some('Ada'));
  });

  it('getStringField returns None for empty and whitespace-only strings', () => {
    expect(getStringField({ name: '' }, 'name')).toEqual(none);
    expect(getStringField({ name: '   ' }, 'name')).toEqual(none);
  });

  it('getStringField preserves leading and trailing whitespace in valid strings', () => {
    expect(getStringField({ name: '  Ada  ' }, 'name')).toEqual(some('  Ada  '));
  });

  it('getStringField returns None for missing or non-string fields', () => {
    expect(getStringField({}, 'name')).toEqual(none);
    expect(getStringField({ name: 1 }, 'name')).toEqual(none);
    expect(getStringField({ name: null }, 'name')).toEqual(none);
  });

  it('getNumberField returns Some for finite numbers', () => {
    expect(getNumberField({ count: 0 }, 'count')).toEqual(some(0));
    expect(getNumberField({ count: 42.5 }, 'count')).toEqual(some(42.5));
    expect(getNumberField({ count: -7 }, 'count')).toEqual(some(-7));
  });

  it('getNumberField returns None for non-finite and non-number fields', () => {
    expect(getNumberField({ count: Number.NaN }, 'count')).toEqual(none);
    expect(getNumberField({ count: Number.POSITIVE_INFINITY }, 'count')).toEqual(none);
    expect(getNumberField({ count: Number.NEGATIVE_INFINITY }, 'count')).toEqual(none);
    expect(getNumberField({ count: '42' }, 'count')).toEqual(none);
    expect(getNumberField({ count: null }, 'count')).toEqual(none);
    expect(getNumberField({}, 'count')).toEqual(none);
  });

  it('getBooleanField returns Some for booleans', () => {
    expect(getBooleanField({ enabled: true }, 'enabled')).toEqual(some(true));
    expect(getBooleanField({ enabled: false }, 'enabled')).toEqual(some(false));
  });

  it('getBooleanField returns None for missing or non-boolean fields', () => {
    expect(getBooleanField({}, 'enabled')).toEqual(none);
    expect(getBooleanField({ enabled: 'true' }, 'enabled')).toEqual(none);
    expect(getBooleanField({ enabled: 1 }, 'enabled')).toEqual(none);
    expect(getBooleanField({ enabled: null }, 'enabled')).toEqual(none);
  });

  it('getTypedField returns Some when predicate matches', () => {
    const isId = (value: unknown): value is { readonly id: string } =>
      isRecord(value) && typeof value['id'] === 'string';

    expect(getTypedField({ user: { id: 'u-1' } }, 'user', isId)).toEqual(some({ id: 'u-1' }));
  });

  it('getTypedField returns None for missing fields or failed predicates', () => {
    const isPositiveInteger = (value: unknown): value is number =>
      typeof value === 'number' && Number.isInteger(value) && value > 0;

    expect(getTypedField({}, 'count', isPositiveInteger)).toEqual(none);
    expect(getTypedField({ count: -1 }, 'count', isPositiveInteger)).toEqual(none);
    expect(getTypedField({ count: '1' }, 'count', isPositiveInteger)).toEqual(none);
  });
});
