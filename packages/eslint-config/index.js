/**
 * @tsfpp/eslint-config
 *
 * Shared ESLint flat configuration for TSF++ projects.
 * Enforces Rules 1.2, 1.5, 1.6, 1.9, 2.1–2.3, 3.1, 3.4, 4.1, 4.2, 4.5, 6.2
 * from spec/CODING_STANDARD.md via @typescript-eslint and eslint-plugin-functional.
 *
 * See spec/rationale/09-tooling.md for extended justification of each rule choice.
 *
 * Usage:
 *   // eslint.config.js
 *   import tsfpp from '@tsfpp/eslint-config'
 *   export default tsfpp
 *
 * With project-specific additions:
 *   import tsfpp from '@tsfpp/eslint-config'
 *   export default [
 *     ...tsfpp,
 *     { rules: { 'no-console': 'off' } },
 *   ]
 */

import tsParser     from '@typescript-eslint/parser'
import tsPlugin     from '@typescript-eslint/eslint-plugin'
import functionalPlugin from 'eslint-plugin-functional'

/** @type {import('eslint').Linter.Config[]} */
const config = [
  // ── Global ignores ──────────────────────────────────────────────────────────
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
  },

  // ── TypeScript source files ─────────────────────────────────────────────────
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType:  'module',
        ecmaVersion: 'latest',
        project:     true, // uses the nearest tsconfig.json; override with projectService
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'functional':         functionalPlugin,
    },
    rules: {
      // ── Core TypeScript safety ─────────────────────────────────────────────

      // Rule 1.5 — no `any`
      '@typescript-eslint/no-explicit-any': 'error',

      // Rule 1.6 — no `!`
      '@typescript-eslint/no-non-null-assertion': 'error',

      // Rule 1.6 — no `as` (smart constructors must carry a DEVIATION(1.6) comment)
      '@typescript-eslint/consistent-type-assertions': ['error', {
        assertionStyle: 'never',
      }],

      // Rule 3.1 — explicit return type on every exported function
      '@typescript-eslint/explicit-function-return-type': ['error', {
        allowExpressions:            false,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions:   true,
        allowDirectConstAssertionInArrowFunctions: true,
      }],

      // Unused vars — `_` prefix exempted (Rule 7.6)
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern:  '^_',
        varsIgnorePattern:  '^_',
        caughtErrorsIgnorePattern: '^_',
      }],

      // Rule 1.2 / 4.1 — exhaustive switch via never
      '@typescript-eslint/switch-exhaustiveness-check': 'error',

      // Rule 6.4 — no unhandled promise rejections
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises':  'error',

      // Rule 2.2 — prefer-readonly on class properties (partial enforcement)
      '@typescript-eslint/prefer-readonly': 'error',

      // Rule 4.5 — no truthiness checks on non-booleans
      '@typescript-eslint/strict-boolean-expressions': ['error', {
        allowString:           false,
        allowNumber:           false,
        allowNullableObject:   false,
        allowNullableBoolean:  false,
        allowNullableString:   false,
        allowNullableNumber:   false,
        allowAny:              false,
      }],

      // Prefer `import type` for type-only imports (verbatimModuleSyntax companion)
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer:              'type-imports',
        fixStyle:            'inline-type-imports',
        disallowTypeAnnotations: false,
      }],

      // ── Immutability & functional style ───────────────────────────────────

      // Rule 2.1 — no `let`
      'functional/no-let': 'error',

      // Rule 4.2 — no imperative loops
      'functional/no-loop-statements': 'error',

      // Rule 6.2 — no `throw` outside adapter boundaries
      // (disable per-file with `// eslint-disable-next-line functional/no-throw-statements`
      //  and a DEVIATION(6.2) comment at adapter entry points)
      'functional/no-throw-statements': 'error',

      // Rule 2.2 — readonly types
      'functional/prefer-readonly-type': ['error', {
        allowLocalMutation:  false,
        allowMutableReturnType: false,
        ignoreClass:         false,
        ignoreInterface:     false,
      }],

      // Rule 2.3 — no mutation (property assignment, array mutation methods)
      'functional/immutable-data': ['error', {
        ignoreImmediateMutation: true, // allows `const xs = []; xs.push(x)` only in same statement
        ignoreAccessorPattern:   ['**.current', 'process.env.*'], // React refs + env edge cases
      }],

      // Rule 1.9 — no classes
      'functional/no-classes': 'error',

      // Rule 1.9 — no `this`
      'functional/no-this-expressions': 'error',

      // ── General hygiene ────────────────────────────────────────────────────

      // Accidental console.log in production code
      'no-console': 'warn',

      // Rule 2.1 — const only
      'prefer-const': 'error',
      'no-var':        'error',

      // Rule 2.3 — no parameter reassignment
      'no-param-reassign': 'error',

      // Rule 4.5 — strict equality
      'eqeqeq': ['error', 'always'],

      // Rule 3.4 — cyclomatic complexity ≤ 10
      'complexity': ['error', { max: 10 }],

      // Rule 3.4 — nesting depth ≤ 4
      'max-depth': ['error', { max: 4 }],

      // Rule 3.4 — 40-line function body limit
      'max-lines-per-function': ['error', {
        max:              40,
        skipBlankLines:   true,
        skipComments:     true,
      }],
    },
  },
]

export default config
