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
 */Object.defineProperty(exports,"__esModule",{value:true});exports.removeAsserts=removeAsserts;var ts=require("typescript");var ASSERT_LOCATION="packages/firestore/src/util/assert.ts";function removeAsserts(program){var removeAsserts=new RemoveAsserts(program.getTypeChecker());return function(context){return function(file){return removeAsserts.visitNodeAndChildren(file,context)}}}var RemoveAsserts=function(){function RemoveAsserts(typeChecker){this.typeChecker=typeChecker}RemoveAsserts.prototype.visitNodeAndChildren=function(node,context){var _this=this;return ts.visitEachChild(this.visitNode(node),(function(childNode){return _this.visitNodeAndChildren(childNode,context)}),context)};RemoveAsserts.prototype.visitNode=function(node){var updatedNode=null;if(ts.isCallExpression(node)){var signature=this.typeChecker.getResolvedSignature(node);if(signature&&signature.declaration&&signature.declaration.kind===ts.SyntaxKind.FunctionDeclaration){var declaration=signature.declaration;if(declaration&&declaration.getSourceFile().fileName.indexOf(ASSERT_LOCATION)>=0){var method=declaration.name.text;if(method==="debugAssert"){updatedNode=ts.factory.createOmittedExpression()}else if(method==="hardAssert"){updatedNode=ts.factory.createCallExpression(declaration.name,undefined,node.arguments.filter((function(value){return!ts.isStringLiteral(value)})))}else if(method==="fail"){updatedNode=ts.factory.createCallExpression(declaration.name,undefined,node.arguments.filter((function(value){return!ts.isStringLiteral(value)})))}}}}if(updatedNode){ts.setSourceMapRange(updatedNode,ts.getSourceMapRange(node));return updatedNode}else{return node}};return RemoveAsserts}();