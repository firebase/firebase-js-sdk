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
const { gt } = require('semver');
const chalk = require('chalk');
const { inc, prerelease } = require('semver');
const { mapPkgNameToPkgJson } = require('./workspace');

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

exports.packageVersionUpdate = async (package, releaseType) => {
  /**
   * Get the current package version
   */
  let { version } = await mapPkgNameToPkgJson(package);

  /**
   * Check and see if we are currently in a prerelease cycle
   */
  if (releaseType === 'Staging') {
    const { stdout: nextVersion } = (await exec(`npm info ${package}@next version`)).trim();
    /**
     * If we are currently in a prerelease cycle, give users the ability to
     * bump the current prerelease version
     */
    if (gt(nextVersion, version)) {
      version = nextVersion;
    }
  }

  /**
   * If the current version is a prerelease allow the developer to
   * bump the prerelease version
   */
  let prereleaseVersions = ['prepatch', 'preminor', 'premajor'];
  if (prerelease(version)) {
    prereleaseVersions = ['prerelease', ...prereleaseVersions];
  }

  /**
   * Determine which set of increments we will be using
   */
  const increments =
    releaseType === 'Staging'
      ? prereleaseVersions
      : ['patch', 'minor', 'major'];

  /**
   * Create prompts
   */
  return {
    type: 'list',
    name: `${package}`,
    message: `Select semver increment for ${package}`,
    choices: increments.map(increment => {
      const newVersion = inc(version, increment);
      return {
        name: chalk`${capitalize(increment)} {gray ${newVersion}}`,
        value: newVersion
      };
    })
  };
};

exports.releaseType = {
  type: 'list',
  name: 'releaseType',
  message: 'Is this a staging, or a production release?',
  choices: ['Staging', 'Production'],
  default: 'Staging'
};

exports.validateVersions = versionMap => {
  let message =
    '\r\nAre you sure these are the versions you want to publish?\r\n';
  Object.keys(versionMap)
    .map(name => ({ name, version: versionMap[name] }))
    .forEach(({ name, version }) => {
      message += `${name}@${version}\n`;
    });

  return {
    type: 'confirm',
    name: 'versionCheck',
    message,
    default: false
  };
};

exports.validateReadyToPush = {
  type: 'confirm',
  name: 'readyToPush',
  message: '\r\nAre you sure you are ready to push to Github/NPM?\r\n',
  default: false
};
