# Conventional Commits

TSF++ repositories follow [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).
Commit messages are the input to automated versioning (`release-please`) and
the generated `CHANGELOG.md` files.

---

## Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Rules

- The description is lowercase, imperative mood, no trailing period.
- Maximum 72 characters on the subject line.
- The body wraps at 100 characters.
- A blank line separates the subject from the body.
- Breaking changes are signalled by `!` after the type/scope, or by a
  `BREAKING CHANGE:` footer.

---

## Types

| Type         | Changelog section   | SemVer trigger | Use for |
|--------------|---------------------|----------------|---------|
| `feat`       | Features            | MINOR          | New rule, new combinator, new doc section |
| `fix`        | Bug Fixes           | PATCH          | Bug fix in prelude, tooling, or examples |
| `perf`       | Performance         | PATCH          | Performance improvement |
| `refactor`   | Refactoring         | PATCH          | Code change without behaviour change |
| `docs`       | Documentation       | (no release)   | Documentation-only changes |
| `test`       | (hidden)            | (no release)   | Tests only |
| `chore`      | (hidden)            | (no release)   | CI, deps, repo maintenance |
| `build`      | (hidden)            | (no release)   | Build system changes |
| `ci`         | (hidden)            | (no release)   | CI configuration changes |
| `feat!`      | Breaking Changes    | MAJOR          | Breaking rule change, breaking API change |
| `fix!`       | Breaking Changes    | MAJOR          | Breaking fix |

---

## Scopes

Use the package or layer name as the scope when the change is contained there.
Omit the scope for cross-cutting changes.

| Scope           | Applies to |
|-----------------|------------|
| `prelude`       | `../prelude/` (repo) |
| `eslint-config` | `../eslint-config/` (repo) |
| `tsconfig`      | `../tsconfig/` (repo) |
| `spec`          | `../standard/` (repo) — rules, rationale, examples |
| `copilot`       | `integrations/copilot/` |
| `docs`          | `docs/` |
| `ci`            | `.github/workflows/` |
| `workflow`      | `scripts/`; scaffolding in `../workflow/` (repo) |
| `templates`     | `templates/` |

---

## Examples

```
feat(prelude): add Result.flatMap combinator

Implements chained computation for Result<T, E> following the
left-identity and right-identity monad laws. Laws are exercised
in fp.test.ts.
```

```
fix(eslint-config): disable no-underscore-dangle for _tag fields

Discriminant fields named _tag (fp-ts convention) were incorrectly
flagged. Extend the allow list to include _tag alongside kind.
```

```
feat(spec)!: raise Rule 3.4 from SHOULD to MUST

BREAKING CHANGE: projects that have functions with more than 3 positional
parameters without a DEVIATION record will now fail spec compliance checks.
```

```
docs: add incremental adoption section to getting-started guide
```

```
chore(ci): pin actions/setup-node to v4.2.0
```

---

## Breaking changes

Always include a `BREAKING CHANGE:` footer (or `!` suffix) when the change
requires adopters to update their code, configuration, or deviation records.
Describe what breaks and how to migrate.

```
feat(prelude)!: rename pipe to flow to align with fp-ts naming

BREAKING CHANGE: `pipe` is renamed to `flow`. Update all imports:
  - Before: import { pipe } from '@tsfpp/prelude'
  - After:  import { flow } from '@tsfpp/prelude'
```

---

## Commitlint configuration

Commitlint enforces this format on every PR commit via CI
(`.github/workflows/ci.yml`). The configuration lives at
`commitlint.config.js` in the repo root.

```js
// commitlint.config.js
export default {
  extends: ['@commitlint/config-conventional'],
}
```

---

## Reference

- [Conventional Commits v1.0.0 specification](https://www.conventionalcommits.org/en/v1.0.0/)
- `./git-trunk-based.md` — branch naming and merge workflow
- `docs/semver-policy.md` — how commit types map to version bumps
