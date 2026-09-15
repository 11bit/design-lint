# Changelog

## 0.1.0

First release. Nine rules, each with a guide in `docs/rules/` and a contract in
`test/contracts/` whose cases are executed as its test suite.

- `no-raw-color`, `no-spectral-color`, `no-undefined-token`, `token-constraints`,
  `no-style-color`, `no-opacity-modifier`, `no-dark-variant`, `no-useless-hover`,
  `no-component-color-override`.
- `designLint()` factory for `oxlint.config.ts`, which turns on every rule.
- Every rule skips Storybook files through one option, `ignoreGlobs`, defaulting to
  `["**/*.stories.@(js|jsx|ts|tsx)"]`. Set it to `[]` to lint stories.
- JavaScript and TypeScript only. The CSS surface is deferred, with contracts written.

### Versioning policy

- A **new rule ships disabled**, and `designLint()` turns it on only in a major release.
  Turning one on in a minor makes a routine upgrade a failing build, which teaches
  people to pin — and a linter nobody upgrades stops matching the design system it was
  written for.
- **A rule catching strictly more** than it did — closing a declared blind spot, covering a
  utility family Tailwind added — is a **minor**. It can fail a build that passed, so it is
  never a patch.
- **A rule catching less**, a renamed rule or option, or a changed default is a **major**.
- Changes to a rule's *message text* are a patch. Nothing should parse them.
- Every one of these shows up as a change to a contract in `test/contracts/`, which is the
  diff worth reading in a release.
