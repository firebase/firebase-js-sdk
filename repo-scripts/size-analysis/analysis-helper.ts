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
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import { deepCopy } from '@firebase/util';

const TYPINGS: string = 'typings';
const BUNDLE: string = 'esm2017';
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
export interface External {
  moduleName: string;
  symbols: string[];
}

/** Contains a list of members by type. */
export interface MemberList {
  classes: string[];
  functions: string[];
  variables: string[];
  enums: string[];
  externals: External[];
}
/** Contains the dependencies and the size of their code for a single export. */
export interface ExportData {
  dependencies: MemberList;
  sizeInBytes: number;
  sizeInBytesWithExternalDeps: number;
}

/**
 * This functions builds a simple JS app that only depends on the provided
 * export. It then uses Rollup to gather all top-level classes and functions
 * that that the export depends on.
 *
 * @param exportName The name of the export to verify
 * @param jsBundle The file name of the source bundle that contains the export
 * @return A list of dependencies for the given export
 */
export async function extractDependencies(
  exportName: string,
  jsBundle: string,
  map: Map<string, string>
): Promise<MemberList> {
  const { dependencies } = await extractDependenciesAndSize(
    exportName,
    jsBundle,
    map
  );
  return dependencies;
}

/**
 * Helper for extractDependencies that extracts the dependencies and the size
 * of the minified build.
 */
export async function extractDependenciesAndSize(
  exportName: string,
  jsBundle: string,
  map: Map<string, string>
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
    external: id => id.startsWith('@firebase') // exclude all firebase dependencies
  });
  await externalDepsNotResolvedBundle.write({
    file: externalDepsNotResolvedOutput,
    format: 'es'
  });
  const dependencies: MemberList = extractDeclarations(
    externalDepsNotResolvedOutput,
    map
  );
  const externals: External[] = extractExternalDependencies(
    externalDepsNotResolvedOutput
  );
  dependencies.externals.push(...externals);

  const externalDepsResolvedOutputContent = fs.readFileSync(
    externalDepsResolvedOutput,
    'utf-8'
  );
  // Extract size of minified build
  const externalDepsNotResolvedOutputContent = fs.readFileSync(
    externalDepsNotResolvedOutput,
    'utf-8'
  );
  const externalDepsResolvedOutputContentMinimized: terser.MinifyOutput = terser.minify(
    externalDepsResolvedOutputContent,
    {
      output: {
        comments: false
      },
      mangle: true,
      compress: false
    }
  );
  const externalDepsNotResolvedOutputContentMinimized: terser.MinifyOutput = terser.minify(
    externalDepsNotResolvedOutputContent,
    {
      output: {
        comments: false
      },
      mangle: true,
      compress: false
    }
  );

  fs.unlinkSync(input);
  fs.unlinkSync(externalDepsNotResolvedOutput);
  fs.unlinkSync(externalDepsResolvedOutput);
  return {
    dependencies,
    sizeInBytes: Buffer.byteLength(
      externalDepsNotResolvedOutputContentMinimized.code!,
      'utf-8'
    ),
    sizeInBytesWithExternalDeps: Buffer.byteLength(
      externalDepsResolvedOutputContentMinimized.code!,
      'utf-8'
    )
  };
}

/**
 * Extracts all function, class and variable declarations using the TypeScript
 * compiler API.
 * @param map maps every symbol listed in dts file to its type. eg: aVariable -> variable.
 * map is null when given filePath is a path to d.ts file.
 * map is populated when given filePath points to a .js bundle file.
 *
 * Examples of Various Type of Exports
 * FunctionDeclaration: export function aFunc(): string {...};
 * ClassDeclaration: export class aClass {};
 * EnumDeclaration: export enum aEnum {};
 * VariableDeclaration: export let aVariable: string; import * as tmp from 'tmp'; export declare const aVar: tmp.someType.
 * VariableStatement: export const aVarStatement: string = "string"; export const { a, b } = { a: 'a', b: 'b' };
 * ExportDeclaration:
 *      named exports: export {foo, bar} from '...'; export {foo as foo1, bar} from '...'; export {LogLevel};
 *      export everything: export * from '...';
 */
export function extractDeclarations(
  filePath: string,
  map?: Map<string, string>
): MemberList {
  const program = ts.createProgram([filePath], { allowJs: true });
  const checker = program.getTypeChecker();

  const sourceFile = program.getSourceFile(filePath);
  if (!sourceFile) {
    throw new Error(`${ErrorCode.FILE_PARSING_ERROR} ${filePath}`);
  }

  let declarations: MemberList = {
    functions: [],
    classes: [],
    variables: [],
    enums: [],
    externals: []
  };
  const namespaceImportSet: Set<string> = new Set();
  // define a map here which is used to handle export statements that have no from clause.
  // As there is no from clause in such export statements, we retrieve symbol location by parsing the corresponding import
  // statements. We store the symbol and its defined location as key value pairs in the map.
  const importSymbolCurrentNameToModuleLocation: Map<
    string,
    string
  > = new Map();
  const importSymbolCurrentNameToOriginalName: Map<string, string> = new Map(); // key: current name value: original name
  const importModuleLocationToExportedSymbolsList: Map<
    string,
    MemberList
  > = new Map(); // key: module location, value: a list of all exported symbols of the module
  ts.forEachChild(sourceFile, node => {
    if (ts.isFunctionDeclaration(node)) {
      declarations.functions.push(node.name!.text);
    } else if (ts.isClassDeclaration(node)) {
      declarations.classes.push(node.name!.text);
    } else if (ts.isVariableDeclaration(node)) {
      declarations.variables.push(node.name!.getText());
    } else if (ts.isEnumDeclaration(node)) {
      declarations.enums.push(node.name.escapedText.toString());
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
          variableDeclaration.name.elements.forEach(node => {
            declarations.variables.push(node.name.getText(sourceFile));
          });
        }
      });
    } else if (ts.isImportDeclaration(node) && node.importClause) {
      const symbol = checker.getSymbolAtLocation(node.moduleSpecifier);
      if (symbol && symbol.valueDeclaration) {
        const importFilePath = symbol.valueDeclaration.getSourceFile().fileName;
        // import { a, b } from '@firebase/dummy-exp'
        // import {a as A, b as B} from '@firebase/dummy-exp'
        if (
          node.importClause.namedBindings &&
          ts.isNamedImports(node.importClause.namedBindings)
        ) {
          node.importClause.namedBindings.elements.forEach(each => {
            const symbolName: string = each.name.getText(sourceFile); // import symbol current name
            importSymbolCurrentNameToModuleLocation.set(
              symbolName,
              importFilePath
            );
            // if imported symbols are renamed, insert an entry to importSymbolCurrentNameToOriginalName Map
            // with key the current name, value the original name
            if (each.propertyName) {
              importSymbolCurrentNameToOriginalName.set(
                symbolName,
                each.propertyName.getText(sourceFile)
              );
            }
          });

          // import * as fs from 'fs'
        } else if (
          node.importClause.namedBindings &&
          ts.isNamespaceImport(node.importClause.namedBindings)
        ) {
          const symbolName: string = node.importClause.namedBindings.name.getText(
            sourceFile
          );
          namespaceImportSet.add(symbolName);

          // import a from '@firebase/dummy-exp'
        } else if (
          node.importClause.name &&
          ts.isIdentifier(node.importClause.name)
        ) {
          const symbolName: string = node.importClause.name.getText(sourceFile);
          importSymbolCurrentNameToModuleLocation.set(
            symbolName,
            importFilePath
          );
        }
      }
    }
    // re-exports handler: handles cases like :
    // export {LogLevel};
    // export * from '..';
    // export {foo, bar} from '..';
    // export {foo as foo1, bar} from '...';
    else if (ts.isExportDeclaration(node)) {
      // this clause handles the export statements that have a from clause (referred to as moduleSpecifier in ts compiler).
      // examples are "export {foo as foo1, bar} from '...';"
      // and "export * from '..';"
      if (node.moduleSpecifier) {
        if (ts.isStringLiteral(node.moduleSpecifier)) {
          const reExportsWithFromClause: MemberList = handleExportStatementsWithFromClause(
            checker,
            node,
            node.moduleSpecifier.getText(sourceFile)
          );
          // concatenate re-exported MemberList with MemberList of the dts file
          for (const key of Object.keys(declarations)) {
            declarations[key].push(...reExportsWithFromClause[key]);
          }
        }
      } else {
        // export {LogLevel};
        // exclusively handles named export statements that has no from clause.
        handleExportStatementsWithoutFromClause(
          node,
          importSymbolCurrentNameToModuleLocation,
          importSymbolCurrentNameToOriginalName,
          importModuleLocationToExportedSymbolsList,
          namespaceImportSet,
          declarations
        );
      }
    }
  });
  declarations = dedup(declarations);

  if (map) {
    declarations = mapSymbolToType(map, declarations);
  }

  //Sort to ensure stable output
  Object.values(declarations).map(each => {
    each.sort();
  });
  return declarations;
}
/**
 *
 * @param node compiler representation of an export statement
 *
 * This function exclusively handles export statements that have a from clause. The function uses checker argument to resolve
 * module name specified in from clause to its actual location. It then retrieves all exported symbols from the module.
 * If the statement is a named export, the function does an extra step, that is, filtering out the symbols that are not listed
 * in exportClause.
 */
function handleExportStatementsWithFromClause(
  checker: ts.TypeChecker,
  node: ts.ExportDeclaration,
  moduleName: string
): MemberList {
  const symbol = checker.getSymbolAtLocation(node.moduleSpecifier);
  let declarations: MemberList = {
    functions: [],
    classes: [],
    variables: [],
    enums: [],
    externals: []
  };
  if (symbol && symbol.valueDeclaration) {
    const reExportFullPath = symbol.valueDeclaration.getSourceFile().fileName;
    // first step: always retrieve all exported symbols from the source location of the re-export.
    declarations = extractDeclarations(reExportFullPath);
    // if it's a named export statement, filter the MemberList to keep only those listed in exportClause.
    // named exports: eg: export {foo, bar} from '...'; and export {foo as foo1, bar} from '...';
    declarations = extractSymbolsFromNamedExportStatement(node, declarations);
  }
  // if the module name in the from clause cant be resolved to actual module location,
  // just extract symbols listed in the exportClause for named exports, put them in variables first, as
  // they will be categorized later using map argument.
  else if (node.exportClause && ts.isNamedExports(node.exportClause)) {
    node.exportClause.elements.forEach(exportSpecifier => {
      declarations.variables.push(exportSpecifier.name.escapedText.toString());
    });
  }
  // handles the case when exporting * from a module whose location can't be resolved
  else {
    console.log(
      `The public API extraction of ${moduleName} is not complete, because it re-exports from ${moduleName} using * export but we couldn't resolve ${moduleName}`
    );
  }

  return declarations;
}

/**
 *
 * @param node compiler representation of a named export statement
 * @param exportsFullList a list of all exported symbols retrieved from the location given in the export statement.
 *
 * This function filters on exportsFullList and keeps only those symbols that are listed in the given named export statement.
 */
function extractSymbolsFromNamedExportStatement(
  node: ts.ExportDeclaration,
  exportsFullList: MemberList
): MemberList {
  if (node.exportClause && ts.isNamedExports(node.exportClause)) {
    const actualExports: string[] = [];
    node.exportClause.elements.forEach(exportSpecifier => {
      const reExportedSymbol: string = extractOriginalSymbolName(
        exportSpecifier
      );
      // eg: export {foo as foo1 } from '...';
      // if export is renamed, replace with new name
      // reExportedSymbol: stores the original symbol name
      // exportSpecifier.name: stores the renamed symbol name
      if (isExportRenamed(exportSpecifier)) {
        actualExports.push(exportSpecifier.name.escapedText.toString());
        // reExportsMember stores all re-exported symbols in its orignal name. However, these re-exported symbols
        // could be renamed by the re-export. We want to show the renamed name of the symbols in the final analysis report.
        // Therefore, replaceAll simply replaces the original name of the symbol with the new name defined in re-export.
        replaceAll(
          exportsFullList,
          reExportedSymbol,
          exportSpecifier.name.escapedText.toString()
        );
      } else {
        actualExports.push(reExportedSymbol);
      }
    });
    // for named exports: requires a filter step which keeps only the symbols listed in the export statement.
    filterAllBy(exportsFullList, actualExports);
  }
  return exportsFullList;
}
/**
 * @param node compiler representation of a named export statement
 * @param importSymbolCurrentNameToModuleLocation a map with imported symbol current name as key and the resolved module location as value. (map is populated by parsing import statements)
 * @param importSymbolCurrentNameToOriginalName as imported symbols can be renamed, this map stores imported symbols current name and original name as key value pairs.
 * @param importModuleLocationToExportedSymbolsList a map that maps module location to a list of its exported symbols.
 * @param namespaceImportSymbolSet a set of namespace import symbols.
 * @param parentDeclarations a list of exported symbols extracted from the module so far
 * This function exclusively handles named export statements that has no from clause, i.e: statements like export {LogLevel};
 * first case: namespace export
 * example: import * as fs from 'fs'; export {fs};
 * The function checks if namespaceImportSymbolSet has a namespace import symbol that of the same name, append the symbol to declarations.variables if exists.
 *
 * second case: import then export
 * example: import {a} from '...'; export {a}
 * The function retrieves the location where the exported symbol is defined from the corresponding import statements.
 *
 * third case: declare first then export
 * examples: declare const apps: Map<string, number>; export { apps };
 * function foo(){} ; export {foo as bar};
 * The function parses export clause of the statement and replaces symbol with its current name (if the symbol is renamed) from the declaration argument.
 */
function handleExportStatementsWithoutFromClause(
  node: ts.ExportDeclaration,
  importSymbolCurrentNameToModuleLocation: Map<string, string>,
  importSymbolCurrentNameToOriginalName: Map<string, string>,
  importModuleLocationToExportedSymbolsList: Map<string, MemberList>,
  namespaceImportSymbolSet: Set<string>,
  parentDeclarations: MemberList
): void {
  if (node.exportClause && ts.isNamedExports(node.exportClause)) {
    node.exportClause.elements.forEach(exportSpecifier => {
      // export symbol could be renamed, we retrieve both its current/renamed name and original name
      const exportSymbolCurrentName = exportSpecifier.name.escapedText.toString();
      const exportSymbolOriginalName = extractOriginalSymbolName(
        exportSpecifier
      );
      // import * as fs from 'fs';  export {fs};
      if (namespaceImportSymbolSet.has(exportSymbolOriginalName)) {
        parentDeclarations.variables.push(exportSymbolOriginalName);
        replaceAll(
          parentDeclarations,
          exportSymbolOriginalName,
          exportSymbolCurrentName
        );
      }
      // handles import then exports
      // import {a as A , b as B} from '...'
      // export {A as AA , B as BB };
      else if (
        importSymbolCurrentNameToModuleLocation.has(exportSymbolOriginalName)
      ) {
        const moduleLocation: string = importSymbolCurrentNameToModuleLocation.get(
          exportSymbolOriginalName
        );
        let reExportedSymbols: MemberList = null;
        if (importModuleLocationToExportedSymbolsList.has(moduleLocation)) {
          reExportedSymbols = deepCopy(
            importModuleLocationToExportedSymbolsList.get(moduleLocation)
          );
        } else {
          reExportedSymbols = extractDeclarations(
            importSymbolCurrentNameToModuleLocation.get(
              exportSymbolOriginalName
            )
          );
          importModuleLocationToExportedSymbolsList.set(
            moduleLocation,
            deepCopy(reExportedSymbols)
          );
        }

        let nameToBeReplaced = exportSymbolOriginalName;
        // if current exported symbol is renamed in import clause. then we retrieve its original name from
        // importSymbolCurrentNameToOriginalName map
        if (
          importSymbolCurrentNameToOriginalName.has(exportSymbolOriginalName)
        ) {
          nameToBeReplaced = importSymbolCurrentNameToOriginalName.get(
            exportSymbolOriginalName
          );
        }

        filterAllBy(reExportedSymbols, [nameToBeReplaced]);
        // replace with new name
        replaceAll(
          reExportedSymbols,
          nameToBeReplaced,
          exportSymbolCurrentName
        );

        // concatenate re-exported MemberList with MemberList of the dts file
        for (const key of Object.keys(parentDeclarations)) {
          parentDeclarations[key].push(...reExportedSymbols[key]);
        }
      }
      // handles declare first then export
      // declare const apps: Map<string, number>;
      // export { apps as apps1};
      // function a() {};
      // export {a};
      else {
        if (isExportRenamed(exportSpecifier)) {
          replaceAll(
            parentDeclarations,
            exportSymbolOriginalName,
            exportSymbolCurrentName
          );
        }
      }
    });
  }
}

/**
 * To Make sure symbols of every category are unique.
 */
export function dedup(memberList: MemberList): MemberList {
  for (const key of Object.keys(memberList)) {
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
    externals: []
  };

  for (const key of Object.keys(memberList)) {
    memberList[key].forEach(element => {
      if (map.has(element)) {
        newMemberList[map.get(element)].push(element);
      } else {
        newMemberList[key].push(element);
      }
    });
  }
  return newMemberList;
}

function extractOriginalSymbolName(
  exportSpecifier: ts.ExportSpecifier
): string {
  // if symbol is renamed, then exportSpecifier.propertyName is not null and stores the orignal name, exportSpecifier.name stores the renamed name.
  // if symbol is not renamed, then exportSpecifier.propertyName is null, exportSpecifier.name stores the orignal name.
  if (exportSpecifier.propertyName) {
    return exportSpecifier.propertyName.escapedText.toString();
  }
  return exportSpecifier.name.escapedText.toString();
}

function filterAllBy(memberList: MemberList, keep: string[]): void {
  for (const key of Object.keys(memberList)) {
    memberList[key] = memberList[key].filter(each => keep.includes(each));
  }
}

export function replaceAll(
  memberList: MemberList,
  original: string,
  current: string
): void {
  for (const key of Object.keys(memberList)) {
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

function isExportRenamed(exportSpecifier: ts.ExportSpecifier): boolean {
  return exportSpecifier.propertyName != null;
}

/**
 *
 * This functions writes generated json report(s) to a file
 */
export function writeReportToFile(report: string, outputFile: string): void {
  if (fs.existsSync(outputFile) && !fs.lstatSync(outputFile).isFile()) {
    throw new Error(ErrorCode.OUTPUT_FILE_REQUIRED);
  }
  const directoryPath = path.dirname(outputFile);
  //for output file path like ./dir/dir1/dir2/file, we need to make sure parent dirs exist.
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
  fs.writeFileSync(outputFile, report);
}
/**
 *
 * This functions writes generated json report(s) to a file of given directory
 */
export function writeReportToDirectory(
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
  writeReportToFile(report, `${directoryPath}/${fileName}`);
}

/**
 * This function extract unresolved external module symbols from bundle file import statements.
 *
 */
export function extractExternalDependencies(
  minimizedBundleFile: string
): External[] {
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
              .get(moduleName)
              .push(each.propertyName.getText(sourceFile));
          } else {
            externalsMap.get(moduleName).push(each.name.getText(sourceFile));
          }
        });
        // import * as fs from 'fs'
      } else if (
        node.importClause.namedBindings &&
        ts.isNamespaceImport(node.importClause.namedBindings)
      ) {
        externalsMap.get(moduleName).push('*');
        // import a from '@firebase/dummy-exp'
      } else if (
        node.importClause.name &&
        ts.isIdentifier(node.importClause.name)
      ) {
        externalsMap.get(moduleName).push('default export');
      }
    }
  });
  const externals: External[] = [];

  externalsMap.forEach((value, key) => {
    const external: External = {
      moduleName: key,
      symbols: value
    };
    externals.push(external);
  });
  return externals;
}

/**
 * This function generates a binary size report for the given module specified by the moduleLocation argument.
 * @param moduleLocation a path to location of a firebase module
 * @param outputDirectory a path to a directory where the reports will be written under.
 * @param writeFiles when true, will write reports to designated directory specified by outputDirectory.
 */
export async function generateReportForModule(
  moduleLocation: string,
  outputDirectory: string,
  writeFiles: boolean
): Promise<string> {
  const packageJsonPath = `${moduleLocation}/package.json`;
  if (!fs.existsSync(packageJsonPath)) {
    return;
  }
  const packageJson = require(packageJsonPath);
  // to exclude <modules>-types modules
  if (packageJson[TYPINGS]) {
    const dtsFile = `${moduleLocation}/${packageJson[TYPINGS]}`;
    if (!packageJson[BUNDLE]) {
      throw new Error(ErrorCode.BUNDLE_FILE_DOES_NOT_EXIST);
    }
    const bundleFile = `${moduleLocation}/${packageJson[BUNDLE]}`;
    const json = await generateReport(dtsFile, bundleFile);
    const fileName = `${path.basename(packageJson.name)}-dependency.json`;
    if (writeFiles) {
      writeReportToDirectory(json, fileName, path.resolve(outputDirectory));
    }
    return json;
  }
}
/**
 *
 * This function creates a map from a MemberList object which maps symbol names (key) listed
 * to its type (value)
 */
export function buildMap(api: MemberList): Map<string, string> {
  const map: Map<string, string> = new Map();
  for (const type of Object.keys(api)) {
    api[type].forEach(element => {
      map.set(element, type);
    });
  }
  return map;
}

/**
 * A recursive function that locates and generates reports for sub-modules
 */
function traverseDirs(
  moduleLocation: string,
  outputDirectory: string,
  writeFiles: boolean,
  executor,
  level: number,
  levelLimit: number
): void {
  if (level > levelLimit) {
    return;
  }

  executor(moduleLocation, outputDirectory, writeFiles);

  for (const name of fs.readdirSync(moduleLocation)) {
    const p = `${moduleLocation}/${name}`;

    if (fs.lstatSync(p).isDirectory()) {
      traverseDirs(
        p,
        outputDirectory,
        writeFiles,
        executor,
        level + 1,
        levelLimit
      );
    }
  }
}

/**
 *
 * This functions generates the final json report for the module.
 * @param publicApi all symbols extracted from the input dts file.
 * @param jsFile a bundle file generated by rollup according to the input dts file.
 * @param map maps every symbol listed in publicApi to its type. eg: aVariable -> variable.
 */
export async function buildJsonReport(
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

export async function generateReport(
  dtsFile: string,
  bundleFile: string
): Promise<string> {
  const resolvedDtsFile = path.resolve(dtsFile);
  const resolvedBundleFile = path.resolve(bundleFile);
  if (!fs.existsSync(resolvedDtsFile)) {
    throw new Error(ErrorCode.INPUT_DTS_FILE_DOES_NOT_EXIST);
  }
  if (!fs.existsSync(resolvedBundleFile)) {
    throw new Error(ErrorCode.INPUT_BUNDLE_FILE_DOES_NOT_EXIST);
  }
  const publicAPI = extractDeclarations(resolvedDtsFile);
  const map: Map<string, string> = buildMap(publicAPI);
  return buildJsonReport(publicAPI, bundleFile, map);
}

/**
 * This function recursively generates a binary size report for every module listed in moduleLocations array.
 *
 * @param moduleLocations an array of strings where each is a path to location of a firebase module
 * @param outputDirectory a path to a directory where the reports will be written under.
 * @param writeFiles when true, will write reports to designated directory specified by outputDirectory.
 *
 *
 */
export function generateReportForModules(
  moduleLocations: string[],
  outputDirectory: string,
  writeFiles: boolean
): void {
  for (const moduleLocation of moduleLocations) {
    // we traverse the dir in order to include binaries for submodules, e.g. @firebase/firestore/memory
    // Currently we only traverse 1 level deep because we don't have any submodule deeper than that.
    traverseDirs(
      moduleLocation,
      outputDirectory,
      writeFiles,
      generateReportForModule,
      0,
      1
    );
  }
}
