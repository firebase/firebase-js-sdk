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

const { spawn } = require('child-process-promise');
const { mapWorkspaceToPackages } = require('../release/utils/workspace');
const { projectRoot } = require('../utils');
const { removeExpSuffix } = require('./remove-exp');
const fs = require('fs');
const glob = require('glob');

const tmpDir = `${projectRoot}/temp`;
// create *.api.json files
async function generateDocs() {
  // TODO: change yarn command once exp packages become official
  await spawn('yarn', ['build:exp'], {
    stdio: 'inherit'
  });

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
    const paths = await new Promise(resolve =>
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
    'npx',
    ['api-documenter', 'markdown', '--input', 'temp', '--output', 'docs-exp'],
    { stdio: 'inherit' }
  );
}

generateDocs();
