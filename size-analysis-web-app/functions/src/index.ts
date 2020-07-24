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

import * as functions from 'firebase-functions';
import { execSync } from 'child_process';
let cors = require('cors')({ origin: true });
// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript
const versionFilter = new RegExp(/^\d+.\d*.\d+$/);
export const helloWorld = functions.https.onRequest((request, response) => {
  response.send('Hello from Firebase!');
});

export const retrieveFirebaseVersionFromNPM = functions.https.onRequest(
  (request, response) => {
    cors(request, response, () => {
      if (request.method !== 'GET') {
        response.status(405).end();
      }
      try {
        const firebaseName: string = 'firebase';
        // execute shell npm command to retrieve published versions of firebase
        const versionArrayString = execSync(`npm view ${firebaseName} versions`)
          .toString()
          .replace(/'/g, '"');
        // convert string representation of array to actual array
        let versionsArray: string[] = JSON.parse(versionArrayString);
        // keep versions that are of major.minor.patch format
        versionsArray = versionsArray.filter(each => versionFilter.test(each));
        versionsArray = versionsArray.reverse();
        // return latest 10 published version of firebase
        response.set({
          'Content-Type': 'application/json'
        });
        response.status(200).send(versionsArray.slice(0, 10));
      } catch (error) {
        response.status(500).send(error);
      }
    });
  }
);
export const generateSizeAnalysisReportGivenCustomBundle = functions.https.onRequest(
  (request, response) => {
    const customBundle = request.body;
    response.send(`Hello from Firebase! ${customBundle}`);
  }
);
