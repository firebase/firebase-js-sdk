/**
 * Copyright 2018 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const { exec } = require('child-process-promise');
const { createPromptModule } = require('inquirer');
const prompt = createPromptModule();
const { hasUpdatedPackages } = require('./utils/lerna');
const {
  getAllPackages,
  getOrderedUpdates,
  mapPkgNameToPkgJson,
  updateWorkspaceVersions
} = require('./utils/workspace');
const {
  cleanTree,
  commitAndTag,
  getCurrentSha,
  hasDiff,
  pushUpdatesToGithub,
  resetWorkingTree,
  treeAtHead
} = require('./utils/git');
const {
  packageVersionUpdate,
  releaseType: releaseTypePrompt,
  validateReadyToPush,
  validateVersions
} = require('./utils/inquirer');
const { reinstallDeps } = require('./utils/yarn');
const { runTests, setupTestDeps } = require('./utils/tests');
const { publishToNpm } = require('./utils/npm');
const { bannerText } = require('./utils/banner');
const { argv } = require('yargs');

(async () => {
  try {
    /**
     * Welcome to the firebase release CLI!
     */
    await bannerText();

    /**
     * If there are unstaged changes, error
     */
    if (await hasDiff()) {
      throw new Error(
        'You have unstaged changes, stash your changes before attempting to publish'
      );
    }

    /**
     * If there are no packages that have been updated
     * skip the release cycle
     */
    if (!await hasUpdatedPackages()) {
      console.log('No packages need to be updated. Exiting...');
      return;
    }

    /**
     * TODO: Add a check that the current sha exists on Github somewhere
     *
     * This should validate that the local branch isn't local-only
     */

    /**
     * Log the user who will be publishing the packages
     */
    const { stdout: whoami } = await exec('npm whoami');
    console.log(`Publishing as ${whoami}`);

    /**
     * Determine if the current release is a staging or production release
     */
    const releaseType = await (async () => {
      if (argv.canary) return 'Canary';
      /**
       * Capture the release type if it was passed to the CLI via args
       */
      if (
        argv.releaseType &&
        (argv.releaseType === 'Staging' || argv.releaseType === 'Production')
      ) {
        return argv.releaseType;
      }

      /**
       * Prompt for the release type (i.e. staging/prod)
       */
      const responses = await prompt([releaseTypePrompt]);
      return responses.releaseType;
    })();

    let versions;

    /**
     * Set the canary version following the pattern below:
     *
     * Version: <version>-canary.<git sha>
     *
     * A user would be able to install a package canary as follows:
     *
     * $ npm install @firebase/app@0.0.0-canary.0000000
     */
    let updates;
    if (argv.canary) {
      const sha = await getCurrentSha();
      updates = await getAllPackages();
      const pkgJsons = await Promise.all(
        updates.map(pkg => mapPkgNameToPkgJson(pkg))
      );
      versions = updates.reduce((map, pkg, idx) => {
        const { version } = pkgJsons[idx];
        map[pkg] = `${version}-canary.${sha}`;
        return map;
      }, {});
    } else {
      /**
       * Prompt user for the new versions
       */
      updates = await getOrderedUpdates();
      const versionUpdates = await Promise.all(
        updates.map(pkg => packageVersionUpdate(pkg, releaseType))
      );
      versions = await prompt(versionUpdates);

      /**
       * Verify that the versions selected are correct
       */
      const { versionCheck } = await prompt(validateVersions(versions));

      /**
       * If the versions where incorrect, bail.
       */
      if (!versionCheck) throw new Error('Version Check Failed');
    }

    /**
     * Update the package.json dependencies throughout the SDK
     */
    await updateWorkspaceVersions(versions, argv.canary);

    /**
     * Users can pass --skipRebuild to skip the rebuild step
     */
    if (!argv.skipRebuild) {
      /**
       * Clean install dependencies
       */
      console.log('\r\nVerifying Build');
      await cleanTree();
      await reinstallDeps();
    }

    /**
     * Don't do the following for canary releases:
     * - Rerun tests (this is supposed to be a representation of the sha)
     * - Commit/Tag the release (we aren't creating new tags, just exposing the
     *   current version)
     * - Push updates to github (no updates to push)
     */
    if (!argv.canary) {
      /**
       * Ensure all tests are passing
       */

      /**
       * Users can pass --skipTests to skip the testing step
       */
      if (!argv.skipTests) {
        await setupTestDeps();
        await runTests();
      }

      const { readyToPush } = await prompt(validateReadyToPush);
      if (!readyToPush) throw new Error('Push Check Failed');

      /**
       * Only do the following on a production build
       */
      if (releaseType === 'Production') {
        /**
         * Commit the version changes and tag the associated versions
         */
        const tags = await commitAndTag(versions, releaseType);

        /**
         * Push new version to Github
         */
        await pushUpdatesToGithub(tags);
      }
    }

    /**
     * Release new versions to NPM
     */
    await publishToNpm(
      updates,
      releaseType,
      argv.canary ? 'canary' : 'default'
    );

    /**
     * If this wasn't a production release there
     * are now, unstaged chages. Drop them as this
     * was a prerelease/canary release.
     */
    if (releaseType !== 'Production') {
      await resetWorkingTree();
    }
  } catch (err) {
    /**
     * Log any errors that happened during the process
     */
    console.error(err);

    /**
     * Reset the working tree (will remove unneeded changes if they weren't
     * committed already)
     */
    await resetWorkingTree();

    /**
     * Exit with an error code
     */
    process.exit(1);
  }
})();
