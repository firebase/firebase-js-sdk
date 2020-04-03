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

/**
 * generate API reports in changed packages
 */

const {
  getChangedPackages,
  getPackageInfo,
  projectRoot
} = require('../../scripts/utils');
const { execSync } = require('child_process');
const ora = require('ora');
const simpleGit = require('simple-git/promise');

const git = simpleGit(projectRoot);

async function doApiReports() {
  const changedPackages = await getChangedPackages();
  const packageInfo = await getPackageInfo();
  const packageLocations = [];
  for (const packageName of changedPackages) {
    const packageDesc = packageInfo.find(info => info.name === packageName);
    if (packageDesc) {
      const packageJson = require(`${packageDesc.location}/package.json`);

      if (packageJson && packageJson.scripts['api-report']) {
        const apiReportSpinner = ora(
          ` Creating API report for ${packageName}`
        ).start();
        packageLocations.push(packageDesc.location);
        execSync(`yarn api-report`, { cwd: packageDesc.location });
        apiReportSpinner.stopAndPersist({
          symbol: '✅'
        });
      }
    }
  }

  const hasDiff = await git.diff();

  if (!hasDiff) return;

  const gitSpinner = ora(' Creating automated API reports commit').start();
  await git.add('.');

  await git.commit('[AUTOMATED]: API Reports');
  gitSpinner.stopAndPersist({
    symbol: '✅'
  });
}

exports.doApiReports = doApiReports;
