import { describe, expect, it } from 'vitest';
import {
  absurd,
  appendList,
  cons,
  err,
  filterList,
  flatMap,
  flatMapList,
  flatMapO,
  foldList,
  foldLeftListCurried,
  fromArray,
  fromNullable,
  fromUnknownArray,
  fromUnknownArrayOf,
  fromUnknownString,
  getOrElse,
  headList,
  isEmptyList,
  isErr,
  isNone,
  isOk,
  isRecord,
  isSome,
  lengthList,
  map,
  mapList,
  mapO,
  nil,
  none,
  ok,
  orElse,
  reverseList,
  singletonList,
  some,
  tailList,
  tap,
  tapErr,
  toArray,
  toNullable,
  traverseArray,
  traverseList,
  tryCatch,
  tryCatchAsync,
  unique,
} from './fp.js';

describe('prelude result combinators', () => {
  it('map transforms Ok values', () => {
    const result = map((n: number) => n * 2)(ok<number, string>(2));

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe(4);
    }
  });

  it('flatMap short-circuits Err values', () => {
    const result = flatMap((n: number) => ok<number, string>(n + 1))(err<string, number>('boom'));

    expect(isErr(result)).toBe(true);
  });

  it('map satisfies identity law', () => {
    const r = ok<number, string>(42);
    expect(map((x: number) => x)(r)).toEqual(r);
  });

  it('map satisfies composition law', () => {
    const r = ok<number, string>(3);
    const f = (n: number): number => n + 1;
    const g = (n: number): number => n * 2;

    expect(map((x: number) => f(g(x)))(r)).toEqual(map(f)(map(g)(r)));
  });

  it('flatMap satisfies left identity law', () => {
    const f = (n: number): ReturnType<typeof ok<number, string>> => ok(n + 1);
    expect(flatMap(f)(ok(5))).toEqual(f(5));
  });

  it('flatMap satisfies right identity law', () => {
    const r = ok<number, string>(7);
    expect(flatMap(ok<number, string>)(r)).toEqual(r);
  });
});

// eslint-disable-next-line max-lines-per-function
describe('prelude option combinators / construction and extraction', () => {
  it('some constructs a present value', () => {
    const o = some(42);
    expect(isSome(o)).toBe(true);
    if (isSome(o)) {
      expect(o.value).toBe(42);
    }
  });

  it('none is absent', () => {
    expect(isNone(none)).toBe(true);
    expect(isSome(none)).toBe(false);
  });

  it('fromNullable wraps non-null values', () => {
    expect(isSome(fromNullable(1))).toBe(true);
    expect(isNone(fromNullable(null))).toBe(true);
    expect(isNone(fromNullable(undefined))).toBe(true);
  });

  it('fromUnknownString wraps strings (including empty)', () => {
    expect(fromUnknownString('abc')).toEqual(some('abc'));
    expect(fromUnknownString('')).toEqual(some(''));
  });

  it('fromUnknownString returns None for non-strings', () => {
    expect(fromUnknownString(1)).toEqual(none);
    expect(fromUnknownString(null)).toEqual(none);
    expect(fromUnknownString(undefined)).toEqual(none);
    expect(fromUnknownString({ value: 'x' })).toEqual(none);
  });

  it('fromUnknownArray wraps arrays', () => {
    const result = fromUnknownArray(['a', 'b']);
    expect(result).toEqual(some(['a', 'b']));
  });

  it('fromUnknownArray returns None for non-arrays', () => {
    expect(fromUnknownArray('abc')).toEqual(none);
    expect(fromUnknownArray(null)).toEqual(none);
    expect(fromUnknownArray(undefined)).toEqual(none);
    expect(fromUnknownArray({ value: 'x' })).toEqual(none);
  });

  it('fromUnknownArrayOf wraps arrays when every element satisfies the guard', () => {
    const isString = (value: unknown): value is string => typeof value === 'string';
    const result = fromUnknownArrayOf(isString)(['a', 'b']);
    expect(result).toEqual(some(['a', 'b']));
  });

  it('fromUnknownArrayOf returns None for mixed arrays', () => {
    const isString = (value: unknown): value is string => typeof value === 'string';
    expect(fromUnknownArrayOf(isString)(['a', 1])).toEqual(none);
  });

  it('getOrElse returns value for Some', () => {
    expect(getOrElse(() => 0)(some(5))).toBe(5);
  });

  it('getOrElse returns fallback for None', () => {
    expect(getOrElse(() => 99)(none)).toBe(99);
  });
});

describe('prelude option combinators / combinators', () => {
  it('mapO transforms Some', () => {
    const result = mapO((n: number) => n * 3)(some(4));
    expect(isSome(result) && result.value).toBe(12);
  });

  it('mapO passes None through', () => {
    expect(isNone(mapO((n: number) => n)(none))).toBe(true);
  });

  it('mapO satisfies identity law', () => {
    const o = some(10);
    expect(mapO((x: number) => x)(o)).toEqual(o);
  });

  it('flatMapO chains Some', () => {
    const result = flatMapO((n: number) => some(n + 1))(some(9));
    expect(isSome(result) && result.value).toBe(10);
  });

  it('flatMapO short-circuits None', () => {
    expect(isNone(flatMapO((n: number) => some(n))(none))).toBe(true);
  });

  it('orElse returns first Some', () => {
    expect(orElse(() => some(99))(some(1))).toEqual(some(1));
  });

  it('orElse falls back on None', () => {
    expect(orElse(() => some(99))(none)).toEqual(some(99));
  });
});

describe('prelude tryCatch', () => {
  it('captures thrown errors as Err', () => {
    const result = tryCatch(
      () => { throw new Error('oops'); }, // eslint-disable-line functional/no-throw-statements -- intentional: testing that tryCatch captures thrown errors
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
      () => Promise.reject(new Error('async oops')),
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

describe('prelude toNullable', () => {
  it('returns the value for Some', () => {
    expect(toNullable(some(7))).toBe(7);
  });

  it('returns null for None', () => {
    expect(toNullable(none)).toBe(null);
  });

  it('is left inverse of fromNullable for non-null values', () => {
    expect(toNullable(fromNullable('x'))).toBe('x');
  });

  it('is left inverse of fromNullable for null', () => {
    expect(toNullable(fromNullable(null))).toBe(null);
  });
});

describe('prelude traverseArray', () => {
  it('collects all Ok values', () => {
    const result = traverseArray((n: number) => ok<number, string>(n * 2))([1, 2, 3]);
    expect(isOk(result) && result.value).toEqual([2, 4, 6]);
  });

  it('returns ok([]) for empty array', () => {
    const result = traverseArray((n: number) => ok<number, string>(n))([]);
    expect(isOk(result) && result.value).toEqual([]);
  });

  it('short-circuits on first Err, returning that Err', () => {
    const result = traverseArray((n: number) =>
      n === 2 ? err<string, number>('bad at 2') : ok<number, string>(n),
    )([1, 2, 3]);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBe('bad at 2');
    }
  });

  it('satisfies traverseArray(ok)(items) ≡ ok(items)', () => {
    const items = [10, 20, 30] as const;
    const result = traverseArray((n: number) => ok<number, never>(n))([...items]);
    expect(isOk(result) && result.value).toEqual([10, 20, 30]);
  });
});

describe('prelude unique', () => {
  it('returns empty array for empty input', () => {
    expect(unique([])).toEqual([]);
  });

  it('preserves order of first occurrences', () => {
    expect(unique([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('removes duplicate primitives', () => {
    expect(unique([1, 2, 1, 3, 2])).toEqual([1, 2, 3]);
  });

  it('works with strings', () => {
    expect(unique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('is idempotent: unique(unique(xs)) ≡ unique(xs)', () => {
    const xs = [3, 1, 2, 1, 3];
    expect(unique(unique(xs))).toEqual(unique(xs));
  });
});

// eslint-disable-next-line max-lines-per-function
describe('prelude list / construction and extraction', () => {
  it('nil is empty', () => {
    expect(isEmptyList(nil)).toBe(true);
  });

  it('singletonList constructs a one-element list', () => {
    const l = singletonList(42);
    expect(isEmptyList(l)).toBe(false);
    const h = headList(l);
    expect(isSome(h) && h.value).toBe(42);
  });

  it('cons prepends an element', () => {
    const l = cons(1)(cons(2)(nil));
    const h = headList(l);
    expect(isSome(h) && h.value).toBe(1);
  });

  it('fromArray converts array to list', () => {
    const l = fromArray([1, 2, 3]);
    expect(toArray(l)).toEqual([1, 2, 3]);
  });

  it('toArray converts list to array', () => {
    const l = cons(1)(cons(2)(cons(3)(nil)));
    expect(toArray(l)).toEqual([1, 2, 3]);
  });

  it('fromArray(toArray(l)) ≡ l (roundtrip)', () => {
    const original = cons(10)(cons(20)(nil));
    const converted = fromArray(toArray(original));
    expect(toArray(converted)).toEqual(toArray(original));
  });

  it('headList returns Some for non-empty list', () => {
    const l = singletonList(99);
    const h = headList(l);
    expect(isSome(h) && h.value).toBe(99);
  });

  it('headList returns None for empty list', () => {
    expect(isNone(headList(nil))).toBe(true);
  });

  it('tailList returns tail', () => {
    const l = cons(1)(cons(2)(cons(3)(nil)));
    const t = tailList(l);
    expect(toArray(t)).toEqual([2, 3]);
  });

  it('tailList returns nil for singleton', () => {
    const t = tailList(singletonList(1));
    expect(isEmptyList(t)).toBe(true);
  });

  it('lengthList counts elements', () => {
    expect(lengthList(nil)).toBe(0);
    expect(lengthList(singletonList(1))).toBe(1);
    expect(lengthList(fromArray([1, 2, 3]))).toBe(3);
  });
});

describe('prelude list / combinators', () => {
  it('mapList transforms elements', () => {
    const l = fromArray([1, 2, 3]);
    const result = mapList((n: number) => n * 2)(l);
    expect(toArray(result)).toEqual([2, 4, 6]);
  });

  it('mapList satisfies identity law', () => {
    const l = fromArray([1, 2, 3]);
    expect(toArray(mapList((x: number) => x)(l))).toEqual(toArray(l));
  });

  it('flatMapList chains lists', () => {
    const l = fromArray([1, 2]);
    const result = flatMapList((n: number) => fromArray([n, n * 10]))(l);
    expect(toArray(result)).toEqual([1, 10, 2, 20]);
  });

  it('flatMapList with singletonList is identity', () => {
    const l = fromArray([1, 2, 3]);
    const result = flatMapList(singletonList)(l);
    expect(toArray(result)).toEqual(toArray(l));
  });

  it('filterList retains matching elements', () => {
    const l = fromArray([1, 2, 3, 4, 5]);
    const result = filterList((n: number) => n % 2 === 0)(l);
    expect(toArray(result)).toEqual([2, 4]);
  });

  it('filterList returns nil for no matches', () => {
    const l = fromArray([1, 3, 5]);
    const result = filterList((n: number) => n % 2 === 0)(l);
    expect(isEmptyList(result)).toBe(true);
  });
});

describe('prelude list / folding', () => {
  it('foldList right-associates', () => {
    const l = fromArray([1, 2, 3]);
    const result = foldList(
      0,
      (a: number) => (b: number): number => a + b,
      l,
    );
    expect(result).toBe(6);
  });

  it('foldLeftListCurried left-associates', () => {
    const l = fromArray([1, 2, 3]);
    const result = foldLeftListCurried<number, number>(0)(
      (acc: number) => (a: number): number => acc + a,
    )(l);
    expect(result).toBe(6);
  });

  it('foldList returns init for empty list', () => {
    const result = foldList(99, (): ((value: number) => number) => () => 0, nil);
    expect(result).toBe(99);
  });
});

describe('prelude list / operations', () => {
  it('appendList concatenates lists', () => {
    const l1 = fromArray([1, 2]);
    const l2 = fromArray([3, 4]);
    const result = appendList(l1)(l2);
    expect(toArray(result)).toEqual([1, 2, 3, 4]);
  });

  it('appendList(nil)(l) ≡ l', () => {
    const l = fromArray([1, 2]);
    expect(toArray(appendList(nil as unknown as typeof l)(l))).toEqual(toArray(l)); // eslint-disable-line @typescript-eslint/consistent-type-assertions
  });

  it('appendList(l)(nil) ≡ l', () => {
    const l = fromArray([1, 2]);
    expect(toArray(appendList(l)(nil as unknown as typeof l))).toEqual(toArray(l)); // eslint-disable-line @typescript-eslint/consistent-type-assertions
  });

  it('reverseList reverses order', () => {
    const l = fromArray([1, 2, 3]);
    const result = reverseList(l);
    expect(toArray(result)).toEqual([3, 2, 1]);
  });

  it('reverseList is involutive', () => {
    const l = fromArray([1, 2, 3]);
    expect(toArray(reverseList(reverseList(l)))).toEqual(toArray(l));
  });

  it('traverseList collects all Ok', () => {
    const l = fromArray([1, 2, 3]);
    const result = traverseList((n: number) => ok<number, string>(n * 2))(l);
    expect(isOk(result) && toArray(result.value)).toEqual([2, 4, 6]);
  });

  it('traverseList short-circuits on first Err', () => {
    const l = fromArray([1, 2, 3]);
    const result = traverseList((n: number) =>
      n === 2 ? err<string, number>('bad') : ok<number, string>(n),
    )(l);
    expect(isErr(result)).toBe(true);
  });
});
