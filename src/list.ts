/**
 * @module list
 *
 * Immutable singly-linked `List` ADT and its combinator set. Preferred over
 * `ReadonlyArray` for prepend-heavy and structurally recursive workloads.
 */

import { type Option, type Result, isErr, none, ok, some } from './adt.js';

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
