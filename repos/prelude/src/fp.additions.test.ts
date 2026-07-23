import { describe, expect, it } from 'vitest';
import {
  err,
  findO,
  getOrElseR,
  headNE,
  isFiniteNumber,
  isNone,
  isNonEmptyArray,
  isSome,
  lastNE,
  mapErr,
  matchOption,
  matchResult,
  mkInt,
  mkNonEmpty,
  mkNonNegative,
  mkPositive,
  none,
  ok,
  some,
  type NonEmptyReadonlyArray,
} from './fp.js';

describe('total eliminators', () => {
  it('matchOption dispatches on the present variant', () => {
    const render = matchOption(
      () => 'anonymous',
      (name: string) => name,
    );
    expect(render(some('ada'))).toBe('ada');
    expect(render(none)).toBe('anonymous');
  });

  it('matchOption obeys its variant laws', () => {
    const n = (): number => -1;
    const s = (a: number): number => a * 2;
    expect(matchOption(n, s)(none)).toBe(n());
    expect(matchOption(n, s)(some(21))).toBe(s(21));
  });

  it('matchResult dispatches with the error handler first', () => {
    const status = matchResult(
      (e: string) => `err:${e}`,
      (a: number) => `ok:${a}`,
    );
    expect(status(ok(1))).toBe('ok:1');
    expect(status(err('boom'))).toBe('err:boom');
  });

  it('getOrElseR unwraps or computes from the error', () => {
    expect(getOrElseR((e: string) => e.length)(ok(9))).toBe(9);
    expect(getOrElseR((e: string) => e.length)(err('four'))).toBe(4);
  });
});

describe('mapErr', () => {
  it('remaps the error channel and leaves Ok untouched', () => {
    const tag = mapErr((e: string) => ({ kind: 'io_error', message: e }) as const);
    expect(tag(ok<number, string>(3))).toEqual(ok(3));
    expect(tag(err<string, number>('disk'))).toEqual(
      err({ kind: 'io_error', message: 'disk' }),
    );
  });

  it('obeys the identity law', () => {
    const idErr = mapErr((e: string) => e);
    expect(idErr(err('x'))).toEqual(err('x'));
    expect(idErr(ok(1))).toEqual(ok(1));
  });

  it('obeys the fusion law', () => {
    const f = (e: number): number => e + 1;
    const g = (e: number): string => `#${e}`;
    const composed = mapErr((e: number) => g(f(e)));
    const chained = (r: ReturnType<typeof err<number, string>>): unknown =>
      mapErr(g)(mapErr(f)(r));
    expect(composed(err(1))).toEqual(chained(err(1)));
  });
});

describe('findO', () => {
  it('returns Some for a match and None otherwise', () => {
    const found = findO((n: number) => n > 2)([1, 2, 3]);
    expect(isSome(found) && found.value).toBe(3);
    expect(isNone(findO((n: number) => n > 9)([1, 2, 3]))).toBe(true);
  });

  it('returns None on the empty array', () => {
    expect(isNone(findO(() => true)([]))).toBe(true);
  });
});

describe('non-empty arrays', () => {
  it('isNonEmptyArray narrows correctly', () => {
    expect(isNonEmptyArray([1])).toBe(true);
    expect(isNonEmptyArray([])).toBe(false);
  });

  it('mkNonEmpty gates construction on non-emptiness', () => {
    const built = mkNonEmpty([10, 20]);
    expect(isSome(built)).toBe(true);
    expect(isNone(mkNonEmpty([]))).toBe(true);
  });

  it('headNE and lastNE are total on the refined type', () => {
    const xs: NonEmptyReadonlyArray<number> = [7, 8, 9];
    expect(headNE(xs)).toBe(7);
    expect(lastNE(xs)).toBe(9);
  });

  it('headNE equals lastNE for a singleton', () => {
    const xs: NonEmptyReadonlyArray<string> = ['solo'];
    expect(headNE(xs)).toBe(lastNE(xs));
  });
});

describe('refined numerics', () => {
  it('isFiniteNumber rejects NaN and infinities', () => {
    expect(isFiniteNumber(1.5)).toBe(true);
    expect(isFiniteNumber(Number.NaN)).toBe(false);
    expect(isFiniteNumber(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it('mkInt accepts integers only', () => {
    expect(isSome(mkInt(4))).toBe(true);
    expect(isNone(mkInt(4.5))).toBe(true);
    expect(isNone(mkInt(Number.NaN))).toBe(true);
  });

  it('mkPositive requires a finite value strictly above zero', () => {
    expect(isSome(mkPositive(0.001))).toBe(true);
    expect(isNone(mkPositive(0))).toBe(true);
    expect(isNone(mkPositive(-1))).toBe(true);
    expect(isNone(mkPositive(Number.POSITIVE_INFINITY))).toBe(true);
  });

  it('mkNonNegative admits zero but not negatives or NaN', () => {
    expect(isSome(mkNonNegative(0))).toBe(true);
    expect(isSome(mkNonNegative(3))).toBe(true);
    expect(isNone(mkNonNegative(-0.0001))).toBe(true);
    expect(isNone(mkNonNegative(Number.NaN))).toBe(true);
  });
});
