# Firebase JS SDK Style Guide for Gemini Code Assist

## 1. Rules on What NOT to Flag (Suppress False Positives)

- **Do NOT suggest runtime null, undefined, or type validation** for
  function parameters, constructors, or internal pipeline objects when
  their types are already enforced by TypeScript. We rely on TypeScript's
  type system and intentionally omit redundant runtime type checks to keep
  client bundle sizes small. Only suggest runtime validation at true
  untrusted input boundaries (such as `JSON.parse` of external strings).
- **Do NOT suggest adding `vi.restoreAllMocks()` or `vi.useRealTimers()`**
  in individual `.test.ts` files if the package's `test/setup.ts` already
  performs global restoration in `afterEach`.
- **Do NOT suggest `refactor(...)` as a PR title or commit type.** The
  valid Conventional Commit types for PR titles in this repository are
  strictly: `feat`, `fix`, `ci`, `build`, `chore`, `test`, `docs` (code
  refactors in user-facing packages use `fix`).
- **Do NOT flag `child_process.exec` for command injection** in internal
  build, release, or test scripts (`scripts/`, `repo-scripts/`, `tools/`)
  when arguments are internal constants/paths with no external user input.
- **Do NOT ask authors to fix pre-existing bugs** in untouched code or
  published bundles outside the scope of the pull request.
- **Do NOT suggest adding runtime `console.warn` / `logger.warn` calls for
  deprecated options** when `@deprecated` JSDoc annotations are
  sufficient, as runtime warnings increase client bundle size and pollute
  end-users' browser consoles.

## 2. Changesets & Release Versioning (`.changeset/*.md`)

- Any PR that modifies published production code or runtime behavior in
  `packages/*` must include a `.changeset/*.md` file.
- PRs that only modify tests (`*.test.ts`, `vitest.config.mjs`), CI
  workflows, or `devDependencies` must **not** include a changeset.
- Use `minor` when a change adds or modifies the public API (or makes a
  significant behavior change); whenever a package is marked `minor`,
  `'firebase': minor` must also be included in the changeset frontmatter.
- Use `patch` for bug fixes, internal code changes without public API
  impact, and external dependency bumps (even major bumps of external
  dependencies). Do not add `'firebase': patch` for patch bumps.
- Changeset descriptions must be written for external SDK consumers (or
  say `(no release note needed)` for internal-only changes). Never
  manually edit `CHANGELOG.md`.

## 3. Public API Surface & API Extractor (`common/api-review/*.api.md`)

- Never manually edit `common/api-review/*.api.md` files; add JSDoc tags
  (`@public`, `@beta`, `@internal`) in the `.ts` source and run
  `yarn docgen:all`.
- Every parameter and return type referenced by a publicly exported
  method/function must also be exported from the public entry point (no
  `ae-forgotten-export` warnings).
- Internal helper types that developers never reference directly should be
  marked `@internal` (with a leading `_` if required by `api-extractor`).
- Prefer `as const` objects paired with a string literal union type over
  exported TypeScript `enum` or `const enum`.
- In public JSDoc code examples, always import from `'firebase/<package>'`
  (never `'@firebase/<package>'`).

## 4. Testing Standards (Vitest, Browser vs. Node, Spies vs. Stubs)

- Browser unit tests are mandatory for web SDK packages. Ensure Node test
  setups load the Node entry point (`src/index.node.ts`) and Browser test
  setups load the Browser entry point.
- Unlike `sinon.stub()`, `vi.spyOn()` executes the underlying function by
  default. Always chain `.mockImplementation(() => {})` or
  `.mockResolvedValue(...)` when spying on network calls (`fetch`, `open`,
  `send`), IndexedDB, DOM script injection, or `console`/`logger` methods.
- Prefer `.mockResolvedValue(val)` over
  `.mockReturnValue(Promise.resolve(val))`.
- Vitest's `.toThrow()` only accepts **one** argument (a second argument
  is silently ignored). Check the specific `FirebaseError` code or message
  rather than passing two arguments.
- When migrating Chai's `to.have.deep.members(expected)` to
  `expect.arrayContaining(expected)`, also assert
  `.toHaveLength(expected.length)`.
- In `vitest.config.mjs`, do not set per-environment variables on shared
  `project.define` (which overwrites across projects before tests run);
  use per-project `test.env` and `extends: true`.

## 5. Build, Rollup, Errors & JSDoc Formatting

- Never add heavy framework dependencies (e.g., `next`) to `dependencies`
  if only TypeScript types are needed (`import type`).
- Exclude `test/**` in `rollup.config.js` `tsconfigOverride`.
- Construct errors via the package's `ERROR_FACTORY.create(...)` with
  `{$template}` variables in `errors.ts` rather than instantiating raw
  `new FirebaseError` directly.
- In public JSDoc comments, never use HTML `<p>` tags; place `@remarks`
  before the second paragraph so `api-documenter` does not concatenate
  paragraphs in summary tables.
- All code and imports must appear below the Apache 2.0 license header.
- Avoid sending keys with `undefined` values in JSON request payloads to
  backend APIs.
