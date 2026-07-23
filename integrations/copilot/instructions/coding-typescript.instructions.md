---
description: TypeScript-specific generation rules for TSF++
applyTo: "**/*.ts,**/*.tsx"
---

# TypeScript-specific guidance (TSF++)

These rules extend `integrations/copilot/copilot-instructions.md` with TS-specific details. The canonical reference is `spec/CODING_STANDARD.md` §1, §9.

## Compiler contract (tsconfig is strict)

The following flags are on. Generated code must respect them:

- `strict: true`
- `noUncheckedIndexedAccess: true` — every array/index access yields `T | undefined`. Narrow before use.
- `exactOptionalPropertyTypes: true` — `{ foo?: string }` is not assignable from `{ foo: undefined }`.
- `noFallthroughCasesInSwitch: true` — every case must `return`, `throw`, or explicitly `break`.
- `useUnknownInCatchVariables: true` — `catch (e)` gives `e: unknown`. Narrow or wrap in `Result` at the boundary.
- `noPropertyAccessFromIndexSignature: true` — use bracket notation for dynamic keys.
- `verbatimModuleSyntax: true` — use `import type` for type-only imports; imports are not elided silently.

## Types over interfaces

```typescript
// Do
type User = {
  readonly id: UserId
  readonly name: string
}

// Don't — interface permits declaration merging
interface User { id: UserId; name: string }
```

Exception: `interface` at a library boundary to permit consumer augmentation, with `// DEVIATION(1.4)`.

## Branded types

Every nominal distinction (IDs, handles, validated strings, measurement units) is a `Brand<T, B>`. Construct only via `mk*` / `as*` / `from*` smart constructors that validate and return `Result<string, T>`.

## Exports

Every exported function has an explicit return type annotation. Inference is fine for internal helpers but must not cross the module boundary.

## No `any`, no `!`, no `as` (outside smart constructors)

These are the three escape hatches the standard bans. If the compiler cannot prove a narrowing, restructure the code until it can — do not silence it.
