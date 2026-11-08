/**
 * @module unit-interval
 *
 * `UnitInterval`: a finite number in `[0, 1]` — a share, an overlap, a
 * probability, a confidence or similarity score (Rule 1.13). The operations
 * here are closed over the interval, so a value computed from unit-interval
 * values never needs re-checking.
 */

import { type Option } from './adt.js';
import { type Brand } from './core.js';
import { mkClampedBetween, mkNumberBetween } from './numeric.js';

/** A `number` proven to be finite and within `[0, 1]`. */
export type UnitInterval = Brand<number, 'UnitInterval'>;

/**
 * Smart constructor for `UnitInterval`.
 *
 * @law isSome(mkUnitInterval(n)) ≡ Number.isFinite(n) && 0 <= n && n <= 1
 */
export const mkUnitInterval: (value: number) => Option<UnitInterval> = mkNumberBetween<'UnitInterval'>(0, 1);

/**
 * A unit-interval value from any number, total: clamped into `[0, 1]`, with
 * `NaN` as `0`. For a score from an outside source that may overshoot.
 *
 * @law clampUnitInterval(n) ≡ n  whenever 0 <= n <= 1
 */
export const clampUnitInterval: (value: number) => UnitInterval = mkClampedBetween<'UnitInterval'>(0, 1);

/**
 * The share `part / whole`, total: `0` for a whole that is not positive (an
 * empty whole has no share), clamped so a part larger than its whole is `1`.
 *
 * @law ratio(n, n) ≡ 1  for every positive finite n
 * @law ratio(p, w) ≡ 0  whenever w <= 0
 */
export const ratio = (part: number, whole: number): UnitInterval =>
  clampUnitInterval(whole > 0 ? part / whole : 0);

/**
 * The product of two unit-interval values, which stays in `[0, 1]` — the
 * chance of two independent events, an overlap of an overlap.
 *
 * @law multiplyUnitInterval(a, 1) ≡ a
 * @law multiplyUnitInterval(a, 0) ≡ 0
 * @law multiplyUnitInterval(a, b) ≡ multiplyUnitInterval(b, a)
 */
export const multiplyUnitInterval = (a: UnitInterval, b: UnitInterval): UnitInterval => clampUnitInterval(a * b);
