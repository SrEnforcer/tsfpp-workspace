---
name: "TSF++ Project Audit"
description: "Audit selected or all workspace projects for TSF++ compliance, shortcomings, debt reminders, and justified lint-exclusion hints"
argument-hint: "Optional project names or paths (e.g., apps/web, packages/engine); leave empty to audit all projects in this folder"
agent: "agent"
---

Audit projects in this workspace for adherence to the TSF++ coding standard.

Inputs:
- Optional arguments can include one or more project names or paths.
- If arguments are provided, audit only the matching projects.
- If no arguments are provided, audit all projects in this folder.

Standards and references:
- Use [TSF++ standard](../../spec/CODING_STANDARD.md).
- Follow repository guidance in [copilot instructions](../copilot-instructions.md).
- For reminder formatting and annotation quality, use [commenting instructions](../instructions/docs-commenting.instructions.md).

Audit requirements:
1. List shortcomings and violations with severity ordering: Critical, High, Medium, Low.
2. For each finding, include file and line references plus a brief rationale.
3. Add or propose code reminders with tags where logically needed:
   - `TODO`, `FIXME`, `HACK`, `NOTE`, `OPTIMIZE`, `BUG`, `XXX`
4. Identify missing module/API/export JSDoc in touched scope and propose concise additions.
5. Provide lint hints only when rationale is sufficient to justify an exclusion or suppression.
   - Do not suggest blanket disables.
   - Prefer the narrowest scope and include why the exclusion is justified.

Execution guidance:
1. Discover scope based on provided arguments.
2. Run lint/typecheck/tests for impacted project(s) when feasible.
3. Convert generic lint/type output into actionable TSF++-aligned hints.
4. Keep edits minimal and behavior-preserving when applying fixes.

Output format:
1. Findings (Critical, High, Medium, Low)
2. Applied fixes or suggested fixes
3. Verification summary (lint/typecheck/tests)
4. Residual risks and follow-ups

Constraints:
- English only in comments and docs.
- Never fabricate authors, dates, tickets, or tool outcomes.
- Do not weaken types to silence lint/type errors.