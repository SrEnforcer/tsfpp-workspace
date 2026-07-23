# CODING_STANDARD.md — Purely Functional TypeScript with Algebraic Data Types

This standard is mandatory for all code, comments, and documentation. English only.
Codename TSF++ (tsfpp)


**Version:** 1.0.1  
**Date:** 2026-04-19  
**Classification:** Normative — repository-wide  
**Modelled after:** JSF++ AV Rules (Lockheed Martin), JPL Power of Ten (Holzmann)

---

## Preamble

### Scope

This standard governs all TypeScript source code in the project files and any future packages within this repository. It applies to production code, test helpers, build scripts authored in TypeScript, and type declarations.

It does **not** apply to:
- Auto-generated code (parser output, bundler artefacts). These must be isolated behind a facade that does conform.
- Third-party type definitions (`@types/*`).
- Configuration files authored in JSON or JavaScript (e.g. `vite.config.ts`), although the spirit of immutability applies where feasible.

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
1. An inline `// DEVIATION(N.M): <one-line justification>` comment.
2. Approval from at least one reviewer.
3. Entry in a `DEVIATIONS.md` ledger if the deviation is project-wide.

---

## 1 — Type System

### Rule 1.1 — MUST: Encode sum types as tagged discriminated unions with a literal discriminant

**Rationale.** A string-literal `kind` (or `tag`, `_tag`) field enables exhaustive pattern matching, aligns with the ML `datatype` encoding, and guarantees that `switch` narrows correctly.

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
const area = (s: Shape): number => {
  switch (s.kind) {
    case 'circle': return Math.PI * s.radius ** 2
    case 'rect':   return s.width * s.height
    default:       return absurd(s) // const absurd = (_: never): never => { throw new Error('absurd') }
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
type Brand<T, B extends string> = T & { readonly __brand: B }
type NodeId = Brand<string, 'NodeId'>

const mkNodeId = (raw: string): NodeId => {
  // validation here
  return raw as NodeId  // DEVIATION(1.3): `as` permitted inside smart constructor boundary
}
```

**Don't**
```typescript
const id: NodeId = someString as NodeId  // unguarded cast outside constructor
```

**Exception.** `as` is permitted *exclusively* within a smart constructor body that has validated the input. Document the invariant.

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
const head = <A>(xs: ReadonlyArray<A>): A | undefined => xs[0]
```

**Don't**
```typescript
const head = <A>(xs: ReadonlyArray<A>): A => xs[0]!
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

### Rule 1.10 — MUST: Use type-guard predicates at narrowing sites; reserve composed negation (`complement`/`not`) for predicate-as-value positions

**Rationale.** TypeScript's type-guard narrowing (`x is T`) is the compiler's contribution to the "first proof" axiom. Wrapping a guard through Ramda's `complement` (or any general `not` combinator) erases the narrowing, because the type system cannot express a "not T" type predicate. Therefore: keep guards intact where narrowing matters; compose freely where the predicate is consumed only as a `boolean`-valued function.

**Do**
```typescript
// Narrowing site — direct guard preserves `value is ReadonlyArray`
const handle = (value: unknown): Result => {
  if (!isArray(value)) return err('expected array')
  // value: ReadonlyArray here
  return ok(toItems(value))
}

// Predicate-as-value — narrowing irrelevant, composition wins
import { complement } from 'ramda'
const isNotArray = complement(isArray)

const scalars = pipe(
  filter(isNotArray),
  // ...
)(mixed)
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

**Rationale.** The discriminant field of a prelude ADT (`_tag` by convention, per the established discriminant rule) is an implementation detail of the prelude, not part of its public contract. Allowing consumers to write `result._tag === 'Ok'` couples every call site to a name choice the prelude must remain free to change, and it bypasses the smart-constructor discipline (Rule 1.3) that governs every other ADT boundary.

The exported guards (`isOk`, `isErr`, `isSome`, `isNone`, `isLeft`, `isRight`) are the canonical interface. They narrow with full type-guard semantics (`r is Ok<T>`), so consumer code loses nothing by going through them.

**Do**
```typescript
import { isOk, isSome } from '@tsfpp/prelude'

if (isOk(result)) {
  // result: Ok — discriminant name nowhere in sight
  return result.value
}

const successes: ReadonlyArray<Ok> = pipe(
  results,
  filter(isOk),
)
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

**Rationale.** Mutation invalidates referential transparency. Use spread, `Array.prototype.toSorted()`, `Array.prototype.toReversed()`, or Ramda equivalents.

**Do**
```typescript
const sorted = [...xs].sort(compareFn)       // or xs.toSorted(compareFn) in ES2023+
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

**Rationale.** Naive immutable copies of large arrays are O(n). Libraries like Immer (already a dependency) or hand-rolled persistent trees provide O(log n) updates.

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

// Effectful — Promise signals I/O
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
  let current = t
  while (!current.done) current = current.thunk()
  return current.value
}
```

**Exception.** Simple recursion on known-bounded structures (e.g. tree depth ≤ 100) is acceptable with a documented bound.

---

### Rule 3.6 — SHOULD: Prefer arrow function expressions over `function` declarations

**Rationale.** Arrow functions have no `this` binding, preventing accidental capture. `function` declarations are permitted only at module top-level when hoisting is required (rare).

---

### Rule 3.7 — MUST: Never use optional parameters (`?`); use explicit `Option<T>` or a defaults record

**Rationale.** Optional parameters conflate "absent" and "present-but-undefined." `Option<T>` forces the caller to make intent explicit.

**Do**
```typescript
type Option<A> = { readonly _tag: 'Some'; readonly value: A } | { readonly _tag: 'None' }

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

---

### Rule 4.2 — MUST: Forbid `for`, `while`, `do..while` loops; use `map`, `reduce`, `filter`, `flatMap`, or Ramda combinators

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

**Exception.** Performance-critical inner loops in layout algorithms MAY use `for` with `// DEVIATION(4.2): hot path, profiled` and must confine mutation to local scope.

---

### Rule 4.3 — SHOULD: Prefer ternary expressions for simple conditional returns; use `if`/`else` blocks with guard clauses for complex branching

**Rationale.** Ternary is an expression (referentially transparent); `if` is a statement. But nested ternaries reduce readability.

**Do**
```typescript
const label = node.displayName ?? node.handle ?? 'unnamed'
const sign = x > 0 ? 'positive' : x < 0 ? 'negative' : 'zero' // max 1 nesting level
```

**Don't**
```typescript
const label = a ? (b ? (c ? x : y) : z) : w  // deeply nested ternary
```

---

### Rule 4.4 — MUST: Use early return (guard clauses) to reduce nesting; maximum nesting depth is 4

**Rationale.** Deep nesting hides logic in indentation. Guard clauses make the "golden path" visually dominant.

**Do**
```typescript
const process = (input: Option<string>): Result<Output, Err> => {
  if (input._tag === 'None') return err('missing input')
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

## 5 — Composition and Call Sites

### Rule 5.1 — MUST: Use `pipe` (left-to-right) for multi-step transformations; limit pipeline depth to 8 stages

**Rationale.** `pipe` mirrors data flow direction, aiding readability. Excessively long pipelines should be decomposed into named intermediate functions.

**Do**
```typescript
import { pipe, map, filter, sort } from 'ramda'

const result = pipe(
  filter(isActive),
  map(toSummary),
  sort(byDate),
)(employees)
```

---

### Rule 5.2 — SHOULD: Limit point-free style to pipelines of well-named combinators; prefer explicit lambdas when the reader needs to see the data shape

**Rationale.** Point-free style aids composition but hinders debugging and type inference when anonymous.

**Do**
```typescript
const activeNames = pipe(filter(isActive), map(prop('name')))
```

**Don't**
```typescript
const f = pipe(filter(flip(prop)('active')), map(pipe(prop('name'), toUpper, trim)))
// reader cannot reconstruct the data shape
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
  | { readonly ok: true; readonly value: T; readonly rest: ReadonlyArray<Token> }
  | { readonly ok: false; readonly error: string; readonly line: number; readonly col: number }
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

**Rationale.** Third-party libraries may throw. The adapter layer catches and converts to `Result`. The pure core never sees exceptions.

**Do**
```typescript
// Adapter layer
const readFileSafe = (path: string): Result<string, IOError> => {
  try {
    return ok(readFileSync(path, 'utf8'))
  } catch (e) {
    return err({ kind: 'io_error', message: String(e) })
  }
}
```

---

### Rule 6.3 — MUST: Use `Result<T, E>` or `Either<E, A>` for operations that can fail; use `Option<A>` for values that may be absent

**Rationale.** `undefined | T` lacks a discriminant and mixes truthiness concerns. `Option` with `_tag: 'Some' | 'None'` integrates with pattern matching.

---

### Rule 6.4 — SHOULD: Use `Promise<Result<T, E>>` for async effectful operations; avoid bare `Promise<T>` that hides failure in rejection

**Rationale.** `Promise.reject` is an untyped exception channel. Wrapping in `Result` keeps errors in the success channel where they are visible.

---

### Rule 6.5 — SHOULD: Isolate I/O at the boundary; inject dependencies via function parameters or a reader-style pattern

**Rationale.** Dependency injection via function arguments (poor man's Reader monad) keeps the core testable without mocking frameworks.

**Do**
```typescript
type Deps = { readonly readFile: (path: string) => Promise<Result<string, IOError>> }
const compile = (deps: Deps) => (source: string): Promise<Result<Svg, CompileError>> => { ... }
```

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

```typescript
const mkNodeId = (raw: string): NodeId => ...
const asHandle = (raw: string): Handle => ...
const fromString = (raw: string): Option<Direction> => ...
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
const isParseOk = <T>(r: ParseResult<T>): r is ParseOk<T> => r.ok
```

---

### Rule 7.6 — MUST: Use descriptive names; single-letter names restricted to: `_` (unused), type parameters (`A`, `B`, `T`, `E`), lambda parameters in short pipelines (`x`, `n`)

---

## 8 — Partiality, Totality, and Proof

### Rule 8.1 — MUST: Every function must be total or document its partiality in the return type

**Rationale.** A total function is defined for every value in its domain. Partiality must surface in `Option`, `Result`, or `Either`.

**Do**
```typescript
const head = <A>(xs: ReadonlyArray<A>): Option<A> =>
  xs.length > 0 ? some(xs[0]!) : none  // DEVIATION(1.6): `!` safe — guarded by length check
```

---

### Rule 8.2 — MUST: Property-based testing with fast-check is mandatory for all pure functions in the core

**Rationale.** Example-based tests check specific inputs; property-based tests check *laws* over a generator's range. Required for parser combinators, layout algorithms, and data transformations.

**Do**
```typescript
import * as fc from 'fast-check'

test('tokenize roundtrips', () => {
  fc.assert(fc.property(fc.string(), (input) => {
    const tokens = tokenize(input)
    // assert law here
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
    "strict": true,                          // enables all strict sub-flags
    "noUncheckedIndexedAccess": true,        // index access returns T | undefined
    "exactOptionalPropertyTypes": true,      // distinguish missing from undefined
    "noImplicitOverride": true,              // explicit override keyword
    "noFallthroughCasesInSwitch": true,      // no unintentional fallthrough
    "useUnknownInCatchVariables": true,      // catch(e) → unknown, not any
    "noPropertyAccessFromIndexSignature": true, // force bracket notation for dynamic keys
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

      // --- General hygiene ---
      'no-console': 'warn',
      'prefer-const': 'error',                                     // Rule 2.1
      'no-var': 'error',                                           // Rule 2.1
      'no-param-reassign': 'error',                                // Rule 2.3
      'eqeqeq': ['error', 'always'],                              // Rule 4.5
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

> **Note:** `eslint-plugin-functional` must be installed: `pnpm add -D eslint-plugin-functional`. The `consistent-type-assertions: 'never'` rule will flag all `as` casts; smart constructors require a file-level `// eslint-disable-next-line @typescript-eslint/consistent-type-assertions` with a `// DEVIATION(1.6)` comment.

---

## Appendix C — References

1. **JSF++ AV Coding Standard** — Lockheed Martin, Joint Strike Fighter Air Vehicle C++ Coding Standards, Rev C (2005).
2. **JPL Power of Ten** — G. Holzmann, "The Power of Ten: Rules for Developing Safety-Critical Code," IEEE Computer, vol. 39, no. 6 (2006).
3. **MISRA C:2023** — Motor Industry Software Reliability Association.
4. **CERT Secure Coding Standard** — SEI, Carnegie Mellon University.
5. **Domain Modeling Made Functional** — S. Wlaschin, Pragmatic Bookshelf (2018).
6. **Algebraic Data Types: Things I wish someone had explained about functional programming** — J. Gibbons.
7. **fp-ts** — G. Canti, https://gcanti.github.io/fp-ts/
8. **Effect-TS** — https://effect.website/
9. **Ramda** — https://ramdajs.com/
10. **fast-check** — N. Dubien, https://fast-check.dev/
11. **eslint-plugin-functional** — https://github.com/eslint-functional/eslint-plugin-functional
12. **TypeScript Handbook: Narrowing** — https://www.typescriptlang.org/docs/handbook/2/narrowing.html
13. **TypeScript Handbook: Discriminated Unions** — https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions
