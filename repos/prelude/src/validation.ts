/**
 * @module validation
 *
 * `Validation<E, A>` — the error-accumulating sibling of `Result<A, E>`.
 *
 * ## Why a second failure ADT
 *
 * `Result` is monadic: `flatMap` sequences dependent steps, so the first `Err`
 * short-circuits and every later step is skipped. That is correct when a step
 * *depends* on its predecessor — you cannot charge a card for an order that
 * failed to parse.
 *
 * It is the wrong shape when the checks are *independent* and the caller must
 * see all of them. Validating a submitted form field-by-field is the canonical
 * case: reporting "email is invalid", then — after the user fixes it — "postcode
 * is invalid", is a worse product than reporting both at once. `traverseArray`
 * cannot express this, because it returns on the first `Err`.
 *
 * `Validation` is *applicative*, not monadic: it has no `flatMap`, precisely
 * because independence is what licenses accumulation. Combining two `Invalid`
 * values concatenates their errors instead of discarding the second.
 *
 * ## Choosing between them (standard Rule 6.8)
 *
 * - The next step needs the previous step's value → `Result` (short-circuit).
 * - The checks are independent and the caller wants every failure → `Validation`.
 *
 * Convert at the boundary with `validationToResult` / `resultToValidation`; the
 * domain core normally speaks `Result`, and `Validation` appears where a batch
 * of independent checks is run.
 *
 * @example
 * const parsed = sequenceStructValidation({
 *   name:  parseName(raw),
 *   email: parseEmail(raw),
 * });
 * // Invalid carries BOTH issues, ready for an RFC 9457 `errors` array.
 */

import {
  type NonEmptyReadonlyArray,
  type Result,
  err,
  isOk,
  keysOf,
  ok,
} from './fp.js';
import { concatNonEmpty, mapNonEmpty } from './nonempty.js';

/**
 * Accumulating validation ADT.
 *
 * The `Invalid` variant carries a `NonEmptyReadonlyArray`, so "invalid with no
 * reason" is unrepresentable — the type itself guarantees a caller can always
 * report at least one cause.
 */
export type Validation<E, A> =
  | { readonly _tag: 'Valid'; readonly value: A }
  | { readonly _tag: 'Invalid'; readonly errors: NonEmptyReadonlyArray<E> };

/**
 * Constructs a successful validation.
 */
export const valid = <E, A>(value: A): Validation<E, A> => ({ _tag: 'Valid', value });

/**
 * Constructs a failed validation carrying exactly one error.
 */
export const invalid = <E, A = never>(error: E): Validation<E, A> => ({
  _tag: 'Invalid',
  errors: [error],
});

/**
 * Constructs a failed validation from an existing non-empty error collection.
 */
export const invalidAll = <E, A = never>(
  errors: NonEmptyReadonlyArray<E>,
): Validation<E, A> => ({ _tag: 'Invalid', errors });

/**
 * Type guard for the `Valid` variant.
 */
export const isValid = <E, A>(
  v: Validation<E, A>,
): v is { readonly _tag: 'Valid'; readonly value: A } => v._tag === 'Valid';

/**
 * Type guard for the `Invalid` variant.
 */
export const isInvalid = <E, A>(
  v: Validation<E, A>,
): v is { readonly _tag: 'Invalid'; readonly errors: NonEmptyReadonlyArray<E> } =>
  v._tag === 'Invalid';

/**
 * Concatenates two non-empty error collections, preserving order.
 *
 * This is the non-empty-array semigroup (`semigroupNonEmpty`) applied to the
 * error channel — the structure that makes accumulation lawful.
 */
const concatErrors = <E>(
  xs: NonEmptyReadonlyArray<E>,
  ys: NonEmptyReadonlyArray<E>,
): NonEmptyReadonlyArray<E> => concatNonEmpty(ys)(xs);

/**
 * Maps the success channel, leaving accumulated errors untouched.
 *
 * @law Identity:    mapValidation(x => x)(v) ≡ v
 * @law Composition: mapValidation(g)(mapValidation(f)(v)) ≡ mapValidation(x => g(f(x)))(v)
 */
export const mapValidation =
  <E, A, B>(f: (a: A) => B) =>
  (v: Validation<E, A>): Validation<E, B> =>
    isValid(v) ? valid(f(v.value)) : v;

/**
 * Maps every accumulated error, leaving the success channel untouched.
 * The canonical tool for remapping raw parse errors into domain field issues.
 *
 * @law Identity: mapErrorsValidation(x => x)(v) ≡ v
 */
export const mapErrorsValidation =
  <E, F, A>(f: (e: E) => F) =>
  (v: Validation<E, A>): Validation<F, A> =>
    isInvalid(v) ? invalidAll<F, A>(mapNonEmpty(f)(v.errors)) : v;

/**
 * Applicative application — the primitive that makes accumulation possible.
 * When both sides are `Invalid`, their errors are concatenated rather than the
 * second being discarded (which is exactly what a monadic bind would do).
 *
 * @law Accumulation: apValidation(invalid(e2))(invalid(e1)) collects [e1, e2]
 */
export const apValidation =
  <E, A, B>(va: Validation<E, A>) =>
  (vf: Validation<E, (a: A) => B>): Validation<E, B> => {
    if (isValid(vf)) return isValid(va) ? valid(vf.value(va.value)) : va;
    return isValid(va) ? vf : invalidAll<E, B>(concatErrors(vf.errors, va.errors));
  };

/**
 * Total eliminator (standard Rule 8.5). Supplies a handler per variant and
 * returns their common result type; the error handler comes first.
 */
export const matchValidation =
  <E, A, B>(onInvalid: (errors: NonEmptyReadonlyArray<E>) => B, onValid: (a: A) => B) =>
  (v: Validation<E, A>): B =>
    isValid(v) ? onValid(v.value) : onInvalid(v.errors);

/**
 * Maps every element and accumulates the errors of *all* failures.
 *
 * This is the accumulating counterpart to `traverseArray`, which short-circuits
 * on the first `Err`.
 *
 * @law Valid-only input yields Valid of the mapped array.
 * @law The error order matches the input order.
 */
export const traverseArrayValidation =
  <E, A, B>(f: (a: A) => Validation<E, B>) =>
  (items: ReadonlyArray<A>): Validation<E, ReadonlyArray<B>> =>
    items.reduce<Validation<E, ReadonlyArray<B>>>((acc, item) => {
      const v = f(item);
      if (isValid(acc)) {
        return isValid(v) ? valid([...acc.value, v.value]) : invalidAll<E, ReadonlyArray<B>>(v.errors);
      }
      return isValid(v) ? acc : invalidAll<E, ReadonlyArray<B>>(concatErrors(acc.errors, v.errors));
    }, valid([]));

/**
 * Collapses an array of validations, accumulating every error.
 *
 * @law sequenceArrayValidation(vs) ≡ traverseArrayValidation(v => v)(vs)
 */
export const sequenceArrayValidation = <E, A>(
  items: ReadonlyArray<Validation<E, A>>,
): Validation<E, ReadonlyArray<A>> => traverseArrayValidation<E, Validation<E, A>, A>((v) => v)(items);

/**
 * Record of validations, keyed the same way as the target struct.
 */
type ValidationStruct<E, T> = { readonly [K in keyof T]: Validation<E, T[K]> };

/**
 * Validates a record of independent fields and accumulates every failure.
 *
 * This is the ergonomic entry point for form and request-body validation: pass
 * one `Validation` per field, receive either the fully-typed struct or every
 * field error at once — the shape an RFC 9457 `errors` array wants.
 *
 * @example
 * const v = sequenceStructValidation({
 *   name:  parseName(raw),   // Validation<FieldIssue, string>
 *   email: parseEmail(raw),  // Validation<FieldIssue, Email>
 * });
 * // Validation<FieldIssue, { name: string; email: Email }>
 */
export const sequenceStructValidation = <E, T extends Readonly<Record<string, unknown>>>(
  fields: ValidationStruct<E, T>,
): Validation<E, T> => {
  // `keysOf` preserves the key type that `Object.keys` discards, so the index
  // access below needs no assertion. The remaining cast is irreducible: TypeScript
  // cannot prove that entries rebuilt from a record's own keys reconstitute its
  // mapped type, so one DEVIATION stays and one is gone.
  const entries = keysOf(fields).map(
    (key): Validation<E, readonly [string, unknown]> =>
      mapValidation<E, unknown, readonly [string, unknown]>((value) => [key, value] as const)(
        fields[key],
      ),
  );

  return mapValidation<E, ReadonlyArray<readonly [string, unknown]>, T>(
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- DEVIATION(1.6): entries are rebuilt from the input struct's own keys
    (pairs) => Object.fromEntries(pairs) as T,
  )(sequenceArrayValidation(entries));
};

/**
 * Converts to `Result`, keeping every accumulated error.
 * Use at the point where an accumulating batch re-enters short-circuit domain code.
 *
 * @law validationToResult(valid(a)) ≡ ok(a)
 */
export const validationToResult = <E, A>(
  v: Validation<E, A>,
): Result<A, NonEmptyReadonlyArray<E>> => (isValid(v) ? ok(v.value) : err(v.errors));

/**
 * Converts a `Result` into a single-error `Validation`, so it can join an
 * accumulating batch.
 *
 * @law resultToValidation(ok(a)) ≡ valid(a)
 * @law resultToValidation(err(e)) ≡ invalid(e)
 */
export const resultToValidation = <A, E>(r: Result<A, E>): Validation<E, A> =>
  isOk(r) ? valid(r.value) : invalid(r.error);
