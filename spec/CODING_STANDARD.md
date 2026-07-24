# CODING_STANDARD.md — Purely Functional TypeScript with Algebraic Data Types

This standard is mandatory for all code, comments, and documentation. English only.
Codename TSF++ (tsfpp)

**Version:** 1.3.0
**Date:** 2026-07-23
**Classification:** Normative — repository-wide
**Modelled after:** JSF++ AV Rules (Lockheed Martin), JPL Power of Ten (Holzmann)

---

## Changelog

### 1.3.0 — 2026-07-23
- **New Rule 7.8** — ADT-combinator naming convention: `Result` is the base ADT and its combinators are unsuffixed; a combinator specialised to another ADT MUST carry that ADT's full type name as a suffix (`mapOption`, `mapList`, `headNonEmpty`). Abbreviated (`mapO`) and single-letter (`getOrElseR`) suffixes are forbidden.
- **Rule 7.3 tightened** — `mk` is the canonical smart-constructor prefix. `create*` is no longer sanctioned; use `mk*`. `as*` / `fromX` remain permitted for their specific roles.
- **`@tsfpp/prelude` 2.0.0** and **`@tsfpp/boundary` 2.0.0** apply the two rules above (breaking renames). See each package CHANGELOG.

### 1.2.0 — 2026-07-23
- **New Rule 1.13** — Numeric hazards: `NaN`, `Infinity`, and coercion-based number parsing are forbidden in the core; constrained numerics are branded (`Int`, `Positive`, `NonNegative`) and finiteness is guarded at the boundary.
- **New Rule 1.14** — Prefer the `satisfies` operator over `as` for literal conformance; it proves a value inhabits a type without widening or coercing, closing the most common non-boundary reason to reach for an assertion.
- **New Rule 4.6** — No ambient nondeterminism in the pure core: `Date.now()`, `new Date()`, `Math.random()`, `crypto.randomUUID()`, `performance.now()`, and `process.env` are effects and must be injected, not called (extends the Reader discipline of Rule 6.5).
- **New Rule 6.7** — Domain error channels must be discriminated unions with a `kind` discriminant, never bare `string` or `Error`; this makes error handling exhaustive at every recovery site.
- **New Rule 8.5** — Consume `Option` / `Result` through a total eliminator (`matchOption` / `matchResult`) when both arms yield a value; reserve `isOk` / `isNone` guards for early-return control flow.
- **Prelude** — `@tsfpp/prelude` gains `matchOption`, `matchResult`, `getOrElseR`, `mapErr`, `findO`, the `NonEmptyReadonlyArray` family (`isNonEmptyArray`, `mkNonEmpty`, `headNE`, `lastNE`), and refined numerics (`Int`, `Positive`, `NonNegative`, `mkInt`, `mkPositive`, `mkNonNegative`, `isFiniteNumber`) in support of Rules 1.13, 6.7, and 8.5.
- **Appendix B** expanded with `no-restricted-globals` / `no-restricted-syntax` entries enforcing Rules 1.13 and 4.6.
- **Appendix E** updated with the new checklist items.

### 1.1.0 — 2026-05-15
- Removed all references to Ramda. The canonical companion is now `@tsfpp/prelude`; Remeda is noted as the recommended collection-plumbing library where the prelude is intentionally silent.
- **New Rule 1.12** — Discriminant convention: `_tag` for prelude ADTs, `kind` for domain ADTs.
- **New Rule 2.5** — `as const` for literal narrowing and configuration tables.
- **New Rule 6.6** — Concurrency discipline: prefer `Promise.allSettled` over `Promise.all` when partial failure is meaningful.
- **New Rule 8.4** — Parse, don't validate: convert `unknown` into typed domain values at the boundary, never propagate raw shapes inward.
- **New Rule 9.6** — Pre-commit hooks must enforce the lint and typecheck gates.
- **Bug fix** — Rule 1.3 example: `DEVIATION(1.3)` corrected to `DEVIATION(1.6)` (the rule against `as` is 1.6, not 1.3).
- **Bug fix** — Rule 1.6 `head` example: returned `A | undefined`, which conflicts with Rule 6.3. Replaced with `Option<A>`.
- **Bug fix** — Rule 4.4 example: used `input._tag === 'None'`, which violates Rule 1.11. Replaced with `isNone(input)`.
- **Bug fix** — Rule 4.3 example: replaced the `??` chain (implicit nullish handling) with an `Option`-driven alternative.
- **Clarification** — Rule 1.3 now shows the full ESLint disable line required by Appendix B's `consistent-type-assertions: 'never'` rule.
- **Clarification** — Section 11.4 now addresses tree-shaking implications of barrel files.
- **Appendix C** expanded with Parse-Don't-Validate, Effective TypeScript, ts-pattern, Remeda, and the in-house companion packages.
- **New Appendix D** — Recommended ecosystem map.
- **New Appendix E** — Code review quick-reference card.

### 1.0.2 — 2026-04-19
- Tag access discipline (Rule 1.11).
- Editor and Git normalisation rules (Rule 9.4, 9.5).

---

## Preamble

### Scope

This standard governs all TypeScript source code in the project files and any future packages within this repository. It applies to production code, test helpers, build scripts authored in TypeScript, and type declarations.

It does **not** apply to:
- Auto-generated code (parser output, bundler artefacts). These must be isolated behind a facade that does conform.
- Third-party type definitions (`@types/*`).
- Configuration files authored in JSON or JavaScript (e.g. `vite.config.ts`), although the spirit of immutability applies where feasible.

### What this standard is not

- It is not a style guide. Formatting is delegated to Prettier; this document concerns semantics.
- It is not an architecture document. It constrains *how* code is written, not *what* the system does.
- It is not a religious tract on functional programming. Every rule has a concrete failure mode it prevents.

### Philosophical axioms (non-negotiable)

1. **Referential transparency is the norm.** Effects are the exception and shall be reified (`Task`, `IO`, `Result`).
2. **Total functions where possible.** Partiality is typed (`Option`, `Either`, `Result`) and never concealed.
3. **Algebraic data types are the primary modelling language.** Sum types via discriminated unions; product types via readonly records; refinement via smart constructors and branded types.
4. **The compiler is the first proof; tests the second; documentation the third.**
5. **Proven idioms from ML-family languages prevail over TypeScript commonplaces.**

### Compliance levels

| Level    | Meaning |
|----------|---------|
| **MUST** | Mandatory. Violation requires an approved deviation record (see §Deviation Procedure). |
| **SHOULD** | Expected in all new code. May be relaxed only with a code-review comment citing rationale. |
| **MAY** | Recommended practice. Encouraged but not enforced by tooling. |

### Deviation procedure

Any deviation from a MUST rule requires:
1. An inline `// DEVIATION(N.M): <one-line justification>` comment, where `N.M` is the rule being deviated from.
2. Approval from at least one reviewer.
3. Entry in a `DEVIATIONS.md` ledger if the deviation is project-wide.

---

## 1 — Type System

### Rule 1.1 — MUST: Encode sum types as tagged discriminated unions with a literal discriminant

**Rationale.** A string-literal discriminant field enables exhaustive pattern matching, aligns with the ML `datatype` encoding, and guarantees that `switch` narrows correctly. The choice of field name is governed by Rule 1.12.

**Do**
```typescript
type Shape =
  | { readonly kind: 'circle'; readonly radius: number }
  | { readonly kind: 'rect'; readonly width: number; readonly height: number }
```

**Don't**
```typescript
type Shape = Circle | Rect  // no shared discriminant — switch cannot narrow
```

---

### Rule 1.2 — MUST: Assert exhaustiveness via `never` in the default branch of any match over a sum type

**Rationale.** Guarantees that adding a new variant to a union produces a compile-time error at every consumption site, preventing silent omissions. Corresponds to JSF++ AV Rule 192 (all switch branches handled).

**Do**
```typescript
import { absurd } from '@tsfpp/prelude'

const area = (s: Shape): number => {
  switch (s.kind) {
    case 'circle': return Math.PI * s.radius ** 2
    case 'rect':   return s.width * s.height
    default:       return absurd(s)
  }
}
```

**Don't**
```typescript
// default: return 0  — silently swallows future variants
```

---

### Rule 1.3 — MUST: Encode nominal distinctions via branded types; expose only smart constructors

**Rationale.** Brands prevent accidental interchange of semantically distinct strings (e.g. `NodeId` vs `DeptId`). Smart constructors are the sole gateway, ensuring invariants hold at construction time.

**Do**
```typescript
import type { Brand } from '@tsfpp/prelude'

type NodeId = Brand<string, 'NodeId'>

const mkNodeId = (raw: string): NodeId => {
  // validation here
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- DEVIATION(1.6): `as` permitted inside smart-constructor boundary after validation
  return raw as NodeId
}
```

**Don't**
```typescript
const id: NodeId = someString as NodeId  // unguarded cast outside constructor
```

**Exception.** `as` is permitted *exclusively* within a smart constructor body that has validated the input. Document the invariant and the deviation.

---

### Rule 1.4 — MUST: Prefer `type` aliases over `interface`; reserve `interface` solely for structural extension with documented justification

**Rationale.** `type` supports unions, intersections, mapped types, and conditional types uniformly. `interface` encourages declaration merging (ambient pollution) and inheritance hierarchies. In a purely functional codebase, declaration merging is a liability, not an asset.

**Do**
```typescript
type User = {
  readonly id: NodeId
  readonly name: string
}
```

**Don't**
```typescript
interface User {  // declaration merging possible — uncontrolled extension
  id: NodeId
  name: string
}
```

**Exception.** `interface` MAY be used at library boundaries to allow consumer augmentation (e.g. third-party plugin types), documented with `// DEVIATION(1.4)`.

---

### Rule 1.5 — MUST: Never use `any`; restrict `unknown` to system boundaries with immediate narrowing

**Rationale.** `any` defeats the type system entirely (JPL-10 Rule 1: restrict to verifiable constructs). `unknown` is permitted only at I/O edges and must be narrowed within the same scope.

**Do**
```typescript
const parseJson = (raw: unknown): Result<Config, string> => {
  if (!isRecord(raw)) return err('Expected object')
  // ... narrow fields
}
```

**Don't**
```typescript
const parseJson = (raw: any): Config => raw as Config
```

---

### Rule 1.6 — MUST: Never use non-null assertion `!`; never use type assertion `as` outside smart constructors

**Rationale.** `!` is a proof obligation the compiler cannot verify — it is a silent `unsafeCoerce`. `as` casts bypass narrowing. Both are equivalent to `trustMeCompiler()` and violate "compiler as first proof."

**Do**
```typescript
import { type Option, some, none } from '@tsfpp/prelude'

const head = <A>(xs: ReadonlyArray<A>): Option<A> =>
  xs.length > 0 ? some(xs[0] as A) : none
  // The `as A` is required because `noUncheckedIndexedAccess` returns `A | undefined`,
  // but is safe under the length guard. The same pattern is acceptable inside a
  // smart-constructor-like total function, with an ESLint disable comment when
  // the project's `consistent-type-assertions` rule is set to `never`.
```

**Don't**
```typescript
const head = <A>(xs: ReadonlyArray<A>): A => xs[0]!
// `!` hides the fact that an empty array breaks the contract at runtime.
```

---

### Rule 1.7 — SHOULD: Limit use of conditional types, mapped types, and template literal types to utility libraries; keep domain types simple

**Rationale.** Complex type-level programming reduces readability and produces impenetrable compiler errors. Domain types should be legible to a reviewer who knows ML but not TypeScript metaprogramming.

---

### Rule 1.8 — MUST: Never use `enum`; use string literal unions or const objects

**Rationale.** `enum` generates runtime code, permits numeric reverse mapping (a source of bugs), and is not a union in the type-algebraic sense.

**Do**
```typescript
type Direction = 'north' | 'south' | 'east' | 'west'

// Or, when a value-level table is needed:
const Direction = {
  North: 'north',
  South: 'south',
  East: 'east',
  West: 'west',
} as const
type Direction = (typeof Direction)[keyof typeof Direction]
```

**Don't**
```typescript
enum Direction { North, South, East, West }
```

---

### Rule 1.9 — MUST: Never use `class`, `this`, `new`, `instanceof`, or prototype-based inheritance

**Rationale.** Classes introduce mutable state, identity semantics, and implicit `this` binding — all antithetical to referential transparency. `instanceof` is a nominal runtime check that subverts structural typing.

**Do**
```typescript
type Logger = { readonly log: (msg: string) => void }
const mkLogger = (prefix: string): Logger => ({
  log: (msg) => console.log(`[${prefix}] ${msg}`)
})
```

**Don't**
```typescript
class Logger {
  constructor(private prefix: string) {}
  log(msg: string) { console.log(`[${this.prefix}] ${msg}`) }
}
```

**Exception.** Wrapping third-party APIs that require `new` (e.g. `new URL(...)`) is permitted at the adapter boundary, isolated behind a pure facade.

---

### Rule 1.10 — MUST: Use type-guard predicates at narrowing sites; reserve composed negation (`complement`) for predicate-as-value positions

**Rationale.** TypeScript's type-guard narrowing (`x is T`) is the compiler's contribution to the "first proof" axiom. Wrapping a guard through `complement` (or any general boolean-inverting combinator) erases the narrowing, because the type system cannot express a "not T" type predicate. Therefore: keep guards intact where narrowing matters; compose freely where the predicate is consumed only as a `boolean`-valued function.

**Do**
```typescript
// Narrowing site — direct guard preserves `value is ReadonlyArray`
const handle = (value: unknown): Result<Items, string> => {
  if (!isArray(value)) return err('expected array')
  // value: ReadonlyArray<unknown> here
  return ok(toItems(value))
}

// Predicate-as-value — narrowing irrelevant, composition wins
const isNotArray = complement(isArray)
const scalars = mixed.filter(isNotArray)
```

**Don't**
```typescript
// Wrapping a guard at a narrowing site loses `value is T`
if (complement(isArray)(value)) {
  // value still: unknown
}
```

**Guidance for the prelude.** Export a curated set of type-guard predicates (`isArray`, `isString`, `isNumber`, `isRecord`, `isNonEmpty`, etc.). Do **not** export their negations (`isNotArray`, `isNotString`, …); negations are produced ad hoc with `complement` at the call site, where the type-guard signature is no longer in play.

---

### Rule 1.11 — MUST: Access discriminants of prelude ADTs (`Result`, `Option`, `Either`) exclusively through exported type-guard predicates; direct `_tag` comparison outside the prelude is forbidden

**Rationale.** The discriminant field of a prelude ADT (`_tag` per Rule 1.12) is an implementation detail of the prelude, not part of its public contract. Allowing consumers to write `result._tag === 'Ok'` couples every call site to a name choice the prelude must remain free to change, and it bypasses the smart-constructor discipline (Rule 1.3) that governs every other ADT boundary.

The exported guards (`isOk`, `isErr`, `isSome`, `isNone`, `isLeft`, `isRight`) are the canonical interface. They narrow with full type-guard semantics (`r is Ok<T>`), so consumer code loses nothing by going through them.

**Do**
```typescript
import { isOk, isSome } from '@tsfpp/prelude'

if (isOk(result)) {
  // result: Ok — discriminant name nowhere in sight
  return result.value
}

const successes = results.filter(isOk)
```

**Don't**
```typescript
// Leaks the discriminant name into consumer code
if (result._tag === 'Ok') { ... }

// Equally forbidden — same coupling, different syntax
const ok = result['_tag'] === 'Ok'
```

**Guidance for binary ADTs.** For two-variant ADTs (`Result`, `Option`, `Either`), export both guards (`isOk` and `isErr`, `isSome` and `isNone`, `isLeft` and `isRight`). Each is the type-narrowing complement of the other; `complement(isOk)` is never required and must not be used in place of `isErr`.

**Guidance for n-ary unions.** Export one guard per variant. Consumers compose them; the prelude does not pre-export combinations.

**Exception.** The prelude's own implementation files MAY access `_tag` directly — that is the boundary inside which the discriminant is defined. Document the boundary at the module level; everything outside the prelude is bound by this rule without exception.

---

### Rule 1.12 — MUST: Use `_tag` as the discriminant for prelude/library ADTs; use `kind` as the discriminant for domain ADTs

**Rationale.** Two conventions, deliberately distinct, serve two different audiences. The prelude's `_tag` follows the established ML / fp-ts lineage and signals "this is an algebraic library primitive." Domain ADTs use `kind` because it reads naturally in business logic (`order.kind === 'pending'`) and visually separates library code from product code. Mixing the conventions in a single codebase blurs that boundary and produces noisy diffs when a library type is later replaced by a domain type or vice versa.

**Do** — prelude/library code:
```typescript
type Result<A, E> =
  | { readonly _tag: 'Ok'; readonly value: A }
  | { readonly _tag: 'Err'; readonly error: E }
```

**Do** — domain code:
```typescript
type OrderStatus =
  | { readonly kind: 'draft' }
  | { readonly kind: 'submitted'; readonly submittedAt: Date }
  | { readonly kind: 'fulfilled'; readonly fulfilledAt: Date }
```

**Don't**
```typescript
// Domain type using `_tag` — looks like a library primitive, isn't one
type OrderStatus = { readonly _tag: 'Draft' } | { readonly _tag: 'Submitted' }

// Library type using `kind` — breaks the discrimination guard exports
type Result<A, E> = { readonly kind: 'ok'; ... } | { readonly kind: 'err'; ... }
```

**Casing.** Library ADT tags are PascalCase (`'Ok'`, `'Some'`); domain ADT kinds are kebab- or snake-case lower (`'draft'`, `'submitted'`, `'in_progress'`). Domain kinds map to wire formats more often than library tags do, and lowercase plays well with JSON.

---

### Rule 1.13 — MUST: Forbid numeric hazards; brand constrained numerics and guard finiteness at the boundary

**Rationale.** `number` is not the set of numbers. It contains `NaN`, `Infinity`, and `-Infinity`, and none of them obeys the laws the rest of the code assumes: `NaN !== NaN` breaks reflexivity of equality, `NaN` poisons every arithmetic expression it touches, and comparisons against `±Infinity` silently pass guards that were written for real magnitudes. A `NaN` is precisely an illegal state that the type `number` fails to exclude (axiom 1), and it enters through coercion: `Number('abc')`, `parseInt(undefined)`, `+someString`, and `JSON.parse` of a malformed field all yield `NaN` with no signal. This mirrors JPL-10's prohibition on relying on unconstrained numeric behaviour and MISRA C's rules on the use of floating-point.

Two obligations follow. First, coercion-based parsing (`Number(x)`, `parseInt`, `parseFloat`, unary `+`) is forbidden in the core; convert at the boundary through a smart constructor that guards with `Number.isFinite` / `Number.isInteger` and returns `Option` or `Result`. Second, where a numeric domain has an invariant (a count is a non-negative integer, a price is positive), encode it as a branded refinement rather than a bare `number`.

**Do**
```typescript
import { type Option, mkPositive, mkInt, type Positive } from '@tsfpp/prelude'

// Constrained domain quantity — the brand carries the invariant
const parsePrice = (raw: string): Option<Positive> =>
  mkPositive(Number.parseFloat(raw)) // parse confined to the boundary; NaN → None

const applyDiscount = (price: Positive, pct: number): number =>
  price * (1 - pct)   // no NaN guard needed here — the type already excludes it
```

**Don't**
```typescript
const price = Number(raw)          // NaN on bad input, propagated as a valid `number`
const total = price * quantity     // NaN silently poisons every downstream sum
if (price > 0) { ... }             // NaN > 0 is false — the guard passes the wrong way for -0, misses NaN entirely
```

**Guards.** Use `Number.isNaN` and `Number.isFinite`, never the global `isNaN` / `isFinite`, which coerce their argument (`isNaN('x')` is `true` for reasons unrelated to the number). The prelude exposes `isFiniteNumber` for the common case.

**Exception.** Coercion is permitted *inside* a smart constructor whose body immediately guards the result, documented with `// DEVIATION(1.13)` where the coercion is not self-evidently a boundary parse.

---

### Rule 1.14 — SHOULD: Prefer the `satisfies` operator over `as` for literal conformance

**Rationale.** A large share of `as` casts outside smart constructors are not coercions at all — they are a programmer asserting "this literal matches that type." `as` is the wrong tool for that intent: it *widens or narrows by assertion*, silently accepting a value that does **not** conform and discarding the precise inferred type. `satisfies` expresses the same intent soundly: it checks the value against the type, fails to compile if it does not conform, and preserves the narrow literal type for downstream inference. It is the sanctioned answer to most reasons a reviewer sees `as` reached for, and it never appears in the forbidden-constructs table because it cannot lie.

**Do**
```typescript
const routes = {
  home: '/',
  profile: '/u/:id',
} satisfies Record<string, `/${string}`>

// `routes.home` keeps the literal type '/', not the widened `string`
```

**Don't**
```typescript
const routes = {
  home: '/',
  profile: '/u/:id',
} as Record<string, `/${string}`>
// Asserts conformance without checking it; also widens each value to the template type,
// losing the literal that made the table useful.
```

**Note.** `satisfies` does not replace smart constructors. It proves a *statically known literal* conforms to a type; it does nothing for `unknown` runtime input, which still requires parsing (Rule 8.4). Where both apply, parse first, then let inference carry the typed value.

---

## 2 — Immutability

### Rule 2.1 — MUST: Declare all bindings with `const`; `let` and `var` are forbidden

**Rationale.** `const` prevents rebinding. Combined with readonly types, it eliminates temporal coupling between statements.

**Do**
```typescript
const xs = [1, 2, 3] as const
const y = xs[0]
```

**Don't**
```typescript
let total = 0
for (const x of xs) total += x
```

---

### Rule 2.2 — MUST: All object and array types must be `readonly` at every level

**Rationale.** Shallow `Readonly<T>` is insufficient if nested properties are mutable. Deep immutability prevents accidental mutation through aliasing.

**Do**
```typescript
type AstNode = {
  readonly kind: AstNodeKind
  readonly children: ReadonlyArray<AstNode>
  readonly attrs: ReadonlyArray<AstAttr>
}
```

**Don't**
```typescript
type AstNode = {
  kind: AstNodeKind
  children: AstNode[]      // mutable array
  attrs: AstAttr[]
}
```

---

### Rule 2.3 — MUST: Never use mutating array methods (`push`, `pop`, `splice`, `sort`, `reverse`, `fill`, `copyWithin`) or mutating object operations (property assignment, `delete`)

**Rationale.** Mutation invalidates referential transparency. Use spread, `Array.prototype.toSorted()`, `Array.prototype.toReversed()`, or the immutable combinators in `@tsfpp/prelude` / Remeda.

**Do**
```typescript
const sorted = xs.toSorted(compareFn)        // ES2023+, available in Node ≥ 20
const appended = [...xs, newItem]
const updated = { ...record, field: newValue }
```

**Don't**
```typescript
xs.push(newItem)
xs.sort(compareFn)
record.field = newValue
```

---

### Rule 2.4 — SHOULD: Use persistent data structures or structural sharing for large collections where performance requires it

**Rationale.** Naive immutable copies of large arrays are O(n). For prepend-heavy or recursive workloads, the prelude's `List` ADT provides O(1) cons / O(n) reverse. For map-like structures under heavy update, consider Immer or hand-rolled persistent trees.

---

### Rule 2.5 — MUST: Use `as const` to narrow literal values and freeze configuration tables

**Rationale.** Without `as const`, object literals widen to mutable, weakly-typed shapes (`{ x: number }` rather than `{ readonly x: 3 }`). The wider type then propagates into unions, defeating both inference and exhaustiveness.

**Do**
```typescript
const httpMethods = ['GET', 'POST', 'PUT', 'DELETE'] as const
type HttpMethod = (typeof httpMethods)[number]  // 'GET' | 'POST' | 'PUT' | 'DELETE'

const config = {
  timeout: 30_000,
  retries: 3,
} as const
```

**Don't**
```typescript
const httpMethods = ['GET', 'POST', 'PUT', 'DELETE']  // string[] — loses literal info
const config = { timeout: 30_000, retries: 3 }        // mutable, widened to number
```

---

## 3 — Functions

### Rule 3.1 — MUST: Every exported function must have an explicit return type annotation

**Rationale.** Return types are the public contract. Inference across module boundaries is fragile and makes API diffs noisy.

**Do**
```typescript
export const tokenize = (input: string): ReadonlyArray<Token> => { ... }
```

**Don't**
```typescript
export const tokenize = (input: string) => { ... }  // inferred return leaks implementation
```

---

### Rule 3.2 — MUST: Limit function arity to 3 positional parameters; use a readonly record for ≥ 3

**Rationale.** High arity produces call-site ambiguity (was `true` the third or fourth argument?). Named fields via records are self-documenting.

**Do**
```typescript
type RenderOpts = {
  readonly tree: OrgTree
  readonly config: RenderConfig
  readonly theme: Theme
}
const renderSvg = (opts: RenderOpts): string => { ... }
```

**Don't**
```typescript
const renderSvg = (tree: OrgTree, config: RenderConfig, theme: Theme, debug: boolean): string => { ... }
```

---

### Rule 3.3 — MUST: Separate pure and effectful functions by signature; effectful functions must return a typed effect container

**Rationale.** A function that returns `Promise<T>` or `Task<T>` is marked as effectful in its type. A function that returns `T` directly must be pure. This is the Haskell `IO`/pure separation, expressed via TypeScript's type system.

**Do**
```typescript
// Pure
const area = (r: number): number => Math.PI * r ** 2

// Effectful — Promise signals I/O, Result keeps failure in the success channel
const fetchUser = (id: string): Promise<Result<User, ApiError>> => { ... }
```

**Don't**
```typescript
// Impure function disguised as pure
const getUser = (id: string): User => {
  const data = readFileSync(`/users/${id}.json`, 'utf8')  // hidden I/O
  return JSON.parse(data)
}
```

---

### Rule 3.4 — MUST: Limit function body to 40 lines (excluding type annotations and JSDoc); limit cyclomatic complexity to 10; limit nesting depth to 4

**Rationale.** Aligns with JPL-10 Rule 4 (limit function length) and JSF++ AV Rule 1 (bounded complexity). Deep nesting indicates missing decomposition.

---

### Rule 3.5 — MUST: All recursion must be provably terminating; prefer tail-recursive form or trampolining for unbounded input

**Rationale.** JPL-10 Rule 2: no unbounded recursion. TypeScript does not optimise tail calls, so deep recursive chains must use trampolines.

**Do**
```typescript
type Trampoline<A> =
  | { readonly done: true; readonly value: A }
  | { readonly done: false; readonly thunk: () => Trampoline<A> }

const run = <A>(t: Trampoline<A>): A => {
  // DEVIATION(2.1): Trampoline drive loop — local `let` confined to this function,
  // bounded by the trampoline's termination, no observable mutation outside.
  let current = t
  while (!current.done) current = current.thunk()
  return current.value
}
```

**Exception.** Simple recursion on known-bounded structures (e.g. tree depth ≤ 100) is acceptable with a documented bound.

---

### Rule 3.6 — SHOULD: Prefer arrow function expressions over `function` declarations

**Rationale.** Arrow functions have no `this` binding, preventing accidental capture. `function` declarations are permitted only at module top-level when hoisting is required (rare) or when overload signatures are needed (the prelude's `pipe` is one example).

---

### Rule 3.7 — MUST: Never use optional parameters (`?`); use explicit `Option<T>` or a defaults record

**Rationale.** Optional parameters conflate "absent" and "present-but-undefined." `Option<T>` forces the caller to make intent explicit.

**Do**
```typescript
import { type Option } from '@tsfpp/prelude'

const findNode = (tree: OrgTree, id: NodeId, maxDepth: Option<number>): Option<OrgNode> => { ... }
```

**Don't**
```typescript
const findNode = (tree: OrgTree, id: NodeId, maxDepth?: number): OrgNode | undefined => { ... }
```

**Exception.** Optional parameters are permitted in configuration records at API boundaries (e.g. CLI options) where `exactOptionalPropertyTypes` in tsconfig guards correctness.

---

## 4 — Control Flow

### Rule 4.1 — MUST: Use `switch` with exhaustiveness for sum-type dispatch; forbid `default` in exhaustive matches

**Rationale.** `default` silently handles future variants, defeating the purpose of ADTs. The `never` assertion in Rule 1.2 serves as the catch-all.

**Note on alternatives.** `ts-pattern` (see Appendix C) offers an expression-position pattern match with the same exhaustiveness guarantee. It is permitted as a substitute for `switch` where the matched shape is non-trivial. The `never` discipline still applies via `.exhaustive()`.

---

### Rule 4.2 — MUST: Forbid `for`, `while`, `do..while` loops; use `map`, `reduce`, `filter`, `flatMap`, or the combinators in `@tsfpp/prelude` / Remeda

**Rationale.** Imperative loops require mutable accumulators (`let`), defeating Rule 2.1. Higher-order functions express intent declaratively.

**Do**
```typescript
const total = xs.reduce((acc, x) => acc + x, 0)
const names = nodes.map(n => n.displayName)
```

**Don't**
```typescript
let total = 0
for (const x of xs) total += x
```

**Exception.** Performance-critical inner loops in layout or numeric kernels MAY use `for` with `// DEVIATION(4.2): hot path, profiled` and must confine mutation to local scope. The trampoline drive loop in Rule 3.5 is the canonical example.

---

### Rule 4.3 — SHOULD: Prefer ternary expressions for simple conditional returns; use `if`/`else` blocks with guard clauses for complex branching

**Rationale.** Ternary is an expression (referentially transparent); `if` is a statement. But nested ternaries reduce readability.

**Do**
```typescript
import { isSome, type Option } from '@tsfpp/prelude'

const label = (name: Option<string>, handle: Option<string>): string =>
  isSome(name) ? name.value : isSome(handle) ? handle.value : 'unnamed'

const sign = x > 0 ? 'positive' : x < 0 ? 'negative' : 'zero' // max 1 nesting level
```

**Don't**
```typescript
const label = a ? (b ? (c ? x : y) : z) : w  // deeply nested ternary
```

**Note.** `??` is permitted only inside the smart-constructor boundary where lifting `null | undefined` into `Option` is the explicit purpose (`fromNullable`). Outside that boundary, propagating `??` reintroduces the very partiality `Option` was built to eliminate.

---

### Rule 4.4 — MUST: Use early return (guard clauses) to reduce nesting; maximum nesting depth is 4

**Rationale.** Deep nesting hides logic in indentation. Guard clauses make the "golden path" visually dominant.

**Do**
```typescript
import { isNone, type Option, ok, err, type Result } from '@tsfpp/prelude'

const process = (input: Option<string>): Result<Output, Err> => {
  if (isNone(input)) return err('missing input')
  const trimmed = input.value.trim()
  if (trimmed.length === 0) return err('empty input')
  return ok(transform(trimmed))
}
```

---

### Rule 4.5 — MUST: Never use truthiness checks on non-boolean values; use explicit comparisons

**Rationale.** `if (str)` is false for `""` which may be a valid value. Implicit coercion violates type discipline.

**Do**
```typescript
if (str.length > 0) { ... }
if (value !== undefined) { ... }
```

**Don't**
```typescript
if (str) { ... }
if (value) { ... }  // 0, '', NaN are falsy but may be valid
```

---

### Rule 4.6 — MUST: No ambient nondeterminism in the pure core; the clock, randomness, and the environment are effects and must be injected

**Rationale.** Referential transparency (axiom 4) says a function's output depends only on its inputs. `Date.now()`, `new Date()`, `Math.random()`, `crypto.randomUUID()`, `performance.now()`, and `process.env.X` each read hidden ambient state, so a function that calls them returns a different value on the second call with the same arguments — its signature lies about what it depends on. These are the constructs that turn into Heisenbugs, unreproducible test failures, and "works on my machine": the defect class axiom 4 exists to eliminate. They are not forbidden — every real program needs the clock and a source of entropy — but they are *effects*, and an effect belongs at the boundary, threaded in as a value, never called from the middle of pure logic.

The mechanism is the Reader-style `Deps` record already established by Rule 6.5: the core receives `now: () => Date` and `randomUuid: () => string` as fields and calls them through the parameter, so a test injects a fixed clock and a seeded generator with no mocking framework.

**Do**
```typescript
type Clock = { readonly now: () => Date; readonly randomUuid: () => string }

const mkOrderId = (deps: Clock) => (customer: CustomerId): OrderId =>
  asOrderId(`${customer}-${deps.now().getTime()}-${deps.randomUuid()}`)

// Production wires the real effects at the boundary:
const clock: Clock = { now: () => new Date(), randomUuid: () => crypto.randomUUID() }
// Tests wire deterministic ones:
const frozen: Clock = { now: () => new Date(0), randomUuid: () => 'test-uuid' }
```

**Don't**
```typescript
const mkOrderId = (customer: CustomerId): OrderId =>
  asOrderId(`${customer}-${Date.now()}-${crypto.randomUUID()}`)
// Same inputs, different output every call. Untestable without freezing global time.
```

**Enforcement.** Appendix B forbids these globals in source via `no-restricted-globals` / `no-restricted-syntax`. The wiring site — the single adapter module that constructs the real `Deps` — carries a `// DEVIATION(4.6)` and is the only place the raw constructors appear.

**Exception.** The composition root (`main.ts`, the server bootstrap, a CLI entry) is a boundary and MAY read the clock, entropy, and `process.env` directly to build the `Deps` it injects. Config loading is governed additionally by `CONFIG_CODING_STANDARD.md`.

---

## 5 — Composition and Call Sites

### Rule 5.1 — MUST: Use `pipe` (left-to-right) for multi-step transformations; limit pipeline depth to 8 stages

**Rationale.** `pipe` mirrors data flow direction, aiding readability. Excessively long pipelines should be decomposed into named intermediate functions.

**Do**
```typescript
import { pipe } from '@tsfpp/prelude'
import { filter, map, sortBy } from 'remeda'

const summaries = pipe(
  employees,
  filter(isActive),
  map(toSummary),
  sortBy(s => s.startedAt),
)
```

**Note.** `flow` is the deferred sibling of `pipe`: `flow(f, g, h)` returns a reusable pipeline function, where `pipe(x, f, g, h)` applies one immediately. Use `flow` to name and share a pipeline; use `pipe` when you have the initial value at hand.

---

### Rule 5.2 — SHOULD: Limit point-free style to pipelines of well-named combinators; prefer explicit lambdas when the reader needs to see the data shape

**Rationale.** Point-free style aids composition but hinders debugging and type inference when anonymous.

**Do**
```typescript
const activeNames = pipe(
  employees,
  filter(isActive),
  map(e => e.name),
)
```

**Don't**
```typescript
// Reader cannot reconstruct the data shape
const f = flow(filter(flip(prop)('active')), map(flow(prop('name'), toUpper, trim)))
```

---

### Rule 5.3 — MUST: Use records (named fields) at call sites when arity ≥ 3 (see Rule 3.2)

---

### Rule 5.4 — MAY: Use IIFE for scoping local bindings in expression position

**Rationale.** An IIFE `(() => { ... })()` can introduce local `const` bindings where a `let` would otherwise be tempting. Prefer extracting a named function if the IIFE exceeds 5 lines.

---

## 6 — Effect Management

### Rule 6.1 — MUST: Model errors as data, never as exceptions

**Rationale.** Exceptions are invisible in the type signature, bypassing the caller's ability to handle them at compile time. Typed `Result<T, E>` makes failure explicit.

**Do**
```typescript
type ParseResult<T> =
  | { readonly kind: 'parse_ok'; readonly value: T; readonly rest: ReadonlyArray<Token> }
  | { readonly kind: 'parse_err'; readonly error: string; readonly line: number; readonly col: number }
```

**Don't**
```typescript
const parse = (input: string): AST => {
  if (invalid) throw new SyntaxError('bad input')  // invisible in type
  return ast
}
```

---

### Rule 6.2 — MUST: Confine `throw` to adapter boundaries; wrap in a typed Result before crossing into the pure core

**Rationale.** Third-party libraries may throw. The adapter layer catches and converts to `Result`. The pure core never sees exceptions. The prelude's `tryCatch` and `tryCatchAsync` are the canonical wrappers.

**Do**
```typescript
import { tryCatch, type Result, err } from '@tsfpp/prelude'
import { readFileSync } from 'node:fs'

type IOError = { readonly kind: 'io_error'; readonly message: string }

const readFileSafe = (path: string): Result<string, IOError> =>
  tryCatch(
    () => readFileSync(path, 'utf8'),
    (e): IOError => ({ kind: 'io_error', message: String(e) }),
  )
```

---

### Rule 6.3 — MUST: Use `Result<T, E>` or `Either<E, A>` for operations that can fail; use `Option<A>` for values that may be absent

**Rationale.** `undefined | T` lacks a discriminant and mixes truthiness concerns. `Option` with `_tag: 'Some' | 'None'` integrates with pattern matching.

**When to use which.**

| Channel | Use case | Prelude type |
|---|---|---|
| Present / absent | Lookup miss, optional field, parse no-input | `Option<A>` |
| Success / failure with error data | Validation failure, I/O error, business rule violation | `Result<A, E>` |
| Success / failure where the failure carries semantics outside "this didn't work" | Branching computations, parser combinators | `Either<L, R>` |

---

### Rule 6.4 — SHOULD: Use `Promise<Result<T, E>>` for async effectful operations; avoid bare `Promise<T>` that hides failure in rejection

**Rationale.** `Promise.reject` is an untyped exception channel. Wrapping in `Result` keeps errors in the success channel where they are visible.

**Do**
```typescript
const fetchUser = (id: UserId): Promise<Result<User, ApiError>> => { ... }

// Caller knows the error shape and handles it explicitly:
const r = await fetchUser(id)
if (isErr(r)) return handle(r.error)
return r.value
```

---

### Rule 6.5 — SHOULD: Isolate I/O at the boundary; inject dependencies via function parameters or a reader-style pattern

**Rationale.** Dependency injection via function arguments (poor man's Reader monad) keeps the core testable without mocking frameworks.

**Do**
```typescript
type Deps = {
  readonly readFile: (path: string) => Promise<Result<string, IOError>>
  readonly now: () => Date
}
const compile = (deps: Deps) => (source: string): Promise<Result<Svg, CompileError>> => { ... }
```

---

### Rule 6.6 — SHOULD: Prefer `Promise.allSettled` over `Promise.all` when partial failure is meaningful; use `Promise.all` only when "all or nothing" is the correct semantics

**Rationale.** `Promise.all` short-circuits on the first rejection, discarding the in-flight work of the siblings. When the caller wants to know *which* of N parallel operations failed (typical for bulk imports, fan-out reads, dashboard widget loading), `allSettled` is the correct primitive — and it never rejects, which keeps the type honest.

**Do**
```typescript
const results = await Promise.allSettled(
  ids.map(id => fetchUser(id)),
)

// Each entry is { status: 'fulfilled', value } | { status: 'rejected', reason }.
// Combine with Result-returning calls: results are now Result<User, ApiError>
// wrapped in PromiseSettledResult — flatten with a small adapter.
```

**Don't**
```typescript
// Loses N-1 results on the first failure; the caller cannot report partial success
const users = await Promise.all(ids.map(fetchUser))
```

**Note.** When all sub-calls already return `Promise<Result<A, E>>` (Rule 6.4), `Promise.all` is acceptable — there are no rejections to swallow. Use `Promise.allSettled` when the sub-calls can reject (third-party SDK calls, raw `fetch`, etc.).

---

### Rule 6.7 — MUST: Domain error channels must be discriminated unions with a `kind` discriminant, never bare `string` or `Error`

**Rationale.** Rule 6.1 moves failure into the type; this rule makes that failure *exhaustively handleable*. A `Result<T, string>` tells the caller only *that* it failed, in prose. The caller cannot branch on the failure without string-matching — a fragile, untyped switch the compiler cannot check — and adding a new failure mode changes no type, so no recovery site lights up. That is exactly the "we added a case and forgot to handle it" defect that axiom 5 (exhaustiveness) exists to prevent, reintroduced through the error channel. Encoding `E` as a discriminated union (per Rule 1.1, with a `kind` discriminant per Rule 1.12) restores it: recovery sites `switch` on `error.kind` with an `absurd` default, and a new error variant becomes a compile error at every place that must now consider it.

**Do**
```typescript
type OrderError =
  | { readonly kind: 'out_of_stock'; readonly sku: Sku }
  | { readonly kind: 'payment_declined'; readonly code: DeclineCode }
  | { readonly kind: 'address_invalid'; readonly field: string }

const placeOrder = (cart: Cart): Result<Confirmation, OrderError> => { ... }

// Recovery is exhaustive and type-checked:
const explain = (e: OrderError): string => {
  switch (e.kind) {
    case 'out_of_stock':     return `${e.sku} is unavailable`
    case 'payment_declined': return `payment failed: ${e.code}`
    case 'address_invalid':  return `check ${e.field}`
    default:                 return absurd(e)
  }
}
```

**Don't**
```typescript
const placeOrder = (cart: Cart): Result<Confirmation, string> => { ... }
// Caller can only display the string or re-parse it. No exhaustiveness, no recovery
// logic the compiler can verify, and a new failure mode is invisible to every caller.

const placeOrder = (cart: Cart): Result<Confirmation, Error> => { ... }
// `Error` is a nominal class (Rule 1.9) whose `message` is unstructured prose;
// `instanceof` subclass checks to distinguish causes are the anti-pattern this rule closes.
```

**Remapping at boundaries.** A raw failure from a third party (a Zod message, a caught `unknown`, an HTTP status) is remapped into the domain union as it crosses inward, using the prelude's `mapErr`. The stringly-typed error lives only in the adapter, never in a domain signature.

```typescript
import { mapErr } from '@tsfpp/prelude'

const parseBody = (raw: unknown): Result<Order, OrderError> =>
  pipe(parseWithZod(raw), mapErr((msg): OrderError => ({ kind: 'address_invalid', field: msg })))
```

**Exception.** `Result<T, string>` is tolerable in throwaway scripts and at the outermost validation edge *before* the remap, with a `// DEVIATION(6.7)` where it appears in a signature that outlives the boundary.

---

## 7 — Naming

### Rule 7.1 — MUST: Types and type aliases in PascalCase

```typescript
type ParseResult<T> = ...
type NodeId = ...
```

---

### Rule 7.2 — MUST: Functions, constants, and variables in camelCase

```typescript
const tokenize = ...
const maxRetries = 3
```

---

### Rule 7.3 — MUST: Smart constructors prefixed with `mk` or `as` or named `fromX`

**Rationale.** Signals construction with potential validation, distinguishing constructors from ordinary functions.

`mk` is the canonical construction prefix and MUST be used for value and error constructors alike (`mkNodeId`, `mkProblem`, `mkNotFoundError`, `mkHandler`). `as` is reserved for total coercions between representationally-identical types (`asHandle`), and `fromX` for conversions that name their source (`fromString`, `fromNullable`). Other construction prefixes — in particular `create*` — are **not** permitted; a factory that returns a handler or adapter is still a constructor and uses `mk`.

```typescript
const mkNodeId = (raw: string): NodeId => ...
const asHandle = (raw: string): Handle => ...
const fromString = (raw: string): Option<Direction> => ...
```

**Don't**
```typescript
const createHandler = (deps: Deps): Handler => ...  // use mkHandler
const notFoundError = (id: string): ApiError => ... // use mkNotFoundError
```

---

### Rule 7.4 — SHOULD: Prefix effectful/unsafe functions with `unsafe` if they throw or perform I/O outside the adapter pattern

```typescript
const unsafeParseJson = (raw: string): unknown => JSON.parse(raw) // throws on invalid JSON
```

---

### Rule 7.5 — SHOULD: Name predicates with `is` or `has` prefix; return `boolean` or type-guard signature

```typescript
const isActive = (node: OrgNode): boolean => node.attrs.status === 'active'
const isParseOk = <T>(r: ParseResult<T>): r is ParseOk<T> => r.kind === 'parse_ok'
```

---

### Rule 7.6 — MUST: Use descriptive names; single-letter names restricted to: `_` (unused), type parameters (`A`, `B`, `T`, `E`), lambda parameters in short pipelines (`x`, `n`)

---

### Rule 7.7 — SHOULD: Name effectful wrappers (decorators / middleware) with a `with` prefix

**Rationale.** A function whose signature is `(handler: H) => H` and whose body adds logging, retries, timing, or any other cross-cutting concern is a *decorator* in functional terms. The `with` prefix signals composition over inheritance: `withLogging(withRetry(handler))` reads as a stack, and the order is visible at the call site.

```typescript
const withLogging = <A, E>(label: string, f: () => Promise<Result<A, E>>): (() => Promise<Result<A, E>>) =>
  async () => { ... }

const withTiming = ...
const withRetry = ...
```

The `@tsfpp/boundary` package uses this convention throughout: `withIdempotency`, `withRequestLog`.

---

### Rule 7.8 — MUST: Suffix ADT-specialised combinators with the ADT's full type name; `Result` is the unsuffixed base

**Rationale.** In a flat prelude (no module namespacing), the same combinator exists for several ADTs — `map` for `Result`, `Option`, `List`. A reader must be able to tell from the name alone which ADT a combinator targets, and must be able to predict the name of the variant they need. That requires one rule with no exceptions, because the failure mode is silent: picking the wrong-ADT combinator either fails to type-check (noise) or, where the shapes coincide, compiles against the wrong intent.

The convention has two parts:

1. **`Result` is the base ADT.** Its combinators are unsuffixed: `map`, `flatMap`, `getOrElse`, `match`, `mapErr`, `tap`, `traverseArray`. `Result` is chosen as the base because effectful, fallible computation is the dominant case in application code, and its combinators are the most frequently written.
2. **Every other ADT carries its full type name as a suffix.** `Option` → `mapOption`, `flatMapOption`, `getOrElseOption`, `orElseOption`, `matchOption`, `traverseArrayOption`. `List` → `mapList`, `foldList`, `filterList`. `NonEmptyReadonlyArray` → `headNonEmpty`, `lastNonEmpty`.

Abbreviated suffixes (`mapO`, `headNE`) and single-letter suffixes (`getOrElseR`) are forbidden: they are unpredictable (is Option `O` or the first letter of the operation?) and they let the "base" ADT drift between families, which is precisely the inconsistency this rule removes.

**Do**
```typescript
import { map, getOrElse, mapOption, getOrElseOption, headNonEmpty } from '@tsfpp/prelude'

const total = pipe(parseAmounts(raw), map(sum))              // Result — base, unsuffixed
const label = getOrElseOption(() => 'anon')(findName(user))  // Option — full suffix
const first = headNonEmpty(guaranteedNonEmpty)               // NonEmpty — full suffix
```

**Don't**
```typescript
const label = getOrElse(() => 'anon')(findName(user)) // ambiguous: Result or Option?
const x = mapO(f)(opt)                                 // abbreviated suffix
const y = getOrElseR(g)(res)                           // single-letter suffix, base drift
```

**Scope.** This rule governs *ADT-parametric combinators* — functions that take an ADT and transform or eliminate it. It does not rename data constructors (`some`, `ok`, `cons`), type guards (`isSome`, `isOk` — governed by Rule 7.5), or conversions that already name their source/target (`fromArray`, `toArray`, `fromNullable`).

---

## 8 — Partiality, Totality, and Proof

### Rule 8.1 — MUST: Every function must be total or document its partiality in the return type

**Rationale.** A total function is defined for every value in its domain. Partiality must surface in `Option`, `Result`, or `Either`.

**Do**
```typescript
import { type Option, some, none } from '@tsfpp/prelude'

const head = <A>(xs: ReadonlyArray<A>): Option<A> =>
  xs.length > 0
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- DEVIATION(1.6): noUncheckedIndexedAccess narrowing guarded by length check
    ? some(xs[0] as A)
    : none
```

---

### Rule 8.2 — MUST: Property-based testing with fast-check is mandatory for all pure functions in the core

**Rationale.** Example-based tests check specific inputs; property-based tests check *laws* over a generator's range. Required for parser combinators, layout algorithms, and data transformations.

**Do**
```typescript
import * as fc from 'fast-check'

test('reverse is involutive', () => {
  fc.assert(fc.property(fc.array(fc.integer()), (xs) => {
    expect(xs.toReversed().toReversed()).toEqual(xs)
  }))
})
```

---

### Rule 8.3 — SHOULD: Document algebraic laws (identity, associativity, commutativity) for key combinators as JSDoc or inline comments

```typescript
/**
 * pipe(f, identity) ≡ f           (right identity)
 * pipe(identity, f) ≡ f           (left identity)
 * pipe(pipe(f, g), h) ≡ pipe(f, pipe(g, h))  (associativity)
 */
```

---

### Rule 8.4 — MUST: Parse, don't validate — turn `unknown` into typed domain values at the boundary; propagate the typed value inward, not the raw shape

**Rationale.** A *validator* asks "is this valid?" and returns a boolean, leaving the caller with the same `unknown` it started with. A *parser* asks "what typed value, if any, does this represent?" and returns the value. The parser pushes the cost of the check to the boundary exactly once; everything inside the core consumes typed data.

Reference: Alexis King, "Parse, don't validate" (2019).

**Do**
```typescript
import { z } from 'zod'
import { ok, err, type Result } from '@tsfpp/prelude'

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
})
type User = z.infer<typeof UserSchema>

const parseUser = (raw: unknown): Result<User, string> => {
  const parsed = UserSchema.safeParse(raw)
  return parsed.success ? ok(parsed.data) : err(parsed.error.message)
}

// Downstream: takes User, not unknown. The shape is proven once.
const greet = (u: User): string => `Hello, ${u.name}`
```

**Don't**
```typescript
// Validates but returns the original shape — every caller re-checks
const isValidUser = (raw: unknown): boolean => { ... }

const greet = (raw: unknown): string => {
  if (!isValidUser(raw)) return 'invalid'
  // What's the type of `raw` here? Still unknown. Every field access is a cast.
  return `Hello, ${(raw as { name: string }).name}`
}
```

---

### Rule 8.5 — SHOULD: Eliminate `Option` / `Result` through a total `match` when both arms yield a value; reserve guards for early-return control flow

**Rationale.** The exhaustiveness axiom (axiom 5) wants both variants of an ADT accounted for at every consumption site. `isOk` / `isNone` guards *permit* exhaustiveness but do not *enforce* it: a reader must confirm by eye that the `else` was written and that both branches return. A total eliminator — `matchOption(onNone, onSome)`, `matchResult(onErr, onOk)` — makes the omission unrepresentable: it is a single expression that does not type-check unless a handler is supplied for each variant and both produce the common result type. It also honours Rule 1.11 by construction, since the discriminant never appears at the call site.

The rule is scoped deliberately. When the consumption *produces a value* (mapping a `Result` to a response, collapsing an `Option` to a label), `match` is the right shape. When the consumption is *control flow* — bail out early on `None`, then continue in the golden path (Rule 4.4) — a guard clause reads better and `match` would force an awkward nesting. Prefer the eliminator for the former; keep guards for the latter.

**Do**
```typescript
import { matchResult } from '@tsfpp/prelude'

// Value-producing consumption — both arms return, exhaustiveness enforced
const toResponse = matchResult(
  (e: OrderError) => problem(e),
  (c: Confirmation) => ok200(c),
)
```

**Don't**
```typescript
// Re-deriving the match by hand: nothing forces the None branch to exist,
// and a later edit can drop it without a compile error.
const label = isSome(name) ? name.value : /* forgot to handle None → undefined */ undefined!
```

**Guard clauses remain correct for early return:**
```typescript
const process = (input: Option<string>): Result<Output, Err> => {
  if (isNone(input)) return err('missing input')   // control flow, not value production
  return ok(transform(input.value))
}
```

---

## 9 — Compiler and Tooling Configuration

### Rule 9.1 — MUST: The following `tsconfig.json` compiler options are mandatory

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "useUnknownInCatchVariables": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true,
    "noPropertyAccessFromIndexSignature": true
  }
}
```

**Rationale.** Each flag closes a soundness gap. `noUncheckedIndexedAccess` forces `T | undefined` on index access (prevents Rule 1.6 violations). `exactOptionalPropertyTypes` distinguishes `undefined` from absent. `noFallthroughCasesInSwitch` enforces Rule 4.1.

---

### Rule 9.2 — MUST: ESLint must enforce at minimum the rules listed in Appendix B

---

### Rule 9.3 — SHOULD: Enable `eslint-plugin-functional` rules: `no-let`, `no-loop-statements`, `no-throw-statements`, `prefer-readonly-type`, `immutable-data`

**Rationale.** Machine-enforced immutability and functional style reduces reviewer burden.

---

### Rule 9.4 — MUST: Repository-wide editor settings must be defined in `.editorconfig`

At minimum:

- Indentation uses spaces, never tabs, for source code, Markdown, JSON, YAML, and shell files.
- Charset is UTF-8.
- Line endings are LF.
- Files end with a single trailing newline.
- Trailing whitespace is trimmed, except where a file format intentionally relies on it.

**Rationale.** These are cross-editor invariants. They reduce noisy diffs, avoid platform-specific churn, and ensure style rules are enforced consistently outside any single IDE.

---

### Rule 9.5 — SHOULD: Git text normalization must be defined in `.gitattributes`

At minimum:

- Text files are normalized with LF line endings.
- Binary assets must not be line-normalized.

**Rationale.** Editor settings govern how files are written locally; Git attributes govern how line endings are stored and shared. Both are needed to prevent cross-platform drift.

---

### Rule 9.6 — MUST: Pre-commit hooks must enforce the type and lint gates locally

**Rationale.** CI catches violations *eventually*; pre-commit catches them *before they enter history*. The combination of Husky for hook plumbing and `lint-staged` for incremental application keeps the developer feedback loop short and the merge history clean.

Minimum gate, run on the staged set:

1. `tsc --noEmit` over the affected package.
2. `eslint` on staged `.ts` files.
3. Commit message validated against Conventional Commits (commitlint).

Pre-push MAY additionally run the full test suite. CI re-runs all gates without exception.

---

## 10 — Documentation and Review Protocol

### Rule 10.1 — MUST: Every exported function must have a JSDoc comment stating purpose, preconditions, and return semantics

---

### Rule 10.2 — MUST: Every discriminated union must have a module-level JSDoc block describing the algebra (variants and their intended semantics)

---

### Rule 10.3 — MUST: Every smart constructor must document the invariants it enforces

---

### Rule 10.4 — SHOULD: Code reviews must verify the following checklist

- [ ] No `any`, `as`, `!` outside permitted boundaries
- [ ] All sum types have exhaustive matches with `never` assertion
- [ ] All exported functions have explicit return types
- [ ] All record fields are `readonly`
- [ ] No mutation (`push`, `sort`, property assignment, `let`)
- [ ] Error paths return `Result`/`Option`, not `throw`
- [ ] Pure/effectful separation: I/O confined to boundaries
- [ ] Property-based tests exist for core pure functions
- [ ] Function length ≤ 40 lines, complexity ≤ 10, nesting ≤ 4
- [ ] Branded types created only via smart constructors
- [ ] Discriminant convention respected (`_tag` for prelude, `kind` for domain)
- [ ] `unknown` parsed to typed values at the boundary (Rule 8.4)
- [ ] No coercion parsing or `NaN`/`Infinity` leakage in the core; constrained numerics branded (Rule 1.13)
- [ ] No ambient clock/entropy/env in the core; injected via `Deps` (Rule 4.6)
- [ ] Domain error channels are `kind`-tagged unions, not `string`/`Error` (Rule 6.7)
- [ ] `Option`/`Result` collapsed via `match` where both arms yield a value (Rule 8.5)

A condensed quick-reference card is provided in Appendix E.

---

## 11 — Module Organisation

### Rule 11.1 — MUST: One type per file for major domain types; collocate related sum type and its constructors in the same module

**Rationale.** Small, focused modules reduce coupling and simplify navigation. A sum type's constructors belong with the type for exhaustiveness reasoning.

---

### Rule 11.2 — MUST: Maximum file length is 400 lines; 800 lines absolute maximum with deviation

**Rationale.** JSF++ AV Rule 1 (bounded complexity). Long files indicate decomposition failure.

---

### Rule 11.3 — MUST: Organise by feature/domain, not by technical role

**Do**
```
src/
  lexer/
    tokenize.ts
    tokens.ts
  parser/
    combinators.ts
    grammar.ts
    parse.ts
  resolver/
    resolve.ts
    validate.ts
```

**Don't**
```
src/
  types/       ← all types in one folder
  functions/   ← all functions in one folder
  tests/       ← all tests in one folder
```

---

### Rule 11.4 — MUST: Re-export public API from a barrel `index.ts` per package; internal modules must not be imported directly by consumers

**Rationale.** A single import path per package is a contract the package can evolve internally. Reaching past the barrel breaks that contract.

**Note on tree-shaking.** Barrel re-exports composed of `export * from './x'` and `export { foo } from './y'` are statically analysable and tree-shake correctly under any modern bundler (esbuild, rollup, Vite). What does *not* tree-shake well: barrel files that perform module-level side effects, or that re-export through dynamic patterns. Keep barrels as flat lists of re-exports.

---

## 12 — Forbidden Constructs (Summary)

| Construct | Rule | Level |
|-----------|------|-------|
| `class` | 1.9 | MUST NOT |
| `enum` | 1.8 | MUST NOT |
| `interface` (without deviation) | 1.4 | MUST NOT |
| `this`, `new`, `instanceof` | 1.9 | MUST NOT |
| `any` | 1.5 | MUST NOT |
| `as` (outside smart constructor) | 1.6 | MUST NOT |
| `!` (non-null assertion) | 1.6 | MUST NOT |
| `let`, `var` | 2.1 | MUST NOT |
| `for`, `while`, `do..while` | 4.2 | MUST NOT |
| `throw` (outside adapter boundary) | 6.2 | MUST NOT |
| Mutating methods (`push`, `sort`, etc.) | 2.3 | MUST NOT |
| `==`, `!=` | 4.5 | MUST NOT |
| `null`/`undefined` propagation without `Option` | 6.3 | MUST NOT |
| Truthiness checks on non-booleans | 4.5 | MUST NOT |
| `namespace` | 1.9 | MUST NOT |
| `default` in exhaustive switch | 4.1 | MUST NOT (use `never` assertion) |
| Direct `_tag` access outside the prelude | 1.11 | MUST NOT |
| Optional parameters (`?`) outside boundary records | 3.7 | MUST NOT |
| Coercion parsing in the core (`Number()`, `parseInt`, `parseFloat`, unary `+`) | 1.13 | MUST NOT |
| Global `isNaN` / `isFinite` (coercing) | 1.13 | MUST NOT (use `Number.isNaN` / `Number.isFinite`) |
| Ambient nondeterminism in the core (`Date.now`, `new Date`, `Math.random`, `crypto.randomUUID`, `process.env`) | 4.6 | MUST NOT (inject via `Deps`) |
| Bare `string` or `Error` as a domain error channel | 6.7 | MUST NOT (use a `kind`-tagged union) |

---

## Appendix A — Minimum `tsconfig.json`

```jsonc
{
  "compilerOptions": {
    // Target & module
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",

    // Strict type checking (all MUST)
    "strict": true,                              // enables all strict sub-flags
    "noUncheckedIndexedAccess": true,            // index access returns T | undefined
    "exactOptionalPropertyTypes": true,          // distinguish missing from undefined
    "noImplicitOverride": true,                  // explicit override keyword
    "noFallthroughCasesInSwitch": true,          // no unintentional fallthrough
    "useUnknownInCatchVariables": true,          // catch(e) → unknown, not any
    "noPropertyAccessFromIndexSignature": true,  // force bracket notation for dynamic keys
    "forceConsistentCasingInFileNames": true,

    // Module safety
    "verbatimModuleSyntax": true,
    "isolatedModules": true,

    // Output
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "outDir": "dist"
  }
}
```

---

## Appendix B — ESLint Configuration

```javascript
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import functionalPlugin from 'eslint-plugin-functional'

export default [
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**']
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 'latest',
        project: './tsconfig.json'
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'functional': functionalPlugin
    },
    rules: {
      // --- Core TypeScript safety ---
      '@typescript-eslint/no-explicit-any': 'error',               // Rule 1.5
      '@typescript-eslint/no-non-null-assertion': 'error',         // Rule 1.6
      '@typescript-eslint/consistent-type-assertions': ['error', { // Rule 1.6
        assertionStyle: 'never'
      }],
      '@typescript-eslint/explicit-function-return-type': ['error', { // Rule 3.1
        allowExpressions: false,
        allowTypedFunctionExpressions: true
      }],
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_'
      }],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',   // Rule 1.2
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/prefer-readonly': 'error',               // Rule 2.2
      '@typescript-eslint/strict-boolean-expressions': 'error',    // Rule 4.5

      // --- Immutability & functional style ---
      'functional/no-let': 'error',                                // Rule 2.1
      'functional/no-loop-statements': 'error',                    // Rule 4.2
      'functional/no-throw-statements': 'error',                   // Rule 6.2
      'functional/prefer-readonly-type': 'error',                  // Rule 2.2
      'functional/immutable-data': 'error',                        // Rule 2.3
      'functional/no-classes': 'error',                            // Rule 1.9
      'functional/no-this-expressions': 'error',                   // Rule 1.9

      // --- Numeric hazards (Rule 1.13) & ambient nondeterminism (Rule 4.6) ---
      'no-restricted-globals': ['error',                           // Rule 1.13, 4.6
        { name: 'isNaN', message: 'Use Number.isNaN — the global coerces its argument (Rule 1.13).' },
        { name: 'isFinite', message: 'Use Number.isFinite — the global coerces its argument (Rule 1.13).' },
        { name: 'parseInt', message: 'Coercion parsing is forbidden in the core; parse at the boundary via a smart constructor (Rule 1.13).' },
        { name: 'parseFloat', message: 'Coercion parsing is forbidden in the core; parse at the boundary via a smart constructor (Rule 1.13).' }
      ],
      'no-restricted-syntax': ['error',                            // Rule 4.6
        { selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']", message: 'Date.now() is an effect; inject `now: () => Date` via Deps (Rule 4.6).' },
        { selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']", message: 'Math.random() is an effect; inject a seeded generator via Deps (Rule 4.6).' },
        { selector: "NewExpression[callee.name='Date'][arguments.length=0]", message: 'new Date() reads the ambient clock; inject `now: () => Date` via Deps (Rule 4.6).' },
        { selector: "MemberExpression[object.object.name='process'][object.property.name='env']", message: 'process.env is ambient input; load config at the boundary and inject it (Rule 4.6 / CONFIG_CODING_STANDARD.md).' }
      ],

      // --- General hygiene ---
      'no-console': 'warn',
      'prefer-const': 'error',                                     // Rule 2.1
      'no-var': 'error',                                           // Rule 2.1
      'no-param-reassign': 'error',                                // Rule 2.3
      'eqeqeq': ['error', 'always'],                               // Rule 4.5
      'complexity': ['error', { max: 10 }],                        // Rule 3.4
      'max-depth': ['error', { max: 4 }],                          // Rule 3.4
      'max-lines-per-function': ['error', {                        // Rule 3.4
        max: 40,
        skipBlankLines: true,
        skipComments: true
      }]
    }
  }
]
```

> **Note:** `eslint-plugin-functional` must be installed: `pnpm add -D eslint-plugin-functional`. The `consistent-type-assertions: 'never'` rule will flag all `as` casts; smart constructors require an `// eslint-disable-next-line @typescript-eslint/consistent-type-assertions` line with a `// DEVIATION(1.6)` comment on the same line.

---

## Appendix C — References

### Standards and methodology

1. **JSF++ AV Coding Standard** — Lockheed Martin, Joint Strike Fighter Air Vehicle C++ Coding Standards, Rev C (2005).
2. **JPL Power of Ten** — G. Holzmann, "The Power of Ten: Rules for Developing Safety-Critical Code," IEEE Computer, vol. 39, no. 6 (2006).
3. **MISRA C:2023** — Motor Industry Software Reliability Association.
4. **CERT Secure Coding Standard** — SEI, Carnegie Mellon University.

### Functional design

5. **Domain Modeling Made Functional** — S. Wlaschin, Pragmatic Bookshelf (2018).
6. **Parse, don't validate** — A. King (2019). https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/
7. **Algebraic Data Types: Things I wish someone had explained about functional programming** — J. Gibbons.
8. **Effective TypeScript: 83 Specific Ways to Improve Your TypeScript** — D. Vanderkam, O'Reilly (2024, 2nd ed.).

### Functional TypeScript ecosystem

9. **fp-ts** — G. Canti. https://gcanti.github.io/fp-ts/
10. **Effect-TS** — Full effect runtime for TypeScript. https://effect.website/
11. **Remeda** — Immutable, typed Lodash replacement; complementary to `@tsfpp/prelude`. https://remedajs.com/
12. **ts-pattern** — Exhaustive pattern matching as an expression. https://github.com/gvergnaud/ts-pattern
13. **neverthrow** — Method-chained `Result` library; design-point comparison only. https://github.com/supermacro/neverthrow

### Validation and testing

14. **Zod** — Runtime schema validation; canonical boundary parser. https://zod.dev/
15. **fast-check** — N. Dubien, property-based testing. https://fast-check.dev/

### In-house companion packages

16. **`@tsfpp/prelude`** — Canonical ADT and combinator package for this standard. The reference implementation of `Option`, `Result`, `pipe`, `flow`, `complement`, `List`, branded types, and `absurd`.
17. **`@tsfpp/boundary`** — Companion package for HTTP API services: typed request context, RFC 9457 problem details, pagination, idempotency, webhook signing, middleware decorators.

### Tooling

18. **eslint-plugin-functional** — https://github.com/eslint-functional/eslint-plugin-functional
19. **TypeScript Handbook: Narrowing** — https://www.typescriptlang.org/docs/handbook/2/narrowing.html
20. **TypeScript Handbook: Discriminated Unions** — https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions

---

## Appendix D — Recommended ecosystem

The standard is library-agnostic in principle, but a few libraries cover the surface area it leaves intentionally minimal. The map below is recommendation-grade, not normative; substitutions are allowed where the substitute upholds the same axioms.

| Concern | Canonical choice | Notes |
|---|---|---|
| ADTs, combinators, branded types | `@tsfpp/prelude` | Reference implementation of this standard's ADT discipline. |
| HTTP API primitives | `@tsfpp/boundary` | Typed request context, RFC 9457, idempotency, webhooks. See `API_CODING_STANDARD.md`. |
| Boundary schema validation | Zod | Used at every `unknown` boundary; lift `safeParse` results into `Result` (Rule 8.4). |
| Collection plumbing (groupBy, partition, pick, omit, sortBy) | Remeda | Data-last, immutable, no ADTs. Complements the prelude rather than overlapping. |
| Pattern matching beyond `switch` | ts-pattern | Acceptable expression-position substitute for Rule 4.1's `switch`. |
| Property-based testing | fast-check | Required for core pure functions (Rule 8.2). |
| Hooks and pre-commit plumbing | Husky + lint-staged | Rule 9.6. |
| Commit conventions | commitlint + Conventional Commits | Enables automated changelog generation. |

Libraries explicitly **not** recommended for this standard:

- **Lodash / Underscore** — Mutating helpers, no immutability guarantees. Use Remeda.
- **Ramda** — Was historically a recommendation. Removed in v1.1.0 of this standard; the prelude now covers `pipe`, `flow`, and `complement`, and Remeda covers the data plumbing.
- **immutable.js** — Heavy runtime, opaque types, poor TypeScript ergonomics. Use plain readonly structures or Immer for localised structural sharing.

---

## Appendix E — Code review quick-reference card

A one-page version of Rule 10.4 for printout or PR template inclusion.

### Type discipline
- [ ] No `any`. No `as` outside smart constructors. No `!`. Prefer `satisfies` for literal conformance.
- [ ] Sum types have a literal discriminant: `_tag` (prelude) / `kind` (domain).
- [ ] Every `switch` on a sum type ends in `absurd(x)` or `ts-pattern`'s `.exhaustive()`.
- [ ] Branded types created only via `mk*` / `as*` / `from*` smart constructors.
- [ ] Constructors prefixed `mk` (no `create*`); ADT combinators suffixed by full type name, `Result` unsuffixed (Rules 7.3, 7.8).
- [ ] No `interface` (unless deviation justified).
- [ ] No `enum`. No `class`. No `this`. No `new` (outside adapter boundary).
- [ ] No coercion parsing (`Number()`, `parseInt`) or `NaN`/`Infinity` in the core; constrained numerics branded (`Int`/`Positive`/`NonNegative`).

### Data shape
- [ ] All records `readonly`, all arrays `ReadonlyArray`.
- [ ] No `let`, no `var`, no `for`/`while`/`do..while`.
- [ ] No mutating array methods. No property assignment.
- [ ] Literal tables use `as const`.

### Effects and errors
- [ ] Failure encoded as `Result<A, E>`. Absence as `Option<A>`.
- [ ] Error channel `E` is a `kind`-tagged union, not `string`/`Error`; boundary errors remapped with `mapErr`.
- [ ] `Option`/`Result` collapsed via `matchOption` / `matchResult` when both arms yield a value.
- [ ] No `throw` in core. `tryCatch` / `tryCatchAsync` at adapters.
- [ ] Async returns `Promise<Result<A, E>>`, not `Promise<A>`.
- [ ] `Promise.allSettled` chosen over `Promise.all` when partial failure matters.
- [ ] Dependencies injected as `Deps` parameter, not imported. Clock/entropy/env never read ambiently in the core.
- [ ] `unknown` parsed to a typed value at the boundary, not propagated.

### Composition and shape
- [ ] Exported functions have explicit return types.
- [ ] Arity ≤ 3 positional, else readonly options record.
- [ ] Body ≤ 40 lines, complexity ≤ 10, nesting ≤ 4.
- [ ] Pipelines ≤ 8 stages; longer pipelines decomposed and named.
- [ ] Discriminants accessed via `isOk` / `isSome` / `isErr` / `isNone`, never `result._tag`.
- [ ] Constructors use `mk*` (not `create*`); ADT combinators suffixed by full type name (`mapOption`, not `mapO`/`getOrElseR`), `Result` unsuffixed (Rules 7.3, 7.8).

### Tests and docs
- [ ] Property-based tests cover the laws of every new combinator.
- [ ] Every exported function has a JSDoc with purpose / preconditions / return semantics.
- [ ] Every sum type has a module-level JSDoc describing its algebra.
- [ ] Every smart constructor documents its invariants.
- [ ] Every deviation has a `// DEVIATION(N.M): <reason>` comment.