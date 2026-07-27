import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { type Result, err, isErr, isOk, isSome, ok } from './adt.js';
import { ordNumber, ordString } from './eq.js';
import { semigroupNonEmpty } from './monoid.js';
import {
  type NonEmptyReadonlyArray,
  appendNonEmpty,
  concatNonEmpty,
  consNonEmpty,
  headNonEmpty,
  isNonEmptyArray,
  lastNonEmpty,
  lengthNonEmpty,
  mapNonEmpty,
  mkNonEmpty,
  prependNonEmpty,
  reduceMapNonEmpty,
  reduceNonEmpty,
  reverseNonEmpty,
  singletonNonEmpty,
  sortNonEmpty,
  tailNonEmpty,
  toArrayNonEmpty,
  traverseNonEmpty,
} from './nonempty.js';

const num = fc.integer({ min: -100, max: 100 });

/** Arbitrary non-empty array, built through the real smart constructor. */
const neArb: fc.Arbitrary<NonEmptyReadonlyArray<number>> = fc
  .tuple(num, fc.array(num, { maxLength: 7 }))
  .map(([head, tail]) => consNonEmpty(head)(tail));

describe('the refinement survives transformation', () => {
  it('mapNonEmpty returns a NonEmptyReadonlyArray — head stays total', () => {
    const xs: NonEmptyReadonlyArray<number> = [1, 2, 3];
    // The point of the module: no Option, no guard, after a map.
    const doubled = mapNonEmpty((n: number) => n * 2)(xs);
    expect(headNonEmpty(doubled)).toBe(2);
    expect(lastNonEmpty(doubled)).toBe(6);
  });

  it('mapNonEmpty agrees with Array.prototype.map', () => {
    fc.assert(
      fc.property(neArb, (xs) => {
        const f = (n: number): number => n * 3 + 1;
        expect(toArrayNonEmpty(mapNonEmpty(f)(xs))).toEqual(toArrayNonEmpty(xs).map(f));
      }),
    );
  });

  it('functor identity and composition', () => {
    fc.assert(
      fc.property(neArb, (xs) => {
        expect(mapNonEmpty((n: number) => n)(xs)).toEqual(xs);
        const f = (n: number): number => n + 1;
        const g = (n: number): number => n * 2;
        expect(mapNonEmpty(g)(mapNonEmpty(f)(xs))).toEqual(mapNonEmpty((n: number) => g(f(n)))(xs));
      }),
    );
  });
});

describe('construction and accessors', () => {
  it('mkNonEmpty succeeds exactly on non-empty input', () => {
    fc.assert(
      fc.property(fc.array(num), (xs) => {
        expect(isSome(mkNonEmpty(xs))).toBe(xs.length > 0);
      }),
    );
  });

  it('isNonEmptyArray narrows', () => {
    expect(isNonEmptyArray([1])).toBe(true);
    expect(isNonEmptyArray([])).toBe(false);
  });

  it('consNonEmpty puts the supplied head first', () => {
    fc.assert(
      fc.property(num, fc.array(num, { maxLength: 5 }), (h, t) => {
        const xs = consNonEmpty(h)(t);
        expect(headNonEmpty(xs)).toBe(h);
        expect(lengthNonEmpty(xs)).toBe(t.length + 1);
      }),
    );
  });

  it('singleton has equal head and last', () => {
    fc.assert(
      fc.property(num, (n) => {
        const one = singletonNonEmpty(n);
        expect(headNonEmpty(one)).toBe(n);
        expect(lastNonEmpty(one)).toBe(n);
        expect(tailNonEmpty(one)).toEqual([]);
      }),
    );
  });

});

describe('head/tail round-trip', () => {
  it('head + tail reconstructs the original', () => {
    fc.assert(
      fc.property(neArb, (xs) => {
        expect(consNonEmpty(headNonEmpty(xs))(tailNonEmpty(xs))).toEqual(xs);
      }),
    );
  });

  it('tail is a plain array — the refinement genuinely does not survive it', () => {
    expect(tailNonEmpty(singletonNonEmpty(1))).toEqual([]);
  });
});

describe('append, prepend, concat', () => {
  it('appendNonEmpty puts the value last', () => {
    fc.assert(
      fc.property(neArb, num, (xs, n) => {
        const out = appendNonEmpty(n)(xs);
        expect(lastNonEmpty(out)).toBe(n);
        expect(lengthNonEmpty(out)).toBe(lengthNonEmpty(xs) + 1);
      }),
    );
  });

  it('prependNonEmpty puts the value first', () => {
    fc.assert(
      fc.property(neArb, num, (xs, n) => {
        const out = prependNonEmpty(n)(xs);
        expect(headNonEmpty(out)).toBe(n);
        expect(lengthNonEmpty(out)).toBe(lengthNonEmpty(xs) + 1);
      }),
    );
  });

  it('concat preserves order and sums lengths', () => {
    fc.assert(
      fc.property(neArb, neArb, (xs, ys) => {
        const out = concatNonEmpty(ys)(xs);
        expect(toArrayNonEmpty(out)).toEqual([...toArrayNonEmpty(xs), ...toArrayNonEmpty(ys)]);
        expect(lengthNonEmpty(out)).toBe(lengthNonEmpty(xs) + lengthNonEmpty(ys));
      }),
    );
  });

});

describe('the non-empty semigroup', () => {
  it('concat is associative — the semigroup law', () => {
    fc.assert(
      fc.property(neArb, neArb, neArb, (a, b, c) => {
        expect(concatNonEmpty(c)(concatNonEmpty(b)(a))).toEqual(
          concatNonEmpty(concatNonEmpty(c)(b))(a),
        );
      }),
    );
  });

  it('semigroupNonEmpty exposes that concat and is associative', () => {
    const s = semigroupNonEmpty<number>();
    fc.assert(
      fc.property(neArb, neArb, neArb, (a, b, c) => {
        expect(s.concat(s.concat(a, b), c)).toEqual(s.concat(a, s.concat(b, c)));
      }),
    );
  });

  it('there is deliberately no monoid — no empty non-empty array exists', () => {
    // Documented as a type-level fact: `mkNonEmpty([])` is None, so no identity
    // element can be constructed for this semigroup.
    expect(isSome(mkNonEmpty<number>([]))).toBe(false);
  });
});

describe('reverse and sort preserve non-emptiness', () => {
  it('reverseNonEmpty is involutive', () => {
    fc.assert(
      fc.property(neArb, (xs) => {
        expect(reverseNonEmpty(reverseNonEmpty(xs))).toEqual(xs);
      }),
    );
  });

  it('reverse swaps head and last', () => {
    fc.assert(
      fc.property(neArb, (xs) => {
        expect(headNonEmpty(reverseNonEmpty(xs))).toBe(lastNonEmpty(xs));
        expect(lastNonEmpty(reverseNonEmpty(xs))).toBe(headNonEmpty(xs));
      }),
    );
  });

  it('reverse agrees with toReversed on the widened array', () => {
    fc.assert(
      fc.property(neArb, (xs) => {
        expect(toArrayNonEmpty(reverseNonEmpty(xs))).toEqual([...toArrayNonEmpty(xs)].reverse());
      }),
    );
  });

});

describe('sortNonEmpty', () => {
  it('orders, preserves length, and does not mutate', () => {
    fc.assert(
      fc.property(neArb, (xs) => {
        const snapshot = toArrayNonEmpty(xs).slice();
        const sorted = sortNonEmpty(ordNumber)(xs);
        expect(toArrayNonEmpty(sorted)).toEqual([...snapshot].sort((a, b) => a - b));
        expect(lengthNonEmpty(sorted)).toBe(lengthNonEmpty(xs));
        expect(toArrayNonEmpty(xs)).toEqual(snapshot);
      }),
    );
  });

  it('sortNonEmpty is idempotent and works for strings', () => {
    const xs: NonEmptyReadonlyArray<string> = ['c', 'a', 'b'];
    const once = sortNonEmpty(ordString)(xs);
    expect(toArrayNonEmpty(once)).toEqual(['a', 'b', 'c']);
    expect(sortNonEmpty(ordString)(once)).toEqual(once);
  });
});

describe('reduceNonEmpty — a partial stdlib function made total', () => {
  it('reduce without a seed throws on [] but is total here', () => {
    // The motivating contrast: this is what the refinement buys.
    const empty: ReadonlyArray<number> = [];
    expect(() => empty.reduce((a, b) => a + b)).toThrow();
    expect(reduceNonEmpty<number>((a, b) => a + b)(singletonNonEmpty(7))).toBe(7);
  });

  it('agrees with a seeded reduce over head + tail', () => {
    fc.assert(
      fc.property(neArb, (xs) => {
        expect(reduceNonEmpty<number>((a, b) => a + b)(xs)).toBe(
          tailNonEmpty(xs).reduce((a, b) => a + b, headNonEmpty(xs)),
        );
      }),
    );
  });

  it('singleton reduces to its only element', () => {
    fc.assert(
      fc.property(num, (n) => {
        expect(reduceNonEmpty<number>((a, b) => a + b)(singletonNonEmpty(n))).toBe(n);
      }),
    );
  });

  it('reduceMapNonEmpty maps then combines, needing no identity', () => {
    fc.assert(
      fc.property(neArb, (xs) => {
        const out = reduceMapNonEmpty<number, number>((n) => n * 2, (a, b) => a + b)(xs);
        expect(out).toBe(toArrayNonEmpty(xs).reduce((a, b) => a + b * 2, 0));
      }),
    );
  });

  it('reduceMapNonEmpty can change the element type', () => {
    const xs: NonEmptyReadonlyArray<number> = [1, 2, 3];
    expect(reduceMapNonEmpty<number, string>(String, (a, b) => `${a}-${b}`)(xs)).toBe('1-2-3');
  });
});

describe('traverseNonEmpty', () => {
  it('is Ok exactly when every element succeeds, preserving non-emptiness', () => {
    fc.assert(
      fc.property(neArb, (xs) => {
        const f = (n: number): Result<number, string> =>
          n >= 0 ? ok<number, string>(n) : err<string, number>('neg');
        const out = traverseNonEmpty(f)(xs);
        expect(isOk(out)).toBe(toArrayNonEmpty(xs).every((n) => n >= 0));
        if (isOk(out)) expect(lengthNonEmpty(out.value)).toBe(lengthNonEmpty(xs));
      }),
    );
  });

  it('maps and preserves order on success', () => {
    fc.assert(
      fc.property(neArb, (xs) => {
        const out = traverseNonEmpty((n: number) => ok<number, string>(n * 2))(xs);
        expect(isOk(out) && toArrayNonEmpty(out.value)).toEqual(
          toArrayNonEmpty(xs).map((n) => n * 2),
        );
      }),
    );
  });

  it('short-circuits to the first error', () => {
    const xs: NonEmptyReadonlyArray<number> = [1, -2, 3, -4];
    const out = traverseNonEmpty((n: number) =>
      n >= 0 ? ok<number, string>(n) : err<string, number>(`neg:${n}`),
    )(xs);
    expect(isErr(out) && out.error).toBe('neg:-2');
  });

  it('a failing head fails immediately', () => {
    const out = traverseNonEmpty(() => err<string, number>('bad'))(singletonNonEmpty(1));
    expect(isErr(out) && out.error).toBe('bad');
  });
});
