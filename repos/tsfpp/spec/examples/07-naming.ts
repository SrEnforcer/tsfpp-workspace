/**
 * Examples for §7 — Naming (Rules 7.1–7.6)
 * See spec/CODING_STANDARD.md §7
 */

// ─── Shared domain types for context ─────────────────────────────────────────

type Brand<T, B extends string> = T & { readonly __brand: B }

type Option<A> =
  | { readonly _tag: 'Some'; readonly value: A }
  | { readonly _tag: 'None' }

const some = <A>(value: A): Option<A> => ({ _tag: 'Some', value })
const none: Option<never> = { _tag: 'None' }

// ─── Rule 7.1 — Types and type aliases in PascalCase ─────────────────────────
//
// MUST: Types and type aliases in PascalCase.

// GOOD
type NodeId        = Brand<string, 'NodeId'>
type DeptId        = Brand<string, 'DeptId'>
type ParseResult   = { readonly ok: boolean; readonly value: string }
type RenderConfig  = { readonly width: number; readonly height: number }

/* BAD: lowercase or snake_case type names.
type nodeId = string          // should be NodeId
type parse_result = { ok: boolean }  // should be ParseResult
type renderconfig = {}        // should be RenderConfig
*/

// ─── Rule 7.2 — Functions, constants, and variables in camelCase ──────────────
//
// MUST: Functions, constants, and module-level variables in camelCase.

// GOOD
const maxRetries   = 3
const defaultLimit = 100
const tokenize     = (input: string): ReadonlyArray<string> => input.trim().split(/\s+/)
const parseConfig  = (raw: string): ParseResult => ({ ok: true, value: raw })

/* BAD: PascalCase or snake_case for values.
const MaxRetries = 3             // PascalCase is reserved for types
const default_limit = 100       // snake_case is forbidden
const Tokenize = (s: string) => s.split(' ')  // PascalCase function
*/

// ─── Rule 7.3 — Smart constructors prefixed with `mk`, `as`, or `fromX` ───────
//
// MUST: Smart constructors prefixed with `mk` or `as` or named `fromX`.
// Signals construction with potential validation, distinct from ordinary functions.

// GOOD: mk prefix — "make a validated instance"
const mkNodeId = (raw: string): Option<NodeId> => {
  if (raw.trim().length === 0) return none
  return some(raw.trim() as NodeId)
}

// GOOD: as prefix — "assert/coerce with trust"
const asDeptId = (raw: string): DeptId => raw as DeptId  // caller guarantees validity

// GOOD: fromX naming — "parse/convert from another representation"
type Direction = 'north' | 'south' | 'east' | 'west'

const fromCompassString = (raw: string): Option<Direction> => {
  const lower = raw.toLowerCase()
  if (lower === 'n' || lower === 'north') return some('north')
  if (lower === 's' || lower === 'south') return some('south')
  if (lower === 'e' || lower === 'east')  return some('east')
  if (lower === 'w' || lower === 'west')  return some('west')
  return none
}

/* BAD: constructor-like intent hidden in a generic verb name.
const createNodeId = (raw: string): NodeId => raw as NodeId  // should be mkNodeId
const getNodeId    = (raw: string): NodeId => raw as NodeId  // misleads — "get" implies retrieval
const newDeptId    = (raw: string): DeptId => raw as DeptId  // "new" suggests class pattern
*/

// ─── Rule 7.4 — Prefix effectful/unsafe functions with `unsafe` ───────────────
//
// SHOULD: Prefix functions that throw or perform I/O outside the adapter pattern
// with `unsafe`, signaling that callers must handle failure externally.

// GOOD: unsafeParseJson — clearly signals this throws on bad input
const unsafeParseJson = (raw: string): unknown => JSON.parse(raw)   // throws on invalid JSON

// GOOD: unsafeHead — clearly signals this crashes on empty array
const unsafeHead = <A>(xs: ReadonlyArray<A>): A => {
  if (xs.length === 0) throw new Error('unsafeHead: empty array')
  return xs[0] as A  // DEVIATION(1.6): safe — guarded by length check above
}

/* BAD: dangerous behavior hidden in an innocent-sounding name.
const parseJson = (raw: string): unknown => JSON.parse(raw)   // throws — looks safe
const head      = <A>(xs: A[]): A => xs[0]!                   // crashes — looks safe
*/

// ─── Rule 7.5 — Predicates with `is` or `has` prefix ─────────────────────────
//
// SHOULD: Name predicates with `is` or `has` prefix; return `boolean` or type-guard signature.

type OrgNode = { readonly id: NodeId; readonly archived: boolean; readonly childCount: number }

// GOOD: is prefix with plain boolean return
const isArchived    = (node: OrgNode): boolean => node.archived
const isLeaf        = (node: OrgNode): boolean => node.childCount === 0

// GOOD: has prefix for "contains" semantics
const hasChildren   = (node: OrgNode): boolean => node.childCount > 0

// GOOD: type guard with is prefix
const isOption = <A>(value: unknown): value is Option<A> =>
  typeof value === 'object' && value !== null && '_tag' in value

// GOOD: type guard in a Result context
type ParseOk<T>   = { readonly ok: true;  readonly value: T }
type ParseFail<E> = { readonly ok: false; readonly error: E }
type ParseResult2<T, E> = ParseOk<T> | ParseFail<E>

const isParseOk = <T, E>(r: ParseResult2<T, E>): r is ParseOk<T> => r.ok

/* BAD: predicate names that don't signal boolean return intent.
const checkArchived  = (n: OrgNode): boolean => n.archived  // "check" is ambiguous
const getArchived    = (n: OrgNode): boolean => n.archived  // "get" suggests retrieval
const archivedStatus = (n: OrgNode): boolean => n.archived  // no consistent convention
*/

// ─── Rule 7.6 — Descriptive names; restricted single-letter names ─────────────
//
// MUST: Use descriptive names. Single-letter names restricted to:
//   `_`    — unused parameter
//   A, B, T, E — type parameters
//   x, n, e   — lambda parameters in short, obvious pipelines

// GOOD: descriptive names
const countActiveNodes = (nodes: ReadonlyArray<OrgNode>): number =>
  nodes.filter(n => !n.archived).length

// GOOD: short lambda parameter in an obvious single-operation pipeline
const doubleAll = (numbers: ReadonlyArray<number>): ReadonlyArray<number> =>
  numbers.map(n => n * 2)

// GOOD: unused parameter is `_`
const alwaysTrue = (_: unknown): boolean => true

// GOOD: type parameters as single letters
const identity = <A>(a: A): A => a
const mapOption = <A, B>(opt: Option<A>, f: (a: A) => B): Option<B> =>
  opt._tag === 'Some' ? some(f(opt.value)) : none

/* BAD: single-letter variable names outside permitted contexts.
const f = (a: OrgNode[]): number => a.filter(b => !b.archived).length
//   ^ meaningless   ^ meaningless — what is `b` here?

const p = (s: string) => s.length > 0   // `p` for "predicate"? for "parser"? unknown
*/

// ─── Exports ──────────────────────────────────────────────────────────────────
export type {
  NodeId, DeptId, ParseResult, RenderConfig, Direction, OrgNode,
  Option, ParseOk, ParseFail, ParseResult2,
}
export {
  some, none, mkNodeId, asDeptId, fromCompassString,
  tokenize, parseConfig, maxRetries, defaultLimit,
  unsafeParseJson, unsafeHead,
  isArchived, isLeaf, hasChildren, isOption, isParseOk,
  countActiveNodes, doubleAll, alwaysTrue, identity, mapOption,
}
