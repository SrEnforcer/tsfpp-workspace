# @tsfpp/eslint-config

Shared ESLint flat configuration for [TSF++](../../spec/CODING_STANDARD.md) projects.

Enforces the machine-checkable subset of TSF++ rules via `@typescript-eslint` and `eslint-plugin-functional`. Every active rule references the spec rule it enforces.

## Requirements

- ESLint ≥ 9 (flat config format)
- TypeScript ≥ 5.3
- A `tsconfig.json` reachable from each linted file

## Installation

```sh
pnpm add -D @tsfpp/eslint-config \
  eslint \
  typescript \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  eslint-plugin-functional
```

## Usage

### Standalone

```js
// eslint.config.js
import tsfpp from '@tsfpp/eslint-config'

export default tsfpp
```

### With project-specific overrides

```js
// eslint.config.js
import tsfpp from '@tsfpp/eslint-config'

export default [
  ...tsfpp,
  {
    // Relax console warnings in scripts
    rules: { 'no-console': 'off' },
  },
]
```

### With `@tsfpp/tsconfig`

```js
// eslint.config.js
import tsfpp from '@tsfpp/eslint-config'

export default [
  ...tsfpp,
  {
    languageOptions: {
      parserOptions: {
        // Point to your project tsconfig explicitly if needed
        project: './tsconfig.json',
      },
    },
  },
]
```

## Enforced rules

| ESLint rule | TSF++ rule | Level |
|-------------|------------|-------|
| `@typescript-eslint/no-explicit-any` | 1.5 | MUST |
| `@typescript-eslint/no-non-null-assertion` | 1.6 | MUST |
| `@typescript-eslint/consistent-type-assertions: never` | 1.6 | MUST |
| `@typescript-eslint/switch-exhaustiveness-check` | 1.2 / 4.1 | MUST |
| `@typescript-eslint/explicit-function-return-type` | 3.1 | MUST |
| `@typescript-eslint/strict-boolean-expressions` | 4.5 | MUST |
| `@typescript-eslint/no-floating-promises` | 6.4 | SHOULD |
| `@typescript-eslint/prefer-readonly` | 2.2 | MUST |
| `functional/no-let` | 2.1 | MUST |
| `functional/no-loop-statements` | 4.2 | MUST |
| `functional/no-throw-statements` | 6.2 | MUST |
| `functional/prefer-readonly-type` | 2.2 | MUST |
| `functional/immutable-data` | 2.3 | MUST |
| `functional/no-classes` | 1.9 | MUST |
| `functional/no-this-expressions` | 1.9 | MUST |
| `complexity: 10` | 3.4 | MUST |
| `max-depth: 4` | 3.4 | MUST |
| `max-lines-per-function: 40` | 3.4 | MUST |
| `eqeqeq: always` | 4.5 | MUST |
| `no-param-reassign` | 2.3 | MUST |

## Handling permitted deviations

Some TSF++ rules permit deviations at specific boundaries. Use `eslint-disable-next-line` with a paired `DEVIATION` comment so deviations are explicit and auditable:

```typescript
// DEVIATION(1.6): `as` permitted inside smart constructor boundary
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
return raw as NodeId
```

```typescript
// DEVIATION(6.2): adapter boundary — wraps third-party throw in Result
// eslint-disable-next-line functional/no-throw-statements
throw new Error('unreachable')
```

This makes every deviation visible to the TSF++ Audit agent and during code review.

## See also

- [spec/CODING_STANDARD.md §9](../../spec/CODING_STANDARD.md#9--compiler-and-tooling-configuration) — normative rule reference
- [spec/rationale/09-tooling.md](../../spec/rationale/09-tooling.md) — extended justification
- [@tsfpp/tsconfig](../tsconfig/README.md) — companion TypeScript config presets
