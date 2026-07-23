# Coding standard (TSF++ v1.1.0)

This repository follows the TSF++ coding standard. The canonical source is `spec/CODING_STANDARD.md` — read it when designing new modules or encountering unfamiliar patterns. This file is a hot-path summary for generation; when in doubt, the full standard wins.

## Axioms (non-negotiable)

1. Referential transparency is the norm; effects are reified as `Promise<Result<T, E>>` or similar typed containers.
2. Total functions. Partiality is typed via `Option<A>`, `Result<E, A>`, `Either<E, A>`. Never concealed.
3. Algebraic data types are the primary modelling language: sum types via tagged discriminated unions, product types via readonly records.
4. Compiler first, property tests second, documentation third.

## Never

- `class`, `this`, `new`, `instanceof`, `namespace`, prototype inheritance
- `enum` — use string literal unions or `as const` objects
- `interface` (without a documented `// DEVIATION(1.4)`)
- `any` — use `unknown` at I/O boundaries and narrow in-scope
- `as` outside a smart constructor body
- `!` (non-null assertion)
- `let`, `var`
- `for`, `while`, `do..while`
- Mutating methods (`push`, `pop`, `splice`, `sort`, `reverse`, `fill`, `copyWithin`), property assignment, `delete`
- `throw` outside a Rule 6.2 adapter boundary
- `==`, `!=`, truthiness checks on non-booleans (`if (str)`, `if (value)`)
- Optional parameters `?` — use `Option<T>` or a defaults record
- `default:` branch in an exhaustive sum-type switch — use `absurd(x)` instead
- Direct `import from 'ramda'` outside the `prelude` package (Rule 13.1)

## Always

- `readonly` on every record field and every array type (`ReadonlyArray<T>`)
- `const` for every binding
- Explicit return type on every exported function
- Sum-type dispatch via `switch` ending in `default: return absurd(x)`
- Errors as data: return `Result<T, E>`, do not `throw`
- Curried, data-last combinators
- Pipelines via `pipe` imported from the `prelude` package
- Projection combinators (`prop`, `pick`, `omit`, `path`) for reads
- Spread for shallow immutable updates; lenses (`lensPath`, `set`, `over`) for nested updates ≥ 3 levels deep
- Arity ≤ 3 positional parameters; use a readonly record for ≥ 3
- Function body ≤ 40 lines, cyclomatic complexity ≤ 10, nesting depth ≤ 4
- JSDoc on every exported symbol; document algebraic laws where applicable

## Canonical idioms

```typescript
// Sum type with literal discriminant
type Shape =
  | { readonly kind: 'circle'; readonly radius: number }
  | { readonly kind: 'rect'; readonly width: number; readonly height: number }

// Exhaustive match with totality witness
import { absurd } from 'prelude'

const area = (s: Shape): number => {
  switch (s.kind) {
    case 'circle': return Math.PI * s.radius ** 2
    case 'rect':   return s.width * s.height
    default:       return absurd(s)
  }
}

// Branded type via smart constructor
import { brand, type Brand, type Result } from 'prelude'

type UserId = Brand<string, 'UserId'>
const mkUserId = brand<string, 'UserId'>(
  s => /^[a-z0-9-]+$/.test(s),
  s => `Invalid UserId: ${s}`,
)

// Pure function with Option return (partial → total)
import { type Option, some, none } from 'prelude'

const head = <A>(xs: ReadonlyArray<A>): Option<A> =>
  xs.length > 0 ? some(xs[0] as A) : none

// Pipeline, curried data-last combinators
import { pipe, filter, map, prop } from 'prelude'

const activeNames = pipe(
  filter(isActive),
  map(prop('name')),
)
```

## Import discipline

All ADT constructors (`some`, `none`, `ok`, `err`), combinators (`mapO`, `flatMapR`, `pipe`, `map`, `filter`, `prop`, `pick`, …), and Ramda re-exports come from the workspace `prelude` package. Do not import from `ramda` directly.

## Generation workflow (when creating new code)

1. **Types first.** Model the domain as sum and product types before writing any function.
2. **Make it total.** Every function either is defined for its full domain, or returns `Option`/`Result`.
3. **Separate pure from effectful by signature.** `T` means pure; `Promise<Result<T, E>>` means effectful.
4. **Test the laws.** Add fast-check property tests for every pure function.
5. **Link the laws in JSDoc.** Identity, associativity, commutativity where they hold.

## Editing existing code

- Never weaken a signature (e.g. do not replace `Option<T>` with `T | undefined`).
- Preserve `readonly`-ness transitively; do not strip it from nested types.
- Do not introduce forbidden constructs to "fix" a type error — rethink the types instead.
- If a deviation is truly necessary, write `// DEVIATION(N.M): <one-line justification>` where `N.M` is the rule number, and flag it in the PR description.

## When a task is ambiguous

Ask for clarification rather than guessing. Do not invent types, error cases, or effect boundaries. Prefer returning a short question over producing speculative code that later has to be reworked.

## Commenting & Annotation Standard

- All code must follow the JSDoc and code reminder conventions in `integrations/copilot/instructions/docs-commenting.instructions.md`.
- Every exported symbol requires a JSDoc block (purpose, preconditions, return, laws).
- All TODO, FIXME, HACK, NOTE, OPTIMIZE, BUG, XXX comments must include date, author, and (if possible) ticket reference.
- Agents and IDEs MUST enforce these rules deterministically when generating or reviewing code.
- See `integrations/copilot/instructions/docs-commenting.instructions.md` for full details and examples.
- For comment/doc-only audits and remediation, also use `integrations/copilot/instructions/audit-comment-quality.instructions.md`.

## Specialized Auditing Agent

- For TSF++ compliance audits, tech-debt annotation review, lint/type hint triage, and JSDoc/module/API/export comment quality checks, use:
  - `integrations/copilot/agents/audit-techdebt-docs.agent.md`

## Trunk Workflow Discoverability

- Use the trunk-based workflow guidance in `integrations/copilot/instructions/git-workflow.instructions.md` for all feature, fix, and refactor work.
- At the beginning of implementation work, trigger `/git-start-work` before editing files when not already on a feature branch.
- At logical completion points, trigger `/git-checkpoint` to avoid oversized end-of-task commits.
- Before PR creation or when branch drift exists, trigger `/git-sync`.
- When implementation is complete and validated, trigger `/git-open-pr`.
- Use `/git-hotfix` for urgent production fixes only.
- Use `integrations/copilot/agents/git-trunk-enforcer.agent.md` when you want strict enforcement of the full branch-to-PR pipeline.
- Use `/git-feature-lifecycle` to run the end-to-end trunk flow in one guided mode.
