/**
 * @license
 * Copyright 2021 Google LLC
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

import * as yargs from 'yargs';
import * as ts from 'typescript';
import { fs } from 'mz';

/**
 * TODO:
 *  - accept an array of (match, replacement)
 *  - import types from the source d.ts
 */
const argv = yargs
  .options({
    input: {
      alias: 'i',
      type: 'string',
      require: true
    },
    output: {
      alias: 'o',
      default: 'out.d.ts'
    },
    match: {
      alias: 'm',
      type: 'string',
      require: true
    },
    replacement: {
      alias: 'r',
      type: 'string',
      require: true
    },
    moduleToEnhance: {
      type: 'string',
      require: true
    }
  })
  .help().argv;

interface Options {
  input: string;
  output: string;
  match: string;
  replacement: string;
  moduleToEnhance: string;
}

function createOverloads({
  input,
  output,
  match,
  replacement,
  moduleToEnhance
}: Options) {
  console.log('create over loads');
  const compilerOptions = {};
  const host = ts.createCompilerHost(compilerOptions);
  const program = ts.createProgram([input], compilerOptions, host);
  const printer: ts.Printer = ts.createPrinter();
  const sourceFile = program.getSourceFile(input)!;

  const overloads: ts.Statement[] = [];

  const result = ts.transform<ts.SourceFile>(sourceFile, [
    keepPublicFunctionsTransformer.bind(
      undefined,
      match,
      replacement,
      moduleToEnhance,
      overloads
    )
  ]);

  const transformedSourceFile = result.transformed[0];
  const content = printer.printFile(transformedSourceFile);

  fs.writeFileSync(output, content);
}

function keepPublicFunctionsTransformer(
  match: string,
  replacement: string,
  moduleNameToEnhance: string,
  overloads: ts.Statement[],
  context: ts.TransformationContext
): ts.Transformer<ts.SourceFile> {
  return (sourceFile: ts.SourceFile) => {
    function visit(node: ts.Node): ts.Node {
      if (ts.isFunctionDeclaration(node)) {
        // return early if the function doesn't have any parameter of the type we are looking for
        if (
          !node.parameters.find(param => {
            return param.type && param.type.getText(sourceFile) === match;
          })
        ) {
          return ts.createToken(ts.SyntaxKind.WhitespaceTrivia);
        }

        const variableDecl = ts.createSourceFile(
          'tmp.ts',
          `let a:${replacement}`,
          ts.ScriptTarget.ES2015
        ).statements[0] as ts.VariableStatement;
        const typeNode = variableDecl.declarationList.declarations[0].type;
        const newParameters = node.parameters.map(param => {
          if (param.type && param.type.getText(sourceFile) === match) {
            return ts.updateParameter(
              param,
              param.decorators,
              param.modifiers,
              param.dotDotDotToken,
              param.name,
              param.questionToken,
              typeNode,
              param.initializer
            );
          } else {
            return param;
          }
        });

        // remove comments
        ts.setTextRange(node, {
          pos: node.getStart(sourceFile),
          end: node.getEnd()
        });

        overloads.push(
          ts.updateFunctionDeclaration(
            node,
            node.decorators,
            [],
            node.asteriskToken,
            node.name,
            node.typeParameters,
            newParameters,
            node.type,
            node.body
          )
        );
      }

      // remove all nodes other than the source file itself
      if (!ts.isSourceFile(node)) {
        return ts.createToken(ts.SyntaxKind.WhitespaceTrivia);
      }

      return node;
    }

    function visitNodeAndChildren<T extends ts.Node>(node: T): T {
      return ts.visitEachChild(
        visit(node),
        childNode => visitNodeAndChildren(childNode),
        context
      ) as T;
    }

    const transformed = visitNodeAndChildren(sourceFile);
    const moduleToEnhance = ts.createModuleDeclaration(
      undefined,
      [ts.createModifier(ts.SyntaxKind.DeclareKeyword)],
      ts.createStringLiteral(moduleNameToEnhance),
      ts.createModuleBlock(overloads)
    );

    return ts.updateSourceFileNode(transformed, [moduleToEnhance]);
  };
}

createOverloads(argv);
