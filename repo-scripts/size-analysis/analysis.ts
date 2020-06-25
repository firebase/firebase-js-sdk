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
import { resolve, basename } from 'path';
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

/**
 * Support Command Line Options
 * -- inputModule (optional) : can be left unspecified which results in running analysis on all exp modules
 *            can specify one to many module names seperated by space.
 *            eg: --inputModule "@firebase/functions-exp" "firebase/auth-exp"
 *
 * -- inputDtsFile (optional) : adhoc support. Specify a path to dts file. Must enable -- inputBundleFile if this flag is specified.
 *
 * -- inputBundleFile (optional): adhoc support. Specify a path to bundle file. Must enable -- inputDtsFile if this flag is specified.
 *
 * --output(required): output directory or file where reports will be generated.
 *          specify a directory if multiple modules are analyzed
 *          specify a file path if only one module is analyzed
 *
 */
const argv = yargs
  .options({
    inputModule: {
      type: 'array',
      alias: 'im',
      desc:
        'The name of the module(s) to be analyzed. example: --inputModule "@firebase/functions-exp" "firebase/auth-exp"'
    },
    inputDtsFile: {
      type: 'string',
      alias: 'if',
      desc: 'support for adhoc analysis. requires a path to dts file'
    },
    inputBundleFile: {
      type: 'string',
      alias: 'ib',
      desc: 'support for adhoc analysis. requires a path to a bundle file'
    },
    output: {
      type: 'string',
      alias: 'o',
      demandOption: true,
      desc:
        'The location where report(s) will be generated, a directory path if multiple modules are analyzed; a file path if one module is analyzed'
    }
  })
  .help().argv;

/**
 * This functions takes in a module location, retrieve path to dts file of the module,
 * extract exported symbols, and generate a json report accordingly.
 */
function collectBinarySize(path: string) {
  const packageJsonPath = `${path}/package.json`;
  if (!fs.existsSync(packageJsonPath)) {
    return;
  }

  const packageJson = require(packageJsonPath);
  // to exclude <modules>-types modules
  if (packageJson[TYPINGS]) {
    const dtsFile = `${path}/${packageJson[TYPINGS]}`;
    // extract all exported symbols from dts file
    const publicApi = extractDeclarations(resolve(dtsFile));
    if (!packageJson[BUNDLE]) {
      console.log('This module does not have bundle file!');
      return;
    }
    const map: Map<string, string> = buildMap(publicApi);

    // where report is generated and written to designated location
    buildJsonReport(publicApi, `${path}/${packageJson[BUNDLE]}`, map)
      .then(json => {
        if (!argv.inputModule || argv.inputModule.length > 1) {
          const fileName = `${basename(packageJson.name)}-dependencies.json`;
          const directoryPath = resolve(argv.output);
          writeReportToDirectory(json, fileName, directoryPath);
        } else {
          writeReportToFile(json, resolve(argv.output));
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

/**
 * A recursive function that locates and generates reports for sub-modules
 */
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

/**
 *
 * This functions builds the final json report for the module.
 */
async function buildJsonReport(
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

/**
 *
 * This functions writes generated json report(s) to a file
 */
function writeReportToFile(report: string, outputFile: string): void {
  if (fs.existsSync(outputFile) && !fs.lstatSync(outputFile).isFile()) {
    console.log('an output file is required but a directory given');
    return;
  }
  fs.writeFileSync(outputFile, report);
}
/**
 *
 * This functions writes generated json report(s) to a file of given directory
 */
function writeReportToDirectory(
  report: string,
  fileName: string,
  directoryPath: string
): void {
  if (
    fs.existsSync(directoryPath) &&
    !fs.lstatSync(directoryPath).isDirectory()
  ) {
    console.log('an output directory is required but a file given');
    return;
  }
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath);
  }
  fs.writeFileSync(`${directoryPath}/${fileName}`, report);
}

function generateReportForAdhocRun(dtsFile: string, bundleFile: string): void {
  const resolvedDtsFile = resolve(dtsFile);
  const resolvedBundleFile = resolve(bundleFile);
  if (!fs.existsSync(resolvedDtsFile) || !fs.existsSync(resolvedBundleFile)) {
    console.log('Input dts file or bundle file does not exist!');
    return;
  }
  const publicAPI = extractDeclarations(resolvedDtsFile);
  const map: Map<string, string> = buildMap(publicAPI);
  buildJsonReport(publicAPI, bundleFile, map)
    .then(json => {
      writeReportToFile(json, resolve(argv.output));
    })
    .catch(error => {
      console.log(error);
    });
}

function generateReportForModule(moduleLocations: string[]): void {
  for (const moduleLocation of moduleLocations) {
    // we traverse the dir in order to include binaries for submodules, e.g. @firebase/firestore/memory
    // Currently we only traverse 1 level deep because we don't have any submodule deeper than that.
    traverseDirs(moduleLocation, collectBinarySize, 0, 1);
  }
}

/**
 * Entry Point of the Tool.
 * Checks whether --module flag is specified; run analysis on all modules if not.
 *
 */
async function main() {
  // check if it's an adhoc run
  if (argv.inputDtsFile && argv.inputBundleFile) {
    generateReportForAdhocRun(argv.inputDtsFile, argv.inputBundleFile);
  } else if (!argv.inputDtsFile && !argv.inputBundleFile) {
    // retrieve All Module Names
    let allModulesLocation = await mapWorkspaceToPackages([
      `${projectRoot}/packages-exp/*`
    ]);
    if (argv.inputModule) {
      allModulesLocation = allModulesLocation.filter(path => {
        try {
          const json = require(`${path}/package.json`);
          return argv.inputModule.includes(json.name);
        } catch (err) {
          return null;
        }
      });
    }
    generateReportForModule(allModulesLocation);
  } else {
    console.log('Invalid command flag combinations!');
  }
}

main();
