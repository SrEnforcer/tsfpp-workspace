import { describe, expect, it } from 'vitest';
import {
  appendList,
  assoc,
  conj,
  cons,
  dissoc,
  disj,
  entriesOfMap,
  err,
  filterList,
  flatMapList,
  foldList,
  foldLeftListCurried,
  fromArray,
  fromNullable,
  headList,
  intoMap,
  intoSet,
  isEmptyList,
  isErr,
  isNone,
  isOk,
  isSome,
  lengthList,
  lookup,
  mapList,
  member,
  nil,
  none,
  ok,
  reverseList,
  sequenceArrayO,
  singletonList,
  some,
  tailList,
  toArray,
  toNullable,
  toObject,
  traverseArray,
  traverseArrayO,
  traverseList,
  unique,
  type Option,
} from './fp.js';

describe('prelude toNullable', () => {
  it('returns the value for Some', () => {
    expect(toNullable(some(7))).toBe(7);
  });

  it('returns null for None', () => {
    expect(toNullable(none)).toBe(null);
  });

  it('is left inverse of fromNullable for non-null values', () => {
    expect(toNullable(fromNullable('x'))).toBe('x');
  });

  it('is left inverse of fromNullable for null', () => {
    expect(toNullable(fromNullable(null))).toBe(null);
  });
});

describe('prelude traverseArray', () => {
  it('collects all Ok values', () => {
    const result = traverseArray((n: number) => ok<number, string>(n * 2))([1, 2, 3]);
    expect(isOk(result) && result.value).toEqual([2, 4, 6]);
  });

  it('returns ok([]) for empty array', () => {
    const result = traverseArray((n: number) => ok<number, string>(n))([]);
    expect(isOk(result) && result.value).toEqual([]);
  });

  it('short-circuits on first Err, returning that Err', () => {
    const result = traverseArray((n: number) =>
      n === 2 ? err<string, number>('bad at 2') : ok<number, string>(n),
    )([1, 2, 3]);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBe('bad at 2');
    }
  });

  it('satisfies traverseArray(ok)(items) ≡ ok(items)', () => {
    const items = [10, 20, 30] as const;
    const result = traverseArray((n: number) => ok<number, never>(n))([...items]);
    expect(isOk(result) && result.value).toEqual([10, 20, 30]);
  });
});

describe('prelude traverseArrayO', () => {
  it('collects all Some values', () => {
    const result = traverseArrayO((n: number) => some(n * 2))([1, 2, 3]);
    expect(isSome(result) && result.value).toEqual([2, 4, 6]);
  });

  it('returns some([]) for empty array', () => {
    const result = traverseArrayO((n: number) => some(n))([]);
    expect(isSome(result) && result.value).toEqual([]);
  });

  it('short-circuits on first None, returning None', () => {
    const result = traverseArrayO((n: number) =>
      n === 2 ? none : some(n),
    )([1, 2, 3]);
    expect(isNone(result)).toBe(true);
  });

  it('satisfies traverseArrayO(some)(items) ≡ some(items)', () => {
    const result = traverseArrayO((n: number) => some(n))([10, 20, 30]);
    expect(isSome(result) && result.value).toEqual([10, 20, 30]);
  });

  it('works with fromNullable as a realistic predicate', () => {
    expect(isSome(traverseArrayO(fromNullable)([1, 2, 3]))).toBe(true);
    expect(isNone(traverseArrayO(fromNullable)([1, null, 3]))).toBe(true);
  });
});

describe('prelude sequenceArrayO', () => {
  it('returns Some of all values when all are Some', () => {
    const result = sequenceArrayO([some(1), some(2), some(3)]);
    expect(isSome(result) && result.value).toEqual([1, 2, 3]);
  });

  it('returns some([]) for empty array', () => {
    const result = sequenceArrayO([]);
    expect(isSome(result) && result.value).toEqual([]);
  });

  it('returns None when any element is None', () => {
    expect(isNone(sequenceArrayO([some(1), none, some(3)]))).toBe(true);
  });

  it('satisfies sequenceArrayO(xs) ≡ traverseArrayO(x => x)(xs)', () => {
    const xs = [some(1), some(2), some(3)];
    expect(sequenceArrayO(xs)).toEqual(traverseArrayO((x: Option<number>) => x)(xs));
  });
});

describe('prelude unique', () => {
  it('returns empty array for empty input', () => {
    expect(unique([])).toEqual([]);
  });

  it('preserves order of first occurrences', () => {
    expect(unique([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('removes duplicate primitives', () => {
    expect(unique([1, 2, 1, 3, 2])).toEqual([1, 2, 3]);
  });

  it('works with strings', () => {
    expect(unique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('is idempotent: unique(unique(xs)) ≡ unique(xs)', () => {
    const xs = [3, 1, 2, 1, 3];
    expect(unique(unique(xs))).toEqual(unique(xs));
  });
});

// eslint-disable-next-line max-lines-per-function
describe('prelude ReadonlyMap helpers', () => {
  it('intoMap constructs a map and keeps the last duplicate key', () => {
    const map = intoMap<string, number>([
      ['a', 1],
      ['b', 2],
      ['a', 3],
    ]);
    expect(map.size).toBe(2);
    expect(map.get('a')).toBe(3);
    expect(map.get('b')).toBe(2);
  });

  it('entriesOfMap preserves insertion order', () => {
    const map = intoMap<string, number>([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ]);
    expect(entriesOfMap(map)).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ]);
  });

  it('assoc adds a missing key', () => {
    const base = intoMap<string, number>([['a', 1]]);
    const updated = assoc('b', 2)(base);
    expect(entriesOfMap(updated)).toEqual([
      ['a', 1],
      ['b', 2],
    ]);
    expect(entriesOfMap(base)).toEqual([['a', 1]]);
  });

  it('assoc updates an existing key and moves it to the end', () => {
    const base = intoMap<string, number>([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ]);
    const updated = assoc('b', 20)(base);
    expect(entriesOfMap(updated)).toEqual([
      ['a', 1],
      ['c', 3],
      ['b', 20],
    ]);
  });

  it('dissoc removes an existing key and no-ops for missing key', () => {
    const base = intoMap<string, number>([
      ['a', 1],
      ['b', 2],
    ]);
    expect(entriesOfMap(dissoc('a')(base))).toEqual([['b', 2]]);
    expect(entriesOfMap(dissoc('x')(base))).toEqual([
      ['a', 1],
      ['b', 2],
    ]);
  });

  it('lookup returns Some for present key and None for absent key', () => {
    const base = intoMap<string, number>([['a', 1]]);
    const hit = lookup('a')(base);
    const miss = lookup('b')(base);
    expect(isSome(hit) && hit.value).toBe(1);
    expect(isNone(miss)).toBe(true);
  });

  it('satisfies roundtrip law: intoMap(entriesOfMap(m)) ≡ m', () => {
    const base = intoMap<string, number>([
      ['x', 10],
      ['y', 20],
    ]);
    const roundtrip = intoMap(entriesOfMap(base));
    expect(entriesOfMap(roundtrip)).toEqual(entriesOfMap(base));
  });

  it('toObject converts a string-keyed map to a plain object', () => {
    const base = intoMap<string, number>([
      ['a', 1],
      ['b', 2],
    ]);

    expect(toObject(base)).toEqual({ a: 1, b: 2 });
  });

  it('toObject converts an empty map to an empty object', () => {
    const base = intoMap<string, number>([]);

    expect(toObject(base)).toEqual({});
  });

  it('toObject keeps the map unchanged (immutable conversion)', () => {
    const base = intoMap<string, number>([
      ['x', 10],
      ['y', 20],
    ]);

    const obj = toObject(base);
    expect(obj['x']).toBe(10);
    expect(entriesOfMap(base)).toEqual([
      ['x', 10],
      ['y', 20],
    ]);
  });
});

describe('prelude ReadonlySet helpers', () => {
  it('intoSet deduplicates repeated values', () => {
    const set = intoSet([1, 2, 2, 3]);
    expect(Array.from(set)).toEqual([1, 2, 3]);
  });

  it('conj adds a value and disj removes it', () => {
    const base = intoSet([1, 2]);
    const withThree = conj(3)(base);
    const withoutTwo = disj(2)(withThree);

    expect(Array.from(withThree)).toEqual([1, 2, 3]);
    expect(Array.from(withoutTwo)).toEqual([1, 3]);
    expect(Array.from(base)).toEqual([1, 2]);
  });

  it('member reports membership correctly', () => {
    const set = intoSet(['db', 'auth']);
    expect(member('db')(set)).toBe(true);
    expect(member('billing')(set)).toBe(false);
  });
});

// eslint-disable-next-line max-lines-per-function
describe('prelude list / construction and extraction', () => {
  it('nil is empty', () => {
    expect(isEmptyList(nil)).toBe(true);
  });

  it('singletonList constructs a one-element list', () => {
    const l = singletonList(42);
    expect(isEmptyList(l)).toBe(false);
    const h = headList(l);
    expect(isSome(h) && h.value).toBe(42);
  });

  it('cons prepends an element', () => {
    const l = cons(1)(cons(2)(nil));
    const h = headList(l);
    expect(isSome(h) && h.value).toBe(1);
  });

  it('fromArray converts array to list', () => {
    const l = fromArray([1, 2, 3]);
    expect(toArray(l)).toEqual([1, 2, 3]);
  });

  it('toArray converts list to array', () => {
    const l = cons(1)(cons(2)(cons(3)(nil)));
    expect(toArray(l)).toEqual([1, 2, 3]);
  });

  it('fromArray(toArray(l)) ≡ l (roundtrip)', () => {
    const original = cons(10)(cons(20)(nil));
    const converted = fromArray(toArray(original));
    expect(toArray(converted)).toEqual(toArray(original));
  });

  it('headList returns Some for non-empty list', () => {
    const l = singletonList(99);
    const h = headList(l);
    expect(isSome(h) && h.value).toBe(99);
  });

  it('headList returns None for empty list', () => {
    expect(isNone(headList(nil))).toBe(true);
  });

  it('tailList returns tail', () => {
    const l = cons(1)(cons(2)(cons(3)(nil)));
    const t = tailList(l);
    expect(toArray(t)).toEqual([2, 3]);
  });

  it('tailList returns nil for singleton', () => {
    const t = tailList(singletonList(1));
    expect(isEmptyList(t)).toBe(true);
  });

  it('lengthList counts elements', () => {
    expect(lengthList(nil)).toBe(0);
    expect(lengthList(singletonList(1))).toBe(1);
    expect(lengthList(fromArray([1, 2, 3]))).toBe(3);
  });
});

describe('prelude list / combinators', () => {
  it('mapList transforms elements', () => {
    const l = fromArray([1, 2, 3]);
    const result = mapList((n: number) => n * 2)(l);
    expect(toArray(result)).toEqual([2, 4, 6]);
  });

  it('mapList satisfies identity law', () => {
    const l = fromArray([1, 2, 3]);
    expect(toArray(mapList((x: number) => x)(l))).toEqual(toArray(l));
  });

  it('flatMapList chains lists', () => {
    const l = fromArray([1, 2]);
    const result = flatMapList((n: number) => fromArray([n, n * 10]))(l);
    expect(toArray(result)).toEqual([1, 10, 2, 20]);
  });

  it('flatMapList with singletonList is identity', () => {
    const l = fromArray([1, 2, 3]);
    const result = flatMapList(singletonList)(l);
    expect(toArray(result)).toEqual(toArray(l));
  });

  it('filterList retains matching elements', () => {
    const l = fromArray([1, 2, 3, 4, 5]);
    const result = filterList((n: number) => n % 2 === 0)(l);
    expect(toArray(result)).toEqual([2, 4]);
  });

  it('filterList returns nil for no matches', () => {
    const l = fromArray([1, 3, 5]);
    const result = filterList((n: number) => n % 2 === 0)(l);
    expect(isEmptyList(result)).toBe(true);
  });
});

describe('prelude list / folding', () => {
  it('foldList right-associates', () => {
    const l = fromArray([1, 2, 3]);
    const result = foldList(
      0,
      (a: number) => (b: number): number => a + b,
      l,
    );
    expect(result).toBe(6);
  });

  it('foldLeftListCurried left-associates', () => {
    const l = fromArray([1, 2, 3]);
    const result = foldLeftListCurried<number, number>(0)(
      (acc: number) => (a: number): number => acc + a,
    )(l);
    expect(result).toBe(6);
  });

  it('foldList returns init for empty list', () => {
    const result = foldList(99, (): ((value: number) => number) => () => 0, nil);
    expect(result).toBe(99);
  });
});

describe('prelude list / operations', () => {
  it('appendList concatenates lists', () => {
    const l1 = fromArray([1, 2]);
    const l2 = fromArray([3, 4]);
    const result = appendList(l1)(l2);
    expect(toArray(result)).toEqual([1, 2, 3, 4]);
  });

  it('appendList(nil)(l) ≡ l', () => {
    const l = fromArray([1, 2]);
    expect(toArray(appendList(nil as unknown as typeof l)(l))).toEqual(toArray(l)); // eslint-disable-line @typescript-eslint/consistent-type-assertions
  });

  it('appendList(l)(nil) ≡ l', () => {
    const l = fromArray([1, 2]);
    expect(toArray(appendList(l)(nil as unknown as typeof l))).toEqual(toArray(l)); // eslint-disable-line @typescript-eslint/consistent-type-assertions
  });

  it('reverseList reverses order', () => {
    const l = fromArray([1, 2, 3]);
    const result = reverseList(l);
    expect(toArray(result)).toEqual([3, 2, 1]);
  });

  it('reverseList is involutive', () => {
    const l = fromArray([1, 2, 3]);
    expect(toArray(reverseList(reverseList(l)))).toEqual(toArray(l));
  });

  it('traverseList collects all Ok', () => {
    const l = fromArray([1, 2, 3]);
    const result = traverseList((n: number) => ok<number, string>(n * 2))(l);
    expect(isOk(result) && toArray(result.value)).toEqual([2, 4, 6]);
  });

  it('traverseList short-circuits on first Err', () => {
    const l = fromArray([1, 2, 3]);
    const result = traverseList((n: number) =>
      n === 2 ? err<string, number>('bad') : ok<number, string>(n),
    )(l);
    expect(isErr(result)).toBe(true);
  });
});
