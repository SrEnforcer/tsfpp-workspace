#!/usr/bin/env node

import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(scriptDir, '..');
const sourceRoot = join(packageRoot, 'ai');

/**
 * Compute the output roots for a target project directory.
 *
 * These were module-level constants bound to `process.cwd()` at import time,
 * which made the generator impossible to run against anywhere but the current
 * directory — and so impossible to check for drift without mutating the repo.
 */
const rootsFor = (targetRoot) => ({
  targetRoot,
  universalRoot: join(targetRoot, '.ai'),
  githubRoot: join(targetRoot, '.github'),
});

// Collapses existing trailing newlines to one. Deliberately does NOT add a
// newline when the source lacks one — changing that rewrites every generated
// file and would swamp any real drift the check is meant to surface.
const trimTrailingNewline = (value) => value.replace(/\n+$/, '\n');

function splitFrontmatter(content) {
  if (!content.startsWith('---\n')) {
    return { frontmatter: '', body: content };
  }

  const endIndex = content.indexOf('\n---\n', 4);
  if (endIndex === -1) {
    return { frontmatter: '', body: content };
  }

  const frontmatter = content.slice(4, endIndex).trimEnd();
  const body = content.slice(endIndex + 5).replace(/^\n+/, '');
  return { frontmatter, body };
}

async function writeText(filePath, content) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, trimTrailingNewline(content), 'utf8');
}

async function copyRootGuide(roots) {
  const content = await readFile(join(packageRoot, 'ai.md'), 'utf8');
  const { body } = splitFrontmatter(content);

  await writeText(join(roots.targetRoot, 'ai.md'), body);
}

async function compileCopilotInstructions(roots) {
  const sourcePath = join(sourceRoot, 'copilot-instructions.md');

  try {
    await compileFile(
      sourcePath,
      join(roots.universalRoot, 'copilot-instructions.md'),
      join(roots.githubRoot, 'copilot-instructions.md'),
    );
  } catch (error) {
    if (error?.code === 'ENOENT') {
      const content = await readFile(join(packageRoot, 'ai.md'), 'utf8');
      const { body } = splitFrontmatter(content);

      await writeText(join(roots.universalRoot, 'copilot-instructions.md'), body);
      await writeText(join(roots.githubRoot, 'copilot-instructions.md'), body);
      return;
    }

    throw error;
  }
}

async function compileFile(sourcePath, universalPath, githubPath) {
  const content = await readFile(sourcePath, 'utf8');
  const { frontmatter, body } = splitFrontmatter(content);

  await writeText(universalPath, body);
  if (frontmatter) {
    await writeText(universalPath.replace(/\.md$/, '.frontmatter.yaml'), `${frontmatter}\n`);
  }

  const githubContent = frontmatter
    ? `---\n${frontmatter}\n---\n\n${body}`
    : body;

  await writeText(githubPath, githubContent);
}

/** Compile every file in a source directory that carries `suffix`. */
async function compileDirectory(roots, { dir, suffix, universalDir, githubDir }) {
  const sourceDir = join(sourceRoot, dir);

  let fileNames;
  try {
    fileNames = (await readdir(sourceDir, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith(suffix))
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return;
    }

    throw error;
  }

  for (const fileName of fileNames) {
    const baseName = fileName.slice(0, -suffix.length);
    await compileFile(
      join(sourceDir, fileName),
      join(roots.universalRoot, universalDir, `${baseName}.md`),
      join(roots.githubRoot, githubDir, fileName),
    );
  }
}

async function compileSkills(roots) {
  const skillsRoot = join(sourceRoot, 'skills');
  const skillDirs = (await readdir(skillsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const skillName of skillDirs) {
    await compileFile(
      join(skillsRoot, skillName, 'SKILL.md'),
      join(roots.universalRoot, 'skills', skillName, 'SKILL.md'),
      join(roots.githubRoot, 'skills', skillName, 'SKILL.md'),
    );
  }
}

async function compileWorkflows(roots) {
  const workflowDir = join(sourceRoot, 'workflows');
  let workflowFiles;

  try {
    workflowFiles = (await readdir(workflowDir, { withFileTypes: true }))
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return;
    }

    throw error;
  }

  for (const fileName of workflowFiles) {
    const content = await readFile(join(workflowDir, fileName), 'utf8');
    await writeText(join(roots.githubRoot, 'workflows', fileName), content);
  }
}

export async function buildAiLayout(targetRoot = process.cwd()) {
  const roots = rootsFor(targetRoot);

  await copyRootGuide(roots);
  await compileCopilotInstructions(roots);
  await compileDirectory(roots, {
    dir: 'agents',
    suffix: '.agent.md',
    universalDir: 'agents',
    githubDir: 'agents',
  });
  await compileDirectory(roots, {
    dir: 'instructions',
    suffix: '.instructions.md',
    universalDir: 'instructions',
    githubDir: 'instructions',
  });
  await compileDirectory(roots, {
    dir: 'prompts',
    suffix: '.prompt.md',
    universalDir: 'prompts',
    githubDir: 'prompts',
  });
  await compileSkills(roots);
  await compileWorkflows(roots);
}

/** Recursively list files under `dir`, as paths relative to it. */
async function listFiles(dir, prefix = '') {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return [];
    }

    throw error;
  }

  const nested = await Promise.all(
    entries.map(async (entry) => {
      const rel = join(prefix, entry.name);
      return entry.isDirectory()
        ? listFiles(join(dir, entry.name), rel)
        : [rel];
    }),
  );

  return nested.flat();
}

/**
 * Report generated files in `targetRoot` that no longer match their sources.
 *
 * Only files the generator owns are compared, so hand-added files such as a
 * project's own `ci.yml` are never reported. Returns an array of
 * `{ file, reason }` — empty means the committed output is current.
 */
export async function checkAiLayout(targetRoot = process.cwd()) {
  const scratch = await mkdtemp(join(tmpdir(), 'tsfpp-agents-'));

  try {
    await buildAiLayout(scratch);

    // `.ai/` is a build artifact and is gitignored in consumers, so only the
    // committed `.github/` deliverable and the root guide are compared.
    const expectedGithub = await listFiles(join(scratch, '.github'));
    const comparisons = expectedGithub
      .map((file) => ({
        file: join('.github', file),
        expected: join(scratch, '.github', file),
        actual: join(targetRoot, '.github', file),
      }))
      .concat([
        {
          file: 'ai.md',
          expected: join(scratch, 'ai.md'),
          actual: join(targetRoot, 'ai.md'),
        },
      ]);

    const results = await Promise.all(
      comparisons.map(async ({ file, expected, actual }) => {
        const expectedContent = await readFile(expected, 'utf8');

        try {
          const actualContent = await readFile(actual, 'utf8');
          return actualContent === expectedContent ? undefined : { file, reason: 'out of date' };
        } catch (error) {
          if (error?.code === 'ENOENT') {
            return { file, reason: 'missing' };
          }

          throw error;
        }
      }),
    );

    return results.filter((result) => typeof result !== 'undefined');
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--check')) {
    const drifted = await checkAiLayout();

    if (drifted.length > 0) {
      process.stderr.write(
        'AI bindings are stale:\n' +
          drifted.map(({ file, reason }) => `  ${file} — ${reason}\n`).join('') +
          `\nRegenerate with: node node_modules/@tsfpp/agents/init.mjs --yes\n`,
      );
      process.exit(1);
    }

    process.stdout.write('AI bindings are up to date.\n');
  } else {
    await buildAiLayout();
  }
}
