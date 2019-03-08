/**
 * @license
 * Copyright 2019 Google Inc.
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

const glob = require('glob');
const { exec, spawn } = require('child_process');

const { workspaces: rawWorkspaces } = require(`./package.json`);
const workspaces = rawWorkspaces.map(workspace => `./${workspace}`);

function mapWorkspaceToPackages(workspaces) {
  return Promise.all(
    workspaces.map(
      workspace =>
        new Promise(resolve => {
          glob(workspace, (err, paths) => {
            if (err) throw err;
            resolve(paths);
          });
        })
    )
  ).then(paths => paths.reduce((arr, val) => arr.concat(val), []));
}

mapWorkspaceToPackages(workspaces).then(paths => {
  for (const path of paths) {
    const handle = spawn('ncu', ['-u', '--packageFile', 'package.json'], {
      cwd: path
    });

    handle.stdout.on('data', data => {
      console.log(`stdout: ${data}`);
    });

    handle.stderr.on('data', data => {
      console.log(`stderr: ${data}`);
    });

    handle.on('close', code => {
      console.log(`child process exited with code ${code}`);
    });
  }
});
