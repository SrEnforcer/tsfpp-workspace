import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { type Result, err, isErr, isOk, ok, traverseArray } from './fp.js';
import {
  type Validation,
  apValidation,
  invalid,
  invalidAll,
  isInvalid,
  isValid,
  mapErrorsValidation,
  mapValidation,
  matchValidation,
  resultToValidation,
  sequenceArrayValidation,
  sequenceStructValidation,
  traverseArrayValidation,
  valid,
  validationToResult,
} from './validation.js';

const num = fc.integer({ min: -1000, max: 1000 });

const anyValidation = <A>(arb: fc.Arbitrary<A>): fc.Arbitrary<Validation<string, A>> =>
  fc.oneof(
    arb.map((a) => valid<string, A>(a)),
    fc.string().map((e) => invalid<string, A>(e)),
  );

describe('Validation constructors and guards', () => {
  it('valid and invalid produce the expected variants', () => {
    expect(isValid(valid('x'))).toBe(true);
    expect(isInvalid(invalid('bad'))).toBe(true);
  });

  it('invalid always carries at least one error', () => {
    fc.assert(
      fc.property(fc.string(), (e) => {
        const v = invalid(e);
        expect(isInvalid(v) && v.errors.length).toBeGreaterThanOrEqual(1);
      }),
    );
  });

  it('the guards are exact complements', () => {
    fc.assert(
      fc.property(anyValidation(num), (v) => {
        expect(isValid(v)).toBe(!isInvalid(v));
      }),
    );
  });
});

describe('Validation functor laws', () => {
  it('identity: mapValidation(x => x) ≡ identity', () => {
    fc.assert(
      fc.property(anyValidation(num), (v) => {
        expect(mapValidation((x: number) => x)(v)).toEqual(v);
      }),
    );
  });

  it('composition: mapValidation(g)∘mapValidation(f) ≡ mapValidation(g∘f)', () => {
    fc.assert(
      fc.property(anyValidation(num), (v) => {
        const f = (x: number): number => x + 1;
        const g = (x: number): number => x * 2;
        expect(mapValidation(g)(mapValidation(f)(v))).toEqual(
          mapValidation((x: number) => g(f(x)))(v),
        );
      }),
    );
  });

  it('mapErrorsValidation identity leaves the value untouched', () => {
    fc.assert(
      fc.property(anyValidation(num), (v) => {
        expect(mapErrorsValidation((e: string) => e)(v)).toEqual(v);
      }),
    );
  });

  it('mapErrorsValidation remaps every accumulated error', () => {
    const v = invalidAll<string, number>(['a', 'b', 'c']);
    const mapped = mapErrorsValidation((e: string) => e.toUpperCase())(v);
    expect(isInvalid(mapped) && mapped.errors).toEqual(['A', 'B', 'C']);
  });
});

describe('accumulation — the property that distinguishes Validation from Result', () => {
  it('apValidation concatenates errors from both sides', () => {
    const f = invalid<string, (a: number) => number>('f-bad');
    const a = invalid<string, number>('a-bad');
    const out = apValidation(a)(f);
    expect(isInvalid(out) && out.errors).toEqual(['f-bad', 'a-bad']);
  });

  it('traverseArrayValidation collects EVERY failure, not just the first', () => {
    const f = (n: number): Validation<string, number> => (n >= 0 ? valid(n) : invalid(`neg:${n}`));
    const out = traverseArrayValidation(f)([-1, 2, -3, 4, -5]);
    expect(isInvalid(out) && out.errors).toEqual(['neg:-1', 'neg:-3', 'neg:-5']);
  });

  it('the error count equals the number of failing inputs', () => {
    fc.assert(
      fc.property(fc.array(num), (xs) => {
        const f = (n: number): Validation<string, number> => (n >= 0 ? valid(n) : invalid('neg'));
        const out = traverseArrayValidation(f)(xs);
        const failures = xs.filter((x) => x < 0).length;
        if (failures === 0) {
          expect(isValid(out)).toBe(true);
        } else {
          expect(isInvalid(out) && out.errors.length).toBe(failures);
        }
      }),
    );
  });

  it('contrast: traverseArray (Result) reports only the first failure', () => {
    const g = (n: number): Result<number, string> =>
      n >= 0 ? ok<number, string>(n) : err<string, number>(`neg:${n}`);
    const resultOut = traverseArray(g)([-1, 2, -3]);
    expect(isErr(resultOut) && resultOut.error).toBe('neg:-1'); // one error only

    const f = (n: number): Validation<string, number> => (n >= 0 ? valid(n) : invalid(`neg:${n}`));
    const validationOut = traverseArrayValidation(f)([-1, 2, -3]);
    expect(isInvalid(validationOut) && validationOut.errors).toEqual(['neg:-1', 'neg:-3']);
  });

});

describe('accumulation ordering', () => {
  it('errors preserve input order', () => {
    const f = (s: string): Validation<string, string> => invalid(s);
    const out = traverseArrayValidation(f)(['first', 'second', 'third']);
    expect(isInvalid(out) && out.errors).toEqual(['first', 'second', 'third']);
  });

});

describe('traverseArrayValidation structure', () => {
  it('is Valid exactly when every element is valid', () => {
    fc.assert(
      fc.property(fc.array(anyValidation(num)), (vs) => {
        expect(isValid(sequenceArrayValidation(vs))).toBe(vs.every(isValid));
      }),
    );
  });

  it('preserves length and order on success', () => {
    fc.assert(
      fc.property(fc.array(num), (xs) => {
        const out = traverseArrayValidation((n: number) => valid<string, number>(n * 2))(xs);
        expect(isValid(out) && out.value).toEqual(xs.map((x) => x * 2));
      }),
    );
  });

  it('the empty array is Valid([])', () => {
    expect(traverseArrayValidation((n: number) => valid<string, number>(n))([])).toEqual(valid([]));
  });
});

describe('sequenceStructValidation', () => {
  it('builds the typed struct when every field is valid', () => {
    const out = sequenceStructValidation({
      name: valid<string, string>('ada'),
      age: valid<string, number>(36),
    });
    expect(isValid(out) && out.value).toEqual({ name: 'ada', age: 36 });
  });

  it('accumulates errors across independent fields', () => {
    const out = sequenceStructValidation({
      name: invalid<string, string>('name required'),
      email: invalid<string, string>('email malformed'),
      age: valid<string, number>(36),
    });
    expect(isInvalid(out) && out.errors).toEqual(['name required', 'email malformed']);
  });

  it('reports a single field failure without losing the others', () => {
    const out = sequenceStructValidation({
      a: valid<string, number>(1),
      b: invalid<string, number>('b broke'),
    });
    expect(isInvalid(out) && out.errors).toEqual(['b broke']);
  });
});

describe('matchValidation', () => {
  it('is total: exactly one handler fires', () => {
    fc.assert(
      fc.property(anyValidation(num), (v) => {
        const tag = matchValidation(
          () => 'invalid',
          () => 'valid',
        )(v);
        expect(tag).toBe(isValid(v) ? 'valid' : 'invalid');
      }),
    );
  });

  it('hands every error to the invalid branch', () => {
    const count = matchValidation(
      (errors: readonly string[]) => errors.length,
      () => 0,
    )(invalidAll<string, number>(['x', 'y', 'z']));
    expect(count).toBe(3);
  });
});

describe('Result interop', () => {
  it('resultToValidation round-trips through validationToResult', () => {
    fc.assert(
      fc.property(anyValidation(num), (v) => {
        const back = resultToValidation(validationToResult(v));
        // A single-error Validation survives the round trip exactly.
        if (isValid(v)) expect(back).toEqual(v);
        else expect(isInvalid(back)).toBe(true);
      }),
    );
  });

  it('validationToResult preserves the success value', () => {
    fc.assert(
      fc.property(num, (n) => {
        const r = validationToResult(valid<string, number>(n));
        expect(isOk(r) && r.value).toBe(n);
      }),
    );
  });

  it('validationToResult carries every accumulated error into the Err channel', () => {
    const r = validationToResult(invalidAll<string, number>(['one', 'two']));
    expect(isErr(r) && r.error).toEqual(['one', 'two']);
  });

  it('resultToValidation maps ok/err to valid/invalid', () => {
    expect(resultToValidation(ok<number, string>(5))).toEqual(valid(5));
    expect(isInvalid(resultToValidation(err<string, number>('nope')))).toBe(true);
  });
});
