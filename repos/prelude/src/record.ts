/**
 * @module record
 *
 * Decoding `unknown` runtime records into typed values — the boundary helpers
 * that turn untrusted input into `Option`-wrapped fields (Rule 8.4).
 */

import { type Option, isSome, none, some } from './adt.js';

/**
 * Opaque record type for unknown runtime objects.
 * Use with `isRecord` to narrow `unknown` values before field access.
 */
export type UnknownRecord = Readonly<Record<string, unknown>>;

/**
 * Type guard that narrows `unknown` to `UnknownRecord`.
 * Returns false for arrays and null (both are `typeof === 'object'`).
 * Preconditions: none.
 * Returns: true iff value is a non-null, non-array object.
 */
export const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && Array.isArray(value) === false;


/**
 * Reads a typed field from an UnknownRecord using a runtime type guard.
 * Preconditions: `record` is a validated UnknownRecord.
 * Returns: Some(value) when field exists and satisfies `predicate`, None otherwise.
 */
export const getTypedField = <T>(
  record: UnknownRecord,
  key: string,
  predicate: (value: unknown) => value is T,
): Option<T> => {
  const value = record[key];
  return predicate(value) ? some(value) : none;
};


/**
 * Reads a non-empty string field from an UnknownRecord.
 * Rejects empty and whitespace-only strings.
 * Returns the original string value when valid.
 * Preconditions: `record` is a validated UnknownRecord.
 * Returns: Some string when field is a non-empty string, None otherwise.
 */
export const getStringField = (record: UnknownRecord, key: string): Option<string> => {
  const value = getTypedField(record, key, (candidate: unknown): candidate is string =>
    typeof candidate === 'string',
  );
  return isSome(value) && value.value.trim().length > 0 ? value : none;
};

/**
 * Reads a finite number field from an UnknownRecord.
 * Preconditions: `record` is a validated UnknownRecord.
 * Returns: Some number when field is a finite number, None otherwise.
 */
export const getNumberField = (record: UnknownRecord, key: string): Option<number> => {
  return getTypedField(
    record,
    key,
    (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value),
  );
};

/**
 * Reads a boolean field from an UnknownRecord.
 * Preconditions: `record` is a validated UnknownRecord.
 * Returns: Some boolean when field is a boolean, None otherwise.
 */
export const getBooleanField = (record: UnknownRecord, key: string): Option<boolean> => {
  return getTypedField(record, key, (value: unknown): value is boolean => typeof value === 'boolean');
};

// ---------------------------------------------------------------------------
// Typed record meta-helpers
//
// `Object.keys` returns `string[]`, discarding `keyof T`, so every use is a
// small escape hatch that forces a cast back. These preserve the key type, and
// exist so consumer code never needs the assertion (Rule 1.6).
// ---------------------------------------------------------------------------

/**
 * `Object.keys` with the key type preserved.
 *
 * **Soundness note.** TypeScript object types are *open* — a value may carry
 * more keys than its type declares — so the runtime key list can in principle
 * exceed `keyof T`. This is the same assumption `Object.entries` users make
 * implicitly; it holds for the exact-shaped readonly records this standard
 * models with (Rule 2.2), which is where this helper is meant to be used.
 */
export const keysOf = <T extends Readonly<Record<string, unknown>>>(
  record: T,
): ReadonlyArray<keyof T & string> =>
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- DEVIATION(1.6): recovering the key type Object.keys discards; see soundness note
  Object.keys(record) as ReadonlyArray<keyof T & string>;

/** The values of a record, typed as the union of its value types. */
export const valuesOf = <T extends Readonly<Record<string, unknown>>>(
  record: T,
): ReadonlyArray<T[keyof T & string]> =>
  keysOf(record).map((k) => record[k]);

/** `Object.entries` with both key and value types preserved. */
export const entriesOfRecord = <T extends Readonly<Record<string, unknown>>>(
  record: T,
): ReadonlyArray<readonly [keyof T & string, T[keyof T & string]]> =>
  keysOf(record).map((k) => [k, record[k]] as const);

/**
 * Maps every value of a record, preserving its keys exactly.
 *
 * The record counterpart to `Array.prototype.map`: the result has the same
 * keys, so downstream field access stays typed with no assertion.
 *
 * @law mapValues(x => x)(r) ≡ r
 * @law mapValues(g)(mapValues(f)(r)) ≡ mapValues(x => g(f(x)))(r)
 */
export const mapValues =
  <T extends Readonly<Record<string, unknown>>, B>(f: (value: T[keyof T & string]) => B) =>
  (record: T): { readonly [K in keyof T]: B } =>
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- DEVIATION(1.6): keys are rebuilt from the same record, so the mapped type holds
    Object.fromEntries(keysOf(record).map((k) => [k, f(record[k])])) as {
      readonly [K in keyof T]: B;
    };
