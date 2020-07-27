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

import {
  writeFileSync,
  readFileSync,
  unlinkSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync
} from 'fs';
export async function generateExportedSymbolsMapForModules(moduleLocations) {
  const exportedSymbolsMapCollection = [];
  for (const moduleLocation of moduleLocations) {
    // we traverse the dir in order to include binaries for submodules, e.g. @firebase/firestore/memory
    // Currently we only traverse 1 level deep because we don't have any submodule deeper than that.
    const exportedSymbolsMapForModuleAndItsSubModule = await traverseDirs(
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
  return reportCollection;
}

/**
 * A recursive function that locates and generates reports for sub-modules
 */
export async function traverseDirs(
  moduleLocation,
  executor,
  level,
  levelLimit
) {
  if (level > levelLimit) {
    return null;
  }
  const exportedSymbolsMaps = [];
  const exportedSymbolsMap = await executor(moduleLocation);
  if (exportedSymbolsMap !== null) {
    exportedSymbolsMaps.push(exportedSymbolsMap);
  }
  for (const name of readdirSync(moduleLocation)) {
    const p = `${moduleLocation}/${name}`;
    if (lstatSync(p).isDirectory()) {
      const subModuleExportedSymbolsMaps = await traverseDirs(
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
