#!/usr/bin/env bash
# Cloud Agent install: idempotent dependency + toolchain setup for pi-brain.
set -euo pipefail

# Pin pnpm to the version declared in package.json `packageManager` (and used
# in CI). An explicit version avoids corepack resolving "latest" (which triggers
# a node_modules purge prompt) and keeps the cloud env on the CI toolchain.
corepack prepare pnpm@10.33.0 --activate

# gitleaks: the `secrets` check runs the real gitleaks binary. The npm
# "gitleaks" devDependency is a config-only decoy package and ships no binary,
# so install the official Go binary (same version as CI) when it is missing.
GITLEAKS_VERSION="8.30.1"
if ! command -v gitleaks >/dev/null 2>&1 || [ "$(gitleaks version 2>/dev/null || true)" != "$GITLEAKS_VERSION" ]; then
  tmp="$(mktemp -d)"
  curl -fsSL "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz" -o "$tmp/gitleaks.tar.gz"
  tar -xzf "$tmp/gitleaks.tar.gz" -C "$tmp" gitleaks
  if command -v sudo >/dev/null 2>&1 && sudo -n true >/dev/null 2>&1; then
    sudo install -m 0755 "$tmp/gitleaks" /usr/local/bin/gitleaks
  else
    mkdir -p "$HOME/.local/bin"
    install -m 0755 "$tmp/gitleaks" "$HOME/.local/bin/gitleaks"
  fi
  rm -rf "$tmp"
fi

# Install dev dependencies. .npmrc sets `omit=dev`, so --prod=false is required
# to pull in the toolchain (oxlint, vitest, typescript, etc.). CI=true keeps
# pnpm non-interactive (no modules-purge confirmation prompt).
CI=true pnpm install --prod=false --frozen-lockfile
