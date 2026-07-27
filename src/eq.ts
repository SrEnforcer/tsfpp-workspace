/**
 * @module eq
 *
 * `Eq<A>` and `Ord<A>` — explicit equality and ordering.
 *
 * ## Why this module exists
 *
 * The standard's philosophy says that with immutable values "identity and
 * equality coincide". In an ML-family language that is true. In TypeScript it is
 * **false**: `===` on any non-primitive compares *references*, so two records
 * with identical contents are unequal, and no amount of `readonly` changes that.
 *
 * ```ts
 * { id: 1 } === { id: 1 }   // false
 * ```
 *
 * Every operation that silently assumes structural equality is therefore wrong
 * for records: deduplication, membership, sorting stability, cache keys. The bug
 * is invisible because the code reads correctly and works on primitives — which
 * is exactly what a test written with numbers will report.
 *
 * TypeScript cannot infer the right notion of equality for a domain type, so the
 * standard's answer (Rule 4.7) is to make it explicit: pass an `Eq<A>` at the
 * call site. `eqStrict` keeps `===` where `===` is correct; `eqStructural`
 * compares by contents; `eqBy` derives equality from a projection, which is
 * usually what a domain type wants ("two Users are equal when their ids are").
 *
 * `Ord<A>` extends `Eq<A>` with a total comparison, which is what
 * `Array.prototype.sort` needs and what `Rule 2.3`'s "sort a copy" guidance
 * assumes you already have.
 */

import { type Option, isRecord, none, some } from './fp.js';
import type { NonEmptyReadonlyArray } from './nonempty.js';

/**
 * Equality for `A`. A lawful `Eq` is reflexive, symmetric, and transitive;
 * the law suite verifies all three.
 */
export type Eq<A> = {
  readonly equals: (x: A, y: A) => boolean;
};

/**
 * The three outcomes of a total comparison. Narrower than `number` on purpose
 * (Rule 1.13): a comparator cannot accidentally return `NaN`.
 */
export type Ordering = -1 | 0 | 1;

/**
 * Total ordering for `A`. Extends `Eq<A>`: `compare(x, y) === 0` *is* equality,
 * so an `Ord` can be used wherever an `Eq` is required.
 */
export type Ord<A> = Eq<A> & {
  readonly compare: (x: A, y: A) => Ordering;
};

/**
 * Builds an `Eq` from an equality predicate.
 */
export const mkEq = <A>(equals: (x: A, y: A) => boolean): Eq<A> => ({ equals });

/**
 * Builds an `Ord` from a comparator, deriving `equals` so the two can never
 * disagree — the most common source of subtle sorting/dedup bugs.
 *
 * @law consistency: ord.equals(x, y) ≡ (ord.compare(x, y) === 0)
 */
export const mkOrd = <A>(compare: (x: A, y: A) => Ordering): Ord<A> => ({
  compare,
  equals: (x, y) => compare(x, y) === 0,
});

/**
 * Reference/primitive equality via `Object.is`.
 *
 * Correct for primitives and for values compared by identity. Prefer `Object.is`
 * over `===` because it treats `NaN` as equal to itself, which keeps `Eq`
 * reflexive even for the numeric hazards Rule 1.13 warns about.
 */
export const eqStrict = <A>(): Eq<A> => mkEq((x, y) => Object.is(x, y));

/**
 * Recursive structural equality over primitives, arrays, and plain records.
 *
 * Two values are equal when they have the same shape and every corresponding
 * leaf is `Object.is`-equal. Key order is irrelevant.
 *
 * **Scope.** Plain data only — the shape TSF++ models with (readonly records,
 * arrays, discriminated unions). `Date`, `Map`, `Set`, and class instances are
 * compared by reference, because their contents are not enumerable own
 * properties. Supply a bespoke `Eq` for those.
 *
 * @law reflexive:  structuralEquals(x, x) ≡ true
 * @law symmetric:  structuralEquals(x, y) ≡ structuralEquals(y, x)
 */
export const structuralEquals = (x: unknown, y: unknown): boolean => {
  if (Object.is(x, y)) return true;

  if (Array.isArray(x)) {
    return (
      Array.isArray(y) &&
      x.length === y.length &&
      x.every((item, index) => structuralEquals(item, y[index]))
    );
  }

  if (isRecord(x) && isRecord(y)) {
    const keys = Object.keys(x);
    return (
      keys.length === Object.keys(y).length &&
      keys.every((key) => Object.hasOwn(y, key) && structuralEquals(x[key], y[key]))
    );
  }

  return false;
};

/**
 * Structural equality as an `Eq`. The default choice for plain readonly data.
 */
export const eqStructural = <A>(): Eq<A> => mkEq(structuralEquals);

/**
 * Derives an `Eq` from a projection — contravariant map.
 *
 * This is usually the right `Eq` for a domain entity: equality is identity of
 * the key, not of every field.
 *
 * @example
 * const eqUser = eqBy((u: User) => u.id, eqStrict<UserId>());
 */
export const eqBy = <A, B>(project: (a: A) => B, eqB: Eq<B>): Eq<A> =>
  mkEq((x, y) => eqB.equals(project(x), project(y)));

/**
 * Derives an `Ord` from a projection into an already-ordered type.
 *
 * @example
 * const byAge = ordBy((u: User) => u.age, ordNumber);
 */
export const ordBy = <A, B>(project: (a: A) => B, ordB: Ord<B>): Ord<A> =>
  mkOrd((x, y) => ordB.compare(project(x), project(y)));

/**
 * Reverses an ordering (descending from ascending, and vice versa).
 *
 * @law involutive: reverseOrd(reverseOrd(o)) orders identically to o
 */
export const reverseOrd = <A>(ord: Ord<A>): Ord<A> =>
  mkOrd((x, y) => ord.compare(y, x));

/**
 * Lexicographic combination: compare by the first `Ord`, falling back to the
 * next on ties. Mirrors "ORDER BY a, b".
 */
export const ordThen = <A>(primary: Ord<A>, secondary: Ord<A>): Ord<A> =>
  mkOrd((x, y) => {
    const first = primary.compare(x, y);
    return first === 0 ? secondary.compare(x, y) : first;
  });

const numericCompare = (x: number, y: number): Ordering => (x < y ? -1 : x > y ? 1 : 0);

/**
 * Ordering for numbers.
 *
 * **Precondition (Rule 1.13):** finite values. `NaN` is unordered — every
 * comparison against it is `false` — so it would compare as "equal" to
 * everything. Brand with `mkInt` / `mkPositive` / `mkNonNegative` at the
 * boundary and this precondition holds by construction.
 */
export const ordNumber: Ord<number> = mkOrd(numericCompare);

/** Lexicographic ordering for strings, using the runtime's default collation. */
export const ordString: Ord<string> = mkOrd((x, y) => (x < y ? -1 : x > y ? 1 : 0));

/** Ordering for booleans: `false` sorts before `true`. */
export const ordBoolean: Ord<boolean> = mkOrd((x, y) =>
  numericCompare(x ? 1 : 0, y ? 1 : 0),
);

/** Equality for numbers (`Object.is`, so `NaN` equals itself). */
export const eqNumber: Eq<number> = eqStrict<number>();

/** Equality for strings. */
export const eqString: Eq<string> = eqStrict<string>();

/** Equality for booleans. */
export const eqBoolean: Eq<boolean> = eqStrict<boolean>();

/**
 * Lifts an `Eq` over arrays: equal length and pairwise-equal elements.
 */
export const eqArray = <A>(eqA: Eq<A>): Eq<ReadonlyArray<A>> =>
  mkEq(
    (xs, ys) =>
      xs.length === ys.length &&
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- DEVIATION(1.6): index is in range under the equal-length guard
      xs.every((x, i) => eqA.equals(x, ys[i] as A)),
  );

/**
 * Lifts an `Eq` over `Option`: `None` equals `None`, `Some` compares contents.
 */
export const eqOption = <A>(eqA: Eq<A>): Eq<Option<A>> =>
  mkEq((x, y) =>
    x._tag === 'None' ? y._tag === 'None' : y._tag === 'Some' && eqA.equals(x.value, y.value),
  );

/**
 * Membership test under an explicit `Eq`.
 *
 * The total replacement for `Array.prototype.includes`, which is `===`-based
 * and therefore wrong for records.
 */
export const elemWith =
  <A>(eqA: Eq<A>) =>
  (value: A) =>
  (xs: ReadonlyArray<A>): boolean =>
    xs.some((x) => eqA.equals(x, value));

/**
 * Removes duplicates under an explicit `Eq`, preserving first-occurrence order.
 *
 * Prefer this over `unique` for any non-primitive element type: `unique` is
 * reference-based, so records with identical contents both survive.
 *
 * @law idempotent: uniqueWith(eq)(uniqueWith(eq)(xs)) ≡ uniqueWith(eq)(xs)
 * @law never grows: uniqueWith(eq)(xs).length <= xs.length
 */
export const uniqueWith =
  <A>(eqA: Eq<A>) =>
  (xs: ReadonlyArray<A>): ReadonlyArray<A> =>
    xs.reduce<ReadonlyArray<A>>(
      (acc, x) => (acc.some((seen) => eqA.equals(seen, x)) ? acc : [...acc, x]),
      [],
    );

/**
 * Sorts a **copy** under an explicit `Ord`; the input is never mutated, so this
 * satisfies Rule 2.3 without needing ES2023's `toSorted`.
 *
 * @law length-preserving: sortWith(o)(xs).length ≡ xs.length
 * @law idempotent: sortWith(o)(sortWith(o)(xs)) ≡ sortWith(o)(xs)
 */
export const sortWith =
  <A>(ord: Ord<A>) =>
  (xs: ReadonlyArray<A>): ReadonlyArray<A> =>
    // Sorts a fresh copy, so Rule 2.3 holds: the caller's array is never mutated.
    [...xs].sort(ord.compare);

/**
 * Greatest element of a non-empty array — total, because the type excludes the
 * empty case (no `Option` wrapper needed).
 */
export const maxWith =
  <A>(ord: Ord<A>) =>
  (xs: NonEmptyReadonlyArray<A>): A =>
    xs.reduce((best, x) => (ord.compare(x, best) > 0 ? x : best));

/**
 * Least element of a non-empty array — total for the same reason as `maxWith`.
 */
export const minWith =
  <A>(ord: Ord<A>) =>
  (xs: NonEmptyReadonlyArray<A>): A =>
    xs.reduce((best, x) => (ord.compare(x, best) < 0 ? x : best));

/**
 * First element equal to `value` under an explicit `Eq`, as an `Option`.
 * The `Eq`-aware counterpart to `findO`.
 */
export const lookupWith =
  <A>(eqA: Eq<A>) =>
  (value: A) =>
  (xs: ReadonlyArray<A>): Option<A> => {
    const found = xs.find((x) => eqA.equals(x, value));
    return found === undefined ? none : some(found);
  };
