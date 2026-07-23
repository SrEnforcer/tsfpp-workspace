# Getting Started

This guide gets a TSF++ setup running in minutes.

## Prerequisites

- Node.js 18+ (recommended baseline)
- pnpm 9+
- TypeScript project using ESM

## Install

```bash
pnpm add -D typescript eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-functional
pnpm add -D @tsfpp/tsconfig @tsfpp/eslint-config
pnpm add @tsfpp/prelude
```

## Configure TypeScript

Create or update `tsconfig.json`:

```jsonc
{
  "extends": "@tsfpp/tsconfig/app",
  "include": ["src", "tests"]
}
```

For libraries, use `@tsfpp/tsconfig/lib`.

## Configure ESLint

Create `eslint.config.js`:

```js
import tsfpp from '@tsfpp/eslint-config'

export default tsfpp
```

## First TSF++ function

```typescript
import { absurd } from '@tsfpp/prelude'

type Shape =
  | { readonly kind: 'circle'; readonly radius: number }
  | { readonly kind: 'rect'; readonly width: number; readonly height: number }

export const area = (shape: Shape): number => {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2
    case 'rect':
      return shape.width * shape.height
    default:
      return absurd(shape)
  }
}
```

## Verify setup

Run:

```bash
pnpm exec tsc --noEmit
pnpm exec eslint .
```

If both commands pass, your project baseline is aligned with TSF++.

## Next steps

- Read the full rules in the `@tsfpp/standard` spec (`spec/CODING_STANDARD.md`)
- Review rationale documents in `spec/rationale/`
- Use `spec/examples/` as implementation references
