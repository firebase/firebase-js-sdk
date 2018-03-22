/**
 * Copyright 2017 Google Inc.
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

const { argv } = require('yargs');
const { exec } = require('child-process-promise');
const { homedir } = require('os');
const firebaseTools = require('firebase-tools');
const inquirer = require('inquirer');
const fs = require('mz/fs');
const path = require('path');

// Command Line Arguments
const userToken = argv.token;
const projectId = argv.projectId;

let cachedToken;

try {
  const config = require(path.resolve(
    homedir(),
    '.config/configstore/firebase-tools.json'
  ));
  cachedToken = config.tokens.refresh_token;
} catch (err) {}

Promise.resolve(userToken || cachedToken)
  // Log in to firebase-tools
  .then(async userToken => {
    if (userToken) return userToken;
    const {
      tokens: { refresh_token: freshToken }
    } = await firebaseTools.login.ci();
    return freshToken;
  })
  // Capture the firebase test project
  .then(async token => {
    const project = await (async () => {
      if (projectId) return projectId;

      const projects = await firebaseTools.list({ token });
      const response = await inquirer.prompt([
        {
          type: 'list',
          name: 'projectId',
          message: 'Which project would you like to use to test?',
          choices: projects.map(project => ({
            name: `${project.name} (${project.id})`,
            value: project
          }))
        }
      ]);

      const { projectId: { id } } = response;

      return id;
    })();

    // Write config to top-level config directory
    await firebaseTools.setup
      .web({ project, token })
      .then(config =>
        fs.writeFile(
          path.resolve(__dirname, '../config/project.json'),
          JSON.stringify(config, null, 2)
        )
      );

    // npm install the dependencies for functions
    await exec('npm install', {
      cwd: path.resolve(__dirname, '../config/functions')
    });

    // Deploy database rules
    await firebaseTools.deploy({
      project,
      token,
      cwd: path.resolve(__dirname, '../config')
    });
  })
  .then(() => {
    console.log('Success! Exiting...');
    process.exit();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
