/**
 * @module boundary-parse
 * @packageDocumentation
 *
 * Parse, don't validate (Rule 8.4), for the parts of a request that are not a
 * JSON body: path parameters, the query string, any value already in hand.
 * A value the schema refuses becomes a `ValidationError` with one issue per
 * field at its dotted path — the same shape `parseJsonWithSchema` gives a body.
 */

import { type Result, err, isOk, ok, tryCatch } from '@tsfpp/prelude';

import { type JsonSchema } from './boundary-handler.js';
import { type ValidationError, fromZodError } from './boundary-types.js';

/**
 * Parses a value through a schema (Zod 3, Zod 4, or anything with the same
 * `safeParse` shape).
 * @param schema Schema the value must satisfy.
 * @param input Untrusted value, such as path parameters.
 * @returns The parsed value, or a validation error listing every issue.
 */
export const parseWith = <T>(schema: JsonSchema<T>, input: unknown): Result<T, ValidationError> => {
  const parsed = schema.safeParse(input);
  return parsed.success ? ok(parsed.data) : err(fromZodError(parsed.error));
};

/** Percent-decoding with `+` as a space; text that does not decode stays as it is. */
const decodeComponent = (text: string): string => {
  const spaced = text.replaceAll('+', ' ');
  const decoded = tryCatch(() => decodeURIComponent(spaced), () => spaced);
  return isOk(decoded) ? decoded.value : decoded.error;
};

const pairOf = (part: string): readonly [string, string] => {
  const at = part.indexOf('=');
  return at < 0
    ? [decodeComponent(part), '']
    : [decodeComponent(part.slice(0, at)), decodeComponent(part.slice(at + 1))];
};

/**
 * The query parameters of a URL, decoded, as a record a schema can parse.
 * Of a repeated name the first value wins; a name without `=` has the value
 * `''`; the fragment is ignored.
 * @param url Absolute or relative request URL.
 * @returns Query parameters by name.
 */
export const queryOf = (url: string): Readonly<Record<string, string>> => {
  const [withoutFragment = ''] = url.split('#');
  const start = withoutFragment.indexOf('?');
  const pairs = start < 0
    ? []
    : withoutFragment.slice(start + 1).split('&').filter((part) => part.length > 0).map(pairOf);
  // In URL order, the first of equal names kept. A computed key defines an own
  // property, so a `__proto__` parameter is an ordinary entry.
  return pairs.reduce<Readonly<Record<string, string>>>(
    (query, [name, value]) => (Object.hasOwn(query, name) ? query : { ...query, [name]: value }),
    {},
  );
};

/**
 * Parses a request's query string through a schema.
 * @param schema Schema the query record must satisfy.
 * @returns A parser from request to parsed query or validation error.
 */
export const parseQuery =
  <T>(schema: JsonSchema<T>) =>
  (req: Request): Result<T, ValidationError> =>
    parseWith(schema, queryOf(req.url));
