/**
 * @module boundary-response
 * @packageDocumentation
 *
 * HTTP response builders and API-error mapping.
 */

import { isSome, none, some, type Option } from '@tsfpp/prelude';

import {
  type ApiError,
  type ProblemDetails,
  type RequestContext,
  mkProblem,
} from './boundary-types.js';
import { type Operation } from './boundary-operations.js';

const CONTENT_TYPE_JSON = 'application/json; charset=utf-8';
const CONTENT_TYPE_PROBLEM = 'application/problem+json';

type ErrorMapperContext = Pick<RequestContext, 'traceId' | 'url'>;

const mkResponse = (body: BodyInit | null, init: ResponseInit): Response => {
  // eslint-disable-next-line no-restricted-syntax -- DEVIATION(1.9): Response construction is the HTTP adapter boundary.
  return new Response(body, init);
};

const mkMappedProblem = (input: {
  readonly status: number;
  readonly code: string;
  readonly title: string;
  readonly ctx: ErrorMapperContext;
  readonly detail: Option<string>;
  readonly errors: Option<ReadonlyArray<{ readonly field: string; readonly issue: string }>>;
}): ProblemDetails => {
  const detail = isSome(input.detail) ? { detail: input.detail.value } : {};
  const errors = isSome(input.errors) ? { errors: input.errors.value } : {};

  return mkProblem({
    status: input.status,
    code: input.code,
    title: input.title,
    traceId: input.ctx.traceId,
    opts: {
      ...detail,
      instance: input.ctx.url,
      ...errors,
    },
  });
};

/**
 * Builds a JSON response with explicit status and headers.
 * @param status HTTP status code.
 * @param body JSON-serializable body.
 * @param headers Extra headers merged after content type.
 * @returns HTTP response.
 */
export const jsonResponse = <T>(
  status: number,
  body: T,
  headers: Record<string, string> = {},
): Response =>
  mkResponse(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': CONTENT_TYPE_JSON, ...headers },
  });

/**
 * Build a 200 JSON success response.
 * @param body Serialized response payload.
 * @param headers Additional response headers merged after defaults.
 * @returns 200 response with JSON body.
 */
export const okResponse = <T>(
  body: T,
  headers: Record<string, string> = {},
): Response => jsonResponse(200, body, headers);

/**
 * Build a 201 created response with resource location.
 * @param body Serialized response payload.
 * @param location Canonical URI for the newly created resource.
 * @param headers Additional response headers merged after defaults.
 * @returns 201 response with mandatory location header.
 */
export const createdResponse = <T>(
  body: T,
  location: string,
  headers: Record<string, string> = {},
): Response => jsonResponse(201, body, { Location: location, ...headers });

/**
 * Build a 202 accepted response for long-running operations.
 * @param operation Operation resource snapshot.
 * @param operationLocation Pollable operation URI.
 * @param headers Additional response headers merged after defaults.
 * @returns 202 response with operation body and poll location.
 */
export const acceptedResponse = <T>(
  operation: Operation<T>,
  operationLocation: string,
  headers: Record<string, string> = {},
): Response => jsonResponse(202, operation, { Location: operationLocation, ...headers });

/**
 * Build a 204 no-content response.
 * @param headers Additional response headers.
 * @returns 204 response without body.
 */
export const noContentResponse = (headers: Record<string, string> = {}): Response =>
  mkResponse(null, { status: 204, headers });

/**
 * Build an HTTP redirect response.
 * @param status Redirect status code.
 * @param location Target location URI.
 * @param headers Additional response headers.
 * @returns Redirect response with location header.
 */
export const redirectResponse = (
  status: 301 | 302 | 307 | 308,
  location: string,
  headers: Record<string, string> = {},
): Response =>
  mkResponse(null, { status, headers: { Location: location, ...headers } });

/**
 * Builds a problem+json response.
 * @param problem Problem details body.
 * @param headers Extra headers.
 * @returns HTTP response.
 */
export const problemResponse = (
  problem: ProblemDetails,
  headers: Record<string, string> = {},
): Response =>
  mkResponse(JSON.stringify(problem), {
    status: problem.status,
    headers: { 'Content-Type': CONTENT_TYPE_PROBLEM, ...headers },
  });

const mapClientErrorGroupA = (error: ApiError, ctx: ErrorMapperContext): Option<ProblemDetails> => {
  if (error.kind === 'validation') {
    return some(mkMappedProblem({ status: 422, code: 'validation_failed', title: 'Request validation failed', ctx, detail: some(error.message), errors: some(error.issues) }));
  }
  if (error.kind === 'not_found') {
    return some(mkMappedProblem({ status: 404, code: `not_found_${error.resource}`, title: `${error.resource} not found`, ctx, detail: some(`No ${error.resource} with id '${error.id}'`), errors: none }));
  }
  if (error.kind === 'conflict') {
    return some(mkMappedProblem({ status: 409, code: 'conflict', title: 'Request conflicts with current state', ctx, detail: some(error.detail), errors: none }));
  }
  if (error.kind === 'permission') {
    return some(mkMappedProblem({ status: 403, code: 'permission_denied', title: 'Insufficient permissions', ctx, detail: some(`Requires: ${error.required}`), errors: none }));
  }
  return none;
};

const mapClientErrorGroupB = (error: ApiError, ctx: ErrorMapperContext): Option<ProblemDetails> => {
  if (error.kind === 'unauthenticated') {
    return some(mkMappedProblem({ status: 401, code: 'unauthenticated', title: 'Authentication required', ctx, detail: none, errors: none }));
  }
  if (error.kind === 'rate_limit') {
    return some(mkMappedProblem({ status: 429, code: 'rate_limit_exceeded', title: 'Rate limit exceeded', ctx, detail: none, errors: none }));
  }
  if (error.kind === 'precondition') {
    return some(mkMappedProblem({ status: 412, code: 'precondition_failed', title: 'Precondition failed', ctx, detail: some(error.detail), errors: none }));
  }
  if (error.kind === 'gone') {
    return some(mkMappedProblem({ status: 410, code: `gone_${error.resource}`, title: `${error.resource} has been permanently removed`, ctx, detail: none, errors: none }));
  }
  return none;
};

const mapServerErrors = (error: ApiError, ctx: ErrorMapperContext): ProblemDetails => {
  if (error.kind === 'dependency') {
    return mkMappedProblem({
      status: 502,
      code: 'dependency_unavailable',
      title: 'An upstream dependency is unavailable',
      ctx,
      detail: none,
      errors: none,
    });
  }

  if (error.kind === 'internal') {
    return mkMappedProblem({
      status: 500,
      code: 'internal_error',
      title: 'An unexpected error occurred',
      ctx,
      detail: none,
      errors: none,
    });
  }

  return mkMappedProblem({
    status: 500,
    code: 'internal_error',
    title: 'An unexpected error occurred',
    ctx,
    detail: none,
    errors: none,
  });
};

/**
 * Maps ApiError to RFC 9457 problem details.
 * @param error Domain API error.
 * @param ctx Request context subset.
 * @returns Problem details value.
 */
export const apiErrorToProblem = (
  error: ApiError,
  ctx: ErrorMapperContext,
): ProblemDetails => {
  const groupA = mapClientErrorGroupA(error, ctx);
  if (isSome(groupA)) return groupA.value;

  const groupB = mapClientErrorGroupB(error, ctx);
  if (isSome(groupB)) return groupB.value;

  return mapServerErrors(error, ctx);
};

/**
 * Converts an ApiError into an HTTP response.
 * @param error Domain API error.
 * @param ctx Request context subset.
 * @returns Problem response with variant-specific headers.
 */
export const apiErrorToResponse = (
  error: ApiError,
  ctx: ErrorMapperContext,
): Response => {
  const problem = apiErrorToProblem(error, ctx);

  const unauthenticatedHeaders =
    error.kind === 'unauthenticated' ? { 'WWW-Authenticate': error.scheme } : {};
  const rateLimitHeaders =
    error.kind === 'rate_limit' ? { 'Retry-After': String(error.retryAfterSeconds) } : {};

  return problemResponse(problem, {
    ...unauthenticatedHeaders,
    ...rateLimitHeaders,
  });
};

/**
 * Generic application-level error mapper.
 * @param error Any domain/application error.
 * @param ctx Request context subset.
 * @returns HTTP response.
 */
export type ErrorMapper<E> = (
  error: E,
  ctx: ErrorMapperContext,
) => Response;
