# Linter Backpressure Implementation Plan

> "Linters write the law that agents follow." — Factory.ai

This plan systematically enables linter rules to maximize coding standards backpressure for agents, following the Factory.ai Agent-Native Development methodology.

## Current State

- **35+ rules disabled** in `.oxlintrc.json`
- **~4,000 TypeScript files** across the codebase
- **AGENTS.md standards** not fully enforced by linting

## Methodology

1. Enable one rule at a time (or small related groups)
2. Run `npx ultracite check` to surface violations
3. Understand the violations (are they real issues or false positives?)
4. Fix violations or adjust rule configuration
5. Commit when green
6. Repeat

## Priority Order (Factory.ai Categories)

### Phase 1: Type Safety (Highest Impact)

These directly enforce AGENTS.md standards about type safety.

| #   | Rule                                      | Current | Target | AGENTS.md Alignment                        |
| --- | ----------------------------------------- | ------- | ------ | ------------------------------------------ |
| 1.1 | `typescript-eslint/no-explicit-any`       | off     | error  | "No any types unless absolutely necessary" |
| 1.2 | `typescript-eslint/no-non-null-assertion` | off     | warn   | "Use proper null checks"                   |

### Phase 2: Grep-ability & Searchability

Make code easy to find, index, and refactor (Factory.ai's #1 recommendation).

| #   | Rule                     | Current | Target | Rationale                          |
| --- | ------------------------ | ------- | ------ | ---------------------------------- |
| 2.1 | `no-barrel-file`         | off     | warn   | "Avoid barrel files" per AGENTS.md |
| 2.2 | `eslint/prefer-template` | off     | warn   | Consistent string formatting       |

### Phase 3: Code Quality & Complexity

Catch functions that need decomposition.

| #   | Rule                       | Current | Target        | Rationale                     |
| --- | -------------------------- | ------- | ------------- | ----------------------------- |
| 3.1 | `eslint/complexity`        | off     | warn (max:15) | Flag overly complex functions |
| 3.2 | `eslint/max-statements`    | off     | warn (max:50) | Flag overly long functions    |
| 3.3 | `eslint/no-empty-function` | off     | warn          | Catch stub implementations    |

### Phase 4: Async/Promise Handling

Ensure proper async patterns.

| #   | Rule                              | Current | Target | Rationale                           |
| --- | --------------------------------- | ------- | ------ | ----------------------------------- |
| 4.1 | `eslint/require-await`            | off     | warn   | Catch unnecessary async             |
| 4.2 | `eslint-plugin-promise/avoid-new` | off     | warn   | Prefer async/await over new Promise |

### Phase 5: Defensive Coding

Encourage explicit handling of edge cases.

| #   | Rule                  | Current | Target | Rationale                          |
| --- | --------------------- | ------- | ------ | ---------------------------------- |
| 5.1 | `eslint/default-case` | off     | warn   | Switch statements handle all cases |
| 5.2 | `no-magic-numbers`    | off     | warn   | Named constants for clarity        |

### Phase 6: Code Organization

Consistent patterns for better agent navigation.

| #   | Rule                                                | Current | Target | Rationale                      |
| --- | --------------------------------------------------- | ------- | ------ | ------------------------------ |
| 6.1 | `eslint-plugin-unicorn/consistent-function-scoping` | off     | warn   | Functions at appropriate scope |
| 6.2 | `eslint-plugin-unicorn/no-array-for-each`           | off     | warn   | Prefer for...of loops          |

### Phase 7: Testing Discipline

Ensure test quality.

| #   | Rule                                       | Current | Target | Rationale               |
| --- | ------------------------------------------ | ------- | ------ | ----------------------- |
| 7.1 | `eslint-plugin-vitest/prefer-called-times` | off     | warn   | Precise assertions      |
| 7.2 | `eslint-plugin-jest/prefer-called-with`    | off     | warn   | Precise mock assertions |

---

## Execution Checklist

### Phase 1: Type Safety

- [ ] **1.1** `typescript-eslint/no-explicit-any` → error
  - [ ] Run check, count violations
  - [ ] Fix each `any` with proper types or `unknown`
  - [ ] For truly necessary cases, add `// oxlint-ignore-next-line` with justification
  - [ ] Verify green, commit

- [ ] **1.2** `typescript-eslint/no-non-null-assertion` → warn
  - [ ] Run check, count violations
  - [ ] Replace `!` with proper null checks or early returns
  - [ ] Verify green, commit

### Phase 2: Grep-ability

- [ ] **2.1** `no-barrel-file` → warn
  - [ ] Run check, identify barrel files
  - [ ] Evaluate if they're necessary for public API surface
  - [ ] Convert internal barrels to direct imports
  - [ ] Verify green, commit

- [ ] **2.2** `eslint/prefer-template` → warn
  - [ ] Run check, count violations
  - [ ] Replace string concatenation with template literals
  - [ ] Verify green, commit

### Phase 3: Code Quality

- [ ] **3.1** `eslint/complexity` → warn (max:15)
  - [ ] Run check, identify complex functions
  - [ ] Refactor or document why complexity is necessary
  - [ ] Tune threshold if needed
  - [ ] Verify green, commit

- [ ] **3.2** `eslint/max-statements` → warn (max:50)
  - [ ] Run check, identify long functions
  - [ ] Extract helper functions where appropriate
  - [ ] Verify green, commit

- [ ] **3.3** `eslint/no-empty-function` → warn
  - [ ] Run check, identify empty functions
  - [ ] Add implementation or explicit `// noop` comment
  - [ ] Verify green, commit

### Phase 4: Async/Promise

- [ ] **4.1** `eslint/require-await` → warn
  - [ ] Run check, identify async functions without await
  - [ ] Remove async keyword or add proper awaiting
  - [ ] Verify green, commit

- [ ] **4.2** `eslint-plugin-promise/avoid-new` → warn
  - [ ] Run check, identify new Promise usage
  - [ ] Convert to async/await where possible
  - [ ] Keep justified uses (e.g., promisifying callbacks)
  - [ ] Verify green, commit

### Phase 5: Defensive Coding

- [ ] **5.1** `eslint/default-case` → warn
  - [ ] Run check, identify switch statements
  - [ ] Add default cases with appropriate handling
  - [ ] Verify green, commit

- [ ] **5.2** `no-magic-numbers` → warn (with exemptions)
  - [ ] Configure: `ignoreArrayIndexes`, `ignoreDefaultValues`, common numbers
  - [ ] Run check, identify magic numbers
  - [ ] Extract to named constants
  - [ ] Verify green, commit

### Phase 6: Code Organization

- [ ] **6.1** `eslint-plugin-unicorn/consistent-function-scoping` → warn
  - [ ] Run check, identify misplaced functions
  - [ ] Move to appropriate scope
  - [ ] Verify green, commit

- [ ] **6.2** `eslint-plugin-unicorn/no-array-for-each` → warn
  - [ ] Run check, count forEach usage
  - [ ] Convert to for...of loops
  - [ ] Verify green, commit

### Phase 7: Testing

- [ ] **7.1** `eslint-plugin-vitest/prefer-called-times` → warn
  - [ ] Run check in test files
  - [ ] Update assertions
  - [ ] Verify green, commit

- [ ] **7.2** `eslint-plugin-jest/prefer-called-with` → warn
  - [ ] Run check in test files
  - [ ] Update mock assertions
  - [ ] Verify green, commit

---

## Success Criteria

1. **All phases complete** with lint passing
2. **Rules at target severity** (error or warn as specified)
3. **AGENTS.md aligned** with lint enforcement
4. **Documentation updated** for any exceptions or waivers
5. **Zero disabled rules** except those with documented justification

---

## Final Configuration Target

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "extends": ["./node_modules/ultracite/config/oxlint/core/.oxlintrc.json"],
  "ignorePatterns": ["docs/"],
  "rules": {
    // Type Safety - ENFORCED
    "typescript-eslint/no-explicit-any": "error",
    "typescript-eslint/no-non-null-assertion": "warn",
    "typescript-eslint/no-inferrable-types": "off",

    // Grep-ability - ENFORCED
    "no-barrel-file": "warn",
    "eslint/prefer-template": "warn",

    // Code Quality - ENFORCED
    "eslint/complexity": ["warn", { "max": 15 }],
    "eslint/max-statements": ["warn", { "max": 50 }],
    "eslint/no-empty-function": "warn",

    // Async/Promise - ENFORCED
    "eslint/require-await": "warn",
    "eslint-plugin-promise/avoid-new": "warn",

    // Defensive Coding - ENFORCED
    "eslint/default-case": "warn",
    "no-magic-numbers": [
      "warn",
      {
        "ignoreArrayIndexes": true,
        "ignoreDefaultValues": true,
        "ignore": [-1, 0, 1, 2, 10, 100, 1000]
      }
    ],

    // Code Organization - ENFORCED
    "eslint-plugin-unicorn/consistent-function-scoping": "warn",
    "eslint-plugin-unicorn/no-array-for-each": "warn",

    // Testing - ENFORCED
    "eslint-plugin-vitest/prefer-called-times": "warn",
    "eslint-plugin-jest/prefer-called-with": "warn",

    // JUSTIFIED EXCEPTIONS (documented below)
    "eslint/func-style": "off",
    "eslint/class-methods-use-this": "off",
    "eslint/no-alert": "off",
    "eslint/no-plusplus": "off",
    "eslint/no-inner-declarations": "off",
    "eslint/no-inline-comments": "off",
    "eslint/sort-keys": "off",
    "eslint-plugin-unicorn/prefer-query-selector": "off",
    "eslint-plugin-unicorn/prefer-add-event-listener": "off",
    "eslint-plugin-unicorn/no-lonely-if": "off",
    "eslint-plugin-vitest/prefer-describe-function-title": "off",
    "eslint-plugin-jest/require-hook": "off",
    "eslint-plugin-jest/no-hooks": "off",
    "eslint-plugin-jest/max-expects": "off",
    "eslint-plugin-jest/no-conditional-in-test": "off",
    "eslint-plugin-import/consistent-type-specifier-style": "off",
    "oxc/no-async-endpoint-handlers": "off"
  }
}
```

## Justification for Remaining "off" Rules

| Rule                                     | Reason                                                                     |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| `eslint/func-style`                      | Arrow vs function declaration is a style choice with no correctness impact |
| `eslint/class-methods-use-this`          | Some methods are intentionally static-like for interface consistency       |
| `eslint/no-alert`                        | Not applicable (no browser code)                                           |
| `eslint/no-plusplus`                     | `++`/`--` are idiomatic in loops                                           |
| `eslint/no-inner-declarations`           | Inner functions are useful for encapsulation                               |
| `eslint/no-inline-comments`              | Inline comments aid readability                                            |
| `eslint/sort-keys`                       | Semantic grouping > alphabetical sorting                                   |
| `unicorn/prefer-query-selector`          | Not applicable (no DOM code)                                               |
| `unicorn/prefer-add-event-listener`      | Not applicable (no DOM code)                                               |
| `unicorn/no-lonely-if`                   | Sometimes clearer than alternatives                                        |
| `vitest/prefer-describe-function-title`  | Test titles are already descriptive                                        |
| `jest/require-hook`                      | Setup in test body is sometimes cleaner                                    |
| `jest/no-hooks`                          | Hooks are useful for test setup                                            |
| `jest/max-expects`                       | Some tests legitimately need many assertions                               |
| `jest/no-conditional-in-test`            | Some tests need conditional logic                                          |
| `import/consistent-type-specifier-style` | Mixed styles acceptable                                                    |
| `oxc/no-async-endpoint-handlers`         | Framework handles async handlers correctly                                 |

---

## Commands Reference

```bash
# Check current state
npx ultracite check

# Check with warnings visible
npx ultracite check --diagnostic-level warn

# Fix auto-fixable issues
npx ultracite fix

# Format code
npx oxfmt --write .

# Full fix workflow
npm run fix && npx oxfmt --write .
```
