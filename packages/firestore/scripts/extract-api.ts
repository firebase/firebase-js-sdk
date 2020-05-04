/**
 * @license
 * Copyright 2020 Google Inc.
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

// eslint-disable-next-line import/no-extraneous-dependencies
import * as ts from 'typescript';
import * as fs from 'fs';

function extractIdentifiersFromNodeAndChildren(
  node: ts.Node,
  symbols: Set<string>
): void {
  if (ts.isIdentifier(node)) {
    symbols.add(node.escapedText.toString());
  }

  ts.forEachChild(node, (childNode: ts.Node) =>
    extractIdentifiersFromNodeAndChildren(childNode, symbols)
  );
}

/**
 * Traverses TypeScript type definition files and returns the list of referenced
 * identifiers.
 */
export function extractPublicIdentifiers(filePaths: string[]): Set<string> {
  const publicIdentifiers = new Set<string>();

  for (const filePath of filePaths) {
    const contents = fs.readFileSync(filePath, { encoding: 'UTF-8' });
    const sourceFile = ts.createSourceFile(
      filePath,
      contents,
      ts.ScriptTarget.ES2015
    );

    const identifiers = new Set<string>();
    ts.forEachChild(sourceFile, (childNode: ts.Node) =>
      extractIdentifiersFromNodeAndChildren(childNode, identifiers)
    );
    identifiers.add("require");
    identifiers.add("messages");
    identifiers.forEach(api => {
      publicIdentifiers.add(api);
    });
  }

  return publicIdentifiers;
}
