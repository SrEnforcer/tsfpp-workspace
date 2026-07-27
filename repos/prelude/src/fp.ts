/**
 * @module fp
 *
 * Internal barrel for the core functional primitives.
 *
 * The implementation lives in focused modules so that every file satisfies
 * Rule 11.2 (file length); this barrel preserves the historical `./fp.js`
 * import path. Package consumers import from the root barrel (Rule 11.4).
 */
export * from './core.js';
export * from './adt.js';
export * from './combinators.js';
export * from './record.js';
export * from './traversals.js';
export * from './list.js';
export * from './collections.js';
export * from './logger.js';
export * from './nonempty.js';
export * from './refined.js';
