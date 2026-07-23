#!/usr/bin/env bash

subtree_repos=(
  agents
  boundary
  eslint-config
  mcp-server
  prelude
  standard
  tsconfig
  tsfpp
  workflow
)

subtree_remote_for() {
  local repo_name="$1"
  printf 'git@github.com:tsfpp/%s.git' "$repo_name"
}