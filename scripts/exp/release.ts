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

import { spawn, exec } from 'child-process-promise';
import ora from 'ora';
import { projectRoot } from '../utils';
import simpleGit from 'simple-git/promise';

import { mapWorkspaceToPackages } from '../release/utils/workspace';
import { inc } from 'semver';
import { readFile as _readFile, writeFile as _writeFile } from 'fs';
import { promisify } from 'util';
import chalk from 'chalk';
import Listr from 'listr';

const readFile = promisify(_readFile);
const writeFile = promisify(_writeFile);
const git = simpleGit(projectRoot);
const FIREBASE_UMBRELLA_PACKAGE_NAME = 'firebase-exp';

async function publishExpPackages() {
  try {
    /**
     * Welcome to the firebase release CLI!
     */
    console.log('Welcome to the Firebase Exp Packages release CLI!');

    /**
     * build packages
     */
    await buildPackages();

    // path to exp packages
    const packagePaths = await mapWorkspaceToPackages([
      `${projectRoot}/packages-exp/*`
    ]);

    /**
     * It does 2 things:
     *
     * 1. Bumps the patch version of firebase-exp package regardless if there is any update
     * since the last release. This simplifies the script and works fine for exp packages.
     *
     * 2. Removes -exp in package names because we will publish them using
     * the existing package names under a special release tag (e.g. firebase@exp).
     */
    const versions = await updatePackageNamesAndVersions(packagePaths);

    /**
     * Release packages to NPM
     */
    await publishToNpm(packagePaths);

    /**
     * reset the working tree to recover package names with -exp in the package.json files,
     * then bump patch version of firebase-exp (the umbrella package) only
     */
    const firebaseExpVersion = new Map<string, string>();
    firebaseExpVersion.set(
      FIREBASE_UMBRELLA_PACKAGE_NAME,
      versions.get(FIREBASE_UMBRELLA_PACKAGE_NAME)
    );
    const firebaseExpPath = packagePaths.filter(p =>
      p.includes(FIREBASE_UMBRELLA_PACKAGE_NAME)
    );
    await resetWorkingTreeAndBumpVersions(firebaseExpPath, firebaseExpVersion);

    /**
     * push to github
     */
    await commitAndPush(versions);
  } catch (err) {
    /**
     * Log any errors that happened during the process
     */
    console.error(err);

    /**
     * Exit with an error code
     */
    process.exit(1);
  }
}

async function buildPackages() {
  const spinner = ora(' Building Packages').start();
  await spawn('yarn', ['build:exp:release'], {
    cwd: projectRoot
  });
  spinner.stopAndPersist({
    symbol: '✅'
  });
}

async function updatePackageNamesAndVersions(packagePaths: string[]) {
  // get package name -> next version mapping
  const versions = new Map();
  for (const path of packagePaths) {
    const { version, name } = await readPackageJson(path);

    // increment firebase-exp's patch version
    if (name === FIREBASE_UMBRELLA_PACKAGE_NAME) {
      const nextVersion = inc(version, 'patch');
      versions.set(name, nextVersion);
    } else {
      // create individual packages version
      // we can't use minor version for them because most of them
      // are still in the pre-major version officially.
      const nextVersion = `${version}-exp.${await getCurrentSha()}`;
      versions.set(name, nextVersion);
    }
  }

  await updatePackageJsons(packagePaths, versions, {
    removeExpInName: true,
    updateVersions: true,
    makePublic: true
  });

  return versions;
}

async function publishToNpm(packagePaths: string[]) {
  const taskArray = await Promise.all(
    packagePaths.map(async pp => {
      const { version, name } = await readPackageJson(pp);
      return {
        title: `📦  ${name}@${version}`,
        task: () => publishPackage(pp)
      };
    })
  );

  const tasks = new Listr(taskArray, {
    concurrent: false,
    exitOnError: false
  });

  console.log('\r\nPublishing Packages to NPM:');
  return tasks.run();
}

async function publishPackage(packagePath: string) {
  const args = ['publish', '--access', 'public', '--tag', 'exp'];
  await spawn('npm', args, { cwd: packagePath });
}

async function resetWorkingTreeAndBumpVersions(
  packagePaths: string[],
  versions: Map<string, string>
) {
  console.log('Resetting working tree');
  await git.checkout('.');

  await updatePackageJsons(packagePaths, versions, {
    removeExpInName: false,
    updateVersions: true,
    makePublic: false
  });
}

async function updatePackageJsons(
  packagePaths: string[],
  versions: Map<string, string>,
  {
    removeExpInName,
    updateVersions,
    makePublic
  }: {
    removeExpInName: boolean;
    updateVersions: boolean;
    makePublic: boolean;
  }
) {
  for (const path of packagePaths) {
    const packageJsonPath = `${path}/package.json`;
    const packageJson = await readPackageJson(path);

    // update version
    if (updateVersions) {
      const nextVersion = versions.get(packageJson.name);
      console.log(
        chalk`Updating {blue ${packageJson.name}} from {green ${packageJson.version}} to {green ${nextVersion}}`
      );
      packageJson.version = nextVersion;
    }

    // remove -exp in the package name
    if (removeExpInName) {
      const cleanName = removeExpInPackageName(packageJson.name);
      console.log(
        chalk`Renaming {blue ${packageJson.name}} to {blue ${cleanName}}`
      );
      packageJson.name = cleanName;

      // update dep version and remove -exp in dep names
      // don't care about devDependencies because they are irrelavant when using the package
      const dependencies = packageJson.dependencies || {};
      const newDependenciesObj: { [key: string]: string } = {};
      for (const d of Object.keys(dependencies)) {
        const dNextVersion = versions.get(d);
        const nameWithoutExp = removeExpInPackageName(d);
        if (!dNextVersion) {
          newDependenciesObj[nameWithoutExp] = dependencies[d];
        } else {
          newDependenciesObj[nameWithoutExp] = dNextVersion;
        }
      }
      packageJson.dependencies = newDependenciesObj;
    }

    // set private to false
    if (makePublic) {
      packageJson.private = false;
    }

    // update package.json files
    await writeFile(
      packageJsonPath,
      `${JSON.stringify(packageJson, null, 2)}\n`,
      { encoding: 'utf-8' }
    );
  }
}

async function commitAndPush(versions: Map<string, string>) {
  await exec('git add */package.json yarn.lock');

  const firebaseExpVersion = versions.get(FIREBASE_UMBRELLA_PACKAGE_NAME);
  await exec(
    `git commit -m "Publish firebase@exp ${firebaseExpVersion || ''}"`
  );

  let { stdout: currentBranch, stderr } = await exec(
    `git rev-parse --abbrev-ref HEAD`
  );
  currentBranch = currentBranch.trim();

  await exec(`git push origin ${currentBranch} --no-verify -u`, {
    cwd: projectRoot
  });
}

function removeExpInPackageName(name: string) {
  const regex = /^(.*firebase.*)-exp(.*)$/g;

  const captures = regex.exec(name);
  if (!captures) {
    return name;
  }

  return `${captures[1]}${captures[2]}`;
}

async function readPackageJson(packagePath: string) {
  /**
   * Can't require here because require caches the file
   * in memory, so it may not contain the updates that are made by e.g. git commands
   */
  return JSON.parse(await readFile(`${packagePath}/package.json`, 'utf8'));
}

async function getCurrentSha() {
  return (await git.revparse(['--short', 'HEAD'])).trim();
}

publishExpPackages();
