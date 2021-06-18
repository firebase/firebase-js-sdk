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
import { createPromptModule } from 'inquirer';
import { projectRoot, readPackageJson } from '../utils';
import simpleGit from 'simple-git/promise';

import { mapWorkspaceToPackages } from '../release/utils/workspace';
import { inc } from 'semver';
import { writeFile as _writeFile, rmdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { promisify } from 'util';
import chalk from 'chalk';
import Listr from 'listr';
import {
  prepare as prepareFirestoreForRelease,
  createFirestoreCompatProject
} from './prepare-firestore-for-exp-release';
import {
  createStorageCompatProject,
  prepare as prepareStorageForRelease
} from './prepare-storage-for-exp-release';
import {
  createDatabaseCompatProject,
  prepare as prepareDatabaseForRelease
} from './prepare-database-for-exp-release';
import * as yargs from 'yargs';
import { addCompatToFirebasePkgJson } from './prepare-util';

const prompt = createPromptModule();
const argv = yargs
  .options({
    dryRun: {
      type: 'boolean',
      default: false
    }
  })
  .help().argv;

const writeFile = promisify(_writeFile);
const git = simpleGit(projectRoot);
const FIREBASE_UMBRELLA_PACKAGE_NAME = 'firebase-exp';

async function publishExpPackages({ dryRun }: { dryRun: boolean }) {
  try {
    /**
     * Welcome to the firebase release CLI!
     */
    console.log(
      `Welcome to the Firebase Exp Packages release CLI! dryRun: ${dryRun}`
    );

    /**
     * Update fields in package.json and create compat packages (e.g. packages-exp/firestore-compat)
     */
    await prepareFirestoreForRelease();
    await prepareStorageForRelease();
    await prepareDatabaseForRelease();

    // path to exp packages
    let packagePaths = await mapWorkspaceToPackages([
      `${projectRoot}/packages-exp/*`
    ]);

    packagePaths.push(`${projectRoot}/packages/firestore`);
    packagePaths.push(`${projectRoot}/packages/storage`);
    packagePaths.push(`${projectRoot}/packages/database`);

    packagePaths.push(`${projectRoot}/packages/firestore/compat`);
    packagePaths.push(`${projectRoot}/packages/storage/compat`);
    packagePaths.push(`${projectRoot}/packages/database/compat`);

    /**
     * Bumps the patch version of firebase-exp package regardless if there is any update
     * since the last release. This simplifies the script and works fine for exp packages.
     *
     * We do this before the build so the registerVersion will grab the correct
     * versions from package.json for platform logging.
     */
    const versions = await getNewVersions(packagePaths);

    await updatePackageJsons(packagePaths, versions, {
      // Changing the package names here will break the build process.
      // It will be done after the build.
      removeExpInName: false,
      updateVersions: true,
      makePublic: true
    });

    /**
     * build packages except for the umbrella package (firebase) which will be built after firestore/storage/database compat packages are created
     */
    await buildPackages();

    /**
     * Create compat packages for Firestore, Database and Storage
     */
    await createFirestoreCompatProject();
    await createStorageCompatProject();
    await createDatabaseCompatProject();

    /**
     * Add firestore-compat, database-compat and storage-compat to the dependencies array of firebase-exp
     */
    await addCompatToFirebasePkgJson([
      '@firebase/firestore-compat',
      '@firebase/storage-compat',
      '@firebase/database-compat'
    ]);

    /**
     * build firebase
     */
    await buildFirebasePackage();

    /**
     * Removes -exp in package names because we will publish them using
     * the existing package names under a special release tag (firebase@exp).
     */
    await updatePackageJsons(packagePaths, versions, {
      removeExpInName: true,
      updateVersions: false,
      makePublic: false
    });

    let versionCheckMessage =
      '\r\nAre you sure these are the versions you want to publish?\r\n';
    for (const [pkgName, version] of versions) {
      versionCheckMessage += `${pkgName} : ${version}\n`;
    }
    const { versionCheck } = await prompt([
      {
        type: 'confirm',
        name: 'versionCheck',
        message: versionCheckMessage,
        default: false
      }
    ]);

    if (!versionCheck) {
      throw new Error('Version check failed');
    }

    // publish all packages under packages-exp plus firestore, storage and database
    const packagesToPublish = await mapWorkspaceToPackages([
      `${projectRoot}/packages-exp/*`
    ]);

    packagesToPublish.push(`${projectRoot}/packages/firestore`);
    packagesToPublish.push(`${projectRoot}/packages/storage`);
    packagesToPublish.push(`${projectRoot}/packages/database`);

    /**
     * Release packages to NPM
     */
    await publishToNpm(packagesToPublish, dryRun);

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

    const { resetWorkingTree } = await prompt([
      {
        type: 'confirm',
        name: 'resetWorkingTree',
        message: 'Do you want to reset the working tree?',
        default: true
      }
    ]);

    if (resetWorkingTree) {
      await resetWorkingTreeAndBumpVersions(
        firebaseExpPath,
        firebaseExpVersion
      );
    } else {
      process.exit(0);
    }

    /**
     * Do not push to remote if it's a dryrun
     */
    if (!dryRun) {
      const { shouldCommitAndPush } = await prompt([
        {
          type: 'confirm',
          name: 'shouldCommitAndPush',
          message:
            'Do you want to commit and push the exp version update to remote?',
          default: true
        }
      ]);
      /**
       * push to github
       */
      if (shouldCommitAndPush) {
        await commitAndPush(versions);
      }
    }
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

/**
 * The order of build is important
 */
async function buildPackages() {
  const spinner = ora(' Building Packages').start();

  // Build dependencies
  await spawn(
    'yarn',
    [
      'lerna',
      'run',
      '--scope',
      '@firebase/util',
      '--scope',
      '@firebase/component',
      '--scope',
      '@firebase/logger',
      '--scope',
      '@firebase/webchannel-wrapper',
      'build'
    ],
    {
      cwd: projectRoot,
      stdio: 'inherit'
    }
  );

  // Build exp and compat packages except for firebase-exp
  await spawn(
    'yarn',
    [
      'lerna',
      'run',
      '--scope',
      '@firebase/*-exp',
      '--scope',
      '@firebase/*-compat',
      'build:release'
    ],
    {
      cwd: projectRoot,
      stdio: 'inherit'
    }
  );

  // Build exp packages developed in place
  // Firestore and firestore-compat
  await spawn(
    'yarn',
    ['lerna', 'run', '--scope', '@firebase/firestore', 'prebuild'],
    {
      cwd: projectRoot,
      stdio: 'inherit'
    }
  );

  await spawn(
    'yarn',
    ['lerna', 'run', '--scope', '@firebase/firestore', 'build:exp:release'],
    {
      cwd: projectRoot,
      stdio: 'inherit'
    }
  );

  // Storage
  await spawn(
    'yarn',
    ['lerna', 'run', '--scope', '@firebase/storage', 'build:exp:release'],
    {
      cwd: projectRoot,
      stdio: 'inherit'
    }
  );

  // Database
  await spawn(
    'yarn',
    ['lerna', 'run', '--scope', '@firebase/database', 'build:exp:release'],
    {
      cwd: projectRoot,
      stdio: 'inherit'
    }
  );

  // remove packages/installations/dist, otherwise packages that depend on packages-exp/installations-exp (e.g. Perf, FCM)
  // will incorrectly reference packages/installations.
  const installationsDistDirPath = resolve(
    projectRoot,
    'packages/installations/dist'
  );
  if (existsSync(installationsDistDirPath)) {
    rmdirSync(installationsDistDirPath, { recursive: true });
  }

  spinner.stopAndPersist({
    symbol: '✅'
  });
}

async function buildFirebasePackage() {
  const spinner = ora(' Building firebase').start();
  // Build firebase-exp
  await spawn(
    'yarn',
    ['lerna', 'run', '--scope', 'firebase-exp', 'build:release'],
    {
      cwd: projectRoot,
      stdio: 'inherit'
    }
  );
  spinner.stopAndPersist({
    symbol: '✅'
  });
}

async function getNewVersions(packagePaths: string[]) {
  // get package name -> next version mapping
  const versions = new Map();
  for (const path of packagePaths) {
    const { version, name } = await readPackageJson(path);

    // increment firebase-exp as a v9 prerelease, e.g. 9.0.0-beta.0 -> 9.0.0-beta.1
    if (name === FIREBASE_UMBRELLA_PACKAGE_NAME) {
      const nextVersion = inc(version, 'prerelease');
      versions.set(name, nextVersion);
    } else {
      // create individual packages version
      // we can't use minor version for them because most of them
      // are still in the pre-major version officially.
      const nextVersion = `${version}-exp.${await getCurrentSha()}`;
      versions.set(name, nextVersion);
    }
  }
  return versions;
}

async function publishToNpm(packagePaths: string[], dryRun = false) {
  const taskArray = await Promise.all(
    packagePaths.map(async pp => {
      const { version, name } = await readPackageJson(pp);
      return {
        title: `📦  ${name}@${version}`,
        task: () => publishPackage(pp, dryRun)
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

async function publishPackage(packagePath: string, dryRun: boolean) {
  const args = ['publish', '--access', 'public', '--tag', 'beta'];
  if (dryRun) {
    args.push('--dry-run');
  }
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
      const depTypes = ['dependencies', 'peerDependencies'];

      for (const depType of depTypes) {
        const dependencies = packageJson[depType] || {};
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
        packageJson[depType] = newDependenciesObj;
      }
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
  await exec('git add packages-exp/firebase-exp/package.json yarn.lock');

  const firebaseExpVersion = versions.get(FIREBASE_UMBRELLA_PACKAGE_NAME);
  await exec(`git commit -m "Publish firebase ${firebaseExpVersion || ''}"`);

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

async function getCurrentSha() {
  return (await git.revparse(['--short', 'HEAD'])).trim();
}

publishExpPackages(argv);
