'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var ts = require('typescript');
var fs = require('fs');

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
function extractIdentifiersFromNodeAndChildren(node, symbols) {
    if (ts.isIdentifier(node)) {
        symbols.add(node.escapedText.toString());
    }
    ts.forEachChild(node, (childNode) => extractIdentifiersFromNodeAndChildren(childNode, symbols));
}
/** Generates the "d.ts" content for `fileName`. */
function extractTypeDeclaration(fileName) {
    let result;
    const compilerOptions = { declaration: true, emitDeclarationOnly: true };
    const host = ts.createCompilerHost(compilerOptions);
    host.writeFile = (_, contents) => (result = contents);
    const program = ts.createProgram([fileName], compilerOptions, host);
    program.emit();
    return result;
}
/**
 * Traverses TypeScript type definition files and returns the list of referenced
 * identifiers.
 */
function extractPublicIdentifiers(filePaths) {
    const publicIdentifiers = new Set();
    for (const filePath of filePaths) {
        const contents = fs.readFileSync(filePath, { encoding: 'utf-8' });
        let sourceFile = ts.createSourceFile(filePath, contents, ts.ScriptTarget.ES2015);
        if (!sourceFile.isDeclarationFile) {
            const dtsSource = extractTypeDeclaration(filePath);
            sourceFile = ts.createSourceFile(filePath.replace('.ts', '.d.ts'), dtsSource, ts.ScriptTarget.ES2015);
        }
        const identifiers = new Set();
        ts.forEachChild(sourceFile, (childNode) => extractIdentifiersFromNodeAndChildren(childNode, identifiers));
        identifiers.forEach(api => {
            publicIdentifiers.add(api);
        });
    }
    return publicIdentifiers;
}

exports.extractPublicIdentifiers = extractPublicIdentifiers;
