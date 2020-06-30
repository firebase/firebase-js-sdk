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
 * -- inputModule (optional) : can be left unspecified which results in running analysis on all exp modules.
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



const enum ErrorCode {
  INVALID_FLAG_COMBINATION = "Invalid command flag combinations!",
  BUNDLE_FILE_DOES_NOT_EXIST = "Module doesn't have a bundle file!",
  DTS_FILE_DOES_NOT_EXIST = "Module doesn't have a dts file!",
  OUTPUT_DIRECTORY_REQUIRED = "An output directory is required but a file given",
  OUTPUT_FILE_REQUIRED = "An output file is required but a directory given",
  INPUT_FILE_DOES_NOT_EXIST = "Input file doesn't exist!"

}
/**
 * This functions takes in a module location, retrieve path to dts file of the module,
 * extract exported symbols, and generate a json report accordingly.
 */
async function generateReportForModule(path: string, outputDirectory: string): Promise<void> {

  const packageJsonPath = `${path}/package.json`;
  if (!fs.existsSync(packageJsonPath)) {
    return;
  }
  const packageJson = require(packageJsonPath);
  // to exclude <modules>-types modules
  if (packageJson[TYPINGS]) {
    const dtsFile = `${path}/${packageJson[TYPINGS]}`;
    if (!packageJson[BUNDLE]) {
      throw new Error(ErrorCode.BUNDLE_FILE_DOES_NOT_EXIST);
    }
    const bundleFile = `${path}/${packageJson[BUNDLE]}`;
    const json = await generateReport(dtsFile, bundleFile);
    const fileName = `${basename(packageJson.name)}-dependency.json`;
    writeReportToDirectory(json, fileName, resolve(outputDirectory));


  }
}
/**
 * 
 * This function creates a map from a MemberList object which maps symbol names (key) listed
 * to its type (value)
 */
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
  outputDirectory: string,
  executor,
  level: number,
  levelLimit: number
): void {
  if (level > levelLimit) {
    return;
  }

  executor(moduleLocation, outputDirectory);

  for (const name of fs.readdirSync(moduleLocation)) {
    const p = `${moduleLocation}/${name}`;

    if (fs.lstatSync(p).isDirectory()) {
      traverseDirs(p, outputDirectory, executor, level + 1, levelLimit);
    }
  }
}

/**
 *
 * This functions builds the final json report for the module.
 * @param publicApi all symbols extracted from the input dts file. 
 * @param jsFile a bundle file generated by rollup according to the input dts file. 
 * @param map maps every symbol listed in publicApi to its type. eg: aVariable -> variable. 
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
    throw new Error(ErrorCode.OUTPUT_FILE_REQUIRED);
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
    throw new Error(ErrorCode.OUTPUT_DIRECTORY_REQUIRED);
  }
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
  fs.writeFileSync(`${directoryPath}/${fileName}`, report);
}

async function generateReport(dtsFile: string, bundleFile: string): Promise<string> {
  const resolvedDtsFile = resolve(dtsFile);
  const resolvedBundleFile = resolve(bundleFile);
  if (!fs.existsSync(resolvedDtsFile) || !fs.existsSync(resolvedBundleFile)) {
    throw new Error(ErrorCode.INPUT_FILE_DOES_NOT_EXIST);
  }
  const publicAPI = extractDeclarations(resolvedDtsFile);
  const map: Map<string, string> = buildMap(publicAPI);
  return buildJsonReport(publicAPI, bundleFile, map);

}

function generateReportForModules(moduleLocations: string[], outputDirectory: string): void {
  for (const moduleLocation of moduleLocations) {
    // we traverse the dir in order to include binaries for submodules, e.g. @firebase/firestore/memory
    // Currently we only traverse 1 level deep because we don't have any submodule deeper than that.
    traverseDirs(moduleLocation, outputDirectory, generateReportForModule, 0, 1);
  }
}

/**
 * Entry Point of the Tool.
 * The function first checks if it's an adhoc run (by checking whether --inputDtsFile and --inputBundle are both enabled)
 * The function then checks whether --module flag is specified; Run analysis on all modules if not, run analysis on selected modules if enabled.  
 * Throw INVALID_FLAG_COMBINATION error if neither case fulfill. 
 */
async function main(): Promise<void> {
  // check if it's an adhoc run
  if (argv.inputDtsFile && argv.inputBundleFile) {
    const jsonReport = await generateReport(argv.inputDtsFile, argv.inputBundleFile);
    writeReportToFile(jsonReport, argv.output);
  } else if (!argv.inputDtsFile && !argv.inputBundleFile) {
    // retrieve All Module Names
    let allModulesLocation = await mapWorkspaceToPackages([
      `${projectRoot}/packages-exp/*`
    ]);
    if (argv.inputModule) {
      allModulesLocation = allModulesLocation.filter(path => {

        const json = require(`${path}/package.json`);
        return argv.inputModule.includes(json.name);

      });
    }


    generateReportForModules(allModulesLocation, argv.output);
  } else {
    throw new Error(ErrorCode.INVALID_FLAG_COMBINATION);
  }
}

main();
