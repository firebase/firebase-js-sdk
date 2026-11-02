# AGENTS.md

## Testing instructions
- Before testing, create a `config/project.json` file. Copy `config/ci.config.json` if another project config is not specified by the user.
- This is a web SDK and is most commonly used in a browser environment, so if you are running unit tests, you must run browser unit tests, not just Node tests, even if the Node tests seem like they would be faster.

## Preparing code for PRs
- Run `yarn format` after any changes to `*.ts` or `*.js` files, to do a formatting and license pass.
- Run `yarn docgen:all` after any changes that affect the public API or that change the text of comments that are the source of public documentation

## Commit messages and PR titles
- PRs are squash-merged into `main`, and the squash commit's subject is the PR title. So the PR title must be a Conventional Commits header: `type: description` or `type(package): description`, with a `!` before the colon for breaking changes (e.g. `feat(ai)!: ...`). Write the first line of the first commit on the branch in the same format: GitHub pre-fills the PR title from it when the PR is opened with a single commit (with more commits it falls back to the branch name).
- `type` must be one of the types already used in this repo, listed here from highest to lowest priority: `feat` (new feature or API export in a user-facing package), `fix` (bug fix or any other change to a user-facing package that does not affect its API, such as a refactor; there is no `refactor` type), `ci` (CI or release workflows), `build` (rollup, `package.json` exports, dependency bumps), `chore` (other maintenance), `test` (tests only), `docs` (docs only). If several apply, use the highest-priority one and consider splitting the PR. Do not introduce new types.
- `package` is the short name of the package being changed (e.g. `firestore`, `auth`, `ai`, `data-connect`); separate several with commas (`app-check,app`); omit it when there is no applicable package.
- `description` should read like a good PR title.
