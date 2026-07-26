/**
 * @module collections
 *
 * Immutable `ReadonlyMap` / `ReadonlySet` construction and update helpers.
 */

import { type Option } from './adt.js';
import { fromNullable } from './combinators.js';

/**
 * Returns a new array with duplicate elements removed, preserving first-occurrence order.
 *
 * Uses **reference/`===` equality**, NOT structural equality. Two records with
 * identical contents are therefore both kept:
 * `unique([{ id: 1 }, { id: 1 }])` has length 2.
 *
 * For any non-primitive element type use `uniqueWith(eq)` from the `eq` module
 * with an explicit `Eq` (Rule 4.7).
 *
 * @law unique([]) ≡ []
 * @law Every element of xs appears in unique(xs) exactly once, up to `===`.
 * @law unique(xs).length <= xs.length
 * @law unique is idempotent: unique(unique(xs)) ≡ unique(unique(xs))
 */
export const unique = <A>(values: ReadonlyArray<A>): ReadonlyArray<A> =>
  values.reduce<ReadonlyArray<A>>(
    (acc, value) => (acc.includes(value) ? acc : [...acc, value]),
    [],
  );

/**
 * Builds a ReadonlyMap from a readonly array of key/value entry tuples.
 *
 * Centralises the only permitted `new Map()` call site for map construction.
 * When duplicate keys are present the last entry wins, consistent with
 * `Map` constructor semantics.
 *
 * Preconditions: none.
 * Returns: fresh ReadonlyMap containing all provided entries.
 *
 * @example
 * const m = intoMap([['a', 1], ['b', 2]]);
 */
// DEVIATION(1.9): Immutable collection construction requires a fresh Map value.
export const intoMap = <K, V>(entries: ReadonlyArray<readonly [K, V]>): ReadonlyMap<K, V> =>
  new Map(entries); // eslint-disable-line no-restricted-syntax

/**
 * Extracts the entries of a ReadonlyMap as a readonly array of key/value tuples,
 * preserving Map iteration order (insertion order).
 *
 * Preconditions: none.
 * Returns: ReadonlyArray of [K, V] tuples in insertion order.
 *
 * @law intoMap(entriesOf(m)) ≡ m  (same key/value pairs, same order)
 */
export const entriesOf = <K, V>(map: ReadonlyMap<K, V>): ReadonlyArray<readonly [K, V]> =>
  Array.from(map.entries(), ([k, v]): readonly [K, V] => [k, v]);

/**
 * Converts a ReadonlyMap with string keys into a readonly object record.
 *
 * Useful at adapter boundaries where a plain object shape is required
 * (for JSON payload assembly, template contexts, etc.) while maintaining
 * immutable prelude-style data flow.
 *
 * Preconditions: map keys are strings.
 * Returns: readonly Record with the same key/value pairs.
 *
 * @law toObject(intoMap(entries)) ≡ Object.fromEntries(entries)
 * @law entriesOf(m).every(([k, v]) => toObject(m)[k] === v)
 */
export const toObject = <T>(map: ReadonlyMap<string, T>): Readonly<Record<string, T>> =>
  Object.fromEntries(map) as Readonly<Record<string, T>>; // eslint-disable-line @typescript-eslint/consistent-type-assertions -- DEVIATION(1.4): fromEntries cannot preserve generic key/value mapping in its current lib typing

/**
 * Associates a key with a value in a ReadonlyMap (insert or replace).
 * If the key already exists its previous entry is removed before inserting,
 * so entry count never grows beyond the logical key-set size.
 *
 * Curried data-last for `pipe` composition. Named after Clojure's `assoc`.
 *
 * Preconditions: none.
 * Returns: fresh ReadonlyMap with the updated entry.
 *
 * @example
 * const m2 = pipe(m, assoc('a', 42));
 */
export const assoc =
  <K, V>(key: K, value: V) =>
  (map: ReadonlyMap<K, V>): ReadonlyMap<K, V> =>
    intoMap([
      ...entriesOf(map).filter(([k]) => k !== key),
      [key, value],
    ]);

/**
 * Dissociates a key from a ReadonlyMap (delete entry).
 * No-ops silently when the key is absent.
 *
 * Curried data-last for `pipe` composition. Named after Clojure's `dissoc`.
 *
 * Preconditions: none.
 * Returns: fresh ReadonlyMap without the specified key.
 *
 * @example
 * const m2 = pipe(m, dissoc('a'));
 */
export const dissoc =
  <K>(key: K) =>
  <V>(map: ReadonlyMap<K, V>): ReadonlyMap<K, V> =>
    intoMap(entriesOf(map).filter(([k]) => k !== key));

/**
 * Looks up a key in a ReadonlyMap, returning an Option.
 *
 * Curried data-last for `pipe` composition. Mirrors Haskell `Data.Map.lookup`.
 *
 * Preconditions: none.
 * Returns: Some(value) when the key is present; None otherwise.
 *
 * @example
 * const v = pipe(m, lookup('a')); // Option<number>
 */
export const lookup =
  <K>(key: K) =>
  <V>(map: ReadonlyMap<K, V>): Option<V> =>
    fromNullable(map.get(key));

// ─── ReadonlySet combinators ─────────────────────────────────────────────────

/**
 * Builds a ReadonlySet from a readonly array of values.
 *
 * Centralises the only permitted `new Set()` call site for set construction.
 * Duplicate values are deduplicated using Set identity semantics.
 *
 * Preconditions: none.
 * Returns: fresh ReadonlySet containing all unique provided values.
 *
 * @example
 * const s = intoSet([1, 2, 2, 3]); // Set {1, 2, 3}
 */
// DEVIATION(1.9): Immutable collection construction requires a fresh Set value.
export const intoSet = <T>(values: ReadonlyArray<T>): ReadonlySet<T> =>
  new Set(values); // eslint-disable-line no-restricted-syntax

/**
 * Conjoins a value to a ReadonlySet (add element).
 * No-ops structurally when the value is already a member.
 *
 * Curried data-last for `pipe` composition. Named after Clojure's `conj`.
 *
 * Preconditions: none.
 * Returns: fresh ReadonlySet with the value included.
 *
 * @law pipe(s, conj(v)) contains v
 * @law pipe(s, conj(v)).size >= s.size
 */
export const conj =
  <T>(value: T) =>
  (set: ReadonlySet<T>): ReadonlySet<T> =>
    intoSet([...set, value]);

/**
 * Disjoins a value from a ReadonlySet (remove element).
 * No-ops silently when the value is absent.
 *
 * Curried data-last for `pipe` composition. Named after Clojure's `disj`.
 *
 * Preconditions: none.
 * Returns: fresh ReadonlySet without the specified value.
 *
 * @law !pipe(s, disj(v)).has(v)
 * @law pipe(s, disj(v)).size <= s.size
 */
export const disj =
  <T>(value: T) =>
  (set: ReadonlySet<T>): ReadonlySet<T> =>
    intoSet(Array.from(set).filter((v) => v !== value));

/**
 * Tests whether a value is a member of a ReadonlySet.
 *
 * Curried data-last for `pipe` composition. Mirrors Haskell `Data.Set.member`.
 *
 * Preconditions: none.
 * Returns: true iff the set contains the value.
 *
 * @law pipe(intoSet([v]), member(v)) ≡ true
 * @law pipe(intoSet([]),  member(v)) ≡ false
 */
export const member =
  <T>(value: T) =>
  (set: ReadonlySet<T>): boolean =>
    set.has(value);

// ─── 6. Logger port ───────────────────────────────────────────────────────────
