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

import * as ts from 'typescript';
import * as fs from 'fs';

let typeChecker: ts.TypeChecker;

let contents = "import { FirebaseApp } from '@firebase/app-types-exp';\n";

function main(main: string) {
  const host = ts.createCompilerHost({ emitDeclarationOnly: true });
  const program = ts.createProgram([main], { emitDeclarationOnly: true }, host);
  const sourceFile = program.getSourceFile(main)!;
  typeChecker = program.getTypeChecker();
  const printer: ts.Printer = ts.createPrinter();
  const result: ts.TransformationResult<ts.SourceFile> = ts.transform<
    ts.SourceFile
  >(sourceFile, [bundleApi]); //,  dropPrivate, dropConstructors]);
  fs.writeFileSync('/Users/mrschmidt/temp.ts', contents);
  // host.writeFile = (fileName: string, contents: string) => {
  //   console.log(contents);
  // }
  //console.log(contents);

  dropBlock2('/Users/mrschmidt/temp.ts');
  // compile(["/Users/mrschmidt/temp.ts"], {
  //   declaration: true,
  //   emitDeclarationOnly: true,
  // });
  // program.emit();
}

function dropBlock2(main: string) {
  const host = ts.createCompilerHost({ emitDeclarationOnly: true });
  const program = ts.createProgram([main], { emitDeclarationOnly: true }, host);
  const sourceFile = program.getSourceFile(main)!;
  typeChecker = program.getTypeChecker();
  const printer: ts.Printer = ts.createPrinter();
  const result: ts.TransformationResult<ts.SourceFile> = ts.transform<
    ts.SourceFile
  >(sourceFile, [dropConstructors, dropBlocks, dropPrivate]); //  first?
  const transformedSourceFile: ts.SourceFile = result.transformed[0];
  const newContent = printer.printFile(transformedSourceFile);
  result.dispose();

  console.log(newContent);
}

const bundleApi = <T extends ts.Node>(context: ts.TransformationContext) => {
  return (rootNode: T) => {
    function visit(node: ts.Node): ts.Node {
      if (ts.isSourceFile(node)) {
        const exports = getExports(node);
        for (const e of exports) {
          if ((e as any).symbol) {
            let newSumbol = typeChecker.getDeclaredTypeOfSymbol(
              (e as any).symbol
            )?.symbol;
            if (!newSumbol) {
              newSumbol = typeChecker.getAliasedSymbol((e as any).symbol);
            }
            if (newSumbol?.declarations) {
              for (let i = 0; i < newSumbol.declarations.length; ++i) {
                contents += newSumbol.declarations[i].getText();
              }
            }
          }
        }

        return ts.updateSourceFileNode(node, []);
      }

      return node;
    }
    return ts.visitNode(rootNode, visit);
  };
};

const dropBlocks = (context: ts.TransformationContext) => {
  return (rootNode: ts.SourceFile) => {
    function visit(node: ts.Node): ts.Node {
      if (ts.isBlock(node)) {
        return ts.createToken(ts.SyntaxKind.SemicolonToken);
      }
      if (ts.isHeritageClause(node)) {
        const types = node.types.filter(
          n =>
            !(n.expression as ts.Identifier).escapedText
              .toString()
              .startsWith('_')
        );

        if (types.length == 0) {
          return ts.createToken(ts.SyntaxKind.WhitespaceTrivia);
        } else {
          return ts.updateHeritageClause(node, types);
        }
      }
      if (ts.isPropertyDeclaration(node) && node.type) {
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

const dropPrivate = (context: ts.TransformationContext) => {
  return (rootNode: ts.SourceFile) => {
    function visit(node: ts.Node): ts.Node {
      if (
        ts.isMethodDeclaration(node) ||
        ts.isPropertyDeclaration(node) ||
        ts.isGetAccessor(node)
      ) {
        if (
          (node.name as ts.Identifier).escapedText.toString().startsWith('_')
        ) {
          return ts.createToken(ts.SyntaxKind.WhitespaceTrivia);
        }
      }
      if (ts.isParameter(node)) {
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

const dropConstructors = (context: ts.TransformationContext) => {
  return (rootNode: ts.SourceFile) => {
    function visit(node: ts.Node): any {
      if (ts.isConstructorDeclaration(node)) {
        for (const param of node.parameters) {
          if (
            (param.name as ts.Identifier).escapedText.toString().startsWith('_')
          ) {
            continue;
          }
          const properties: ts.Node[] = [];
          if (
            param.modifiers?.find(m => m.kind === ts.SyntaxKind.ReadonlyKeyword)
          ) {
            properties.push(
              ts.createProperty(
                param.decorators,
                param.modifiers,
                param.name as ts.Identifier,
                param.questionToken,
                param.type,
                undefined
              )
            );
            return ts.createNodeArray(properties);
          }
        }
        const tags = ts.getJSDocTags(node);
        if (tags?.find(t => t.tagName.escapedText === 'hideconstructor')) {
          return ts.createToken(ts.SyntaxKind.WhitespaceTrivia);
        }
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

function getExports(node: ts.Node): ts.ExportSpecifier[] {
  const result: ts.ExportSpecifier[] = [];
  if (ts.isExportSpecifier(node)) {
    result.push(node);
  } else {
    for (const child of node.getChildren()) {
      result.push(...getExports(child));
    }
  }
  return result;
}

main(
  '/Users/mrschmidt/GitHub/firebase/firebase-js-sdk/packages/firestore/lite/index.ts'
);
