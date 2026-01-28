# Validation Stack: Security and Supply Chain

**Status:** Planning
**Created:** 2026-01-28
**Priority:** High

## Overview

This plan adds comprehensive security and supply chain validation to the pi-brain project's validation stack. The goal is to create thorough guardrails for AI-generated code, ensuring security, compliance, and quality before code is committed.

**Design Principle:** Thoroughness first, speed tuning second. All checks can be configured to run at different frequencies (pre-edit hook, pre-commit hook, CI).

## Current State

The project already has:

- Ultracite (oxlint + oxfmt) for linting and formatting
- TypeScript for type safety
- Vitest for testing
- Husky pre-commit hooks

## Proposed Additions

### 1. Secrets Detection

#### Tools

**gitleaks** (MIT License)

- Scans git history and files for 160+ secret types
- Can run as pre-commit hook or standalone
- Supports custom rules via `.gitleaks.toml`
- Installation: `brew install gitleaks` (macOS) or `sudo apt install gitleaks` (Linux)

**trufflehog** (GPL-2.0 License)

- Finds, validates, and analyzes leaked credentials
- Classifies 800+ secret types
- Can verify if secrets are live (not just detect patterns)
- Supports multiple sources: Git, filesystem, S3, Docker images, etc.
- Installation: `brew install trufflehog`

#### Why Both?

- **gitleaks**: Fast, excellent for git history scanning, simple configuration
- **trufflehog**: Deeper classification, verification capabilities, broader source support

Both tools have different detection capabilities and complement each other.

#### Integration Points

```bash
# Pre-commit hook
gitleaks protect --staged

# CI/CD
trufflehog git file://. --since-commit main --branch HEAD --results=verified,unknown --fail

# Manual scan
gitleaks detect --source . -v
trufflehog filesystem . --results=verified,unknown
```

#### Configuration

**gitleaks.toml** (extend default config):

```toml
[extend]
useDefault = true

# Disable rules if needed
disabledRules = ["generic-api-key"]

# Custom project-specific rules can be added
```

**TruffleHog config** (optional):

- Most use cases work without config
- Custom detectors and sources can be configured via YAML

#### npm Scripts

```json
{
  "scripts": {
    "check:secrets": "gitleaks detect --source . && trufflehog filesystem . --results=verified,unknown",
    "check:secrets:staged": "gitleaks protect --staged"
  }
}
```

### 2. Dependency Vulnerability Scanning

#### Tool

**npm audit** (Built-in to npm)

- Scans `package-lock.json` for known vulnerabilities
- Free, always available with npm
- Can auto-fix some vulnerabilities

#### Usage

```bash
# Check for vulnerabilities
npm audit

# Auto-fix vulnerabilities
npm audit fix

# Run as part of pre-commit or CI
npm audit --audit-level=moderate  # or 'high'
```

#### npm Scripts

```json
{
  "scripts": {
    "check:vulnerabilities": "npm audit --audit-level=moderate",
    "fix:vulnerabilities": "npm audit fix"
  }
}
```

#### Integration

Add to pre-commit hook after tests:

```bash
npm audit --audit-level=moderate
```

### 3. Static Application Security Testing (SAST)

#### Tool

**Semgrep** (LGPL-2.1 License - open source core)

- Semantic grep for code patterns
- Supports 30+ languages including TypeScript and JavaScript
- Can write custom rules that look like the code being analyzed
- Pre-built rulesets for security, correctness, and frameworks
- Installation: `brew install semgrep` (macOS) or `pip install semgrep`

#### Rulesets to Use

For pi-brain (TypeScript/Node.js):

- `p/typescript` - TypeScript-specific security rules
- `p/javascript` - JavaScript security rules
- `p/nodejs` - Node.js security rules
- `p/expressjs` - Express web framework rules (if using Express)
- `p/eslint` - Port of popular ESLint rules

#### Usage

```bash
# Quick scan with recommended rules
semgrep scan --config p/typescript --config p/javascript --config p/nodejs

# Auto-configuration (uses semgrep.dev account if logged in)
semgrep ci

# Custom rules directory
semgrep scan --config .semgrep/
```

#### Configuration

Create a `.semgrep.yaml` or use inline config:

```yaml
# .semgrep.yaml
rules:
  - id: custom-no-eval
    patterns:
      - pattern: eval($EXPR)
    message: Avoid using eval()
    languages: [ts, js]
    severity: ERROR

  - id: custom-no-process-env
    patterns:
      - pattern: process.env.$KEY
    message: Process env access - consider using config object
    languages: [ts, js]
    severity: WARNING
```

#### npm Scripts

```json
{
  "scripts": {
    "check:sast": "semgrep scan --config p/typescript --config p/javascript --config p/nodejs",
    "check:sast:ci": "semgrep ci --config p/typescript --config p/javascript --config p/nodejs"
  }
}
```

### 4. ESLint Security Plugins

#### Tools

**eslint-plugin-security** (MIT License)

- Node.js security rules
- 15+ security-focused rules
- Detects dangerous patterns: eval, child_process, unsafe RegExp, etc.
- Installation: `npm install --save-dev eslint-plugin-security`

**@typescript-eslint/no-unsafe-\* Rules** (Already partially configured)

- These rules should be enabled to complement the security plugin
- Includes: no-unsafe-assignment, no-unsafe-call, no-unsafe-member-access, etc.

#### Configuration (via Ultracite/Oxlint)

The oxlintrc should be updated to include security rules:

```json
{
  "plugins": ["security"],
  "extends": ["plugin:security/recommended"],
  "rules": {
    "security/detect-eval-with-expression": "error",
    "security/detect-non-literal-fs-filename": "error",
    "security/detect-non-literal-require": "error",
    "security/detect-possible-timing-attacks": "error"
  }
}
```

**Note:** Oxlint may need to be configured to load external plugins. If not supported directly, run ESLint separately:

```json
{
  "scripts": {
    "check:eslint-security": "eslint . --ext .ts,.js --plugin security --config .eslintrc.security.json"
  }
}
```

### 5. Enhanced TypeScript Strict Mode

#### What to Enable

The existing TypeScript configuration should ensure strict mode is fully enabled:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "allowUnusedLabels": false,
    "allowUnreachableCode": false,
    "exactOptionalPropertyTypes": true
  }
}
```

#### Oxlint Rules to Add

```json
{
  "rules": {
    "typescript-eslint/no-unsafe-assignment": "error",
    "typescript-eslint/no-unsafe-call": "error",
    "typescript-eslint/no-unsafe-member-access": "error",
    "typescript-eslint/no-unsafe-return": "error",
    "typescript-eslint/no-unsafe-argument": "error"
  }
}
```

## Integration Strategy

### Pre-Commit Hook (Fast Checks)

```bash
#!/bin/sh
set -e

# Ultracite (fast linting + formatting)
npx ultracite check

# Secrets detection (staged files only)
gitleaks protect --staged

# Dependency vulnerabilities (fast check)
npm audit --audit-level=high

# Tests
npm test -- --run

# Refresh codemap
./scripts/refresh-codemap.sh
```

### Full Validation (Slower, CI or Manual)

```bash
#!/bin/sh
set -e

# All pre-commit checks
# ... (above)

# Full secrets scan (all files, history)
gitleaks detect --source .
trufflehog filesystem . --results=verified,unknown --fail

# Dependency vulnerabilities (all levels)
npm audit

# SAST scanning
semgrep scan --config p/typescript --config p/javascript --config p/nodejs

# ESLint security (if not in oxlint)
eslint . --ext .ts,.js --plugin security
```

### npm Scripts Structure

```json
{
  "scripts": {
    // Existing
    "check": "ultracite check",
    "fix": "ultracite fix",
    "test": "vitest",

    // New: Security
    "check:secrets": "gitleaks detect --source . && trufflehog filesystem . --results=verified,unknown",
    "check:secrets:staged": "gitleaks protect --staged",
    "check:vulnerabilities": "npm audit --audit-level=moderate",
    "check:sast": "semgrep scan --config p/typescript --config p/javascript --config p/nodejs",

    // New: Combined
    "check:security": "npm run check:secrets:staged && npm run check:vulnerabilities",
    "check:security:full": "npm run check:secrets && npm audit && npm run check:sast",

    // New: All checks (full validation stack)
    "check:all": "npm run check && npm run check:security && npm test -- --run",
    "check:all:full": "npm run check && npm run check:security:full && npm test -- --run"
  }
}
```

## Implementation Plan

### Phase 1: Secrets Detection

1. Install gitleaks and trufflehog
2. Create initial `.gitleaks.toml` configuration
3. Add npm scripts for secrets checking
4. Update pre-commit hook with staged secrets check
5. Test with known secret patterns
6. Document usage in CONTRIBUTING.md

### Phase 2: Dependency Vulnerability Scanning

1. Run `npm audit` to assess current state
2. Configure audit level (moderate vs high)
3. Add npm script for vulnerability checking
4. Add to pre-commit hook
5. Document fix process

### Phase 3: SAST (Semgrep)

1. Install Semgrep CLI
2. Run initial scan with recommended rulesets
3. Review and triage findings
4. Create custom rules for pi-brain patterns
5. Add npm script for SAST checking
6. Document custom rules
7. Add to CI (too slow for pre-commit)

### Phase 4: ESLint Security

1. Evaluate oxlint's external plugin support
2. Install eslint-plugin-security if needed
3. Configure security rules
4. Run and triage findings
5. Add to validation stack
6. Update oxlintrc.json

### Phase 5: Documentation and Training

1. Update CONTRIBUTING.md with validation stack overview
2. Document each tool's purpose and usage
3. Create troubleshooting guide
4. Add examples of common issues and fixes
5. Document how to skip checks when necessary (and why it's rare)

## Configuration Files to Create

1. `.gitleaks.toml` - Gitleaks configuration
2. `.semgrep.yaml` - Semgrep custom rules (optional)
3. `.eslintrc.security.json` - ESLint security config (if needed)

## Performance Considerations

### Fast Checks (Pre-Commit)

- Ultracite: ~5-10 seconds
- Gitleaks (staged only): ~1-3 seconds
- npm audit: ~2-5 seconds
- **Total pre-commit: ~8-18 seconds**

### Slower Checks (CI/Manual)

- Gitleaks (full history): ~30-60 seconds
- TruffleHog: ~10-30 seconds
- Semgrep: ~30-60 seconds
- npm audit (full): ~5-10 seconds
- **Total CI: ~75-160 seconds**

## Trade-offs and Decisions

### Why Both Gitleaks and TruffleHog?

- Gitleaks is faster and better for git history
- TruffleHog has deeper classification and verification
- They use different detection heuristics, providing better coverage

### Why Semgrep CE vs AppSec Platform?

- CE is free and open source (LGPL-2.1)
- Sufficient for most security patterns
- Custom rules can be added as needed
- AppSec Platform available later if deeper analysis needed

### Why Separate Security Tools from Ultracite?

- Oxlint doesn't support external plugins well
- Security plugins have different update cycles
- Allows granular control over security rules
- Better integration with IDEs and CI tools

## Success Criteria

- All tools installed and configured
- Pre-commit hook runs in under 20 seconds
- Zero false positives in default configuration (after tuning)
- Documentation covers all edge cases
- AI agents can successfully pass all validation gates
- Security findings are actionable and clear

## Open Questions

1. Should Semgrep run in pre-commit or only CI?
   - **Recommendation:** CI only due to speed

2. Should npm audit auto-fix in pre-commit?
   - **Recommendation:** No, manual review required

3. How to handle baseline for existing secrets in git history?
   - **Recommendation:** Create baseline with `gitleaks --baseline-path`

## Next Steps

1. Review and approve this plan
2. Begin Phase 1 implementation
3. Iterate based on findings
4. Update plan as needed
5. Move to Code Quality & Standards Enforcement phase
