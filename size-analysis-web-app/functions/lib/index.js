"use strict";
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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const functions = __importStar(require("firebase-functions"));
const child_process_1 = require("child_process");
const path_1 = require("path");
const functions_helper_1 = require("./functions-helper");
const analysis_helper_1 = require("./analysis-helper");
let cors = require('cors')({ origin: true });
const versionFilter = new RegExp(/^\d+.\d*.\d+$/);
exports.retrieveFirebaseVersionFromNPM = functions.https.onRequest((request, response) => {
    console.time('retrieveFirebaseVersion');
    if (request.method !== 'GET') {
        response.status(405).end();
        return;
    }
    cors(request, response, () => {
        try {
            const firebaseName = 'firebase';
            // execute shell npm command to retrieve published versions of firebase
            const versionArrayString = child_process_1.execSync(`npm view ${firebaseName} versions`)
                .toString()
                .replace(/'/g, '"');
            // convert string representation of array to actual array
            let versionsArray = JSON.parse(versionArrayString);
            // keep versions that are of major.minor.patch format
            versionsArray = versionsArray.filter(each => versionFilter.test(each));
            versionsArray = versionsArray.reverse();
            response.set({
                'Content-Type': 'application/json'
            });
            console.timeEnd('retrieveFirebaseVersion');
            response.status(200).send(versionsArray);
        }
        catch (error) {
            response.status(500).send(error);
        }
    });
});
exports.downloadPackageFromNPMGivenVersionAndReturnExportedSymbols = functions.https.onRequest((request, response) => {
    console.time('extractSymbols');
    if (request.method !== 'POST' && request.method !== 'OPTIONS') {
        response.status(405).end();
        return;
    }
    cors(request, response, () => {
        if (!request.get('Content-Type') ||
            request.get('Content-Type').localeCompare('application/json') !== 0) {
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
            functions_helper_1.setUpPackageEnvironment(versionTobeInstalled);
            const allModuleLocations = functions_helper_1.retrieveAllModuleLocation();
            functions_helper_1.generateExportedSymbolsListForModules(allModuleLocations)
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
        }
        catch (error) {
            response.status(500).send(error);
        }
    });
});
exports.generateSizeAnalysisReportGivenCustomBundle = functions.https.onRequest((request, response) => {
    console.time("generateBundle");
    if (request.method !== 'POST' && request.method !== 'OPTIONS') {
        response.status(405).end();
        return;
    }
    cors(request, response, () => {
        if (!request.get('Content-Type') ||
            request.get('Content-Type').localeCompare('application/json') !== 0) {
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
            const versionTobeInstalled = request.body.version;
            const userSelectedSymbolsFileContent = functions_helper_1.buildJsFileGivenUserSelectedSymbols(request.body.symbols);
            functions_helper_1.setUpPackageEnvironment(versionTobeInstalled);
            functions_helper_1.generateBundleFileGivenCustomJsFile(userSelectedSymbolsFileContent)
                .then(customBundleFileContent => {
                const sizeArray = functions_helper_1.calculateBinarySizeGivenBundleFile(customBundleFileContent);
                const customBundleFilePath = path_1.resolve(`${functions_helper_1.packageInstalledDirectory}/${functions_helper_1.userSelectedSymbolsBundleFile}`);
                const report = {
                    dependencies: analysis_helper_1.extractDeclarations(customBundleFilePath, null),
                    size: sizeArray[0],
                    sizeAfterGzip: sizeArray[1]
                };
                console.timeEnd("generateBundle");
                response.status(200).send(report);
            })
                .catch(error => {
                response.status(500).send(error);
            });
        }
        catch (error) {
            response.status(500).send(error);
        }
    });
});
//# sourceMappingURL=index.js.map