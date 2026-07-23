# Adoption Guide

TSF++ can be adopted incrementally. Do not attempt a full migration in one pull request.

## Migration strategy

Use a four-phase plan:

1. Tooling baseline
2. Boundary hardening
3. Core domain migration
4. Enforcement tightening

## Phase 1: Tooling baseline (no logic rewrite)

- Extend `@tsfpp/tsconfig/app` or `@tsfpp/tsconfig/lib`
- Add `@tsfpp/eslint-config`
- Run lint and type-check; categorize findings by rule family

Output: a quantified backlog grouped by high/medium/low risk.

## Phase 2: Boundary hardening

Prioritize rules that prevent hidden unsoundness:

- Replace `any` with `unknown` + local narrowing
- Remove non-null assertions (`!`)
- Restrict `as` to smart constructors with documented deviations
- Introduce `Result` / `Option` at I/O and parsing boundaries

Output: no silent unsoundness at external interfaces.

## Phase 3: Core domain migration

Refactor business logic toward TSF++ patterns:

- Replace classes/enums with discriminated unions and records
- Remove mutable updates (`push`, `sort`, property assignment)
- Replace loops with `map`/`filter`/`reduce`/`flatMap`
- Ensure exhaustive matching with `absurd`

Output: pure, testable core modules with explicit effects.

## Phase 4: Tightening and governance

- Promote remaining warnings to errors where practical
- Add deviation comments where temporary exceptions are required
- Add review checklist alignment to pull request templates
- Track progress through adoption reports

Output: stable and enforceable team standard.

## Deviation handling

Temporary deviations should be explicit and auditable.

Example:

```typescript
// DEVIATION(1.6): safe cast inside smart constructor after runtime validation
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
return value as NodeId
```

Each deviation should include:

- Rule number
- Technical justification
- Scope (single line/function/module)
- Removal plan when possible

## Recommended rollout order by risk

1. Rule family 1.x (type safety boundaries)
2. Rule family 6.x (error/effect modeling)
3. Rule family 2.x and 4.x (immutability and control flow)
4. Rule families 3.x, 5.x, 7.x, 11.x (structure and readability)

This order reduces defect risk early while keeping migration momentum realistic.
