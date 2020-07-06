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
import { ObjectUnsubscribedError } from 'rxjs';

export const enum ErrorCode {
  INVALID_FLAG_COMBINATION = 'Invalid command flag combinations!',
  BUNDLE_FILE_DOES_NOT_EXIST = "Module doesn't have a bundle file!",
  DTS_FILE_DOES_NOT_EXIST = "Module doesn't have a dts file!",
  OUTPUT_DIRECTORY_REQUIRED = 'An output directory is required but a file given',
  OUTPUT_FILE_REQUIRED = 'An output file is required but a directory given',
  INPUT_FILE_DOES_NOT_EXIST = "Input file doesn't exist!"
}

/** Contains a list of members by type. */
export interface MemberList {
  classes: string[];
  functions: string[];
  variables: string[];
  enums: string[];
}
/** Contains the dependencies and the size of their code for a single export. */
export interface ExportData {
  dependencies: MemberList;
  sizeInBytes: number;
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
  const output = tmp.fileSync().name + '.js';

  const beforeContent = `export { ${exportName} } from '${path.resolve(
    jsBundle
  )}';`;

  fs.writeFileSync(input, beforeContent);

  // Run Rollup on the JavaScript above to produce a tree-shaken build
  const bundle = await rollup.rollup({
    input,
    plugins: [
      resolve({
        mainFields: ['esm2017', 'module', 'main']
      }),
      commonjs()
    ]
  });
  await bundle.write({ file: output, format: 'es' });

  const dependencies = extractDeclarations(output, map);

  // Extract size of minified build
  const afterContent = fs.readFileSync(output, 'utf-8');
  fs.writeFileSync(`dependencies/${exportName}`, afterContent);

  const { code } = terser.minify(afterContent, {
    output: {
      comments: false
    },
    mangle: true,
    compress: false
  });

  fs.unlinkSync(input);
  fs.unlinkSync(output);
  return { dependencies, sizeInBytes: Buffer.byteLength(code!, 'utf-8') };
}

/**
 * Extracts all function, class and variable declarations using the TypeScript
 * compiler API.
 * @param map maps every symbol listed in dts file to its type. eg: aVariable -> variable.
 * map is null when jsFile is a bundle generated from source dts file.
 * map is populated when jsFile is a bundle that contains a single export from the source dts file.
 *
 * Examples of Various Type of Exports
 * FunctionDeclaration: export function aFunc(): string {...};
 * ClassDeclaration: export class aClass {};
 * EnumDeclaration: export enum aEnum {};
 * VariableDeclaration: export let aVariable: string;
 * VariableStatement: export const aVarStatement: string = "string";
 * ExportDeclaration:
 *      named exports: export {foo, bar} from '...'; export {foo as foo1, bar} from '...';
 *      export everything: export * from '...';
 *
 *
 *
 *
 *
 */
export function extractDeclarations(
  jsFile: string,
  map?: Map<string, string>
): MemberList {
  const program = ts.createProgram([jsFile], { allowJs: true });
  const checker = program.getTypeChecker();

  const sourceFile = program.getSourceFile(jsFile);
  if (!sourceFile) {
    throw new Error('Failed to parse file: ' + jsFile);
  }

  let declarations: MemberList = {
    functions: [],
    classes: [],
    variables: [],
    enums: []
  };

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
    }
    // re-exports handler: handles cases like :
    // export * from '..';
    // export {foo, bar} from '..';
    // export {foo as foo1, bar} from '...';
    else if (ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const symbol = checker.getSymbolAtLocation(node.moduleSpecifier);
        const reExportFullPath = symbol.valueDeclaration.getSourceFile()
          .fileName;
        // first step: always retrieve all exported symbols from the source location of the re-export.
        const reExportsMember = extractDeclarations(reExportFullPath);

        // named exports: eg: export {foo, bar} from '...'; and export {foo as foo1, bar} from '...';
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
                reExportsMember,
                reExportedSymbol,
                exportSpecifier.name.escapedText.toString()
              );
            } else {
              actualExports.push(reExportedSymbol);
            }
          });
          // for named exports: requires a filter step which keeps only the symbols listed in the export statement.
          filterAllBy(reExportsMember, actualExports);
        }
        // concatenate re-exported MemberList with MemberList of the dts file
        Object.keys(declarations).map(each => {
          declarations[each].push(...reExportsMember[each]);
        });
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
 * To Make sure symbols of every category are unique.
 */
export function dedup(memberList: MemberList): MemberList {
  Object.keys(memberList).map(each => {
    const set: Set<string> = new Set(memberList[each]);
    memberList[each] = Array.from(set);
  });

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
    enums: []
  };
  Object.keys(memberList).map(key => {
    memberList[key].forEach(element => {
      if (map.has(element)) {
        newMemberList[map.get(element)].push(element);
      } else {
        newMemberList[key].push(element);
      }
    });
  });
  return newMemberList;
}

function isReExported(symbol: string, reExportedSymbols: string[]): boolean {
  return reExportedSymbols.includes(symbol);
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
  Object.keys(memberList).map(key => {
    memberList[key] = memberList[key].filter(each => isReExported(each, keep));
  });
}

export function replaceAll(
  memberList: MemberList,
  original: string,
  current: string
): void {
  Object.keys(memberList).map(key => {
    memberList[key] = replaceWith(memberList[key], original, current);
  });
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
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
  fs.writeFileSync(`${directoryPath}/${fileName}`, report);
}
