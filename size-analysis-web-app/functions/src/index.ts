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
import { resolve } from 'path';
import {
  packageInstalledDirectory,
  userSelectedSymbolsBundleFile,
  Report,
  retrieveAllModuleLocation,
  buildJsFileGivenUserSelectedSymbols,
  calculateBinarySizeGivenBundleFile,
  setUpPackageEnvironment,
  generateExportedSymbolsListForModules,
  generateBundleFileGivenCustomJsFile
} from './functions-helper';

import { extractDeclarations } from './analysis-helper';
let cors = require('cors')({ origin: true });
const versionFilter = new RegExp(/^\d+.\d*.\d+$/);

export const helloWorld = functions.https.onRequest((request, response) => {
  response.send('Hello from Firebase!');
});
export const retrieveFirebaseVersionFromNPM = functions.https.onRequest(
  (request, response) => {
    console.log(request.method);
    console.time('retrieveFirebaseVersion');
    if (request.method !== 'GET') {
      response.status(405).end();
      return;
    }
    cors(request, response, () => {
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
        response.set({
          'Content-Type': 'application/json'
        });
        console.timeEnd('retrieveFirebaseVersion');
        response.status(200).send(versionsArray);
      } catch (error) {
        response.status(500).send(error);
      }
    });
  }
);

export const downloadPackageFromNPMGivenVersionAndReturnExportedSymbols = functions.https.onRequest(
  (request, response) => {
    console.time('extractSymbols');
    if (request.method !== 'POST' && request.method !== 'OPTIONS') {
      response.status(405).end();
      return;
    }

    cors(request, response, () => {
      if (
        !request.get('Content-Type') ||
        request.get('Content-Type')!.localeCompare('application/json') !== 0
      ) {
        // 415 Unsupported Media Type
        response
          .status(415)
          .send('request body requires application/json type');
        return;
      }
      if (!request.body.version) {
        // 422 Unprocessable Entity
        response.status(422).send('request body missing field: version');
        return;
      }
      const versionTobeInstalled = request.body.version;
      try {
        setUpPackageEnvironment(versionTobeInstalled);
        const allModuleLocations: string[] = retrieveAllModuleLocation();
        generateExportedSymbolsListForModules(allModuleLocations)
          .then(exportedSymbolsListForModules => {
            response.set({
              'Content-Type': 'application/json'
            });
            console.timeEnd('extractSymbols');
            response.status(200).send(exportedSymbolsListForModules);
          })
          .catch(error => {
            response.status(500).send(error);
          });
      } catch (error) {
        response.status(500).send(error);
      }
    });
  }
);

export const generateSizeAnalysisReportGivenCustomBundle = functions.https.onRequest(
  (request, response) => {
    console.time('generateBundle');
    if (request.method !== 'POST' && request.method !== 'OPTIONS') {
      response.status(405).end();
      return;
    }
    cors(request, response, () => {
      if (
        !request.get('Content-Type') ||
        request.get('Content-Type')!.localeCompare('application/json') !== 0
      ) {
        // 415 Unsupported Media Type
        response
          .status(415)
          .send('request body requires application/json type');
        return;
      }
      if (!request.body.version) {
        response.status(422).send('request body missing field: version');
        return;
      }
      if (!request.body.symbols) {
        response.status(422).send('request body missing field: symbols');
        return;
      }
      try {
        const versionTobeInstalled: string = request.body.version;

        const userSelectedSymbolsFileContent = buildJsFileGivenUserSelectedSymbols(
          request.body.symbols
        );
        setUpPackageEnvironment(versionTobeInstalled);

        generateBundleFileGivenCustomJsFile(userSelectedSymbolsFileContent)
          .then(customBundleFileContent => {
            const sizeArray: number[] = calculateBinarySizeGivenBundleFile(
              customBundleFileContent
            );
            const customBundleFilePath = resolve(
              `${packageInstalledDirectory}/${userSelectedSymbolsBundleFile}`
            );
            const report: Report = {
              dependencies: extractDeclarations(customBundleFilePath, null),
              size: sizeArray[0],
              sizeAfterGzip: sizeArray[1]
            };
            console.timeEnd('generateBundle');
            response.set({
              'Content-Type': 'application/json'
            });
            response.status(200).send(report);
          })
          .catch(error => {
            response.status(500).send(error);
          });
      } catch (error) {
        response.status(500).send(error);
      }
    });
  }
);
