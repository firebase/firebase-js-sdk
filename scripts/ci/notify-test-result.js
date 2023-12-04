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

  const versionOrTag = process.env.VERSION_OR_TAG;
  const message = `E2E Tests ${status} for release ${versionOrTag}. ${workflowUrl}`;

  const chatPromise = new Promise((resolve, reject) => {
    console.log(`Sending message to chat: ${message}`);
    const req = https.request(
      process.env.WEBHOOK_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      },
      res => {
        res.on('data', d => {
          process.stdout.write(d);
        });
        res.on('end', resolve);
      }
    );

    req.on('error', error => reject(error));

    req.write(
      JSON.stringify({
        text: message
      }),
      err => reject(err)
    );
    req.end();
  });

  const logPromise = new Promise((resolve, reject) => {
    const testStatus = status === 'succeeded' ? 'pass' : 'fail';
    console.log(`Sending status to log: ${testStatus}`);
    const req = https.request(
      `${process.env.RELEASE_TRACKER_URL}/logE2EResult`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      },
      res => {
        res.on('data', d => {
          process.stdout.write(d);
        });
        res.on('end', resolve);
      }
    );

    req.on('error', error => reject(error));

    const data = {
      testStatus,
      testUrl: workflowUrl
    };

    if (versionOrTag) {
      // Matches a staging version tag pattern.
      const match = versionOrTag.match(/^(\d+.\d+.\d+)-\d+$/);
      if (match) {
        // Remove suffix from staging version
        data.version = match[1];
        // Full staging version with tag
        data.tag = versionOrTag;
      } else {
        data.version = versionOrTag;
      }
    }
    req.write(JSON.stringify(data), err => reject(err));
    req.end();
  });

  return Promise.all([chatPromise, logPromise]).catch(e => {
    console.error(e);
  });
}

notifyTestResults();
