import { describe, expect, it } from 'vitest';
import {
  err,
  flatMap,
  flatMapOption,
  fromNullable,
  fromUnknownArray,
  fromUnknownArrayOf,
  fromUnknownString,
  getOrElseOption,
  isDefined,
  isErr,
  isNone,
  isOk,
  isSome,
  map,
  mapOption,
  none,
  ok,
  orElseOption,
  some,
  unit,
  comp,
  complement,
  flow,
  pipe,
  type Unit,
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

describe('prelude unit type', () => {
  it('unit is undefined', () => {
    expect(unit).toBeUndefined();
  });

  it('unit satisfies the Unit type', () => {
    const typed: Unit = unit;
    expect(typed).toBeUndefined();
  });

  it('ok(unit) produces a valid Ok result', () => {
    const r: ReturnType<typeof ok<Unit, string>> = ok(unit);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value).toBeUndefined();
    }
  });

  it('Result<Unit, E> round-trips through map', () => {
    const r = ok<Unit, string>(unit);
    expect(map((_: Unit): Unit => unit)(r)).toEqual(r);
  });
});

describe('prelude pipe', () => {
  it('returns value unchanged with no functions', () => {
    expect(pipe(42)).toBe(42);
  });

  it('threads value through a single function', () => {
    expect(pipe(3, (n: number) => n * 2)).toBe(6);
  });

  it('threads value left-to-right through multiple functions', () => {
    const result = pipe(
      '  hello  ',
      (s: string) => s.trim(),
      (s: string) => s.toUpperCase(),
      (s: string) => `${s}!`,
    );
    expect(result).toBe('HELLO!');
  });

  it('satisfies identity law: pipe(a, x => x) ≡ a', () => {
    expect(pipe(99, (x: number) => x)).toBe(99);
  });

  it('satisfies associativity: pipe(a, f, g) ≡ pipe(pipe(a, f), g)', () => {
    const f = (n: number): number => n + 1;
    const g = (n: number): number => n * 3;
    expect(pipe(4, f, g)).toBe(pipe(pipe(4, f), g));
  });

  it('composes with Result combinators', () => {
    const result = pipe(
      ok<number, string>(2),
      map((n: number) => n * 10),
      flatMap((n: number) => (n > 5 ? ok(n) : err('too small'))),
    );
    expect(isOk(result) && result.value).toBe(20);
  });
});

describe('prelude comp', () => {
  it('applies a single function', () => {
    const double = comp((n: number) => n * 2);
    expect(double(5)).toBe(10);
  });

  it('composes two functions right-to-left', () => {
    const f = (n: number): number => n + 1;
    const g = (n: number): number => n * 2;
    // comp(f, g)(x) ≡ f(g(x))
    expect(comp(f, g)(3)).toBe(f(g(3)));
  });

  it('composes three functions right-to-left', () => {
    const trim = (s: string): string => s.trim();
    const upper = (s: string): string => s.toUpperCase();
    const exclaim = (s: string): string => `${s}!`;
    expect(comp(exclaim, upper, trim)('  hi  ')).toBe('HI!');
  });

  it('satisfies double negation law with complement', () => {
    const process = comp(
      (n: number) => n * 2,
      (n: number) => n + 1,
    );
    // order: first +1, then *2
    expect(process(4)).toBe(10);
  });

  it('satisfies associativity: comp(f, comp(g, h)) ≡ comp(f, g, h)', () => {
    const f = (n: number): number => n - 1;
    const g = (n: number): number => n * 3;
    const h = (n: number): number => n + 2;
    expect(comp(f, comp(g, h))(5)).toBe(comp(f, g, h)(5));
  });
});

describe('prelude complement', () => {
  it('inverts a boolean predicate', () => {
    const isEven = (n: number): boolean => n % 2 === 0;
    const isOdd = complement(isEven);
    expect(isOdd(3)).toBe(true);
    expect(isOdd(4)).toBe(false);
  });

  it('inverts a type guard (returns plain boolean)', () => {
    const notNone = complement(isNone);
    expect(notNone(some(1))).toBe(true);
    expect(notNone(none)).toBe(false);
  });

  it('satisfies double negation: complement(complement(f))(x) ≡ f(x)', () => {
    const isPositive = (n: number): boolean => n > 0;
    expect(complement(complement(isPositive))(5)).toBe(isPositive(5));
    expect(complement(complement(isPositive))(-1)).toBe(isPositive(-1));
  });

  it('satisfies De Morgan pointwise: complement(f)(x) ≡ !f(x)', () => {
    const gt10 = (n: number): boolean => n > 10;
    expect(complement(gt10)(15)).toBe(!gt10(15));
    expect(complement(gt10)(5)).toBe(!gt10(5));
  });
});

// eslint-disable-next-line max-lines-per-function
describe('prelude flow', () => {
  it('applies a single function', () => {
    expect(flow((n: number) => n * 2)(5)).toBe(10);
  });

  it('threads value left-to-right through multiple functions', () => {
    const normalise = flow(
      (s: string) => s.trim(),
      (s: string) => s.toUpperCase(),
      (s: string) => `${s}!`,
    );
    expect(normalise('  hello  ')).toBe('HELLO!');
  });

  it('satisfies relationship to pipe: flow(f, g)(x) ≡ pipe(x, f, g)', () => {
    const f = (n: number): number => n + 1;
    const g = (n: number): number => n * 3;
    expect(flow(f, g)(4)).toBe(pipe(4, f, g));
  });

  it('satisfies relationship to comp: flow(f, g)(x) ≡ comp(g, f)(x)', () => {
    const f = (n: number): number => n + 1;
    const g = (n: number): number => n * 3;
    expect(flow(f, g)(4)).toBe(comp(g, f)(4));
  });

  it('satisfies identity law: flow(f)(x) ≡ f(x)', () => {
    const f = (n: number): number => n * 7;
    expect(flow(f)(3)).toBe(f(3));
  });

  it('satisfies associativity: flow(f, flow(g, h))(x) ≡ flow(f, g, h)(x)', () => {
    const f = (n: number): number => n + 1;
    const g = (n: number): number => n * 2;
    const h = (n: number): number => n - 3;
    expect(flow(f, flow(g, h))(5)).toBe(flow(f, g, h)(5));
  });

  it('composes with Result combinators', () => {
    const process = flow(
      map((n: number) => n * 10),
      flatMap((n: number) => (n > 5 ? ok(n) : err('too small'))),
    );
    const result = process(ok<number, string>(2));
    expect(isOk(result) && result.value).toBe(20);
  });
});

// eslint-disable-next-line max-lines-per-function
describe('prelude option combinators / construction and extraction', () => {
  it('isDefined narrows undefined in filter pipelines', () => {
    const values: ReadonlyArray<number | undefined> = [1, undefined, 2, undefined, 3];

    expect(values.filter(isDefined)).toEqual([1, 2, 3]);
  });

  it('isDefined only excludes undefined (null is preserved)', () => {
    const values: ReadonlyArray<number | null | undefined> = [1, null, undefined, 2];

    expect(values.filter(isDefined)).toEqual([1, null, 2]);
  });

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

  it('getOrElseOption returns value for Some', () => {
    expect(getOrElseOption(() => 0)(some(5))).toBe(5);
  });

  it('getOrElseOption returns fallback for None', () => {
    expect(getOrElseOption(() => 99)(none)).toBe(99);
  });
});

describe('prelude option combinators / combinators', () => {
  it('mapOption transforms Some', () => {
    const result = mapOption((n: number) => n * 3)(some(4));
    expect(isSome(result) && result.value).toBe(12);
  });

  it('mapOption passes None through', () => {
    expect(isNone(mapOption((n: number) => n)(none))).toBe(true);
  });

  it('mapOption satisfies identity law', () => {
    const o = some(10);
    expect(mapOption((x: number) => x)(o)).toEqual(o);
  });

  it('flatMapOption chains Some', () => {
    const result = flatMapOption((n: number) => some(n + 1))(some(9));
    expect(isSome(result) && result.value).toBe(10);
  });

  it('flatMapOption short-circuits None', () => {
    expect(isNone(flatMapOption((n: number) => some(n))(none))).toBe(true);
  });

  it('orElseOption returns first Some', () => {
    expect(orElseOption(() => some(99))(some(1))).toEqual(some(1));
  });

  it('orElseOption falls back on None', () => {
    expect(orElseOption(() => some(99))(none)).toEqual(some(99));
  });
});

