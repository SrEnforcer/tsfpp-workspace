/**
 * Tests for the Zod 4 compatibility of the schema helpers and for the
 * request-parsing, language, client, cache, idempotency-required and runMain
 * additions. Laws are checked with fast-check (Rule 8.2).
 */

import * as fc from 'fast-check';
import { type Mock, afterEach, describe, expect, it, vi } from 'vitest';

import { type Result, err, isErr, isNone, isOk, isSome, none, ok, some } from '@tsfpp/prelude';

import {
  type IdempotencyStore,
  type JsonSchema,
  fetchJson,
  fromZodError,
  loadConfig,
  mkFieldError,
  mkProblem,
  mkTraceId,
  parseAcceptLanguage,
  parseJsonWithSchema,
  parseProblemDetails,
  parseQuery,
  parseWith,
  preferredLanguage,
  queryOf,
  readJsonResponse,
  runMain,
  withIdempotency,
  withResultCache,
} from './boundary.js';

// ── Test adapters ───────────────────────────────────────────────────────────

const mkRequest = (url: string, init?: RequestInit): Request =>
  // eslint-disable-next-line no-restricted-syntax -- DEVIATION(1.9): Request construction is test adapter setup.
  new Request(url, init);

const mkResponse = (body: string | null, init: ResponseInit): Response =>
  // eslint-disable-next-line no-restricted-syntax -- DEVIATION(1.9): Response construction is test adapter setup.
  new Response(body, init);

const jsonResponse = (body: unknown, status: number): Response =>
  mkResponse(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** A schema with Zod 4's error shape: `issues` only, and a symbol in the path. */
const zod4Like = <T>(guard: (value: unknown) => value is T): JsonSchema<T> => ({
  safeParse: (input) => (guard(input)
    ? { success: true, data: input }
    : { success: false, error: { issues: [{ path: ['body', Symbol('meta'), 0], message: 'Invalid input' }] } }),
});

const isNamed = (value: unknown): value is { readonly name: string } =>
  typeof value === 'object' && value !== null && 'name' in value && typeof value.name === 'string';

// ── Zod 4 compatibility ─────────────────────────────────────────────────────

describe('schema errors of Zod 3 and Zod 4', (): void => {
  it('fromZodError reads Zod 4 issues, symbol segments included', (): void => {
    const error = fromZodError({ issues: [{ path: ['a', Symbol('b'), 1], message: 'm' }] });
    expect(error.issues).toEqual([{ field: 'a.b.1', issue: 'm' }]);
  });

  it('fromZodError still reads the Zod 3 errors alias, and names an empty path (root)', (): void => {
    expect(fromZodError({ errors: [{ path: [], message: 'm' }] }).issues).toEqual([{ field: '(root)', issue: 'm' }]);
  });

  it('parseJsonWithSchema answers a Zod 4 refusal with a validation error instead of throwing', async (): Promise<void> => {
    const req = mkRequest('https://x.test/', { method: 'POST', body: JSON.stringify({ nope: true }) });
    const body = await parseJsonWithSchema(req, zod4Like(isNamed));
    expect(isErr(body) && body.error.issues).toEqual([{ field: 'body.meta.0', issue: 'Invalid input' }]);
  });

  it('loadConfig reads a Zod 4 refusal', (): void => {
    const config = loadConfig(zod4Like(isNamed), {});
    expect(isErr(config) && config.error.issues).toEqual([{ path: 'body.meta.0', message: 'Invalid input' }]);
  });

  it('mkFieldError is a validation error with one issue', (): void => {
    expect(mkFieldError('text', 'required')).toEqual({ kind: 'validation', issues: [{ field: 'text', issue: 'required' }], message: 'Validation failed' });
  });
});

// ── Request parsing ─────────────────────────────────────────────────────────

describe('parseWith and parseQuery', (): void => {
  it('parseWith passes a value the schema accepts', (): void => {
    expect(parseWith(zod4Like(isNamed), { name: 'a' })).toEqual(ok({ name: 'a' }));
  });

  it('parseWith refuses with every issue', (): void => {
    expect(isErr(parseWith(zod4Like(isNamed), {}))).toBe(true);
  });

  it('parseQuery parses the query of a request', (): void => {
    const query = parseQuery(zod4Like(isNamed))(mkRequest('https://x.test/p?name=ada&x=1'));
    expect(isOk(query) && query.value.name).toBe('ada');
  });
});

describe('queryOf', (): void => {
  it('decodes, treats + as a space, keeps the first of repeated names and ignores the fragment', (): void => {
    expect(queryOf('/p?q=a+b%26c&q=second&flag&e=%E2%82%AC#q=frag')).toEqual({ q: 'a b&c', flag: '', e: '€' });
  });

  it('leaves text that does not decode as it is, and has no query without ?', (): void => {
    expect(queryOf('/p?bad=%E0%A4%A')).toEqual({ bad: '%E0%A4%A' });
    expect(queryOf('/p')).toEqual({});
  });

  it('round-trips encoded pairs with distinct names', (): void => {
    const pairs = fc.uniqueArray(fc.tuple(fc.string({ minLength: 1 }), fc.string()), { selector: ([name]) => name });
    fc.assert(fc.property(pairs, (entries) => {
      const search = entries.map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`).join('&');
      return JSON.stringify(queryOf(`/p?${search}`)) === JSON.stringify(Object.fromEntries(entries));
    }));
  });
});

// ── Idempotency key required ────────────────────────────────────────────────

describe('withIdempotency required', (): void => {
  const store: IdempotencyStore = {
    check: () => Promise.resolve({ kind: 'first_request' }),
    markInFlight: () => Promise.resolve(),
    store: () => Promise.resolve(),
  };
  const handler = (): Promise<Response> => Promise.resolve(mkResponse('done', { status: 201 }));

  it('refuses a request without a key with 400 before the handler runs', async (): Promise<void> => {
    const response = await withIdempotency(store, { required: true })(handler)(mkRequest('https://x.test/', { method: 'POST' }));
    const problem = parseProblemDetails(await response.json());
    expect(response.status).toBe(400);
    expect(isSome(problem) && problem.value.code).toBe('idempotency_key_required');
  });

  it('runs a request with a key', async (): Promise<void> => {
    const req = mkRequest('https://x.test/', { method: 'POST', headers: { 'Idempotency-Key': 'k-1' } });
    expect((await withIdempotency(store, { required: true })(handler)(req)).status).toBe(201);
  });

  it('still lets a request without a key through by default', async (): Promise<void> => {
    expect((await withIdempotency(store)(handler)(mkRequest('https://x.test/', { method: 'POST' }))).status).toBe(201);
  });
});

// ── Accept-Language ─────────────────────────────────────────────────────────

describe('Accept-Language', (): void => {
  it('orders by weight, keeps header order on ties, and drops q=0, malformed weights and empty tags', (): void => {
    const ranges = parseAcceptLanguage('nl;q=0.5, en-GB, fr;q=0, de;q=1.5, ;q=0.9, en;q=0.5, *;q=0.1');
    expect(ranges.map(({ tag }) => tag)).toEqual(['en-GB', 'nl', 'en', '*']);
  });

  it('is empty for an absent header', (): void => {
    expect(parseAcceptLanguage(undefined)).toEqual([]);
  });

  it('gives weights in (0, 1], never increasing, for any header', (): void => {
    fc.assert(fc.property(fc.string(), (header) => {
      const weights = parseAcceptLanguage(header).map(({ weight }) => weight);
      return weights.every((w, i) => w > 0 && w <= 1 && (i === 0 || w <= (weights[i - 1] ?? 1)));
    }));
  });

  it('prefers the heaviest tag the application accepts', (): void => {
    const served = (tag: string): ReturnType<typeof some<string>> | typeof none => (['nl', 'en'].includes(tag) ? some(tag) : none);
    expect(preferredLanguage('fy;q=1, en;q=0.4, nl;q=0.8', served)).toEqual(some('nl'));
    expect(preferredLanguage('fy, *', served)).toEqual(none);
  });
});

// ── Client ──────────────────────────────────────────────────────────────────

describe('client', (): void => {
  const traceId = mkTraceId('trace-1');
  const problem = isSome(traceId)
    ? mkProblem({ status: 404, code: 'not_found', title: 'Not found', traceId: traceId.value })
    : undefined;

  it('parses the problem details boundary writes', (): void => {
    expect(parseProblemDetails(JSON.parse(JSON.stringify(problem)))).toEqual(some(problem));
  });

  it('reads absent optional members as null and refuses a body without a code', (): void => {
    const parsed = parseProblemDetails({ type: 'about:blank', title: 't', status: 400, code: 'c', traceId: 'x' });
    expect(isSome(parsed) && parsed.value.errors).toBe(null);
    expect(isNone(parseProblemDetails({ type: 'about:blank', title: 't', status: 400, traceId: 'x' }))).toBe(true);
  });

  it('answers a success through the schema, and a body it refuses as malformed', async (): Promise<void> => {
    expect(await readJsonResponse(jsonResponse({ name: 'a' }, 200), zod4Like(isNamed))).toEqual(ok({ name: 'a' }));
    expect(await readJsonResponse(jsonResponse({}, 200), zod4Like(isNamed))).toEqual(err({ kind: 'malformed', status: 200 }));
  });

  it('answers 401 as unauthenticated and another refusal as a problem', async (): Promise<void> => {
    expect(await readJsonResponse(jsonResponse(problem, 401), zod4Like(isNamed))).toEqual(err({ kind: 'unauthenticated' }));
    expect(await readJsonResponse(jsonResponse(problem, 404), zod4Like(isNamed))).toEqual(err({ kind: 'problem', status: 404, problem: some(problem) }));
    expect(await readJsonResponse(mkResponse('<html>', { status: 502 }), zod4Like(isNamed))).toEqual(err({ kind: 'problem', status: 502, problem: none }));
  });

  it('answers a fetch that throws as offline', async (): Promise<void> => {
    const outcome = await fetchJson({ fetch: () => Promise.reject('network') }, { url: 'https://x.test/', schema: zod4Like(isNamed) });
    expect(outcome).toEqual(err({ kind: 'offline' }));
  });
});

// ── Result cache ────────────────────────────────────────────────────────────

describe('withResultCache', (): void => {
  type Source = Mock<(input: string) => Promise<Result<string, string>>>;
  const counting = (answer: (input: string) => Result<string, string>): Source =>
    vi.fn((input: string): Promise<Result<string, string>> => Promise.resolve(answer(input)));
  const callsOf = (source: Source): ReadonlyArray<string> => source.mock.calls.map(([input]) => input);
  const clockAt = (times: ReadonlyArray<number>): (() => number) => {
    const state = { index: 0 };
    // eslint-disable-next-line functional/immutable-data -- DEVIATION(2.3): a test clock that advances per call.
    return () => times[Math.min(state.index++, times.length - 1)] ?? 0;
  };

  it('keeps a success for ttlMs and asks again after', async (): Promise<void> => {
    const source = counting((input) => ok(input.toUpperCase()));
    const cached = withResultCache({ clock: clockAt([0, 50, 100]), ttlMs: 100, capacity: 10, keyOf: (input: string) => input })(source);
    expect(await cached('a')).toEqual(ok('A'));
    expect(await cached('a')).toEqual(ok('A'));
    expect(await cached('a')).toEqual(ok('A'));
    expect(callsOf(source)).toEqual(['a', 'a']);
  });

  it('does not keep a failure', async (): Promise<void> => {
    const source = counting(() => err('down'));
    const cached = withResultCache({ clock: () => 0, ttlMs: 1000, capacity: 10, keyOf: (input: string) => input })(source);
    await cached('a');
    await cached('a');
    expect(callsOf(source)).toEqual(['a', 'a']);
  });

  it('drops the oldest key past capacity, and keeps nothing at capacity 0', async (): Promise<void> => {
    const first = counting((input) => ok(input));
    const two = withResultCache({ clock: () => 0, ttlMs: 1000, capacity: 2, keyOf: (input: string) => input })(first);
    await two('a'); await two('b'); await two('c'); await two('a');
    expect(callsOf(first)).toEqual(['a', 'b', 'c', 'a']);
    const second = counting((input) => ok(input));
    const keepsNone = withResultCache({ clock: () => 0, ttlMs: 1000, capacity: 0, keyOf: (input: string) => input })(second);
    await keepsNone('a'); await keepsNone('a');
    expect(callsOf(second)).toEqual(['a', 'a']);
  });
});

// ── runMain ─────────────────────────────────────────────────────────────────

describe('runMain', (): void => {
  afterEach((): void => {
    // eslint-disable-next-line functional/immutable-data -- DEVIATION(2.3): restores the test process's exit code.
    process.exitCode = 0;
  });

  it('sets 0 for Ok and reports nothing', async (): Promise<void> => {
    const report = vi.fn();
    expect(await runMain(() => Promise.resolve(ok('done')), report)).toBe(0);
    expect(report).not.toHaveBeenCalled();
  });

  it('sets 1 and reports an Err as failed, and a throw as threw', async (): Promise<void> => {
    const report = vi.fn();
    expect(await runMain(() => Promise.resolve(err('bad')), report)).toBe(1);
    expect(process.exitCode).toBe(1);
    expect(await runMain(() => Promise.reject('boom'), report)).toBe(1);
    expect(report.mock.calls).toEqual([[{ kind: 'failed', error: 'bad' }], [{ kind: 'threw', reason: 'boom' }]]);
  });
});
