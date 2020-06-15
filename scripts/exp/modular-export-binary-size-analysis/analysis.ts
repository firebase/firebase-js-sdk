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

import * as fs from 'fs';
import { resolve } from 'path';
import {
  extractDependenciesAndSize,
  extractDeclarations,
  MemberList,
  ExportData
} from './analysis-helper';
import { mapWorkspaceToPackages } from '../../release/utils/workspace';
import { projectRoot } from '../../utils';

const TYPINGS: string = 'typings';
const BUNDLE: string = 'esm2017';
const OUTPUTDIR: string = './dependencies';
const DUMMYMODULE: string = '@firebase/dummy-exp';

function collectBinarySize(path) {
  const packageJsonPath = `${path}/package.json`;
  if (!fs.existsSync(packageJsonPath)) {
    return;
  }

  const packageJson = require(packageJsonPath);

  // to exclude <modules>-types modules
  if (packageJson[TYPINGS] && packageJson.name == DUMMYMODULE) {
    const dtsFile = `${path}/${packageJson[TYPINGS]}`;
    // extract all export declarations

    const publicApi = extractDeclarations(resolve(dtsFile));
    if (!packageJson[BUNDLE]) {
      console.log('This module does not have bundle file!');
      return;
    }
    console.log(publicApi);
    // calculate binary size for every export and build a json report
    buildJson(publicApi, `${path}/${packageJson[BUNDLE]}`).then(json => {
      //console.log(json);
      //fs.writeFileSync(resolve(`${OUTPUTDIR}/${packageJson.name}/dependencies.json`), json);
    });
  }
}

function traverseDirs(
  moduleLocation: string,
  executor,
  level: number,
  levelLimit: number
) {
  if (level > levelLimit) {
    return;
  }

  executor(moduleLocation);

  for (const name of fs.readdirSync(moduleLocation)) {
    const p = `${moduleLocation}/${name}`;

    if (fs.lstatSync(p).isDirectory()) {
      traverseDirs(p, executor, level + 1, levelLimit);
    }
  }
}

async function buildJson(
  publicApi: MemberList,
  jsFile: string
): Promise<string> {
  const result: { [key: string]: ExportData } = {};
  for (const exp of publicApi.classes) {
    result[exp] = await extractDependenciesAndSize(exp, jsFile);
  }
  for (const exp of publicApi.functions) {
    result[exp] = await extractDependenciesAndSize(exp, jsFile);
  }
  //console.log(publicApi.variables);
  for (const exp of publicApi.variables) {
    result[exp] = await extractDependenciesAndSize(exp, jsFile);
  }
  return JSON.stringify(result, null, 4);
}

async function main() {
  // retrieve All Modules Name
  const allModulesLocaion = await mapWorkspaceToPackages([
    `${projectRoot}/packages-exp/*`
  ]);
  for (const moduleLocation of allModulesLocaion) {
    // we traverse the dir in order to include binaries for submodules, e.g. @firebase/firestore/memory
    // Currently we only traverse 1 level deep because we don't have any submodule deeper than that.
    traverseDirs(moduleLocation, collectBinarySize, 0, 1);
  }
}
main();
