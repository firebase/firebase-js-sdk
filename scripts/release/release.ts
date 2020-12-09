/**
 * @license
 * Copyright 2020 Google LLC
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

import { exec } from 'child-process-promise';
import { createPromptModule } from 'inquirer';
import { publish } from './utils/publish';
import { pushReleaseTagsToGithub, cleanTree, hasDiff } from './utils/git';
import {
  releaseType as releaseTypePrompt,
  validateVersions
} from './utils/inquirer';
import { reinstallDeps, buildPackages } from './utils/yarn';
import { runTests, setupTestDeps } from './utils/tests';
import { bumpVersionForStaging } from './staging';
import { ReleaseType } from './utils/enums';
const prompt = createPromptModule();

interface releaseOptions {
  skipReinstall: boolean;
  skipTests: boolean;
  ignoreUnstaged: boolean;
  releaseType?: string;
  dryRun?: boolean;
}

export async function runRelease({
  skipReinstall,
  skipTests,
  ignoreUnstaged,
  releaseType: inputReleaseType,
  dryRun
}: releaseOptions) {
  try {
    /**
     * If there are unstaged changes, error.
     * Use --ignoreUnstaged to skip, such as if release-cli is continuing from a
     * checkpoint.
     */
    if (!ignoreUnstaged && (await hasDiff())) {
      throw new Error(
        'You have unstaged changes, stash your changes before attempting to publish'
      );
    }

    /**
     * Log the user who will be publishing the packages
     */
    if (!process.env.CI) {
      const { stdout: whoami } = await exec('npm whoami');
      console.log(`Publishing as ${whoami}`);
    }

    /**
     * Determine if the current release is a staging or production release
     */
    const releaseType: string = await (async () => {
      /**
       * Capture the release type if it was passed to the CLI via args
       */
      if (
        inputReleaseType &&
        (inputReleaseType === ReleaseType.Staging ||
          inputReleaseType === ReleaseType.Production)
      ) {
        return inputReleaseType;
      }

      /**
       * Prompt for the release type (i.e. staging/prod)
       */
      const responses = await prompt<{ [key: string]: string }>([
        releaseTypePrompt
      ]);
      return responses.releaseType;
    })();

    /**
     * Bump versions for staging release
     * NOTE: For prod, versions are bumped in a PR which should be merged before running this script
     */
    if (releaseType === ReleaseType.Staging) {
      const updatedPackages = await bumpVersionForStaging();

      // We don't need to validate versions for prod releases because prod releases
      // are validated in the version bump PR which should be merged before running this script
      const { versionCheck } = await prompt([
        validateVersions(updatedPackages)
      ]);

      if (!versionCheck) {
        throw new Error('Version check failed');
      }
    }

    /**
     * Users can pass --skipReinstall to skip the installation step
     */
    if (!skipReinstall) {
      /**
       * Clean install dependencies
       */
      console.log('\r\nVerifying Build');
      await cleanTree();
      await reinstallDeps();
    }

    /**
     * build packages
     */
    await buildPackages();

    /**
     * Users can pass --skipTests to skip the testing step
     */
    if (!skipTests) {
      await setupTestDeps();
      await runTests();
    }

    /**
     * Do not actually publish if it is a dryrun
     */
    if (!dryRun) {
      /**
       * Release new versions to NPM using changeset
       * It will also create tags
       */
      await publish(releaseType);

      /**
       * Changeset creats tags for staging releases as well,
       * but we should only push tags to Github for prod releases
       */
      if (releaseType === ReleaseType.Production) {
        /**
         * Push release tags created by changeset in publish() to Github
         */
        await pushReleaseTagsToGithub();
      }
    }
  } catch (err) {
    /**
     * Log any errors that happened during the process
     */
    console.error(err);
    /**
     * Exit with an error code
     */
    process.exit(1);
  }
}
