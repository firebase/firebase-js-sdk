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
import { writeFile } from 'fs/promises';
import { exec } from 'child-process-promise';
import chalk from 'chalk';
import simpleGit from 'simple-git';
import fs from 'mz/fs';

const root = resolve(__dirname, '../..');
const git = simpleGit(root);

const baseRef = process.env.GITHUB_PULL_REQUEST_BASE_SHA || 'main';
const headRef = process.env.GITHUB_PULL_REQUEST_HEAD_SHA || 'HEAD';

const githubOutputFile = (function (): string {
  const value = process.env.GITHUB_OUTPUT;
  if (!value) {
    throw new Error('GITHUB_OUTPUT environment variable must be set');
  }
  return value;
})();

// Version bump text converted to rankable numbers.
const bumpRank: Record<string, number> = {
  'patch': 0,
  'minor': 1,
  'major': 2
};

/**
 * Get highest bump that isn't the main firebase package, return
 * numerical rank, bump text, package name.
 */
function getHighestBump(changesetPackages: Record<string, string>) {
  const firebasePkgJson = require(resolve(
    root,
    'packages/firebase/package.json'
  ));
  let highestBump = bumpRank.patch;
  let highestBumpText = 'patch';
  let bumpPackage = '';
  for (const pkgName of Object.keys(changesetPackages)) {
    if (
      pkgName !== 'firebase' &&
      pkgName in firebasePkgJson.dependencies &&
      bumpRank[changesetPackages[pkgName]] > highestBump
    ) {
      highestBump = bumpRank[changesetPackages[pkgName]];
      highestBumpText = changesetPackages[pkgName];
      bumpPackage = pkgName;
    }
  }
  return { highestBump, bumpText: highestBumpText, bumpPackage };
}

/**
 * Identify modified packages.
 */
async function getDiffData(): Promise<{
  changedPackages: Set<string>;
  changesetFile: string;
} | null> {
  const diff = await git.diff(['--name-only', `${baseRef}...${headRef}`]);
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
    const pkgMatch = filename.match('^(packages/[a-zA-Z0-9-]+)/.*');
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
  const changesetPackages: Record<string, string> = {};
  packageLines
    .filter(line => line)
    .forEach(line => {
      const [packageName, bumpType] = line.split(':');
      changesetPackages[packageName.replace(/['"]/g, '')] = bumpType.trim();
    });
  return changesetPackages;
}

async function main() {
  const errors = [];
  try {
    await exec(`yarn changeset status`);
    await exec(`echo "BLOCKING_FAILURE=false" >> $GITHUB_OUTPUT`);
  } catch (e) {
    const error = e as Error;
    if (
      error.message.match('No changesets present') ||
      error.message.match('no changesets were found')
    ) {
      await exec(`echo "BLOCKING_FAILURE=false" >> $GITHUB_OUTPUT`);
    } else {
      const messageLines = error.message.replace(/🦋  error /g, '').split('\n');
      let formattedStatusError =
        '- Changeset formatting error in following file:%0A';
      formattedStatusError += '    ```%0A';
      formattedStatusError += messageLines
        .filter(
          (line: string) => !line.match(/^    at [\w\.]+ \(.+:[0-9]+:[0-9]+\)/)
        )
        .filter((line: string) => !line.includes('Command failed'))
        .filter((line: string) => !line.includes('exited with error code 1'))
        .map((line: string) => `    ${line}`)
        .join('%0A');
      formattedStatusError += '%0A    ```%0A';
      errors.push(formattedStatusError);
      /**
       * Sets GitHub Actions output for a step. Pass changeset error message to next
       * step. See:
       * https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#setting-an-output-parameter
       */
      await exec(`echo "BLOCKING_FAILURE=true" >> $GITHUB_OUTPUT`);
    }
  }

  try {
    const diffData = await getDiffData();
    if (diffData != null) {
      const { changedPackages, changesetFile } = diffData;
      const changesetPackages = await parseChangesetFile(changesetFile);

      // Check for packages where files were modified but there's no changeset.
      const missingPackages = [...changedPackages].filter(
        changedPkg => !Object.keys(changesetPackages).includes(changedPkg)
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
        errors.push(missingPackagesLines.join('%0A'));
      }

      // Check for packages with a minor or major bump where 'firebase' hasn't been
      // bumped high enough or at all.
      const { highestBump, bumpText, bumpPackage } =
        getHighestBump(changesetPackages);
      if (highestBump > bumpRank.patch) {
        if (changesetPackages['firebase'] == null) {
          errors.push(
            `- Package ${bumpPackage} has a ${bumpText} bump which requires an ` +
              `additional line to bump the main "firebase" package to ${bumpText}.`
          );
          await exec(`echo "BLOCKING_FAILURE=true" >> $GITHUB_OUTPUT`);
        } else if (bumpRank[changesetPackages['firebase']] < highestBump) {
          errors.push(
            `- Package ${bumpPackage} has a ${bumpText} bump. ` +
              `Increase the bump for the main "firebase" package to ${bumpText}.`
          );
          await exec(`echo "BLOCKING_FAILURE=true" >> $GITHUB_OUTPUT`);
        }
      }
    }
  } catch (e) {
    console.error(chalk`{red ${e}}`);
    process.exit(1);
  }

  /**
   * Sets GitHub Actions output for a step. Pass changeset error message to next
   * step. See:
   * https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#setting-an-output-parameter
   */
  if (errors.length > 0) {
    await writeFile(
      githubOutputFile,
      `CHANGESET_ERROR_MESSAGE=${errors.join('%0A')}\n`,
      { flag: 'a' }
    );
  }
  process.exit();
}

main();
