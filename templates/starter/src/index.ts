import { ok, err, isOk } from '@tsfpp/prelude'
import type { Result } from '@tsfpp/prelude'

// ── Domain types ─────────────────────────────────────────────────────────────

type ParseError =
  | { readonly kind: 'empty-input' }
  | { readonly kind: 'too-long'; readonly max: number; readonly actual: number }

type Username = string & { readonly _brand: 'Username' }

// ── Smart constructor ─────────────────────────────────────────────────────────

const MAX_LENGTH = 32

const parseUsername = (raw: string): Result<Username, ParseError> => {
  if (raw.length === 0) return err({ kind: 'empty-input' })
  if (raw.length > MAX_LENGTH)
    return err({ kind: 'too-long', max: MAX_LENGTH, actual: raw.length })
  // DEVIATION(1.6): `as Username` inside smart constructor; runtime-validated above.
  return ok(raw as Username) // eslint-disable-line @typescript-eslint/consistent-type-assertions
}

// ── Pure result handling ──────────────────────────────────────────────────────

const formatError = (e: ParseError): string => {
  switch (e.kind) {
    case 'empty-input': return 'Username must not be empty.'
    case 'too-long':    return `Username exceeds ${e.max} characters (got ${e.actual}).`
  }
}

export const greet = (raw: string): string => {
  const parsed = parseUsername(raw)
  return isOk(parsed) ? `Hello, ${parsed.value}!` : `Error: ${formatError(parsed.error)}`
}
