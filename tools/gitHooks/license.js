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

const { resolve } = require('path');
const simpleGit = require('simple-git/promise');
const fs = require('mz/fs');
const ora = require('ora');
const chalk = require('chalk');

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

const copyrightPattern = /Copyright \d{4} Google (Inc\.|LLC)/;
const oldCopyrightPattern = /(\s*\*\s*Copyright \d{4}) Google Inc\./;

async function readFiles(paths) {
  const fileContents = await Promise.all(paths.map(path => fs.readFile(path)));
  return fileContents.map((buffer, idx) => ({
    contents: String(buffer),
    path: paths[idx]
  }));
}

function addLicenceTag(contents) {
  const lines = contents.split('\n');
  let newLines = [];
  for (const line of lines) {
    if (line.match(copyrightPattern)) {
      const indent = line.split('*')[0]; // Get whitespace to match
      newLines.push(indent + '* @license');
    }
    newLines.push(line);
  }
  return newLines.join('\n');
}

function rewriteCopyrightLine(contents) {
  const lines = contents.split('\n');
  let newLines = lines.map(line => {
    return line.replace(oldCopyrightPattern, (_, leader) => {
      return leader + ' Google LLC';
    });
  });
  return newLines.join('\n');
}

async function doLicense(changedFiles) {
  const licenseSpinner = ora(' Validating License Headers').start();

  const paths = changedFiles.filter(line => line.match(/(js|ts)$/));
  if (paths.length === 0) return;

  const files = await readFiles(paths);

  await Promise.all(
    files.map(({ contents, path }) => {
      let result = contents;

      // Files with no license block at all.
      if (result.match(copyrightPattern) == null) {
        result = licenseHeader + result;
      }

      // Files with no @license tag.
      if (result.match(/@license/) == null) {
        result = addLicenceTag(result);
      }

      // Files with the old form of copyright notice.
      if (result.match(oldCopyrightPattern) != null) {
        result = rewriteCopyrightLine(result);
      }

      if (contents !== result) {
        return fs.writeFile(path, result, 'utf8');
      } else {
        return Promise.resolve();
      }
    })
  );

  licenseSpinner.stopAndPersist({
    symbol: '✅'
  });

  // Diff unstaged (license writes) against staged.
  const stageDiff = await git.diff(['--name-only']);

  if (!stageDiff) {
    console.log(chalk`\n{red License pass caused no changes.}\n`);
    return;
  } else {
    console.log(
      `License script modified ${stageDiff.split('\n').length - 1} files.`
    );
  }

  const gitSpinner = ora(' Git staging license text modifications.').start();
  await git.add('.');

  gitSpinner.stopAndPersist({
    symbol: '▶️'
  });
}

module.exports = {
  doLicense
};
