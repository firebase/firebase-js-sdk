'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var ts = require('typescript');

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
// Location of file that includes the asserts
const ASSERT_LOCATION = 'packages/firestore/src/util/assert.ts';
function removeAsserts(program) {
    const removeAsserts = new RemoveAsserts(program.getTypeChecker());
    return (context) => (file) => {
        return removeAsserts.visitNodeAndChildren(file, context);
    };
}
/**
 * Transformer that removes all "debugAssert" statements from the SDK and
 * removes the custom message for fail() and hardAssert().
 */
class RemoveAsserts {
    constructor(typeChecker) {
        this.typeChecker = typeChecker;
    }
    visitNodeAndChildren(node, context) {
        return ts.visitEachChild(this.visitNode(node), (childNode) => this.visitNodeAndChildren(childNode, context), context);
    }
    visitNode(node) {
        let updatedNode = null;
        if (ts.isCallExpression(node)) {
            const signature = this.typeChecker.getResolvedSignature(node);
            if (signature &&
                signature.declaration &&
                signature.declaration.kind === ts.SyntaxKind.FunctionDeclaration) {
                const declaration = signature.declaration;
                if (declaration &&
                    declaration.getSourceFile().fileName.indexOf(ASSERT_LOCATION) >= 0) {
                    const method = declaration.name.text;
                    if (method === 'debugAssert') {
                        updatedNode = ts.createEmptyStatement();
                    }
                    else if (method === 'hardAssert') {
                        // Remove the log message but keep the assertion
                        updatedNode = ts.createCall(declaration.name, 
                        /*typeArgs*/ undefined, [node.arguments[0]]);
                    }
                    else if (method === 'fail') {
                        // Remove the log message
                        updatedNode = ts.createCall(declaration.name, 
                        /*typeArgs*/ undefined, []);
                    }
                }
            }
        }
        if (updatedNode) {
            ts.setSourceMapRange(updatedNode, ts.getSourceMapRange(node));
            return updatedNode;
        }
        else {
            return node;
        }
    }
}

exports.removeAsserts = removeAsserts;
