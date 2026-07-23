#!/usr/bin/env node
/**
 * @tsfpp/workflow init
 *
 * Scaffolds Conventional Commits, Husky hooks, and release-please configuration
 * into the consuming project. Safe to re-run: agent files are always overwritten,
 * project-managed files (release-please-config.json, .release-please-manifest.json)
 * are skipped when --yes is passed.
 *
 * Usage:
 *   pnpm dlx @tsfpp/workflow                (one-shot, no install)
 *   node node_modules/@tsfpp/workflow/init.mjs
 *   node node_modules/@tsfpp/workflow/init.mjs --yes   (skip prompts for existing files)
 */

import { copyFile, chmod, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync }    from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import { execSync }      from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cwd       = process.cwd();

const yes = process.argv.includes('--yes') || process.argv.includes('-y');

const dim    = (s) => `\x1b[2m${s}\x1b[0m`;
const green  = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const bold   = (s) => `\x1b[1m${s}\x1b[0m`;

// ─── Static file map ──────────────────────────────────────────────────────────
// Files that are always overwritten (never project-managed).

const STATIC_FILES = [
  ['files/commitlint.config.js',  'commitlint.config.js'],
  ['files/husky/commit-msg',      '.husky/commit-msg'],
  ['files/husky/pre-commit',      '.husky/pre-commit'],
  ['files/workflows/release-please.yml', '.github/workflows/release-please.yml'],
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function ensureDir(filePath) {
  await mkdir(dirname(filePath), { recursive: true });
}

async function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function confirm(question) {
  if (yes) return true;
  return (await ask(question)) === 'y';
}

// ─── Workspace detection ──────────────────────────────────────────────────────

async function detectWorkspacePackages() {
  const wsFile = join(cwd, 'pnpm-workspace.yaml');
  if (!existsSync(wsFile)) return null;

  const yaml     = await readFile(wsFile, 'utf8');
  const patterns = [...yaml.matchAll(/^\s*-\s*['"]?([^'"#\n]+?)['"]?\s*$/gm)]
    .map(m => m[1].trim().replace(/\/\*\*?$/, ''));

  const packages = [];
  for (const pattern of patterns) {
    const absPattern = join(cwd, pattern);
    if (!existsSync(absPattern)) continue;
    const entries = await readdir(absPattern, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) packages.push(`${pattern}/${entry.name}`);
    }
  }
  return packages.length > 0 ? packages : null;
}

async function readPackageName(pkgPath) {
  try {
    const raw = await readFile(join(cwd, pkgPath, 'package.json'), 'utf8');
    return JSON.parse(raw).name ?? pkgPath;
  } catch {
    return pkgPath;
  }
}

async function readPackageVersion(pkgPath) {
  try {
    const raw = await readFile(join(cwd, pkgPath, 'package.json'), 'utf8');
    return JSON.parse(raw).version ?? '0.1.0';
  } catch {
    return '0.1.0';
  }
}

// ─── Release-please config generation ────────────────────────────────────────

async function generateReleasePleaseConfig(packages) {
  if (packages === null) {
    // Single package — root is the release target
    return {
      config: {
        '$schema': 'https://raw.githubusercontent.com/googleapis/release-please/main/schemas/config.json',
        'release-type': 'node',
        'bump-minor-pre-major': true,
        'bump-patch-for-minor-pre-major': true,
        packages: { '.': {} },
      },
      manifest: { '.': await readPackageVersion('.') },
    };
  }

  // Monorepo — ask which packages are releasable
  console.log(`\n  ${bold('Monorepo detected')} — ${packages.length} package(s) found.`);
  console.log(dim('  Select which packages release-please should manage.\n'));

  const selected = {};
  for (const pkg of packages) {
    const name = await readPackageName(pkg);
    const include = await confirm(
      `  Include ${bold(name)} ${dim(`(${pkg})`)} in release-please? ${dim('[y/N]')} `
    );
    if (include) {
      selected[pkg] = await readPackageVersion(pkg);
      console.log(`  ${green('✓')} ${name}`);
    } else {
      console.log(`  ${dim('–')} ${dim(name)} ${dim('(skipped)')}`);
    }
  }

  if (Object.keys(selected).length === 0) {
    console.log(`\n  ${yellow('!')} No packages selected — skipping release-please config.\n`);
    return null;
  }

  const configPackages = Object.fromEntries(
    Object.keys(selected).map(pkg => [pkg, {}])
  );

  return {
    config: {
      '$schema': 'https://raw.githubusercontent.com/googleapis/release-please/main/schemas/config.json',
      'release-type': 'node',
      'bump-minor-pre-major': true,
      'bump-patch-for-minor-pre-major': true,
      packages: configPackages,
    },
    manifest: selected,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

process.on('SIGINT', () => {
  console.log('\n\n  Aborted.\n');
  process.exit(0);
});

async function main() {
  console.log();
  console.log(bold('  @tsfpp/workflow — init'));
  console.log(dim('  Scaffolds Conventional Commits, Husky hooks, and release-please.\n'));

  const results = { copied: [], skipped: [], failed: [] };

  // ── 1. Static files (always overwrite) ──────────────────────────────────────

  for (const [src, dest] of STATIC_FILES) {
    const srcPath  = join(__dirname, src);
    const destPath = join(cwd, dest);

    try {
      await ensureDir(destPath);
      await copyFile(srcPath, destPath);

      // Husky hooks must be executable
      if (dest.startsWith('.husky/')) {
        await chmod(destPath, 0o755);
      }

      results.copied.push(dest);
      console.log(`  ${green('✓')} ${dest}`);
    } catch (err) {
      results.failed.push(dest);
      console.log(`  \x1b[31m✗\x1b[0m ${dest} ${dim(`(${err.message})`)}`);
    }
  }

  // ── 2. Husky install ─────────────────────────────────────────────────────────

  console.log();
  try {
    execSync('pnpm exec husky', { cwd, stdio: 'pipe' });
    console.log(`  ${green('✓')} husky install`);
  } catch (err) {
    console.log(`  ${yellow('!')} husky install failed — run ${bold('pnpm exec husky')} manually`);
    console.log(dim(`     ${err.message.split('\n')[0]}`));
  }

  // ── 3. Release-please config (project-managed) ───────────────────────────────

  console.log();

  const configDest   = join(cwd, 'release-please-config.json');
  const manifestDest = join(cwd, '.release-please-manifest.json');

  const configExists   = existsSync(configDest);
  const manifestExists = existsSync(manifestDest);

  if (configExists && yes) {
    results.skipped.push('release-please-config.json');
    results.skipped.push('.release-please-manifest.json');
    console.log(`  ${dim('–')} ${dim('release-please-config.json')} ${dim('(skipped — project-managed)')}`);
    console.log(`  ${dim('–')} ${dim('.release-please-manifest.json')} ${dim('(skipped — project-managed)')}`);
  } else if (configExists) {
    const overwrite = await confirm(
      `  ${yellow('!')} release-please-config.json already exists. Overwrite? ${dim('[y/N]')} `
    );
    if (!overwrite) {
      results.skipped.push('release-please-config.json');
      results.skipped.push('.release-please-manifest.json');
      console.log(`  ${dim('–')} ${dim('release-please-config.json')} ${dim('(skipped)')}`);
      console.log(`  ${dim('–')} ${dim('.release-please-manifest.json')} ${dim('(skipped)')}`);
    } else {
      await writeReleasePleaseFiles(results, configDest, manifestDest);
    }
  } else {
    await writeReleasePleaseFiles(results, configDest, manifestDest);
  }

  // ── 4. Summary ───────────────────────────────────────────────────────────────

  console.log();
  console.log(dim('  ─────────────────────────────────────────'));
  console.log(`  ${green(results.copied.length + ' copied')}  ${yellow(results.skipped.length + ' skipped')}  ${results.failed.length > 0 ? `\x1b[31m${results.failed.length} failed\x1b[0m` : dim('0 failed')}`);
  console.log();

  if (results.failed.length === 0) {
    console.log('  ' + bold('Done.'));
    console.log(dim('  Commit the generated files — they are workspace configuration.'));
    console.log(dim('  Add NPM_TOKEN to your GitHub repository secrets for publishing.\n'));
  } else {
    console.log('  Some files could not be written. Check the errors above.\n');
    process.exit(1);
  }
}

async function writeReleasePleaseFiles(results, configDest, manifestDest) {
  const packages = await detectWorkspacePackages();
  const generated = await generateReleasePleaseConfig(packages);

  if (generated === null) {
    results.skipped.push('release-please-config.json');
    results.skipped.push('.release-please-manifest.json');
    return;
  }

  try {
    await ensureDir(configDest);
    await writeFile(configDest,   JSON.stringify(generated.config,   null, 2) + '\n', 'utf8');
    await writeFile(manifestDest, JSON.stringify(generated.manifest, null, 2) + '\n', 'utf8');
    results.copied.push('release-please-config.json');
    results.copied.push('.release-please-manifest.json');
    console.log(`  ${green('✓')} release-please-config.json`);
    console.log(`  ${green('✓')} .release-please-manifest.json`);
  } catch (err) {
    results.failed.push('release-please-config.json');
    console.log(`  \x1b[31m✗\x1b[0m release-please-config.json ${dim(`(${err.message})`)}`);
  }
}

main();
