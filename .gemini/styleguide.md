# Firebase JS SDK Style Guide for Gemini Code Assist

## 1. Follow `AGENTS.md`

- Look at [`AGENTS.md`](../AGENTS.md) at the root of this repository and
  follow all of its instructions and conventions (testing, preparing code
  for PRs, changesets, public API / JSDoc, build / error handling, and
  commit messages / PR titles).
- Do not suggest changes in code reviews that conflict with `AGENTS.md`.

## 2. Pull Request Review Scope (What NOT to Flag)

- **Do NOT ask authors to fix pre-existing bugs** or formatting issues in
  untouched code or published bundles outside the scope of the pull
  request.
- **Do NOT flag `child_process.exec` for command injection** in internal
  build, release, or test scripts (`scripts/`, `repo-scripts/`, `tools/`)
  when arguments are internal constants or paths with no external user
  input.
