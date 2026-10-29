# AGENTS.md

## Testing instructions
- Before testing, create a `config/project.json` file. Copy `config/ci.config.json` if another project config is not specified by the user.
- This is a web SDK and is most commonly used in a browser environment, so if you are running unit tests, you must run browser unit tests, not just Node tests, even if the Node tests seem like they would be faster.

## Preparing code for PRs
- Run `yarn format` after any changes to `*.ts` or `*.js` files, to do a formatting and license pass.
- Run `yarn docgen:all` after any changes that affect the public API or that change the text of comments that are the source of public documentation.
  - In doc comments, don't separate paragraphs with a blank line: api-documenter drops the break, running the sentences together with no space. Prefer one paragraph, or use `<br/>` if a break is really needed.
- Add a changeset in `.changeset/` for any user-facing change.
  - For `patch` changes, list only the affected `@firebase/*` package(s). Do not add a `'firebase'` entry; the changesets tool automatically bumps the umbrella package by a patch for any depedency bump.
