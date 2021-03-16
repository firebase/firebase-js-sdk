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

export function getImportPathTransformer({ pattern, template }) {
  return () => ({
    before: [transformImportPath({ pattern, template })],
    after: [],
    afterDeclarations: [transformImportPath({ pattern, template })]
  });
}
/**
 * remove '-exp' in import paths.
 * For example, `import {...} from '@firebase/app-exp'` becomes `import {...} from '@firebase/app'`.
 *
 * Used to generate the release build for exp packages. We do this because we publish them
 * using the existing package names under a special release tag (e.g. firebase@exp);
 */
export const importPathTransformer = () => ({
  before: [
    transformImportPath({
      pattern: /^(@firebase.*)-exp(.*)$/g,
      template: [1, 2]
    })
  ],
  after: [],
  afterDeclarations: [
    transformImportPath({
      pattern: /^(@firebase.*)-exp(.*)$/g,
      template: [1, 2]
    })
  ]
});

function transformImportPath({ pattern, template }) {
  return context => file => {
    return visitNodeAndChildren(file, context, { pattern, template });
  };
}

function visitNodeAndChildren(node, context, { pattern, template }) {
  return ts.visitEachChild(
    visitNode(node, { pattern, template }),
    childNode =>
      visitNodeAndChildren(childNode, context, { pattern, template }),
    context
  );
}

function visitNode(node, { pattern, template }) {
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

    const captures = pattern.exec(importPath);

    if (captures) {
      const newNameFragments = [];
      for (const fragment of template) {
        if (typeof fragment === 'number') {
          newNameFragments.push(captures[fragment]);
        } else if (typeof fragment === 'string') {
          newNameFragments.push(fragment);
        } else {
          throw Error(`unrecognized fragment: ${fragment}`);
        }
      }
      const newName = newNameFragments.join('');
      const newNode = ts.getMutableClone(node);
      newNode.moduleSpecifier = ts.createLiteral(newName);
      return newNode;
    }
  }

  return node;
}
