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
const ASSERT_LOCATION = 'packages/firestore/src/util/assert.ts';

export function removeAsserts(
  program: ts.Program
): ts.TransformerFactory<ts.SourceFile> {
  const removeAsserts = new RemoveAsserts(program.getTypeChecker());
  return (context: ts.TransformationContext) => (file: ts.SourceFile) => {
    return removeAsserts.visitNodeAndChildren(file, context);
  };
}

/**
 * Transformer that removes all "debugAssert" statements from the SDK and
 * removes the custom message for fail() and hardAssert().
 */
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
    let updatedNode: ts.Node | null = null;

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
          declaration.getSourceFile().fileName.indexOf(ASSERT_LOCATION) >= 0
        ) {
          const method = declaration.name!.text;
          if (method === 'debugAssert') {
            updatedNode = ts.createEmptyStatement();
          } else if (method === 'hardAssert') {
            // Remove the log message but keep the assertion
            updatedNode = ts.createCall(
              declaration.name!,
              /*typeArgs*/ undefined,
              [node.arguments[0]]
            );
          } else if (method === 'fail') {
            // Remove the log message
            updatedNode = ts.createCall(
              declaration.name!,
              /*typeArgs*/ undefined,
              []
            );
          }
        }
      }
    }

    if (updatedNode) {
      ts.setSourceMapRange(updatedNode, ts.getSourceMapRange(node));
      return updatedNode;
    } else {
      return node;
    }
  }
}
