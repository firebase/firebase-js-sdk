"use strict";
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
exports.removeAsserts = void 0;
var ts = require("typescript");
// Location of file that includes the asserts
var ASSERT_LOCATION = 'packages/firestore/src/util/assert.ts';
function removeAsserts(program) {
    var removeAsserts = new RemoveAsserts(program.getTypeChecker());
    return function (context) { return function (file) {
        return removeAsserts.visitNodeAndChildren(file, context);
    }; };
}
exports.removeAsserts = removeAsserts;
/**
 * Transformer that removes all "debugAssert" statements from the SDK and
 * removes the custom message for fail() and hardAssert().
 */
var RemoveAsserts = /** @class */ (function () {
    function RemoveAsserts(typeChecker) {
        this.typeChecker = typeChecker;
    }
    RemoveAsserts.prototype.visitNodeAndChildren = function (node, context) {
        var _this = this;
        return ts.visitEachChild(this.visitNode(node), function (childNode) { return _this.visitNodeAndChildren(childNode, context); }, context);
    };
    RemoveAsserts.prototype.visitNode = function (node) {
        var updatedNode = null;
        if (ts.isCallExpression(node)) {
            var signature = this.typeChecker.getResolvedSignature(node);
            if (signature &&
                signature.declaration &&
                signature.declaration.kind === ts.SyntaxKind.FunctionDeclaration) {
                var declaration = signature.declaration;
                if (declaration &&
                    declaration.getSourceFile().fileName.indexOf(ASSERT_LOCATION) >= 0) {
                    var method = declaration.name.text;
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
    };
    return RemoveAsserts;
}());
