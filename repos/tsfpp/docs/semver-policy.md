# SemVer Policy

This project applies Semantic Versioning independently per release unit:

- The specification (`spec/`)
- `@tsfpp/prelude`
- `@tsfpp/eslint-config`
- `@tsfpp/tsconfig`

## Version format

All version numbers use `MAJOR.MINOR.PATCH`.

- `MAJOR`: incompatible changes
- `MINOR`: backward-compatible additions
- `PATCH`: backward-compatible fixes and clarifications

## Pre-1.0 policy (0.x)

Until a package reaches `1.0.0`, TSF++ treats `0.x` as unstable:

- `0.MINOR` may include breaking changes
- `0.0.PATCH` is for fixes and documentation-only updates
- Consumers should pin exact versions during this phase

Full SemVer stability guarantees apply starting at `1.0.0`.

## 1) Specification versioning (`spec/`)

### MAJOR bump

Use a major bump when a rule change can require edits in an already-compliant
adopter codebase.

Examples:

- A rule level changes from `SHOULD` to `MUST`
- A previously allowed construct becomes forbidden
- A required API shape changes in examples or normative text

### MINOR bump

Use a minor bump for additive, non-breaking changes.

Examples:

- New optional guidance
- Additional rationale or examples that do not change compliance
- New rule clarifications that preserve existing behavior

### PATCH bump

Use a patch bump for editorial and correction updates.

Examples:

- Typo fixes
- Link fixes
- Non-normative wording improvements with no compliance impact

## 2) Prelude versioning (`@tsfpp/prelude`)

### MAJOR bump

- ADT shape changes (`Option`, `Result`, brand encoding, discriminants)
- Combinator signature changes (arity, argument order, return shape)
- Law-changing behavior updates for documented algebraic laws

### MINOR bump

- New combinators
- New modules or exports
- New additive helper types that do not change existing APIs

### PATCH bump

- Bug fixes preserving public signatures
- Performance improvements preserving behavior
- Documentation and type-level refinements that do not break callers

## 3) ESLint config versioning (`@tsfpp/eslint-config`)

### MAJOR bump

- Any new `error`-level rule
- Any severity increase from `warn` to `error`
- Any config change that can fail previously passing code by default

### MINOR bump

- New `warn`-level rules
- New optional config entry points
- Additional recommendations in docs

### PATCH bump

- Rule metadata/comment fixes
- Dependency range updates with no behavior change
- False-positive reduction that does not tighten enforcement

## 4) TSConfig versioning (`@tsfpp/tsconfig`)

### MAJOR bump

- Any stricter compiler flag that can fail previously passing projects
- Target/module default changes that require consumer changes

### MINOR bump

- New additive presets or documented opt-in profiles
- Non-breaking defaults where existing projects continue to compile

### PATCH bump

- Documentation updates
- Internal cleanup with no consumer-facing compiler behavior changes

## Release automation and changelogs

- Package releases are automated via release-please from Conventional Commits.
- The specification changelog is curated manually.

Suggested commit prefixes:

- `feat:` usually maps to `MINOR`
- `fix:` usually maps to `PATCH`
- `feat!:` or `fix!:` maps to `MAJOR`
- `refactor:` maps to `PATCH` unless it changes public behavior

## Compatibility promise

When in doubt, maintainers should choose the safer (higher) version bump.
Consumer trust is more important than minimizing version numbers.
