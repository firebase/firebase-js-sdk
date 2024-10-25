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

const https = require('https');

const MAX_ATTEMPTS = 10;
const MINUTE = 60 * 1000;
const RETRY_DELAY_MINUTES = 15;

async function pollReleaseNotes() {
  if (!process.env.VERSION) {
    console.log(`Couldn't find version.`);
    return;
  }

  const version = process.env.VERSION;

  const options = {
    method: 'GET'
  };

  const getData = () =>
    new Promise((resolve, reject) => {
      const req = https.request(
        `https://firebase.google.com/support/release-notes/js`,
        options,
        res => {
          let content = '';
          res.on('data', d => (content += d));
          res.on('end', () => resolve(content));
        }
      );

      req.on('error', error => reject(error));
      req.end();
    });
  let siteContent = '';
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    siteContent = await getData();
    const matches = siteContent.match(/<a name="\d+\.\d+.\d+">/g);
    if (matches[0] === `<a name="${version}">`) {
      console.log(`Found ${version} in release notes.`);
      return;
    }
    if (matches.includes(`<a name="${version}">`) && !process.env.FORCE) {
      console.warn(
        `${version} was found but is not the latest version. ` +
          `Set the force option to true to publish anyway.`
      );
      process.exit(1);
    }
    console.log(`Didn't find ${version} on release notes page.`);
    if (i < MAX_ATTEMPTS - 1) {
      console.log(`Trying again in ${RETRY_DELAY_MINUTES} minutes.`);
      await new Promise(resolve =>
        setTimeout(resolve, RETRY_DELAY_MINUTES * MINUTE)
      );
    }
  }
  console.log(`Was not able to find ${version}. Ending process.`);
  process.exit(1);
}

pollReleaseNotes();
