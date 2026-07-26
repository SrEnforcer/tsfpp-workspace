import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { type NonEmptyReadonlyArray, isNone, isSome, mkNonEmpty, none, some, unique } from './fp.js';
import {
  type Eq,
  elemWith,
  eqArray,
  eqBoolean,
  eqBy,
  eqNumber,
  eqOption,
  eqStrict,
  eqString,
  eqStructural,
  lookupWith,
  maxWith,
  minWith,
  mkEq,
  mkOrd,
  ordBoolean,
  ordBy,
  ordNumber,
  ordString,
  ordThen,
  reverseOrd,
  sortWith,
  structuralEquals,
  uniqueWith,
} from './eq.js';

const num = fc.integer({ min: -1000, max: 1000 });

/** Small JSON-ish generator: exercises the recursive branches of structuralEquals. */
const jsonish = fc.letrec((tie) => ({
  value: fc.oneof(
    { depthSize: 'small' },
    fc.integer(),
    fc.string(),
    fc.boolean(),
    fc.constant(null),
    fc.array(tie('value'), { maxLength: 4 }),
    fc.dictionary(fc.string({ maxLength: 4 }), tie('value'), { maxKeys: 4 }),
  ),
})).value;

// ---------------------------------------------------------------------------
// The bug this module exists to fix
// ---------------------------------------------------------------------------

describe('the === problem', () => {
  it('=== is reference equality: identical records are NOT equal', () => {
    // Written through bindings on purpose: `{ id: 1 } === { id: 1 }` is rejected
    // outright by tsc (TS2839 "JavaScript compares objects by reference, not
    // value") — the compiler makes this module's argument for us.
    const a = { id: 1 };
    const b = { id: 1 };
    expect(a === b).toBe(false);
    expect(structuralEquals(a, b)).toBe(true);
  });

  it('unique keeps structurally-identical records (documented, reference-based)', () => {
    expect(unique([{ id: 1 }, { id: 1 }])).toHaveLength(2);
  });

  it('uniqueWith(eqStructural) collapses them — the fix', () => {
    expect(uniqueWith(eqStructural<{ readonly id: number }>())([{ id: 1 }, { id: 1 }])).toHaveLength(1);
  });

  it('unique and uniqueWith(eqStrict) agree — uniqueWith generalises it', () => {
    fc.assert(
      fc.property(fc.array(num), (xs) => {
        expect(uniqueWith(eqStrict<number>())(xs)).toEqual(unique(xs));
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Eq laws — reflexive, symmetric, transitive
// ---------------------------------------------------------------------------

const eqLaws = <A>(name: string, eqA: Eq<A>, arb: fc.Arbitrary<A>): void => {
  describe(`Eq laws — ${name}`, () => {
    it('reflexive: equals(x, x)', () => {
      fc.assert(fc.property(arb, (x) => { expect(eqA.equals(x, x)).toBe(true); }));
    });

    it('symmetric: equals(x, y) ≡ equals(y, x)', () => {
      fc.assert(
        fc.property(arb, arb, (x, y) => {
          expect(eqA.equals(x, y)).toBe(eqA.equals(y, x));
        }),
      );
    });

    it('transitive: equals(x, y) && equals(y, z) ⇒ equals(x, z)', () => {
      fc.assert(
        fc.property(arb, arb, arb, (x, y, z) => {
          if (eqA.equals(x, y) && eqA.equals(y, z)) expect(eqA.equals(x, z)).toBe(true);
        }),
      );
    });
  });
};

eqLaws('eqNumber', eqNumber, num);
eqLaws('eqString', eqString, fc.string());
eqLaws('eqBoolean', eqBoolean, fc.boolean());
eqLaws('eqStructural', eqStructural<unknown>(), jsonish);
eqLaws('eqArray(eqNumber)', eqArray(eqNumber), fc.array(num));

describe('structuralEquals', () => {
  it('is reflexive even for NaN (Object.is, not ===)', () => {
    expect(structuralEquals(Number.NaN, Number.NaN)).toBe(true);
    expect(eqNumber.equals(Number.NaN, Number.NaN)).toBe(true);
  });

  it('compares nested arrays and records by contents', () => {
    expect(structuralEquals({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true);
    expect(structuralEquals({ a: [1, { b: 2 }] }, { a: [1, { b: 3 }] })).toBe(false);
  });

  it('ignores key order', () => {
    expect(structuralEquals({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });

  it('distinguishes differing key counts and missing keys', () => {
    expect(structuralEquals({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(structuralEquals({ a: 1, b: 2 }, { a: 1, c: 2 })).toBe(false);
  });

  it('a structural clone is always equal to its source', () => {
    fc.assert(
      fc.property(jsonish, (v) => {
        expect(structuralEquals(v, JSON.parse(JSON.stringify(v)))).toBe(true);
      }),
    );
  });
});

describe('eqBy — projection equality', () => {
  it('equates entities that share the projected key', () => {
    const eqById = eqBy((u: { readonly id: number; readonly name: string }) => u.id, eqNumber);
    expect(eqById.equals({ id: 1, name: 'ada' }, { id: 1, name: 'grace' })).toBe(true);
    expect(eqById.equals({ id: 1, name: 'ada' }, { id: 2, name: 'ada' })).toBe(false);
  });

  it('inherits reflexivity from the target Eq', () => {
    const eqLen = eqBy((s: string) => s.length, eqNumber);
    fc.assert(fc.property(fc.string(), (s) => { expect(eqLen.equals(s, s)).toBe(true); }));
  });
});

describe('eqOption', () => {
  it('None equals None; Some compares contents', () => {
    const e = eqOption(eqNumber);
    expect(e.equals(none, none)).toBe(true);
    expect(e.equals(some(1), some(1))).toBe(true);
    expect(e.equals(some(1), some(2))).toBe(false);
    expect(e.equals(some(1), none)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Ord laws
// ---------------------------------------------------------------------------

describe('Ord laws — ordNumber', () => {
  it('reflexive: compare(x, x) === 0', () => {
    fc.assert(fc.property(num, (x) => { expect(ordNumber.compare(x, x)).toBe(0); }));
  });

  it('antisymmetric: compare(x, y) + compare(y, x) === 0', () => {
    // Stated additively rather than as `a === -b`: for the tie case that would
    // compare 0 against -0, which Object.is (and so vitest's toBe) separates.
    fc.assert(
      fc.property(num, num, (x, y) => {
        expect(ordNumber.compare(x, y) + ordNumber.compare(y, x)).toBe(0);
      }),
    );
  });

  it('transitive: x <= y && y <= z ⇒ x <= z', () => {
    fc.assert(
      fc.property(num, num, num, (x, y, z) => {
        if (ordNumber.compare(x, y) <= 0 && ordNumber.compare(y, z) <= 0) {
          expect(ordNumber.compare(x, z)).toBeLessThanOrEqual(0);
        }
      }),
    );
  });

  it('consistency: equals(x, y) ≡ compare(x, y) === 0', () => {
    fc.assert(
      fc.property(num, num, (x, y) => {
        expect(ordNumber.equals(x, y)).toBe(ordNumber.compare(x, y) === 0);
      }),
    );
  });

  it('only ever returns -1, 0, or 1', () => {
    fc.assert(
      fc.property(num, num, (x, y) => {
        expect([-1, 0, 1]).toContain(ordNumber.compare(x, y));
      }),
    );
  });
});

describe('Ord combinators', () => {
  it('reverseOrd is involutive', () => {
    fc.assert(
      fc.property(num, num, (x, y) => {
        expect(reverseOrd(reverseOrd(ordNumber)).compare(x, y)).toBe(ordNumber.compare(x, y));
      }),
    );
  });

  it('reverseOrd negates the comparison', () => {
    fc.assert(
      fc.property(num, num, (x, y) => {
        // Additive form again: on ties `-0` would not satisfy toBe(0).
        expect(reverseOrd(ordNumber).compare(x, y) + ordNumber.compare(x, y)).toBe(0);
      }),
    );
  });

  it('ordBy sorts by the projection', () => {
    const byLen = ordBy((s: string) => s.length, ordNumber);
    expect(sortWith(byLen)(['ccc', 'a', 'bb'])).toEqual(['a', 'bb', 'ccc']);
  });

  it('ordThen falls back to the secondary on ties', () => {
    const byLenThenAlpha = ordThen(ordBy((s: string) => s.length, ordNumber), ordString);
    expect(sortWith(byLenThenAlpha)(['bb', 'aa', 'c'])).toEqual(['c', 'aa', 'bb']);
  });

  it('ordString and ordBoolean order as documented', () => {
    expect(sortWith(ordString)(['b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
    expect(sortWith(ordBoolean)([true, false])).toEqual([false, true]);
  });
});

// ---------------------------------------------------------------------------
// Eq/Ord-driven array operations
// ---------------------------------------------------------------------------

describe('sortWith', () => {
  it('does not mutate its input', () => {
    const input = [3, 1, 2];
    const snapshot = [...input];
    sortWith(ordNumber)(input);
    expect(input).toEqual(snapshot);
  });

  it('preserves length and is idempotent', () => {
    fc.assert(
      fc.property(fc.array(num), (xs) => {
        const once = sortWith(ordNumber)(xs);
        expect(once).toHaveLength(xs.length);
        expect(sortWith(ordNumber)(once)).toEqual(once);
      }),
    );
  });

  it('produces a non-decreasing sequence', () => {
    fc.assert(
      fc.property(fc.array(num), (xs) => {
        expect(sortWith(ordNumber)(xs)).toEqual([...xs].sort((a, b) => a - b));
      }),
    );
  });
});

describe('uniqueWith', () => {
  it('is idempotent and never grows', () => {
    fc.assert(
      fc.property(fc.array(num), (xs) => {
        const u = uniqueWith(eqNumber)(xs);
        expect(u.length).toBeLessThanOrEqual(xs.length);
        expect(uniqueWith(eqNumber)(u)).toEqual(u);
      }),
    );
  });

  it('deduplicates entities by projected key', () => {
    const eqById = eqBy((u: { readonly id: number }) => u.id, eqNumber);
    expect(uniqueWith(eqById)([{ id: 1 }, { id: 2 }, { id: 1 }])).toEqual([{ id: 1 }, { id: 2 }]);
  });
});

describe('elemWith and lookupWith', () => {
  it('elemWith finds structurally-equal members that includes() misses', () => {
    const xs = [{ id: 1 }, { id: 2 }];
    expect(xs.includes({ id: 1 })).toBe(false);
    expect(elemWith(eqStructural<{ readonly id: number }>())({ id: 1 })(xs)).toBe(true);
  });

  it('elemWith agrees with some()', () => {
    fc.assert(
      fc.property(fc.array(num), num, (xs, target) => {
        expect(elemWith(eqNumber)(target)(xs)).toBe(xs.some((x) => x === target));
      }),
    );
  });

  it('lookupWith returns Some for a hit and None for a miss', () => {
    const xs = [{ id: 1 }, { id: 2 }];
    const found = lookupWith(eqStructural<{ readonly id: number }>())({ id: 2 })(xs);
    expect(isSome(found) && found.value).toEqual({ id: 2 });
    expect(isNone(lookupWith(eqStructural<{ readonly id: number }>())({ id: 9 })(xs))).toBe(true);
  });
});

describe('maxWith and minWith are total on non-empty arrays', () => {
  it('agree with Math.max / Math.min', () => {
    fc.assert(
      fc.property(fc.array(num, { minLength: 1 }), (xs) => {
        const ne = mkNonEmpty(xs);
        expect(isSome(ne)).toBe(true);
        if (isSome(ne)) {
          expect(maxWith(ordNumber)(ne.value)).toBe(Math.max(...xs));
          expect(minWith(ordNumber)(ne.value)).toBe(Math.min(...xs));
        }
      }),
    );
  });

  it('return the sole element of a singleton', () => {
    const one: NonEmptyReadonlyArray<number> = [42];
    expect(maxWith(ordNumber)(one)).toBe(42);
    expect(minWith(ordNumber)(one)).toBe(42);
  });
});

describe('mkEq and mkOrd', () => {
  it('mkEq wraps an arbitrary predicate', () => {
    const eqMod3 = mkEq<number>((x, y) => x % 3 === y % 3);
    expect(eqMod3.equals(1, 4)).toBe(true);
    expect(eqMod3.equals(1, 5)).toBe(false);
  });

  it('mkOrd derives equals from compare, so they cannot disagree', () => {
    const byAbs = mkOrd<number>((x, y) => (Math.abs(x) < Math.abs(y) ? -1 : Math.abs(x) > Math.abs(y) ? 1 : 0));
    expect(byAbs.equals(-3, 3)).toBe(true);
    expect(byAbs.compare(-3, 3)).toBe(0);
  });
});
