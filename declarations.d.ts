/**
 * Ambient module declarations for ESLint plugins that ship no TypeScript types.
 *
 * eslint-plugin-jsx-a11y does not provide a .d.ts file and has no @types/* package.
 * We declare it as ESLint.Plugin so the import in react.ts type-checks cleanly.
 */

declare module 'eslint-plugin-jsx-a11y' {
  import type { ESLint } from 'eslint'
  const plugin: ESLint.Plugin
  export default plugin
}