/**
 * @module ramda
 *
 * Curated Ramda re-export surface. This is the only permitted direct Ramda
 * import point in the repository (TSF++ Rule 13.1).
 *
 * Note: `map` and `tap` here are Ramda's array/object functor and identity-tap
 * respectively — their signatures differ from the Result-focused combinators of
 * the same name in `prelude` (fp.ts). Prefer importing from `prelude` directly
 * unless you specifically need the Ramda array variants.
 *
 * `none` from Ramda (a boolean list predicate) is intentionally NOT re-exported
 * here to avoid a semantic collision with `none: Option<never>` from `prelude`.
 */
export {
  always,
  compose,
  identity,
  pipe,
  all,
  any,
  concat,
  filter,
  find,
  findIndex,
  groupBy,
  head,
  init,
  isEmpty,
  last,
  length,
  map,
  reduce,
  sort,
  sortBy,
  tail,
  uniq,
  uniqBy,
  unnest,
  zip,
  zipWith,
  assoc,
  defaultTo,
  dissoc,
  mergeDeepRight,
  mergeRight,
  omit,
  partition,
  path,
  pathEq,
  pick,
  pickBy,
  prop,
  propEq,
  range,
  lens,
  lensPath,
  lensProp,
  over,
  set,
  view,
  both,
  complement,
  either,
  equals,
  has,
  includes,
  is,
  isNil,
  not,
  tap,
} from 'ramda';
