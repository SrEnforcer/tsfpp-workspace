/**
 * @module adt
 *
 * The core algebraic data types — `Option` (absence) and `Result` (failure) —
 * with their constructors, type guards, `Unit`, and the boolean monoid brands.
 */

import { type Brand } from './core.js';

/**
 * Optional value ADT.
 */
export type Option<A> =
  | { readonly _tag: 'Some'; readonly value: A }
  | { readonly _tag: 'None' };

/**
 * Explicit unit type for `Result` success variants that carry no meaningful
 * value. Prefer `Result<Unit, E>` over `Result<void, E>` — `void` is not a
 * first-class value and cannot be stored, passed, or serialised. `Unit` is
 * structurally `undefined`, so `ok(unit)` works without special-casing.
 *
 * @example
 * const saveSettings = (cfg: Config): Result<Unit, string> =>
 *   isValid(cfg) ? ok(unit) : err('invalid config');
 */
export type Unit = undefined;

/**
 * The single inhabitant of `Unit`.
 */
export const unit: Unit = undefined;

/**
 * Fallible computation ADT.
 */
export type Result<A, E> =
  | { readonly _tag: 'Ok'; readonly value: A }
  | { readonly _tag: 'Err'; readonly error: E };

/**
 * Constructs a present Option value.
 */
export const some = <A>(value: A): Option<A> => ({ _tag: 'Some', value });

/**
 * Represents the absent Option variant.
 */
export const none: Option<never> = { _tag: 'None' };

/**
 * Type guard for Option Some.
 */
export const isSome = <A>(o: Option<A>): o is { readonly _tag: 'Some'; readonly value: A } =>
  o._tag === 'Some';

/**
 * Type guard for Option None.
 */
export const isNone = <A>(o: Option<A>): o is { readonly _tag: 'None' } => o._tag === 'None';

/**
 * Constructs an Ok Result.
 */
export const ok = <A, E = never>(value: A): Result<A, E> => ({ _tag: 'Ok', value });

/**
 * Constructs an Err Result.
 */
export const err = <E, A = never>(error: E): Result<A, E> => ({ _tag: 'Err', error });

/**
 * Type guard for Result Ok.
 */
export const isOk = <A, E>(r: Result<A, E>): r is { readonly _tag: 'Ok'; readonly value: A } =>
  r._tag === 'Ok';

/**
 * Type guard for Result Err.
 */
export const isErr = <A, E>(r: Result<A, E>): r is { readonly _tag: 'Err'; readonly error: E } =>
  r._tag === 'Err';

/**
 * Boolean all-monoid wrapper.
 */
export type Every = Brand<boolean, 'Every'>;

/**
 * Boolean any-monoid wrapper.
 */
export type Any = Brand<boolean, 'Any'>;

/**
 * Smart constructor for Every brand.
 */
export const mkEvery = (b: boolean): Every => b as Every; // eslint-disable-line @typescript-eslint/consistent-type-assertions -- DEVIATION(1.4): smart-constructor body

/**
 * Smart constructor for Any brand.
 */
export const mkAny = (b: boolean): Any => b as Any; // eslint-disable-line @typescript-eslint/consistent-type-assertions -- DEVIATION(1.4): smart-constructor body
