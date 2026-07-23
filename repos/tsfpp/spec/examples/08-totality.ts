/**
 * Examples for §8 — Partiality, Totality, and Proof (Rules 8.1–8.3)
 * See spec/CODING_STANDARD.md §8 and spec/rationale/totality-and-proof.md
 */

// ─── Shared primitives ────────────────────────────────────────────────────────

type Option<A> =
  | { readonly _tag: 'Some'; readonly value: A }
  | { readonly _tag: 'None' }

const some = <A>(value: A): Option<A> => ({ _tag: 'Some', value })
const none: Option<never> = { _tag: 'None' }

type Result<T, E> =
  | { readonly ok: true;  readonly value: T }
  | { readonly ok: false; readonly error: E }

const ok  = <T, E>(value: T): Result<T, E> => ({ ok: true,  value })
const err = <T, E>(error: E): Result<T, E> => ({ ok: false, error })

// ─── Rule 8.1 — Every function must be total or document partiality in its type ─
//
// MUST: A total function returns a value for every legal input.
// Partiality must surface in `Option`, `Result`, or `Either`.

// GOOD: total — every array input produces a defined output
const head = <A>(xs: ReadonlyArray<A>): Option<A> =>
  xs.length > 0
    ? some(xs[0] as A)  // DEVIATION(1.6): safe — guarded by xs.length > 0
    : none

const last = <A>(xs: ReadonlyArray<A>): Option<A> =>
  xs.length > 0
    ? some(xs[xs.length - 1] as A)  // DEVIATION(1.6): safe — guarded by xs.length > 0
    : none

// GOOD: total — division by zero surfaced as None
const divide = (numerator: number, denominator: number): Option<number> =>
  denominator === 0 ? none : some(numerator / denominator)

// GOOD: total — parsing failure surfaced as Err
type ParseIntError = { readonly kind: 'not_a_number'; readonly input: string }

const parseIntSafe = (raw: string): Result<number, ParseIntError> => {
  const n = parseInt(raw, 10)
  return isNaN(n)
    ? err({ kind: 'not_a_number', input: raw })
    : ok(n)
}

// GOOD: total — lookup failure surfaced as None
const lookup = <K extends string | number, V>(
  map: Readonly<Record<string, V>>,
  key: string,
): Option<V> => {
  const value = map[key]
  return value !== undefined ? some(value) : none
}

/* BAD: partial functions — undefined return or throw not reflected in the type.

const head = <A>(xs: A[]): A => xs[0]!     // crashes on empty array, ! hides the risk
const divide = (a: number, b: number): number => a / b  // returns Infinity or NaN for b=0
const parseIntUnsafe = (raw: string): number => parseInt(raw, 10)  // returns NaN — silent

const findOrThrow = <A>(xs: A[], pred: (a: A) => boolean): A => {
  const found = xs.find(pred)
  if (!found) throw new Error('not found')  // throw not in signature — invisible to callers
  return found
}
*/

// ─── Rule 8.2 — Property-based testing with fast-check ───────────────────────
//
// MUST: Property-based testing is mandatory for all pure functions in the core.
// The examples below show the structure; in a real test file they run with a test runner.
//
// import * as fc from 'fast-check'
// import { describe, test } from 'vitest'
//
// describe('head', () => {
//   test('head(xs) is Some when xs is non-empty', () => {
//     fc.assert(
//       fc.property(fc.array(fc.integer(), { minLength: 1 }), (xs) => {
//         const result = head(xs)
//         return result._tag === 'Some'
//       })
//     )
//   })
//
//   test('head([]) is None', () => {
//     const result = head([] as ReadonlyArray<number>)
//     return result._tag === 'None'
//   })
// })
//
// describe('divide', () => {
//   test('divide(a, b) * b ≈ a for non-zero b (inverse law)', () => {
//     fc.assert(
//       fc.property(
//         fc.float({ noNaN: true }),
//         fc.float({ noNaN: true, min: 0.001 }),
//         (a, b) => {
//           const result = divide(a, b)
//           if (result._tag === 'None') return false
//           return Math.abs(result.value * b - a) < 1e-9
//         }
//       )
//     )
//   })
//
//   test('divide(_, 0) is None', () => {
//     fc.assert(
//       fc.property(fc.float({ noNaN: true }), (a) => {
//         return divide(a, 0)._tag === 'None'
//       })
//     )
//   })
// })

// ─── Rule 8.3 — Document algebraic laws as JSDoc ─────────────────────────────
//
// SHOULD: Document algebraic laws (identity, associativity, commutativity) for
// key combinators as JSDoc or inline comments.

/**
 * Map over an Option.
 *
 * Laws:
 * - Identity:     mapOption(opt, identity)  ≡  opt
 * - Composition:  mapOption(mapOption(opt, f), g)  ≡  mapOption(opt, x => g(f(x)))
 */
const mapOption = <A, B>(opt: Option<A>, f: (a: A) => B): Option<B> =>
  opt._tag === 'Some' ? some(f(opt.value)) : none

/**
 * Chain (flatMap) over an Option — Monad bind for Option.
 *
 * Laws:
 * - Left identity:  chainOption(some(a), f)          ≡  f(a)
 * - Right identity: chainOption(opt, some)            ≡  opt
 * - Associativity:  chainOption(chainOption(opt, f), g)
 *                     ≡  chainOption(opt, a => chainOption(f(a), g))
 */
const chainOption = <A, B>(opt: Option<A>, f: (a: A) => Option<B>): Option<B> =>
  opt._tag === 'Some' ? f(opt.value) : none

/**
 * Lift a binary function into Option (Applicative liftA2).
 *
 * Laws:
 * - If either argument is None, result is None.
 * - If both are Some, result is Some(f(a, b)).
 */
const liftA2Option = <A, B, C>(
  f:    (a: A, b: B) => C,
  optA: Option<A>,
  optB: Option<B>,
): Option<C> =>
  optA._tag === 'Some' && optB._tag === 'Some'
    ? some(f(optA.value, optB.value))
    : none

/**
 * Pipe two unary functions (Kleisli composition arrow — functional composition).
 *
 * Laws:
 * - Right identity: pipe(f, identity) ≡ f
 * - Left identity:  pipe(identity, f) ≡ f
 * - Associativity:  pipe(pipe(f, g), h) ≡ pipe(f, pipe(g, h))
 */
const pipeF =
  <A, B>(f: (a: A) => B) =>
  <C>(g: (b: B) => C): ((a: A) => C) =>
  (a) => g(f(a))

// ─── Exports ──────────────────────────────────────────────────────────────────
export type { Option, Result, ParseIntError }
export {
  some, none, ok, err,
  head, last, divide, parseIntSafe, lookup,
  mapOption, chainOption, liftA2Option, pipeF,
}
