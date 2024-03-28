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

import fs from 'mz/fs';
import chalk from 'chalk';
import glob from 'glob';

const licenseHeader = `/**
 * @license
 * Copyright ${new Date().getFullYear()} Google LLC
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

async function readFiles(paths: string[]) {
  const fileContents = await Promise.all(paths.map(path => fs.readFile(path)));
  return fileContents.map((buffer, idx) => ({
    contents: String(buffer),
    path: paths[idx]
  }));
}

function addLicenseTag(contents: string) {
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

function rewriteCopyrightLine(contents: string) {
  const lines = contents.split('\n');
  let newLines = lines.map(line => {
    return line.replace(oldCopyrightPattern, (_, leader) => {
      return leader + ' Google LLC';
    });
  });
  return newLines.join('\n');
}

export async function doLicense(changedFiles?: string[]) {
  let count = 0;

  let filesToChange: string[] = changedFiles ?? [];

  if (!changedFiles) {
    filesToChange = await new Promise(resolve => {
      glob(
        '+(packages|repo-scripts)/**/*.+(ts|js)',
        {
          ignore: [
            '**/node_modules/**',
            './node_modules/**',
            '**/dist/**',
            '**/mocks-lookup.ts'
          ]
        },
        (err, res) => resolve(res)
      );
    });
  }

  console.log(
    chalk`{green Validating license headers in ${filesToChange.length} files.}`
  );
  const files = await readFiles(filesToChange);

  await Promise.all(
    files.map(({ contents, path }) => {
      let result = contents;

      // Files with no license block at all.
      if (result.match(copyrightPattern) == null) {
        result = licenseHeader + result;
        console.log(`Adding license to ${path}.`);
      }

      // Files with no @license tag.
      if (result.match(/@license/) == null) {
        result = addLicenseTag(result);
        console.log(`Adding @license tag to ${path}.`);
      }

      // Files with the old form of copyright notice.
      if (result.match(oldCopyrightPattern) != null) {
        result = rewriteCopyrightLine(result);
        console.log(`Updating old copyright notice found in ${path}.`);
      }

      if (contents !== result) {
        count++;
        return fs.writeFile(path, result, 'utf8');
      } else {
        return Promise.resolve();
      }
    })
  );
  if (count === 0) {
    console.log(chalk`{green No files needed license changes.}`);
  } else {
    console.log(chalk`{green ${count} files had license headers updated.}`);
  }
}
