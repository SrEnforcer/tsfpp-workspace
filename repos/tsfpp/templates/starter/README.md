# TSF++ Starter

A minimal TypeScript project scaffold that follows the TSF++ coding standard
out of the box.

## Quick start

```sh
# Clone via degit (no git history)
npx degit tsfpp/tsfpp/templates/starter my-project
cd my-project
pnpm install
pnpm typecheck
pnpm lint
pnpm test
```

## What is included

| File | Purpose |
|------|---------|
| `package.json` | Dependencies: `@tsfpp/prelude`, `@tsfpp/eslint-config`, `@tsfpp/tsconfig` |
| `tsconfig.json` | Extends `@tsfpp/tsconfig/app` — maximum strictness, no emit |
| `eslint.config.js` | Extends `@tsfpp/eslint-config` |
| `src/index.ts` | Entry point — demonstrates smart constructors, `Result`, and exhaustive error formatting |
| `src/index.test.ts` | Vitest unit test skeleton |
| `commitlint.config.js` | Enforces Conventional Commits on commit messages |
| `.gitignore` | Node / TypeScript ignores |

## Scripts

| Script | Command |
|--------|---------|
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | `eslint src` |
| `pnpm test` | `vitest run` |
| `pnpm test:watch` | `vitest` |
| `pnpm test:coverage` | `vitest run --coverage` |

## Next steps

1. Read `CODING_STANDARD.md` in the `@tsfpp/standard` repo — especially §1 (types),
   §2 (immutability), §3 (functions), and §8 (totality).
2. Model your domain as discriminated unions before writing any logic.
3. Return `Result<T, E>` from every fallible function.
4. Wire effects at the boundary; keep core logic pure.
5. If you deviate from a MUST rule, add a `// DEVIATION(N.M): <reason>` comment
   and record project-wide deviations in a `DEVIATIONS.md` at your repo root.
