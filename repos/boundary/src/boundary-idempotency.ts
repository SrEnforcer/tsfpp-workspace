/**
 * @module boundary-idempotency
 * @packageDocumentation
 *
 * Idempotency middleware and request logging middleware.
 */

import { absurd, fromNullable, getOrElseOption, isErr, isNone, isSome, tryCatchAsync } from '@tsfpp/prelude';

import {
  type IdempotencyKey,
  type PrincipalId,
  type TraceId,
  extractTraceId,
  mkIdempotencyKey,
  mkPrincipalId,
  mkProblem,
} from './boundary-types.js';
import { problemResponse } from './boundary-response.js';

const isoNow = (): string => {
  // eslint-disable-next-line no-restricted-syntax -- DEVIATION(1.9): Date construction is a clock boundary.
  return new Date().toISOString();
};

const encodeUtf8 = (value: string): ArrayBuffer => {
  // eslint-disable-next-line no-restricted-syntax -- DEVIATION(1.9): TextEncoder construction is runtime boundary interop.
  const bytes = new TextEncoder().encode(value);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
};

const bytesToHex = (bytes: ArrayBuffer): string => Buffer.from(bytes).toString('hex');

const mkResponse = (body: BodyInit | null, init: ResponseInit): Response => {
  // eslint-disable-next-line no-restricted-syntax -- DEVIATION(1.9): Response construction is the HTTP boundary.
  return new Response(body, init);
};

/** Serializable HTTP response snapshot persisted for deterministic idempotency replay. */
export type StoredResponse = {
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly body: string;
};

/** Store lookup outcome ADT used to decide replay, conflict, or first execution path. */
export type IdempotencyLookup =
  | { readonly kind: 'first_request' }
  | { readonly kind: 'replay'; readonly response: StoredResponse }
  | { readonly kind: 'in_flight' }
  | { readonly kind: 'key_conflict' };

/** Durable idempotency storage port for middleware orchestration. */
export type IdempotencyStore = {
  readonly check: (
    key: IdempotencyKey,
    principalId: PrincipalId | null,
    requestHash: string,
  ) => Promise<IdempotencyLookup>;

  readonly markInFlight: (
    key: IdempotencyKey,
    principalId: PrincipalId | null,
  ) => Promise<void>;

  readonly store: (params: {
    readonly key: IdempotencyKey;
    readonly principalId: PrincipalId | null;
    readonly requestHash: string;
    readonly response: StoredResponse;
  }) => Promise<void>;
};

/** Fetch-native handler shape used by middleware composition. */
export type RawHandler = (req: Request) => Promise<Response>;

type IdempotencyInput = {
  readonly key: IdempotencyKey;
  readonly traceId: TraceId;
  readonly requestHash: string;
  readonly principalId: PrincipalId | null;
};

/**
 * Wraps a handler with idempotency semantics.
 * @param store Backing idempotency store.
 * @returns Middleware wrapper.
 */
// NOTE(unknown, 2026-05-20): Request hash includes method + URL + body to preserve
// semantic uniqueness across endpoints where the same key may otherwise collide.
export const withIdempotency =
  (store: IdempotencyStore) =>
  (handler: RawHandler): RawHandler =>
  async (req: Request): Promise<Response> => {
    const parsedInput = await parseIdempotencyInput(req);
    if (parsedInput.kind === 'no_key') return handler(req);
    if (parsedInput.kind === 'invalid_key') return mkInvalidKeyResponse(parsedInput.traceId);

    const lookup = await store.check(
      parsedInput.input.key,
      parsedInput.input.principalId,
      parsedInput.input.requestHash,
    );

    switch (lookup.kind) {
      case 'replay':
        return mkReplayResponse(lookup.response);
      case 'in_flight':
        return mkInFlightResponse(parsedInput.input.traceId);
      case 'key_conflict':
        return mkConflictResponse(parsedInput.input.traceId);
      case 'first_request':
        return executeFirstRequest({ store, handler, req, input: parsedInput.input });
      default:
        return absurd(lookup);
    }
  };

type ParseResult =
  | { readonly kind: 'no_key' }
  | { readonly kind: 'invalid_key'; readonly traceId: TraceId }
  | { readonly kind: 'ok'; readonly input: IdempotencyInput };

const parseIdempotencyInput = async (req: Request): Promise<ParseResult> => {
  const rawKey = fromNullable(req.headers.get('idempotency-key'));
  if (isNone(rawKey)) return { kind: 'no_key' };

  const keyOption = mkIdempotencyKey(rawKey.value);
  const traceId = extractTraceId(req);

  if (isNone(keyOption)) return { kind: 'invalid_key', traceId };

  return {
    kind: 'ok',
    input: {
      key: keyOption.value,
      traceId,
      requestHash: await mkRequestHash(req),
      principalId: resolvePrincipalId(req),
    },
  };
};

const mkRequestHash = async (req: Request): Promise<string> => {
  const bodyTextResult = await tryCatchAsync(
    () => req.clone().text(),
    () => '',
  );
  const bodyText = isErr(bodyTextResult) ? '' : bodyTextResult.value;
  const input = `${req.method}:${req.url}:${bodyText}`;
  const hashBytes = await crypto.subtle.digest('SHA-256', encodeUtf8(input));
  return bytesToHex(hashBytes);
};

const resolvePrincipalId = (req: Request): PrincipalId | null => {
  const principalValue = getOrElseOption(() => '')(fromNullable(req.headers.get('x-principal-id')));
  const principalOption = mkPrincipalId(principalValue);
  return isSome(principalOption) ? principalOption.value : null;
};

const mkInvalidKeyResponse = (traceId: TraceId): Response =>
  problemResponse(
    mkProblem({
      status: 400,
      code: 'validation_idempotency_key',
      title: 'Invalid Idempotency-Key format',
      traceId,
      opts: {
        detail: 'Key must be 1-255 characters, [A-Za-z0-9_-]',
      },
    }),
  );

const mkReplayResponse = (stored: StoredResponse): Response =>
  mkResponse(stored.body, {
    status: stored.status,
    headers: { ...stored.headers, 'X-Idempotency-Replayed': 'true' },
  });

const mkInFlightResponse = (traceId: TraceId): Response =>
  problemResponse(
    mkProblem({
      status: 409,
      code: 'idempotency_in_flight',
      title: 'A request with this key is already in progress',
      traceId,
    }),
    { 'Retry-After': '1' },
  );

const mkConflictResponse = (traceId: TraceId): Response =>
  problemResponse(
    mkProblem({
      status: 422,
      code: 'idempotency_key_conflict',
      title: 'Idempotency-Key reused with a different request body',
      traceId,
    }),
  );

const executeFirstRequest = async (args: {
  readonly store: IdempotencyStore;
  readonly handler: RawHandler;
  readonly req: Request;
  readonly input: IdempotencyInput;
}): Promise<Response> => {
  await args.store.markInFlight(args.input.key, args.input.principalId);

  const response = await args.handler(args.req);
  const body = await response.clone().text();
  const headers = Object.fromEntries(response.headers.entries());

  await args.store.store({
    key: args.input.key,
    principalId: args.input.principalId,
    requestHash: args.input.requestHash,
    response: { status: response.status, headers, body },
  });

  return response;
};

/** Structured request log entry emitted once per completed request. */
export type RequestLog = {
  readonly timestamp: string;
  readonly level: 'info' | 'warn' | 'error';
  readonly traceId: string;
  readonly principalId: string | null;
  readonly method: string;
  readonly routeTemplate: string;
  readonly status: number;
  readonly durationMs: number;
  readonly userAgent: string | null;
  readonly errorCode: string | null;
};

/** Minimal logger port required by request-log middleware. */
export type RequestLogger = {
  readonly info: (entry: RequestLog) => void;
  readonly error: (entry: RequestLog) => void;
};

/**
 * Wraps a handler with structured request logging.
 * @param logger Request logger adapter.
 * @param routeTemplate Parameterized route template.
 * @returns Middleware wrapper.
 */
export const withRequestLog =
  (logger: RequestLogger, routeTemplate: string) =>
  (handler: RawHandler): RawHandler =>
  async (req: Request): Promise<Response> => {
    const startMs = Date.now();
    const traceId = extractTraceId(req);
    const principalId = req.headers.get('x-principal-id');
    const userAgent = req.headers.get('user-agent');

    const response = await handler(req);
    const durationMs = Date.now() - startMs;

    const entry: RequestLog = {
      timestamp: isoNow(),
      level: response.status >= 500 ? 'error' : 'info',
      traceId,
      principalId,
      method: req.method,
      routeTemplate,
      status: response.status,
      durationMs,
      userAgent,
      errorCode: null,
    };

    if (response.status >= 500) {
      logger.error(entry);
    } else {
      logger.info(entry);
    }

    return response;
  };
