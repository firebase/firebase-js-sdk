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

import * as tmp from 'tmp';
import * as path from 'path';
import * as fs from 'fs';
import * as rollup from 'rollup';
import * as terser from 'terser';
import * as ts from 'typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { projectRoot } from '../../scripts/utils';

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
  PKG_JSON_DOES_NOT_EXIST = 'Module does not have a package.json file!',
  TYPINGS_FIELD_NOT_DEFINED = 'Module does not have typings field defined in its package.json!'
}

/** Contains a list of members by type. */
export interface MemberList {
  classes: string[];
  functions: string[];
  variables: string[];
  enums: string[];
  unknown: string[];
}
/** Contains the dependencies and the size of their code for a single export. */
export interface ExportData {
  name: string;
  classes: string[];
  functions: string[];
  variables: string[];
  enums: string[];
  unknown: string[];
  externals: { [key: string]: string[] };
  size: number;
  sizeWithExtDeps: number;
}

export interface Report {
  name: string;
  symbols: ExportData[];
}
/**
 * Helper for extractDependencies that extracts the dependencies and the size
 * of the minified build.
 */
export async function extractDependenciesAndSize(
  exportName: string,
  jsBundle: string
): Promise<ExportData> {
  const input = tmp.fileSync().name + '.js';
  const externalDepsResolvedOutput = tmp.fileSync().name + '.js';
  const externalDepsNotResolvedOutput = tmp.fileSync().name + '.js';

  const exportStatement = `export { ${exportName} } from '${path.resolve(
    jsBundle
  )}';`;
  fs.writeFileSync(input, exportStatement);

  // Run Rollup on the JavaScript above to produce a tree-shaken build
  const externalDepsResolvedBundle = await rollup.rollup({
    input,
    plugins: [
      resolve({
        mainFields: ['esm2017', 'module', 'main']
      }),
      commonjs()
    ]
  });
  await externalDepsResolvedBundle.write({
    file: externalDepsResolvedOutput,
    format: 'es'
  });
  const externalDepsNotResolvedBundle = await rollup.rollup({
    input,
    // exclude all firebase dependencies and tslib
    external: id => id.startsWith('@firebase') || id === 'tslib'
  });
  await externalDepsNotResolvedBundle.write({
    file: externalDepsNotResolvedOutput,
    format: 'es'
  });
  const dependencies: MemberList = extractAllTopLevelSymbols(
    externalDepsNotResolvedOutput
  );

  const externalDepsResolvedOutputContent = fs.readFileSync(
    externalDepsResolvedOutput,
    'utf-8'
  );
  // Extract size of minified build
  const externalDepsNotResolvedOutputContent = fs.readFileSync(
    externalDepsNotResolvedOutput,
    'utf-8'
  );
  const externalDepsResolvedOutputContentMinimized = await terser.minify(
    externalDepsResolvedOutputContent,
    {
      format: {
        comments: false
      },
      mangle: { toplevel: true },
      compress: false
    }
  );
  const externalDepsNotResolvedOutputContentMinimized = await terser.minify(
    externalDepsNotResolvedOutputContent,
    {
      format: {
        comments: false
      },
      mangle: { toplevel: true },
      compress: false
    }
  );
  const exportData: ExportData = {
    name: '',
    classes: [],
    functions: [],
    variables: [],
    enums: [],
    unknown: [],
    externals: {},
    size: 0,
    sizeWithExtDeps: 0
  };
  exportData.name = exportName;
  for (const key of Object.keys(dependencies) as Array<keyof MemberList>) {
    exportData[key] = dependencies[key];
  }

  exportData.externals = extractExternalDependencies(
    externalDepsNotResolvedOutput
  );
  exportData.size = Buffer.byteLength(
    externalDepsNotResolvedOutputContentMinimized.code!,
    'utf-8'
  );
  exportData.sizeWithExtDeps = Buffer.byteLength(
    externalDepsResolvedOutputContentMinimized.code!,
    'utf-8'
  );
  fs.unlinkSync(input);
  fs.unlinkSync(externalDepsNotResolvedOutput);
  fs.unlinkSync(externalDepsResolvedOutput);
  return exportData;
}

/**
 * Check what symbols are being pulled into a bundle
 */
export function extractAllTopLevelSymbols(filePath: string): MemberList {
  const program = ts.createProgram([filePath], { allowJs: true });
  const sourceFile = program.getSourceFile(filePath);
  if (!sourceFile) {
    throw new Error(`${ErrorCode.FILE_PARSING_ERROR} ${filePath}`);
  }

  const declarations: MemberList = {
    functions: [],
    classes: [],
    variables: [],
    enums: [],
    unknown: []
  };

  ts.forEachChild(sourceFile, node => {
    if (ts.isFunctionDeclaration(node)) {
      declarations.functions.push(node.name!.text);
    } else if (ts.isClassDeclaration(node)) {
      declarations.classes.push(node.name!.text);
    } else if (ts.isVariableDeclaration(node)) {
      declarations.variables.push(node.name!.getText());
    } else if (ts.isEnumDeclaration(node)) {
      // `const enum`s should not be analyzed. They do not add to bundle size and
      // creating a file that imports them causes an error during the rollup step.
      if (
        // Identifies if this enum had a "const" modifier attached.
        !node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ConstKeyword)
      ) {
        declarations.enums.push(node.name.escapedText.toString());
      }
    } else if (ts.isVariableStatement(node)) {
      const variableDeclarations = node.declarationList.declarations;

      variableDeclarations.forEach(variableDeclaration => {
        //variableDeclaration.name could be of Identifier type or of BindingPattern type
        // Identifier Example: export const a: string = "aString";
        if (ts.isIdentifier(variableDeclaration.name)) {
          declarations.variables.push(
            variableDeclaration.name.getText(sourceFile)
          );
        }
        // Binding Pattern Example: export const {a, b} = {a: 1, b: 1};
        else {
          const elements = variableDeclaration.name
            .elements as ts.NodeArray<ts.BindingElement>;
          elements.forEach((node: ts.BindingElement) => {
            declarations.variables.push(node.name.getText(sourceFile));
          });
        }
      });
    }
  });

  //Sort to ensure stable output
  Object.values(declarations).forEach(each => {
    each.sort();
  });
  return declarations;
}

/**
 * Extract exports of a module
 */
export function extractExports(filePath: string): MemberList {
  const exportDeclarations: MemberList = {
    functions: [],
    classes: [],
    variables: [],
    enums: [],
    unknown: []
  };

  const program = ts.createProgram([filePath], {
    allowJs: true,
    baseUrl: path.resolve(`${projectRoot}/node_modules`)
  });
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(filePath)!;
  const module = checker.getSymbolAtLocation(sourceFile);
  // no export from the file
  if (!module) {
    return exportDeclarations;
  }

  const exports = checker.getExportsOfModule(module);

  for (const expt of exports) {
    // get the source declaration where we can determine the type of the export. e.g. class vs function
    let sourceSymbol = expt;
    if (sourceSymbol.declarations?.[0].kind === ts.SyntaxKind.ExportSpecifier) {
      sourceSymbol = checker.getAliasedSymbol(expt);
    }

    if (!sourceSymbol.declarations || sourceSymbol.declarations.length === 0) {
      console.log('Could not find the source symbol for ', expt.name);
      continue;
    }
    const sourceDeclaration = sourceSymbol.declarations[0];

    if (ts.isFunctionDeclaration(sourceDeclaration)) {
      exportDeclarations.functions.push(expt.name);
    } else if (ts.isClassDeclaration(sourceDeclaration)) {
      exportDeclarations.classes.push(expt.name);
    } else if (ts.isVariableDeclaration(sourceDeclaration)) {
      exportDeclarations.variables.push(expt.name);
    } else if (ts.isEnumDeclaration(sourceDeclaration)) {
      // `const enum`s should not be analyzed. They do not add to bundle size and
      // creating a file that imports them causes an error during the rollup step.
      if (
        // Identifies if this enum had a "const" modifier attached.
        !sourceDeclaration.modifiers?.some(
          mod => mod.kind === ts.SyntaxKind.ConstKeyword
        )
      ) {
        exportDeclarations.enums.push(expt.name);
      }
    } else {
      console.log(`export of unknown type: ${expt.name}`);
      exportDeclarations.unknown.push(expt.name);
    }
  }

  Object.values(exportDeclarations).forEach(each => {
    each.sort();
  });

  return exportDeclarations;
}

/**
 * To Make sure symbols of every category are unique.
 */
export function dedup(memberList: MemberList): MemberList {
  for (const key of Object.keys(memberList) as Array<keyof MemberList>) {
    const set: Set<string> = new Set(memberList[key]);
    memberList[key] = Array.from(set);
  }
  return memberList;
}

export function mapSymbolToType(
  map: Map<string, string>,
  memberList: MemberList
): MemberList {
  const newMemberList: MemberList = {
    functions: [],
    classes: [],
    variables: [],
    enums: [],
    unknown: []
  };

  for (const key of Object.keys(memberList) as Array<keyof MemberList>) {
    memberList[key].forEach((element: string) => {
      if (map.has(element)) {
        newMemberList[map.get(element)! as keyof MemberList].push(element);
      } else {
        newMemberList[key].push(element);
      }
    });
  }
  return newMemberList;
}

export function replaceAll(
  memberList: MemberList,
  original: string,
  current: string
): void {
  for (const key of Object.keys(memberList) as Array<keyof MemberList>) {
    memberList[key] = replaceWith(memberList[key], original, current);
  }
}

function replaceWith(
  arr: string[],
  original: string,
  current: string
): string[] {
  const rv: string[] = [];
  for (const each of arr) {
    if (each.localeCompare(original) === 0) {
      rv.push(current);
    } else {
      rv.push(each);
    }
  }
  return rv;
}

/**
 *
 * This functions writes generated json report(s) to a file
 */
export function writeReportToFile(report: Report, outputFile: string): void {
  if (fs.existsSync(outputFile) && !fs.lstatSync(outputFile).isFile()) {
    throw new Error(ErrorCode.OUTPUT_FILE_REQUIRED);
  }
  const directoryPath = path.dirname(outputFile);
  //for output file path like ./dir/dir1/dir2/file, we need to make sure parent dirs exist.
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
  fs.writeFileSync(outputFile, JSON.stringify(report, null, 4));
}
/**
 *
 * This functions writes generated json report(s) to a file of given directory
 */
export function writeReportToDirectory(
  report: Report,
  fileName: string,
  directoryPath: string
): void {
  if (
    fs.existsSync(directoryPath) &&
    !fs.lstatSync(directoryPath).isDirectory()
  ) {
    throw new Error(ErrorCode.OUTPUT_DIRECTORY_REQUIRED);
  }
  writeReportToFile(report, `${directoryPath}/${fileName}`);
}

/**
 * This function extract unresolved external module symbols from bundle file import statements.
 *
 */
export function extractExternalDependencies(minimizedBundleFile: string): {
  [key: string]: string[];
} {
  const program = ts.createProgram([minimizedBundleFile], { allowJs: true });

  const sourceFile = program.getSourceFile(minimizedBundleFile);
  if (!sourceFile) {
    throw new Error(`${ErrorCode.FILE_PARSING_ERROR} ${minimizedBundleFile}`);
  }

  const externalsMap: Map<string, string[]> = new Map();
  ts.forEachChild(sourceFile, node => {
    if (ts.isImportDeclaration(node) && node.importClause) {
      const moduleName: string = node.moduleSpecifier.getText(sourceFile);
      if (!externalsMap.has(moduleName)) {
        externalsMap.set(moduleName, []);
      }

      //import {a, b } from '@firebase/dummy-exp';
      // import {a as c, b } from '@firebase/dummy-exp';
      if (
        node.importClause.namedBindings &&
        ts.isNamedImports(node.importClause.namedBindings)
      ) {
        node.importClause.namedBindings.elements.forEach(each => {
          // if imported symbol is renamed, we want its original name which is stored in propertyName
          if (each.propertyName) {
            externalsMap
              .get(moduleName)!
              .push(each.propertyName.getText(sourceFile));
          } else {
            externalsMap.get(moduleName)!.push(each.name.getText(sourceFile));
          }
        });
        // import * as fs from 'fs'
      } else if (
        node.importClause.namedBindings &&
        ts.isNamespaceImport(node.importClause.namedBindings)
      ) {
        externalsMap.get(moduleName)!.push('*');
        // import a from '@firebase/dummy-exp'
      } else if (
        node.importClause.name &&
        ts.isIdentifier(node.importClause.name)
      ) {
        externalsMap.get(moduleName)!.push('default export');
      }
    }
  });
  const externals: { [key: string]: string[] } = {};
  externalsMap.forEach((value, key) => {
    externals[key.replace(/'/g, '')] = value;
  });
  return externals;
}

/**
 * This function generates a binary size report for the given module specified by the moduleLocation argument.
 * @param moduleLocation a path to location of a firebase module
 */
export async function generateReportForModule(
  moduleLocation: string
): Promise<Report> {
  const packageJsonPath = `${moduleLocation}/package.json`;
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(
      `Firebase Module locates at ${moduleLocation}: ${ErrorCode.PKG_JSON_DOES_NOT_EXIST}`
    );
  }
  const packageJson = JSON.parse(
    fs.readFileSync(packageJsonPath, { encoding: 'utf-8' })
  );
  // to exclude <modules>-types modules
  const TYPINGS: string = 'typings';
  if (packageJson[TYPINGS]) {
    const dtsFile = `${moduleLocation}/${packageJson[TYPINGS]}`;
    const bundleLocation: string = retrieveBundleFileLocation(packageJson);
    if (!bundleLocation) {
      throw new Error(ErrorCode.BUNDLE_FILE_DOES_NOT_EXIST);
    }
    const bundleFile = `${moduleLocation}/${bundleLocation}`;
    const jsonReport: Report = await generateReport(
      packageJson.name,
      dtsFile,
      bundleFile
    );

    return jsonReport;
  }
  throw new Error(
    `Firebase Module locates at: ${moduleLocation}: ${ErrorCode.TYPINGS_FIELD_NOT_DEFINED}`
  );
}
/**
 *
 * @param pkgJson package.json of the module.
 *
 * This function implements a fallback of locating module's bundle file.
 * It first looks at esm2017 field of package.json, then module field. Main
 * field at the last.
 *
 */
function retrieveBundleFileLocation(pkgJson: {
  [key: string]: string;
}): string {
  if (pkgJson['esm2017']) {
    return pkgJson['esm2017'];
  }
  if (pkgJson['module']) {
    return pkgJson['module'];
  }
  if (pkgJson['main']) {
    return pkgJson['main'];
  }
  return '';
}

/**
 * A recursive function that locates and generates reports for sub-modules
 */
async function traverseDirs(
  moduleLocation: string,
  // eslint-disable-next-line @typescript-eslint/ban-types
  executor: Function,
  level: number,
  levelLimit: number
): Promise<Report[]> {
  if (level > levelLimit) {
    return [];
  }

  const reports: Report[] = [];
  const report: Report = await executor(moduleLocation);
  if (report != null) {
    reports.push(report);
  }

  for (const name of fs.readdirSync(moduleLocation)) {
    const p = `${moduleLocation}/${name}`;
    const generateSizeAnalysisReportPkgJsonField: string =
      'generate-size-analysis-report';
    // submodules of a firebase module should set generate-size-analysis-report field of package.json to true
    // in order to be analyzed
    if (
      fs.lstatSync(p).isDirectory() &&
      fs.existsSync(`${p}/package.json`) &&
      JSON.parse(fs.readFileSync(`${p}/package.json`, { encoding: 'utf-8' }))[
        generateSizeAnalysisReportPkgJsonField
      ]
    ) {
      const subModuleReports: Report[] = await traverseDirs(
        p,
        executor,
        level + 1,
        levelLimit
      );
      if (subModuleReports !== null && subModuleReports.length !== 0) {
        reports.push(...subModuleReports);
      }
    }
  }
  return reports;
}

/**
 *
 * This functions generates the final json report for the module.
 * @param publicApi all symbols extracted from the input dts file.
 * @param jsFile a bundle file generated by rollup according to the input dts file.
 * @param map maps every symbol listed in publicApi to its type. eg: aVariable -> variable.
 */
export async function buildJsonReport(
  moduleName: string,
  publicApi: MemberList,
  jsFile: string
): Promise<Report> {
  const result: Report = {
    name: moduleName,
    symbols: []
  };
  for (const exp of publicApi.classes) {
    try {
      result.symbols.push(await extractDependenciesAndSize(exp, jsFile));
    } catch (e) {
      console.log(e);
    }
  }

  for (const exp of publicApi.functions) {
    try {
      result.symbols.push(await extractDependenciesAndSize(exp, jsFile));
    } catch (e) {
      console.log(e);
    }
  }
  for (const exp of publicApi.variables) {
    try {
      result.symbols.push(await extractDependenciesAndSize(exp, jsFile));
    } catch (e) {
      console.log(e);
    }
  }

  for (const exp of publicApi.enums) {
    try {
      result.symbols.push(await extractDependenciesAndSize(exp, jsFile));
    } catch (e) {
      console.log(e);
    }
  }
  return result;
}
/**
 *
 * This function generates a report from given dts file.
 * @param name a name to be displayed on the report. a module name if for a firebase module; a random name if for adhoc analysis.
 * @param dtsFile absolute path to the definition file of interest.
 * @param bundleFile absolute path to the bundle file of the given definition file.
 */
export async function generateReport(
  name: string,
  dtsFile: string,
  bundleFile: string
): Promise<Report> {
  const resolvedDtsFile = path.resolve(dtsFile);
  const resolvedBundleFile = path.resolve(bundleFile);
  if (!fs.existsSync(resolvedDtsFile)) {
    throw new Error(ErrorCode.INPUT_DTS_FILE_DOES_NOT_EXIST);
  }
  if (!fs.existsSync(resolvedBundleFile)) {
    throw new Error(ErrorCode.INPUT_BUNDLE_FILE_DOES_NOT_EXIST);
  }

  console.log('generating report for ', name);
  const publicAPI = extractExports(resolvedBundleFile);
  return buildJsonReport(name, publicAPI, bundleFile);
}

/**
 * This function recursively generates a binary size report for every module listed in moduleLocations array.
 *
 * @param moduleLocations an array of strings where each is a path to location of a firebase module
 *
 */
export async function generateReportForModules(
  moduleLocations: string[]
): Promise<Report[]> {
  const reportCollection: Report[] = [];

  for (const moduleLocation of moduleLocations) {
    // we traverse the dir in order to include binaries for submodules, e.g. @firebase/firestore/memory
    // Currently we only traverse 1 level deep because we don't have any submodule deeper than that.
    const reportsForModuleAndItsSubModule: Report[] = await traverseDirs(
      moduleLocation,
      generateReportForModule,
      0,
      1
    );
    if (
      reportsForModuleAndItsSubModule !== null &&
      reportsForModuleAndItsSubModule.length !== 0
    ) {
      reportCollection.push(...reportsForModuleAndItsSubModule);
    }
  }
  return reportCollection;
}
