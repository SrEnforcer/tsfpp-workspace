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
  throw new Error(`Absurd: unhandled discriminated union branch — received unexpected value: ${String(x)}`); // eslint-disable-line functional/no-throw-statements
};

/**
 * Optional value ADT.
 */
export type Option<A> =
  | { readonly _tag: 'Some'; readonly value: A }
  | { readonly _tag: 'None' };

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
export const getOrElse =
  <A>(onNone: () => A) =>
  (o: Option<A>): A =>
    isSome(o) ? o.value : onNone();

/**
 * Maps the inner value of a Some; passes None through unchanged.
 * @law Identity:    mapO((x) => x)(o) ≡ o
 * @law Composition: mapO(f ∘ g)(o) ≡ mapO(f)(mapO(g)(o))
 */
export const mapO =
  <A, B>(f: (a: A) => B) =>
  (o: Option<A>): Option<B> =>
    isSome(o) ? some(f(o.value)) : none;

/**
 * Monadic bind for Option.
 * @law Left identity:  flatMapO(f)(some(a)) ≡ f(a)
 * @law Right identity: flatMapO(some)(o)     ≡ o
 * @law Associativity:  flatMapO(g)(flatMapO(f)(o)) ≡ flatMapO(x => flatMapO(g)(f(x)))(o)
 */
export const flatMapO =
  <A, B>(f: (a: A) => Option<B>) =>
  (o: Option<A>): Option<B> =>
    isSome(o) ? f(o.value) : none;

/**
 * Returns the first Some or the lazy alternative when None.
 * @law Left identity:  orElse(() => some(b))(some(a)) ≡ some(a)
 * @law Right identity: orElse(() => none)(o)          ≡ o
 */
export const orElse =
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
        if (acc._tag === 'Err') return acc;
        const r = f(item);
        return r._tag === 'Ok' ? ok([...acc.value, r.value]) : r;
      },
      ok([]),
    );

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
