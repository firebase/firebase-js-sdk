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
  updateWorkspaceVersions
} = require('./utils/workspace');
const {
  commitAndTag,
  pushUpdatesToGithub,
  cleanTree,
  resetWorkingTree,
  getCurrentSha
} = require('./utils/git');
const {
  releaseType,
  packageVersionUpdate,
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
     * If there are no packages that have been updated
     * skip the release cycle
     */
    if (!await hasUpdatedPackages()) {
      console.log('No packages need to be updated. Exiting...');
      return;
    }

    const whoami = await exec('npm whoami');
    console.log(`Publishing as ${whoami.stdout}`);

    /**
     * Determine if the current release is a staging or production release
     */
    const releaseType = await (async () => {
      if (argv.canary) return 'Canary';
      /**
       * Capture the release type if it was passed to the CLI via args
       */
      if (argv.releaseType && 
          (
            argv.releaseType === 'Staging' ||
            argv.releaseType === 'Production'
          )
        ) {
        return argv.releaseType;
      }

      /**
       * Prompt for the release type (i.e. staging/prod)
       */
      const responses = await prompt([releaseType]);
      return responses.releaseType === 'Staging';
    })(); 

    let versions;

    if (argv.canary) {
      const sha = await getCurrentSha();
      const pkgs = await getAllPackages();
      versions = pkgs.reduce((map, pkg) => {
        map[pkg] = `canary-${sha}`;
        return map;
      }, {});
    } else {
      /**
       * Prompt user for the new versions
       */
      const updates = await getOrderedUpdates();
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

    console.log(versions);
    return;

    /**
     * Update the package.json dependencies throughout the SDK
     */
    await updateWorkspaceVersions(versions, argv.canary);

    /**
     * Clean install dependencies
     */
    console.log('\r\nVerifying Build');
    await cleanTree();
    await reinstallDeps();

    /**
     * Don't do the following for canary releases:
     * - Rerun tests (this is supposed to be a representation of the sha)
     * - Commit/Tag the release (again, we aren't creating new tags)
     * - Push updates to github
     */
    if (!argv.canary) {
      /**
       * Ensure all tests are passing
       */
      await setupTestDeps();
      await runTests();

      /**
       * Commit and tag the version updates
       */
      await commitAndTag(versions, releaseType);

      const { readyToPush } = await prompt(validateReadyToPush);
      if (!readyToPush) throw new Error('Push Check Failed');

      /**
       * Push new version to Github
       */
      await pushUpdatesToGithub();
    }

    /**
     * Release new versions to NPM
     */
    await publishToNpm(updates, releaseType);
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
