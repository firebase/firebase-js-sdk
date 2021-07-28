/**
 * @license
 * Copyright 2021 Google LLC
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
import simpleGit from 'simple-git/promise';
import { projectRoot } from '../utils';

const git = simpleGit(projectRoot);

async function updateApiReports() {
  /** API reports are generated as part of the builds */
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

  // Committing and Pushing to the remote branch is done in the GHA workflow, see .github/workflows/update-api-reports.yml
}

updateApiReports();
