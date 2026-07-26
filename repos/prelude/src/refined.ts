/**
 * @module refined
 *
 * Total eliminators (Rule 8.5) and refined numerics `Int` / `Positive` /
 * `NonNegative` (Rule 1.13).
 *
 * `NonEmptyReadonlyArray` and its combinators live in the `nonempty` module
 * (Rule 11.1: one type, one file).
 */

import { type Option, type Result, err, isErr, isOk, isSome, none, some } from './adt.js';
import { fromNullable } from './combinators.js';
import { type Brand } from './core.js';

/**
 * Total eliminator for Option. Supplies a handler for each variant and returns
 * their common result type. Prefer this over chained `isSome` guards when both
 * branches yield a value (Rule 8.5).
 *
 * @law matchOption(n, s)(none)     ≡ n()
 * @law matchOption(n, s)(some(a))  ≡ s(a)
 * @example
 * const render = matchOption(() => 'anonymous', (u: User) => u.name);
 */
export const matchOption =
  <A, B>(onNone: () => B, onSome: (a: A) => B) =>
  (o: Option<A>): B =>
    isSome(o) ? onSome(o.value) : onNone();

/**
 * Total eliminator for Result. Supplies a handler for each variant and returns
 * their common result type. The error handler comes first, mirroring the
 * `Err`-left / `Ok`-right reading order.
 *
 * @law match(e, o)(err(x))  ≡ e(x)
 * @law match(e, o)(ok(a))   ≡ o(a)
 * @example
 * const status = match(
 *   (e: ApiError) => e.kind,
 *   (u: User) => 'ok',
 * );
 */
export const match =
  <A, E, B>(onErr: (e: E) => B, onOk: (a: A) => B) =>
  (r: Result<A, E>): B =>
    isOk(r) ? onOk(r.value) : onErr(r.error);

/**
 * Unwraps a Result to its success value, computing a fallback from the error.
 * The Result counterpart to Option's `getOrElseOption`.
 *
 * @law getOrElse(f)(ok(a))   ≡ a
 * @law getOrElse(f)(err(e))  ≡ f(e)
 */
export const getOrElse =
  <A, E>(onErr: (e: E) => A) =>
  (r: Result<A, E>): A =>
    isOk(r) ? r.value : onErr(r.error);

/**
 * Maps the error channel of a Result, leaving the success channel untouched.
 * The canonical tool for Rule 6.7: remap a boundary error (e.g. a Zod message
 * or a raw `unknown`) into a tagged domain error union as it crosses inward.
 *
 * @law mapErr(f)(ok(a))       ≡ ok(a)
 * @law mapErr(f)(err(e))      ≡ err(f(e))
 * @law mapErr(identity)       ≡ identity            (identity)
 * @law mapErr(g)(mapErr(f)(r)) ≡ mapErr(x => g(f(x)))(r)  (fusion)
 */
export const mapErr =
  <A, E, F>(f: (e: E) => F) =>
  (r: Result<A, E>): Result<A, F> =>
    isErr(r) ? err(f(r.error)) : r;

/**
 * Total array search: returns the first element satisfying the predicate as
 * `Some`, or `None` if there is no match. Replaces `Array.prototype.find`,
 * whose `A | undefined` result reintroduces the partiality `Option` removes
 * (Rule 6.3).
 *
 * @law findO(() => true)(xs)  ≡ headArray(xs)
 * @law findO(() => false)(xs) ≡ none
 */
export const findO =
  <A>(pred: (a: A) => boolean) =>
  (xs: ReadonlyArray<A>): Option<A> =>
    fromNullable(xs.find(pred));

// ---------------------------------------------------------------------------
// Refined numerics — no numeric hazards (Rule 1.13)
//
// `number` includes `NaN`, `Infinity`, and `-Infinity`, none of which satisfy
// the ordinary numeric laws (`NaN !== NaN`; `Infinity + 1 === Infinity`). They
// are illegal states the bare type fails to exclude. These brands push the
// finiteness / sign / integrality check to a smart constructor once, so the
// core consumes a value on which arithmetic reasoning is sound.
// ---------------------------------------------------------------------------

/** A `number` proven to be finite, an integer. */
export type Int = Brand<number, 'Int'>;

/** A `number` proven to be finite and strictly greater than zero. */
export type Positive = Brand<number, 'Positive'>;

/** A `number` proven to be finite and greater than or equal to zero. */
export type NonNegative = Brand<number, 'NonNegative'>;

/**
 * Guard for a usable real number: finite (excludes `NaN`, `±Infinity`).
 * Prefer this over the global `isFinite`, which coerces its argument.
 */
export const isFiniteNumber = (value: number): boolean => Number.isFinite(value);

/**
 * Smart constructor for `Int`. `Some` iff `value` is a finite integer.
 * @law isSome(mkInt(n)) ≡ Number.isInteger(n)
 */
export const mkInt = (value: number): Option<Int> =>
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- DEVIATION(1.6): smart-constructor body, brand applied after Number.isInteger guard
  Number.isInteger(value) ? some(value as Int) : none;

/**
 * Smart constructor for `Positive`. `Some` iff `value` is finite and `> 0`.
 * @law isSome(mkPositive(n)) ≡ Number.isFinite(n) && n > 0
 */
export const mkPositive = (value: number): Option<Positive> =>
  Number.isFinite(value) && value > 0
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- DEVIATION(1.6): smart-constructor body, brand applied after finiteness/sign guard
    ? some(value as Positive)
    : none;

/**
 * Smart constructor for `NonNegative`. `Some` iff `value` is finite and `>= 0`.
 * @law isSome(mkNonNegative(n)) ≡ Number.isFinite(n) && n >= 0
 */
export const mkNonNegative = (value: number): Option<NonNegative> =>
  Number.isFinite(value) && value >= 0
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- DEVIATION(1.6): smart-constructor body, brand applied after finiteness/sign guard
    ? some(value as NonNegative)
    : none;
