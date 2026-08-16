import { readFile } from 'node:fs/promises'

import { err, isSome, lookup, map, ok, pipe } from '@tsfpp/prelude'
import { describe, expect, it } from 'vitest'

import { buildRuleIndex, buildRuleIndexFromSources } from './rule-index'
import { SPEC_FILES } from './standard-paths'

describe('buildRuleIndexFromSources', () => {
  it('parses rules, forbidden constructs, and patterns from markdown fixtures', async () => {
    const fixturePath = 'tests/fixtures/rule-index/base-sample.md'
    const content = await readFile(fixturePath, 'utf8')
    const sources = SPEC_FILES.map((filename) => ({
      filename,
      content: filename === 'CODING_STANDARD.md' ? content : '',
    }))

    const result = buildRuleIndexFromSources(sources)

    expect(pipe(result, map((index) => index.rules.length))).toEqual(ok(2))
    expect(pipe(result, map((index) => index.forbiddenConstructs.length))).toEqual(ok(2))
    expect(
      pipe(
        result,
        map((index) =>
          pipe(index.patterns, lookup('smart constructor')),
        ),
        map((pattern) => isSome(pattern)),
      ),
    ).toEqual(ok(true))
  })

  it('returns Err when required spec files are missing', () => {
    const sources = [] as const

    const result = buildRuleIndexFromSources(sources)

    expect(result).toEqual(err('missing: CODING_STANDARD.md'))
  })
})

describe('buildRuleIndex', () => {
  it('builds an index from installed @tsfpp/standard files', () => {
    const result = buildRuleIndex()

    expect(pipe(result, map((index) => index.rules.length > 0))).toEqual(ok(true))
  })

  // The assertions below run against the INSTALLED @tsfpp/standard rather than a
  // fixture. Fixture-only coverage is what allowed the index to be silently
  // empty in production: every parser regex kept matching its sample while
  // matching nothing in the published spec.

  it('parses forbidden constructs from the installed spec, not just fixtures', () => {
    const result = buildRuleIndex()

    expect(pipe(result, map((index) => index.forbiddenConstructs.length > 0))).toEqual(ok(true))
  })

  it('binds a known rule id to its published heading', () => {
    const result = buildRuleIndex()

    const title = pipe(
      result,
      map((index) => index.rules.find((rule) => String(rule.id) === '4.1')?.title ?? ''),
    )

    expect(pipe(title, map((value) => value.length > 0))).toEqual(ok(true))
    expect(pipe(title, map((value) => value.toLowerCase().includes('switch')))).toEqual(ok(true))
  })

  it('binds a known forbidden construct to its published rule', () => {
    const result = buildRuleIndex()

    const rule = pipe(
      result,
      map(
        (index) =>
          index.forbiddenConstructs.find((entry) => entry.construct === 'class')?.rule ?? undefined,
      ),
      map((value) => (typeof value === 'undefined' ? '' : String(value))),
    )

    expect(rule).toEqual(ok('1.9'))
  })
})
