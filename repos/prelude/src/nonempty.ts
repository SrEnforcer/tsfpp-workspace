/**
 * @module nonempty
 *
 * `NonEmptyReadonlyArray<A>` — an array whose emptiness is excluded by its type.
 *
 * ## Why the combinators matter as much as the type
 *
 * The type alone is only half an ADT. Proving an array is non-empty and then
 * calling `.map()` on it hands back a plain `ReadonlyArray`: the proof is
 * discarded on the first transformation, and the caller is back to `Option` for
 * every subsequent `head`. A refinement that cannot survive a `map` buys very
 * little.
 *
 * These combinators preserve the refinement across the operations that cannot
 * empty a collection — mapping, reversing, sorting, appending — so the proof is
 * established once at the boundary and carried for the rest of the pipeline.
 *
 * ## The totality payoff
 *
 * `Array.prototype.reduce` without an initial value is *partial*: it throws on
 * an empty array. `reduceNonEmpty` is the same operation with the empty case
 * excluded by the type, which is the cleanest illustration in the prelude of
 * what a refinement actually buys — a partial standard-library function becomes
 * total, with no `Option` wrapper and no runtime guard.
 *
 * ## Semigroup, not monoid
 *
 * Two non-empty arrays concatenate to a non-empty array, so this is a lawful
 * semigroup. It is *not* a monoid: the identity would have to be an empty
 * non-empty array, which the type makes unrepresentable. See `semigroupNonEmpty`
 * in the `monoid` module — this is the concrete example behind that distinction,
 * and it is exactly the structure `Validation` uses to accumulate its errors.
 */

import { type Option, none, some } from './adt.js';
import type { Result } from './adt.js';
import { isOk, ok } from './adt.js';
import type { Ord } from './eq.js';

/**
 * A readonly array proven to hold at least one element. The leading `A` in the
 * tuple is what makes `headNonEmpty` total.
 */
export type NonEmptyReadonlyArray<A> = readonly [A, ...ReadonlyArray<A>];

/**
 * Type guard proving an array is non-empty. Narrows to
 * `NonEmptyReadonlyArray<A>`, after which the total accessors apply.
 */
export const isNonEmptyArray = <A>(
  xs: ReadonlyArray<A>,
): xs is NonEmptyReadonlyArray<A> => xs.length > 0;

/**
 * Smart constructor lifting a possibly-empty array into `Option` of a
 * non-empty one. The sole gateway into `NonEmptyReadonlyArray` (Rule 1.3).
 *
 * @law isSome(mkNonEmpty(xs)) ≡ xs.length > 0
 */
export const mkNonEmpty = <A>(
  xs: ReadonlyArray<A>,
): Option<NonEmptyReadonlyArray<A>> =>
  isNonEmptyArray(xs) ? some(xs) : none;

/**
 * Builds a non-empty array from a guaranteed head and a possibly-empty tail.
 * The total constructor — no `Option`, because non-emptiness is supplied.
 *
 * @law headNonEmpty(consNonEmpty(a)(xs)) ≡ a
 */
export const consNonEmpty =
  <A>(head: A) =>
  (tail: ReadonlyArray<A>): NonEmptyReadonlyArray<A> => [head, ...tail];

/** A non-empty array of exactly one element. */
export const singletonNonEmpty = <A>(value: A): NonEmptyReadonlyArray<A> => [value];

/**
 * Total head: the first element, with no `Option` wrapper, because the type
 * guarantees it exists.
 */
export const headNonEmpty = <A>(xs: NonEmptyReadonlyArray<A>): A => xs[0];

/**
 * Total last: the final element. Uses `reduce` without an initial value, which
 * is itself total only on non-empty input — exactly the guarantee the type carries.
 */
export const lastNonEmpty = <A>(xs: NonEmptyReadonlyArray<A>): A =>
  xs.reduce((_prev, curr) => curr);

/**
 * Everything after the head. Returns a plain `ReadonlyArray` because the tail
 * of a one-element array *is* empty — the refinement genuinely does not survive.
 */
export const tailNonEmpty = <A>(xs: NonEmptyReadonlyArray<A>): ReadonlyArray<A> => xs.slice(1);

/** Widens to a plain `ReadonlyArray`, discarding the proof. */
export const toArrayNonEmpty = <A>(xs: NonEmptyReadonlyArray<A>): ReadonlyArray<A> => xs;

/** The element count, which the type guarantees is at least 1. */
export const lengthNonEmpty = <A>(xs: NonEmptyReadonlyArray<A>): number => xs.length;

/**
 * Maps every element, **preserving non-emptiness** — the combinator whose
 * absence made the type half-useful.
 *
 * @law Identity:    mapNonEmpty(x => x)(xs) ≡ xs
 * @law Composition: mapNonEmpty(g)(mapNonEmpty(f)(xs)) ≡ mapNonEmpty(x => g(f(x)))(xs)
 * @law Length-preserving: mapNonEmpty(f)(xs).length ≡ xs.length
 */
export const mapNonEmpty =
  <A, B>(f: (a: A) => B) =>
  (xs: NonEmptyReadonlyArray<A>): NonEmptyReadonlyArray<B> =>
    [f(xs[0]), ...xs.slice(1).map(f)];

/**
 * Appends an element. Non-emptiness is preserved trivially.
 *
 * @law lastNonEmpty(appendNonEmpty(a)(xs)) ≡ a
 */
export const appendNonEmpty =
  <A>(value: A) =>
  (xs: NonEmptyReadonlyArray<A>): NonEmptyReadonlyArray<A> => [xs[0], ...xs.slice(1), value];

/**
 * Prepends an element.
 *
 * @law headNonEmpty(prependNonEmpty(a)(xs)) ≡ a
 */
export const prependNonEmpty =
  <A>(value: A) =>
  (xs: NonEmptyReadonlyArray<A>): NonEmptyReadonlyArray<A> => [value, ...xs];

/**
 * Concatenation — the semigroup operation. Two non-empty arrays cannot combine
 * to an empty one, so the refinement is preserved by construction.
 *
 * @law associativity: concatNonEmpty(concatNonEmpty(a)(b))(c) ≡ concatNonEmpty(a)(concatNonEmpty(b)(c))
 * @law length: (xs ++ ys).length ≡ xs.length + ys.length
 */
export const concatNonEmpty =
  <A>(ys: NonEmptyReadonlyArray<A>) =>
  (xs: NonEmptyReadonlyArray<A>): NonEmptyReadonlyArray<A> => [xs[0], ...xs.slice(1), ...ys];

/**
 * Reverses, preserving non-emptiness.
 *
 * @law involutive: reverseNonEmpty(reverseNonEmpty(xs)) ≡ xs
 * @law headNonEmpty(reverseNonEmpty(xs)) ≡ lastNonEmpty(xs)
 */
export const reverseNonEmpty = <A>(xs: NonEmptyReadonlyArray<A>): NonEmptyReadonlyArray<A> => {
  const reversed = [...xs].reverse();
  return [lastNonEmpty(xs), ...reversed.slice(1)];
};

/**
 * Sorts a **copy** under an explicit `Ord` (Rules 2.3, 4.7), preserving
 * non-emptiness — sorting cannot remove elements.
 *
 * @law length-preserving
 * @law idempotent
 */
export const sortNonEmpty =
  <A>(ord: Ord<A>) =>
  (xs: NonEmptyReadonlyArray<A>): NonEmptyReadonlyArray<A> => {
    const sorted = [...xs].sort(ord.compare);
    // Sorting preserves length, so `sorted` is always non-empty. Recovering the
    // refinement through the guard keeps this assertion-free; the fallback arm
    // is unreachable and simply returns the (already sorted) input shape.
    return isNonEmptyArray(sorted) ? sorted : xs;
  };

/**
 * Folds without an initial value — **total**, because the empty case that makes
 * `Array.prototype.reduce` throw is excluded by the type.
 *
 * This is the clearest demonstration of what the refinement buys: a partial
 * standard-library function becomes total, with no `Option` and no guard.
 *
 * @law reduceNonEmpty(f)([a]) ≡ a
 */
export const reduceNonEmpty =
  <A>(f: (acc: A, value: A) => A) =>
  (xs: NonEmptyReadonlyArray<A>): A =>
    xs.reduce(f);

/**
 * Maps into `B` and folds with a semigroup-style combine — total for the same
 * reason as `reduceNonEmpty`, and the non-empty analogue of `foldMap` that
 * needs no `Monoid` because no identity is required.
 */
export const reduceMapNonEmpty =
  <A, B>(f: (a: A) => B, combine: (x: B, y: B) => B) =>
  (xs: NonEmptyReadonlyArray<A>): B =>
    xs.slice(1).reduce<B>((acc, x) => combine(acc, f(x)), f(xs[0]));

/**
 * Fallible traversal preserving non-emptiness: `Ok` of a non-empty array, or
 * the first `Err`.
 *
 * @law All-Ok input yields Ok of the mapped non-empty array.
 */
export const traverseNonEmpty =
  <A, B, E>(f: (a: A) => Result<B, E>) =>
  (xs: NonEmptyReadonlyArray<A>): Result<NonEmptyReadonlyArray<B>, E> => {
    const head = f(xs[0]);
    if (!isOk(head)) return head;

    return xs.slice(1).reduce<Result<NonEmptyReadonlyArray<B>, E>>((acc, x) => {
      if (!isOk(acc)) return acc;
      const next = f(x);
      return isOk(next) ? ok(appendNonEmpty(next.value)(acc.value)) : next;
    }, ok([head.value]));
  };
