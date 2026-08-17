#!/usr/bin/env node

/**
 * Smoke-test the bindings generator.
 *
 * This package ships the compiler that every consumer's `.github/` layout is
 * built from, and it had no test of any kind. A generator that throws, or that
 * quietly stops emitting a category of file, would reach adopters through
 * `postinstall` before anyone noticed.
 *
 * Builds the full layout into a scratch directory and asserts the shape of the
 * result: every source file produces output, frontmatter lands in the GitHub
 * copy and is stripped from the universal one, and the drift check agrees the
 * freshly built tree is current.
 */

import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

import { buildAiLayout, checkAiLayout } from './build-ai.mjs'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = join(packageRoot, 'ai')

const failures = []

const check = (label, condition, detail = '') => {
  if (condition) {
    process.stdout.write(`ok    ${label}\n`)
    return
  }

  failures.push(label)
  process.stdout.write(`FAIL  ${label}${detail ? ` — ${detail}` : ''}\n`)
}

const countFiles = async (dir, suffix) => {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    return entries.filter((entry) => entry.isFile() && entry.name.endsWith(suffix)).length
  } catch {
    return 0
  }
}

const scratch = await mkdtemp(join(tmpdir(), 'tsfpp-agents-smoke-'))

try {
  await buildAiLayout(scratch)

  // Every source category must survive the trip.
  for (const [dir, suffix, out] of [
    ['agents', '.agent.md', 'agents'],
    ['instructions', '.instructions.md', 'instructions'],
    ['prompts', '.prompt.md', 'prompts'],
  ]) {
    const expected = await countFiles(join(sourceRoot, dir), suffix)
    const actual = await countFiles(join(scratch, '.github', out), suffix)
    check(`${dir}: ${expected} source file(s) -> ${actual} emitted`, expected > 0 && expected === actual)
  }

  const skillDirs = (await readdir(join(sourceRoot, 'skills'), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory()).length
  const emittedSkills = (await readdir(join(scratch, '.github', 'skills'), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory()).length
  check(`skills: ${skillDirs} source dir(s) -> ${emittedSkills} emitted`, skillDirs > 0 && skillDirs === emittedSkills)

  // Frontmatter belongs in the GitHub copy and nowhere near the universal one.
  const githubSkill = await readFile(join(scratch, '.github', 'skills', 'coding-standard', 'SKILL.md'), 'utf8')
  const universalSkill = await readFile(join(scratch, '.ai', 'skills', 'coding-standard', 'SKILL.md'), 'utf8')
  check('github copy keeps frontmatter', githubSkill.startsWith('---\n'))
  check('universal copy strips frontmatter', !universalSkill.startsWith('---\n'))

  // The workflow must name a manifest file that actually exists in consumers.
  const workflow = await readFile(join(scratch, '.github', 'workflows', 'release-please.yml'), 'utf8')
  check(
    'release-please workflow points at release-please-manifest.json',
    workflow.includes('manifest-file: release-please-manifest.json'),
    'a leading dot here silently breaks releases in every consumer',
  )

  const drift = await checkAiLayout(scratch)
  check('drift check reports a freshly built tree as current', drift.length === 0, JSON.stringify(drift))
} finally {
  await rm(scratch, { recursive: true, force: true })
}

process.exit(failures.length === 0 ? 0 : 1)
