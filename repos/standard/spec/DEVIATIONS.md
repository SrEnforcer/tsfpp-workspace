# DEVIATIONS.md — Project-Wide Deviation Ledger

Any deviation from a **MUST** rule in `CODING_STANDARD.md` that applies
project-wide (rather than to a single callsite) must be recorded here.
Callsite-scoped deviations require only an inline comment; they do not need an
entry in this file.

See §Deviation Procedure in `CODING_STANDARD.md` for the full process.

---

## How to record a deviation

Copy the template below, fill in every field, and open a PR. The PR must
include at least one reviewer approval before the deviation is considered
active.

```markdown
### DEV-NNN — Rule N.M: <Rule title>

| Field        | Value |
|--------------|-------|
| ID           | DEV-NNN |
| Rule         | N.M — <Rule title> |
| Scope        | `path/to/module/` or repo-wide |
| Status       | active \| superseded \| revoked |
| Approved by  | @handle on YYYY-MM-DD |
| Reviewed at  | YYYY-MM-DD (revisit date or "ongoing") |

**Justification**

One paragraph explaining why the rule cannot be followed in this scope. Include
any alternatives considered and why they were rejected.

**Mitigation**

How the risk introduced by the deviation is managed (e.g., additional tests,
runtime guards, wrapper boundary, code review focus).

**Revocation condition**

What would need to change for this deviation to be removed (e.g., "Once
`lib-x` ships a typed wrapper", "After the legacy module is replaced").
```

---

## Active deviations

_No active project-wide deviations at initial release._

---

## Superseded deviations

_None._

---

## Example: a well-formed deviation entry

The entry below is illustrative. It is **not** active in this repository.

---

### DEV-001 — Rule 1.4: No `interface` declarations

| Field        | Value |
|--------------|-------|
| ID           | DEV-001 |
| Rule         | 1.4 — No `interface` declarations |
| Scope        | archived legacy scope (`@tsfpp/prelude` prior to monorepo extraction) |
| Status       | superseded |
| Approved by  | @maintainer on 2026-03-01 |
| Reviewed at  | 2026-04-15 (superseded when vendor type was updated) |

**Justification**

The third-party library `lib-untyped` ships without TypeScript declarations.
The hand-authored ambient declaration file uses `interface` because the vendor
surface mixes nominal identity with structural typing, and a discriminated
union would require re-exporting the vendor's enum values — values that are
subject to change outside our control.

**Mitigation**

The declaration file is isolated behind a facade in `src/adapters/lib-untyped.ts`
that converts the vendor types to internal ADTs at the boundary (Rule 6.2).
No `interface` leaks past the adapter boundary.

**Revocation condition**

Vendor publishes official `@types/lib-untyped` with structural types compatible
with the TSF++ prelude. At that point, the hand-authored declaration is deleted
and this deviation is revoked.

---

## Inline deviation format (callsite scope)

For deviations limited to a single function or expression, record only an
inline comment. No ledger entry is required.

```typescript
// DEVIATION(1.6): `as BrandedId` is inside a smart constructor body;
// the only `as` in this module, guarded by a runtime validator above.
const make = (raw: string): BrandedId => raw as BrandedId
```

The format is: `// DEVIATION(RULE_NUMBER): <one-line justification>`.

---

### DEV-002 — Rule 8.2: Property-based testing with fast-check

| Field        | Value |
|--------------|-------|
| ID           | DEV-002 |
| Rule         | 8.2 — Property-based testing with fast-check is mandatory for all pure functions in the core |
| Scope        | `@tsfpp/mcp-server` |
| Status       | active |
| Approved by  | @maintainer on 2026-07-25 |
| Reviewed at  | 2026-07-25 (revisit by 2026-10-31) |

**Justification**

`@tsfpp/mcp-server` has example-based tests but no property-based suite. This is
a genuine, currently-unremediated violation of a MUST rule, recorded here rather
than left implicit.

The package is largely I/O and protocol plumbing (MCP request handling, file
reads, rule-index construction from the on-disk spec). Its pure fragment —
principally `lib/rule-index.ts` — is a parser over the standard's own Markdown
and is the part that genuinely warrants generated input.

`@tsfpp/prelude` and `@tsfpp/boundary` are compliant as of prelude 2.1.0 and
boundary 2.2.0 respectively. `@tsfpp/agents` contains no TypeScript source
(Markdown assets plus a Node build script), so Rule 8.2 does not apply to it.

**Mitigation**

Example-based tests cover the rule-index construction paths and the tool
handlers. The package sits outside the domain core: nothing depends on it at
runtime, and a defect surfaces as degraded AI-assistant guidance rather than as
incorrect production behaviour.

**Revocation condition**

A `fast-check` suite covers `lib/rule-index.ts`'s parsing invariants — at
minimum: every rule id extracted round-trips to the section it was parsed from,
parsing never throws on arbitrary Markdown, and the index is total over the
spec's rule set. Revisit no later than 2026-10-31.

---

### DEV-003 — Rule 11.2: Maximum file length

| Field        | Value |
|--------------|-------|
| ID           | DEV-003 |
| Rule         | 11.2 — Maximum file length is 400 lines (800 absolute with deviation) |
| Scope        | `@tsfpp/boundary` — `src/boundary-types.ts` (436 lines) |
| Status       | active |
| Approved by  | @maintainer on 2026-07-25 |
| Reviewed at  | 2026-07-25 (revisit when the file next changes materially) |

**Justification**

`boundary-types.ts` is 36 lines over the 400-line soft limit and well inside the
800-line absolute ceiling. It holds one cohesive unit: the branded boundary
identifiers, their smart constructors, request-context extraction, and the
`ApiError` taxonomy with its Problem Details mapping. Splitting it would separate
the `ApiError` union from the constructors that build its variants, which Rule
11.1 explicitly asks to keep together ("collocate related sum type and its
constructors in the same module").

**Mitigation**

The module is already decomposed at the package level — `boundary-response`,
`boundary-handler`, `boundary-operations`, `boundary-idempotency`,
`boundary-webhook`, and `boundary-node` are separate files, each comfortably
within the limit. Every export is documented, and the package barrel keeps the
public surface flat.

**Revocation condition**

The file exceeds 500 lines, or the Problem Details mapping grows enough to stand
alone — at which point `ApiError` + its constructors move to `boundary-errors.ts`
and the identifier brands stay here. Revisit whenever the file next changes
materially.
