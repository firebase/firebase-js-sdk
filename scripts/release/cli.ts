#!/usr/bin/env ts-node-script
/**
 * @license
 * Copyright 2018 Google LLC
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

import { runCanaryRelease } from './canary';
import { ReleaseType } from './utils/enums';
import { publish } from './utils/publish';
import { pushReleaseTagsToGithub, cleanTree, hasDiff } from './utils/git';

import { exec } from 'child-process-promise';
import { createPromptModule } from 'inquirer';
const prompt = createPromptModule();

import { releaseType as releaseTypePrompt } from './utils/inquirer';
import { reinstallDeps, buildPackages } from './utils/yarn';
import { runTests, setupTestDeps } from './utils/tests';
import { argv } from 'yargs';

const { bannerText } = require('./utils/banner');

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
     * Log the user who will be publishing the packages
     */
    if (!process.env.CI) {
      const { stdout: whoami } = await exec('npm whoami');
      console.log(`Publishing as ${whoami}`);
    }

    /**
     * Determine if the current release is a staging or production release
     */
    const releaseType = await (async () => {
      if (argv.canary) return ReleaseType.Canary;
      /**
       * Capture the release type if it was passed to the CLI via args
       */
      if (
        argv.releaseType &&
        (argv.releaseType === ReleaseType.Staging ||
          argv.releaseType === ReleaseType.Production)
      ) {
        return argv.releaseType;
      }

      /**
       * Prompt for the release type (i.e. staging/prod)
       */
      const responses = await prompt([releaseTypePrompt]);
      return responses.releaseType;
    })();

    if (releaseType === ReleaseType.Canary) {
      // await runCanaryRelease();
    } else if (releaseType === ReleaseType.Staging) {
      // TODO: check if changeset is in the pre mode. Throw, if not.
    }

    /**
     * Users can pass --skipReinstall to skip the installation step
     */
    if (!argv.skipReinstall) {
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
     * Ensure all tests are passing
     */

    /**
     * Users can pass --skipTests to skip the testing step
     */
    if (!argv.skipTests) {
      await setupTestDeps();
      await runTests();
    }

    /**
     * Release new versions to NPM using changeset
     * It will also create tags
     */
    //  await publish();

    /**
     * Push release tags created by changeset in publish() to Github
     */
    //  await pushReleaseTagsToGithub();
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
})();
