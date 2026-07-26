/**
 * @module core
 *
 * Foundation layer: branded-type encoding, the exhaustiveness witness, and
 * the function-composition combinators. Depends on nothing else in the package.
 */

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
