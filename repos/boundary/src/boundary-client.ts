/**
 * @module boundary-client
 * @packageDocumentation
 *
 * The client's side of a boundary API: every response parsed by its schema,
 * every failure a value. A request that gets no answer is `offline`; a 401 is
 * `unauthenticated`; any other refusal is a `problem` carrying the server's
 * RFC 9457 problem details when they parse; a success body the schema refuses
 * is `malformed`. Nothing untyped reaches the caller.
 */

import {
  type Option,
  type Result,
  type UnknownRecord,
  err,
  getTypedField,
  isOk,
  isRecord,
  isSome,
  none,
  ok,
  some,
  tryCatchAsync,
} from '@tsfpp/prelude';

import { type JsonSchema } from './boundary-handler.js';
import { type FieldIssue, type ProblemDetails } from './boundary-types.js';

/** Why a request did not yield a parsed success body. */
export type ClientFailure =
  | { readonly kind: 'offline' }
  | { readonly kind: 'unauthenticated' }
  | { readonly kind: 'problem'; readonly status: number; readonly problem: Option<ProblemDetails> }
  | { readonly kind: 'malformed'; readonly status: number };

/** The `fetch` a client is given (Rule 4.6: effects arrive through deps). */
export type FetchPort = (url: string, init?: RequestInit) => Promise<Response>;

const isString = (value: unknown): value is string => typeof value === 'string';
const isNullableString = (value: unknown): value is string | null => value === null || typeof value === 'string';
const isInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value);
const isFieldIssue = (value: unknown): value is FieldIssue =>
  isRecord(value) && typeof value['field'] === 'string' && typeof value['issue'] === 'string';
const isNullableIssues = (value: unknown): value is ReadonlyArray<FieldIssue> | null =>
  value === null || (Array.isArray(value) && value.every(isFieldIssue));

/** An optional nullable field: absent reads as `null`, a value of the wrong type as `None`. */
const nullableField = <T>(record: UnknownRecord, key: string, guard: (value: unknown) => value is T | null): Option<T | null> =>
  key in record ? getTypedField(record, key, guard) : some(null);

const problemOf = (record: UnknownRecord): Option<ProblemDetails> => {
  const type = getTypedField(record, 'type', isString);
  const title = getTypedField(record, 'title', isString);
  const status = getTypedField(record, 'status', isInteger);
  const code = getTypedField(record, 'code', isString);
  const traceId = getTypedField(record, 'traceId', isString);
  const detail = nullableField(record, 'detail', isNullableString);
  const instance = nullableField(record, 'instance', isNullableString);
  const errors = nullableField(record, 'errors', isNullableIssues);
  return isSome(type) && isSome(title) && isSome(status) && isSome(code) && isSome(traceId)
    && isSome(detail) && isSome(instance) && isSome(errors)
    ? some({
        type: type.value,
        title: title.value,
        status: status.value,
        code: code.value,
        detail: detail.value,
        instance: instance.value,
        traceId: traceId.value,
        errors: errors.value,
      })
    : none;
};

/**
 * Parses a response body as the problem details boundary writes. `detail`,
 * `instance` and `errors` may be absent (as `null`); the rest must be present.
 * @param body Untrusted JSON body.
 * @returns Problem details, or `None` for any other shape.
 */
export const parseProblemDetails = (body: unknown): Option<ProblemDetails> =>
  isRecord(body) ? problemOf(body) : none;

/**
 * Reads a response into its parsed success body or a failure.
 * @param response Response from the server.
 * @param schema Schema of the success body.
 * @returns The parsed body, or `unauthenticated`, `problem` or `malformed`.
 */
export const readJsonResponse = async <T>(response: Response, schema: JsonSchema<T>): Promise<Result<T, ClientFailure>> => {
  const json = await tryCatchAsync((): Promise<unknown> => response.json(), () => undefined);
  const body = isOk(json) ? json.value : undefined;
  if (response.status === 401) return err({ kind: 'unauthenticated' });
  if (!response.ok) return err({ kind: 'problem', status: response.status, problem: parseProblemDetails(body) });
  const parsed = schema.safeParse(body);
  return parsed.success ? ok(parsed.data) : err({ kind: 'malformed', status: response.status });
};

/**
 * Sends a request and reads its JSON answer through a schema.
 * @param deps The `fetch` to send with.
 * @param request URL, request init and the schema of the success body.
 * @returns The parsed body, or `offline` when no response arrived, or the
 *   failure {@link readJsonResponse} gives.
 */
export const fetchJson = async <T>(
  deps: { readonly fetch: FetchPort },
  request: { readonly url: string; readonly init?: RequestInit; readonly schema: JsonSchema<T> },
): Promise<Result<T, ClientFailure>> => {
  const response = await tryCatchAsync(() => deps.fetch(request.url, request.init), (): ClientFailure => ({ kind: 'offline' }));
  return isOk(response) ? readJsonResponse(response.value, request.schema) : response;
};
