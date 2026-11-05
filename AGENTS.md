# AGENTS.md

## Testing instructions
- Before testing, create a `config/project.json` file. Copy
  `config/ci.config.json` if another project config is not specified by the
  user.
- This is a web SDK and is most commonly used in a browser environment, so
  if you are running unit tests, you must run browser unit tests, not just
  Node tests, even if the Node tests seem like they would be faster. Ensure
  Node test setups load the Node entry point (`src/index.node.ts`) and
  Browser test setups load the Browser entry point.
- Do not add `vi.restoreAllMocks()` or `vi.useRealTimers()` in individual
  `.test.ts` files if the package's `test/setup.ts` already performs global
  restoration in `afterEach`.
- In Vitest tests, `vi.spyOn()` executes the original function by default
  (unlike `sinon.stub()`). Always chain `.mockImplementation(() => {})` or
  `.mockResolvedValue(...)` when spying on network calls (`fetch`, `open`,
  `send`), IndexedDB, DOM script injection, or `console`/`logger` methods.
  Prefer `.mockResolvedValue(val)` over
  `.mockReturnValue(Promise.resolve(val))`.
- Vitest's `.toThrow()` only accepts one argument (a second argument is
  silently ignored). Assert against the specific `FirebaseError` code or
  message rather than passing two arguments.
- When asserting unordered array contents with
  `expect.arrayContaining(expected)`, also assert
  `.toHaveLength(expected.length)`.
- In `vitest.config.mjs`, do not set per-environment variables on shared
  `project.define` (which overwrites across projects before tests run); use
  per-project `test.env` and `extends: true`.

## Preparing code for PRs
- Run `yarn format` after any changes to `*.ts` or `*.js` files, to do a
  formatting and license pass. All code and imports must appear below the
  Apache 2.0 license header.
- Run `yarn docgen:all` after any changes that affect the public API or
  that change the text of comments that are the source of public
  documentation. Never manually edit `common/api-review/*.api.md` files;
  add or update JSDoc release tags (`@public`, `@beta`, `@internal`) in the
  `.ts` source instead.
- Add a changeset in `.changeset/` for any user-facing change (PRs that
  only modify tests, CI workflows, or `devDependencies` must not include a
  changeset, and never manually edit `CHANGELOG.md`):
  - For `minor` changes (new or modified public API, or significant
    behavior change), include both the affected `@firebase/*: minor`
    package(s) and `'firebase': minor`.
  - For `patch` changes (bug fixes, internal changes, or external
    dependency bumps), list only the affected `@firebase/*` package(s). Do
    not add a `'firebase'` entry; the changesets tool automatically bumps
    the umbrella package by a patch for any dependency bump.

## Public API, JSDoc, and build conventions
- We rely on TypeScript's type system and intentionally omit redundant
  runtime null, undefined, or type validation to keep client bundle sizes
  small. Only add runtime validation at true untrusted input boundaries
  (such as `JSON.parse` of external strings).
- Do not add runtime `console.warn` or `logger.warn` calls for deprecated
  options when `@deprecated` JSDoc annotations are sufficient, as runtime
  warnings increase client bundle size and pollute end-users' browser
  consoles.
- Every parameter and return type referenced by a publicly exported method
  or function must also be exported from the public entry point (to avoid
  `ae-forgotten-export` warnings). Mark internal helper types `@internal`
  (with a leading `_` if required by `api-extractor`).
- Prefer `as const` objects paired with a string literal union type over
  exported TypeScript `enum` or `const enum`.
- In doc comments, don't separate paragraphs with a blank line or HTML
  `<p>` tags: `api-documenter` drops blank lines in summary tables, running
  the sentences together with no space. Prefer one summary paragraph, use
  `<br/>` if a break is really needed in the summary, or place additional
  detail paragraphs under `@remarks`.
- In public JSDoc code examples, always import from `'firebase/<package>'`
  (never `'@firebase/<package>'`).
- Construct errors via the package's `ERROR_FACTORY.create(...)` with
  `{$template}` variables in `errors.ts` rather than instantiating raw
  `new FirebaseError` directly.
- Never add heavy framework packages (e.g., `next`) to `dependencies` if
  only TypeScript types (`import type`) are needed; use `devDependencies`.
- Exclude `test/**` in `rollup.config.js` `tsconfigOverride`, and avoid
  sending keys with `undefined` values in JSON request payloads.

## Commit messages and PR titles
- PRs are squash-merged into `main`, and the squash commit's subject is the
  PR title. So the PR title must be a Conventional Commits header:
  `type: description` or `type(package): description`, with a `!` before
  the colon for breaking changes (e.g. `feat(ai)!: ...`). Write the first
  line of the first commit on the branch in the same format: GitHub
  pre-fills the PR title from it when the PR is opened with a single commit
  (with more commits it falls back to the branch name).
- `type` must be one of the types already used in this repo, listed here
  from highest to lowest priority: `feat` (new feature or API export in a
  user-facing package), `fix` (bug fix or any other change to a
  user-facing package that does not affect its API, such as a refactor;
  there is no `refactor` type), `ci` (CI or release workflows), `build`
  (rollup, `package.json` exports, dependency bumps), `chore` (other
  maintenance), `test` (tests only), `docs` (docs only). If several apply,
  use the highest-priority one and consider splitting the PR. Do not
  introduce new types.
- `package` is the short name of the package being changed (e.g.
  `firestore`, `auth`, `ai`, `data-connect`); separate several with commas
  (`app-check,app`); omit it when there is no applicable package.
- `description` should read like a good PR title.
