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
// `undefined` is treated as an identifier by TSC, but not part of any externs.
const blacklist = ['undefined'];
/**
 * Processes TypeScript source files and renames all identifiers that do not
 * reference the public API.
 */
class RenameInternals {
    constructor(publicApi, prefix) {
        this.publicApi = publicApi;
        this.prefix = prefix;
    }
    visitNodeAndChildren(node, context) {
        return ts.visitEachChild(this.visitNode(node), (childNode) => this.visitNodeAndChildren(childNode, context), context);
    }
    visitNode(node) {
        if (ts.isIdentifier(node)) {
            const name = node.escapedText.toString();
            if (!this.publicApi.has(name) &&
                blacklist.indexOf(node.escapedText.toString()) === -1) {
                const newIdentifier = ts.createIdentifier(this.prefix + name);
                ts.setSourceMapRange(newIdentifier, ts.getSourceMapRange(node));
                return newIdentifier;
            }
        }
        return node;
    }
}
const DEFAULT_PREFIX = '_';
/**
 * A TypeScript transformer that minifies existing source files. All identifiers
 * are minified unless listed in `config.publicIdentifiers`.
 */
function renameInternals(program, config) {
    var _a;
    const prefix = (_a = config.prefix) !== null && _a !== void 0 ? _a : DEFAULT_PREFIX;
    const renamer = new RenameInternals(config.publicIdentifiers, prefix);
    return (context) => (file) => {
        return renamer.visitNodeAndChildren(file, context);
    };
}

exports.renameInternals = renameInternals;
