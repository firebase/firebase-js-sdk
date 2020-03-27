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

// eslint-disable-next-line import/no-extraneous-dependencies
import * as ts from 'typescript';

// Location of file that includes the asserts
const DECLARING_FILE = 'packages/firestore/src/util/assert.ts';

export function removeAsserts(
  program: ts.Program
): ts.TransformerFactory<ts.SourceFile> {
  const removeAsserts = new RemoveAsserts(program.getTypeChecker());
  return (context: ts.TransformationContext) => (file: ts.SourceFile) => {
    return removeAsserts.visitNodeAndChildren(file, context);
  };
}

/** Transformer that removes all "asserts" and "fail" statement from the SDK. */
class RemoveAsserts {
  constructor(private readonly typeChecker: ts.TypeChecker) {}

  visitNodeAndChildren<T extends ts.Node>(
    node: T,
    context: ts.TransformationContext
  ): T {
    return ts.visitEachChild(
      this.visitNode(node),
      (childNode: ts.Node) => this.visitNodeAndChildren(childNode, context),
      context
    ) as T;
  }

  visitNode(node: ts.Node): ts.Node {
    if (ts.isCallExpression(node)) {
      const signature = this.typeChecker.getResolvedSignature(node);
      if (
        signature &&
        signature.declaration &&
        signature.declaration.kind === ts.SyntaxKind.FunctionDeclaration
      ) {
        const declaration = signature.declaration as ts.FunctionDeclaration;
        if (
          declaration &&
          declaration.getSourceFile().fileName.indexOf(DECLARING_FILE) >= 0
        ) {
          const method = declaration.name!.text;
          if (method === 'assert') {
            return ts.createEmptyStatement();
          } else if (method === 'fail') {
            if (node.parent.kind === ts.SyntaxKind.ExpressionStatement) {
              return ts.createEmptyStatement();
            } else {
              return ts.updateCall(node, node.expression, [], []);
            }
          }
        }
      }
    }
    return node;
  }
}
