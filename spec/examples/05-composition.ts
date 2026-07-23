/**
 * Examples for §5 — Composition and Call Sites (Rules 5.1–5.4)
 * See spec/CODING_STANDARD.md §5 and spec/rationale/control-flow.md
 */

import type { Employee } from './04-control-flow'
import { employees } from './04-control-flow'

// ─── Minimal pipe implementation for examples ────────────────────────────────
//
// In production code, import from ramda or a dedicated prelude module.

const pipe =
  <A>(a: A) =>
  <B>(f: (a: A) => B) =>
  <C>(g: (b: B) => C) =>
  <D>(h: (c: C) => D): D =>
    h(g(f(a)))

// A multi-arity pipe suitable for pipelines — shown for illustration.
// Real usage: import { pipe } from 'ramda' or '@tsfpp/prelude'.

const pipeAll = <A>(value: A, ...fns: ReadonlyArray<(x: unknown) => unknown>): unknown =>
  fns.reduce((acc, fn) => fn(acc), value as unknown)

// ─── Shared predicates and transformers ──────────────────────────────────────

const isActive   = (e: Employee): boolean => e.active
const toName     = (e: Employee): string  => e.name
const toUpper    = (s: string):   string  => s.toUpperCase()
const byName = (a: Employee, b: Employee): number => a.name.localeCompare(b.name)

// ─── Rule 5.1 — `pipe` for multi-step transformations; limit to 8 stages ─────
//
// MUST: Use `pipe` (left-to-right) for multi-step transformations.
// Data flows left-to-right; each stage has a single responsibility.

// GOOD: readable left-to-right data flow
const activeNamesUppercased: ReadonlyArray<string> = employees
  .filter(isActive)
  .toSorted(byName)
  .map(toName)
  .map(toUpper)

// GOOD: Ramda-style pipe (import from ramda in real code)
// const result = R.pipe(
//   R.filter(isActive),
//   R.sortBy(R.prop('name')),
//   R.map(R.prop('name')),
//   R.map(R.toUpper),
// )(employees)

/* BAD: inside-out nesting — must be read right-to-left.
const result = Array.from(
  new Set(
    employees
      .filter(isActive)
      .map(e => e.name.toUpperCase())
  )
)
// Reader has to parse from the innermost expression outward; intent is obscured.
*/

// GOOD: long pipeline split at a meaningful intermediate — not forced into 8+ stages
const activeSorted: ReadonlyArray<Employee> = employees
  .filter(isActive)
  .toSorted(byName)

const activeSortedNames: ReadonlyArray<string> = activeSorted
  .map(toName)

// ─── Rule 5.2 — Point-free with restraint ────────────────────────────────────
//
// SHOULD: Prefer point-free only for short pipelines of well-named combinators.
// Use explicit lambdas when the data shape needs to be visible.

// GOOD: point-free — combinators are self-documenting
const getActiveNames = (es: ReadonlyArray<Employee>): ReadonlyArray<string> =>
  es.filter(isActive).map(toName)

// GOOD: explicit lambda where the data shape matters for readability
const formatEmployee = (e: Employee): string =>
  `${e.name} (${e.active ? 'active' : 'inactive'})`

const formattedList = employees.map(formatEmployee)

/* BAD: point-free with anonymous compositions — data shape invisible, hard to debug.
import * as R from 'ramda'
const getActiveNames = R.pipe(
  R.filter(R.propEq('active', true)),
  R.map(R.prop('name')),
  R.map(R.pipe(R.split(' '), R.head))   // what type does this operate on now?
)
*/

// ─── Rule 5.3 — Records at call sites when arity ≥ 3 ─────────────────────────
//
// MUST: Use records (named fields) at call sites when arity ≥ 3. (See Rule 3.2)
// This rule covers call site discipline — even if a function takes positional args,
// prefer wrapping in a record and destructuring.

type RenderConfig = {
  readonly title:     string
  readonly maxItems:  number
  readonly showEmpty: boolean
  readonly compact:   boolean
}

const renderList = (config: RenderConfig): string => {
  const { title, maxItems, compact } = config
  return compact
    ? `${title}: (${maxItems} items)`
    : `# ${title}\n${maxItems} items shown`
}

// GOOD: call site is self-documenting
const output = renderList({
  title:     'Active Employees',
  maxItems:  10,
  showEmpty: false,
  compact:   true,
})

/* BAD: positional args — impossible to read at the call site.
const renderList = (title: string, maxItems: number, showEmpty: boolean, compact: boolean): string =>
  compact ? `${title}: (${maxItems} items)` : `...`

renderList('Active Employees', 10, false, true)
// What is `false`? What is `true`? Reader must open the function signature.
*/

// ─── Rule 5.4 — IIFE for scoping local bindings in expression position ────────
//
// MAY: Use IIFE to introduce local const bindings where a `let` would otherwise
// be tempting. Prefer extracting a named function if the IIFE exceeds 5 lines.

type OrgNode = {
  readonly displayName: string | null
  readonly handle:      string | null
  readonly archived:    boolean
}

const formatNodeLabel = (node: OrgNode): string => (() => {
  const base   = node.displayName ?? node.handle ?? 'unnamed'
  const suffix = node.archived ? ' (archived)' : ''
  return `${base}${suffix}`
})()

/* BAD: let reassignment to build a conditional string.
const formatNodeLabel = (node: OrgNode): string => {
  let label = node.displayName ?? node.handle ?? 'unnamed'
  if (node.archived) label += ' (archived)'  // violates Rule 2.1 (let reassignment)
  return label
}
*/

// ─── Exports ──────────────────────────────────────────────────────────────────
export type { RenderConfig, OrgNode }
export {
  isActive, toName, toUpper, byName,
  activeNamesUppercased, activeSorted, activeSortedNames,
  getActiveNames, formatEmployee, formattedList,
  renderList, output, formatNodeLabel,
}
