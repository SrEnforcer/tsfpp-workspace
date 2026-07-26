/**
 * @tsfpp/eslint-config/layered
 *
 * TSF++ ESLint profile enforcing Rule 11.5 (layer boundaries — functional core,
 * imperative shell) and Rule 11.6 (import purity).
 *
 * Rule references in this file are to CODING_STANDARD.md.
 *
 * Why a separate profile: the base config constrains how a *file* is written.
 * These rules constrain how files may *depend on each other*, which is what
 * actually keeps the axioms true at program scale — a single outward import
 * makes every function in a module effectful no matter how each was written.
 *
 * Usage:
 *   // eslint.config.js
 *   import tsfppLayered from '@tsfpp/eslint-config/layered'
 *   export default tsfppLayered
 *
 * The path globs below assume the conventional layout:
 *
 *   src/core/        pure domain — types, ADTs, decisions
 *   src/use-case/    orchestration + ports
 *   src/boundary/    parsing and error mapping
 *   src/adapters/    effects: db, http clients, clock, entropy
 *   src/handlers/    transport entry points
 *   src/main.ts      composition root
 *
 * Layer *names* are conventional; the inward-only *direction* is normative
 * (Rule 11.5). Projects using a different layout should copy this file and
 * adjust the globs — the shape of the restriction is the part worth keeping.
 */

import type { Linter } from 'eslint'

/** Modules a pure core may never reach for. */
const OUTWARD_FROM_CORE = [
  '**/adapters/**',
  '**/infra/**',
  '**/handlers/**',
  '**/boundary/**',
  '**/use-case/**',
  'node:*',
  'express',
  'fastify',
  'koa',
  'next/*',
  'react',
  'react-dom',
]

/** Modules a use case may never reach for (it may use the core). */
const OUTWARD_FROM_USE_CASE = [
  '**/adapters/**',
  '**/infra/**',
  '**/handlers/**',
  'node:*',
  'express',
  'fastify',
  'koa',
]

const config: Linter.Config[] = [
  // ── Rule 11.5 — the core is pure: nothing peripheral, nothing transport-shaped
  {
    files: ['**/core/**/*.ts', '**/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: OUTWARD_FROM_CORE,
          message:
            'TSF++ Rule 11.5: the core must not import adapters, transports, or node builtins. ' +
            'Define a port (a function type) in the core and inject an implementation at the composition root (Rule 6.5).',
        }],
      }],
    },
  },

  // ── Rule 11.5 — use cases orchestrate the core; they do not perform effects
  {
    files: ['**/use-case/**/*.ts', '**/use-cases/**/*.ts', '**/application/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: OUTWARD_FROM_USE_CASE,
          message:
            'TSF++ Rule 11.5: a use case may depend on the core and on ports, never on a concrete adapter. ' +
            'Accept the port through Deps (Rule 6.5).',
        }],
      }],
    },
  },

  // ── Rule 11.6 — import purity: a module may only define bindings
  //
  // Top-level ambient reads are worse than the in-function reads Rule 4.6
  // forbids: they run before any caller exists, in module-graph order, and can
  // be neither injected nor stubbed nor deferred.
  {
    files: ['**/*.ts'],
    ignores: ['**/main.ts', '**/index.ts', '**/*.config.ts', '**/*.test.ts'],
    rules: {
      'no-restricted-syntax': ['error',
        {
          selector: ":matches(Program > VariableDeclaration, Program > ExportNamedDeclaration > VariableDeclaration) > VariableDeclarator > NewExpression[callee.name='Date']",
          message: 'TSF++ Rule 11.6: reading the clock at import time. Expose a function and inject the clock (Rule 4.6).',
        },
        {
          selector: ":matches(Program > VariableDeclaration, Program > ExportNamedDeclaration > VariableDeclaration) > VariableDeclarator > MemberExpression[object.object.name='process'][object.property.name='env']",
          message: 'TSF++ Rule 11.6: reading process.env at import time. Load config at the boundary and inject it.',
        },
        {
          selector: ":matches(Program > VariableDeclaration, Program > ExportNamedDeclaration > VariableDeclaration) > VariableDeclarator > AwaitExpression",
          message: 'TSF++ Rule 11.6: top-level await performs I/O at import time and blocks the module graph.',
        },
        {
          selector: 'Program > ExpressionStatement > CallExpression',
          message: 'TSF++ Rule 11.6: a bare call at module scope is a side effect at import time. Importing a module must only define bindings.',
        },
      ],
    },
  },
]

export default config
