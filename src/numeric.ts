/**
 * @module numeric
 *
 * Range-bounded numerics (Rule 1.13). Most domain numbers are not just
 * "positive" — they are a zoom level in [0, 22], a year from 2016, an hour of
 * the week in [0, 167]. These factories build the smart constructor of such a
 * brand from its bounds, so the check is written once and no project needs a
 * brand assertion of its own.
 *
 * - {@link checkNumber} says *why* a number fails a spec, for parsers that
 *   report issues (e.g. into a `Validation`).
 * - {@link mkIntBetween} / {@link mkNumberBetween} are the `Option`-returning
 *   smart constructors of a bounded brand.
 * - {@link mkClampedBetween} is the *total* constructor: it clamps instead of
 *   refusing, for arithmetic whose result must stay in range.
 */

import { type Option, type Result, err, isOk, isSome, none, ok, some } from './adt.js';
import { brandChecked, refineBrand } from './brand.js';
import { type Brand } from './core.js';

/** A `number` proven to be an integer within `Number.MIN_SAFE_INTEGER … Number.MAX_SAFE_INTEGER`. */
export type SafeInt = Brand<number, 'SafeInt'>;

/** A `number` proven to be a safe integer `>= 1` — a count, a term, a page size. */
export type PositiveInt = Brand<number, 'PositiveInt'>;

/** Why a number fails a {@link NumberSpec}. */
export type NumberIssue =
  | { readonly kind: 'not-finite' }
  | { readonly kind: 'not-integer' }
  | { readonly kind: 'not-safe-integer' }
  | { readonly kind: 'below-minimum'; readonly minimum: number }
  | { readonly kind: 'above-maximum'; readonly maximum: number };

/**
 * What a number must be. Every number must be finite; `integer` further
 * requires a *safe* integer (beyond 2^53 integer arithmetic is no longer
 * exact); `minimum` and `maximum` are inclusive.
 */
export type NumberSpec = {
  readonly integer?: boolean;
  readonly minimum?: number;
  readonly maximum?: number;
};

const integerIssue = (value: number): Option<NumberIssue> => {
  if (!Number.isInteger(value)) return some({ kind: 'not-integer' });
  if (!Number.isSafeInteger(value)) return some({ kind: 'not-safe-integer' });
  return none;
};

/**
 * Checks a number against a spec, reporting the first issue: finiteness,
 * then integrality, then the minimum, then the maximum.
 *
 * @law isOk(checkNumber({})(n))  ≡ Number.isFinite(n)
 * @law isOk(checkNumber({ integer: true })(n)) ≡ Number.isSafeInteger(n)
 * @law checkNumber(spec)(n) ≡ ok(n)  whenever it succeeds (the value is not altered)
 */
export const checkNumber =
  (spec: NumberSpec) =>
  (value: number): Result<number, NumberIssue> => {
    if (!Number.isFinite(value)) return err({ kind: 'not-finite' });
    const integral = spec.integer === true ? integerIssue(value) : none;
    if (isSome(integral)) return err(integral.value);
    if (spec.minimum !== undefined && value < spec.minimum) return err({ kind: 'below-minimum', minimum: spec.minimum });
    if (spec.maximum !== undefined && value > spec.maximum) return err({ kind: 'above-maximum', maximum: spec.maximum });
    return ok(value);
  };

/**
 * The `Result`-returning smart constructor of a brand defined by a spec:
 * the branded number, or the issue it fails on.
 *
 * @law isOk(refineNumber(spec)(n)) ≡ isOk(checkNumber(spec)(n))
 */
export const refineNumber =
  <B extends string>(spec: NumberSpec) =>
  (value: number): Result<Brand<number, B>, NumberIssue> => {
    const checked = checkNumber(spec)(value);
    return isOk(checked) ? ok(brandChecked<number, B>(checked.value)) : checked;
  };

/**
 * The smart constructor of a brand of safe integers in `[minimum, maximum]`.
 *
 * @law isSome(mkIntBetween(lo, hi)(n)) ≡ Number.isSafeInteger(n) && lo <= n && n <= hi
 * @example
 * type Zoom = Brand<number, 'Zoom'>;
 * const mkZoom = mkIntBetween<'Zoom'>(0, 22);
 */
export const mkIntBetween = <B extends string>(minimum: number, maximum: number): ((value: number) => Option<Brand<number, B>>) =>
  refineBrand<number, B>((value) => isOk(checkNumber({ integer: true, minimum, maximum })(value)));

/**
 * The smart constructor of a brand of finite numbers in `[minimum, maximum]`.
 *
 * @law isSome(mkNumberBetween(lo, hi)(n)) ≡ Number.isFinite(n) && lo <= n && n <= hi
 */
export const mkNumberBetween = <B extends string>(minimum: number, maximum: number): ((value: number) => Option<Brand<number, B>>) =>
  refineBrand<number, B>((value) => isOk(checkNumber({ minimum, maximum })(value)));

/**
 * Clamps a number into `[minimum, maximum]`, total: `NaN` becomes `minimum`,
 * `±Infinity` the nearer bound.
 *
 * Preconditions: `minimum <= maximum`, both finite.
 *
 * @law minimum <= clamp(minimum, maximum)(n) <= maximum
 * @law clamp(lo, hi)(n) ≡ n  whenever lo <= n <= hi
 * @law clamp(lo, hi)(clamp(lo, hi)(n)) ≡ clamp(lo, hi)(n)   (idempotent)
 */
export const clamp =
  (minimum: number, maximum: number) =>
  (value: number): number =>
    Number.isNaN(value) ? minimum : Math.min(maximum, Math.max(minimum, value));

/**
 * The total constructor of a bounded brand: the number clamped into
 * `[minimum, maximum]`, then branded. For arithmetic whose result must stay
 * in range — an instant moved by an offset, a share of a whole.
 *
 * Preconditions: `minimum <= maximum`, both finite. An integer brand needs
 * integer arguments; this clamps, it does not round.
 *
 * @law mkClampedBetween(lo, hi)(n) ≡ clamp(lo, hi)(n)   (as a number)
 */
export const mkClampedBetween =
  <B extends string>(minimum: number, maximum: number) =>
  (value: number): Brand<number, B> =>
    brandChecked<number, B>(clamp(minimum, maximum)(value));

/**
 * Smart constructor for `SafeInt`. Prefer it over `mkInt` for anything used
 * in arithmetic: `mkInt` accepts integers beyond 2^53, where `n + 1 === n`.
 *
 * @law isSome(mkSafeInt(n)) ≡ Number.isSafeInteger(n)
 */
export const mkSafeInt: (value: number) => Option<SafeInt> = refineBrand<number, 'SafeInt'>((value) => Number.isSafeInteger(value));

/**
 * Smart constructor for `PositiveInt`.
 *
 * @law isSome(mkPositiveInt(n)) ≡ Number.isSafeInteger(n) && n >= 1
 */
export const mkPositiveInt: (value: number) => Option<PositiveInt> = mkIntBetween<'PositiveInt'>(1, Number.MAX_SAFE_INTEGER);
