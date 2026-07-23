---
description: Scaffold a new TSF++-compliant TypeScript module
mode: agent
---

# New module (TSF++)

Create a new TypeScript module at the path I provide. Follow `CODING_STANDARD.md` strictly. Before writing any code, confirm you have understood the module's purpose; if it is ambiguous, ask one clarifying question and stop.

## Scaffolding steps

1. **Types first.** Define the core sum and product types.
   - Sum types: tagged discriminated unions with `readonly kind: '…'` or `readonly _tag: '…'`.
   - Product types: `type` aliases with every field `readonly`.
   - Nominal distinctions: `Brand<T, B>`.

2. **Smart constructors.** For every branded or refined type, expose an `mk*` / `as*` / `from*` constructor that validates and returns `Result<string, T>`. Use `brand(predicate, onFail)` from the `prelude`.

3. **Pure combinators.** Curried, data-last. Explicit return types. ≤ 40 lines per function, complexity ≤ 10, nesting ≤ 4.

4. **Exhaustive matches.** Every dispatch over a sum type uses `switch (x.kind) { … default: return absurd(x) }`.

5. **Effects at the edge.** If the module needs I/O or throwing interop, put it in a sibling `<name>.adapter.ts` and expose only `Promise<Result<T, E>>` signatures back to the pure module.

6. **Tests.** Create `<name>.spec.ts` with fast-check property tests for every pure function. Document at least one algebraic law per function in JSDoc and test it.

7. **JSDoc.** Every exported symbol gets a JSDoc block covering purpose, preconditions, return semantics, and (for combinators) laws.

## Import discipline

Import exclusively from the workspace `prelude` package. Never `import from 'ramda'`, never `import from 'fp-ts'`, never `import from 'effect'` — the prelude is the only sanctioned surface.

## Output

Produce the files directly. List them at the end, with a one-line description of each.

If any TSF++ rule would force a deviation, stop and explain before writing the deviation comment.
