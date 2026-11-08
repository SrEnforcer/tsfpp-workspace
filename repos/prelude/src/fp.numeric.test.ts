/**
 * Brands, bounded numerics, the unit interval and Result sequencing — the
 * `@law` annotations of brand.ts, numeric.ts, unit-interval.ts and the
 * sequencing additions to traversals.ts, as properties (Rule 8.2).
 */

import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  type Result,
  checkNumber,
  clamp,
  clampUnitInterval,
  err,
  isErr,
  isOk,
  isSome,
  mkClampedBetween,
  mkInt,
  mkIntBetween,
  mkNonNegative,
  mkNumberBetween,
  mkPositive,
  mkPositiveInt,
  mkSafeInt,
  mkUnitInterval,
  multiplyUnitInterval,
  none,
  ok,
  ratio,
  refineBrand,
  refineNumber,
  sequenceArray,
  sequenceArrayAsync,
  some,
  traverseArray,
} from './index.js';

const anyNumber = fc.oneof(
  fc.double(),
  fc.integer(),
  fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 2 ** 53, -(2 ** 53), 2 ** 60),
);

const unitValue = fc.double({ min: 0, max: 1, noNaN: true });

describe('refineBrand', () => {
  it('accepts exactly what the predicate accepts', () => {
    const isEven = (n: number): boolean => n % 2 === 0;
    fc.assert(fc.property(fc.integer(), (n) => isSome(refineBrand<number, 'Even'>(isEven)(n)) === isEven(n)));
  });

  it('does not alter the value it brands', () => {
    fc.assert(fc.property(fc.string(), (s) => {
      const branded = refineBrand<string, 'Text'>(() => true)(s);
      return isSome(branded) && branded.value === s;
    }));
  });

  it('keeps the stock constructors on their predicates', () => {
    fc.assert(fc.property(anyNumber, (n) =>
      isSome(mkInt(n)) === Number.isInteger(n)
      && isSome(mkPositive(n)) === (Number.isFinite(n) && n > 0)
      && isSome(mkNonNegative(n)) === (Number.isFinite(n) && n >= 0)));
  });
});

describe('checkNumber', () => {
  it('with an empty spec accepts exactly the finite numbers', () => {
    fc.assert(fc.property(anyNumber, (n) => isOk(checkNumber({})(n)) === Number.isFinite(n)));
  });

  it('with integer accepts exactly the safe integers', () => {
    fc.assert(fc.property(anyNumber, (n) => isOk(checkNumber({ integer: true })(n)) === Number.isSafeInteger(n)));
  });

  it('returns the value unchanged when it passes', () => {
    fc.assert(fc.property(fc.double({ noNaN: true, noDefaultInfinity: true }), (n) => {
      const checked = checkNumber({})(n);
      return isOk(checked) && Object.is(checked.value, n);
    }));
  });

  it('reports the first issue in a fixed order', () => {
    const spec = { integer: true, minimum: 0, maximum: 10 };
    expect(checkNumber(spec)(Number.NaN)).toEqual(err({ kind: 'not-finite' }));
    expect(checkNumber(spec)(-0.5)).toEqual(err({ kind: 'not-integer' }));
    expect(checkNumber({ integer: true })(2 ** 60)).toEqual(err({ kind: 'not-safe-integer' }));
    expect(checkNumber(spec)(-1)).toEqual(err({ kind: 'below-minimum', minimum: 0 }));
    expect(checkNumber(spec)(11)).toEqual(err({ kind: 'above-maximum', maximum: 10 }));
    expect(checkNumber(spec)(10)).toEqual(ok(10));
  });

  it('agrees with refineNumber', () => {
    const spec = { integer: true, minimum: -5, maximum: 5 };
    fc.assert(fc.property(anyNumber, (n) => isOk(refineNumber<'Small'>(spec)(n)) === isOk(checkNumber(spec)(n))));
  });
});

describe('bounded constructors', () => {
  const bounds = fc.tuple(fc.integer({ min: -1000, max: 1000 }), fc.integer({ min: 0, max: 1000 }))
    .map(([lo, span]) => [lo, lo + span] as const);

  it('mkIntBetween accepts exactly the safe integers within the bounds', () => {
    fc.assert(fc.property(bounds, anyNumber, ([lo, hi], n) =>
      isSome(mkIntBetween<'B'>(lo, hi)(n)) === (Number.isSafeInteger(n) && lo <= n && n <= hi)));
  });

  it('mkNumberBetween accepts exactly the finite numbers within the bounds', () => {
    fc.assert(fc.property(bounds, anyNumber, ([lo, hi], n) =>
      isSome(mkNumberBetween<'B'>(lo, hi)(n)) === (Number.isFinite(n) && lo <= n && n <= hi)));
  });

  it('mkSafeInt and mkPositiveInt follow their predicates', () => {
    fc.assert(fc.property(anyNumber, (n) =>
      isSome(mkSafeInt(n)) === Number.isSafeInteger(n)
      && isSome(mkPositiveInt(n)) === (Number.isSafeInteger(n) && n >= 1)));
  });
});

describe('clamp', () => {
  const bounds = fc.tuple(fc.double({ noNaN: true, noDefaultInfinity: true }), fc.double({ noNaN: true, noDefaultInfinity: true }))
    .map(([a, b]): readonly [number, number] => (a <= b ? [a, b] : [b, a]));

  it('lands within the bounds, for every input', () => {
    fc.assert(fc.property(bounds, anyNumber, ([lo, hi], n) => {
      const clamped = clamp(lo, hi)(n);
      return lo <= clamped && clamped <= hi;
    }));
  });

  it('leaves a value within the bounds alone', () => {
    fc.assert(fc.property(bounds, fc.double({ min: 0, max: 1, noNaN: true }), ([lo, hi], t) => {
      const inside = lo + (hi - lo) * t;
      return !(lo <= inside && inside <= hi) || Object.is(clamp(lo, hi)(inside), inside);
    }));
  });

  it('keeps the sign of an in-bounds zero when a bound is -0', () => {
    expect(Object.is(clamp(0, -0)(0), 0)).toBe(true);
    expect(Object.is(clamp(-0, 0)(-0), -0)).toBe(true);
  });

  it('is idempotent', () => {
    fc.assert(fc.property(bounds, anyNumber, ([lo, hi], n) => clamp(lo, hi)(clamp(lo, hi)(n)) === clamp(lo, hi)(n)));
  });

  it('sends NaN to the minimum and infinities to the nearer bound', () => {
    expect(clamp(-1, 1)(Number.NaN)).toBe(-1);
    expect(clamp(-1, 1)(Number.POSITIVE_INFINITY)).toBe(1);
    expect(clamp(-1, 1)(Number.NEGATIVE_INFINITY)).toBe(-1);
  });

  it('mkClampedBetween is clamp, branded', () => {
    fc.assert(fc.property(anyNumber, (n) => mkClampedBetween<'B'>(0, 10)(n) === clamp(0, 10)(n)));
  });
});

describe('UnitInterval', () => {
  it('mkUnitInterval accepts exactly the finite numbers in [0, 1]', () => {
    fc.assert(fc.property(anyNumber, (n) => isSome(mkUnitInterval(n)) === (Number.isFinite(n) && n >= 0 && n <= 1)));
  });

  it('clampUnitInterval leaves [0, 1] alone and sends NaN to 0', () => {
    fc.assert(fc.property(unitValue, (n) => clampUnitInterval(n) === n));
    expect(clampUnitInterval(Number.NaN)).toBe(0);
    expect(clampUnitInterval(1.5)).toBe(1);
  });

  it('ratio of a whole to itself is 1, and of a non-positive whole 0', () => {
    fc.assert(fc.property(fc.double({ min: Number.MIN_VALUE, max: 1e300, noNaN: true }), (n) => ratio(n, n) === 1));
    fc.assert(fc.property(fc.double({ noNaN: true }), fc.double({ max: 0, noNaN: true }), (p, w) => ratio(p, w) === 0));
    expect(ratio(3, 2)).toBe(1);
    expect(ratio(1, 4)).toBe(0.25);
  });

  it('multiplyUnitInterval has 1 as identity, 0 as zero, and commutes', () => {
    fc.assert(fc.property(unitValue, unitValue, (x, y) => {
      const a = clampUnitInterval(x);
      const b = clampUnitInterval(y);
      return multiplyUnitInterval(a, clampUnitInterval(1)) === a
        && multiplyUnitInterval(a, clampUnitInterval(0)) === 0
        && multiplyUnitInterval(a, b) === multiplyUnitInterval(b, a);
    }));
  });
});

describe('sequenceArray', () => {
  const results = fc.array(fc.oneof(fc.integer().map((n) => ok(n)), fc.string().map((e) => err(e))));

  it('is traverseArray of the identity', () => {
    fc.assert(fc.property(results, (xs) =>
      JSON.stringify(sequenceArray(xs)) === JSON.stringify(traverseArray((r: Result<number, string>) => r)(xs))));
  });

  it('is ok([]) on the empty array', () => {
    expect(sequenceArray([])).toEqual(ok([]));
  });

  it('sequenceArrayAsync agrees with sequenceArray on resolved effects', async () => {
    await fc.assert(fc.asyncProperty(results, async (xs) =>
      JSON.stringify(await sequenceArrayAsync(xs.map((x) => Promise.resolve(x)))) === JSON.stringify(sequenceArray(xs))));
  });

  it('sequenceArrayAsync reports the first Err by position, not by settling order', async () => {
    // Settles a few microtasks after the second effect, which is already resolved.
    const late = async (): Promise<Result<number, string>> => {
      await Promise.resolve();
      await Promise.resolve();
      return err('first');
    };
    const outcome = await sequenceArrayAsync([late(), Promise.resolve(err('second'))]);
    expect(isErr(outcome) && outcome.error).toBe('first');
  });
});

describe('Option values from the barrel', () => {
  it('keep their usual shape', () => {
    expect(mkIntBetween<'Zoom'>(0, 22)(3)).toEqual(some(3));
    expect(mkIntBetween<'Zoom'>(0, 22)(23)).toEqual(none);
  });
});
