/**
 * @module boundary-operations
 * @packageDocumentation
 *
 * Pagination, operations, bulk responses, rate-limit headers, CORS, and cache policy.
 */

import {
  fromNullable,
  getOrElseOption,
  isNone,
  isSome,
  type Result,
  err,
  ok,
} from '@tsfpp/prelude';

import {
  type Cursor,
  type ProblemDetails,
  type ValidationError,
  mkValidationError,
} from './boundary-types.js';
import { jsonResponse } from './boundary-response.js';

const isoNow = (): string => {
  // eslint-disable-next-line no-restricted-syntax -- DEVIATION(1.9): Date construction is a time adapter boundary.
  return new Date().toISOString();
};

/** Paginated collection envelope for cursor-based list endpoints. */
export type Paginated<T> = {
  readonly items: ReadonlyArray<T>;
  readonly nextCursor: string | null;
  readonly totalCount: number | null;
};

/** Typed pagination query after boundary validation. */
export type PageQuery = {
  readonly limit: number;
  readonly cursor: Cursor | null;
};

/**
 * Builds a paginated response payload.
 * @param items Page items.
 * @param nextCursor Opaque next cursor.
 * @param totalCount Optional total count.
 * @returns Paginated payload.
 */
export const mkPaginated = <T>(
  items: ReadonlyArray<T>,
  nextCursor: Cursor | null,
  totalCount: number | null = null,
): Paginated<T> => ({ items, nextCursor, totalCount });

/**
 * Parses and validates pagination query params.
 * @param url URL instance.
 * @param maxLimit Endpoint max page size.
 * @returns Page query or validation error.
 */
export const parsePaginationQuery = (
  url: URL,
  maxLimit = 100,
): Result<PageQuery, ValidationError> => {
  const rawLimit = fromNullable(url.searchParams.get('limit'));
  const rawCursor = fromNullable(url.searchParams.get('cursor'));

  const limit = Number(getOrElseOption(() => '20')(rawLimit));

  if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) {
    return err(mkValidationError([{
      field: 'limit',
      issue: `Must be an integer between 1 and ${maxLimit}`,
    }]));
  }

  const cursor: Cursor | null =
    isSome(rawCursor) && rawCursor.value.length > 0
      ? (rawCursor.value as Cursor) // eslint-disable-line @typescript-eslint/consistent-type-assertions -- DEVIATION(1.6): cursor token is an opaque boundary value passed through unchanged
      : null;

  return ok({ limit, cursor });
};

/**
 * Encodes a cursor payload into opaque base64url text.
 * @param payload Cursor payload.
 * @returns Branded cursor.
 */
export const encodeCursor = (payload: Record<string, unknown>): Cursor => {
  const b64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return b64 as Cursor; // eslint-disable-line @typescript-eslint/consistent-type-assertions -- DEVIATION(1.6): branded cursor is produced by canonical encoder output
};

/** Long-running operation resource ADT for 202 Accepted polling workflows. */
export type Operation<T> =
  | { readonly kind: 'running'; readonly operationId: string; readonly progress: number; readonly createdAt: string }
  | { readonly kind: 'succeeded'; readonly operationId: string; readonly result: T; readonly createdAt: string; readonly completedAt: string }
  | { readonly kind: 'failed'; readonly operationId: string; readonly error: ProblemDetails; readonly createdAt: string; readonly completedAt: string }
  | { readonly kind: 'cancelled'; readonly operationId: string; readonly createdAt: string; readonly completedAt: string };

/**
 * Construct a running operation resource.
 * @param operationId Stable operation identifier.
 * @param progress Integer progress indicator in the range 0-100.
 * @returns Running operation resource.
 */
export const mkRunningOp = <T = never>(operationId: string, progress = 0): Operation<T> => ({
  kind: 'running',
  operationId,
  progress,
  createdAt: isoNow(),
});

/**
 * Construct a succeeded operation resource.
 * @param operationId Stable operation identifier.
 * @param result Completed operation result payload.
 * @param createdAt Original operation creation timestamp.
 * @returns Succeeded operation resource.
 */
export const mkSucceededOp = <T>(
  operationId: string,
  result: T,
  createdAt: string,
): Operation<T> => ({
  kind: 'succeeded',
  operationId,
  result,
  createdAt,
  completedAt: isoNow(),
});

/**
 * Construct a failed operation resource.
 * @param operationId Stable operation identifier.
 * @param error Problem details for terminal failure.
 * @param createdAt Original operation creation timestamp.
 * @returns Failed operation resource.
 */
export const mkFailedOp = (
  operationId: string,
  error: ProblemDetails,
  createdAt: string,
): Operation<never> => ({
  kind: 'failed',
  operationId,
  error,
  createdAt,
  completedAt: isoNow(),
});

/**
 * Construct a cancelled operation resource.
 * @param operationId Stable operation identifier.
 * @param createdAt Original operation creation timestamp.
 * @returns Cancelled operation resource.
 */
export const mkCancelledOp = (operationId: string, createdAt: string): Operation<never> => ({
  kind: 'cancelled',
  operationId,
  createdAt,
  completedAt: isoNow(),
});

/** Per-item outcome ADT for bulk operations. */
export type BulkItem<T> =
  | { readonly kind: 'ok'; readonly status: 200 | 201; readonly body: T }
  | { readonly kind: 'error'; readonly status: number; readonly error: ProblemDetails };

/** Multi-status response body envelope for bulk operations. */
export type BulkResponse<T> = {
  readonly items: ReadonlyArray<BulkItem<T>>;
};

/**
 * Construct a successful bulk item entry.
 * @param body Item-level payload.
 * @param status Success status code for the item.
 * @returns Successful bulk item entry.
 */
export const mkBulkOkItem = <T>(body: T, status: 200 | 201 = 201): BulkItem<T> =>
  ({ kind: 'ok', status, body });

/**
 * Construct a failed bulk item entry.
 * @param error Item-level problem details.
 * @returns Failed bulk item entry.
 */
export const mkBulkErrorItem = <T>(error: ProblemDetails): BulkItem<T> =>
  ({ kind: 'error', status: error.status, error });

/**
 * Builds a 207 Multi-Status response.
 * @param items Per-item bulk outcomes.
 * @returns Multi-status response.
 */
export const bulkResponse = <T>(items: ReadonlyArray<BulkItem<T>>): Response =>
  jsonResponse(207, { items } as BulkResponse<T>); // eslint-disable-line @typescript-eslint/consistent-type-assertions -- DEVIATION(1.6): structural cast narrows response envelope to exported bulk contract

/** Current rate-limit counters for a principal and endpoint scope. */
export type RateLimitState = {
  readonly limit: number;
  readonly remaining: number;
  readonly resetAt: Date;
};

/**
 * Builds RateLimit headers from state.
 * @param state Current limiter state.
 * @returns Standardized headers.
 */
export const rateLimitHeaders = (state: RateLimitState): Record<string, string> => ({
  'RateLimit-Limit': String(state.limit),
  'RateLimit-Remaining': String(state.remaining),
  'RateLimit-Reset': state.resetAt.toISOString(),
});

/**
 * Builds Retry-After header in rounded seconds.
 * @param seconds Seconds until retry.
 * @returns Retry-After header record.
 */
export const retryAfterHeader = (seconds: number): Record<string, string> => ({
  'Retry-After': String(Math.ceil(seconds)),
});

/** Baseline security headers for API responses. */
export const baselineSecurityHeaders: Readonly<Record<string, string>> = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Content-Security-Policy': "default-src 'none'",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
};

/**
 * Builds CORS headers from an explicit allow-list.
 * @param allowedOrigins Allowed origins.
 * @param requestOrigin Origin header value.
 * @param opts Optional CORS tuning values.
 * @returns CORS headers or empty object.
 */
// NOTE(unknown, 2026-05-20): CORS origin reflection is conditional on allow-list membership
// to prevent credential leakage via wildcard/echo behavior.
export const corsHeaders = (
  allowedOrigins: ReadonlyArray<string>,
  requestOrigin: string | null,
  opts: {
    readonly allowedMethods?: ReadonlyArray<string>;
    readonly allowedHeaders?: ReadonlyArray<string>;
    readonly maxAgeSeconds?: number;
    readonly allowCredentials?: boolean;
  } = {},
): Record<string, string> => {
  const requestOriginOption = fromNullable(requestOrigin);
  if (isNone(requestOriginOption)) return {};
  if (!allowedOrigins.includes(requestOriginOption.value)) return {};

  const methods = getOrElseOption<ReadonlyArray<string>>(() => ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])(fromNullable(opts.allowedMethods));
  const maxAge = getOrElseOption<number>(() => 600)(fromNullable(opts.maxAgeSeconds));
  const allowedHeadersOption = fromNullable(opts.allowedHeaders);

  return {
    'Access-Control-Allow-Origin': requestOriginOption.value,
    'Access-Control-Allow-Methods': methods.join(', '),
    'Access-Control-Max-Age': String(maxAge),
    Vary: 'Origin',
    ...(isSome(allowedHeadersOption) && allowedHeadersOption.value.length > 0
      ? { 'Access-Control-Allow-Headers': allowedHeadersOption.value.join(', ') }
      : {}),
    ...(opts.allowCredentials === true
      ? { 'Access-Control-Allow-Credentials': 'true' }
      : {}),
  };
};

/** Named cache policy union mapped to concrete Cache-Control directives. */
export type CachePolicy =
  | 'no-store'
  | 'private-revalidate'
  | 'public-short'
  | 'public-long'
  | 'immutable';

const CACHE_DIRECTIVES: Readonly<Record<CachePolicy, string>> = {
  'no-store': 'no-store',
  'private-revalidate': 'private, no-cache',
  'public-short': 'public, max-age=60, stale-while-revalidate=300',
  'public-long': 'public, max-age=86400, stale-while-revalidate=3600',
  immutable: 'public, max-age=31536000, immutable',
};

/**
 * Builds cache headers for a named policy.
 * @param policy Cache policy.
 * @param etag Optional ETag.
 * @returns Cache-related headers.
 */
export const cacheHeaders = (
  policy: CachePolicy,
  etag: string = '',
): Record<string, string> => ({
  'Cache-Control': CACHE_DIRECTIVES[policy],
  ...(etag.length > 0 ? { ETag: etag } : {}),
});

/**
 * Handler factory shape for dependency-injected fetch handlers.
 * @param deps Dependency record captured at composition time.
 * @returns Fetch handler bound to injected dependencies.
 */
export type HandlerFactory<Deps> = (deps: Deps) => (req: Request) => Promise<Response>;
