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

import { getCurrentSha } from './utils/git';
import {
  getAllPackages,
  mapPkgNameToPkgJson,
  updateWorkspaceVersions
} from './utils/workspace';
import { readFile as _readFile } from 'fs';
import { buildPackages } from './utils/yarn';
import { publishInCI } from './utils/publish';
import { valid } from 'semver';

/**
 * Run a prerelease
 *
 * NOTE: prereleases (including canary) are performed in CI.
 * Prerelease does NOT do the following compared to a regular release:
 * - Commit/Tag the release (we aren't creating new tags, just exposing the
 *   current version)
 * - Push updates to github (no updates to push)
 *
 * Prereleases don't use changeset cli because we want to publish feature branches that don't have changesets yet.
 * We just publish all packages for simplicity.
 * It's also because changeset cli doesn't work well with wombat which is the mechanism for authenticating npm in CI.
 *
 *
 * Set the prerelease version following the pattern below:
 *
 * Version: <version>-<prereleaseName>.<git sha>
 *
 * A user would be able to install the package as follows:
 *
 * $ npm install firebase@<npmTag>
 */
export async function runPrerelease({
  prereleaseName,
  npmTag,
  dryRun = false
}: PrereleaseOptions) {
  if (!valid(`0.0.0-${prereleaseName}`)) {
    throw Error(
      `Invalid prerelease name: ${prereleaseName}. It must comprise only ASCII alphanumerics and hyphens.`
    );
  }

  if (!/^[0-9A-Za-z-]+$/.test(npmTag)) {
    throw Error(
      `Invalid npm tag name: ${npmTag}. It must comprise only ASCII alphanumerics and hyphens.`
    );
  }

  const sha = await getCurrentSha();
  const updates = await getAllPackages();
  const pkgJsons = await Promise.all(
    updates.map(pkg => mapPkgNameToPkgJson(pkg))
  );
  const versions = pkgJsons.reduce<{ [key: string]: string }>(
    (map, pkgJson) => {
      const { version, name } = pkgJson;
      map[name] = `${version}-${prereleaseName}.${sha}`;
      return map;
    },
    {}
  );

  /**
   * Update the package.json dependencies throughout the SDK
   */
  await updateWorkspaceVersions(versions, true);

  /**
   * build packages
   */
  await buildPackages();

  /**
   * Do not acutally publish if it is a dryrun
   */
  if (!dryRun) {
    await publishInCI(updates, npmTag);
  }
}

interface PrereleaseOptions {
  prereleaseName: string;
  npmTag: string;
  dryRun?: boolean;
}
