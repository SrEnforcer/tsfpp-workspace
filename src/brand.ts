/**
 * @module brand
 *
 * The one place a brand is applied (Rule 1.6). Every smart constructor in the
 * prelude is built from {@link refineBrand}, and consumers can build theirs
 * the same way, so a project needs no `as Brand<…>` assertion of its own.
 */

import { type Option, none, some } from './adt.js';
import { type Brand } from './core.js';

/**
 * Brands a value whose invariant the caller has just established.
 *
 * Internal: not re-exported from the root barrel. Every use must sit directly
 * behind the check that proves the invariant (a predicate, or a clamp).
 */
export const brandChecked = <T, B extends string>(value: T): Brand<T, B> =>
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- DEVIATION(1.6): the prelude's single brand site; callers apply it only after the invariant check
  value as Brand<T, B>;

/**
 * Builds the smart constructor of a brand from the predicate that defines it.
 *
 * Invariant enforced by the returned constructor: a branded value satisfies
 * `predicate`, unchanged.
 *
 * @law isSome(refineBrand(p)(x)) ≡ p(x)
 * @law refineBrand(p)(x) ≡ some(x)  whenever p(x)   (the value is not altered)
 * @example
 * type ReportId = Brand<string, 'ReportId'>;
 * const mkReportId = refineBrand<string, 'ReportId'>((raw) => /^[a-z0-9-]{1,64}$/u.test(raw));
 */
export const refineBrand =
  <T, B extends string>(predicate: (value: T) => boolean) =>
  (value: T): Option<Brand<T, B>> =>
    predicate(value) ? some(brandChecked<T, B>(value)) : none;
