/**
 * @license
 * Copyright 2024 Google LLC
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

import { getPackageInfo, readPackageJson, projectRoot } from './utils';
import semver from 'semver';
import fs from 'mz/fs';
import { exec } from 'child-process-promise';

/**
 * Synchronizes dependencies in packages/crashlytics/package.json with other packages.
 * If a dependency is common to both crashlytics and another package,
 * update the crashlytics version if it's lower.
 */
async function syncCrashlyticsDeps() {
  const allPackages = await getPackageInfo();
  const crashlyticsPkgInfo = allPackages.find(
    (pkg: any) => pkg.name === '@firebase/crashlytics'
  );

  if (!crashlyticsPkgInfo) {
    console.error('Could not find @firebase/crashlytics package');
    return;
  }

  const crashlyticsPkgJson = await readPackageJson(crashlyticsPkgInfo.location);
  const otherPackages = allPackages.filter(
    (pkg: any) => pkg.name !== '@firebase/crashlytics'
  );

  // Pre-load other packages JSONs to avoid repeated disk I/O
  const otherPkgJsons = (
    await Promise.all(
      otherPackages.map(async (pkgInfo: any) => {
        try {
          return await readPackageJson(pkgInfo.location);
        } catch (e) {
          console.error(`Unable to read package.json at ${pkgInfo.location}`);
          return null;
        }
      })
    )
  ).filter(pkg => pkg !== null);

  const depFields = ['dependencies', 'devDependencies'];
  const hasDeps = depFields.some(
    field =>
      crashlyticsPkgJson[field] &&
      Object.keys(crashlyticsPkgJson[field]).length > 0
  );

  if (!hasDeps) {
    console.log(
      'No dependencies or devDependencies found in @firebase/crashlytics. Exiting.'
    );
    return;
  }

  let updated = false;

  for (const field of depFields) {
    const crashDeps = crashlyticsPkgJson[field] || {};

    for (const depName in crashDeps) {
      let highestVersion = crashDeps[depName];

      for (const otherPkgJson of otherPkgJsons) {
        for (const otherField of depFields) {
          const otherDeps = otherPkgJson[otherField] || {};
          if (otherDeps[depName]) {
            const otherVersion = otherDeps[depName];

            try {
              // Get minimum versions for comparison
              const crashPackageVersion = semver.minVersion(highestVersion);
              const otherPackageVersion = semver.minVersion(otherVersion);

              if (
                crashPackageVersion &&
                otherPackageVersion &&
                semver.gt(otherPackageVersion, crashPackageVersion)
              ) {
                highestVersion = otherVersion;
                updated = true;
              }
            } catch (e) {
              console.log(
                `Couldn't compare dependency versions of ${depName}. Manually check for latest version.`
              );
            }
          }
        }
      }

      if (crashlyticsPkgJson[field][depName] !== highestVersion) {
        console.log(
          `Updating ${depName} in crashlytics ${field} from ${crashlyticsPkgJson[field][depName]} to ${highestVersion}`
        );
        crashlyticsPkgJson[field][depName] = highestVersion;
      }
    }
  }

  if (updated) {
    await fs.writeFile(
      `${crashlyticsPkgInfo.location}/package.json`,
      JSON.stringify(crashlyticsPkgJson, null, 2) + '\n',
      'utf8'
    );
    console.log('Successfully updated packages/crashlytics/package.json');
    console.log('Running yarn && yarn build... This may take a few minutes.');
    try {
      await exec('yarn', { cwd: projectRoot });
      await exec('yarn build', { cwd: projectRoot });
      console.log('Yarn and Build completed successfully.');
    } catch (e) {
      console.error('Error running yarn or yarn build:');
      console.error(e);
      process.exit(1);
    }
  } else {
    console.log('No updates needed for packages/crashlytics/package.json');
  }
}

syncCrashlyticsDeps().catch(err => {
  console.error(err);
  process.exit(1);
});
