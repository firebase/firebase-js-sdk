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

const yargs = require('yargs');
const path = require('path');
const { spawn } = require('child-process-promise');

const argv = yargs.options({
  d: {
    type: 'string',
    desc: 'current working directory',
    default: '.'
  },
  s: {
    type: 'string',
    desc: 'the npm script to run',
    demandOption: true
  }
}).argv;

(async () => {
  const myPath = argv.d;
  const scriptName = argv.s;
  const dir = path.resolve(myPath);
  const { name } = require(`${dir}/package.json`);

  let stdout = '';
  let stderr = '';
  try {
    const testProcess = spawn('yarn', ['--cwd', dir, scriptName]);

    testProcess.childProcess.stdout.on('data', data => {
      stdout += data.toString();
    });
    testProcess.childProcess.stderr.on('data', data => {
      stderr += data.toString();
    });

    await testProcess;
    console.log('Success: ' + name);
  } catch (e) {
    console.error('Failure: ' + name);
    console.log(stdout);
    console.error(stderr);
    process.exit(1);
  }
})();
