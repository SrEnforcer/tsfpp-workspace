/**
 * Property-based law suite — standard Rule 8.2.
 *
 * Rule 8.2 makes property-based testing with fast-check mandatory for core pure
 * functions. This package previously had example-based tests only, which was an
 * unrecorded violation of a MUST rule.
 *
 * The boundary's pure surface is dominated by *round-trips* (encode/decode,
 * sign/verify) and *smart constructors* (validate-and-brand). Both are exactly
 * the shapes property testing is best at: a round-trip has an identity law, and
 * a smart constructor has a predicate its result must agree with on every input.
 */

import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { isNone, isOk, isSome } from '@tsfpp/prelude';
import type { Cursor } from './boundary-types.js';
import {
  decodeCursor,
  mkIdempotencyKey,
  mkPrincipalId,
  mkTraceId,
  mkWebhookEventId,
} from './boundary-types.js';
import { encodeCursor, parsePaginationQuery } from './boundary-operations.js';

/** JSON-round-trippable payloads: what a cursor is actually allowed to carry. */
const cursorPayload = fc.dictionary(
  fc.string({ maxLength: 12 }),
  fc.oneof(fc.string(), fc.integer(), fc.boolean()),
  { maxKeys: 6 },
);

describe('cursor codec — round-trip laws', () => {
  it('decode ∘ encode ≡ Some(identity) for any JSON payload', () => {
    fc.assert(
      fc.property(cursorPayload, (payload) => {
        const decoded = decodeCursor(encodeCursor(payload));
        expect(isSome(decoded) && decoded.value).toEqual(payload);
      }),
    );
  });

  it('encoding is deterministic', () => {
    fc.assert(
      fc.property(cursorPayload, (payload) => {
        expect(encodeCursor(payload)).toBe(encodeCursor(payload));
      }),
    );
  });

  it('encoded cursors are base64url — never +, / or = padding', () => {
    fc.assert(
      fc.property(cursorPayload, (payload) => {
        expect(encodeCursor(payload)).toMatch(/^[A-Za-z0-9_-]*$/);
      }),
    );
  });

  it('decoding arbitrary text never throws — it returns None', () => {
    fc.assert(
      fc.property(fc.string(), (raw) => {
        // Cursors are untrusted input even though we mint them (see decodeCursor's
        // NOTE). Feeding unbranded text is precisely what this property asserts.
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- DEVIATION(1.6): deliberately supplying untrusted input to a branded parameter
        expect(() => decodeCursor(raw as Cursor)).not.toThrow();
      }),
    );
  });

  it('a non-record JSON payload decodes to None', () => {
    const scalarCursor = btoa(JSON.stringify(42)).replace(/=+$/, '');
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- DEVIATION(1.6): hand-built cursor exercising the non-record branch
    expect(isNone(decodeCursor(scalarCursor as Cursor))).toBe(true);
  });
});

describe('branded smart constructors — predicate agreement', () => {
  it('mkTraceId succeeds exactly on non-empty strings', () => {
    fc.assert(
      fc.property(fc.string(), (raw) => {
        expect(isSome(mkTraceId(raw))).toBe(raw.length > 0);
      }),
    );
  });

  it('mkPrincipalId succeeds exactly on non-empty strings', () => {
    fc.assert(
      fc.property(fc.string(), (raw) => {
        expect(isSome(mkPrincipalId(raw))).toBe(raw.length > 0);
      }),
    );
  });

  it('mkWebhookEventId succeeds exactly on non-empty strings', () => {
    fc.assert(
      fc.property(fc.string(), (raw) => {
        expect(isSome(mkWebhookEventId(raw))).toBe(raw.length > 0);
      }),
    );
  });

});

describe('idempotency key format', () => {
  it('mkIdempotencyKey agrees with its documented format', () => {
    const allowed = /^[A-Za-z0-9_-]{1,255}$/;
    fc.assert(
      fc.property(fc.string({ maxLength: 300 }), (raw) => {
        expect(isSome(mkIdempotencyKey(raw))).toBe(allowed.test(raw));
      }),
    );
  });

  it('mkIdempotencyKey rejects the empty string and over-length keys', () => {
    expect(isNone(mkIdempotencyKey(''))).toBe(true);
    expect(isNone(mkIdempotencyKey('a'.repeat(256)))).toBe(true);
    expect(isSome(mkIdempotencyKey('a'.repeat(255)))).toBe(true);
  });

  it('every constructor is total — no input throws', () => {
    fc.assert(
      fc.property(fc.string(), (raw) => {
        expect(() => {
          mkTraceId(raw);
          mkPrincipalId(raw);
          mkWebhookEventId(raw);
          mkIdempotencyKey(raw);
        }).not.toThrow();
      }),
    );
  });
});

describe('parsePaginationQuery — bounds are honoured for every input', () => {
  const urlWith = (limit: string): URL =>
    // eslint-disable-next-line no-restricted-syntax -- DEVIATION(1.9): URL construction at the HTTP boundary, mirroring the source
    new URL(`https://x.test/items?limit=${encodeURIComponent(limit)}`);

  it('accepts exactly the integers within [1, maxLimit]', () => {
    fc.assert(
      fc.property(fc.integer({ min: -50, max: 200 }), (n) => {
        const parsed = parsePaginationQuery(urlWith(String(n)), 100);
        expect(isOk(parsed)).toBe(n >= 1 && n <= 100);
      }),
    );
  });

  it('rejects non-integer and non-numeric limits rather than coercing', () => {
    fc.assert(
      fc.property(fc.oneof(fc.string(), fc.double({ noNaN: true, min: 1.1, max: 99.9 })), (raw) => {
        const text = String(raw);
        const parsed = parsePaginationQuery(urlWith(text), 100);
        const isValidInt = /^\d+$/.test(text.trim()) && Number(text) >= 1 && Number(text) <= 100;
        expect(isOk(parsed)).toBe(isValidInt);
      }),
    );
  });

  it('defaults to a limit of 20 when absent', () => {
    // eslint-disable-next-line no-restricted-syntax -- DEVIATION(1.9): URL construction at the HTTP boundary
    const parsed = parsePaginationQuery(new URL('https://x.test/items'), 100);
    expect(isOk(parsed) && parsed.value.limit).toBe(20);
  });

  it('never throws for arbitrary query strings', () => {
    fc.assert(
      fc.property(fc.string(), (raw) => {
        expect(() => parsePaginationQuery(urlWith(raw), 100)).not.toThrow();
      }),
    );
  });
});
