/**
 * @module traversals
 *
 * Array traversals for `Result` and `Option`, plus the observer taps.
 */

import { type Option, type Result, isErr, isNone, isOk, isSome, none, ok, some } from './adt.js';

/**
 * Sequences an array through a fallible function, collecting Ok values.
 * Short-circuits and returns the first Err encountered.
 * @law traverseArray(ok)(items) ≡ ok(items)
 * @law traverseArray(f)([])    ≡ ok([])
 */
export const traverseArray =
  <A, B, E>(f: (a: A) => Result<B, E>) =>
  (items: ReadonlyArray<A>): Result<ReadonlyArray<B>, E> =>
    items.reduce<Result<ReadonlyArray<B>, E>>(
      (acc, item) => {
        if (isErr(acc)) return acc;
        const r = f(item);
        return isOk(r) ? ok([...acc.value, r.value]) : r;
      },
      ok([]),
    );

/**
 * Sequences an array through an optional function, collecting Some values.
 * Short-circuits and returns None the moment any element maps to None.
 *
 * The Option analogue of `traverseArray`: apply f to every element and
 * collect the results if all succeed; return None if any element is absent.
 *
 * @example
 * traverseArrayOption(fromNullable)([1, 2, 3]) // Some([1, 2, 3])
 * traverseArrayOption(fromNullable)([1, null, 3]) // None
 *
 * @law traverseArrayOption(some)(items) ≡ some(items)
 * @law traverseArrayOption(f)([])       ≡ some([])
 */
export const traverseArrayOption =
  <A, B>(f: (a: A) => Option<B>) =>
  (items: ReadonlyArray<A>): Option<ReadonlyArray<B>> =>
    items.reduce<Option<ReadonlyArray<B>>>(
      (acc, item) => {
        if (isNone(acc)) return acc;
        const o = f(item);
        return isSome(o) ? some([...acc.value, o.value]) : none;
      },
      some([]),
    );

/**
 * Collapses an array of Options into an Option of an array.
 * Returns None if any element is None; otherwise Some of all values.
 *
 * Convenience specialisation of `traverseArrayOption` for when you already
 * have a `ReadonlyArray<Option<A>>`.
 *
 * @example
 * sequenceArrayOption([some(1), some(2), some(3)]) // Some([1, 2, 3])
 * sequenceArrayOption([some(1), none, some(3)])     // None
 *
 * @law sequenceArrayOption(xs) ≡ traverseArrayOption(x => x)(xs)
 */
export const sequenceArrayOption = <A>(items: ReadonlyArray<Option<A>>): Option<ReadonlyArray<A>> =>
  traverseArrayOption<Option<A>, A>((o) => o)(items);

/**
 * Runs an observer effect for Ok values and returns input Result.
 */
export const tap =
  <A, E>(f: (a: A) => void) =>
  (r: Result<A, E>): Result<A, E> => {
    if (isOk(r)) {
      f(r.value);
    }
    return r;
  };

/**
 * Runs an observer effect for Err values and returns input Result.
 */
export const tapErr =
  <A, E>(f: (e: E) => void) =>
  (r: Result<A, E>): Result<A, E> => {
    if (isErr(r)) {
      f(r.error);
    }
    return r;
  };
