# Changelog

## 0.1.0

First release. Nine rules, each with a contract in `docs/rules/` whose examples are executed
as its test suite.

- `no-raw-color`, `no-spectral-color`, `no-undefined-token`, `token-constraints`,
  `no-style-color`, `no-opacity-modifier`, `no-dark-variant`, `no-useless-hover`,
  `no-component-color-override`.
- `designLint()` factory for `oxlint.config.ts`; `recommended` and `minimal` presets.
- Every rule skips Storybook files through one option, `ignoreGlobs`, defaulting to
  `["**/*.stories.@(js|jsx|ts|tsx)"]`. Set it to `[]` to lint stories.
- JavaScript and TypeScript only. The CSS surface is deferred, with contracts written.

### Versioning policy

- A **new rule ships disabled** and joins `recommended` only in a major release. Adding one
  to `recommended` in a minor turns a routine upgrade into a failing build, which teaches
  people to pin — and a linter nobody upgrades stops matching the design system it was
  written for.
- **A rule catching strictly more** than it did — closing a declared blind spot, covering a
  utility family Tailwind added — is a **minor**. It can fail a build that passed, so it is
  never a patch.
- **A rule catching less**, a renamed rule or option, or a changed default is a **major**.
- Changes to a rule's *message text* are a patch. Nothing should parse them.
- Every one of these shows up as a change to a contract in `docs/rules/`, which is the
  diff worth reading in a release.
