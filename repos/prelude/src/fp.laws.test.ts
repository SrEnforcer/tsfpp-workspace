/**
 * Property-based law suite — standard Rule 8.2.
 *
 * The prelude documents ~80 algebraic laws in `@law` JSDoc annotations. Until
 * this file existed those laws were prose: asserted, never checked. Each block
 * below turns one documented law into a property verified over generated input,
 * which is what Rule 8.2 ("property-based testing with fast-check is mandatory
 * for all pure functions in the core") actually requires.
 *
 * Convention: `fc.assert(fc.property(...))` per law, named after the law it
 * proves, so a failure names the broken algebraic property directly.
 */

import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  type Option,
  type Result,
  comp,
  entriesOf,
  flatMap,
  flatMapOption,
  flow,
  fromArray,
  fromNullable,
  getOrElse,
  getOrElseOption,
  intoMap,
  isNone,
  isOk,
  isSome,
  map,
  mapErr,
  mapList,
  mapOption,
  match,
  matchOption,
  mkInt,
  mkNonEmpty,
  mkNonNegative,
  mkPositive,
  none,
  ok,
  err,
  orElseOption,
  pipe,
  reverseList,
  sequenceArrayOption,
  some,
  toArray,
  traverseArray,
  traverseArrayOption,
  unique,
} from './fp.js';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const anyOption = <A>(arb: fc.Arbitrary<A>): fc.Arbitrary<Option<A>> =>
  fc.oneof(arb.map(some), fc.constant<Option<A>>(none));

const anyResult = <A>(arb: fc.Arbitrary<A>): fc.Arbitrary<Result<A, string>> =>
  fc.oneof(arb.map((a) => ok<A, string>(a)), fc.string().map((e) => err<string, A>(e)));

const num = fc.integer({ min: -1000, max: 1000 });

// ---------------------------------------------------------------------------
// Option — functor and monad laws
// ---------------------------------------------------------------------------

describe('Option laws', () => {
  it('functor identity: mapOption(x => x) ≡ identity', () => {
    fc.assert(
      fc.property(anyOption(num), (o) => {
        expect(mapOption((x: number) => x)(o)).toEqual(o);
      }),
    );
  });

  it('functor composition: mapOption(g)∘mapOption(f) ≡ mapOption(g∘f)', () => {
    fc.assert(
      fc.property(anyOption(num), (o) => {
        const f = (x: number): number => x + 1;
        const g = (x: number): number => x * 2;
        expect(mapOption(g)(mapOption(f)(o))).toEqual(mapOption((x: number) => g(f(x)))(o));
      }),
    );
  });

});

describe('Option monad laws', () => {
  it('monad left identity: flatMapOption(f)(some(a)) ≡ f(a)', () => {
    fc.assert(
      fc.property(num, (a) => {
        const f = (x: number): Option<number> => (x > 0 ? some(x * 2) : none);
        expect(flatMapOption(f)(some(a))).toEqual(f(a));
      }),
    );
  });

  it('monad right identity: flatMapOption(some)(o) ≡ o', () => {
    fc.assert(
      fc.property(anyOption(num), (o) => {
        expect(flatMapOption((x: number) => some(x))(o)).toEqual(o);
      }),
    );
  });

  it('monad associativity holds for flatMapOption', () => {
    fc.assert(
      fc.property(anyOption(num), (o) => {
        const f = (x: number): Option<number> => (x % 2 === 0 ? some(x + 1) : none);
        const g = (x: number): Option<number> => (x > 0 ? some(x * 3) : none);
        const lhs = flatMapOption(g)(flatMapOption(f)(o));
        const rhs = flatMapOption((x: number) => flatMapOption(g)(f(x)))(o);
        expect(lhs).toEqual(rhs);
      }),
    );
  });

});

describe('Option eliminator laws', () => {
  it('getOrElseOption: some(a) yields a; none yields the fallback', () => {
    fc.assert(
      fc.property(num, num, (a, fallback) => {
        expect(getOrElseOption(() => fallback)(some(a))).toBe(a);
        expect(getOrElseOption<number>(() => fallback)(none)).toBe(fallback);
      }),
    );
  });

  it('orElseOption left identity: some(a) is never replaced', () => {
    fc.assert(
      fc.property(num, num, (a, b) => {
        expect(orElseOption(() => some(b))(some(a))).toEqual(some(a));
      }),
    );
  });

  it('matchOption is total: exactly one handler fires', () => {
    fc.assert(
      fc.property(anyOption(num), (o) => {
        const tag = matchOption(
          () => 'none',
          () => 'some',
        )(o);
        expect(tag).toBe(isSome(o) ? 'some' : 'none');
      }),
    );
  });

  it('fromNullable: null and undefined become None, everything else Some', () => {
    fc.assert(
      fc.property(fc.option(num, { nil: null }), (v) => {
        expect(isNone(fromNullable(v))).toBe(v === null);
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Result — functor, monad, and error-channel laws
// ---------------------------------------------------------------------------

describe('Result laws', () => {
  it('functor identity: map(x => x) ≡ identity', () => {
    fc.assert(
      fc.property(anyResult(num), (r) => {
        expect(map((x: number) => x)(r)).toEqual(r);
      }),
    );
  });

  it('functor composition: map(g)∘map(f) ≡ map(g∘f)', () => {
    fc.assert(
      fc.property(anyResult(num), (r) => {
        const f = (x: number): number => x - 3;
        const g = (x: number): number => x * 5;
        expect(map(g)(map(f)(r))).toEqual(map((x: number) => g(f(x)))(r));
      }),
    );
  });

});

describe('Result monad laws', () => {
  it('monad left identity: flatMap(f)(ok(a)) ≡ f(a)', () => {
    fc.assert(
      fc.property(num, (a) => {
        const f = (x: number): Result<number, string> => (x > 0 ? ok(x) : err('neg'));
        expect(flatMap(f)(ok<number, string>(a))).toEqual(f(a));
      }),
    );
  });

  it('monad right identity: flatMap(ok)(r) ≡ r', () => {
    fc.assert(
      fc.property(anyResult(num), (r) => {
        expect(flatMap((x: number) => ok<number, string>(x))(r)).toEqual(r);
      }),
    );
  });

  it('monad associativity holds for flatMap', () => {
    fc.assert(
      fc.property(anyResult(num), (r) => {
        const f = (x: number): Result<number, string> => (x % 2 === 0 ? ok(x + 1) : err('odd'));
        const g = (x: number): Result<number, string> => (x > 10 ? ok(x * 2) : err('small'));
        expect(flatMap(g)(flatMap(f)(r))).toEqual(
          flatMap((x: number) => flatMap(g)(f(x)))(r),
        );
      }),
    );
  });

});

describe('Result error-channel laws', () => {
  it('mapErr identity: mapErr(x => x) ≡ identity', () => {
    fc.assert(
      fc.property(anyResult(num), (r) => {
        expect(mapErr((e: string) => e)(r)).toEqual(r);
      }),
    );
  });

  it('mapErr fusion: mapErr(g)∘mapErr(f) ≡ mapErr(g∘f)', () => {
    fc.assert(
      fc.property(anyResult(num), (r) => {
        const f = (e: string): string => `${e}!`;
        const g = (e: string): number => e.length;
        expect(mapErr(g)(mapErr(f)(r))).toEqual(mapErr((e: string) => g(f(e)))(r));
      }),
    );
  });

});

describe('Result eliminator laws', () => {
  it('map and mapErr operate on disjoint channels', () => {
    fc.assert(
      fc.property(anyResult(num), (r) => {
        // Mapping the channel that is NOT populated leaves the value untouched.
        expect(isOk(r) ? mapErr((e: string) => `${e}x`)(r) : map((x: number) => x + 1)(r)).toEqual(r);
      }),
    );
  });

  it('getOrElse: ok(a) yields a; err(e) yields the computed fallback', () => {
    fc.assert(
      fc.property(anyResult(num), (r) => {
        const out = getOrElse((e: string) => e.length)(r);
        expect(out).toBe(isOk(r) ? r.value : r.error.length);
      }),
    );
  });

  it('match is total: exactly one handler fires', () => {
    fc.assert(
      fc.property(anyResult(num), (r) => {
        const tag = match(
          () => 'err',
          () => 'ok',
        )(r);
        expect(tag).toBe(isOk(r) ? 'ok' : 'err');
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Traversals
// ---------------------------------------------------------------------------

describe('traversal laws', () => {
  it('traverseArray is Ok exactly when every element succeeds', () => {
    fc.assert(
      fc.property(fc.array(num), (xs) => {
        const f = (x: number): Result<number, string> => (x >= 0 ? ok(x) : err('neg'));
        expect(isOk(traverseArray(f)(xs))).toBe(xs.every((x) => x >= 0));
      }),
    );
  });

  it('traverseArray preserves length and order on success', () => {
    fc.assert(
      fc.property(fc.array(fc.nat({ max: 500 })), (xs) => {
        const r = traverseArray((x: number) => ok<number, string>(x * 2))(xs);
        expect(isOk(r) && r.value).toEqual(xs.map((x) => x * 2));
      }),
    );
  });

  it('traverseArrayOption is Some exactly when every element is present', () => {
    fc.assert(
      fc.property(fc.array(fc.option(num, { nil: null })), (xs) => {
        const r = traverseArrayOption((x: number | null) => fromNullable(x))(xs);
        expect(isSome(r)).toBe(xs.every((x) => x !== null));
      }),
    );
  });

  it('sequenceArrayOption ≡ traverseArrayOption(identity)', () => {
    fc.assert(
      fc.property(fc.array(anyOption(num)), (os) => {
        expect(sequenceArrayOption(os)).toEqual(
          traverseArrayOption((o: Option<number>) => o)(os),
        );
      }),
    );
  });

  it('traverseArray on the empty array is Ok([])', () => {
    expect(traverseArray((x: number) => ok<number, string>(x))([])).toEqual(ok([]));
  });
});

// ---------------------------------------------------------------------------
// Composition combinators
// ---------------------------------------------------------------------------

describe('composition laws', () => {
  it('pipe applies functions left to right', () => {
    fc.assert(
      fc.property(num, (a) => {
        const f = (x: number): number => x + 1;
        const g = (x: number): number => x * 3;
        expect(pipe(a, f, g)).toBe(g(f(a)));
      }),
    );
  });

  it('flow ≡ pipe with the value supplied last', () => {
    fc.assert(
      fc.property(num, (a) => {
        const f = (x: number): number => x - 7;
        const g = (x: number): number => x * x;
        expect(flow(f, g)(a)).toBe(pipe(a, f, g));
      }),
    );
  });

  it('comp composes right to left (the mirror of flow)', () => {
    fc.assert(
      fc.property(num, (a) => {
        const f = (x: number): number => x + 2;
        const g = (x: number): number => x * 4;
        expect(comp(g, f)(a)).toBe(flow(f, g)(a));
      }),
    );
  });

  it('pipe identity: pipe(a, x => x) ≡ a', () => {
    fc.assert(
      fc.property(num, (a) => {
        expect(pipe(a, (x: number) => x)).toBe(a);
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

describe('collection laws', () => {
  it('unique is idempotent: unique(unique(xs)) ≡ unique(xs)', () => {
    fc.assert(
      fc.property(fc.array(num), (xs) => {
        expect(unique(unique(xs))).toEqual(unique(xs));
      }),
    );
  });

  it('unique preserves first-occurrence order and never grows', () => {
    fc.assert(
      fc.property(fc.array(num), (xs) => {
        const u = unique(xs);
        expect(u.length).toBeLessThanOrEqual(xs.length);
        expect(u).toEqual(xs.filter((x, i) => xs.indexOf(x) === i));
      }),
    );
  });

});

describe('List and Map laws', () => {
  it('List round-trip: toArray(fromArray(xs)) ≡ xs', () => {
    fc.assert(
      fc.property(fc.array(num), (xs) => {
        expect(toArray(fromArray(xs))).toEqual(xs);
      }),
    );
  });

  it('reverseList is involutive', () => {
    fc.assert(
      fc.property(fc.array(num), (xs) => {
        expect(toArray(reverseList(reverseList(fromArray(xs))))).toEqual(xs);
      }),
    );
  });

  it('mapList matches Array.prototype.map through the round-trip', () => {
    fc.assert(
      fc.property(fc.array(num), (xs) => {
        const f = (x: number): number => x * 2 + 1;
        expect(toArray(mapList(f)(fromArray(xs)))).toEqual(xs.map(f));
      }),
    );
  });

  it('intoMap/entriesOf round-trips unique-keyed entries', () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.tuple(fc.string(), num), { selector: ([k]) => k }), (pairs) => {
        expect([...entriesOf(intoMap(pairs))].sort()).toEqual([...pairs].sort());
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Refinements — smart constructors must agree with their stated predicate
// ---------------------------------------------------------------------------

describe('refinement laws', () => {
  it('mkInt succeeds exactly on finite integers', () => {
    fc.assert(
      fc.property(fc.double({ noDefaultInfinity: false, noNaN: false }), (n) => {
        expect(isSome(mkInt(n))).toBe(Number.isInteger(n));
      }),
    );
  });

  it('mkPositive succeeds exactly on finite values > 0', () => {
    fc.assert(
      fc.property(fc.double({ noDefaultInfinity: false, noNaN: false }), (n) => {
        expect(isSome(mkPositive(n))).toBe(Number.isFinite(n) && n > 0);
      }),
    );
  });

  it('mkNonNegative succeeds exactly on finite values >= 0', () => {
    fc.assert(
      fc.property(fc.double({ noDefaultInfinity: false, noNaN: false }), (n) => {
        expect(isSome(mkNonNegative(n))).toBe(Number.isFinite(n) && n >= 0);
      }),
    );
  });

  it('no refinement ever admits NaN or infinity', () => {
    const hazards = [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
    hazards.forEach((n) => {
      expect(isNone(mkInt(n))).toBe(true);
      expect(isNone(mkPositive(n))).toBe(true);
      expect(isNone(mkNonNegative(n))).toBe(true);
    });
  });

  it('mkNonEmpty succeeds exactly on non-empty arrays', () => {
    fc.assert(
      fc.property(fc.array(num), (xs) => {
        expect(isSome(mkNonEmpty(xs))).toBe(xs.length > 0);
      }),
    );
  });
});
