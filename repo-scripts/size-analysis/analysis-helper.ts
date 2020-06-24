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
import { TYPINGS } from './analysis';
import { request } from 'express';

import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

/** Contains a list of members by type. */
export type MemberList = {
  classes: string[];
  functions: string[];
  variables: string[];
  enums: string[];
};
/** Contains the dependencies and the size of their code for a single export. */
export type ExportData = { dependencies: MemberList; sizeInBytes: number };

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

  const { code } = terser.minify(afterContent, {
    output: {
      comments: false
    },
    mangle: false,
    compress: false
  });

  fs.unlinkSync(input);
  fs.unlinkSync(output);
  return { dependencies, sizeInBytes: Buffer.byteLength(code!, 'utf-8') };
}

/**
 * Extracts all function, class and variable declarations using the TypeScript
 * compiler API.
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
        if (ts.isIdentifier(variableDeclaration.name)) {
          declarations.variables.push(
            (variableDeclaration.name as ts.Identifier).getText(sourceFile)
          );
        }
        // TODO: variableDeclaration.name is an union type (Identifier | BindingPattern)
        // need Identifier type, not sure in what case BindingPattern type is for.
        else {
          console.log(
            'this VariableDeclaration.name object is of BindingPattern type !'
          );
        }
      });
    } else if (ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const symbol = checker.getSymbolAtLocation(node.moduleSpecifier);
        const reExportFullPath = symbol.valueDeclaration.getSourceFile()
          .fileName;
        const reExportsMember = extractDeclarations(reExportFullPath);

        // named exports
        if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          const actualExports: string[] = [];
          node.exportClause.elements.forEach(exportSpecifier => {
            const reExportedSymbol: string = extractRealSymbolName(
              exportSpecifier
            );
            // if export is renamed, replace with new name
            if (isExportRenamed(exportSpecifier)) {
              actualExports.push(exportSpecifier.name.escapedText.toString());
              replaceAll(
                reExportsMember,
                reExportedSymbol,
                exportSpecifier.name.escapedText.toString()
              );
            } else {
              actualExports.push(reExportedSymbol);
            }
          });
          filterAllBy(reExportsMember, actualExports);
        }
        // concatename reExport MemberList with MemberList of the dts file
        declarations.functions.push(...reExportsMember.functions);
        declarations.variables.push(...reExportsMember.variables);
        declarations.classes.push(...reExportsMember.classes);
        declarations.enums.push(...reExportsMember.enums);
      }
    }
  });

  if (map) {
    declarations = mapSymbolToType(map, declarations);
    declarations = dedup(declarations);
  }

  // Sort to ensure stable output
  declarations.functions.sort();
  declarations.classes.sort();
  declarations.variables.sort();
  declarations.enums.sort();

  return declarations;
}

function dedup(memberList: MemberList): MemberList {
  const classesSet: Set<string> = new Set(memberList.classes);
  memberList.classes = Array.from(classesSet);

  const functionsSet: Set<string> = new Set(memberList.functions);
  memberList.functions = Array.from(functionsSet);

  const enumsSet: Set<string> = new Set(memberList.enums);
  memberList.enums = Array.from(enumsSet);

  const variablesSet: Set<string> = new Set(memberList.variables);
  memberList.variables = Array.from(variablesSet);

  return memberList;
}
function mapSymbolToType(
  map: Map<string, string>,
  memberList: MemberList
): MemberList {
  const newMemberList: MemberList = {
    functions: [],
    classes: [],
    variables: [],
    enums: []
  };
  memberList.classes.forEach(element => {
    if (map.has(element)) {
      newMemberList[map.get(element)].push(element);
    } else {
      newMemberList.classes.push(element);
    }
  });
  memberList.variables.forEach(element => {
    if (map.has(element)) {
      newMemberList[map.get(element)].push(element);
    } else {
      newMemberList.variables.push(element);
    }
  });
  memberList.enums.forEach(element => {
    if (map.has(element)) {
      newMemberList[map.get(element)].push(element);
    } else {
      newMemberList.enums.push(element);
    }
  });
  memberList.functions.forEach(element => {
    if (map.has(element)) {
      newMemberList[map.get(element)].push(element);
    } else {
      newMemberList.functions.push(element);
    }
  });
  return newMemberList;
}
function isReExported(symbol: string, reExportedSymbols: string[]): boolean {
  return reExportedSymbols.includes(symbol);
}

function extractRealSymbolName(exportSpecifier: ts.ExportSpecifier): string {
  // if property name is not null -> export is renamed
  if (exportSpecifier.propertyName) {
    return exportSpecifier.propertyName.escapedText.toString();
  }

  return exportSpecifier.name.escapedText.toString();
}
function filterAllBy(memberList: MemberList, keep: string[]) {
  memberList.functions = memberList.functions.filter(each =>
    isReExported(each, keep)
  );
  memberList.variables = memberList.variables.filter(each =>
    isReExported(each, keep)
  );
  memberList.classes = memberList.classes.filter(each =>
    isReExported(each, keep)
  );
  memberList.enums = memberList.enums.filter(each => isReExported(each, keep));
}

function replaceAll(memberList: MemberList, original: string, current: string) {
  memberList.classes = replaceWith(memberList.classes, original, current);
  memberList.variables = replaceWith(memberList.variables, original, current);
  memberList.functions = replaceWith(memberList.functions, original, current);
  memberList.enums = replaceWith(memberList.enums, original, current);
}
function replaceWith(
  arr: string[],
  original: string,
  current: string
): string[] {
  const rv: string[] = [];
  for (let each of arr) {
    if (each.localeCompare(original) == 0) {
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
