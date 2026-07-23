# TSF++

A strict functional TypeScript coding standard, modeled after the JSF++ Air Vehicle C++ standard (Lockheed Martin) and the JPL Power of Ten rules — applied to TypeScript with algebraic data types, total functions, and immutability as first-class concerns.

> **Status:** v1.x. The standard and reference prelude are stable; integrations and tooling are evolving. Adoption reports welcome.

## What this is

This repository is the **umbrella** for the TSF++ ecosystem — documentation, adoption guides, integrations, and the starter template. The specification and the packages live in their own sibling repositories, each independently versioned and released:

1. **A specification** — [`@tsfpp/standard`](../standard/spec/CODING_STANDARD.md) — a normative set of rules for writing TypeScript that the compiler can prove correct, the type system can keep total, and reviewers can audit cheaply.
2. **A reference library** — [`@tsfpp/prelude`](../prelude) — a small, curated functional prelude (`Option`, `Result`, branded types, exhaustiveness witness, and data-last combinators) that adopters can use directly or copy as a template.
3. **Tooling & integrations** — [`@tsfpp/eslint-config`](../eslint-config), [`@tsfpp/tsconfig`](../tsconfig), [`@tsfpp/workflow`](../workflow), plus the AI-assistant bindings under [`integrations/`](integrations) and the [`templates/starter`](templates/starter) scaffold.

The layers are independent. You can adopt the spec without the prelude, the prelude without the integrations, or the integrations as a starting point for your own house style.

## Why it exists

Most TypeScript "style guides" focus on formatting and naming. TSF++ is about *correctness by construction* — the same instinct that drives JSF++ in safety-critical aerospace code, expressed in a language that lets you encode those guarantees in the type system.

Concretely, the standard forbids the constructs that historically generate the most defects in TypeScript codebases:

- `any`, non-null assertion (`!`), and `as` outside smart-constructor boundaries — the three escape hatches that defeat the type checker
- `class`, `this`, `enum`, and prototype-based inheritance — sources of hidden state and identity-vs-equality confusion
- `let`, `var`, mutating array methods, and property assignment — sources of temporal coupling and aliasing bugs
- `throw` outside adapter boundaries — invisible control flow
- `for` / `while` loops and truthiness checks on non-booleans

…and mandates the constructs that replace them: discriminated unions with exhaustive matching, `Option` / `Result` for partiality and failure, branded types with smart constructors, and curried data-last combinators.

The full ruleset is in [`@tsfpp/standard`](../standard/spec/CODING_STANDARD.md). The rationale behind individual rules lives in [`spec/rationale/`](../standard/spec/rationale).

## Is this for you?

TSF++ is a fit if **most** of these resonate:

- You build TypeScript systems where defects are expensive — financial, medical, infrastructure, or long-lived domain models.
- You find ML / Haskell-style discipline more compelling than the "JavaScript with types" school.
- You'd rather have the compiler prove correctness than have tests catch the same bug for the third time.
- You're prepared to invest in tooling (strict `tsconfig`, ESLint with `eslint-plugin-functional`) to enforce the rules deterministically.
- You can accept that "we always did it this way" is not a counter-argument to a forbidden construct.

TSF++ is **not** a fit if you need rapid prototyping at the expense of correctness, you maintain a large existing codebase you cannot incrementally migrate, or you find `Result<T, E>` more ceremonial than `throw`.

## Quickstart

Install the prelude plus required TypeScript and ESLint tooling:

```bash
pnpm add @tsfpp/prelude
pnpm add -D typescript eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-functional
pnpm add -D @tsfpp/eslint-config @tsfpp/tsconfig
```

Extend the strict `tsconfig`:

```jsonc
// tsconfig.json
{
  "extends": "@tsfpp/tsconfig/app",
  "include": ["src/**/*.ts"]
}
```

Use the ESLint config:

```js
// eslint.config.mjs
import tsfpp from "@tsfpp/eslint-config"
export default tsfpp
```

Then write your first total function:

```typescript
import { absurd } from "@tsfpp/prelude"

type Shape =
  | { readonly kind: "circle"; readonly radius: number }
  | { readonly kind: "rect"; readonly width: number; readonly height: number }

const area = (s: Shape): number => {
  switch (s.kind) {
    case "circle": return Math.PI * s.radius ** 2
    case "rect":   return s.width * s.height
    default:       return absurd(s)
  }
}
```

Add a new variant to `Shape`, watch the compiler refuse to build until every consumer handles it. That's the standard at work.

## Repository layout

This umbrella repository holds the docs, integrations, and starter template:

```
docs/                    Guides — getting started, adoption, comparison, SemVer, trunk-based dev
integrations/copilot/    GitHub Copilot agents, prompts, and instructions
integrations/claude-code/  (planned) Claude Code equivalents
integrations/cursor/     (planned) Cursor equivalents
templates/starter/       Ready-to-clone TSF++ project scaffold
scripts/                 Repository helper scripts
```

The specification and the published packages live in their own sibling repositories:

```
../standard/       @tsfpp/standard — rules, philosophy, per-rule rationale and examples
../prelude/        @tsfpp/prelude — reference functional prelude
../eslint-config/  @tsfpp/eslint-config — opinionated lint rules
../tsconfig/       @tsfpp/tsconfig — strict tsconfig presets
../workflow/       @tsfpp/workflow — husky, commitlint, and release-please scaffolding
```

## Documentation

- [docs/README.md](docs/README.md) — documentation index
- [docs/getting-started.md](docs/getting-started.md) — quick onboarding
- [docs/adoption-guide.md](docs/adoption-guide.md) — incremental migration plan
- [docs/comparison.md](docs/comparison.md) — positioning vs other ecosystems
- [docs/semver-policy.md](docs/semver-policy.md) — detailed SemVer policy
- [docs/case-studies.md](docs/case-studies.md) — adoption report template

## How TSF++ relates to existing libraries

TSF++ is a **standard with a small reference prelude**, not a competitor to the established TypeScript FP libraries. They occupy a different layer.

- **fp-ts** — a comprehensive FP library with category-theoretic abstractions (Functor, Monad, Applicative typeclasses). TSF++ is intentionally smaller and avoids typeclass encoding; it borrows shapes (`Option`, `Either`) and laws but stops there. fp-ts is compatible with TSF++ rules.
- **Effect** — a runtime and effect system. TSF++ does not prescribe a runtime; it only requires that effects be *typed* (e.g. `Promise<Result<T, E>>`), not how they are scheduled. Effect is compatible with TSF++ at the application layer.
- **Remeda** — TSF++ uses Remeda for immutable, typed collection plumbing (`groupBy`, `partition`, `pick`, `sortBy`) alongside the prelude, which owns the ADTs and core combinators. (Ramda was removed as a dependency in standard v1.1.0.)

If you already use one of the libraries above, TSF++ formalizes the *discipline* around how you use it.

## Origin

TSF++ was drafted with substantial AI assistance and curated, reviewed, and iterated by the maintainer. The standard reflects deliberate design choices informed by JSF++ (Lockheed Martin), the JPL Power of Ten (Holzmann), and the ML / Haskell tradition of algebraic data types. Contributions, critiques, and real-world adoption reports are welcome — see [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Versioning

The specification and each published package follow SemVer independently:

- `@tsfpp/standard` — major bump for any rule change that can break existing adopters' code.
- `@tsfpp/prelude` — major bump for any change to ADT shape, combinator arity, argument order, or documented algebraic law.
- `@tsfpp/eslint-config` — major bump for any rule severity increase from `warn` to `error`, or any new `error`-level rule.

Each repository owns its own `CHANGELOG.md`, generated automatically by [release-please](https://github.com/googleapis/release-please) from Conventional Commits.

## Contributing

TSF++ is maintained as a curated standard. The bar for rule additions and breaking changes is high; the bar for clarifications, examples, prelude bug fixes, and new IDE integrations is low. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the process.

## Issue Types

Use the issue templates to route reports and proposals quickly:

- Rule clarification: [.github/ISSUE_TEMPLATE/rule-clarification.yml](.github/ISSUE_TEMPLATE/rule-clarification.yml)
- Rule proposal: [.github/ISSUE_TEMPLATE/rule-proposal.yml](.github/ISSUE_TEMPLATE/rule-proposal.yml)
- Prelude bug: [.github/ISSUE_TEMPLATE/prelude-bug.yml](.github/ISSUE_TEMPLATE/prelude-bug.yml)
- Integration bug: [.github/ISSUE_TEMPLATE/integration-bug.yml](.github/ISSUE_TEMPLATE/integration-bug.yml)

## Community and Security

- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) — expected behavior and enforcement model
- [SECURITY.md](SECURITY.md) — vulnerability reporting and disclosure process

## License

[MIT](LICENSE) — use, modify, and redistribute freely. Attribution appreciated, not required.

---

**Want to talk about it?** Open an issue. Adoption reports, rule critiques, and integration proposals are all valuable signal.