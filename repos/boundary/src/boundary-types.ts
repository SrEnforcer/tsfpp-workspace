/**
 * @module boundary-types
 * @packageDocumentation
 *
 * Foundational branded types, request context extraction, validation structures,
 * API error taxonomy, and Problem Details model.
 */

import {
  type Brand,
  type Option,
  type Result,
  fromNullable,
  getOrElseOption,
  isOk,
  isNone,
  isSome,
  isRecord,
  none,
  ok,
  some,
  tryCatch,
  err,
} from '@tsfpp/prelude';

/** Opaque trace identifier propagated across service boundaries for request correlation. */
export type TraceId = Brand<string, 'TraceId'>;

/** Opaque authenticated principal identifier extracted from trusted upstream auth middleware. */
export type PrincipalId = Brand<string, 'PrincipalId'>;

/** Opaque pagination cursor token treated as an implementation detail by API consumers. */
export type Cursor = Brand<string, 'Cursor'>;

/** Opaque idempotency key used to deduplicate state-mutating requests within a replay window. */
export type IdempotencyKey = Brand<string, 'IdempotencyKey'>;

/** Opaque webhook delivery identifier used for receiver-side deduplication. */
export type WebhookEventId = Brand<string, 'WebhookEventId'>;

/**
 * Validate and brand a trace identifier.
 * @param raw Candidate trace identifier from an external source.
 * @returns `Some<TraceId>` for any non-empty string; `None` otherwise.
 */
export const mkTraceId = (raw: string): Option<TraceId> =>
  raw.length > 0 ? some(raw as TraceId) : none; // eslint-disable-line @typescript-eslint/consistent-type-assertions -- DEVIATION(1.6): smart-constructor body

/**
 * Validate and brand a principal identifier.
 * @param raw Candidate principal identifier from trusted headers.
 * @returns `Some<PrincipalId>` for any non-empty string; `None` otherwise.
 */
export const mkPrincipalId = (raw: string): Option<PrincipalId> =>
  raw.length > 0 ? some(raw as PrincipalId) : none; // eslint-disable-line @typescript-eslint/consistent-type-assertions -- DEVIATION(1.6): smart-constructor body

const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9_-]{1,255}$/;

/**
 * Validates and brands a raw string as an `IdempotencyKey`.
 * @param raw Candidate idempotency key from the request header.
 * @returns `Some<IdempotencyKey>` on success; `None` on format violation.
 */
export const mkIdempotencyKey = (raw: string): Option<IdempotencyKey> =>
  IDEMPOTENCY_KEY_RE.test(raw) ? some(raw as IdempotencyKey) : none; // eslint-disable-line @typescript-eslint/consistent-type-assertions -- DEVIATION(1.6): smart-constructor body

/**
 * Validate and brand a webhook event identifier.
 * @param raw Candidate webhook delivery identifier from sender infrastructure.
 * @returns `Some<WebhookEventId>` for any non-empty string; `None` otherwise.
 */
export const mkWebhookEventId = (raw: string): Option<WebhookEventId> =>
  raw.length > 0 ? some(raw as WebhookEventId) : none; // eslint-disable-line @typescript-eslint/consistent-type-assertions -- DEVIATION(1.6): smart-constructor body

/** Request-scoped metadata extracted once at the HTTP boundary and propagated through handler logic. */
export type RequestContext = {
  readonly traceId: TraceId;
  readonly principalId: Option<PrincipalId>;
  readonly idempotencyKey: Option<IdempotencyKey>;
  readonly method: string;
  readonly url: string;
  readonly routeTemplate: string;
};

const TRACE_HEADERS = ['traceparent', 'x-request-id', 'x-trace-id'] as const;

const mkTraceIdFromUuid = (): TraceId => crypto.randomUUID() as TraceId; // eslint-disable-line @typescript-eslint/consistent-type-assertions -- DEVIATION(1.6): generated UUID is trusted internal data

/**
 * Extracts or generates a `TraceId` from request headers.
 * @param req Incoming Fetch API request.
 * @returns A validated `TraceId`.
 */
export const extractTraceId = (req: Request): TraceId => {
  const resolvedHeader = fromNullable(
    TRACE_HEADERS
      .map((header) => fromNullable(req.headers.get(header)))
      .find((value) => isSome(value)),
  );

  if (isNone(resolvedHeader)) return mkTraceIdFromUuid();

  const traceId = mkTraceId(resolvedHeader.value.value);
  return isSome(traceId) ? traceId.value : mkTraceIdFromUuid();
};

const resolvePrincipalId = (req: Request): Option<PrincipalId> => {
  const rawPrincipalId = fromNullable(req.headers.get('x-principal-id'));
  return isSome(rawPrincipalId) ? mkPrincipalId(rawPrincipalId.value) : none;
};

const resolveIdempotencyKey = (req: Request): Option<IdempotencyKey> => {
  const rawIdempotencyKey = fromNullable(req.headers.get('idempotency-key'));
  return isSome(rawIdempotencyKey) ? mkIdempotencyKey(rawIdempotencyKey.value) : none;
};

/**
 * Builds a typed request context for downstream handler logic.
 * @param req Incoming Fetch API request.
 * @param routeTemplate Parameterized route template, never a resolved URL.
 * @returns Fully populated request context.
 */
export const extractContext = (req: Request, routeTemplate: string): RequestContext => ({
  traceId: extractTraceId(req),
  principalId: resolvePrincipalId(req),
  idempotencyKey: resolveIdempotencyKey(req),
  method: req.method,
  url: req.url,
  routeTemplate,
});

/**
 * Extracts the last non-empty URL path segment.
 * @param url Absolute request URL.
 * @returns Last non-empty segment or the empty string when no segment exists.
 */
export const extractLastPathSegment = (url: string): string => {
  // eslint-disable-next-line no-restricted-syntax -- DEVIATION(1.9): URL construction occurs at the HTTP boundary.
  const segments = new URL(url).pathname
    .split('/')
    .filter((segment) => segment.length > 0);

  return getOrElseOption(() => '')(fromNullable(segments.at(-1)));
};

/** Field-level validation issue represented as a path + human-readable constraint failure. */
export type FieldIssue = {
  readonly field: string;
  readonly issue: string;
};

/** Canonical validation error variant used in `ApiError` and Problem Details responses. */
export type ValidationError = {
  readonly kind: 'validation';
  readonly issues: ReadonlyArray<FieldIssue>;
  readonly message: string;
};

/** Zod-like validation error shape used by boundary adapters without importing zod directly. */
type ZodLikeError = {
  readonly errors: ReadonlyArray<{
    readonly path: ReadonlyArray<string | number>;
    readonly message: string;
  }>;
};

/**
 * Converts a Zod-like error shape into the canonical validation error value.
 * @param zodError Error object from a schema parser.
 * @returns Validation error with normalized issue paths.
 */
export const fromZodError = (zodError: ZodLikeError): ValidationError => ({
  kind: 'validation',
  message: 'Request validation failed',
  issues: zodError.errors.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : '(root)',
    issue: issue.message,
  })),
});

/**
 * Builds a validation error from explicit field issues.
 * @param issues Field-level issues.
 * @param message Summary message.
 * @returns Validation error.
 */
export const mkValidationError = (
  issues: ReadonlyArray<FieldIssue>,
  message = 'Validation failed',
): ValidationError => ({ kind: 'validation', issues, message });

/** Canonical HTTP-safe error ADT mapped to RFC 9457 responses by boundary mappers. */
export type ApiError =
  | ValidationError
  | { readonly kind: 'not_found'; readonly resource: string; readonly id: string }
  | { readonly kind: 'conflict'; readonly detail: string }
  | { readonly kind: 'permission'; readonly required: string }
  | { readonly kind: 'unauthenticated'; readonly scheme: string }
  | { readonly kind: 'rate_limit'; readonly retryAfterSeconds: number }
  | { readonly kind: 'precondition'; readonly detail: string }
  | { readonly kind: 'gone'; readonly resource: string }
  | { readonly kind: 'dependency'; readonly dependency: string; readonly cause: unknown }
  | { readonly kind: 'internal'; readonly cause: unknown };

/**
 * Construct a not-found API error.
 * @param resource Resource category identifier used in stable error codes.
 * @param id Missing resource identifier.
 * @returns Not-found ApiError.
 */
export const mkNotFoundError = (resource: string, id: string): ApiError =>
  ({ kind: 'not_found', resource, id });

/**
 * Construct a conflict API error.
 * @param detail Conflict reason suitable for client troubleshooting.
 * @returns Conflict ApiError.
 */
export const mkConflictError = (detail: string): ApiError =>
  ({ kind: 'conflict', detail });

/**
 * Construct a permission API error.
 * @param required Missing capability or permission scope.
 * @returns Permission ApiError.
 */
export const mkPermissionError = (required: string): ApiError =>
  ({ kind: 'permission', required });

/**
 * Construct an unauthenticated API error.
 * @param scheme Authentication scheme for the `WWW-Authenticate` response header.
 * @returns Unauthenticated ApiError.
 */
export const mkUnauthenticatedError = (scheme = 'Bearer'): ApiError =>
  ({ kind: 'unauthenticated', scheme });

/**
 * Construct a rate-limit API error.
 * @param retryAfterSeconds Suggested retry delay in seconds.
 * @returns Rate-limit ApiError.
 */
export const mkRateLimitError = (retryAfterSeconds: number): ApiError =>
  ({ kind: 'rate_limit', retryAfterSeconds });

/**
 * Construct a precondition-failed API error.
 * @param detail Description of the failed precondition.
 * @returns Precondition ApiError.
 */
export const mkPreconditionError = (detail: string): ApiError =>
  ({ kind: 'precondition', detail });

/**
 * Construct a gone API error.
 * @param resource Permanently removed resource category.
 * @returns Gone ApiError.
 */
export const mkGoneError = (resource: string): ApiError =>
  ({ kind: 'gone', resource });

/**
 * Construct a dependency API error.
 * @param dependency Upstream dependency identifier.
 * @param cause Internal diagnostic cause for logs only.
 * @returns Dependency ApiError.
 */
export const mkDependencyError = (dependency: string, cause: unknown): ApiError =>
  ({ kind: 'dependency', dependency, cause });

/**
 * Construct an internal API error.
 * @param cause Internal diagnostic cause for logs only.
 * @returns Internal ApiError.
 */
export const mkInternalError = (cause: unknown): ApiError =>
  ({ kind: 'internal', cause });

/** RFC 9457 payload shape used for all error responses emitted by this package. */
export type ProblemDetails = {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly code: string;
  readonly detail: string | null;
  readonly instance: string | null;
  readonly traceId: string;
  readonly errors: ReadonlyArray<FieldIssue> | null;
};

/**
 * Constructs a Problem Details object.
 * @param details Required and optional Problem Details fields.
 * @returns Problem details value.
 */
export const mkProblem = (
  details: {
    readonly status: number;
    readonly code: string;
    readonly title: string;
    readonly traceId: TraceId;
    readonly opts?: {
      readonly detail?: string;
      readonly instance?: string;
      readonly errors?: ReadonlyArray<FieldIssue>;
      readonly type?: string;
    };
  },
): ProblemDetails => {
  const opts = fromNullable(details.opts);

  const problemType = isSome(opts)
    ? getOrElseOption(() => 'about:blank')(fromNullable(opts.value.type))
    : 'about:blank';

  const problemDetail = isSome(opts)
    ? getOrElseOption<string | null>(() => null)(fromNullable(opts.value.detail))
    : null;

  const problemInstance = isSome(opts)
    ? getOrElseOption<string | null>(() => null)(fromNullable(opts.value.instance))
    : null;

  const problemErrors = isSome(opts)
    ? getOrElseOption<ReadonlyArray<FieldIssue> | null>(() => null)(fromNullable(opts.value.errors))
    : null;

  return {
    type: problemType,
    title: details.title,
    status: details.status,
    code: details.code,
    detail: problemDetail,
    instance: problemInstance,
    traceId: details.traceId,
    errors: problemErrors,
  };
};

/** Zod-like parser interface used to decouple config loading from a hard zod dependency. */
export type EnvSchema<T> = {
  readonly safeParse: (data: unknown) =>
    | { readonly success: true; readonly data: T }
    | {
      readonly success: false;
      readonly error: {
        readonly issues: ReadonlyArray<{
          readonly path: ReadonlyArray<string | number>;
          readonly message: string;
        }>;
      };
    };
};

/** Startup-time configuration validation error with aggregated field failures. */
export type ConfigError = {
  readonly kind: 'config_invalid';
  readonly issues: ReadonlyArray<{ readonly path: string; readonly message: string }>;
  readonly summary: string;
};

/**
 * Parses and validates environment variables via a schema.
 * @param schema Parser schema.
 * @param env Raw environment key-value map.
 * @returns Typed config or a config validation error.
 */
export const loadConfig = <T>(
  schema: EnvSchema<T>,
  env: Record<string, string | undefined>,
): Result<T, ConfigError> => {
  const parsed = schema.safeParse(env);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));

    const summary =
      'Configuration validation failed:\n' +
      issues.map((issue) => `  ${issue.path}: ${issue.message}`).join('\n');

    return err({ kind: 'config_invalid', issues, summary });
  }

  return ok(parsed.data);
};

/**
 * Decodes a base64url cursor into a record payload.
 * @param cursor Cursor value.
 * @returns Decoded record or `None` when malformed.
 */
// NOTE(unknown, 2026-05-20): Cursor payloads are intentionally treated as untrusted input,
// even when generated by this service, so decode always re-validates object shape.
export const decodeCursor = (cursor: Cursor): Option<Record<string, unknown>> => {
  const decoded = tryDecodeCursor(cursor);
  return isRecord(decoded) ? some(decoded) : none;
};

const tryDecodeCursor = (cursor: Cursor): unknown => {
  const normalized = cursor.replace(/-/g, '+').replace(/_/g, '/');
  const parsed = tryDecodeJson(normalized);
  return isSome(parsed) ? parsed.value : null;
};

const tryDecodeJson = (value: string): Option<unknown> => {
  const decoded = parseJsonFromBase64(value);
  return isSome(decoded) ? decoded : none;
};

const parseJsonFromBase64 = (value: string): Option<unknown> => {
  const decoded = safeAtob(value);
  if (isNone(decoded)) return none;

  return safeJsonParse(decoded.value);
};

const safeAtob = (value: string): Option<string> => {
  const decoded = tryCatch(
    () => atob(value),
    () => 'invalid_base64',
  );

  return isOk(decoded) ? some(decoded.value) : none;
};

const safeJsonParse = (value: string): Option<unknown> => {
  const parsed = tryCatch(
    () => JSON.parse(value),
    () => 'invalid_json',
  );

  return isOk(parsed) ? some(parsed.value) : none;
};
