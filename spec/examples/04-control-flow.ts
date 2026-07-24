/**
 * Examples for §4 — Control Flow (Rules 4.1–4.6)
 * See ../CODING_STANDARD.md §4 and ../rationale/04-control-flow.md
 */

import { absurd } from './01-type-system'
import type { Result } from './03-functions'
import { ok, err } from './03-functions'

// ─── Shared domain types ──────────────────────────────────────────────────────

type Direction = 'north' | 'south' | 'east' | 'west'

type MoveEvent =
  | { readonly kind: 'move';  readonly direction: Direction; readonly steps: number }
  | { readonly kind: 'stop' }
  | { readonly kind: 'turn';  readonly direction: Direction }

type ValidationError = { readonly field: string; readonly message: string }

// ─── Rule 4.1 — `switch` with exhaustiveness; no bare `default` ──────────────
//
// MUST: Use `switch` with exhaustiveness for sum-type dispatch.
// Forbidden: `default` without a never-assertion (it silently swallows new variants).

const describeEvent = (event: MoveEvent): string => {
  switch (event.kind) {
    case 'move': return `Move ${event.steps} steps ${event.direction}`
    case 'stop': return 'Stop'
    case 'turn': return `Turn to face ${event.direction}`
    default:     return absurd(event)   // compile error when a new variant is added
  }
}

/* BAD: default silently swallows any future variant of MoveEvent.
const describeEvent = (event: MoveEvent): string => {
  switch (event.kind) {
    case 'move': return `Move ${event.steps} steps`
    default:     return 'unknown event'  // new variants silently fall here — no compile error
  }
}
*/

// GOOD: multiple cases sharing an implementation — all variants still explicit
const isMoving = (event: MoveEvent): boolean => {
  switch (event.kind) {
    case 'move': return true
    case 'stop': return false
    case 'turn': return false
    default:     return absurd(event)
  }
}

// ─── Rule 4.2 — No `for`, `while`, `do..while`; use higher-order functions ────
//
// MUST: Forbid imperative loops; use map, filter, reduce, flatMap, find.

type Employee = {
  readonly id:     string
  readonly name:   string
  readonly active: boolean
  readonly salary: number
}

const employees: ReadonlyArray<Employee> = [
  { id: 'e1', name: 'Alice', active: true,  salary: 80_000 },
  { id: 'e2', name: 'Bob',   active: false, salary: 70_000 },
  { id: 'e3', name: 'Carol', active: true,  salary: 90_000 },
]

// GOOD: declarative — intent is readable from the combinator names
const activeNames = employees
  .filter(e => e.active)
  .map(e => e.name)

const totalActiveSalary = employees
  .filter(e => e.active)
  .reduce((acc, e) => acc + e.salary, 0)

const firstActive = employees.find(e => e.active)

/* BAD: imperative loops require mutable accumulators, violate Rule 2.1.
let names: string[] = []
for (const e of employees) {
  if (e.active) names.push(e.name)   // violates Rule 2.3 (push) and Rule 2.1 (let)
}

let total = 0
for (let i = 0; i < employees.length; i++) {    // violates Rule 2.1 (let i)
  if (employees[i]!.active) total += employees[i]!.salary   // violates Rule 1.6 (!)
}
*/

// GOOD: flatMap — transform and flatten in one pass
const allSkills: ReadonlyArray<string> = [
  { name: 'Alice', skills: ['ts', 'react'] },
  { name: 'Bob',   skills: ['go', 'postgres'] },
].flatMap(p => p.skills)

// ─── Rule 4.3 — Ternary for simple branches; `if`/`else` for complex ─────────
//
// SHOULD: Prefer ternary expressions for simple conditional returns (expression);
// use `if`/`else` with guard clauses (Rule 4.4) for complex branching.

// GOOD: ternary — expression form, one level of nesting
const formatCount = (n: number): string =>
  n === 0 ? 'none' : n === 1 ? 'one' : `${n} items`

// GOOD: ternary with nullish coalescing
const displayName = (name: string | null): string =>
  name ?? 'Anonymous'

/* BAD: deeply nested ternary — reader must trace 8 code paths.
const classify = (x: number): string =>
  x > 100 ? (x > 1000 ? (x > 10_000 ? 'huge' : 'large') : 'medium') : (x > 0 ? 'small' : 'zero')
*/

// ─── Rule 4.4 — Guard clauses; maximum nesting depth 4 ───────────────────────
//
// MUST: Use early return (guard clauses); maximum nesting depth is 4.

type EmailAddress = string & { readonly __brand: 'EmailAddress' }
type ParsedEmail  = { readonly local: string; readonly domain: string }

// GOOD: guard clauses — happy path is at the shallowest level
const parseEmail = (input: unknown): Result<ParsedEmail, ValidationError> => {
  if (typeof input !== 'string')
    return err({ field: 'email', message: 'Must be a string' })
  const trimmed = input.trim()
  if (trimmed.length === 0)
    return err({ field: 'email', message: 'Cannot be empty' })
  const atIndex = trimmed.indexOf('@')
  if (atIndex < 1)
    return err({ field: 'email', message: 'Missing @ sign' })
  const local  = trimmed.slice(0, atIndex)
  const domain = trimmed.slice(atIndex + 1)
  if (domain.length === 0 || !domain.includes('.'))
    return err({ field: 'email', message: 'Invalid domain' })
  return ok({ local, domain })
}

/* BAD: deeply nested — happy path is buried in indentation.
const parseEmail = (input: unknown): Result<ParsedEmail, ValidationError> => {
  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (trimmed.length > 0) {
      const atIndex = trimmed.indexOf('@')
      if (atIndex >= 1) {
        const domain = trimmed.slice(atIndex + 1)
        if (domain.includes('.')) {
          return ok({ local: trimmed.slice(0, atIndex), domain })
        } else {
          return err({ field: 'email', message: 'Invalid domain' })
        }
      } else {
        return err({ field: 'email', message: 'Missing @ sign' })
      }
    } else {
      return err({ field: 'email', message: 'Cannot be empty' })
    }
  } else {
    return err({ field: 'email', message: 'Must be a string' })
  }
}
*/

// ─── Rule 4.5 — No truthiness checks on non-boolean values ───────────────────
//
// MUST: Use explicit comparisons; never test truthiness on non-boolean values.

// GOOD: explicit comparisons — 0 and "" are valid domain values
const isNonEmpty = (s: string): boolean => s.length > 0
const isPositive = (n: number): boolean => n > 0
const isPresent  = (v: string | undefined): v is string => v !== undefined

// GOOD: explicit null/undefined check
const formatOptional = (label: string | null): string =>
  label !== null ? label : '(none)'

/* BAD: truthiness coercion — 0 and "" are falsy but may be valid.
if (count)      { ... }   // false when count === 0, which may be valid
if (str)        { ... }   // false when str === "", which may be intentional
if (value)      { ... }   // false for null, undefined, 0, NaN, ""
if (arr.length) { ... }   // acceptable in JS idiom but explicit form is clearer
*/

// ─── Rule 4.6 — No ambient nondeterminism in the core; inject the clock/entropy ─
//
// MUST: Date.now(), new Date(), Math.random(), crypto.randomUUID() are effects.
// Thread them in through a Deps record so the core stays referentially transparent.

type Clock = {
  readonly now: () => Date
  readonly randomUuid: () => string
}

// GOOD: same inputs + same deps ⇒ same output. Trivially testable with a frozen clock.
const mkReceiptId = (deps: Clock) => (customer: string): string =>
  `${customer}-${deps.now().getTime()}-${deps.randomUuid()}`

// Production wires the real effects at the boundary (the one place they may be read):
const systemClock: Clock = {
  now: () => new Date(),                 // DEVIATION(4.6): composition-root boundary
  randomUuid: () => globalThis.crypto.randomUUID(), // DEVIATION(4.6): composition-root boundary
}

// Tests wire deterministic ones — no fake timers, no module mocks:
const frozenClock: Clock = { now: () => new Date(0), randomUuid: () => 'test-uuid' }

/* BAD: reads the ambient clock and entropy from inside pure logic.
const mkReceiptId = (customer: string): string =>
  `${customer}-${Date.now()}-${Math.random()}` // different every call; untestable
*/

// ─── Exports ──────────────────────────────────────────────────────────────────
export type { Direction, MoveEvent, Employee, EmailAddress, ParsedEmail, ValidationError, Clock }
export {
  describeEvent, isMoving, employees, activeNames, totalActiveSalary, firstActive,
  allSkills, formatCount, displayName, parseEmail, isNonEmpty, isPositive, isPresent,
  formatOptional, mkReceiptId, systemClock, frozenClock,
}
