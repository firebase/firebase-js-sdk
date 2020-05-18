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

// `undefined` is treated as an identifier by TSC, but not part of any externs.
const blacklist = ['undefined'];

/**
 * Processes TypeScript source files and renames all identifiers that do not
 * reference the public API.
 */
class RenameInternals {
  constructor(
    private readonly publicApi: Set<string>,
    private readonly prefix: string
  ) {}

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
    if (ts.isIdentifier(node)) {
      const name = node.escapedText.toString();
      if (
        !this.publicApi.has(name) &&
        blacklist.indexOf(node.escapedText.toString()) === -1
      ) {
        const newIdentifier = ts.createIdentifier(this.prefix + name);
        ts.setSourceMapRange(newIdentifier, ts.getSourceMapRange(node));
        return newIdentifier;
      }
    }

    return node;
  }
}

const DEFAULT_PREFIX = '_';

export interface SDKMinifierOptions {
  /** List of identifiers that are not to be minified. */
  publicIdentifiers: Set<string>;
  /**
   * A prefix to append to all identifiers that are not referencing the Public
   * API. Defauls to '_'.
   */
  prefix?: string;
}

/**
 * A TypeScript transformer that minifies existing source files. All identifiers
 * are minified unless listed in `config.publicIdentifiers`.
 */
export function renameInternals(
  program: ts.Program,
  config: SDKMinifierOptions
): ts.TransformerFactory<ts.SourceFile> {
  const prefix = config.prefix ?? DEFAULT_PREFIX;

  const renamer = new RenameInternals(config.publicIdentifiers, prefix);
  return (context: ts.TransformationContext) => (file: ts.SourceFile) => {
    return renamer.visitNodeAndChildren(file, context);
  };
}
