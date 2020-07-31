'use strict';
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
 */ exports.__esModule = true;
exports.renameInternals = void 0;
var ts = require('typescript');
var blacklist = ['undefined'];
var RenameInternals = (function () {
  function RenameInternals(publicApi, prefix) {
    this.publicApi = publicApi;
    this.prefix = prefix;
  }
  RenameInternals.prototype.visitNodeAndChildren = function (node, context) {
    var _this = this;
    return ts.visitEachChild(
      this.visitNode(node),
      function (childNode) {
        return _this.visitNodeAndChildren(childNode, context);
      },
      context
    );
  };
  RenameInternals.prototype.visitNode = function (node) {
    if (ts.isIdentifier(node)) {
      var name_1 = node.escapedText.toString();
      if (
        !this.publicApi.has(name_1) &&
        blacklist.indexOf(node.escapedText.toString()) === -1
      ) {
        var newIdentifier = ts.createIdentifier(this.prefix + name_1);
        ts.setSourceMapRange(newIdentifier, ts.getSourceMapRange(node));
        return newIdentifier;
      }
    }
    return node;
  };
  return RenameInternals;
})();
var DEFAULT_PREFIX = '_';
function renameInternals(program, config) {
  var _a;
  var prefix =
    (_a = config.prefix) !== null && _a !== void 0 ? _a : DEFAULT_PREFIX;
  var renamer = new RenameInternals(config.publicIdentifiers, prefix);
  return function (context) {
    return function (file) {
      return renamer.visitNodeAndChildren(file, context);
    };
  };
}
exports.renameInternals = renameInternals;
