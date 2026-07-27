/**
 * @module monoid
 *
 * `Semigroup<A>` and `Monoid<A>` — the algebra of *combining*.
 *
 * ## Why this module exists
 *
 * `Eq` answers "are these the same?" and `Ord` answers "which comes first?".
 * The third question a value type usually needs to answer is "how do two of
 * these combine into one?", and until now the prelude had no vocabulary for it.
 * The absence showed: `Every` and `Any` — the two boolean monoids — have been
 * exported since 1.x and used by nothing, because the abstraction that gives
 * them a purpose did not exist.
 *
 * A **semigroup** is a type plus an associative `concat`. Associativity is the
 * whole point: it is what licenses folding a collection in any grouping, in
 * parallel, or incrementally, and still getting the same answer.
 *
 * A **monoid** adds an identity element, which is what makes folding an
 * *empty* collection total. Without it, `concatAll([])` has no answer and the
 * function must return `Option` or throw; with it, the answer is `empty`.
 *
 * ## Relationship to the rest of the prelude
 *
 * This is the abstraction `Validation` already uses without naming: combining
 * two `Invalid` values concatenates their errors, which is exactly the
 * non-empty-array semigroup. `foldMap` generalises the pattern — map each
 * element into a monoid, then combine — which covers "sum these", "did any
 * pass", "collect all the errors" with one function.
 */

import type { Any, Every } from './adt.js';
import { mkAny, mkEvery } from './adt.js';
import type { Ord } from './eq.js';
import { keysOf } from './record.js';
import { type NonEmptyReadonlyArray, concatNonEmpty } from './nonempty.js';
import { unique } from './collections.js';

/**
 * A type with an associative binary operation.
 *
 * @law associativity: concat(concat(a, b), c) ≡ concat(a, concat(b, c))
 */
export type Semigroup<A> = {
  readonly concat: (x: A, y: A) => A;
};

/**
 * A semigroup with a two-sided identity element.
 *
 * @law left identity:  concat(empty, a) ≡ a
 * @law right identity: concat(a, empty) ≡ a
 */
export type Monoid<A> = Semigroup<A> & {
  readonly empty: A;
};

/** Builds a `Semigroup` from an associative operation. */
export const mkSemigroup = <A>(concat: (x: A, y: A) => A): Semigroup<A> => ({ concat });

/** Builds a `Monoid` from an associative operation and its identity. */
export const mkMonoid = <A>(concat: (x: A, y: A) => A, empty: A): Monoid<A> => ({ concat, empty });

// ---------------------------------------------------------------------------
// Numeric and string instances
// ---------------------------------------------------------------------------

/**
 * Addition. Identity is `0`.
 *
 * **Precondition (Rule 1.13):** finite values. `NaN` would poison every fold it
 * touches and silently break associativity's observable consequences.
 */
export const monoidSum: Monoid<number> = mkMonoid((x, y) => x + y, 0);

/** Multiplication. Identity is `1`. Same finiteness precondition as `monoidSum`. */
export const monoidProduct: Monoid<number> = mkMonoid((x, y) => x * y, 1);

/** String concatenation. Identity is the empty string. */
export const monoidString: Monoid<string> = mkMonoid((x, y) => x + y, '');

// ---------------------------------------------------------------------------
// Boolean instances — the reason `Every` and `Any` exist
// ---------------------------------------------------------------------------

/**
 * Conjunction — "do *all* of them hold?". Identity is `true`.
 *
 * Uses the `Every` brand so the two boolean monoids cannot be confused at a
 * call site: `boolean` alone does not say which combination was intended, and
 * picking the wrong one is a silent logic inversion on the empty collection
 * (`every([]) === true`, `any([]) === false`).
 */
export const monoidEvery: Monoid<Every> = mkMonoid(
  (x, y) => mkEvery(Boolean(x) && Boolean(y)),
  mkEvery(true),
);

/** Disjunction — "does *any* of them hold?". Identity is `false`. */
export const monoidAny: Monoid<Any> = mkMonoid(
  (x, y) => mkAny(Boolean(x) || Boolean(y)),
  mkAny(false),
);

// ---------------------------------------------------------------------------
// Structural instances
// ---------------------------------------------------------------------------

/** Array concatenation. Identity is the empty array. */
export const monoidArray = <A>(): Monoid<ReadonlyArray<A>> =>
  mkMonoid<ReadonlyArray<A>>((x, y) => [...x, ...y], []);

/**
 * Keeps the leftmost value. Associative, but has no identity — there is no
 * value that "loses" to everything — so this is a `Semigroup`, not a `Monoid`.
 */
export const semigroupFirst = <A>(): Semigroup<A> => mkSemigroup((x) => x);

/** Keeps the rightmost value. Also identity-less. */
export const semigroupLast = <A>(): Semigroup<A> => mkSemigroup((_x, y) => y);

/**
 * Derives "keep the greater" from an ordering. Identity-less for the same
 * reason as `semigroupFirst`: a general `Ord` has no least element.
 */
export const semigroupMax = <A>(ord: Ord<A>): Semigroup<A> =>
  mkSemigroup((x, y) => (ord.compare(x, y) >= 0 ? x : y));

/** Derives "keep the lesser" from an ordering. */
export const semigroupMin = <A>(ord: Ord<A>): Semigroup<A> =>
  mkSemigroup((x, y) => (ord.compare(x, y) <= 0 ? x : y));

/**
 * Lifts a monoid over the values of a record, combining field-wise.
 * Absent keys take the inner monoid's identity, so the result is total.
 */
export const monoidRecord = <A>(
  inner: Monoid<A>,
): Monoid<Readonly<Record<string, A>>> =>
  mkMonoid<Readonly<Record<string, A>>>((x, y) => {
    const keys = unique([...keysOf(x), ...keysOf(y)]);
    return Object.fromEntries(
      keys.map((k) => [k, inner.concat(x[k] ?? inner.empty, y[k] ?? inner.empty)]),
    );
  }, {});

/**
 * Concatenation of non-empty arrays — the canonical identity-less semigroup.
 *
 * There is deliberately no `monoidNonEmpty`: the identity would have to be an
 * empty non-empty array, which the type makes unrepresentable. This is the
 * concrete case behind the Semigroup/Monoid distinction, and it is exactly the
 * structure `Validation` uses to accumulate errors.
 *
 * @law associativity: inherited from array concatenation
 */
export const semigroupNonEmpty = <A>(): Semigroup<NonEmptyReadonlyArray<A>> =>
  mkSemigroup((x, y) => concatNonEmpty(y)(x));

// ---------------------------------------------------------------------------
// Folds
// ---------------------------------------------------------------------------

/**
 * Combines every element. Total on the empty array precisely because a monoid
 * supplies an identity — this is what the `empty` element buys.
 *
 * @law concatAll(m)([])    ≡ m.empty
 * @law concatAll(m)([a])   ≡ a
 * @law concatAll is independent of grouping (associativity)
 */
export const concatAll =
  <A>(monoid: Monoid<A>) =>
  (xs: ReadonlyArray<A>): A =>
    xs.reduce(monoid.concat, monoid.empty);

/**
 * Maps each element into a monoid, then combines — "sum of", "any of",
 * "all the errors from", in one function.
 *
 * @law foldMap(m)(identity) ≡ concatAll(m)
 * @law foldMap(m)(f)([])    ≡ m.empty
 *
 * @example
 * const totalSeats = foldMap(monoidSum)((o: Order) => o.seats)(orders);
 * const anyOverdue = foldMap(monoidAny)((o: Order) => mkAny(o.overdue))(orders);
 */
export const foldMap =
  <A, B>(monoid: Monoid<B>) =>
  (f: (a: A) => B) =>
  (xs: ReadonlyArray<A>): B =>
    xs.reduce((acc, x) => monoid.concat(acc, f(x)), monoid.empty);

/**
 * Combines with a semigroup, which cannot handle the empty case — so the caller
 * supplies the starting value and totality is preserved without an identity.
 *
 * @law concatAllWith(s)(a)([]) ≡ a
 */
export const concatAllWith =
  <A>(semigroup: Semigroup<A>) =>
  (initial: A) =>
  (xs: ReadonlyArray<A>): A =>
    xs.reduce(semigroup.concat, initial);

/**
 * Reverses the argument order of a semigroup — the "dual".
 *
 * @law dual(dual(s)) combines identically to s
 * @law dual(semigroupFirst()) combines identically to semigroupLast()
 */
export const dual = <A>(semigroup: Semigroup<A>): Semigroup<A> =>
  mkSemigroup((x, y) => semigroup.concat(y, x));
