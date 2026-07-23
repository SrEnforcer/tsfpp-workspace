import { describe, expect, it } from 'vitest';

import { fromNullable, isOk, isSome, isNone } from '@tsfpp/prelude';

import {
	decodeCursor,
	mkIdempotencyKey,
	mkNextCursor,
	mkTraceId,
	parsePaginationFromRequest,
} from './boundary.js';

describe('branding constructors', (): void => {
	it('creates trace id for non-empty input', (): void => {
		const result = mkTraceId('trace-123');

		expect(isSome(result)).toBe(true);
	});

	it('returns none for empty trace id input', (): void => {
		const result = mkTraceId('');

		expect(isNone(result)).toBe(true);
	});

	it('accepts valid idempotency key format', (): void => {
		const result = mkIdempotencyKey('abc_123-XYZ');

		expect(isSome(result)).toBe(true);
	});

	it('rejects idempotency key with whitespace', (): void => {
		const result = mkIdempotencyKey('white space');

		expect(isNone(result)).toBe(true);
	});
});

describe('handler helpers', (): void => {
	it('builds next cursor from final page item', (): void => {
		const nextCursor = mkNextCursor({
			items: [{ id: 'o1' }, { id: 'o2' }],
			page: { limit: 2, cursor: null },
			toPayload: (row) => ({ afterId: row.id }),
		});
		const nextCursorOption = fromNullable(nextCursor);

		expect(isSome(nextCursorOption)).toBe(true);
		if (isNone(nextCursorOption)) return;

		const decoded = decodeCursor(nextCursorOption.value);
		expect(isSome(decoded)).toBe(true);
	});

	it('parses pagination query from request url', (): void => {
		// eslint-disable-next-line no-restricted-syntax -- DEVIATION(1.9): Request construction is test adapter setup.
		const req = new Request('https://example.test/v1/orders?limit=10&cursor=abc');

		const page = parsePaginationFromRequest(req, 100);

		expect(isOk(page)).toBe(true);
	});
});
