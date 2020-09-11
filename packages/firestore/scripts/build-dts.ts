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

import * as yargs from 'yargs';
import * as ts from 'typescript';
import * as fs from 'fs';

const PREAMBLE = `
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
 
import { FirebaseApp } from '@firebase/app-types-exp';
`;

function main(input: string, output: string) {
  const compilerOptions = {};
  const host = ts.createCompilerHost(compilerOptions);
  const program = ts.createProgram([input], compilerOptions, host);
  const typeChecker = program.getTypeChecker();
  const printer: ts.Printer = ts.createPrinter();

  const sourceFile = program.getSourceFile(input)!;
  const result: ts.TransformationResult<ts.SourceFile> = ts.transform<
    ts.SourceFile
  >(sourceFile, [bundleExports.bind(null, typeChecker), dropPrivateApis]);
  const transformedSourceFile: ts.SourceFile = result.transformed[0];
  const content = printer.printFile(transformedSourceFile);
  console.log(content);
  fs.writeFileSync(output, content);
}

const bundleExports = (typeChecker: ts.TypeChecker) => {
  return (node: ts.SourceFile) => {
    let contents = PREAMBLE;
    const exportSpecifiers = getExportSpecifiers(node);
    for (const exportSpecifier of exportSpecifiers) {
      const symbol = (exportSpecifier as any).symbol;
      if (symbol) {
        let aliasedSymbol = typeChecker.getAliasedSymbol(symbol);
        contents += aliasedSymbol?.declarations.map(n => n.getText());
      }
    }
    return ts.createSourceFile(
      'indexdd.ts',
      contents,
      ts.ScriptTarget.Latest,
      /* setParentNodes= */ true
    );
  };
};

function isPrivate(name: ts.Identifier): boolean {
  return name.escapedText.toString().startsWith('_');
}

function isReadonly(param: ts.ParameterDeclaration): boolean {
  return !!param.modifiers?.find(m => m.kind === ts.SyntaxKind.ReadonlyKeyword);
}

function findFirstTag(node: ts.Node, tag: string): ts.JSDocTag | undefined {
  return ts.getJSDocTags(node)?.find(t => t.tagName.escapedText === tag);
}

const dropPrivateApis = (context: ts.TransformationContext) => {
  return (rootNode: ts.SourceFile) => {
    function visit(node: ts.Node): any {
      if (ts.isConstructorDeclaration(node)) {
        const replacementNodes: ts.Node[] = [];

        for (const param of node.parameters) {
          if (isReadonly(param) && !isPrivate(param.name as ts.Identifier)) {
            replacementNodes.push(
              ts.createProperty(
                param.decorators,
                param.modifiers,
                param.name as ts.Identifier,
                param.questionToken,
                param.type,
                /* initializer= */ undefined
              )
            );
          }
        }

        const hideConstructorTag = findFirstTag(node, 'hideconstructor');
        if (hideConstructorTag) {
          const modifier = ts.createModifier(
            hideConstructorTag.comment === 'protected'
              ? ts.SyntaxKind.ProtectedKeyword
              : ts.SyntaxKind.PrivateKeyword
          );
          replacementNodes.push(
            ts.updateConstructor(
              node,
              node.decorators,
              [modifier],
              /*parameters=*/ [],
              /* body= */ undefined
            )
          );
        } else {
          replacementNodes.push(
            ts.updateConstructor(
              node,
              node.decorators,
              node.modifiers,
              node.parameters,
              /* body= */ undefined
            )
          );
        }

        return ts.createNodeArray(replacementNodes);
      } else if (ts.isBlock(node)) {
        return ts.createToken(ts.SyntaxKind.SemicolonToken);
      } else if (ts.isHeritageClause(node)) {
        const types = node.types.filter(
          t => !isPrivate(t.expression as ts.Identifier)
        );
        if (types.length == 0) {
          return ts.createToken(ts.SyntaxKind.WhitespaceTrivia);
        } else {
          return ts.updateHeritageClause(node, types);
        }
      } else if (ts.isPropertyDeclaration(node)) {
        if (isPrivate(node.name as ts.Identifier)) {
          return ts.createToken(ts.SyntaxKind.WhitespaceTrivia);
        } else if (node.type) {
          // drop initializer if type is specified
          return ts.updateProperty(
            node,
            node.decorators,
            node.modifiers,
            node.name,
            node.questionToken ?? node.exclamationToken,
            node.type,
            undefined
          );
        }
      } else if (ts.isMethodDeclaration(node) || ts.isGetAccessor(node)) {
        if (isPrivate(node.name as ts.Identifier)) {
          return ts.createToken(ts.SyntaxKind.WhitespaceTrivia);
        }
      } else if (ts.isParameter(node)) {
        return ts.updateParameter(
          node,
          node.decorators,
          node.modifiers,
          node.dotDotDotToken,
          node.name,
          node.questionToken,
          node.type,
          undefined
        );
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
    return visitNodeAndChildren(rootNode);
  };
};

function getExportSpecifiers(node: ts.Node): ts.ExportSpecifier[] {
  const result: ts.ExportSpecifier[] = [];
  if (ts.isExportSpecifier(node)) {
    result.push(node);
  } else {
    for (const child of node.getChildren()) {
      result.push(...getExportSpecifiers(child));
    }
  }
  return result;
}

// const argv = yargs.options({
//   input: {
//     type: 'string',
//     demandOption: true,
//     desc: 'The location of the index.ts file'
//   },
//   output: {
//     type: 'string',
//     demandOption: true,
//     desc: 'The location for the index.d.ts file'
//   }
// }).argv;

main('lite/index.ts', 'lite-types/index.d.ts');
