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
import { resolve, basename, dirname } from 'path';
import {
  extractDependenciesAndSize,
  extractDeclarations,
  MemberList,
  ExportData
} from './analysis-helper';
import { mapWorkspaceToPackages } from '../../scripts/release/utils/workspace';
import { projectRoot } from '../../scripts/utils';
import * as yargs from 'yargs';

export const TYPINGS: string = 'typings';
const BUNDLE: string = 'esm2017';

const argv = yargs
  .options({
    module: {
      type: 'array',
      alias: 'm',
      desc:
        'the name of the module(s) to be ran the tool on. example: --modules "@firebase/functions-exp", "firebase/auth-exp"'
    },
    output: {
      type: 'string',
      alias: 'o',
      demandOption: true,
      desc:
        'The location to write the JSON output to, a directory path if multiple modules are specified; a file path if one module is specified'
    }
  })
  .help().argv;

function collectBinarySize(path: string) {
  const packageJsonPath = `${path}/package.json`;
  if (!fs.existsSync(packageJsonPath)) {
    return;
  }

  const packageJson = require(packageJsonPath);

  // to exclude <modules>-types modules
  if (packageJson[TYPINGS]) {
    const dtsFile = `${path}/${packageJson[TYPINGS]}`;
    // extract all export declarations

    const publicApi = extractDeclarations(resolve(dtsFile));

    if (!packageJson[BUNDLE]) {
      console.log('This module does not have bundle file!');
      return;
    }
    const map: Map<string, string> = buildMap(publicApi);
    //calculate binary size for every export and build a json report
    buildJson(publicApi, `${path}/${packageJson[BUNDLE]}`, map)
      .then(json => {
        const resolvedOutputPath = resolve(`${argv.output}`);
        if (!argv.module || argv.module.length > 1) {
          if (fs.existsSync(resolvedOutputPath)) {
            if (fs.lstatSync(resolvedOutputPath).isDirectory()) {
              fs.writeFileSync(
                `${resolvedOutputPath}/${basename(
                  packageJson.name
                )}-dependencies.json`,
                json
              );
            } else {
              console.log(
                'as multiple modules are analysized, an output directory is required, but a file path given'
              );
              console.log(json);
            }
          } else {
            fs.mkdir(resolvedOutputPath, { recursive: true }, error => {
              if (error) {
                console.log(`errors on creating output directory: ${error}`);
                console.log(json);
              } else {
                fs.writeFileSync(
                  `${resolvedOutputPath}/${basename(
                    packageJson.name
                  )}-dependencies.json`,
                  json
                );
              }
            });
          }
        } else {
          if (fs.existsSync(resolvedOutputPath)) {
            if (fs.lstatSync(resolvedOutputPath).isFile()) {
              fs.writeFileSync(`${resolvedOutputPath}`, json);
            } else {
              console.log(
                'as only one module is analysized, an output file is required, but a directory path given'
              );
              console.log(json);
            }
          } else {
            fs.mkdir(
              dirname(resolvedOutputPath),
              { recursive: true },
              error => {
                if (error) {
                  console.log(`errors on creating output directory: ${error}`);
                  console.log(json);
                } else {
                  fs.writeFileSync(`${resolvedOutputPath}`, json);
                }
              }
            );
          }
        }
      })
      .catch(error => {
        console.log(error);
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
  let allModulesLocation = await mapWorkspaceToPackages([
    `${projectRoot}/packages-exp/*`
  ]);

  if (argv.module) {
    allModulesLocation = allModulesLocation.filter(path => {
      try {
        const json = require(`${path}/package.json`);
        return argv.module.includes(json.name);
      } catch (err) {
        return null;
      }
    });
  }

  for (const moduleLocation of allModulesLocation) {
    // we traverse the dir in order to include binaries for submodules, e.g. @firebase/firestore/memory
    // Currently we only traverse 1 level deep because we don't have any submodule deeper than that.
    traverseDirs(moduleLocation, collectBinarySize, 0, 1);
  }
}
main();
