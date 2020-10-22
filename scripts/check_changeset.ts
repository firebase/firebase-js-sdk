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

import { resolve } from 'path';
import { existsSync } from 'fs';
import { exec } from 'child-process-promise';
import chalk from 'chalk';
import simpleGit from 'simple-git/promise';
import fs from 'mz/fs';

const root = resolve(__dirname, '..');
const git = simpleGit(root);

/**
 * Identify modified packages.
 */
async function getDiffData(): Promise<{
  changedPackages: Set<string>;
  changesetFile: string;
} | null> {
  const diff = await git.diff(['--name-only', 'origin/master...HEAD']);
  const changedFiles = diff.split('\n');
  let changesetFile = '';
  const changedPackages = new Set<string>();
  for (const filename of changedFiles) {
    // Check for an existing .changeset
    const changesetMatch = filename.match(/^\.changeset\/[a-zA-Z-]+\.md/);
    if (changesetMatch) {
      changesetFile = changesetMatch[0];
    }
    // Check for changed files inside package dirs.
    const pkgMatch = filename.match('^(packages(-exp)?/[a-zA-Z0-9-]+)/.*');
    if (pkgMatch && pkgMatch[1]) {
      // skip packages without package.json
      // It could happen when we rename a package or remove a package from the repo
      const pkgJsonPath = resolve(root, pkgMatch[1], 'package.json');

      if (!existsSync(pkgJsonPath)) {
        continue;
      }

      const changedPackage = require(pkgJsonPath);
      if (changedPackage) {
        // Add the package itself.
        changedPackages.add(changedPackage.name);
      }
    }
  }
  if (!changesetFile || changedPackages.size === 0) {
    return null;
  }
  return { changedPackages, changesetFile };
}

async function parseChangesetFile(changesetFile: string) {
  const fileExists = await fs.exists(changesetFile);
  if (!fileExists) {
    process.exit();
  }
  const fileText: string = await fs.readFile(changesetFile, 'utf8');
  const fileParts = fileText.split('---\n');
  const packageLines = fileParts[1].split('\n');
  const changesetPackages = packageLines
    .filter(line => line)
    .map(line => {
      const [packageName] = line.split(':');
      return packageName.replace(/['"]/g, '');
    });
  return changesetPackages;
}

async function main() {
  let formattedStatusError: string = '';
  let missingPackagesError: string = '';
  try {
    await exec('yarn changeset status');
  } catch (e) {
    const messageLines = e.message.replace(/🦋  error /g, '').split('\n');
    formattedStatusError = '- Changeset formatting error in following file:%0A';
    formattedStatusError += '    ```%0A';
    formattedStatusError += messageLines
      .filter(
        (line: string) => !line.match(/^    at [\w\.]+ \(.+:[0-9]+:[0-9]+\)/)
      )
      .filter((line: string) => !line.includes('Command failed'))
      .filter((line: string) => !line.includes('exited with error code 1'))
      .map((line: string) => `    ${line}`)
      .join('%0A');
    formattedStatusError += '    ```%0A';
    /**
     * Sets Github Actions output for a step. Pass changeset error message to next
     * step. See:
     * https://github.com/actions/toolkit/blob/master/docs/commands.md#set-outputs
     */
    console.log(`::set-output name=BLOCKING_FAILURE::true`);
  }
  try {
    const diffData = await getDiffData();
    if (diffData == null) {
      process.exit();
    } else {
      const { changedPackages, changesetFile } = diffData;
      const changesetPackages = await parseChangesetFile(changesetFile);
      const missingPackages = [...changedPackages].filter(
        changedPkg => !changesetPackages.includes(changedPkg)
      );
      if (missingPackages.length > 0) {
        const missingPackagesLines = [
          '- Warning: This PR modifies files in the following packages but they have not been included in the changeset file:'
        ];
        for (const missingPackage of missingPackages) {
          missingPackagesLines.push(`  - ${missingPackage}`);
        }
        missingPackagesLines.push('');
        missingPackagesLines.push('  Make sure this was intentional.');
        missingPackagesError = missingPackagesLines.join('%0A');
      }
    }
  } catch (e) {
    console.error(chalk`{red ${e}}`);
    process.exit(1);
  }

  /**
   * Sets Github Actions output for a step. Pass changeset error message to next
   * step. See:
   * https://github.com/actions/toolkit/blob/master/docs/commands.md#set-outputs
   */
  console.log(
    `::set-output name=CHANGESET_ERROR_MESSAGE::${[
      formattedStatusError,
      missingPackagesError
    ].join('%0A')}`
  );
  process.exit();
}

main();
