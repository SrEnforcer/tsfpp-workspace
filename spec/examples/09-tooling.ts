/**
 * Examples for §9 — Compiler and Tooling Configuration (Rules 9.1–9.6)
 * See ../CODING_STANDARD.md §9 and ../rationale/09-tooling.md
 */

// ─── Rule 9.6 — Pre-commit hooks enforce type/lint gates ─────────────────────
//
// MUST: Typecheck and lint must run locally before commit.

const huskyHook = [
  "#!/usr/bin/env sh",
  ". \"$(dirname -- \"$0\")/_/husky.sh\"",
  "pnpm lint-staged",
].join('\n')

const lintStagedConfig = {
  "*.{ts,tsx}": ["eslint --max-warnings=0", "tsc --noEmit --pretty false"],
  "*.{md,json,yml,yaml}": ["prettier --check"],
} as const

const commitlintConfig = {
  extends: ["@commitlint/config-conventional"],
} as const

/* BAD: relying only on CI creates delayed feedback and noisy history.
const huskyHook = "echo 'skip checks'"
*/

export { huskyHook, lintStagedConfig, commitlintConfig }
