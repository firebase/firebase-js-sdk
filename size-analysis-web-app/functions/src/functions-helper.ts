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

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as tmp from 'tmp';
import { resolve as pathResolve, basename } from 'path';
import { rollup } from 'rollup';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import { minify, MinifyOutput } from 'terser';
import { extractDeclarations } from './analysis-helper';
import { sync } from 'gzip-size';
export const pkgName: string = 'firebase';
const userSelectedSymbolFile = 'selected-symbols.js';
export const userSelectedSymbolsBundleFile: string =
  'selected-symbols-bundle.js';
export const packageInstalledDirectory: string = tmp.dirSync().name;
export const pkgRoot: string = `${packageInstalledDirectory}/node_modules/${pkgName}`;

/** Contains a list of symbols by type. */
export interface Symbols {
  classes: string[];
  functions: string[];
  variables: string[];
  enums: string[];
}

export interface Module {
  moduleName: string;
  symbols: Symbols;
}

/**
 * Abstraction of the final report generated given user selected symbols
 */
export interface Report {
  dependencies: Symbols;
  size: number;
  sizeAfterGzip: number;
}
/**
 *
 * This function extracts all symbols exported by the module.
 *
 */
export async function generateExportedSymbolsListForModule(
  moduleLocation: string
): Promise<Module> {
  const packageJsonPath = `${moduleLocation}/package.json`;
  if (!fs.existsSync(packageJsonPath)) {
    return null as any;
  }
  const packageJson = require(packageJsonPath);
  // to exclude <modules>-types modules
  if (packageJson.typings) {
    const dtsFile = `${moduleLocation}/${packageJson.typings}`;
    const exportedSymbolsList: Symbols = extractDeclarations(dtsFile, null);
    const module: Module = {
      moduleName: packageJson.name,
      symbols: exportedSymbolsList
    };
    return module;
  }
  return null as any;
}
/**
 * A recursive function that locates and generates exported symbol lists for the module and its sub-modules
 */
export async function traverseDirs(
  moduleLocation: string,
  executor: Function,
  level: number,
  levelLimit: number
): Promise<Module[]> {
  if (level > levelLimit) {
    return null as any;
  }

  const modules: Module[] = [];
  const module: Module = await executor(moduleLocation);
  if (module !== null) {
    modules.push(module);
  }

  for (const name of fs.readdirSync(moduleLocation)) {
    const p = `${moduleLocation}/${name}`;

    if (fs.lstatSync(p).isDirectory()) {
      const subModules: Module[] = await traverseDirs(
        p,
        executor,
        level + 1,
        levelLimit
      );
      if (subModules !== null && subModules.length !== 0) {
        modules.push(...subModules);
      }
    }
  }
  return modules;
}

/**
 *
 * This function extracts exported symbols from every module of the given list.
 *
 */
export async function generateExportedSymbolsListForModules(
  moduleLocations: string[]
): Promise<Module[]> {
  const modules: Module[] = [];

  for (const moduleLocation of moduleLocations) {
    // we traverse the dir in order to include binaries for submodules, e.g. @firebase/firestore/memory
    // Currently we only traverse 1 level deep because we don't have any submodule deeper than that.
    const moduleAndSubModules: Module[] = await traverseDirs(
      moduleLocation,
      generateExportedSymbolsListForModule,
      0,
      1
    );
    if (moduleAndSubModules !== null && moduleAndSubModules.length !== 0) {
      modules.push(...moduleAndSubModules);
    }
  }
  return modules;
}

/**
 * This functions creates a package.json file programatically and installs the firebase package.
 */
export function setUpPackageEnvironment(
  firebaseVersionToBeInstalled: string
): void {
  try {
    // if (!fs.existsSync(packageInstalledDirectory)) {
    //   fs.mkdirSync(packageInstalledDirectory);
    // }
    console.log(packageInstalledDirectory);
    const packageJsonContent: string = `{\"name\":\"size-analysis-firebase\",\"version\":\"0.1.0\",\"dependencies\":{\"typescript\":\"3.8.3\",\"${pkgName}\":\"${firebaseVersionToBeInstalled}\"}}`;
    fs.writeFileSync(
      `${packageInstalledDirectory}/package.json`,
      packageJsonContent
    );
    execSync(`cd ${packageInstalledDirectory}; npm install; cd ..`);
  } catch (error) {
    throw new Error(error);
  }
}

/**
 * This function generates a bundle file from the given export statements.
 * @param userSelectedSymbolsFileContent JavaScript export statements that consume user selected symbols
 * @returns the generate bundle file content
 */
export async function generateBundleFileGivenCustomJsFile(
  userSelectedSymbolsJsFileContent: string
): Promise<string> {
  try {
    const absolutePathToUserSelectedSymbolsBundleFile = pathResolve(
      `${packageInstalledDirectory}/${userSelectedSymbolsBundleFile}`
    );
    const absolutePathToUserSelectedSymbolsJsFile = pathResolve(
      `${packageInstalledDirectory}/${userSelectedSymbolFile}`
    );
    fs.writeFileSync(
      absolutePathToUserSelectedSymbolsJsFile,
      userSelectedSymbolsJsFileContent
    );

    const bundle = await rollup({
      input: absolutePathToUserSelectedSymbolsJsFile,
      plugins: [
        resolve({
          mainFields: ['esm2017', 'module', 'main']
        }),
        commonjs()
      ]
    });

    const { output } = await bundle.generate({ format: 'es' });
    await bundle.write({
      file: absolutePathToUserSelectedSymbolsBundleFile,
      format: 'es'
    });
    return output[0].code;
  } catch (error) {
    throw new Error(error);
  }
}

/**
 * This function calculates both the binary size of the original bundle file and the size of the gzippzed version.
 * The calculation is done after code minimization of the bundle file.
 * @param bundleFileContent the content/code of the js bundle file
 *
 */
export function calculateBinarySizeGivenBundleFile(
  bundleFileContent: string
): number[] {
  const bundleFileContentMinified: MinifyOutput = minify(bundleFileContent, {
    output: {
      comments: false
    },
    mangle: true,
    compress: false
  });

  return [
    Buffer.byteLength(bundleFileContentMinified.code!, 'utf-8'),
    sync(bundleFileContentMinified.code!)
  ];
}

/**
 * This function programatically creates JS export statements for symbols listed in userSelectedSymbols
 *
 */
export function buildJsFileGivenUserSelectedSymbols(
  userSelectedSymbols: Module[]
): string {
  const statements: string[] = [];
  for (const userSelectedSymbol of userSelectedSymbols) {
    let statement = '';
    const selectedSymbols: Symbols = userSelectedSymbol.symbols;
    for (const selectedSymbolsOfType of Object.values(selectedSymbols)) {
      if (
        Array.isArray(selectedSymbolsOfType) &&
        selectedSymbolsOfType.length > 0
      ) {
        selectedSymbolsOfType.forEach(selectedSymbolOfType => {
          statement += `${selectedSymbolOfType}, `;
        });
      } else {
        continue;
      }
    }
    if (statement.length == 0) {
      continue;
    }
    statement = 'export { ' + statement;
    statement = statement.trimRight();
    statement = statement.substring(0, statement.length - 1);
    statement += `} from \'@firebase/${basename(
      userSelectedSymbol.moduleName
    )}\';`;
    statements.push(statement);
  }

  return statements.join('\n');
}
/**
 * This functions returns a list of module(under firebase scope) locations.
 */
export function retrieveAllModuleLocation(): string[] {
  const moduleLocations: string[] = [];
  try {
    const pkgRootAbsolutedPath: string = pathResolve(`${pkgRoot}`);
    const pkgJson = require(`${pkgRootAbsolutedPath}/package.json`);
    const components = pkgJson.components;
    for (const component of components) {
      moduleLocations.push(`${pkgRootAbsolutedPath}/${component}`);
    }
    return moduleLocations;
  } catch (error) {
    throw new Error(error);
  }
}
