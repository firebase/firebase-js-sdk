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
  updateWorkspaceVersions,
  mapPkgNameToPkgJson
} = require('./utils/workspace');
const {
  commitAndTag,
  pushUpdatesToGithub,
  cleanTree,
  resetWorkingTree,
  getCurrentSha
} = require('./utils/git');
const {
  releaseType: releaseTypePrompt,
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
     * Set the canary version following, the pattern below:
     * 
     * Version: <version>-canary.<git sha>
     * 
     * A user would be able to install a package canary as follows:
     * 
     * $ npm install @firebase/app@0.0.0-canary.0000000
     */
    if (argv.canary) {
      const sha = await getCurrentSha();
      const pkgs = await getAllPackages();
      const pkgJsons = await Promise.all(
        pkgs.map(pkg => mapPkgNameToPkgJson(pkg))
      );
      versions = pkgs.reduce((map, pkg, idx) => {
        const { version } = pkgJsons[idx];
        map[pkg] = `${version}-canary.${sha}`;
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

    /**
     * Update the package.json dependencies throughout the SDK
     */
    await updateWorkspaceVersions(versions, argv.canary);

    return;
    /**
     * Clean install dependencies
     */
    console.log('\r\nVerifying Build');
    await cleanTree();
    await reinstallDeps();

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
      await setupTestDeps();
      await runTests();

      /**
       * Only commit/tag the version update on a production push
       */
      if (releaseType === 'Production') {
        await commitAndTag(versions, releaseType);
      }

      const { readyToPush } = await prompt(validateReadyToPush);
      if (!readyToPush) throw new Error('Push Check Failed');

      /**
       * Push new version to Github
       */
      if (releaseType === 'Production') {      
        await pushUpdatesToGithub();
      }
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
