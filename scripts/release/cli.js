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

const { createPromptModule } = require('inquirer');
const prompt = createPromptModule();
const { hasUpdatedPackages } = require('./utils/lerna');
const {
  getOrderedUpdates,
  updateWorkspaceVersions
} = require('./utils/workspace');
const {
  commitAndTag,
  pushUpdatesToGithub,
  cleanTree,
  resetWorkingTree
} = require('./utils/git');
const {
  releaseType,
  packageVersionUpdate,
  validateVersions
} = require('./utils/inquirer');
const { reinstallDeps } = require('./utils/yarn');
const { runTests, setupTestDeps } = require('./utils/tests');
const { publishToNpm } = require('./utils/npm');

(async () => {
  try {
    /**
     * If there are no packages that have been updated
     * skip the release cycle
     */
    if (!await hasUpdatedPackages()) return;

    /**
     * Prompt for the release type (i.e. staging/prod)
     */
    const responses = await prompt([releaseType]);
    const isPrerelease = responses.releaseType === 'Staging';

    /**
     * Prompt user for the new versions
     */
    const updates = await getOrderedUpdates();
    const versionUpdates = await Promise.all(
      updates.map(pkg => packageVersionUpdate(pkg, isPrerelease))
    );
    const versions = await prompt(versionUpdates);

    /**
     * Verify that the versions selected are correct
     */
    const versionCheck = await prompt(validateVersions(versions));

    /**
     * If the versions where incorrect, bail.
     */
    if (!versionCheck) throw new Error('Version Check Failed');

    /**
     * Update the package.json dependencies throughout the SDK
     */
    await updateWorkspaceVersions(versions);

    /**
     * Clean install dependencies
     */
    console.log('\r\nVerifying Build');
    await cleanTree();
    await reinstallDeps();

    /**
     * Ensure all tests are passing
     */
    await setupTestDeps();
    await runTests();

    /**
     * Commit and tag the version updates
     */
    await commitAndTag(versions, isPrerelease);

    /**
     * Push new version to Github
     */
    await pushUpdatesToGithub();

    /**
     * Release new versions to NPM
     */
    await publishToNpm(updates, isPrerelease);
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
