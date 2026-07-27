import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { type Any, type Every, mkAny, mkEvery } from './adt.js';
import { ordNumber, ordString } from './eq.js';
import {
  type Monoid,
  type Semigroup,
  concatAll,
  concatAllWith,
  dual,
  foldMap,
  mkMonoid,
  mkSemigroup,
  monoidAny,
  monoidArray,
  monoidEvery,
  monoidProduct,
  monoidRecord,
  monoidString,
  monoidSum,
  semigroupFirst,
  semigroupLast,
  semigroupMax,
  semigroupMin,
} from './monoid.js';

const num = fc.integer({ min: -1000, max: 1000 });
const smallNum = fc.integer({ min: -50, max: 50 });

/**
 * The two laws that define a monoid. Every instance is run through this, so a
 * new instance cannot be added without earning them.
 */
type MonoidLawSpec<A> = {
  readonly name: string;
  readonly monoid: Monoid<A>;
  readonly arb: fc.Arbitrary<A>;
};

const monoidLaws = <A>({ name, monoid: m, arb }: MonoidLawSpec<A>): void => {
  const eq = (x: A, y: A): boolean => JSON.stringify(x) === JSON.stringify(y);
  describe(`Monoid laws — ${name}`, () => {
    it('associativity: concat(concat(a,b),c) ≡ concat(a,concat(b,c))', () => {
      fc.assert(
        fc.property(arb, arb, arb, (a, b, c) => {
          expect(eq(m.concat(m.concat(a, b), c), m.concat(a, m.concat(b, c)))).toBe(true);
        }),
      );
    });

    it('left identity: concat(empty, a) ≡ a', () => {
      fc.assert(fc.property(arb, (a) => { expect(eq(m.concat(m.empty, a), a)).toBe(true); }));
    });

    it('right identity: concat(a, empty) ≡ a', () => {
      fc.assert(fc.property(arb, (a) => { expect(eq(m.concat(a, m.empty), a)).toBe(true); }));
    });

    it('concatAll([]) ≡ empty — totality on the empty collection', () => {
      expect(eq(concatAll(m)([]), m.empty)).toBe(true);
    });

    it('concatAll([a]) ≡ a', () => {
      fc.assert(fc.property(arb, (a) => { expect(eq(concatAll(m)([a]), a)).toBe(true); }));
    });
  });
};

monoidLaws({ name: 'monoidSum', monoid: monoidSum, arb: smallNum });
monoidLaws({ name: 'monoidProduct', monoid: monoidProduct, arb: fc.integer({ min: -20, max: 20 }) });
monoidLaws({ name: 'monoidString', monoid: monoidString, arb: fc.string({ maxLength: 8 }) });
monoidLaws({ name: 'monoidArray', monoid: monoidArray<number>(), arb: fc.array(smallNum, { maxLength: 5 }) });
monoidLaws({ name: 'monoidEvery', monoid: monoidEvery, arb: fc.boolean().map(mkEvery) });
monoidLaws({ name: 'monoidAny', monoid: monoidAny, arb: fc.boolean().map(mkAny) });
monoidLaws({
  name: 'monoidRecord(monoidSum)',
  monoid: monoidRecord(monoidSum),
  arb: fc.dictionary(fc.string({ maxLength: 3 }), smallNum, { maxKeys: 4 }),
});

/** Semigroups have associativity but no identity to check. */
const semigroupLaws = <A>(name: string, s: Semigroup<A>, arb: fc.Arbitrary<A>): void => {
  describe(`Semigroup laws — ${name}`, () => {
    it('associativity', () => {
      fc.assert(
        fc.property(arb, arb, arb, (a, b, c) => {
          expect(s.concat(s.concat(a, b), c)).toEqual(s.concat(a, s.concat(b, c)));
        }),
      );
    });
  });
};

semigroupLaws('semigroupFirst', semigroupFirst<number>(), num);
semigroupLaws('semigroupLast', semigroupLast<number>(), num);
semigroupLaws('semigroupMax(ordNumber)', semigroupMax(ordNumber), num);
semigroupLaws('semigroupMin(ordNumber)', semigroupMin(ordNumber), num);
semigroupLaws('semigroupMax(ordString)', semigroupMax(ordString), fc.string({ maxLength: 6 }));

describe('boolean monoids — why Every and Any are distinct types', () => {
  it('their identities differ, which is the whole reason to distinguish them', () => {
    expect(Boolean(monoidEvery.empty)).toBe(true);
    expect(Boolean(monoidAny.empty)).toBe(false);
  });

  it('concatAll on the empty array reflects those identities', () => {
    expect(Boolean(concatAll(monoidEvery)([]))).toBe(true);
    expect(Boolean(concatAll(monoidAny)([]))).toBe(false);
  });

  it('monoidEvery agrees with Array.prototype.every', () => {
    fc.assert(
      fc.property(fc.array(fc.boolean()), (bs) => {
        const combined: Every = concatAll(monoidEvery)(bs.map(mkEvery));
        expect(Boolean(combined)).toBe(bs.every((b) => b));
      }),
    );
  });

  it('monoidAny agrees with Array.prototype.some', () => {
    fc.assert(
      fc.property(fc.array(fc.boolean()), (bs) => {
        const combined: Any = concatAll(monoidAny)(bs.map(mkAny));
        expect(Boolean(combined)).toBe(bs.some((b) => b));
      }),
    );
  });
});

describe('concatAll and foldMap', () => {
  it('monoidSum agrees with a plain reduce', () => {
    fc.assert(
      fc.property(fc.array(smallNum), (xs) => {
        expect(concatAll(monoidSum)(xs)).toBe(xs.reduce((a, b) => a + b, 0));
      }),
    );
  });

  it('foldMap(m)(identity) ≡ concatAll(m)', () => {
    fc.assert(
      fc.property(fc.array(smallNum), (xs) => {
        expect(foldMap<number, number>(monoidSum)((x) => x)(xs)).toBe(concatAll(monoidSum)(xs));
      }),
    );
  });

  it('foldMap maps then combines', () => {
    fc.assert(
      fc.property(fc.array(smallNum), (xs) => {
        expect(foldMap<number, number>(monoidSum)((x) => x * 2)(xs)).toBe(
          xs.reduce((a, b) => a + b * 2, 0),
        );
      }),
    );
  });

  it('foldMap on the empty array is the identity element', () => {
    expect(foldMap<number, number>(monoidSum)((x) => x)([])).toBe(0);
    expect(foldMap<number, string>(monoidString)(String)([])).toBe('');
  });

});

describe('semigroup folds and associativity', () => {
  it('concatAllWith threads a semigroup from an explicit start', () => {
    expect(concatAllWith(semigroupMax(ordNumber))(0)([3, 9, 2])).toBe(9);
    expect(concatAllWith(semigroupMax(ordNumber))(100)([3, 9, 2])).toBe(100);
    expect(concatAllWith(semigroupMax(ordNumber))(7)([])).toBe(7);
  });

  it('associativity means grouping cannot change the result', () => {
    fc.assert(
      fc.property(fc.array(smallNum, { minLength: 2 }), (xs) => {
        const split = Math.floor(xs.length / 2);
        const whole = concatAll(monoidSum)(xs);
        const halves = monoidSum.concat(
          concatAll(monoidSum)(xs.slice(0, split)),
          concatAll(monoidSum)(xs.slice(split)),
        );
        expect(whole).toBe(halves);
      }),
    );
  });
});

describe('dual', () => {
  it('dual(semigroupFirst) behaves like semigroupLast', () => {
    fc.assert(
      fc.property(num, num, (a, b) => {
        expect(dual(semigroupFirst<number>()).concat(a, b)).toBe(semigroupLast<number>().concat(a, b));
      }),
    );
  });

  it('is involutive', () => {
    fc.assert(
      fc.property(num, num, (a, b) => {
        const s = semigroupMax(ordNumber);
        expect(dual(dual(s)).concat(a, b)).toBe(s.concat(a, b));
      }),
    );
  });
});

describe('mkMonoid / mkSemigroup', () => {
  it('wrap arbitrary lawful operations', () => {
    const clampSum = mkMonoid<number>((x, y) => Math.min(x + y, 100), 0);
    expect(clampSum.concat(60, 60)).toBe(100);
    expect(clampSum.concat(0, 5)).toBe(5);
  });

  it('mkSemigroup needs no identity', () => {
    const longest = mkSemigroup<string>((x, y) => (y.length > x.length ? y : x));
    expect(longest.concat('ab', 'cde')).toBe('cde');
  });
});
