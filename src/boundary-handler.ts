/**
 * @module boundary-handler
 * @packageDocumentation
 *
 * High-level handler composition helpers for common boundary patterns.
 */

import {
  type Result,
  err,
  fromNullable,
  isErr,
  isNone,
  ok,
  tryCatchAsync,
} from '@tsfpp/prelude';

import { type RawHandler } from './boundary-idempotency.js';
import {
  encodeCursor,
  parsePaginationQuery,
  type PageQuery,
} from './boundary-operations.js';
import { apiErrorToResponse } from './boundary-response.js';
import {
  type ApiError,
  type Cursor,
  type RequestContext,
  type ValidationError,
  extractContext,
  fromZodError,
  mkValidationError,
} from './boundary-types.js';

type ZodLikeParseError = {
  readonly errors: ReadonlyArray<{
    readonly path: ReadonlyArray<string | number>;
    readonly message: string;
  }>;
};

/** Structural schema shape accepted by boundary JSON parsing helpers. */
export type JsonSchema<T> = {
  readonly safeParse: (input: unknown) =>
    | { readonly success: true; readonly data: T }
    | { readonly success: false; readonly error: ZodLikeParseError };
};

/** Shared input passed to application handler implementations. */
export type HandlerInput<Deps> = {
  readonly deps: Deps;
  readonly req: Request;
  readonly ctx: RequestContext;
};

/** Shared input for JSON handlers after schema validation. */
export type JsonHandlerInput<Deps, Body> = HandlerInput<Deps> & {
  readonly body: Body;
};

/**
 * Parses request JSON as unknown and maps parse failures to validation errors.
 * @param req Incoming request.
 * @returns Parsed unknown JSON value or a canonical validation error.
 */
export const parseJsonBody = async (
  req: Request,
): Promise<Result<unknown, ValidationError>> =>
  tryCatchAsync(
    () => req.json(),
    () => mkValidationError([{ field: 'body', issue: 'Body must be valid JSON' }]),
  );

/**
 * Parses and validates request JSON through a schema.
 * @param req Incoming request.
 * @param schema Validation schema with safeParse semantics.
 * @returns Typed body value or validation error.
 */
export const parseJsonWithSchema = async <Body>(
  req: Request,
  schema: JsonSchema<Body>,
): Promise<Result<Body, ValidationError>> => {
  const rawResult = await parseJsonBody(req);
  if (isErr(rawResult)) return err(rawResult.error);

  const parsed = schema.safeParse(rawResult.value);
  return parsed.success
    ? ok(parsed.data)
    : err(fromZodError(parsed.error));
};

/**
 * Creates a context-aware raw handler with canonical ApiError mapping.
 * @param params Handler configuration.
 * @returns Raw fetch-compatible handler.
 */
export const createHandler = <Deps>(params: {
  readonly deps: Deps;
  readonly routeTemplate: string;
  readonly handle: (input: HandlerInput<Deps>) => Promise<Result<Response, ApiError>>;
}): RawHandler =>
  async (req: Request): Promise<Response> => {
    const ctx = extractContext(req, params.routeTemplate);
    const outcome = await params.handle({ deps: params.deps, req, ctx });
    return isErr(outcome)
      ? apiErrorToResponse(outcome.error, ctx)
      : outcome.value;
  };

/**
 * Creates a JSON handler that performs parse and schema validation before use-case logic.
 * @param params JSON handler configuration.
 * @returns Raw fetch-compatible handler.
 */
export const createJsonHandler = <Deps, Body>(params: {
  readonly deps: Deps;
  readonly routeTemplate: string;
  readonly schema: JsonSchema<Body>;
  readonly handle: (input: JsonHandlerInput<Deps, Body>) => Promise<Result<Response, ApiError>>;
}): RawHandler =>
  createHandler({
    deps: params.deps,
    routeTemplate: params.routeTemplate,
    handle: async ({ deps, req, ctx }) => {
      const bodyResult = await parseJsonWithSchema(req, params.schema);
      if (isErr(bodyResult)) return err(bodyResult.error);
      return params.handle({ deps, req, ctx, body: bodyResult.value });
    },
  });

/**
 * Computes the next cursor for a keyset page using the final row when page size is full.
 * @param params Page rows, query metadata, and cursor payload selector.
 * @returns Encoded next cursor when another page likely exists, otherwise null.
 */
export const mkNextCursor = <T>(params: {
  readonly items: ReadonlyArray<T>;
  readonly page: PageQuery;
  readonly toPayload: (item: T) => Record<string, unknown>;
}): Cursor | null => {
  if (params.items.length !== params.page.limit) return null;

  const lastItem = fromNullable(params.items.at(-1));
  if (isNone(lastItem)) return null;

  return encodeCursor(params.toPayload(lastItem.value));
};

/**
 * Parses pagination query params from the request URL.
 * @param req Incoming request.
 * @param maxLimit Maximum accepted page size.
 * @returns Page query or validation error.
 */
export const parsePaginationFromRequest = (
  req: Request,
  maxLimit: number = 100,
): Result<PageQuery, ValidationError> => {
  // eslint-disable-next-line no-restricted-syntax -- DEVIATION(1.9): URL parsing is performed at HTTP boundary helper.
  const url = new URL(req.url);
  return parsePaginationQuery(url, maxLimit);
};
