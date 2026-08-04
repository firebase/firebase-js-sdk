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

import { open, readFile, writeFile } from 'fs/promises';
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

/**
 * Reads only the first N bytes of a file to optimize execution speed.
 */
async function readHead(path: string, bytesToRead = 1000): Promise<string> {
  let handle;
  try {
    handle = await open(path, 'r');
    const { buffer, bytesRead } = await handle.read(
      Buffer.alloc(bytesToRead),
      0,
      bytesToRead,
      0
    );
    return buffer.toString('utf8', 0, bytesRead);
  } finally {
    if (handle) {
      await handle.close();
    }
  }
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

  // Batch processing in chunks of 100 to prevent EMFILE (too many open files) errors.
  const limit = 100;
  for (let i = 0; i < filesToChange.length; i += limit) {
    const chunk = filesToChange.slice(i, i + limit);
    await Promise.all(
      chunk.map(async path => {
        try {
          // Read only the head chunk to fast-path validation on files that already have valid headers.
          const head = await readHead(path);

          const needsLicenseBlock = head.match(copyrightPattern) == null;
          const needsLicenseTag = head.match(/@license/) == null;
          const hasOldCopyright = head.match(oldCopyrightPattern) != null;

          if (needsLicenseBlock || needsLicenseTag || hasOldCopyright) {
            const contents = await readFile(path, 'utf8');
            let result = contents;

            // Files with no license block at all.
            // Double-check the copyright pattern on the full file content to avoid duplicate
            // headers if the copyright notice is located past the first 1000 bytes.
            if (needsLicenseBlock && result.match(copyrightPattern) == null) {
              result = licenseHeader + result;
              console.log(`Adding license to ${path}.`);
            }

            // Files with no @license tag.
            if (needsLicenseTag && result.match(/@license/) == null) {
              result = addLicenseTag(result);
              console.log(`Adding @license tag to ${path}.`);
            }

            // Files with the old form of copyright notice.
            if (hasOldCopyright && result.match(oldCopyrightPattern) != null) {
              result = rewriteCopyrightLine(result);
              console.log(`Updating old copyright notice found in ${path}.`);
            }

            if (contents !== result) {
              count++;
              await writeFile(path, result, 'utf8');
            }
          }
        } catch (err) {
          console.error(chalk`{red Error processing ${path}:}`, err);
        }
      })
    );
  }

  if (count === 0) {
    console.log(chalk`{green No files needed license changes.}`);
  } else {
    console.log(chalk`{green ${count} files had license headers updated.}`);
  }
}
