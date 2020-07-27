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

export const enum ErrorCode {
  INVALID_FLAG_COMBINATION = 'Invalid command flag combinations!',
  BUNDLE_FILE_DOES_NOT_EXIST = 'Module does not have a bundle file!',
  DTS_FILE_DOES_NOT_EXIST = 'Module does not have a dts file!',
  OUTPUT_DIRECTORY_REQUIRED = 'An output directory is required but a file given!',
  OUTPUT_FILE_REQUIRED = 'An output file is required but a directory given!',
  INPUT_FILE_DOES_NOT_EXIST = 'Input file does not exist!',
  INPUT_DTS_FILE_DOES_NOT_EXIST = 'Input dts file does not exist!',
  INPUT_BUNDLE_FILE_DOES_NOT_EXIST = 'Input bundle file does not exist!',
  FILE_PARSING_ERROR = 'Failed to parse js file!',
  REPORT_REDIRECTION_ERROR = 'Please enable at least one of --output or --ci flag for report redirection!'
}
export const enum Warning {
  MODULE_NOT_RESOLVED = 'module can not be resolved to actual location'
}

/** Contains a list of members by type. */
interface MemberList {
  classes: string[];
  functions: string[];
  variables: string[];
  enums: string[];
  externals: object;
}

export async function generateExportedSymbolsMapForModule(
  moduleLocation: string
): Promise<MemberList> {
  const packageJsonPath = `${moduleLocation}/package.json`;
  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }
  const packageJson = require(packageJsonPath);
  // to exclude <modules>-types modules
  const TYPINGS: string = 'typings';
  if (packageJson[TYPINGS]) {
    const dtsFile = `${moduleLocation}/${packageJson[TYPINGS]}`;

    const exportedSymbolsMap: MemberList = await generateReport(
      packageJson.name,
      dtsFile,
      bundleFile
    );
    return exportedSymbolsMap;
  }
  return null;
}
/**
 *
 * @param pkgJson package.json of the module.
 *
 * This function implements a fallback of locating module's budle file.
 * It first looks at esm2017 field of package.json, then module field. Main
 * field at the last.
 *
 */
function retrieveBundleFileLocation(pkgJson: string): string {
  if (pkgJson['esm2017']) {
    return pkgJson['esm2017'];
  }
  if (pkgJson['module']) {
    return pkgJson['module'];
  }
  if (pkgJson['main']) {
    return pkgJson['main'];
  }
  return null;
}

/**
 * A recursive function that locates and generates reports for sub-modules
 */
async function traverseDirs(
  moduleLocation: string,
  executor,
  level: number,
  levelLimit: number
): Promise<MemberList[]> {
  if (level > levelLimit) {
    return null;
  }

  const exportedSymbolsMaps: MemberList[] = [];
  const exportedSymbolsMap: MemberList = await executor(moduleLocation);
  if (exportedSymbolsMap !== null) {
    exportedSymbolsMaps.push(exportedSymbolsMap);
  }

  for (const name of fs.readdirSync(moduleLocation)) {
    const p = `${moduleLocation}/${name}`;

    if (fs.lstatSync(p).isDirectory()) {
      const subModuleExportedSymbolsMaps: MemberList[] = await traverseDirs(
        p,
        executor,
        level + 1,
        levelLimit
      );
      if (
        subModuleExportedSymbolsMaps !== null &&
        subModuleExportedSymbolsMaps.length !== 0
      ) {
        exportedSymbolsMaps.push(...subModuleExportedSymbolsMaps);
      }
    }
  }
  return exportedSymbolsMaps;
}

export async function generateExportedSymbolsMapForModules(
  moduleLocations: string[]
): Promise<MemberList[]> {
  const exportedSymbolsMapCollection: MemberList[] = [];

  for (const moduleLocation of moduleLocations) {
    // we traverse the dir in order to include binaries for submodules, e.g. @firebase/firestore/memory
    // Currently we only traverse 1 level deep because we don't have any submodule deeper than that.
    const exportedSymbolsMapForModuleAndItsSubModule: MemberList[] = await traverseDirs(
      moduleLocation,
      generateExportedSymbolsMapForModule,
      0,
      1
    );
    if (
      exportedSymbolsMapForModuleAndItsSubModule !== null &&
      exportedSymbolsMapForModuleAndItsSubModule.length !== 0
    ) {
      exportedSymbolsMapCollection.push(
        ...exportedSymbolsMapForModuleAndItsSubModule
      );
    }
  }
  return exportedSymbolsMapCollection;
}
