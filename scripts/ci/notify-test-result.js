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

/**
 * Sends result of E2E staging test to JSCore chat.
 */
async function notifyTestResults() {
  // JSCore chat webhook URL.
  if (!process.env.WEBHOOK_URL) {
    console.log(`Couldn't find WEBHOOK_URL env variable.`);
    return;
  }

  // URL of this workflow run.
  const workflowUrl = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
  let status = 'did not log a status correctly';
  if (process.argv.includes('fail')) {
    status = 'failed';
  }
  if (process.argv.includes('success')) {
    status = 'succeeded';
  }

  let message = `E2E Tests ${status}`;

  // Add version if it can find it in the workflow_dispatch event data.
  if (process.env.GITHUB_EVENT_PATH) {
    const wrPayload = require(process.env.GITHUB_EVENT_PATH);
    if (wrPayload.inputs && wrPayload.inputs.versionOrTag) {
      message += ` for release ${wrPayload.inputs.versionOrTag}.`;
    } else {
      console.log(`Couldn't find versionOrTag in event payload.`);
    }
  } else {
    console.log(`Couldn't find event payload.`);
  }

  message += ` ${workflowUrl}`;

  const data = JSON.stringify({
    text: message
  });

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    console.log(`Sending message to chat: ${message}`);
    const req = https.request(process.env.WEBHOOK_URL, options, res => {
      res.on('data', d => {
        process.stdout.write(d);
      });
      res.on('end', resolve);
    });

    req.on('error', error => reject(error));

    req.write(data);
    req.end();
  });
}

notifyTestResults();
