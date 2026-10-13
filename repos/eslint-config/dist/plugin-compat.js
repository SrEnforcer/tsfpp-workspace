/**
 * plugin-compat.ts
 *
 * Adapter boundary for third-party ESLint plugin type coercion.
 *
 * Problem: ESLint plugin packages frequently ship TypeScript types that lag
 * behind the current @eslint/core `Plugin` interface. The structural mismatch
 * (e.g. `null` in `parser` where `string | undefined` is expected, or `flat`
 * keys in `configs` that don't satisfy the index signature) causes TS2322
 * errors at plugin registration sites in flat config objects.
 *
 * Solution: Isolate the necessary `as` cast here, at this single adapter
 * boundary. Every callsite in base.ts / react.ts / api.ts is auditable by
 * grepping for `coercePlugin`.
 *
 * DEVIATION(1.6): `as` cast is intentional and confined to this module.
 * Justification: third-party type incompatibility at an adapter boundary;
 * no runtime effect — this is a pure type-level coercion with zero behavior.
 * Reviewed and approved per TSF++ deviation procedure.
 */
import { fixupPluginRules } from '@eslint/compat';
/**
 * Coerces a third-party ESLint plugin object to the canonical `ESLint.Plugin`
 * type accepted by flat config `plugins` records.
 *
 * Use exclusively at plugin registration sites. Never use to silence unrelated
 * type errors.
 */
export const coercePlugin = (plugin) => 
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- DEVIATION(1.6): see module JSDoc above
plugin;
/**
 * Coerces a plugin and additionally restores the rule-context methods ESLint 10
 * removed (`context.getFilename()`, `context.getSourceCode()`, …).
 *
 * Use for plugins that have not shipped ESLint 10 support — currently
 * eslint-plugin-react and eslint-plugin-jsx-a11y. Without the fixup,
 * eslint-plugin-react 7.37.5 throws `contextOrFilename.getFilename is not a
 * function` on the first linted file. Harmless under ESLint 9; drop the call
 * for a plugin once its own peer range includes ESLint 10.
 */
export const coerceLegacyPlugin = (plugin) => fixupPluginRules(coercePlugin(plugin));
//# sourceMappingURL=plugin-compat.js.map