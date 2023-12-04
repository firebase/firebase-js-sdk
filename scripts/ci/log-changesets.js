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

const https = require('https');

async function logChangesets() {
  if (!process.env.GITHUB_EVENT_PATH) {
    console.log(`Couldn't find PR event payload.`);
    return;
  }

  const prPayload = require(process.env.GITHUB_EVENT_PATH);

  if (prPayload.pull_request.title !== 'Version Packages') {
    console.log(`Title of PR is not 'Version Packages'. Not logging.`);
    return;
  }

  // The PR's "Description" field.
  if (!prPayload.pull_request.body) {
    console.log(`Unable to find PR description.`);
    return;
  }
  const matches = prPayload.pull_request.body.match(/## firebase@([\d\.]+)/);
  const version = matches[1];

  if (!version) {
    console.log(`Unable to extract Firebase version from PR description.`);
    return;
  }

  const data = {
    version,
    pr: prPayload.pull_request.number
  };

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    console.log(`Logging PR ${data.pr} with version ${data.version}.`);
    const req = https.request(
      `${process.env.RELEASE_TRACKER_URL}/logChangesetPR`,
      options,
      res => {
        res.on('data', d => {
          process.stdout.write(d);
        });
        res.on('end', resolve);
      }
    );

    req.on('error', error => reject(error));

    req.write(JSON.stringify(data), err => reject(err));
    req.end();
  });
}

logChangesets().catch(e => console.error(e));
