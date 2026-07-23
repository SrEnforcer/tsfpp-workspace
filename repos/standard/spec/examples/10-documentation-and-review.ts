/**
 * Examples for §10 — Documentation and Review Protocol (Rules 10.1–10.4)
 * See ../CODING_STANDARD.md §10 and ../rationale/10-documentation-and-review.md
 */

// ─── Rule 10.1 — Exported functions require JSDoc ─────────────────────────────

/**
 * Split a CSV line into readonly fields.
 * Preconditions: delimiter is a one-character string.
 * Returns: fields in input order; empty fields are preserved.
 */
const splitCsv = (line: string, delimiter: string): ReadonlyArray<string> =>
  line.split(delimiter)

/* BAD: exported function with no purpose/preconditions/return semantics.
export const splitCsv = (line: string, delimiter: string): string[] => line.split(delimiter)
*/

// ─── Rule 10.2 — Discriminated unions require module-level algebra docs ───────

/**
 * PaymentState algebra
 * - pending: payment created but not captured
 * - captured: payment completed with gateway reference
 * - failed: payment failed with machine-readable reason
 */
type PaymentState =
  | { readonly kind: 'pending' }
  | { readonly kind: 'captured'; readonly gatewayRef: string }
  | { readonly kind: 'failed'; readonly reason: 'declined' | 'timeout' }

// ─── Rule 10.3 — Smart constructors document enforced invariants ──────────────

type Email = string & { readonly __brand: 'Email' }

/**
 * Smart constructor for Email.
 * Invariants:
 * - contains exactly one '@'
 * - local and domain parts are non-empty
 */
const mkEmail = (raw: string): Email | null => {
  const trimmed = raw.trim()
  const parts = trimmed.split('@')
  if (parts.length !== 2) return null
  if (parts[0].length === 0 || parts[1].length === 0) return null
  return trimmed as Email
}

// ─── Rule 10.4 — Review checklist is applied in PR flow ───────────────────────

const reviewChecklist = [
  'No any/as/! outside allowed boundaries',
  'Exhaustive union matches use never witness',
  'Exported functions have explicit return types',
  'Data structures stay readonly and non-mutating',
  'Effects are isolated behind typed boundaries',
] as const

export type { PaymentState, Email }
export { splitCsv, mkEmail, reviewChecklist }
