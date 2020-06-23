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
import { getTsBuildInfoEmitOutputFilePath } from 'typescript';

export const TYPINGS: string = 'typings';
const BUNDLE: string = 'esm2017';
const OUTPUTDIR: string = './dependencies';
const DUMMYMODULE: string = '@firebase/dummy-exp';
const FUNCTIONMODULE: string = '@firebase/functions-exp';
const APPMODULE: string = '@firebase/app-exp';
const AUTHMODULE: string = '@firebase/auth-exp';

function collectBinarySize(path: string) {
  const packageJsonPath = `${path}/package.json`;
  if (!fs.existsSync(packageJsonPath)) {
    return;
  }

  const packageJson = require(packageJsonPath);

  // to exclude <modules>-types modules
  if (packageJson[TYPINGS] && packageJson.name == AUTHMODULE) {
    const dtsFile = `${path}/${packageJson[TYPINGS]}`;
    // extract all export declarations

    const publicApi = extractDeclarations(resolve(dtsFile));

    if (!packageJson[BUNDLE]) {
      console.log('This module does not have bundle file!');
      return;
    }
    const map: Map<string, string> = buildMap(publicApi);
    //calculate binary size for every export and build a json report
    buildJson(publicApi, `${path}/${packageJson[BUNDLE]}`, map).then(json => {
      console.log(json);
      //fs.writeFileSync(resolve(`${OUTPUTDIR}/${packageJson.name}/dependencies.json`), json);
    });
  }
}
function buildMap(api: MemberList): Map<string, string> {
  const map: Map<string, string> = new Map();
  api.functions.forEach(element => {
    map.set(element, 'functions');
  });
  api.classes.forEach(element => {
    map.set(element, 'classes');
  });
  api.enums.forEach(element => {
    map.set(element, 'enums');
  });
  api.variables.forEach(element => {
    map.set(element, 'variables');
  });
  return map;
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
  jsFile: string,
  map: Map<string, string>
): Promise<string> {
  const result: { [key: string]: ExportData } = {};
  for (const exp of publicApi.classes) {
    result[exp] = await extractDependenciesAndSize(exp, jsFile, map);
  }
  for (const exp of publicApi.functions) {
    result[exp] = await extractDependenciesAndSize(exp, jsFile, map);
  }
  //console.log(publicApi.variables);
  for (const exp of publicApi.variables) {
    result[exp] = await extractDependenciesAndSize(exp, jsFile, map);
  }

  for (const exp of publicApi.enums) {
    result[exp] = await extractDependenciesAndSize(exp, jsFile, map);
  }
  return JSON.stringify(result, null, 4);
}

async function main() {
  // retrieve All Modules Name
  const allModulesLocation = await mapWorkspaceToPackages([
    `${projectRoot}/packages-exp/*`
  ]);
  for (const moduleLocation of allModulesLocation) {
    // we traverse the dir in order to include binaries for submodules, e.g. @firebase/firestore/memory
    // Currently we only traverse 1 level deep because we don't have any submodule deeper than that.
    traverseDirs(moduleLocation, collectBinarySize, 0, 1);
  }
}
main();
