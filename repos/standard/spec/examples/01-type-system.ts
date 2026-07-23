/**
 * Examples for §1 — Type System (Rules 1.1–1.12)
 * See ../CODING_STANDARD.md §1 and ../rationale/01-type-system.md
 */

// ─── Shared primitives used across examples ───────────────────────────────────

/** Utility: exhaustiveness witness. Throws only if reached at runtime (impossible in correct code). */
const absurd = (_: never): never => { throw new Error('Impossible: reached absurd branch') }

// ─── Rule 1.1 — Tagged discriminated unions ───────────────────────────────────
//
// MUST: Encode sum types as tagged discriminated unions with a literal discriminant.

type Shape =
  | { readonly kind: 'circle'; readonly radius: number }
  | { readonly kind: 'rect';   readonly width: number; readonly height: number }
  | { readonly kind: 'triangle'; readonly base: number; readonly height: number }

/* BAD: No shared discriminant — switch cannot narrow, instanceof cannot help.
type Shape = Circle | Rect | Triangle  // opaque union, no shared field
*/

// ─── Rule 1.2 — Exhaustiveness via `never` ────────────────────────────────────
//
// MUST: Assert exhaustiveness via `never` in the default branch of any match over
// a sum type. Forbidden: `default` without a never-assertion.

const area = (s: Shape): number => {
  switch (s.kind) {
    case 'circle':   return Math.PI * s.radius ** 2
    case 'rect':     return s.width * s.height
    case 'triangle': return 0.5 * s.base * s.height
    default:         return absurd(s)    // compile error if a variant is missing
  }
}

/* BAD: default silently swallows future variants — no compile error when 'triangle' is added.
const area = (s: Shape): number => {
  switch (s.kind) {
    case 'circle': return Math.PI * s.radius ** 2
    case 'rect':   return s.width * s.height
    default:       return 0  // new variants silently handled here
  }
}
*/

// ─── Rule 1.3 — Branded types and smart constructors ─────────────────────────
//
// MUST: Encode nominal distinctions via branded types; expose only smart constructors.

type Brand<T, B extends string> = T & { readonly __brand: B }

type NodeId  = Brand<string, 'NodeId'>
type DeptId  = Brand<string, 'DeptId'>

/** Smart constructor — the ONLY place `as NodeId` is permitted. */
const mkNodeId = (raw: string): NodeId => {
  if (raw.trim().length === 0) throw new Error('NodeId cannot be empty')
  return raw as NodeId  // DEVIATION(1.6): `as` permitted inside smart constructor boundary
}

const mkDeptId = (raw: string): DeptId => {
  if (raw.trim().length === 0) throw new Error('DeptId cannot be empty')
  return raw as DeptId  // DEVIATION(1.6): `as` permitted inside smart constructor boundary
}

declare function linkNodeToDept(nodeId: NodeId, deptId: DeptId): void

const nId = mkNodeId('node-42')
const dId = mkDeptId('dept-hr')
linkNodeToDept(nId, dId)   // correct

/* BAD: unguarded cast outside constructor — brand provides no safety.
const id: NodeId = someString as NodeId
linkNodeToDept(dId, nId)   // argument order swapped — would be a runtime bug without brands
*/

// ─── Rule 1.4 — `type` over `interface` ──────────────────────────────────────
//
// MUST: Prefer `type` aliases; reserve `interface` solely for structural extension
// at library boundaries with documented justification.

type User = {
  readonly id:   NodeId
  readonly name: string
  readonly role: 'admin' | 'viewer'
}

type AdminUser = User & { readonly role: 'admin'; readonly permissions: ReadonlyArray<string> }

/* BAD: interface supports uncontrolled declaration merging.
interface User {   // a second `interface User { extraField: X }` anywhere merges silently
  id: NodeId
  name: string
}
*/

// ─── Rule 1.5 — No `any`; `unknown` with immediate narrowing ─────────────────
//
// MUST: Never use `any`; restrict `unknown` to system boundaries with immediate narrowing.

type Config = { readonly host: string; readonly port: number }

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const parseConfig = (raw: unknown): Config | null => {
  if (!isRecord(raw)) return null
  if (typeof raw['host'] !== 'string') return null
  if (typeof raw['port'] !== 'number') return null
  return { host: raw['host'], port: raw['port'] }
}

/* BAD: any disables the type checker in both directions.
const parseConfig = (raw: any): Config => raw as Config  // no validation, no safety
*/

// ─── Rule 1.6 — No `!`; no `as` outside smart constructors ───────────────────
//
// MUST: Never use non-null assertion `!`; never use type assertion `as` outside
// smart constructors.

type Option<A> =
  | { readonly _tag: 'Some'; readonly value: A }
  | { readonly _tag: 'None' }

const some = <A>(value: A): Option<A> => ({ _tag: 'Some', value })
const none: Option<never> = { _tag: 'None' }

const head = <A>(xs: ReadonlyArray<A>): Option<A> =>
  xs.length > 0
    ? some(xs[0] as A)  // DEVIATION(1.6): safe — guarded by xs.length > 0
    : none

/* BAD: non-null assertion — no runtime guard, crashes on empty array.
const head = <A>(xs: ReadonlyArray<A>): A => xs[0]!
*/

// ─── Rule 1.7 — Limit type-level metaprogramming ─────────────────────────────
//
// SHOULD: Limit conditional/mapped/template-literal types to utility libraries.
// Keep domain types simple and legible.

// GOOD: domain type — immediately legible
type PermissionLevel = 'read' | 'write' | 'admin'

type UserWithPermission = {
  readonly user: User
  readonly level: PermissionLevel
}

/* AVOID in domain code (belongs in a dedicated type-utilities module):
type DeepReadonly<T> =
  T extends (infer U)[] ? ReadonlyArray<DeepReadonly<U>> :
  T extends object       ? { readonly [K in keyof T]: DeepReadonly<T[K]> } :
  T
*/

// ─── Rule 1.8 — No `enum` ────────────────────────────────────────────────────
//
// MUST: Never use `enum`; use string literal unions or const objects.

type Direction = 'north' | 'south' | 'east' | 'west'

const Direction = {
  North: 'north',
  South: 'south',
  East:  'east',
  West:  'west',
} as const

const move = (dir: Direction): string => `moving ${dir}`
move(Direction.North)   // autocomplete works; zero runtime overhead

/* BAD: enum generates runtime code and allows numeric reverse-mapping.
enum Direction { North, South, East, West }
// Direction[0] === 'North' — reverse-mapping bypasses nominal safety
// A function typed (d: Direction) also accepts 0, 1, 2, 3
*/

// ─── Rule 1.9 — No `class`, `this`, `new`, `instanceof` ──────────────────────
//
// MUST: Never use class, this, new (in domain code), or instanceof.

type Logger = {
  readonly log:  (msg: string) => void
  readonly warn: (msg: string) => void
}

const mkLogger = (prefix: string): Logger => ({
  log:  (msg) => console.log(`[${prefix}] ${msg}`),
  warn: (msg) => console.warn(`[${prefix}] WARN ${msg}`),
})

const domainLogger = mkLogger('parser')
domainLogger.log('started')   // no `this` binding risk; safe to destructure

/* BAD: class introduces mutable state, `this` binding risk, and identity semantics.
class Logger {
  constructor(private prefix: string) {}
  log(msg: string) { console.log(`[${this.prefix}] ${msg}`) }
}
// const { log } = new Logger('parser')
// log('oops')  — `this` is undefined or wrong; classic detached-method bug
*/

// ─── Rule 1.10 — Preserve type guards at narrowing sites ─────────────────────
//
// MUST: Keep type guards direct where narrowing matters; use complement for
// predicate-as-value positions only.

type StrOrNum = string | number

const isString = (value: StrOrNum): value is string => typeof value === 'string'
const complement = <A>(predicate: (a: A) => boolean) => (a: A): boolean => !predicate(a)

const toUpperOrFixed = (value: StrOrNum): string =>
  isString(value) ? value.toUpperCase() : value.toFixed(2)

const scalarsOnly = ([1, 'a', 2, 'b'] as ReadonlyArray<StrOrNum>).filter(complement(isString))

/* BAD: wrapping a type guard in complement at a narrowing site loses narrowing.
const toUpperOrFixed = (value: StrOrNum): string => {
  if (complement(isString)(value)) {
    return value.toFixed(2) // value is still StrOrNum here
  }
  return value.toUpperCase()
}
*/

// ─── Rule 1.11 — Access prelude ADT tags via guard functions ─────────────────
//
// MUST: Use guard predicates (isOk/isErr/isSome/isNone) instead of direct _tag
// comparison outside prelude internals.

type PreludeResult<A, E> =
  | { readonly _tag: 'Ok'; readonly value: A }
  | { readonly _tag: 'Err'; readonly error: E }

const mkOk = <A, E>(value: A): PreludeResult<A, E> => ({ _tag: 'Ok', value })
const mkErr = <A, E>(error: E): PreludeResult<A, E> => ({ _tag: 'Err', error })
const isOk = <A, E>(result: PreludeResult<A, E>): result is { readonly _tag: 'Ok'; readonly value: A } =>
  result._tag === 'Ok'
const isErr = <A, E>(result: PreludeResult<A, E>): result is { readonly _tag: 'Err'; readonly error: E } =>
  result._tag === 'Err'

const unwrapOr = <A, E>(result: PreludeResult<A, E>, fallback: A): A =>
  isOk(result) ? result.value : fallback

const collectErrors = <A, E>(results: ReadonlyArray<PreludeResult<A, E>>): ReadonlyArray<E> =>
  results.filter(isErr).map(r => r.error)

/* BAD: direct `_tag` comparison in consumer code leaks prelude internals.
if (result._tag === 'Ok') {
  return result.value
}
*/

// ─── Rule 1.12 — Use `_tag` for prelude ADTs, `kind` for domain ADTs ─────────
//
// MUST: Library/prelude ADTs use `_tag`; domain ADTs use `kind`.

type DomainOrder =
  | { readonly kind: 'draft' }
  | { readonly kind: 'submitted'; readonly submittedAt: string }

type PreludeOption<A> =
  | { readonly _tag: 'Some'; readonly value: A }
  | { readonly _tag: 'None' }

const isSome = <A>(option: PreludeOption<A>): option is { readonly _tag: 'Some'; readonly value: A } =>
  option._tag === 'Some'
const isNone = <A>(option: PreludeOption<A>): option is { readonly _tag: 'None' } =>
  option._tag === 'None'

const renderOrderStatus = (order: DomainOrder): string =>
  order.kind === 'draft' ? 'Draft' : `Submitted at ${order.submittedAt}`

const renderNick = (nick: PreludeOption<string>): string =>
  isSome(nick) ? nick.value : '(no nickname)'

// ─── Rule 1.13 — Numeric hazards: brand constrained numerics, guard finiteness ─
//
// MUST: `number` includes NaN/Infinity; coercion parsing stays at the boundary,
// and domain invariants (positive, integer) are branded.

type Positive = Brand<number, 'Positive'>

// Smart constructor: the ONLY gateway; NaN and non-positive values become None.
const mkPositive = (raw: number): PreludeOption<Positive> =>
  Number.isFinite(raw) && raw > 0
    // The brand is applied after the guard — the one legitimate `as` (Rule 1.6).
    ? some(raw as Positive)
    : none

// GOOD: parse at the boundary, then the core consumes a value with no NaN in it.
const parsePrice = (rawText: string): PreludeOption<Positive> =>
  mkPositive(Number.parseFloat(rawText))

const applyDiscount = (price: Positive, pct: number): number =>
  price * (1 - pct) // no NaN guard needed — the type already excludes it

/* BAD: coercion in the core; NaN is a valid `number` and poisons every sum.
const price = Number(rawText)   // NaN on bad input
const total = price * quantity  // silently NaN, no signal
if (price > 0) { ... }          // NaN > 0 is false — guard passes the wrong way
*/

// ─── Rule 1.14 — Prefer `satisfies` over `as` for literal conformance ────────
//
// SHOULD: `satisfies` checks conformance without widening; `as` asserts blindly.

// GOOD: each value keeps its literal type, and a non-conforming entry fails to compile.
const routes = {
  home: '/',
  profile: '/u/:id',
} satisfies Record<string, `/${string}`>

const homePath: '/' = routes.home // literal preserved, not widened to `string`

/* BAD: asserts conformance without checking, and widens away the literals.
const routes = { home: '/' } as Record<string, `/${string}`>
*/

// ─── Exports (make module valid) ─────────────────────────────────────────────
export type {
  Shape, User, AdminUser, UserWithPermission,
  Config, Option, Logger,
  Brand, NodeId, DeptId, PermissionLevel,
  StrOrNum, PreludeResult, DomainOrder, PreludeOption,
  Positive,
}
export {
  absurd, area, mkNodeId, mkDeptId, head, parseConfig, some, none, mkLogger, Direction,
  isString, complement, toUpperOrFixed, scalarsOnly,
  mkOk, mkErr, isOk, isErr, unwrapOr, collectErrors,
  isSome, isNone, renderOrderStatus, renderNick,
  mkPositive, parsePrice, applyDiscount, routes, homePath,
}
