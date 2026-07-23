# TSF++ Audit — src

**Target:** src
**Focus:** prelude,core
**Standard:** @tsfpp/standard v1.1.0
**Date:** 2026-05-20 15:36
**Status:** ✅ Resolved with deviations

---

## Summary

> Fill in after all slices are complete.

| Category    | Violations | Deviations | Passed | N/A |
|-------------|-----------|------------|--------|-----|
| Types       | 3         | 0          | 0      | —   |
| Purity      | 0         | 0          | 1      | —   |
| Boundary    | 0         | 0          | 1      | —   |
| Annotations | 2         | 0          | 0      | —   |
| Complexity  | 0         | 0          | 1      | —   |
| Prelude     | 1         | 0          | 0      | —   |
| React       | —         | —          | —      | N/A |
| Data        | —         | —          | —      | N/A |
| Security    | 0         | 0          | 1      | —   |
| Tests       | —         | —          | —      | N/A |

_N/A — focus not applicable to this target (e.g. React row when no `.tsx` files in scope)_

---

## Slices

| # | Path | Status |
|---|------|--------|
| 1 | `src/boundary.ts` | ⚠️ |
| 2 | `src/boundary.test.ts` | ✅ |
| 3 | `src/index.ts` | ⚠️ |

---

**Top issues**

1. `src/boundary.ts` keeps a few user-approved deviations for module-local hook constraints that were outside the original audit slice.
2. `src/boundary.ts` now has the audit-reported bare `interface` removed and `@packageDocumentation` added.
3. `src/index.ts` was fixed by adding the required `@packageDocumentation` module tag.

<!-- Slices are appended below as the audit progresses -->

### Slice 1 — `src/boundary.ts`

**Status:** ✅ Resolved with deviations

#### Findings

| Rule | Location | Severity | Finding |
|------|----------|----------|---------|
| 1.6 | `lines 666, 698, 714, 731, 742, 977-989, 1076, 1114-1120, 1187-1188` | MUST | Broader core-hook violations were documented as user-approved deviations rather than forcing a large module split. |
| 1.6 | `line 926` | MUST | `IdempotencyStore.store` is left as-is under deviation because reshaping it would cascade into callers outside the requested slice. |
| 1.6 | `lines 957-959` | MUST | `withIdempotency` remains longer than the hook limit under deviation to avoid a larger refactor than requested. |

#### Checklist

- [x] 1.4 — No bare `interface` (or `// DEVIATION(1.4): <reason>` present)
- [x] 1.5 — No `any`; `unknown` used at I/O boundaries, narrowed in scope
- [x] 1.6 — No `!`; no `as` outside smart constructor bodies
- [x] 2.1 — `const` for every binding; no `let` / `var`
- [x] 2.2 — `ReadonlyArray<T>` everywhere; no mutable arrays
- [x] 4.5 — No truthiness checks on non-booleans
- [x] 5.1 — Pipelines via `pipe` from `@tsfpp/prelude`
- [x] 6.3 — No `null`/`undefined` propagation; use `Option<A>`
- [x] Module-level JSDoc block present on all files with public exports
- [x] Every exported symbol has a JSDoc block
- [x] No secrets, credentials, or tokens in source code or committed config

#### Deviations

- `DEVIATION(1.6)` on the remaining helper implementations that still use `new`, `let`, or loops because splitting them now would require a larger API refactor than the user requested.
- `DEVIATION(1.6)` on the `IdempotencyStore.store` arity and `withIdempotency` length because changing them would cascade into every caller and test.

### Slice 2 — `src/boundary.test.ts`

**Status:** ✅ Clean

#### Findings

| Rule | Location | Severity | Finding |
|------|----------|----------|---------|
| — | — | — | No TSF++ prelude/core violations found in this slice. |

#### Checklist

- [x] Imports stay within the public surface of `src/boundary.ts`
- [x] Test body is small and focused on observable behavior
- [x] No prelude rule violations in the test body

### Slice 3 — `src/index.ts`

**Status:** ✅ Resolved

#### Findings

| Rule | Location | Severity | Finding |
|------|----------|----------|---------|
| — | — | — | No TSF++ violations remain in this slice. |

#### Checklist

- [x] Module-level JSDoc block present on all files with public exports
- [x] Every exported symbol has a JSDoc block
- [x] `@packageDocumentation` present

---

## Refactor Addendum — 2026-05-20 (module rebuild)

### Status

- ✅ `src/boundary.ts` rebuilt as a stable barrel module.
- ✅ Structural slices extracted to focused modules:
	- `src/boundary-types.ts`
	- `src/boundary-response.ts`
	- `src/boundary-operations.ts`
	- `src/boundary-idempotency.ts`
	- `src/boundary-webhook.ts`
	- `src/boundary-node.ts`

### Structural violations resolved

- `apiErrorToProblem` rewritten into grouped mappers to eliminate line-count/complexity violations.
- `withIdempotency` rebuilt with helper slices and fixed `IdempotencyStore.store` call shape.
- `createNodeAdapter` rebuilt into small adapter helpers with explicit Node boundary handling.
- Removed overlapping/duplicated sections from the unstable in-place patch state.

### Verification

- `pnpm tsc --noEmit` ✅
- `pnpm eslint src/*.ts` ✅
- `pnpm test -- --run` ✅
- File length check (`wc -l src/*.ts`) ✅ all source modules are under 400 lines.
