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

/**
 * Don't do the following for canary releases:
 * - Rerun tests (this is supposed to be a representation of the sha)
 * - Commit/Tag the release (we aren't creating new tags, just exposing the
 *   current version)
 * - Push updates to github (no updates to push)
 */
export async function runCanaryRelease(): Promise<void> {
  let versions;

  /**
   * Set the canary version following the pattern below:
   *
   * Version: <version>-canary.<git sha>
   *
   * A user would be able to install a package canary as follows:
   *
   * $ npm install @firebase/app@0.0.0-canary.0000000
   */
  let updates;
  const sha = await getCurrentSha();
  updates = await getAllPackages();
  const pkgJsons = await Promise.all(
    updates.map(pkg => mapPkgNameToPkgJson(pkg))
  );
  versions = updates.reduce((map, pkg, idx) => {
    const { version } = pkgJsons[idx];
    map[pkg] = `${version}-canary.${sha}`;
    return map;
  }, {});

  /**
   * Update the package.json dependencies throughout the SDK
   */
  await updateWorkspaceVersions(versions, argv.canary);
}
