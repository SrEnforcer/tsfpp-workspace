# TSF++ Audit — src

**Target:** src
**Focus:** testing,prelude,boundary
**Standard:** @tsfpp/standard v1.1.0
**Date:** 2026-05-20 16:52
**Status:** ✅ Resolved

---

## Summary

> Completed after slice-by-slice remediation and verification.

| Category    | Violations | Deviations | Passed | N/A |
|-------------|-----------|------------|--------|-----|
| Types       | 0         | 0          | 9      | 0   |
| Purity      | 0         | 0          | 9      | 0   |
| Boundary    | 0         | 0          | 9      | 0   |
| Annotations | 0         | 0          | 9      | 0   |
| Complexity  | 0         | 0          | 9      | 0   |
| Prelude     | 0         | 0          | 9      | 0   |
| React       | 0         | 0          | 0      | 9   |
| Data        | 0         | 0          | 0      | 9   |
| Security    | 0         | 0          | 9      | 0   |
| Tests       | 0         | 0          | 1      | 8   |

_N/A — focus not applicable to this target (e.g. React row when no `.tsx` files in scope)_

---

## Slices

| # | Path | Status |
|---|------|--------|
| 1 | `src/boundary-types.ts` | ✅ |
| 2 | `src/boundary-response.ts` | ✅ |
| 3 | `src/boundary-operations.ts` | ✅ |
| 4 | `src/boundary-idempotency.ts` | ✅ |
| 5 | `src/boundary-webhook.ts` | ✅ |
| 6 | `src/boundary-node.ts` | ✅ |
| 7 | `src/boundary.test.ts` | ✅ |
| 8 | `src/boundary.ts` | ✅ |
| 9 | `src/index.ts` | ✅ |

---

<!-- Slices are appended below as the audit progresses -->

### Slice 1 — `src/boundary-types.ts`

**Status:** ✅ Fixed

#### Findings

| Rule | Location | Severity | Finding |
|------|----------|----------|---------|
| — | — | RESOLVED | No open violations remain in this slice. |

#### Resolved

- Replaced nullish fallback paths in `mkProblem` with `fromNullable` + `getOrElse` combinators.
- Removed all `??` usage from this slice.

#### Checklist

**Prelude focus**
- [x] No nullability checks in any form and no `x ?? y`; Option combinators used instead
- [x] No `try/catch` outside adapter boundaries; `tryCatch` used for fallible parsing
- [x] No `.map()` on fallible function without traversal combinators
- [x] No `new Map()` / `new Set()`
- [x] Prelude ADTs accessed via guards (`isSome`, `isOk`), not direct `._tag`
- [x] No `Result<void, E>` introduced

**Boundary focus**
- [x] Exported boundary primitives are thin and transport-focused (no domain/infrastructure coupling)
- [x] Error/value shapes are modelled as ADTs suitable for `apiErrorToResponse` mapping
- [x] No direct `new Response()` use in this module

**Testing focus**
- [x] N/A for this non-test source slice

**Cross-cutting (always active)**
- [x] Module-level JSDoc and exported symbol JSDoc present
- [x] Code markers follow required marker format
- [x] No secrets or sensitive data embedded
- [x] No `console.*` logging
- [x] No `process.env` access

#### Deviation register

| Ref | Line | Justification |
|-----|------|---------------|
| — | — | No explicit deviations relevant to findings in this slice. |

### Slice 2 — `src/boundary-response.ts`

**Status:** ✅ Clean

#### Findings

| Rule | Location | Severity | Finding |
|------|----------|----------|---------|
| — | — | CLEAN | No testing/prelude/boundary focus violations found in this slice. |

#### Checklist

**Prelude focus**
- [x] No nullability anti-patterns (`x ?? y`, raw null/undefined guards) detected
- [x] Prelude ADT branches use guards (`isSome`) instead of direct `._tag` checks
- [x] No forbidden `try/catch` in core logic

**Boundary focus**
- [x] Error mapping remains centralized (`apiErrorToProblem`, `apiErrorToResponse`)
- [x] Response construction is wrapped in boundary helper and explicitly deviation-marked
- [x] No handler/domain coupling introduced

**Testing focus**
- [x] N/A for this non-test source slice

**Cross-cutting (always active)**
- [x] Module/export JSDoc present
- [x] No sensitive data exposure
- [x] No `console.*` usage
- [x] No `process.env` usage

#### Deviation register

| Ref | Line | Justification |
|-----|------|---------------|
| DEVIATION(1.9) | `line 24` | `Response` construction is intentionally localized to HTTP adapter helper. |

### Slice 3 — `src/boundary-operations.ts`

**Status:** ✅ Fixed

#### Findings

| Rule | Location | Severity | Finding |
|------|----------|----------|---------|
| — | — | RESOLVED | No open violations remain in this slice. |

#### Resolved

- Refactored pagination query parsing to use `fromNullable`/`getOrElse` and Option guards.
- Refactored CORS option/default handling to Option combinators and removed all null/undefined checks.

#### Checklist

**Prelude focus**
- [x] No nullability checks in any form and no `x ?? y`; Option combinators used instead
- [x] No `try/catch` outside adapter boundaries
- [x] No `new Map()` / `new Set()`
- [x] No direct prelude ADT discriminant access

**Boundary focus**
- [x] Boundary response helpers and envelope types are present
- [x] Error-returning parse path uses typed `Result`
- [x] No direct handler/db coupling in this module

**Testing focus**
- [x] N/A for this non-test source slice

**Cross-cutting (always active)**
- [x] Module/export JSDoc present
- [x] Security headers and CORS contract notes present
- [x] No `console.*` usage
- [x] No `process.env` usage

#### Deviation register

| Ref | Line | Justification |
|-----|------|---------------|
| DEVIATION(1.9) | `line 22` | `Date` construction is isolated to operation timestamp helper. |

### Slice 4 — `src/boundary-idempotency.ts`

**Status:** ✅ Fixed

#### Findings

| Rule | Location | Severity | Finding |
|------|----------|----------|---------|
| — | — | RESOLVED | No open violations remain in this slice. |

#### Resolved

- Reworked idempotency-key extraction to Option presence checks (`fromNullable`, `isNone`).
- Replaced principal fallback `??` with `getOrElse` + `fromNullable`.

#### Checklist

**Prelude focus**
- [x] No nullability checks in any form and no `x ?? y`; Option combinators used instead
- [x] No direct prelude ADT discriminant access
- [x] No `new Map()` / `new Set()`

**Boundary focus**
- [x] `withIdempotency` middleware exists and handles replay/in-flight/conflict states
- [x] Structured response replay uses persisted status/headers/body snapshot
- [x] Request logging middleware keeps route template separate from resolved URL input

**Testing focus**
- [x] N/A for this non-test source slice

**Cross-cutting (always active)**
- [x] Module/export JSDoc present
- [x] No secrets embedded
- [x] No `console.*` usage
- [x] No `process.env` usage

#### Deviation register

| Ref | Line | Justification |
|-----|------|---------------|
| DEVIATION(1.9) | `line 20` | Date construction intentionally isolated to request-log timestamp helper. |
| DEVIATION(1.9) | `line 26` | TextEncoder construction used at hashing boundary. |
| DEVIATION(1.9) | `line 34` | Response construction confined to HTTP boundary helper. |

### Slice 5 — `src/boundary-webhook.ts`

**Status:** ✅ Fixed

#### Findings

| Rule | Location | Severity | Finding |
|------|----------|----------|---------|
| — | — | RESOLVED | No open violations remain in this slice. |

#### Resolved

- Replaced webhook default handling with `fromNullable` + `getOrElse`.

#### Checklist

**Prelude focus**
- [x] No nullability checks in any form and no `x ?? y`; Option combinators used instead
- [x] No direct prelude ADT discriminant access
- [x] No `new Map()` / `new Set()`

**Boundary focus**
- [x] Webhook signer/verifier remain transport-boundary utilities
- [x] Verification includes timestamp freshness and signature scheme checks

**Testing focus**
- [x] N/A for this non-test source slice

**Cross-cutting (always active)**
- [x] Module/export JSDoc present
- [x] No secrets hardcoded
- [x] No `console.*` usage
- [x] No `process.env` usage

#### Deviation register

| Ref | Line | Justification |
|-----|------|---------------|
| DEVIATION(1.9) | `line 11` | TextEncoder construction localized to crypto boundary helper. |

### Slice 6 — `src/boundary-node.ts`

**Status:** ✅ Fixed

#### Findings

| Rule | Location | Severity | Finding |
|------|----------|----------|---------|
| — | — | RESOLVED | No open violations remain in this slice. |

#### Resolved

- Replaced adapter default fallbacks with `fromNullable` + `getOrElse`.
- Replaced explicit undefined close-callback check with Option guard.
- Removed tuple assertion workaround by switching header normalization to `Object.fromEntries`.

#### Checklist

**Prelude focus**
- [x] No nullability checks in any form and no `x ?? y`; Option combinators used instead
- [x] `try/catch` used only at adapter boundary (Node callback-to-Promise bridge)
- [x] No direct prelude ADT discriminant access

**Boundary focus**
- [x] Adapter isolates Node transport concerns from Fetch handler core
- [x] Request/response conversion remains confined to boundary wrapper helpers

**Testing focus**
- [x] N/A for this non-test source slice

**Cross-cutting (always active)**
- [x] Module/export JSDoc present
- [x] No secrets or credentials embedded
- [x] No `console.*` usage
- [x] No `process.env` usage

#### Deviation register

| Ref | Line | Justification |
|-----|------|---------------|
| DEVIATION(1.9) | `line 63` | `new Request(...)` is used at the Node-to-Fetch adapter boundary. |
| DEVIATION(1.9) | `line 119` | `new Promise(...)` wraps callback API at async boundary. |
| DEVIATION(2.3) | `line 71` | Node `ServerResponse` mutation is required by runtime API contract. |

### Slice 7 — `src/boundary.test.ts`

**Status:** ✅ Fixed

#### Findings

| Rule | Location | Severity | Finding |
|------|----------|----------|---------|
| — | — | RESOLVED | No open violations remain in this slice. |

#### Resolved

- Split combined assertion tests into four single-concept behavioural tests.

#### Checklist

**Testing focus**
- [x] Assertions target observable outputs
- [x] Descriptions express behaviour
- [x] One logical assertion concept per test
- [x] No forbidden patterns (`vi.fn`, `getByTestId`, snapshots, `setTimeout`)

**Prelude focus**
- [x] No nullability anti-patterns detected
- [x] Prelude guards used idiomatically (`isSome`, `isNone`)

**Boundary focus**
- [x] Test validates public boundary constructors via public module export

**Cross-cutting (always active)**
- [x] No secrets or sensitive data
- [x] No `console.*` usage
- [x] No `process.env` usage

#### Deviation register

| Ref | Line | Justification |
|-----|------|---------------|
| — | — | No deviations declared in this slice. |

### Slice 9 — `src/index.ts`

**Status:** ✅ Clean

#### Findings

| Rule | Location | Severity | Finding |
|------|----------|----------|---------|
| — | — | CLEAN | Index barrel is annotation-complete and introduces no testing/prelude/boundary violations. |

#### Checklist

**Prelude focus**
- [x] No nullability or fallback anti-patterns
- [x] No direct prelude discriminant access

**Boundary focus**
- [x] Public package surface remains thin and cohesive

**Testing focus**
- [x] N/A for this non-test source slice

**Cross-cutting (always active)**
- [x] Module-level JSDoc present with `@packageDocumentation`
- [x] No security/log/config violations

#### Deviation register

| Ref | Line | Justification |
|-----|------|---------------|
| — | — | No deviations declared in this slice. |

---

## Top issues

1. No open MUST/SHOULD violations remain for focus `testing,prelude,boundary`.
2. Residual risk: monitor future edits for nullability regressions (`??`, direct null/undefined checks).
3. Residual risk: maintain one-concept-per-test discipline in future test additions.

### Slice 8 — `src/boundary.ts`

**Status:** ✅ Clean

#### Findings

| Rule | Location | Severity | Finding |
|------|----------|----------|---------|
| — | — | CLEAN | Barrel module is annotation-complete and introduces no testing/prelude/boundary violations. |

#### Checklist

**Prelude focus**
- [x] No nullability anti-patterns
- [x] No direct discriminant or mutable collection anti-patterns

**Boundary focus**
- [x] Public boundary surface re-exports are cohesive and transport-layer scoped

**Testing focus**
- [x] N/A for this non-test source slice

**Cross-cutting (always active)**
- [x] Module-level JSDoc present with `@packageDocumentation`
- [x] No secrets/log/config violations

#### Deviation register

| Ref | Line | Justification |
|-----|------|---------------|
| — | — | No deviations declared in this slice. |
