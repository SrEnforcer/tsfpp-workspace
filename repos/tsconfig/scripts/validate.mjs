#!/usr/bin/env node

/**
 * Validate every published tsconfig preset by compiling against it.
 *
 * `tsc --showConfig -p tsconfig.base.json` cannot do this: a config-only
 * package has no TypeScript sources, so tsc reports TS18003 ("no inputs were
 * found") and never gets as far as checking the options. The presets are only
 * meaningfully valid from a *consumer's* position, so this compiles a small
 * sample file in a scratch directory through each preset in turn — which is
 * exactly what an adopter's first `extends` does.
 */

import { execFileSync } from 'node:child_process'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

const PRESETS = ['tsconfig.base.json', 'tsconfig.app.json', 'tsconfig.lib.json']

const SAMPLE = `export type Shape =
  | { readonly kind: 'circle'; readonly radius: number }
  | { readonly kind: 'rect'; readonly width: number; readonly height: number }

export const area = (shape: Shape): number => {
  switch (shape.kind) {
    case 'circle': return Math.PI * shape.radius ** 2
    case 'rect':   return shape.width * shape.height
    default:       return absurd(shape)
  }
}

const absurd = (value: never): never => {
  throw new Error(\`Unreachable: \${JSON.stringify(value)}\`)
}
`

const validate = async (preset) => {
  const scratch = await mkdtemp(join(tmpdir(), 'tsfpp-tsconfig-'))

  try {
    await mkdir(join(scratch, 'src'), { recursive: true })
    await writeFile(join(scratch, 'src', 'sample.ts'), SAMPLE, 'utf8')
    await writeFile(
      join(scratch, 'tsconfig.json'),
      JSON.stringify(
        {
          extends: join(packageRoot, preset),
          compilerOptions: {
            outDir: join(scratch, 'dist'),
            rootDir: scratch,
            // The scratch project lives outside the package, so ambient types
            // named by a preset (the `app` preset asks for "node", which its
            // README tells adopters to install) cannot resolve by walking up
            // from here. Point at this package's own @types instead.
            typeRoots: [join(packageRoot, 'node_modules', '@types')],
          },
          include: ['src/**/*.ts'],
        },
        null,
        2,
      ),
      'utf8',
    )

    execFileSync(
      process.execPath,
      [join(packageRoot, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', join(scratch, 'tsconfig.json')],
      { stdio: 'pipe' },
    )

    return { preset, ok: true }
  } catch (error) {
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim()
    return { preset, ok: false, output }
  } finally {
    await rm(scratch, { recursive: true, force: true })
  }
}

const results = []
for (const preset of PRESETS) {
  results.push(await validate(preset))
}

for (const result of results) {
  process.stdout.write(`${result.ok ? 'ok  ' : 'FAIL'}  ${result.preset}\n`)
  if (!result.ok) {
    process.stdout.write(`${result.output}\n`)
  }
}

process.exit(results.every((result) => result.ok) ? 0 : 1)
