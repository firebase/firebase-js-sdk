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
import { projectRoot as root } from '../../utils';
import { ReleaseType } from './enums';
import { mapPkgNameToPkgPath } from './workspace';
import { readFile as _readFile } from 'fs';
import { promisify } from 'util';
import Listr from 'listr';

const readFile = promisify(_readFile);

export async function publish(releaseType: string) {
  let tag: string[] = [];
  if (releaseType === ReleaseType.Staging) {
    tag = ['--tag', 'next'];
  }

  await spawn('yarn', ['changeset', 'publish', ...tag], {
    cwd: root,
    stdio: 'inherit'
  });
}

export async function publishInCI(
  updatedPkgs: string[],
  npmTag: string,
  dryRun: boolean
) {
  const taskArray = [];
  const tags = [];
  for (const pkg of updatedPkgs) {
    const path = await mapPkgNameToPkgPath(pkg);

    /**
     * Can't require here because we have a cached version of the required JSON
     * in memory and it doesn't contain the updates
     */
    const { version, private: isPrivate } = JSON.parse(
      await readFile(`${path}/package.json`, 'utf8')
    );

    /**
     * Skip private packages
     */
    if (isPrivate) {
      console.log(`Skipping private package: ${pkg}.`);
      continue;
    }

    /**
     * Skip if this version has already been published.
     */
    try {
      const { stdout: npmVersion } = await exec(`npm info ${pkg} version`);
      if (version === npmVersion.trim()) {
        console.log(
          `Skipping publish of ${pkg} - version ${version} is already published`
        );
        continue;
      }
    } catch (e) {
      if (version !== '0.0.1') {
        // 404 from NPM indicates the package doesn't exist there.
        console.log(
          `Skipping pkg: ${pkg} - it has never been published to NPM.`
        );
        continue;
      }
    }

    const tag = `${pkg}@${version}`;
    tags.push(tag);
    taskArray.push({
      title: `📦  ${tag}`,
      task: () => publishPackageInCI(pkg, npmTag, dryRun)
    });
  }

  const tasks = new Listr(taskArray, {
    concurrent: false,
    exitOnError: false
  });

  console.log('\r\nPublishing Packages to NPM:');
  await tasks.run();

  // Create git tags.
  for (const tag of tags) {
    await exec(`git tag ${tag}`);
    console.log(`Added git tag ${tag}.`);
  }
}

async function publishPackageInCI(
  pkg: string,
  npmTag: string,
  dryRun: boolean
) {
  let stdoutText = '';
  let stderrText = '';
  try {
    const path = await mapPkgNameToPkgPath(pkg);

    /**
     * publish args
     */
    const args = [
      'publish',
      '--access',
      'public',
      '--tag',
      npmTag,
      '--registry',
      'https://wombat-dressing-room.appspot.com'
    ];

    if (dryRun) {
      args.push('--dry-run');
    }

    if (process.env.VERBOSE_NPM_LOGGING === 'true') {
      args.push('--verbose');
    }

    // Write proxy registry token for this package to .npmrc.
    await exec(
      `echo "//wombat-dressing-room.appspot.com/:_authToken=${
        process.env[getEnvTokenKey(pkg)]
      }" >> ~/.npmrc`
    );
    const spawnPromise = spawn('npm', args, { cwd: path });
    const childProcess = spawnPromise.childProcess;
    // These logs can be very verbose. Only print them if there's
    // an error.
    childProcess.stdout?.on('data', function (data) {
      stdoutText += data.toString();
    });
    childProcess.stderr?.on('data', function (data) {
      stderrText += data.toString();
    });
    await spawnPromise;
    if (process.env.VERBOSE_NPM_LOGGING === 'true') {
      console.log(`stdout for ${pkg} publish:`);
      console.log(stdoutText);
      console.log(`stderr for ${pkg} publish:`);
      console.error(stderrText);
    }
    return spawnPromise;
  } catch (err) {
    console.log(`Error publishing ${pkg}`);
    console.log(`stdout for ${pkg} publish:`);
    console.log(stdoutText);
    console.log(`stderr for ${pkg} publish:`);
    console.error(stderrText);
    throw err;
  }
}

/**
 * Given NPM package name, get env variable name for its publish token.
 * @param {string} packageName NPM package name
 */
function getEnvTokenKey(packageName: string) {
  let result = packageName.replace('@firebase/', '');
  result = result.replace(/-/g, '_');
  result = result.toUpperCase();
  return `NPM_TOKEN_${result}`;
}
