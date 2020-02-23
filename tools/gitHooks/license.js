/**
 * @license
 * Copyright 2017 Google LLC
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

const { promisify } = require('util');
const { resolve } = require('path');
const simpleGit = require('simple-git/promise');
const globRaw = require('glob');
const fs = require('mz/fs');
const ora = require('ora');

const glob = promisify(globRaw);
const root = resolve(__dirname, '../..');
const git = simpleGit(root);
const licenseHeader = `/**
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

`;

async function doLicenseCommit() {
  const licenseSpinner = ora(' Validating License Headers').start();

  const paths = await glob('**/*.+(ts|js)', {
    ignore: ['**/node_modules/**', '**/dist/**']
  });

  const copyrightPattern = /Copyright \d{4} Google (Inc\.|LLC)/;

  // Files with no license block at all.
  const fileContents = await Promise.all(paths.map(path => fs.readFile(path)));
  const filesMissingLicensePaths = fileContents
    .map((buffer, idx) => ({ buffer, path: paths[idx] }))
    .filter(({ buffer }) => String(buffer).match(copyrightPattern) == null);

  await Promise.all(
    filesMissingLicensePaths.map(({ buffer, path }) => {
      const contents = Buffer.concat([new Buffer(licenseHeader), buffer]);
      return fs.writeFile(path, contents, 'utf8');
    })
  );

  // Files with no @license tag.
  const appendedFileContents = await Promise.all(
    paths.map(path => fs.readFile(path))
  );
  const filesMissingTagPaths = appendedFileContents
    .map((buffer, idx) => ({ buffer, path: paths[idx] }))
    .filter(({ buffer }) => String(buffer).match(/@license/) == null);

  await Promise.all(
    filesMissingTagPaths.map(({ buffer, path }) => {
      const lines = String(buffer).split('\n');
      let newLines = [];
      for (const line of lines) {
        if (line.match(copyrightPattern)) {
          const indent = line.split('*')[0]; // Get whitespace to match
          newLines.push(indent + '* @license');
        }
        newLines.push(line);
      }
      return fs.writeFile(path, newLines.join('\n'), 'utf8');
    })
  );

  licenseSpinner.stopAndPersist({
    symbol: '✅'
  });

  const hasDiff = await git.diff();

  if (!hasDiff) return;

  const gitSpinner = ora(' Creating automated license commit').start();
  await git.add('.');

  await git.commit('[AUTOMATED]: License Headers');

  gitSpinner.stopAndPersist({
    symbol: '✅'
  });
}

module.exports = {
  doLicenseCommit
};
