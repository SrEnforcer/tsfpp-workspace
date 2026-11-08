/**
 * @module boundary-cache
 * @packageDocumentation
 *
 * An in-memory cache in front of a Result-returning source, such as an
 * outside API an adapter calls. Successes are kept per key for a while;
 * failures are not, so the next call tries again. Once `capacity` keys are
 * kept, the least recently stored goes first.
 *
 * Calls for the same key that overlap all reach the source: the cache holds
 * answers, not calls in flight.
 */

import { type Result, isErr, ok } from '@tsfpp/prelude';

/** How a {@link withResultCache} cache keeps answers. */
export type ResultCacheOptions<I> = {
  /** The current time in epoch milliseconds (Rule 4.6: injected). */
  readonly clock: () => number;
  /** How long a success is kept, in milliseconds. */
  readonly ttlMs: number;
  /** How many keys are kept at most; `0` or less keeps none. */
  readonly capacity: number;
  /** The cache key of an input; inputs with equal keys share an answer. */
  readonly keyOf: (input: I) => string;
};

type Kept<A> = { readonly at: number; readonly answer: A };

/**
 * Wraps a source in a cache of its successes.
 * @param options Clock, lifetime, capacity and key of the cache.
 * @returns A wrapper giving the source, asking the original only for a key
 *   it does not keep, or keeps for `ttlMs` or longer.
 */
export const withResultCache =
  <I>(options: ResultCacheOptions<I>) =>
  <A, E>(source: (input: I) => Promise<Result<A, E>>): ((input: I) => Promise<Result<A, E>>) => {
    // DEVIATION(2.3): the cache's Map is mutable state owned by this closure alone.
    // eslint-disable-next-line no-restricted-syntax -- DEVIATION(1.9): a Map is constructed for the cache
    const kept = new Map<string, Kept<A>>();
    const keep = (key: string, entry: Kept<A>): void => {
      /* eslint-disable functional/immutable-data -- DEVIATION(2.3): the cache's own Map */
      kept.delete(key);
      const oldest = kept.keys().next();
      if (kept.size >= options.capacity && oldest.done !== true) kept.delete(oldest.value);
      if (options.capacity > 0) kept.set(key, entry);
      /* eslint-enable functional/immutable-data */
    };
    return async (input) => {
      const key = options.keyOf(input);
      const now = options.clock();
      const hit = kept.get(key);
      if (hit !== undefined && now - hit.at < options.ttlMs) return ok(hit.answer);
      const found = await source(input);
      if (isErr(found)) return found;
      keep(key, { at: now, answer: found.value });
      return found;
    };
  };
