# E2E Tests

This directory is for Firebase E2E tests that are completely independent of the main SDK workspaces. Packages in here should

* Have a start trigger independent of the main CI PR/push triggers (e.g., manual trigger, repository_dispatch, from an external runner like Kokoro, etc.)
  
  A common use case might be to clone this repo, cd into the chosen directory under e2e, npm install, and run npm scripts.

* Have a self-contained set of NPM dependencies. They should not depend on the local version of Firebase in the SDK nor assume inherited availability of any packages in the top level package.json of this repo (typescript, firebase, karma, etc.).

See the `template/` directory for an example.