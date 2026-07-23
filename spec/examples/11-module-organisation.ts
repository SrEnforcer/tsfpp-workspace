/**
 * Examples for §11 — Module Organisation (Rules 11.1–11.4)
 * See ../CODING_STANDARD.md §11
 *
 * This file illustrates structural conventions. Real examples would span multiple
 * files; the patterns are shown here as annotated single-file sketches.
 */

// ─── Rule 11.1 — One major type per file; collocate sum type with its constructors ─
//
// MUST: One major domain type per file; constructors in the same module as the type.
//
// Each of the sketches below represents what a dedicated file would contain.
// In a real codebase these would live at:
//   src/domain/org-node/OrgNode.ts
//   src/domain/user/User.ts
//   etc.

// ── Sketch: src/domain/org-node/OrgNode.ts ───────────────────────────────────

type Brand<T, B extends string> = T & { readonly __brand: B }
type NodeId = Brand<string, 'NodeId'>

type Option<A> =
  | { readonly _tag: 'Some'; readonly value: A }
  | { readonly _tag: 'None' }

const some = <A>(value: A): Option<A> => ({ _tag: 'Some', value })
const none: Option<never> = { _tag: 'None' }

/**
 * An OrgNode represents a single node in the organizational hierarchy.
 *
 * Variants:
 * - person  — a named individual with an optional title
 * - group   — a named collection of child nodes
 * - vacancy — a position that is currently unfilled
 */
type OrgNode =
  | { readonly kind: 'person';  readonly id: NodeId; readonly name: string; readonly title: Option<string> }
  | { readonly kind: 'group';   readonly id: NodeId; readonly name: string; readonly childIds: ReadonlyArray<NodeId> }
  | { readonly kind: 'vacancy'; readonly id: NodeId; readonly roleTitle: string }

// Constructors collocated with the type — Rule 11.1
const mkNodeId = (raw: string): Option<NodeId> => {
  if (raw.trim().length === 0) return none
  return some(raw.trim() as NodeId)
}

const mkPerson = (id: NodeId, name: string): OrgNode =>
  ({ kind: 'person', id, name, title: none })

const mkGroup = (id: NodeId, name: string): OrgNode =>
  ({ kind: 'group', id, name, childIds: [] })

const mkVacancy = (id: NodeId, roleTitle: string): OrgNode =>
  ({ kind: 'vacancy', id, roleTitle })

/* BAD: constructors scattered across different files from their type.
// src/domain/types.ts — type definition
// src/utils/helpers.ts — constructors buried with unrelated utilities
// This forces readers to navigate multiple files to understand a single abstraction.
*/

// ─── Rule 11.2 — Maximum file length: 400 lines; 800 absolute maximum ─────────
//
// MUST: Maximum file length is 400 lines; 800 lines absolute maximum with deviation.
//
// This file is kept well within limits intentionally.
// When a file approaches 400 lines, extract a focused sub-module:
//
//   BEFORE (one overloaded file):
//     src/parser/parser.ts           (~700 lines — approaching limit)
//
//   AFTER (decomposed):
//     src/parser/tokenizer.ts        (~120 lines — tokenization logic)
//     src/parser/combinators.ts      (~180 lines — parser combinators)
//     src/parser/grammar.ts          (~200 lines — grammar rules)
//     src/parser/index.ts            (~20 lines  — barrel re-export)
//
// The decomposition should follow natural cohesion boundaries, not arbitrary line counts.
// See Rule 11.3 for directory structure guidance.

// ─── Rule 11.3 — Organise by feature/domain, not by technical role ────────────
//
// MUST: Feature/domain-first directory structure.
//
// GOOD: domain-first — everything for a feature is co-located
//
//   src/
//     lexer/
//       tokenize.ts        ← lexer logic
//       tokens.ts          ← Token type + constructors
//       index.ts           ← barrel export
//     parser/
//       combinators.ts     ← generic combinators
//       grammar.ts         ← grammar rules specific to this language
//       parse.ts           ← top-level parse function
//       index.ts
//     resolver/
//       resolve.ts
//       validate.ts
//       index.ts
//     org-tree/
//       OrgNode.ts         ← type + constructors (Rule 11.1)
//       OrgTree.ts         ← tree operations
//       render.ts          ← rendering concerns
//       index.ts

/* BAD: role-first — related code scattered; unrelated code grouped.
//
//   src/
//     types/             ← ALL types together, regardless of domain
//       OrgNode.ts
//       Token.ts
//       ParseResult.ts
//     functions/         ← ALL functions together
//       tokenize.ts
//       render.ts
//       validate.ts
//     tests/             ← tests separated from source
//       tokenize.test.ts
//       render.test.ts
//
// A change to the lexer requires edits in types/, functions/, AND tests/.
// Co-location (feature-first) keeps a change within a single directory.
*/

// ─── Rule 11.4 — Barrel `index.ts` per package; no direct internal imports ────
//
// MUST: Re-export the public API from a barrel `index.ts` per package.
// Internal modules must not be imported directly by external consumers.
//
// GOOD: barrel export (src/org-tree/index.ts)

export type { OrgNode, NodeId, Option }
export { mkNodeId, mkPerson, mkGroup, mkVacancy, some, none }

// Consumers import from the barrel:
//   import { OrgNode, mkPerson } from '@tsfpp/prelude/org-tree'
//   import { OrgNode, mkPerson } from '../org-tree'   ← picks up index.ts

/* BAD: consumer imports an internal module directly.
//   import { mkPerson } from '../org-tree/OrgNode'  ← breaks if file is restructured
//   import { tokenize } from '../lexer/tokenize'    ← bypasses the barrel
//
// Direct internal imports create coupling to the file structure.
// Moving or splitting a file breaks all such imports.
// The barrel is the stable public surface; internal files are implementation details.
*/
