/**
 * Examples for §2 — Immutability (Rules 2.1–2.4)
 * See spec/CODING_STANDARD.md §2 and spec/rationale/immutability.md
 */

// ─── Rule 2.1 — `const` only; no `let` or `var` ──────────────────────────────
//
// MUST: Declare all bindings with `const`. `let` and `var` are forbidden.

// GOOD: accumulate without mutation — use reduce instead of a let accumulator
const numbers = [1, 2, 3, 4, 5] as const
const total = numbers.reduce((acc, x) => acc + x, 0)
const doubled = numbers.map(x => x * 2)

/* BAD: mutable accumulator — temporal coupling, cannot be aliased safely.
let total = 0
for (const x of numbers) total += x   // violates Rule 2.1 and Rule 4.2

var legacy = 'x'   // var is function-scoped and allows redeclaration
*/

// GOOD: conditional value via ternary, not reassignment
type Status = 'active' | 'archived'
const getLabel = (status: Status): string =>
  status === 'active' ? 'Active' : 'Archived'

/* BAD: reassignment disguised as "initialization"
let label: string
if (status === 'active') {
  label = 'Active'
} else {
  label = 'Archived'
}
*/

// ─── Rule 2.2 — All types must be `readonly` at every level ──────────────────
//
// MUST: All object and array types must be `readonly` at every level.

type AstAttr = {
  readonly key:   string
  readonly value: string
}

type AstNode = {
  readonly kind:     string
  readonly children: ReadonlyArray<AstNode>   // deep readonly — not AstNode[]
  readonly attrs:    ReadonlyArray<AstAttr>   // deep readonly — not AstAttr[]
}

// GOOD: function that accepts deep-readonly structure
const countChildren = (node: AstNode): number => node.children.length

/* BAD: shallow or absent readonly — nested arrays remain mutable.
type AstNode = {
  kind: string           // mutable
  children: AstNode[]    // mutable — push(), splice() all work
  attrs: AstAttr[]       // mutable
}
*/

// GOOD: ReadonlyArray in function signatures
const findByKind = (
  nodes: ReadonlyArray<AstNode>,
  kind:  string,
): ReadonlyArray<AstNode> =>
  nodes.filter(n => n.kind === kind)

/* BAD: mutable array type in signature — misleads callers about mutation risk.
const findByKind = (nodes: AstNode[], kind: string): AstNode[] =>
  nodes.filter(n => n.kind === kind)
*/

// ─── Rule 2.3 — No mutating array or object operations ───────────────────────
//
// MUST: Never use push, pop, splice, sort, reverse, fill, copyWithin, property
// assignment, or delete.

type TaggedItem = {
  readonly id:  string
  readonly tag: string
}

const items: ReadonlyArray<TaggedItem> = [
  { id: 'a', tag: 'draft' },
  { id: 'b', tag: 'published' },
]

// GOOD: non-mutating equivalents
const withNewItem = (
  xs:   ReadonlyArray<TaggedItem>,
  item: TaggedItem,
): ReadonlyArray<TaggedItem> => [...xs, item]

const withoutId = (
  xs: ReadonlyArray<TaggedItem>,
  id: string,
): ReadonlyArray<TaggedItem> => xs.filter(item => item.id !== id)

const sortedByTag = (xs: ReadonlyArray<TaggedItem>): ReadonlyArray<TaggedItem> =>
  xs.toSorted((a, b) => a.tag.localeCompare(b.tag))  // ES2023+ — returns new array

const updatedTag = (
  xs:     ReadonlyArray<TaggedItem>,
  id:     string,
  newTag: string,
): ReadonlyArray<TaggedItem> =>
  xs.map(item => item.id === id ? { ...item, tag: newTag } : item)

/* BAD: all of these mutate in place.
items.push({ id: 'c', tag: 'draft' })       // violates Rule 2.3
items.sort((a, b) => a.tag.localeCompare(b.tag))  // mutates original
items[0].tag = 'published'                  // property assignment
(items as TaggedItem[]).splice(0, 1)        // mutation + unsound cast
*/

// GOOD: updating a nested record — spread at each level
type Config = {
  readonly server: {
    readonly host: string
    readonly port: number
  }
  readonly debug: boolean
}

const withPort = (config: Config, port: number): Config => ({
  ...config,
  server: { ...config.server, port },
})

/* BAD: direct property assignment.
const withPort = (config: Config, port: number): Config => {
  config.server.port = port   // mutates the original object
  return config
}
*/

// ─── Rule 2.4 — Persistent structures for large collections ──────────────────
//
// SHOULD: Use persistent data structures or Immer for large collections where
// naive spread would be O(n).
//
// This example shows the Immer `produce` pattern — use only when profiling shows
// spread-copy overhead is measurable.

// import { produce } from 'immer'
//
// const addItem = (items: ReadonlyArray<TaggedItem>, item: TaggedItem) =>
//   produce(items, draft => {
//     draft.push(item)  // mutation inside produce is safe — original is unchanged
//   })
//
// For most domain objects (< 1000 items), prefer the spread form from Rule 2.3.
// Reach for Immer only after profiling confirms the overhead.

// ─── Exports ─────────────────────────────────────────────────────────────────
export type { AstAttr, AstNode, TaggedItem, Config, Status }
export { countChildren, findByKind, withNewItem, withoutId, sortedByTag, updatedTag, withPort, getLabel, items, numbers, total, doubled }
