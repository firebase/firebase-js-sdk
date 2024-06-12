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

import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import * as ts from 'typescript';

// Location of file that includes the asserts
const ASSERT_LOCATION = 'packages/firestore/src/util/assert.ts';
const ERROR_CODE_LOCATION = '../dist/error_codes.json';

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
 * replaces the custom message for fail() and hardAssert() with shorter
 * error codes
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
            updatedNode = ts.createOmittedExpression();
          } else if ((method === 'hardAssert') || (method === 'fail')) {
            const messageIndex = (method === 'hardAssert') ? 1 : 0;
            if ((node.arguments.length > messageIndex) && (node.arguments[messageIndex].kind === ts.SyntaxKind.StringLiteral)) {
              const stringLiteral: ts.StringLiteral = node.arguments[messageIndex] as ts.StringLiteral;
              const errorMessage = RemoveAsserts.trimErrorMessage(stringLiteral.getFullText());
              const errorCode = RemoveAsserts.errorCode(errorMessage);

              try {
                RemoveAsserts.saveErrorCode(errorCode, errorMessage);
              }
              catch (e) {
                console.log('Failed to save error code ' + JSON.stringify(e));
              }
              const newArguments = [...node.arguments];
              newArguments[messageIndex] = ts.createLiteral(errorCode);

              // Replace the call with the full error message to a
              // build with an error code
              updatedNode = ts.createCall(
                declaration.name!,
                /*typeArgs*/ undefined,
                newArguments
              );
            } else {
              const newArguments = [...node.arguments];
              newArguments[messageIndex] = ts.createLiteral('Unexpected error');
              // Remove the log message but keep the assertion
              updatedNode = ts.createCall(
                declaration.name!,
                /*typeArgs*/ undefined,
                newArguments
              );
            }
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

  static trimErrorMessage(errorMessage: string): string {
    return errorMessage.substring(
      errorMessage.indexOf("'") + 1,
      errorMessage.lastIndexOf("'"));
  }

  static errorCode(errorMessage: string): string {
    // Create a sha256 hash from the parameter names and types.
    const hash = createHash('sha256');
    hash.update(errorMessage);

    // Use the first 7 characters of the hash for a more compact code.
    const paramHash = hash.digest('hex').substring(0, 7);

    return paramHash;
  }

  static saveErrorCode(errorCode: string, errorMessage: string): void {
    const errorCodes = RemoveAsserts.getErrorCodes();
    errorCodes[errorCode] = errorMessage;
    RemoveAsserts.saveErrorCodes(errorCodes);
  }

  static getErrorCodes(): Record<string, string> {
    const path = join(module.path, ERROR_CODE_LOCATION);
    if (!existsSync(path)){
      return {};
    }
    return JSON.parse(readFileSync(path, 'utf-8'));
  }

  static saveErrorCodes(errorCodes: Record<string, string>): void {
    const path = join(module.path, ERROR_CODE_LOCATION);
    writeFileSync(path, JSON.stringify(errorCodes, undefined, 4), {encoding: "utf-8", });
  }
}
