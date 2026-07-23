---
description: "TypeScript comment quality guardrails: enforce module/API/export JSDoc and metadata-rich tech-debt annotations in TSF++ style"
applyTo: "**/*.ts,**/*.tsx,**/*.js,**/*.jsx"
---

# TSF++ Comment Quality Instruction

Use this instruction when writing, reviewing, or refactoring TypeScript/JavaScript code in this repository.

Primary references:
- [CODING_STANDARD.md](../../spec/CODING_STANDARD.md)
- [docs-commenting.instructions.md](./docs-commenting.instructions.md)
- [copilot-instructions.md](../copilot-instructions.md)

## Scope

This instruction governs comment and documentation quality only.
Do not use it to alter runtime behavior unless explicitly requested.

## Must Enforce

1. Export JSDoc coverage:
- Every exported symbol must include JSDoc.
- JSDoc must describe purpose, preconditions/invariants, and return/error semantics.
- For combinators and algebraic helpers, include law notes when relevant.

2. Module-level intent:
- Add a concise module header when file intent, invariants, or architectural boundary is non-obvious.

3. Reminder tags and metadata:
- Allowed tags: TODO, FIXME, HACK, NOTE, OPTIMIZE, BUG, XXX.
- New reminders must include metadata per repository standard (date, author, and ticket when available).
- Keep reminder text actionable and specific.

4. Language and clarity:
- English only for comments and docs.
- Comments must explain why or non-obvious constraints, not restate code.
- Remove stale or redundant comments when touching related lines.

## Review Output Expectations

When reviewing comment quality, report:
1. Missing JSDoc on exports (with file/line references).
2. Weak or misleading comments requiring rewrite.
3. Reminder annotations missing required metadata.
4. Suggested minimal patches to fix comment quality issues.

## Non-goals

- Do not duplicate full TSF++ rules here.
- Link to canonical docs instead of embedding large policy text.
