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
