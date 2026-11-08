/**
 * @module boundary-node
 * @packageDocumentation
 *
 * Node.js adapter that bridges IncomingMessage/ServerResponse to Fetch API handlers.
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { buffer } from 'node:stream/consumers';

import {
  type Logger,
  type Option,
  type Result,
  fromNullable,
  getOrElseOption,
  isErr,
  isSome,
  none,
  some,
  tryCatchAsync,
} from '@tsfpp/prelude';

import { type RawHandler } from './boundary-idempotency.js';

/** Node adapter runtime options controlling bind address and operational logging. */
export type NodeAdapterOptions = {
  readonly port: number;
  readonly host?: string;
  readonly logger?: Logger;
};

/** Runtime control handle returned by the Node adapter factory. */
export type NodeAdapterHandle = {
  /**
   * Start accepting HTTP requests.
   * @param gracefulShutdown Enable SIGINT/SIGTERM handlers that close the server before exit.
   * @returns No value.
   */
  readonly listen: (gracefulShutdown?: boolean) => void;

  /**
   * Close the HTTP server and resolve when close completes.
   * @returns Promise resolved after close callback completion.
   */
  readonly close: () => Promise<void>;
};

const toFetchHeaders = (
  headers: Readonly<Record<string, string | ReadonlyArray<string> | undefined>>,
): HeadersInit =>
  Object.fromEntries(
    Object.entries(headers).flatMap(([key, value]) => {
      if (typeof value === 'string') return [[key, value]];
      if (Array.isArray(value)) return [[key, value.join(', ')]];
      return [];
    }),
  );

const toFetchHost = (
  host: string | ReadonlyArray<string> | undefined,
): string => {
  if (typeof host === 'string') return host;
  if (Array.isArray(host) && host.length > 0) {
    return getOrElseOption(() => 'localhost')(fromNullable(host[0]));
  }
  return 'localhost';
};

const mkRequest = async (req: IncomingMessage): Promise<Request> => {
  const method = getOrElseOption(() => 'GET')(fromNullable(req.method));
  const urlPath = getOrElseOption(() => '/')(fromNullable(req.url));
  const host = toFetchHost(req.headers.host);
  const hasBody = method !== 'GET' && method !== 'HEAD';
  const bodyBuffer = hasBody ? await buffer(req) : null;

  // eslint-disable-next-line no-restricted-syntax -- DEVIATION(1.9): Request construction is Node-to-Fetch adapter boundary.
  return new Request(`http://${host}${urlPath}`, {
    method,
    headers: toFetchHeaders(req.headers),
    body: bodyBuffer,
  });
};

const writeResponse = async (res: ServerResponse, response: Response): Promise<void> => {
  // eslint-disable-next-line functional/immutable-data -- DEVIATION(2.3): Node ServerResponse uses mutable imperative API.
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  res.end(Buffer.from(await response.arrayBuffer()));
};

const writeUnhandledError = (res: ServerResponse, logger: Logger | undefined, reason: unknown): void => {
  logger?.error({
    message: 'node_adapter.unhandled_error',
    error: String(reason),
  });

  // eslint-disable-next-line functional/immutable-data -- DEVIATION(2.3): Node ServerResponse uses mutable imperative API.
  res.statusCode = 500;
  res.end();
};

const bindNodeRequest = (handler: RawHandler, logger: Logger | undefined) =>
  (req: IncomingMessage, res: ServerResponse): void => {
    void (async (): Promise<void> => {
      const request = await mkRequest(req);

      try {
        const response = await handler(request);
        await writeResponse(res, response);
      } catch (reason) {
        writeUnhandledError(res, logger, reason);
      }
    })();
  };

const registerGracefulShutdown = (
  closeNow: () => void,
  logger: Logger | undefined,
): void => {
  const shutdown = (): void => {
    logger?.info({ message: 'node_adapter.shutdown' });
    closeNow();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

const closeServer = (server: ReturnType<typeof createServer>): Promise<void> =>
  // eslint-disable-next-line no-restricted-syntax -- DEVIATION(1.9): Promise construction is async boundary for callback API.
  new Promise((resolve, reject) => {
    server.close((reason: Error | undefined) => {
      const reasonOption = fromNullable(reason);
      if (isSome(reasonOption)) {
        reject(reasonOption.value);
        return;
      }

      resolve();
    });
  });

/**
 * Creates a Node.js HTTP adapter around a fetch-style raw handler.
 * @param handler Fetch-style request handler.
 * @param options Adapter configuration.
 * @returns Adapter handle for lifecycle management.
 */
export const mkNodeAdapter = (
  handler: RawHandler,
  options: NodeAdapterOptions,
): NodeAdapterHandle => {
  const host = getOrElseOption(() => '0.0.0.0')(fromNullable(options.host));
  const server = createServer(bindNodeRequest(handler, options.logger));

  const listen = (gracefulShutdown: boolean = true): void => {
    server.listen(options.port, host, () => {
      options.logger?.info({
        message: 'node_adapter.listening',
        port: options.port,
        host,
      });
    });

    if (gracefulShutdown) {
      registerGracefulShutdown(() => {
        server.close(() => {
          process.exit(0);
        });
      }, options.logger);
    }
  };

  const close = (): Promise<void> => closeServer(server);

  return { listen, close };
};

/** Why a script's main program did not succeed. */
export type MainFailure<E> =
  | { readonly kind: 'failed'; readonly error: E }
  | { readonly kind: 'threw'; readonly reason: unknown };

/**
 * Runs a script's main program and reports its outcome through the process
 * exit code — `0` for `Ok`, `1` for an `Err` or a throw — so a script needs
 * no exit-code mutation of its own. The process is left to end by itself
 * (no `process.exit`), so pending output still flushes.
 * @param program The script's work, as a Result-returning effect.
 * @param onFailure Reports a failure, typically through a logger.
 * @returns The exit code it set.
 */
export const runMain = async <E>(
  program: () => Promise<Result<unknown, E>>,
  onFailure: (failure: MainFailure<E>) => void,
): Promise<number> => {
  const outcome = await tryCatchAsync(program, (reason): MainFailure<E> => ({ kind: 'threw', reason }));
  const failure: Option<MainFailure<E>> = isErr(outcome)
    ? some(outcome.error)
    : isErr(outcome.value) ? some({ kind: 'failed', error: outcome.value.error }) : none;
  if (isSome(failure)) onFailure(failure.value);
  const code = isSome(failure) ? 1 : 0;
  // eslint-disable-next-line functional/immutable-data -- DEVIATION(2.3): the process reports its outcome through its exit code.
  process.exitCode = code;
  return code;
};
