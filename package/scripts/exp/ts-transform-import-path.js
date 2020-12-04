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

import * as ts from 'typescript';
/**
 * remove '-exp' in import paths.
 * For example, `import {...} from '@firebase/app-exp'` becomes `import {...} from '@firebase/app'`.
 *
 * Used to generate the release build for exp packages. We do this because we publish them
 * using the existing package names under a special release tag (e.g. firebase@exp);
 */

export const importPathTransformer = () => ({
  before: [transformImportPath()],
  after: [],
  afterDeclarations: [transformImportPath()]
});

function transformImportPath() {
  return context => file => {
    return visitNodeAndChildren(file, context);
  };
}

function visitNodeAndChildren(node, context) {
  return ts.visitEachChild(
    visitNode(node),
    childNode => visitNodeAndChildren(childNode, context),
    context
  );
}

function visitNode(node) {
  let importPath;
  if (
    (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
    node.moduleSpecifier
  ) {
    const importPathWithQuotes = node.moduleSpecifier.getText();
    importPath = importPathWithQuotes.substr(
      1,
      importPathWithQuotes.length - 2
    );

    const pattern = /^(@firebase.*)-exp(.*)$/g;
    const captures = pattern.exec(importPath);

    if (captures) {
      const newName = `${captures[1]}${captures[2]}`;
      const newNode = ts.getMutableClone(node);
      newNode.moduleSpecifier = ts.createLiteral(newName);
      return newNode;
    }
  }

  return node;
}
