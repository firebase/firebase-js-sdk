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
import * as fs from 'fs';

// Location of file that includes the logging
const LOG_LOCATION = 'packages/firestore/src/util/log.ts';

export function removeLogging(
  program: ts.Program
): ts.TransformerFactory<ts.SourceFile> {
  const removeLogging = new RemoveLogging(program.getTypeChecker());
  return (context: ts.TransformationContext) => (file: ts.SourceFile) => {
    const messages  = require('./log-messages.json').messages || [];
    const result =  removeLogging.visitNodeAndChildren(file, context, messages);
    fs.writeFileSync("./log-messages.json", JSON.stringify({messages}));
    return result;
  };
}

/**
 * Transformer that removes all "debugAssert" statements from the SDK and
 * removes the custom message for fail() and hardAssert().
 */
class RemoveLogging {

  constructor(private readonly typeChecker: ts.TypeChecker) {

  }

  visitNodeAndChildren<T extends ts.Node>(
    node: T,
    context: ts.TransformationContext,
    messages: string[]
  ): T {
    return ts.visitEachChild(
      this.visitNode(node, messages),
      (childNode: ts.Node) => this.visitNodeAndChildren(childNode, context, messages),
      context
    ) as T;
  }

  visitNode(node: ts.Node, messages: string[]): ts.Node {
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
          declaration.getSourceFile().fileName.indexOf(LOG_LOCATION) >= 0
        ) {
          const method = declaration.name!.text;
          if (method === 'logDebug' && ts.isStringLiteralLike(node.arguments[1])) {
            let index = messages.indexOf((node.arguments[1] as ts.StringLiteral).text);
            if (index == -1) {
              messages.push((node.arguments[1] as ts.StringLiteral).text);
              index = messages.length = -1;
            }
            return ts.createCall(declaration.name!, /*typeArgs*/ undefined, [
              node.arguments[0], ts.createLiteral(index), ...node.arguments.slice(2)
            ]);
          } else if (method === 'logDebug' && ts.isNoSubstitutionTemplateLiteral(node.arguments[1])) {
            let index = messages.indexOf((node.arguments[1] as ts.NoSubstitutionTemplateLiteral).text);
            if (index == -1) {
              messages.push((node.arguments[1] as ts.NoSubstitutionTemplateLiteral).text);
              index = messages.length = -1;
            }
            return ts.createCall(declaration.name!, /*typeArgs*/ undefined, [
              node.arguments[0], ts.createLiteral(index), ...node.arguments.slice(2)
            ]);
          }
        }
      }
    }
    return node;
  }
}
