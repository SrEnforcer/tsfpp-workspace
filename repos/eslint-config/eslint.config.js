import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'

// This package lints its own TypeScript sources, not its build output.
// `eslint dist/` was the previous target, which fails by construction: the
// emitted JavaScript carries the sources' `eslint-disable` comments, and the
// config that lints it registers no plugins — so every disable directive
// resolves to "Definition for rule ... was not found".
export default [
  {
    ignores: ['dist/'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {},
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    // Dogfoods this package's own Rule 1.6 setting from `base.ts`, so the
    // single `as` in `plugin-compat.ts` stays an explicit, annotated deviation
    // rather than an unenforced comment.
    rules: {
      '@typescript-eslint/consistent-type-assertions': ['error', {
        assertionStyle: 'never',
      }],
    },
  },
]
