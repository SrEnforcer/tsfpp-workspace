/**
 * @module logger
 *
 * The `Logger` port: the interface application code depends on, implemented in
 * the infrastructure layer and injected as a dependency (Rule 6.5).
 */

/**
 * Severity levels available to the application logger.
 *
 * Follows the syslog convention with four levels. `trace` is intentionally
 * omitted — it is too granular for structured production logs. `fatal` is
 * intentionally omitted — process-level fatal conditions are handled by the
 * process supervisor, not by the application logger.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Typed log entry. All fields except `message` are optional — include only
 * what is operationally relevant at the call site.
 *
 * `traceId` SHOULD be included whenever the entry originates within a request
 * context. It is the primary correlation handle across logs, APM, and error
 * trackers.
 *
 * The index signature allows additional structured fields. All additional
 * fields must be flat — no nested objects — to remain queryable in log
 * aggregators.
 */
export type LogEntry = {
  readonly message:   string;
  readonly traceId?:  string;
  readonly userId?:   string;    // principal identifier — never a credential or PII
  readonly duration?: number;    // milliseconds
  readonly error?:    string;    // serialised error message — never a stack trace in production
  readonly code?:     string;    // machine-readable error code
  readonly [key: string]: unknown;
};

/**
 * Logger port. Defines the interface that all application code depends on.
 * Implement with pino, winston, or any structured logger in the infrastructure
 * layer and inject as a dependency.
 *
 * Never import a concrete logger directly in core, use-case, DAL, or handler
 * code. Depend on this interface only.
 *
 * @example
 * // Infrastructure adapter (pino)
 * import pino from 'pino'
 * import { type Logger } from '@tsfpp/prelude'
 *
 * const pinoInstance = pino({ level: 'info' })
 *
 * export const logger: Logger = {
 *   debug: (entry) => pinoInstance.debug(entry, entry.message),
 *   info:  (entry) => pinoInstance.info(entry, entry.message),
 *   warn:  (entry) => pinoInstance.warn(entry, entry.message),
 *   error: (entry) => pinoInstance.error(entry, entry.message),
 * }
 *
 * @example
 * // Silent logger for tests
 * export const silentLogger: Logger = {
 *   debug: () => undefined,
 *   info:  () => undefined,
 *   warn:  () => undefined,
 *   error: () => undefined,
 * }
 */
export type Logger = {
  readonly debug: (entry: LogEntry) => void;
  readonly info:  (entry: LogEntry) => void;
  readonly warn:  (entry: LogEntry) => void;
  readonly error: (entry: LogEntry) => void;
};

// ---------------------------------------------------------------------------
// Total eliminators — CODING_STANDARD.md Rule 8.5
//
// A `match` collapses an ADT to a single result type by supplying a handler
// for every variant. Unlike `isOk` / `isSome` guards (which drive early-return
// control flow), a `match` is an expression: it forces both arms to be written
// and both to produce the same type, so a caller cannot fall through a case.
// This is the exhaustiveness axiom applied to the two-variant prelude ADTs,
// without leaking the `_tag` discriminant into consumer code (Rule 1.11).
// ---------------------------------------------------------------------------
