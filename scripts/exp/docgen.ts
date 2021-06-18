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

import { spawn } from 'child-process-promise';
import { mapWorkspaceToPackages } from '../release/utils/workspace';
import { projectRoot } from '../utils';
import { removeExpSuffix } from './remove-exp';
import fs from 'fs';
import glob from 'glob';
import * as yargs from 'yargs';

yargs
  .command('$0', 'generate standard reference docs', {}, _argv =>
    generateDocs(/* forDevsite */ false)
  )
  .command('devsite', 'generate reference docs for devsite', {}, _argv =>
    generateDocs(/* forDevsite */ true)
  )
  .demandCommand()
  .help().argv;

const tmpDir = `${projectRoot}/temp`;
// create *.api.json files
async function generateDocs(forDevsite: boolean = false) {
  const outputFolder = forDevsite ? 'docs-devsite' : 'docs-exp';
  const command = forDevsite ? 'api-documenter-devsite' : 'api-documenter';

  // TODO: change yarn command once exp packages become official
  await spawn('yarn', ['lerna', 'run', '--scope', '@firebase/*-exp', 'build'], {
    stdio: 'inherit'
  });

  // build storage-exp
  await spawn(
    'yarn',
    ['lerna', 'run', '--scope', '@firebase/storage', 'build:exp'],
    {
      stdio: 'inherit'
    }
  );

  // build database-exp
  await spawn(
    'yarn',
    ['lerna', 'run', '--scope', '@firebase/database', 'build:exp'],
    {
      stdio: 'inherit'
    }
  );

  // generate public typings for firestore
  await spawn(
    'yarn',
    ['lerna', 'run', '--scope', '@firebase/firestore', 'prebuild'],
    {
      stdio: 'inherit'
    }
  );

  await spawn('yarn', ['api-report'], {
    stdio: 'inherit'
  });

  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir);
  }

  // TODO: Throw error if path doesn't exist once all packages add markdown support.
  const apiJsonDirectories = (
    await mapWorkspaceToPackages([
      `${projectRoot}/packages/*`,
      `${projectRoot}/packages-exp/*`
    ])
  )
    .map(path => `${path}/temp`)
    .filter(path => fs.existsSync(path));

  for (const dir of apiJsonDirectories) {
    const paths = await new Promise<string[]>(resolve =>
      glob(`${dir}/*.api.json`, (err, paths) => {
        if (err) throw err;
        resolve(paths);
      })
    );

    if (paths.length === 0) {
      throw Error(`*.api.json file is missing in ${dir}`);
    }

    // there will be only 1 api.json file
    const fileName = paths[0].split('/').pop();
    fs.copyFileSync(paths[0], `${tmpDir}/${fileName}`);
  }

  // Generate docs without the -exp suffix
  removeExpSuffix(tmpDir);
  await spawn(
    'yarn',
    [command, 'markdown', '--input', 'temp', '--output', outputFolder],
    { stdio: 'inherit' }
  );
}
