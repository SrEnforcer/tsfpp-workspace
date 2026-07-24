/**
 * @module fp
 *
 * Core functional primitives: algebraic data types (Option, Result), branded
 * types, exhaustiveness witnesses, and their combinator sets.
 *
 * Pure module — no effects, no I/O.
 * All combinators are curried data-last to compose cleanly with `pipe`.
 */
export type Brand<T, B extends string> = T & { readonly __brand: B };

/**
 * Exhaustiveness witness for discriminated unions.
 */
export const absurd = (x: never): never => {
  // DEVIATION(6.2): Impossible branch witness for exhaustive matching.
  // DEVIATION(1.9): Constructing a diagnostic Error preserves stack trace for impossible branches.
  throw new Error(`Absurd: unhandled discriminated union branch — received unexpected value: ${String(x)}`); // eslint-disable-line functional/no-throw-statements, no-restricted-syntax
};

// ─── Function combinators ────────────────────────────────────────────────────

/**
 * Left-to-right function composition (pipeline).
 *
 * Threads a value through a sequence of unary functions, each receiving the
 * output of the previous. The type of each step is inferred independently,
 * so the compiler catches mismatched transitions at the call-site.
 *
 * @example
 * const result = pipe(
 *   parseNumber('40'),
 *   map((n) => n + 2),
 *   flatMap(toEven),
 * );
 *
 * @law Identity: pipe(a) ≡ a
 * @law Associativity: pipe(a, f, g) ≡ pipe(pipe(a, f), g)
 */
/* eslint-disable max-params */
// DEVIATION(3.2): Overload signatures preserve compositional inference for public API ergonomics.
export function pipe<A>(a: A): A;
export function pipe<A, B>(a: A, ab: (a: A) => B): B;
export function pipe<A, B, C>(a: A, ab: (a: A) => B, bc: (b: B) => C): C;
export function pipe<A, B, C, D>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D): D;
export function pipe<A, B, C, D, E>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E): E;
export function pipe<A, B, C, D, E, F>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F): F;
export function pipe<A, B, C, D, E, F, G>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G): G;
export function pipe<A, B, C, D, E, F, G, H>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H): H;
export function pipe<A, B, C, D, E, F, G, H, I>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I): I;
export function pipe<A, B, C, D, E, F, G, H, I, J>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J): J;
export function pipe(value: unknown, ...fns: ReadonlyArray<(x: unknown) => unknown>): unknown {
  return fns.reduce((acc, f) => f(acc), value);
}

/**
 * Right-to-left function composition.
 *
 * Returns a function that applies its argument to the rightmost function first,
 * then threads the result left through the remaining functions. The dual of
 * `pipe` for point-free style.
 *
 * @example
 * const process = comp(formatOutput, validate, trim);
 * // equivalent to: (s) => formatOutput(validate(trim(s)))
 *
 * @law Identity: comp(f)(x) ≡ f(x)
 * @law Associativity: comp(f, g, h)(x) ≡ comp(f, comp(g, h))(x)
 */
export function comp<A, B>(ab: (a: A) => B): (a: A) => B;
export function comp<A, B, C>(bc: (b: B) => C, ab: (a: A) => B): (a: A) => C;
export function comp<A, B, C, D>(cd: (c: C) => D, bc: (b: B) => C, ab: (a: A) => B): (a: A) => D;
export function comp<A, B, C, D, E>(de: (d: D) => E, cd: (c: C) => D, bc: (b: B) => C, ab: (a: A) => B): (a: A) => E;
export function comp<A, B, C, D, E, F>(ef: (e: E) => F, de: (d: D) => E, cd: (c: C) => D, bc: (b: B) => C, ab: (a: A) => B): (a: A) => F;
export function comp(...fns: ReadonlyArray<(x: unknown) => unknown>): (a: unknown) => unknown {
  return (value: unknown) => [...fns].reverse().reduce((acc, f) => f(acc), value);
}

/**
 * Left-to-right function composition — returns a reusable pipeline function.
 *
 * Like `pipe`, but deferred: takes only functions and returns a new function
 * that applies them left-to-right when called. Use `flow` to name and share a
 * pipeline; use `pipe` when you have the initial value at hand.
 *
 * @example
 * const normalise = flow(trim, toUpperCase, exclaim);
 * normalise('  hello  '); // 'HELLO!'
 *
 * // equivalent eager form:
 * pipe('  hello  ', trim, toUpperCase, exclaim);
 *
 * @law Relationship to pipe: flow(f, g, h)(x) ≡ pipe(x, f, g, h)
 * @law Relationship to comp: flow(f, g, h)(x) ≡ comp(h, g, f)(x)
 * @law Identity: flow(f)(x) ≡ f(x)
 * @law Associativity: flow(f, flow(g, h))(x) ≡ flow(f, g, h)(x)
 */
export function flow<A, B>(ab: (a: A) => B): (a: A) => B;
export function flow<A, B, C>(ab: (a: A) => B, bc: (b: B) => C): (a: A) => C;
export function flow<A, B, C, D>(ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D): (a: A) => D;
export function flow<A, B, C, D, E>(ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E): (a: A) => E;
export function flow<A, B, C, D, E, F>(ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F): (a: A) => F;
export function flow<A, B, C, D, E, F, G>(ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G): (a: A) => G;
export function flow<A, B, C, D, E, F, G, H>(ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H): (a: A) => H;
export function flow<A, B, C, D, E, F, G, H, I>(ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I): (a: A) => I;
export function flow<A, B, C, D, E, F, G, H, I, J>(ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J): (a: A) => J;
/* eslint-enable max-params */
export function flow(...fns: ReadonlyArray<(x: unknown) => unknown>): (a: unknown) => unknown {
  return (value: unknown) => fns.reduce((acc, f) => f(acc), value);
}

/**
 * Inverts a predicate or type guard.
 *
 * Returns a new function that returns `true` where the original returns
 * `false`, and vice-versa. When applied to a type guard `(x: A) => x is B`,
 * the result is typed as a plain boolean predicate — narrowing the complement
 * is not generally sound, so no narrowing is applied.
 *
 * @example
 * const isNotNone = complement(isNone);
 * const isNotRecord = complement(isRecord);
 *
 * @law Double negation: complement(complement(f))(x) ≡ f(x)
 * @law De Morgan (pointwise): complement(f)(x) ≡ !f(x)
 */
export const complement =
  <A extends ReadonlyArray<unknown>>(predicate: (...args: A) => boolean) =>
  (...args: A): boolean =>
    !predicate(...args);

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

/**
 * Lifts nullable inputs to Option.
 */
export const fromNullable = <A>(a: A | null | undefined): Option<A> =>
  a === null || a === undefined ? none : some(a);

/**
 * Type guard that excludes `undefined`.
 *
 * Useful for narrowing array/filter pipelines without introducing null checks.
 * For null-or-undefined values, prefer `fromNullable`.
 */
export const isDefined = <A>(value: A | undefined): value is A =>
  value !== undefined;

/**
 * Lifts unknown inputs to `Option<string>`.
 *
 * Preconditions: none.
 * Returns: `Some(value)` when input is a string (including empty string), `None` otherwise.
 */
export const fromUnknownString = (value: unknown): Option<string> =>
  typeof value === 'string' ? some(value) : none;

/**
 * Lifts unknown inputs to `Option<ReadonlyArray<unknown>>`.
 *
 * Preconditions: none.
 * Returns: `Some(array)` when input is an array, `None` otherwise.
 * @law Array-preservation: Array.isArray(x) => isSome(fromUnknownArray(x))
 * @law Non-array-elimination: Array.isArray(x) === false => fromUnknownArray(x) ≡ none
 */
export const fromUnknownArray = (value: unknown): Option<ReadonlyArray<unknown>> =>
  Array.isArray(value) ? some(value.map((item: unknown): unknown => item)) : none;

/**
 * Lifts unknown inputs to `Option<ReadonlyArray<A>>` using an element type guard.
 *
 * Preconditions: `predicate` must be a sound type guard for A.
 * Returns: `Some(array)` when input is an array and every element satisfies `predicate`; `None` otherwise.
 * @law Guarded-preservation: every(predicate)(xs) => isSome(fromUnknownArrayOf(predicate)(xs))
 * @law Guarded-elimination: Array.isArray(x) === false or contains non-matching element => fromUnknownArrayOf(predicate)(x) ≡ none
 */
export const fromUnknownArrayOf =
  <A>(predicate: (value: unknown) => value is A) =>
  (value: unknown): Option<ReadonlyArray<A>> => {
    const unknownArray = fromUnknownArray(value);
    if (isNone(unknownArray)) {
      return none;
    }

    return unknownArray.value.every((item: unknown): item is A => predicate(item))
      ? some(unknownArray.value)
      : none;
  };

/**
 * Lifts a potentially absent or blank string to `Option<string>`.
 * Trims whitespace; returns `None` for `undefined`, empty, or whitespace-only strings.
 *
 * Preconditions: none.
 * Returns: `Some(trimmed)` when non-empty after trim; `None` otherwise.
 */
export const fromNonEmptyString = (value: string | undefined): Option<string> => {
  if (typeof value !== 'string') return none;
  const trimmed = value.trim();
  return trimmed.length > 0 ? some(trimmed) : none;
};

/**
 * Returns Option value or lazy fallback.
 */
export const getOrElseOption =
  <A>(onNone: () => A) =>
  (o: Option<A>): A =>
    isSome(o) ? o.value : onNone();

/**
 * Maps the inner value of a Some; passes None through unchanged.
 * @law Identity:    mapOption((x) => x)(o) ≡ o
 * @law Composition: mapOption(f ∘ g)(o) ≡ mapOption(f)(mapOption(g)(o))
 */
export const mapOption =
  <A, B>(f: (a: A) => B) =>
  (o: Option<A>): Option<B> =>
    isSome(o) ? some(f(o.value)) : none;

/**
 * Monadic bind for Option.
 * @law Left identity:  flatMapOption(f)(some(a)) ≡ f(a)
 * @law Right identity: flatMapOption(some)(o)     ≡ o
 * @law Associativity:  flatMapOption(g)(flatMapOption(f)(o)) ≡ flatMapOption(x => flatMapOption(g)(f(x)))(o)
 */
export const flatMapOption =
  <A, B>(f: (a: A) => Option<B>) =>
  (o: Option<A>): Option<B> =>
    isSome(o) ? f(o.value) : none;

/**
 * Returns the first Some or the lazy alternative when None.
 * @law Left identity:  orElseOption(() => some(b))(some(a)) ≡ some(a)
 * @law Right identity: orElseOption(() => none)(o)          ≡ o
 */
export const orElseOption =
  <A>(onNone: () => Option<A>) =>
  (o: Option<A>): Option<A> =>
    isSome(o) ? o : onNone();

/**
 * Maps an Ok value and propagates Err untouched.
 * @law Identity:    map((x) => x)(r) ≡ r
 * @law Composition: map(f ∘ g)(r) ≡ map(f)(map(g)(r))
 */
export const map =
  <A, B, E>(f: (a: A) => B) =>
  (r: Result<A, E>): Result<B, E> =>
    isOk(r) ? ok(f(r.value)) : r;

/**
 * Monadic bind for Result.
 * @law Left identity:  flatMap(f)(ok(a))   ≡ f(a)
 * @law Right identity: flatMap(ok)(r)       ≡ r
 * @law Associativity:  flatMap(g)(flatMap(f)(r)) ≡ flatMap(x => flatMap(g)(f(x)))(r)
 */
export const flatMap =
  <A, B, E>(f: (a: A) => Result<B, E>) =>
  (r: Result<A, E>): Result<B, E> =>
    isOk(r) ? f(r.value) : r;

/**
 * Async monadic bind for Result-returning effects.
 */
export const flatMapAsync =
  <A, B, E>(f: (a: A) => Promise<Result<B, E>>) =>
  async (r: Result<A, E>): Promise<Result<B, E>> =>
    isOk(r) ? f(r.value) : r;

/**
 * Captures thrown errors into Result.
 * adapter boundary (Rule 6.2): `try/catch` is intentional here — this function
 * exists to reify thrown exceptions as typed `Err` values.
 */
export const tryCatch = <A, E>(f: () => A, onErr: (e: unknown) => E): Result<A, E> => {
  try {
    return ok(f());
  } catch (e) {
    return err(onErr(e));
  }
};

/**
 * Async variant of tryCatch.
 * adapter boundary (Rule 6.2): `try/catch` is intentional here — this function
 * exists to reify rejected Promises as typed `Err` values.
 */
export const tryCatchAsync = async <A, E>(
  f: () => Promise<A>,
  onErr: (e: unknown) => E,
): Promise<Result<A, E>> => {
  try {
    return ok(await f());
  } catch (e) {
    return err(onErr(e));
  }
};

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

/**
 * Converts an Option to a nullable value.
 * Complement of `fromNullable`.
 * Preconditions: none.
 * Returns: the inner value for Some; null for None.
 */
export const toNullable = <A>(o: Option<A>): A | null =>
  isSome(o) ? o.value : null;

/**
 * Sequences an array through a fallible function, collecting Ok values.
 * Short-circuits and returns the first Err encountered.
 * @law traverseArray(ok)(items) ≡ ok(items)
 * @law traverseArray(f)([])    ≡ ok([])
 */
export const traverseArray =
  <A, B, E>(f: (a: A) => Result<B, E>) =>
  (items: ReadonlyArray<A>): Result<ReadonlyArray<B>, E> =>
    items.reduce<Result<ReadonlyArray<B>, E>>(
      (acc, item) => {
        if (isErr(acc)) return acc;
        const r = f(item);
        return isOk(r) ? ok([...acc.value, r.value]) : r;
      },
      ok([]),
    );

/**
 * Sequences an array through an optional function, collecting Some values.
 * Short-circuits and returns None the moment any element maps to None.
 *
 * The Option analogue of `traverseArray`: apply f to every element and
 * collect the results if all succeed; return None if any element is absent.
 *
 * @example
 * traverseArrayOption(fromNullable)([1, 2, 3]) // Some([1, 2, 3])
 * traverseArrayOption(fromNullable)([1, null, 3]) // None
 *
 * @law traverseArrayOption(some)(items) ≡ some(items)
 * @law traverseArrayOption(f)([])       ≡ some([])
 */
export const traverseArrayOption =
  <A, B>(f: (a: A) => Option<B>) =>
  (items: ReadonlyArray<A>): Option<ReadonlyArray<B>> =>
    items.reduce<Option<ReadonlyArray<B>>>(
      (acc, item) => {
        if (isNone(acc)) return acc;
        const o = f(item);
        return isSome(o) ? some([...acc.value, o.value]) : none;
      },
      some([]),
    );

/**
 * Collapses an array of Options into an Option of an array.
 * Returns None if any element is None; otherwise Some of all values.
 *
 * Convenience specialisation of `traverseArrayOption` for when you already
 * have a `ReadonlyArray<Option<A>>`.
 *
 * @example
 * sequenceArrayOption([some(1), some(2), some(3)]) // Some([1, 2, 3])
 * sequenceArrayOption([some(1), none, some(3)])     // None
 *
 * @law sequenceArrayOption(xs) ≡ traverseArrayOption(x => x)(xs)
 */
export const sequenceArrayOption = <A>(items: ReadonlyArray<Option<A>>): Option<ReadonlyArray<A>> =>
  traverseArrayOption<Option<A>, A>((o) => o)(items);

/**
 * Runs an observer effect for Ok values and returns input Result.
 */
export const tap =
  <A, E>(f: (a: A) => void) =>
  (r: Result<A, E>): Result<A, E> => {
    if (isOk(r)) {
      f(r.value);
    }
    return r;
  };

/**
 * Runs an observer effect for Err values and returns input Result.
 */
export const tapErr =
  <A, E>(f: (e: E) => void) =>
  (r: Result<A, E>): Result<A, E> => {
    if (isErr(r)) {
      f(r.error);
    }
    return r;
  };

/**
 * Returns a new array with duplicate elements removed, preserving first-occurrence order.
 * Uses structural equality (`===`) for comparison.
 * @law unique([]) ≡ []
 * @law Every element of xs appears in unique(xs) exactly once.
 * @law unique(xs).length <= xs.length
 * @law unique is idempotent: unique(unique(xs)) ≡ unique(xs)
 */
export const unique = <A>(values: ReadonlyArray<A>): ReadonlyArray<A> =>
  values.reduce<ReadonlyArray<A>>(
    (acc, value) => (acc.includes(value) ? acc : [...acc, value]),
    [],
  );

/**
 * Immutable singly-linked list ADT.
 * Cons(head, tail) | Nil.
 *
 * Use Lists for:
 * - Prepend-heavy workloads (O(1) cons vs O(n) array unshift)
 * - Recursive structure processing
 * - Composition with functional pipelines
 *
 * Use arrays for:
 * - Random access (O(1) array[i] vs O(n) list traversal)
 * - Large data with append-heavy workloads (array push amortizes better)
 */
export type List<A> =
  | { readonly _tag: 'Cons'; readonly head: A; readonly tail: List<A> }
  | { readonly _tag: 'Nil' };

/**
 * The empty List.
 */
export const nil: List<never> = { _tag: 'Nil' };

/**
 * Constructs a List by prepending head to tail.
 * Preconditions: none.
 * Returns: a new List with head as the first element.
 * @law cons(x)(nil) ≡ singleton(x)
 */
export const cons =
  <A>(head: A) =>
  (tail: List<A>): List<A> =>
    ({ _tag: 'Cons', head, tail });

/**
 * Type guard for List Cons.
 */
export const isCons = <A>(l: List<A>): l is { readonly _tag: 'Cons'; readonly head: A; readonly tail: List<A> } =>
  l._tag === 'Cons';

/**
 * Type guard for List Nil.
 */
export const isNil = <A>(l: List<A>): l is { readonly _tag: 'Nil' } => l._tag === 'Nil';

/**
 * Constructs a List with a single element.
 * Preconditions: none.
 * Returns: a Cons(value, Nil).
 */
export const singletonList = <A>(value: A): List<A> => cons(value)(nil);

/**
 * Converts a ReadonlyArray to a List.
 * Preconditions: none.
 * Returns: List representing array elements in order.
 * @law fromArray([]) ≡ nil
 * @law toArray(fromArray(xs)) ≡ xs
 */
export const fromArray = <A>(values: ReadonlyArray<A>): List<A> =>
  values.reduceRight<List<A>>((tail, head) => cons(head)(tail), nil);

/**
 * Converts a List to a ReadonlyArray.
 * Preconditions: none.
 * Returns: array of list elements in order.
 * @law toArray(nil) ≡ []
 * @law fromArray(toArray(xs)) ≡ xs
 */
export const toArray = <A>(list: List<A>): ReadonlyArray<A> =>
  foldLeftList([], ((acc: ReadonlyArray<A>) => (a: A) => [...acc, a]), list);

/**
 * Returns the first element of a List.
 * Preconditions: none.
 * Returns: Some(head) for Cons; None for Nil.
 */
export const headList = <A>(list: List<A>): Option<A> =>
  isCons(list) ? some(list.head) : none;

/**
 * Returns the tail of a List (all elements except the first).
 * Preconditions: none.
 * Returns: tail for Cons; nil for Nil.
 */
export const tailList = <A>(list: List<A>): List<A> =>
  isCons(list) ? list.tail : nil;

/**
 * Checks if a List is empty.
 * Preconditions: none.
 * Returns: true for Nil; false for Cons.
 */
export const isEmptyList = <A>(list: List<A>): boolean => isNil(list);

/**
 * Returns the number of elements in a List.
 * Preconditions: none.
 * Returns: length ≥ 0.
 * Note: O(n) operation; avoid calling repeatedly in tight loops.
 */
export const lengthList = <A>(list: List<A>): number =>
  foldLeftList(0, ((acc: number) => (): number => acc + 1), list);

/**
 * Maps a function over each element of a List.
 * Preconditions: none.
 * @law mapList((x) => x)(l) ≡ l
 * @law mapList(f ∘ g)(l) ≡ mapList(f)(mapList(g)(l))
 */
export const mapList =
  <A, B>(f: (a: A) => B) =>
  (list: List<A>): List<B> => {
    if (isNil(list)) {
      return nil;
    }
    return cons(f(list.head))(mapList(f)(list.tail));
  };

/**
 * Monadic bind for List.
 * Preconditions: none.
 * @law flatMapList(singletonList)(l) ≡ l
 * @law flatMapList(f ∘ singletonList)(l) ≡ flatMapList(f)(l)
 */
export const flatMapList =
  <A, B>(f: (a: A) => List<B>) =>
  (list: List<A>): List<B> => {
    if (isNil(list)) {
      return nil;
    }
    // Concat f(head) with flatMap(f)(tail) using appendList
    return appendList(f(list.head))(flatMapList(f)(list.tail));
  };

/**
 * Right-associative fold (catamorphism) over a List.
 * Preconditions: none.
 * Returns: accumulated result from right to left.
 * @law foldList(init)(f)(nil) ≡ init
 * @law foldList(acc)(f)(singletonList(a)) ≡ f(a)(acc)
 */
export const foldList = <A, B>(init: B, f: (a: A) => (b: B) => B, list: List<A>): B => {
  if (isNil(list)) {
    return init;
  }
  return f(list.head)(foldList(init, f, list.tail));
};

/**
 * Left-associative fold over a List (curried version).
 * Preconditions: none.
 * Returns: accumulated result from left to right.
 * @law foldLeftListCurried(init)(f)(nil) ≡ init
 */
export const foldLeftListCurried = <A, B>(init: B) =>
  (f: (b: B) => (a: A) => B) =>
  (list: List<A>): B =>
    foldLeftList(init, f, list);

/**
 * Left-associative fold over a List.
 * Preconditions: none.
 * Returns: accumulated result from left to right.
 * @law foldLeftList(init, f, nil) ≡ init
 */
export const foldLeftList = <A, B>(init: B, f: (b: B) => (a: A) => B, list: List<A>): B => {
  if (isNil(list)) {
    return init;
  }
  return foldLeftList(f(init)(list.head), f, list.tail);
};

/**
 * Appends two Lists, preserving the order of elements.
 * Preconditions: none.
 * Returns: a new List with elements from `left` followed by elements from `right`.
 * @law appendList(nil)(l) ≡ l
 * @law appendList(l)(nil) ≡ l
 * @law appendList(fromArray([1,2]))(fromArray([3,4])) ≡ fromArray([1,2,3,4])
 * Note: O(n) where n = length of `left`; right is returned unchanged.
 */
export const appendList =
  <A>(left: List<A>) =>
  (right: List<A>): List<A> => {
    if (isNil(left)) {
      return right;
    }
    return cons(left.head)(appendList(left.tail)(right));
  };

/**
 * Reverses a List.
 * Preconditions: none.
 * Returns: a new List with elements in reverse order.
 * @law reverseList(nil) ≡ nil
 * @law toArray(reverseList(l)) ≡ toArray(l).reverse()
 * Note: O(n); uses left-fold with accumulator.
 */
export const reverseList = <A>(list: List<A>): List<A> =>
  foldLeftList(nil, ((acc: List<A>) => (a: A) => cons(a)(acc)), list);

/**
 * Filters a List, retaining only elements that satisfy the predicate.
 * Preconditions: none.
 * Returns: a new List containing only elements where predicate returns true.
 * @law filterList((_) => true)(l) ≡ l
 * @law filterList((_) => false)(l) ≡ nil
 */
export const filterList =
  <A>(predicate: (a: A) => boolean) =>
  (list: List<A>): List<A> => {
    if (isNil(list)) {
      return nil;
    }
    const rest = filterList(predicate)(list.tail);
    return predicate(list.head) ? cons(list.head)(rest) : rest;
  };

/**
 * Sequences a List through a fallible function, collecting Ok values.
 * Short-circuits and returns the first Err encountered.
 * Preconditions: none.
 * @law traverseList(ok)(nil) ≡ ok(nil)
 */
export const traverseList =
  <A, B, E>(f: (a: A) => Result<B, E>) =>
  (list: List<A>): Result<List<B>, E> => {
    if (isNil(list)) {
      return ok(nil);
    }
    const headResult = f(list.head);
    if (isErr(headResult)) {
      return headResult;
    }
    const tailResult = traverseList(f)(list.tail);
    return isErr(tailResult) ? tailResult : ok(cons(headResult.value)(tailResult.value));
  };

// ─── ReadonlyMap combinators ─────────────────────────────────────────────────

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

/**
 * Severity levels available to the application logger.
 *
 * Follows the syslog convention with four levels. `trace` is intentionally
 * omitted — it is too granular for structured production logs. `fatal` is
 * intentionally omitted — process-level fatal conditions are handled by the
 * process supervisor, not by the application logger.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Typed log entry. All fields except `message` are optional — include only
 * what is operationally relevant at the call site.
 *
 * `traceId` SHOULD be included whenever the entry originates within a request
 * context. It is the primary correlation handle across logs, APM, and error
 * trackers.
 *
 * The index signature allows additional structured fields. All additional
 * fields must be flat — no nested objects — to remain queryable in log
 * aggregators.
 */
export type LogEntry = {
  readonly message:   string;
  readonly traceId?:  string;
  readonly userId?:   string;    // principal identifier — never a credential or PII
  readonly duration?: number;    // milliseconds
  readonly error?:    string;    // serialised error message — never a stack trace in production
  readonly code?:     string;    // machine-readable error code
  readonly [key: string]: unknown;
};

/**
 * Logger port. Defines the interface that all application code depends on.
 * Implement with pino, winston, or any structured logger in the infrastructure
 * layer and inject as a dependency.
 *
 * Never import a concrete logger directly in core, use-case, DAL, or handler
 * code. Depend on this interface only.
 *
 * @example
 * // Infrastructure adapter (pino)
 * import pino from 'pino'
 * import { type Logger } from '@tsfpp/prelude'
 *
 * const pinoInstance = pino({ level: 'info' })
 *
 * export const logger: Logger = {
 *   debug: (entry) => pinoInstance.debug(entry, entry.message),
 *   info:  (entry) => pinoInstance.info(entry, entry.message),
 *   warn:  (entry) => pinoInstance.warn(entry, entry.message),
 *   error: (entry) => pinoInstance.error(entry, entry.message),
 * }
 *
 * @example
 * // Silent logger for tests
 * export const silentLogger: Logger = {
 *   debug: () => undefined,
 *   info:  () => undefined,
 *   warn:  () => undefined,
 *   error: () => undefined,
 * }
 */
export type Logger = {
  readonly debug: (entry: LogEntry) => void;
  readonly info:  (entry: LogEntry) => void;
  readonly warn:  (entry: LogEntry) => void;
  readonly error: (entry: LogEntry) => void;
};

// ---------------------------------------------------------------------------
// Total eliminators — CODING_STANDARD.md Rule 8.5
//
// A `match` collapses an ADT to a single result type by supplying a handler
// for every variant. Unlike `isOk` / `isSome` guards (which drive early-return
// control flow), a `match` is an expression: it forces both arms to be written
// and both to produce the same type, so a caller cannot fall through a case.
// This is the exhaustiveness axiom applied to the two-variant prelude ADTs,
// without leaking the `_tag` discriminant into consumer code (Rule 1.11).
// ---------------------------------------------------------------------------

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
// Non-empty arrays — correctness by construction (Rule 1.1 / Rule 8.1)
//
// `head` on a `ReadonlyArray` must return `Option<A>` because the array may be
// empty. When a caller has already established non-emptiness, that fact should
// live in the type, not be re-checked at every use site. `NonEmptyReadonlyArray`
// makes the empty case unrepresentable, so `headNonEmpty` / `lastNonEmpty` are total.
// ---------------------------------------------------------------------------

/**
 * A readonly array proven to hold at least one element. The leading `A` in the
 * tuple is what makes `headNonEmpty` total.
 */
export type NonEmptyReadonlyArray<A> = readonly [A, ...ReadonlyArray<A>];

/**
 * Type guard proving an array is non-empty. Narrows to
 * `NonEmptyReadonlyArray<A>`, after which `headNonEmpty` / `lastNonEmpty` apply.
 */
export const isNonEmptyArray = <A>(
  xs: ReadonlyArray<A>,
): xs is NonEmptyReadonlyArray<A> => xs.length > 0;

/**
 * Smart constructor lifting a possibly-empty array into `Option` of a
 * non-empty one. The sole gateway into `NonEmptyReadonlyArray` (Rule 1.3).
 *
 * @law isSome(mkNonEmpty(xs)) ≡ xs.length > 0
 */
export const mkNonEmpty = <A>(
  xs: ReadonlyArray<A>,
): Option<NonEmptyReadonlyArray<A>> =>
  isNonEmptyArray(xs) ? some(xs) : none;

/**
 * Total head: the first element of a non-empty array, with no `Option`
 * wrapper, because the type guarantees it exists.
 */
export const headNonEmpty = <A>(xs: NonEmptyReadonlyArray<A>): A => xs[0];

/**
 * Total last: the final element of a non-empty array. Uses `reduce` without an
 * initial value, which is itself total only on non-empty input — exactly the
 * guarantee the type carries.
 */
export const lastNonEmpty = <A>(xs: NonEmptyReadonlyArray<A>): A =>
  xs.reduce((_prev, curr) => curr);

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