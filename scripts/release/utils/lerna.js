/**
 * @license
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
const npmRunPath = require('npm-run-path');
const { projectRoot: root } = require('./constants');

function getLernaUpdateJson() {
  let cache;

  return (async () => {
    try {
      if (cache) return cache;

      let { stdout: lastTag } = await exec('git describe --tags --abbrev=0');
      lastTag = lastTag.trim();

      const result = await exec(`lerna ls --since ${lastTag} --json`, {
        env: npmRunPath.env(),
        cwd: root
      });

      cache = JSON.parse(result.stdout).filter(pkg => !pkg.private);

      return cache;
    } catch (err) {
      return [];
    }
  })();
}

exports.hasUpdatedPackages = async () => {
  const updatedPkgs = await getLernaUpdateJson();
  return !!updatedPkgs.length;
};

exports.getUpdatedPackages = async () => {
  const pkgs = await getLernaUpdateJson();
  return pkgs.map(result => result.name);
};
