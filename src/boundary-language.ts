/**
 * @module boundary-language
 * @packageDocumentation
 *
 * Content negotiation of language: `Accept-Language` in (RFC 9110 §12.5.4),
 * `Content-Language` out. Which tags an application serves is its own
 * business, so the choice takes a smart constructor of the application's
 * locale type and returns the best tag that passes it.
 */

import { type Option, isSome, none, some } from '@tsfpp/prelude';

/** One language range of an `Accept-Language` header and its weight. */
export type WeightedLanguage = {
  readonly tag: string;
  readonly weight: number;
};

// RFC 9110 §12.4.2 qvalue: 0 to 1 with at most three decimals.
const qvaluePattern = /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/u;

/** The weight of an entry's parameters: 1 without `q`, `None` for a malformed `q`. */
const weightOf = (parameters: ReadonlyArray<string>): Option<number> => {
  const q = parameters.find((parameter) => parameter.toLowerCase().startsWith('q='));
  if (q === undefined) return some(1);
  const text = q.slice(2).trim();
  // The pattern admits only a qvalue, so the conversion is exact and finite.
  return qvaluePattern.test(text) ? some(Number(text)) : none;
};

const entryOf = (entry: string): Option<WeightedLanguage> => {
  const [tag = '', ...parameters] = entry.split(';').map((part) => part.trim());
  const weight = weightOf(parameters);
  return tag.length > 0 && isSome(weight) && weight.value > 0 ? some({ tag, weight: weight.value }) : none;
};

/**
 * The language ranges of an `Accept-Language` header, most preferred first;
 * of equal weights the earlier wins. A range with `q=0` (not acceptable), a
 * malformed weight or no tag is left out. The wildcard `*` is kept as a tag.
 * @param header Header value, or `undefined` when absent.
 * @returns Weighted ranges in order of preference; empty when none is usable.
 */
export const parseAcceptLanguage = (header: string | undefined): ReadonlyArray<WeightedLanguage> => {
  const entries = (header ?? '').split(',').map(entryOf).flatMap((entry) => (isSome(entry) ? [entry.value] : []));
  // A copy, sorted stably (ES2019): equal weights keep header order.
  return [...entries].sort((a, b) => b.weight - a.weight);
};

/**
 * The application's preferred locale for a request: the most preferred range
 * of its `Accept-Language` header that the application's constructor accepts.
 * @param header Header value, or `undefined` when absent.
 * @param accept Smart constructor of the application's locale type.
 * @returns The locale, or `None` to let the application's default decide.
 */
export const preferredLanguage = <L>(header: string | undefined, accept: (tag: string) => Option<L>): Option<L> =>
  parseAcceptLanguage(header).reduce<Option<L>>((found, { tag }) => (isSome(found) ? found : accept(tag)), none);

/**
 * The `Content-Language` header naming the language a response is in.
 * @param tag BCP 47 language tag.
 * @returns Header record to spread into a response's headers.
 */
export const contentLanguageHeader = (tag: string): Readonly<Record<string, string>> => ({ 'Content-Language': tag });
