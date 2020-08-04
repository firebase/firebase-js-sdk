'use strict';
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
exports.__esModule = true;
exports.extractPublicIdentifiers = void 0;
// eslint-disable-next-line import/no-extraneous-dependencies
var ts = require('typescript');
var fs = require('fs');
function extractIdentifiersFromNodeAndChildren(node, symbols) {
  if (ts.isIdentifier(node)) {
    symbols.add(node.escapedText.toString());
  }
  ts.forEachChild(node, function (childNode) {
    return extractIdentifiersFromNodeAndChildren(childNode, symbols);
  });
}
/** Generates the "d.ts" content for `fileName`. */
function extractTypeDeclaration(fileName) {
  var result;
  var compilerOptions = { declaration: true, emitDeclarationOnly: true };
  var host = ts.createCompilerHost(compilerOptions);
  host.writeFile = function (_, contents) {
    return (result = contents);
  };
  var program = ts.createProgram([fileName], compilerOptions, host);
  program.emit();
  return result;
}
/**
 * Traverses TypeScript type definition files and returns the list of referenced
 * identifiers.
 */
function extractPublicIdentifiers(filePaths) {
  var publicIdentifiers = new Set();
  var _loop_1 = function (filePath) {
    var contents = fs.readFileSync(filePath, { encoding: 'UTF-8' });
    var sourceFile = ts.createSourceFile(
      filePath,
      contents,
      ts.ScriptTarget.ES2015
    );
    if (!sourceFile.isDeclarationFile) {
      var dtsSource = extractTypeDeclaration(filePath);
      sourceFile = ts.createSourceFile(
        filePath.replace('.ts', '.d.ts'),
        dtsSource,
        ts.ScriptTarget.ES2015
      );
    }
    var identifiers = new Set();
    ts.forEachChild(sourceFile, function (childNode) {
      return extractIdentifiersFromNodeAndChildren(childNode, identifiers);
    });
    identifiers.forEach(function (api) {
      publicIdentifiers.add(api);
    });
  };
  for (var _i = 0, filePaths_1 = filePaths; _i < filePaths_1.length; _i++) {
    var filePath = filePaths_1[_i];
    _loop_1(filePath);
  }
  return publicIdentifiers;
}
exports.extractPublicIdentifiers = extractPublicIdentifiers;
