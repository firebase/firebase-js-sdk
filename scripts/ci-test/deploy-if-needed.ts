/**
 * @license
 * Copyright 2022 Google LLC
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

import { resolve } from 'path';
import chalk from 'chalk';
import simpleGit from 'simple-git';
import { exec } from 'child-process-promise';
const firebaseTools = require('firebase-tools');

const root = resolve(__dirname, '../..');
const config = require(resolve(root, 'config/ci.config.json'));
const git = simpleGit(root);

interface DeployOptions {
  project: string;
  token: string;
  cwd: string;
  only?: string;
}

/**
 * Changes to these files require redeployment to the project backend.
 */
const projectConfigGroups = [
  { file: 'config/firebase.json', flag: 'all' },
  { file: 'config/firestore.rules', flag: 'firestore' },
  { file: 'config/firestore.indexes.json', flag: 'firestore' },
  { file: 'config/database.rules.json', flag: 'database' },
  { file: 'config/functions/index.js', flag: 'functions' }
];

/**
 * Deploy Firebase project config files (functions, rules) to CI
 * test project if there have been any changes to them.
 */
async function deployIfNeeded() {
  const token = process.env.FIREBASE_CLI_TOKEN;
  if (!token) {
    throw new Error('No FIREBASE_CLI_TOKEN found, exiting.');
  }
  const diff = await git.diff(['--name-only', 'origin/ch-branchswitch-main...HEAD']);
  const changedFiles = diff.split('\n');
  let flags: string[] = [];
  for (const group of projectConfigGroups) {
    if (changedFiles.includes(group.file)) {
      if (group.flag === 'all') {
        flags = ['all'];
        break;
      }
      flags.push(group.flag);
    }
  }
  const deployOptions: DeployOptions = {
    project: config.projectId,
    token,
    cwd: resolve(root, 'config')
  };
  if (flags.length === 0) {
    console.log(
      chalk`{green No changes detected in project config files. Not deploying. }`
    );
    return;
  }
  if (flags[0] !== 'all') {
    deployOptions.only = flags.join(',');
    console.log(chalk`{blue Deploying to ${flags.toString()} }`);
  } else {
    console.log(
      chalk`{blue firebase.json changed - deploying full config directory. }`
    );
  }
  if (flags[0] === 'all' || flags.includes('functions')) {
    // npm install the dependencies for functions
    await exec('npm install', {
      cwd: resolve(root, 'config/functions')
    });
  }
  await firebaseTools.deploy(deployOptions);
}

deployIfNeeded();
