/**
 * @module combinators
 *
 * Combinators over `Option` and `Result`: lifting from nullable and unknown
 * input, mapping, chaining, and the `tryCatch` adapters that reify thrown
 * exceptions as typed `Err` values.
 */

import { type Option, type Result, err, isNone, isOk, isSome, none, ok, some } from './adt.js';

/**
 * Lifts nullable inputs to Option.
 */
export const fromNullable = <A>(a: A | null | undefined): Option<A> =>
  a === null || a === undefined ? none : some(a);

/**
 * Type guard that excludes `undefined`.
 *
 * Useful for narrowing array/filter pipelines without introducing null checks.
 * For null-or-undefined values, prefer `fromNullable`.
 */
export const isDefined = <A>(value: A | undefined): value is A =>
  value !== undefined;

/**
 * Lifts unknown inputs to `Option<string>`.
 *
 * Preconditions: none.
 * Returns: `Some(value)` when input is a string (including empty string), `None` otherwise.
 */
export const fromUnknownString = (value: unknown): Option<string> =>
  typeof value === 'string' ? some(value) : none;

/**
 * Lifts unknown inputs to `Option<ReadonlyArray<unknown>>`.
 *
 * Preconditions: none.
 * Returns: `Some(array)` when input is an array, `None` otherwise.
 * @law Array-preservation: Array.isArray(x) => isSome(fromUnknownArray(x))
 * @law Non-array-elimination: Array.isArray(x) === false => fromUnknownArray(x) ≡ none
 */
export const fromUnknownArray = (value: unknown): Option<ReadonlyArray<unknown>> =>
  Array.isArray(value) ? some(value.map((item: unknown): unknown => item)) : none;

/**
 * Lifts unknown inputs to `Option<ReadonlyArray<A>>` using an element type guard.
 *
 * Preconditions: `predicate` must be a sound type guard for A.
 * Returns: `Some(array)` when input is an array and every element satisfies `predicate`; `None` otherwise.
 * @law Guarded-preservation: every(predicate)(xs) => isSome(fromUnknownArrayOf(predicate)(xs))
 * @law Guarded-elimination: Array.isArray(x) === false or contains non-matching element => fromUnknownArrayOf(predicate)(x) ≡ none
 */
export const fromUnknownArrayOf =
  <A>(predicate: (value: unknown) => value is A) =>
  (value: unknown): Option<ReadonlyArray<A>> => {
    const unknownArray = fromUnknownArray(value);
    if (isNone(unknownArray)) {
      return none;
    }

    return unknownArray.value.every((item: unknown): item is A => predicate(item))
      ? some(unknownArray.value)
      : none;
  };

/**
 * Lifts a potentially absent or blank string to `Option<string>`.
 * Trims whitespace; returns `None` for `undefined`, empty, or whitespace-only strings.
 *
 * Preconditions: none.
 * Returns: `Some(trimmed)` when non-empty after trim; `None` otherwise.
 */
export const fromNonEmptyString = (value: string | undefined): Option<string> => {
  if (typeof value !== 'string') return none;
  const trimmed = value.trim();
  return trimmed.length > 0 ? some(trimmed) : none;
};

/**
 * Returns Option value or lazy fallback.
 */
export const getOrElseOption =
  <A>(onNone: () => A) =>
  (o: Option<A>): A =>
    isSome(o) ? o.value : onNone();

/**
 * Maps the inner value of a Some; passes None through unchanged.
 * @law Identity:    mapOption((x) => x)(o) ≡ o
 * @law Composition: mapOption(f ∘ g)(o) ≡ mapOption(f)(mapOption(g)(o))
 */
export const mapOption =
  <A, B>(f: (a: A) => B) =>
  (o: Option<A>): Option<B> =>
    isSome(o) ? some(f(o.value)) : none;

/**
 * Monadic bind for Option.
 * @law Left identity:  flatMapOption(f)(some(a)) ≡ f(a)
 * @law Right identity: flatMapOption(some)(o)     ≡ o
 * @law Associativity:  flatMapOption(g)(flatMapOption(f)(o)) ≡ flatMapOption(x => flatMapOption(g)(f(x)))(o)
 */
export const flatMapOption =
  <A, B>(f: (a: A) => Option<B>) =>
  (o: Option<A>): Option<B> =>
    isSome(o) ? f(o.value) : none;

/**
 * Returns the first Some or the lazy alternative when None.
 * @law Left identity:  orElseOption(() => some(b))(some(a)) ≡ some(a)
 * @law Right identity: orElseOption(() => none)(o)          ≡ o
 */
export const orElseOption =
  <A>(onNone: () => Option<A>) =>
  (o: Option<A>): Option<A> =>
    isSome(o) ? o : onNone();

/**
 * Maps an Ok value and propagates Err untouched.
 * @law Identity:    map((x) => x)(r) ≡ r
 * @law Composition: map(f ∘ g)(r) ≡ map(f)(map(g)(r))
 */
export const map =
  <A, B, E>(f: (a: A) => B) =>
  (r: Result<A, E>): Result<B, E> =>
    isOk(r) ? ok(f(r.value)) : r;

/**
 * Monadic bind for Result.
 * @law Left identity:  flatMap(f)(ok(a))   ≡ f(a)
 * @law Right identity: flatMap(ok)(r)       ≡ r
 * @law Associativity:  flatMap(g)(flatMap(f)(r)) ≡ flatMap(x => flatMap(g)(f(x)))(r)
 */
export const flatMap =
  <A, B, E>(f: (a: A) => Result<B, E>) =>
  (r: Result<A, E>): Result<B, E> =>
    isOk(r) ? f(r.value) : r;

/**
 * Async monadic bind for Result-returning effects.
 */
export const flatMapAsync =
  <A, B, E>(f: (a: A) => Promise<Result<B, E>>) =>
  async (r: Result<A, E>): Promise<Result<B, E>> =>
    isOk(r) ? f(r.value) : r;

/**
 * Captures thrown errors into Result.
 * adapter boundary (Rule 6.2): `try/catch` is intentional here — this function
 * exists to reify thrown exceptions as typed `Err` values.
 */
export const tryCatch = <A, E>(f: () => A, onErr: (e: unknown) => E): Result<A, E> => {
  try {
    return ok(f());
  } catch (e) {
    return err(onErr(e));
  }
};

/**
 * Async variant of tryCatch.
 * adapter boundary (Rule 6.2): `try/catch` is intentional here — this function
 * exists to reify rejected Promises as typed `Err` values.
 */
export const tryCatchAsync = async <A, E>(
  f: () => Promise<A>,
  onErr: (e: unknown) => E,
): Promise<Result<A, E>> => {
  try {
    return ok(await f());
  } catch (e) {
    return err(onErr(e));
  }
};

/**
 * Converts an Option to a nullable value.
 * Complement of `fromNullable`.
 * Preconditions: none.
 * Returns: the inner value for Some; null for None.
 */
export const toNullable = <A>(o: Option<A>): A | null =>
  isSome(o) ? o.value : null;
