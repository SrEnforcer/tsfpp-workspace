/**
 * Examples for §3 — Functions (Rules 3.1–3.7)
 * See ../CODING_STANDARD.md §3 and ../rationale/03-functions.md
 */

import type { Option } from './01-type-system'
import { some, none, absurd } from './01-type-system'

// ─── Shared domain types ──────────────────────────────────────────────────────

type Token = { readonly kind: string; readonly value: string }

type Result<T, E> =
  | { readonly ok: true;  readonly value: T }
  | { readonly ok: false; readonly error: E }

const ok  = <T,  E>(value: T): Result<T, E> => ({ ok: true,  value })
const err = <T,  E>(error: E): Result<T, E> => ({ ok: false, error })

// ─── Rule 3.1 — Explicit return type on every exported function ───────────────
//
// MUST: Every exported function must have an explicit return type annotation.

export const tokenize = (input: string): ReadonlyArray<Token> => {
  const words = input.trim().split(/\s+/)
  return words.map(w => ({ kind: 'word', value: w }))
}

export const findFirst = <A>(
  xs:        ReadonlyArray<A>,
  predicate: (a: A) => boolean,
): Option<A> => {
  const found = xs.find(predicate)
  return found !== undefined ? some(found) : none
}

/* BAD: inferred return type leaks implementation details and is fragile.
export const tokenize = (input: string) => {   // return type inferred — any change is silent
  return input.trim().split(/\s+/).map(w => ({ kind: 'word', value: w }))
}
*/

// ─── Rule 3.2 — Maximum 3 positional parameters; ≥ 3 use a record ────────────
//
// MUST: Limit function arity to 3 positional parameters; use a readonly record for ≥ 3.

// GOOD: two positional params — acceptable
export const clamp = (value: number, max: number): number =>
  Math.min(value, max)

// GOOD: four conceptual inputs — record with named fields
type RenderOpts = {
  readonly width:   number
  readonly height:  number
  readonly padding: number
  readonly debug:   boolean
}

export const renderSvg = (opts: RenderOpts): string =>
  `<svg width="${opts.width}" height="${opts.height}"><!-- debug:${opts.debug} --></svg>`

/* BAD: positional ambiguity — which argument is padding? Which is debug?
export const renderSvg = (
  width: number, height: number, padding: number, debug: boolean
): string => `...`
renderSvg(800, 600, 16, true)  // impossible to read at the call site
*/

// ─── Rule 3.3 — Separate pure and effectful functions by signature ────────────
//
// MUST: Pure functions return T; effectful functions return Promise<T> / Task<T>.

// GOOD: pure — returns a value directly, no I/O
export const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`
}

// GOOD: effectful — return type signals async I/O
export const fetchUserById = async (id: string): Promise<Result<{ name: string }, string>> => {
  try {
    const res = await fetch(`/api/users/${id}`)
    if (!res.ok) return err(`HTTP ${res.status}`)
    const data = await res.json() as unknown
    if (typeof data !== 'object' || data === null) return err('invalid response')
    return ok(data as { name: string })
  } catch (e) {
    return err(String(e))
  }
}

/* BAD: impure function with a pure-looking signature — hidden I/O.
import { readFileSync } from 'fs'

const loadConfig = (path: string): Config => {
  const raw = readFileSync(path, 'utf8')   // hidden I/O — no Promise in the signature
  return JSON.parse(raw)
}
*/

// ─── Rule 3.4 — 40-line limit, complexity ≤ 10, nesting ≤ 4 ──────────────────
//
// MUST: Limit function body to 40 lines; cyclomatic complexity to 10; nesting to 4.
//
// GOOD: complex logic is decomposed into named helpers, each within bounds.

type ParseError = { readonly kind: 'syntax'; readonly message: string }
type Expr =
  | { readonly kind: 'num';  readonly value: number }
  | { readonly kind: 'add';  readonly left: Expr; readonly right: Expr }

const parseNumber = (input: string): Result<Expr, ParseError> => {
  const n = Number(input.trim())
  return isNaN(n)
    ? err({ kind: 'syntax', message: `Expected number, got: ${input}` })
    : ok({ kind: 'num', value: n })
}

const parseAddExpr = (input: string): Result<Expr, ParseError> => {
  const [lhs, rhs] = input.split('+').map(s => s.trim())
  if (rhs === undefined) return parseNumber(input)
  const leftResult  = parseNumber(lhs ?? '')
  const rightResult = parseNumber(rhs)
  if (!leftResult.ok)  return leftResult
  if (!rightResult.ok) return rightResult
  return ok({ kind: 'add', left: leftResult.value, right: rightResult.value })
}

/* BAD: monolithic function — too long, too complex, nesting exceeds 4.
const parse = (input: string): Result<Expr, ParseError> => {
  if (input.includes('+')) {
    const parts = input.split('+')
    if (parts.length === 2) {
      const left = parts[0]?.trim() ?? ''
      const right = parts[1]?.trim() ?? ''
      if (left.length > 0) {
        if (right.length > 0) {
          const ln = Number(left)
          if (!isNaN(ln)) {
            const rn = Number(right)
            if (!isNaN(rn)) {
              return ok({ kind: 'add', left: { kind: 'num', value: ln }, right: { kind: 'num', value: rn } })
            }
          }
        }
      }
    }
  }
  const n = Number(input.trim())
  return isNaN(n) ? err({ kind: 'syntax', message: `bad: ${input}` }) : ok({ kind: 'num', value: n })
}
*/

// ─── Rule 3.5 — Terminating recursion; prefer tail-recursive / trampoline ─────
//
// MUST: All recursion must be provably terminating.

// GOOD: recursion on a known-bounded structure (tree depth documented)
const evalExpr = (expr: Expr): number => {
  switch (expr.kind) {
    case 'num': return expr.value
    case 'add': return evalExpr(expr.left) + evalExpr(expr.right)
    default:    return absurd(expr)
  }
}

// GOOD: trampoline for unbounded recursion
type Trampoline<A> =
  | { readonly done: true;  readonly value: A }
  | { readonly done: false; readonly thunk: () => Trampoline<A> }

const trampolineRun = <A>(t: Trampoline<A>): A => {
  let current: Trampoline<A> = t
  while (!current.done) current = current.thunk()
  return current.value
}

const factStep = (n: number, acc: number): Trampoline<number> =>
  n <= 1
    ? { done: true,  value: acc }
    : { done: false, thunk: () => factStep(n - 1, n * acc) }

export const factorial = (n: number): number => trampolineRun(factStep(n, 1))

/* BAD: naive deep recursion — stack overflow on large n (V8 has no TCO).
const factorial = (n: number): number =>
  n <= 1 ? 1 : n * factorial(n - 1)   // will overflow at ~10_000
*/

// ─── Rule 3.6 — Prefer arrow functions over `function` declarations ───────────
//
// SHOULD: Arrow functions have no `this` binding; prefer them for all domain code.

// GOOD: arrow function — no `this` capture risk
export const add = (a: number) => (b: number): number => a + b

/* BAD: function declaration in module body — `this` binding available, hoisting side-effect.
function add(a: number, b: number): number { return a + b }
*/

// ─── Rule 3.7 — No optional parameters; use `Option<T>` or a defaults record ──
//
// MUST: Never use optional parameters (`?`); use explicit `Option<T>`.

type SearchOpts = {
  readonly query:    string
  readonly maxDepth: Option<number>   // explicitly absent, not ambiguously undefined
}

export const search = (opts: SearchOpts): ReadonlyArray<string> => {
  const depth = opts.maxDepth._tag === 'Some' ? opts.maxDepth.value : 10
  return [`result at depth ${depth} for "${opts.query}"`]
}

/* BAD: optional parameter conflates absent with explicitly undefined.
const search = (query: string, maxDepth?: number): string[] => {
  const depth = maxDepth ?? 10  // was undefined because caller forgot, or intentionally no depth?
  return [`result at depth ${depth}`]
}
*/

// ─── Exports ──────────────────────────────────────────────────────────────────
export type { Token, Result, RenderOpts, ParseError, Expr, Trampoline, SearchOpts }
export { ok, err, clamp, renderSvg, formatDuration, parseNumber, parseAddExpr, evalExpr, trampolineRun, add }
