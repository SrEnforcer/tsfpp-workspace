#!/usr/bin/env bash
#
# check-releases.sh — read-only release/versioning health check for the workspace.
#
# For every internal @tsfpp/* package it reports:
#   1. local package.json version vs the version published on npm (what needs publishing)
#   2. any internal dependency that is pinned to an EXACT version (policy: use a caret ^)
#
# It mutates nothing, needs no auth, and is safe to run any time. Requires: node, curl.
# See docs/workspace-architecture-and-rationale.md for the pinning policy and publish order.

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

. "$repo_root/scripts/subtree-repos.sh"

printf '== Release status (local vs npm) ==\n\n'

pending=()

for repo_name in "${subtree_repos[@]}"; do
  pkg_json="repos/$repo_name/package.json"
  [ -f "$pkg_json" ] || continue

  name="$(node -p "require('./$pkg_json').name || ''" 2>/dev/null || true)"
  local_v="$(node -p "require('./$pkg_json').version || ''" 2>/dev/null || true)"
  [ -n "$name" ] || continue
  case "$name" in @tsfpp/*) ;; *) continue ;; esac

  npm_v="$(curl -fsS "https://registry.npmjs.org/${name}/latest" 2>/dev/null \
    | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{process.stdout.write(JSON.parse(s).version||'')}catch{process.stdout.write('')}})" \
    2>/dev/null || true)"

  if [ -z "$npm_v" ]; then
    status="npm: unknown (unpublished or offline)"
  elif [ "$npm_v" = "$local_v" ]; then
    status="up to date"
  else
    status="NEEDS PUBLISH  (npm has $npm_v)"
    pending+=("$name")
  fi

  printf '  %-22s local %-8s  %s\n' "$name" "$local_v" "$status"
done

printf '\n== Exact-pin check (policy: internal deps use a caret ^) ==\n\n'

exact_found=0
for repo_name in "${subtree_repos[@]}"; do
  pkg_json="repos/$repo_name/package.json"
  [ -f "$pkg_json" ] || continue

  # Print "field name range" for every @tsfpp/* dependency whose range is an exact
  # version (no leading ^ ~ >= < = | * x space).
  node -e "
    const pkg = require('./$pkg_json');
    for (const field of ['dependencies','devDependencies','peerDependencies']) {
      const deps = pkg[field]; if (!deps) continue;
      for (const [k, v] of Object.entries(deps)) {
        if (!k.startsWith('@tsfpp/')) continue;
        if (/^[0-9]/.test(v)) console.log('  ' + (pkg.name||'$repo_name') + '  ' + field + '  ' + k + ': ' + v);
      }
    }
  " 2>/dev/null | while read -r line; do printf '%s   <- exact pin, prefer ^\n' "$line"; exact_found=1; done

  if node -e "
    const pkg = require('./$pkg_json');
    let hit = false;
    for (const field of ['dependencies','devDependencies','peerDependencies']) {
      const deps = pkg[field]; if (!deps) continue;
      for (const [k, v] of Object.entries(deps)) {
        if (k.startsWith('@tsfpp/') && /^[0-9]/.test(v)) hit = true;
      }
    }
    process.exit(hit ? 0 : 1);
  " 2>/dev/null; then exact_found=1; fi
done

[ "$exact_found" -eq 0 ] && printf '  none — all internal deps use ranges.\n'

if [ "${#pending[@]}" -gt 0 ]; then
  printf '\n== Suggested publish order (foundational first) ==\n\n'
  printf '  standard, prelude  ->  boundary  ->  mcp-server  ->  agents\n'
  printf '  (publish only the ones flagged NEEDS PUBLISH above, in this order)\n'
fi

printf '\n'
