# @tsfpp/tsconfig

Shared TypeScript compiler configuration presets for [TSF++](../../spec/CODING_STANDARD.md) projects.

All mandatory compiler flags from [Rule 9.1](../../spec/CODING_STANDARD.md#rule-91) are enforced in every preset. Projects extend one of the three presets and add only path, include, and project-specific options on top.

## Presets

| Preset | File | Use for |
|--------|------|---------|
| `base` | `tsconfig.base.json` | Extend in other presets; never use directly |
| `lib`  | `tsconfig.lib.json`  | Publishable npm packages (`declaration: true`, `composite: true`) |
| `app`  | `tsconfig.app.json`  | Applications and tools (`noEmit: true`) |

## Installation

```sh
pnpm add -D @tsfpp/tsconfig typescript
```

## Usage

### Library package (`tsconfig.json`)

```jsonc
{
  "extends": "@tsfpp/tsconfig/lib",
  "compilerOptions": {
    "rootDir": "src"
  },
  "include": ["src"]
}
```

### Application (`tsconfig.json`)

```jsonc
{
  "extends": "@tsfpp/tsconfig/app",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "tests"]
}
```

## Mandatory flags (Rule 9.1)

Every preset enforces the full set of flags required by the TSF++ specification:

| Flag | Why it is mandatory |
|------|---------------------|
| `strict` | Enables all strict sub-checks |
| `noUncheckedIndexedAccess` | Index access returns `T \| undefined`, preventing `!` violations (Rule 1.6) |
| `exactOptionalPropertyTypes` | Distinguishes absent from `undefined` (Rule 3.7) |
| `noImplicitOverride` | Requires explicit `override` keyword |
| `noFallthroughCasesInSwitch` | Enforces exhaustive `switch` (Rule 4.1) |
| `useUnknownInCatchVariables` | Catch variables are `unknown`, not `any` (Rule 1.5) |
| `verbatimModuleSyntax` | Prevents runtime impact from type-only imports |
| `isolatedModules` | Each file must be independently compilable |
| `noPropertyAccessFromIndexSignature` | Forces bracket notation for dynamic key access |
| `forceConsistentCasingInFileNames` | Prevents cross-platform import casing bugs |

See [spec/rationale/09-tooling.md](../../spec/rationale/09-tooling.md) for the extended justification of each flag.
