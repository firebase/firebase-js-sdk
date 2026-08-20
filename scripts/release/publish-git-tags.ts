/**
 * @license
 * Copyright 2026 Google LLC
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

import { exec } from 'child-process-promise';
import { projectRoot } from '../utils';
import { join } from 'path';
import { existsSync, readdirSync, readFileSync } from 'fs';
import * as yargs from 'yargs';

const argv = yargs
  .options({
    dryRun: {
      type: 'boolean',
      default: false,
      desc: 'Log tags to be created and pushed without creating tags or pushing anywhere.'
    }
  })
  .parseSync();

async function createTags(dryRun: boolean): Promise<string[]> {
  try {
    await exec('git rev-parse --verify origin/main', { cwd: projectRoot });
  } catch {
    try {
      console.log('origin/main not found locally. Fetching...');
      await exec('git fetch origin main --depth=1', { cwd: projectRoot });
    } catch (err) {
      throw new Error(
        'Unable to resolve origin/main and failed to fetch it. Error: ' +
        err
      );
    }
  }

  const tags: string[] = [];
  const dirs = readdirSync(join(projectRoot, 'packages'));
  for (const dir of dirs) {
    const fullPkgPath = join(projectRoot, 'packages', dir, 'package.json');
    if (existsSync(fullPkgPath)) {
      const pkgPath = join('packages', dir, 'package.json');
      let mainJson: Record<string, any> = {};
      try {
        const { stdout: mainText } = await exec(
          `git show origin/main:${pkgPath}`,
          { cwd: projectRoot }
        );
        mainJson = JSON.parse(mainText);
      } catch {
        mainJson = {};
      }
      const releaseJson = JSON.parse(readFileSync(fullPkgPath, 'utf8'));
      if (
        !releaseJson.private &&
        releaseJson.version &&
        mainJson.version !== releaseJson.version
      ) {
        const tag = `${releaseJson.name}@${releaseJson.version}`;
        const { stdout: tagExistOutput } = await exec(`git tag -l ${tag}`, {
          cwd: projectRoot
        });
        if (!tagExistOutput.trim()) {
          console.log(`Adding tag: ${tag}`);
          tags.push(tag);
          if (!dryRun) {
            await exec(`git tag ${tag}`, { cwd: projectRoot });
          }
        }
      }
    }
  }
  return tags;
}

async function pushReleaseTagsToGithub() {
  const dryRun = argv.dryRun;
  if (dryRun) {
    console.log('Running in dry-run mode. No tags will be created or pushed.');
  }

  let tags: string[] = [];
  let { stdout: currentBranch } = await exec(
    `git rev-parse --abbrev-ref HEAD`,
    {
      cwd: projectRoot
    }
  );
  currentBranch = currentBranch.trim();

  // Fetch tags from remote to ensure we have the latest tags locally
  try {
    await exec('git fetch origin --tags', { cwd: projectRoot });
  } catch (err) {
    console.warn('Warning: Failed to fetch tags from origin.', err);
  }

  // Get tags pointing to HEAD
  // When running the release script, these tags should be release tags created by changeset
  const { stdout: rawTags } = await exec(`git tag --points-at HEAD`, {
    cwd: projectRoot
  });

  if (rawTags.trim()) {
    tags = rawTags.trim().split(/\r?\n/).filter(Boolean);
  } else {
    // This can happen if the workflow was interrupted but the npm publish was partially
    // or entirely complete, so the git tags will not be regenerated on the second
    // run. In this case, diff against origin/main package.jsons to see which packages had
    // version bumps and require new tags, and create them.
    console.log(
      'No tags found pointing to HEAD. Diffing tags in this branch vs origin/main.'
    );
    tags = await createTags(dryRun);
  }

  if (!tags || tags.length === 0) {
    console.error('No tags found or added. Exiting.');
    process.exit(1);
  }

  if (dryRun) {
    console.log(
      `[DRY RUN] Would push branch '${currentBranch}' and tags to origin:`
    );
    console.log(tags.join('\n'));
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('Unable to find GITHUB_TOKEN env variable.');
    process.exit(1);
  }

  const authHeader = Buffer.from(`x-access-token:${token}`).toString('base64');

  await exec(
    'git -c http.extraHeader="Authorization: Basic ' +
    authHeader +
    '"' +
    ` push origin ${currentBranch} ${tags.join(' ')} --no-verify`,
    {
      cwd: projectRoot
    }
  );
}

pushReleaseTagsToGithub().catch(err => {
  console.error(err);
  process.exit(1);
});
