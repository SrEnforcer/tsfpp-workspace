/**
 * Examples for §6 — Effect Management (Rules 6.1–6.6)
 * See ../CODING_STANDARD.md §6 and ../rationale/06-effects.md
 */

// ─── Shared primitives ────────────────────────────────────────────────────────

type Result<T, E> =
  | { readonly ok: true;  readonly value: T }
  | { readonly ok: false; readonly error: E }

const ok  = <T, E>(value: T): Result<T, E> => ({ ok: true,  value })
const err = <T, E>(error: E): Result<T, E> => ({ ok: false, error })

// ─── Rule 6.1 — Errors as data, never as exceptions ──────────────────────────
//
// MUST: Model errors as data. `throw` is forbidden outside adapter boundaries.

type UserId = string & { readonly __brand: 'UserId' }
type User   = { readonly id: UserId; readonly name: string; readonly email: string }

type UserNotFound   = { readonly kind: 'user_not_found';   readonly id: UserId }
type InvalidPayload = { readonly kind: 'invalid_payload';  readonly message: string }
type UserError      = UserNotFound | InvalidPayload

// GOOD: failure is visible in the return type — callers are forced to handle it
const findUser = (
  users: ReadonlyArray<User>,
  id:    UserId,
): Result<User, UserNotFound> => {
  const found = users.find(u => u.id === id)
  return found !== undefined
    ? ok(found)
    : err({ kind: 'user_not_found', id })
}

/* BAD: throw is invisible in the type signature — callers cannot know this can fail.
const findUser = (users: User[], id: UserId): User => {
  const found = users.find(u => u.id === id)
  if (!found) throw new Error(`User ${id} not found`)  // invisible to callers
  return found
}
*/

// GOOD: typed error union — callers can match on specific error kinds
const validateEmail = (email: string): Result<string, InvalidPayload> => {
  const trimmed = email.trim()
  if (trimmed.length === 0)
    return err({ kind: 'invalid_payload', message: 'Email cannot be empty' })
  if (!trimmed.includes('@'))
    return err({ kind: 'invalid_payload', message: 'Email must contain @' })
  return ok(trimmed)
}

// ─── Rule 6.2 — Confine `throw` to adapter boundaries ────────────────────────
//
// MUST: Wrap third-party throws in a typed Result before crossing into domain code.

type IOError = { readonly kind: 'io_error'; readonly message: string }

// GOOD: adapter — catches the throw, converts to Result, domain code never sees the exception
const readFileSafe = (path: string): Result<string, IOError> => {
  try {
    // In a Node.js environment: readFileSync(path, 'utf8')
    // Simulated here to keep the example self-contained
    if (path === '') throw new Error('Empty path')
    return ok(`contents of ${path}`)
  } catch (e) {
    return err({ kind: 'io_error', message: String(e) })
  }
}

// GOOD: async adapter — Promise never rejects; errors are in the Result
type ApiError = { readonly kind: 'api_error'; readonly status: number } | IOError

const fetchResourceSafe = async (url: string): Promise<Result<unknown, ApiError>> => {
  try {
    const res = await fetch(url)
    if (!res.ok) return err({ kind: 'api_error', status: res.status })
    return ok(await res.json() as unknown)
  } catch (e) {
    return err({ kind: 'io_error', message: String(e) })
  }
}

/* BAD: throw propagates through domain code — every intermediate frame needs a try/catch.
const readConfig = (path: string): Config => {
  const raw = readFileSync(path, 'utf8')   // may throw — propagates silently
  return JSON.parse(raw)                   // may throw — propagates silently
}
*/

// ─── Rule 6.3 — `Result<T, E>` for failure; `Option<A>` for absence ──────────
//
// MUST: Use Result for operations that can fail; Option for values that may be absent.

type Option<A> =
  | { readonly _tag: 'Some'; readonly value: A }
  | { readonly _tag: 'None' }

const some = <A>(value: A): Option<A> => ({ _tag: 'Some', value })
const none: Option<never> = { _tag: 'None' }

// GOOD: Option — "may not exist, and that's normal"
const findByName = (users: ReadonlyArray<User>, name: string): Option<User> => {
  const found = users.find(u => u.name === name)
  return found !== undefined ? some(found) : none
}

// GOOD: Result — "may fail with a meaningful reason"
const parseUserId = (raw: string): Result<UserId, InvalidPayload> => {
  if (raw.trim().length === 0)
    return err({ kind: 'invalid_payload', message: 'UserId cannot be empty' })
  return ok(raw.trim() as UserId)
}

/* BAD: undefined conflates absence with failure — ambiguous at the call site.
const findByName = (users: User[], name: string): User | undefined =>
  users.find(u => u.name === name)
// Was undefined returned because the user doesn't exist, or because something failed?
*/

// ─── Rule 6.4 — `Promise<Result<T, E>>` for async operations ─────────────────
//
// SHOULD: Avoid bare `Promise<T>` that hides failure in rejection.

// GOOD: errors are in the success channel — typed, never rejected
const loadUser = async (id: UserId): Promise<Result<User, UserError>> => {
  const idResult = parseUserId(id)
  if (!idResult.ok) return idResult

  const resource = await fetchResourceSafe(`/api/users/${id}`)
  if (!resource.ok) return err({ kind: 'invalid_payload', message: String(resource.error) })

  const data = resource.value
  if (typeof data !== 'object' || data === null)
    return err({ kind: 'invalid_payload', message: 'Expected object' })

  return ok(data as User)
}

/* BAD: bare Promise — errors hidden in the rejection channel, no type for failure.
const loadUser = async (id: string): Promise<User> => {
  const res = await fetch(`/api/users/${id}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)  // rejection — not typed
  return res.json()                                    // also may throw — not typed
}
*/

// ─── Rule 6.5 — Isolate I/O; inject dependencies via function parameters ──────
//
// SHOULD: Inject dependencies as function parameters (poor man's Reader).

type Logger = { readonly log: (msg: string) => void }

type UserRepoDeps = {
  readonly db:     { readonly findUser: (id: UserId) => Promise<Result<User, UserNotFound>> }
  readonly logger: Logger
}

// GOOD: dependencies injected — function is testable without a real DB or logger
const getUser =
  (deps: UserRepoDeps) =>
  async (id: UserId): Promise<Result<User, UserError>> => {
    deps.logger.log(`Fetching user ${id}`)
    const result = await deps.db.findUser(id)
    if (!result.ok) deps.logger.log(`User ${id} not found`)
    return result
  }

// In production:
// const getUserFromLiveDB = getUser({ db: liveDb, logger: prodLogger })
//
// In tests:
// const getUserFromMock = getUser({
//   db:     { findUser: async (_id) => ok(mockUser) },
//   logger: { log: (_msg) => void 0 },
// })

/* BAD: global import — function is untestable without a real database.
import { db } from '../db'         // global, hidden dependency
import { logger } from '../logger' // global, hidden dependency

const getUser = async (id: UserId): Promise<User> => {
  logger.log(`Fetching ${id}`)
  return db.findUser(id)           // no way to substitute in tests
}
*/

// ─── Rule 6.6 — Prefer Promise.allSettled for partial-failure workflows ──────
//
// SHOULD: Use Promise.allSettled when partial failure is meaningful.

type LoadReport<T, E> = {
  readonly successes: ReadonlyArray<T>
  readonly failures: ReadonlyArray<E>
}

const loadUsersReport = async (
  ids: ReadonlyArray<UserId>,
): Promise<LoadReport<User, string>> => {
  const settled = await Promise.allSettled(ids.map(id => loadUser(id)))
  return settled.reduce<LoadReport<User, string>>(
    (acc, item) => {
      if (item.status === 'rejected') {
        return { ...acc, failures: [...acc.failures, String(item.reason)] }
      }

      const value = item.value
      return value.ok
        ? { ...acc, successes: [...acc.successes, value.value] }
        : { ...acc, failures: [...acc.failures, value.error.kind] }
    },
    { successes: [], failures: [] },
  )
}

const loadUsersAllOrNothing = async (
  ids: ReadonlyArray<UserId>,
): Promise<ReadonlyArray<Result<User, UserError>>> =>
  Promise.all(ids.map(id => loadUser(id)))

/* BAD: Promise.all drops partial progress on first rejection for rejecting calls.
const users = await Promise.all(ids.map(id => fetch(`/api/users/${id}`).then(r => r.json())))
*/

// ─── Exports ──────────────────────────────────────────────────────────────────
export type {
  Result, Option, User, UserId, UserError, UserNotFound, InvalidPayload,
  IOError, ApiError, Logger, UserRepoDeps, LoadReport,
}
export {
  ok, err, some, none,
  findUser, validateEmail, readFileSafe, fetchResourceSafe,
  findByName, parseUserId, loadUser, getUser,
  loadUsersReport, loadUsersAllOrNothing,
}
