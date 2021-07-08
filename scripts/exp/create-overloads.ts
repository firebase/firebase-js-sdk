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
import * as fs from 'fs';

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
    append: {
      alias: 'a',
      type: 'boolean',
      default: false
    },
    replace: {
      alias: 'r',
      type: 'array',
      require: true,
      describe: 'Use [match]:[replacement] format. e.g. -r Auth:AuthCompat'
    },
    moduleToEnhance: {
      type: 'string',
      require: true
    }
  })
  .coerce('replace', (args: string[]) => {
    return args.map(arg => {
      const [match, replacement] = arg.split(':');
      return {
        match,
        replacement
      };
    });
  })
  .help().argv;

interface Options {
  input: string;
  output: string;
  append: boolean;
  replace: ReplaceOption[];
  moduleToEnhance: string;
}

interface ReplaceOption {
  match: string;
  replacement: string;
}

function createOverloads({
  input,
  output,
  append,
  replace,
  moduleToEnhance
}: Options) {
  const compilerOptions = {};
  const host = ts.createCompilerHost(compilerOptions);
  const program = ts.createProgram([input], compilerOptions, host);
  const printer: ts.Printer = ts.createPrinter();
  const sourceFile = program.getSourceFile(input)!;

  const result = ts.transform<ts.SourceFile>(sourceFile, [
    keepPublicFunctionsTransformer.bind(
      undefined,
      program,
      replace,
      moduleToEnhance
    )
  ]);

  const transformedSourceFile = result.transformed[0];
  const content = printer.printFile(transformedSourceFile);

  // if append, append to the output file
  if (append) {
    if (!fs.existsSync(output)) {
      throw Error(
        `${output} doesn't exist. Please provide path to an existing file when using the -a option`
      );
    }
    const stat = fs.statSync(output);
    if (!stat.isFile()) {
      throw Error(
        `${output} is not a file. Please provide path to an existing file when using the -a option`
      );
    }

    fs.appendFileSync(output, `\n${content}`);
  } else {
    fs.writeFileSync(output, content);
  }
}

function keepPublicFunctionsTransformer(
  program: ts.Program,
  replace: ReplaceOption[],
  moduleNameToEnhance: string,
  context: ts.TransformationContext
): ts.Transformer<ts.SourceFile> {
  return (sourceFile: ts.SourceFile) => {
    const typeChecker = program.getTypeChecker();
    const overloads: ts.Statement[] = [];
    function visit(node: ts.Node): ts.Node {
      if (ts.isFunctionDeclaration(node)) {
        // return early if the function doesn't have any parameter of the type we are looking for
        if (
          !node.parameters.find(param => {
            if (param.type && ts.isTypeReferenceNode(param.type)) {
              const typeName = param.type.typeName;
              return replace.find(opt => typeName.getText() === opt.match);
            }
            return false;
          })
        ) {
          return ts.createToken(ts.SyntaxKind.WhitespaceTrivia);
        }

        const newParameters = node.parameters.map(param => {
          if (param.type && ts.isTypeReferenceNode(param.type)) {
            for (const replaceOption of replace) {
              if (
                param.type.typeName.getText(sourceFile) === replaceOption.match
              ) {
                return ts.updateParameter(
                  param,
                  param.decorators,
                  param.modifiers,
                  param.dotDotDotToken,
                  param.name,
                  param.questionToken,
                  ts.createTypeReferenceNode(
                    replaceOption.replacement,
                    param.type.typeArguments
                  ),
                  param.initializer
                );
              }
            }
          }

          return param;
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

    const typesToImport: Set<string> = new Set();
    // find types referenced in overloads. we need to import them.
    for (const overload of overloads) {
      findTypes(typeChecker, overload, transformed, typesToImport, [
        ...replace.map(opt => opt.replacement)
      ]);
    }

    // hardcode adding `import { FirebaseApp as FirebaseAppCompat } from '@firebase/app-compat'`
    const appCompatImport = ts.createImportDeclaration(
      undefined,
      undefined,
      ts.createImportClause(
        undefined,
        ts.createNamedImports([
          ts.createImportSpecifier(
            ts.createIdentifier('FirebaseApp'),
            ts.createIdentifier('FirebaseAppCompat')
          )
        ])
      ),
      ts.createLiteral('@firebase/app-compat')
    );

    const importStatement = ts.createImportDeclaration(
      undefined,
      undefined,
      ts.createImportClause(
        undefined,
        ts.createNamedImports(
          Array.from(typesToImport).map(typeName =>
            ts.createImportSpecifier(undefined, ts.createIdentifier(typeName))
          )
        )
      ),
      ts.createLiteral(moduleNameToEnhance)
    );
    const moduleToEnhance = ts.createModuleDeclaration(
      undefined,
      [ts.createModifier(ts.SyntaxKind.DeclareKeyword)],
      ts.createStringLiteral(moduleNameToEnhance),
      ts.createModuleBlock(overloads)
    );

    return ts.updateSourceFileNode(transformed, [
      appCompatImport,
      importStatement,
      moduleToEnhance
    ]);
  };
}

// TODO: generate the builtin types from externs, similar to packages/firestore/externs.json
const BUILTIN_TYPES = [
  'string',
  'number',
  'boolean',
  'unknown',
  'any',
  'void',
  'null',
  'undefined',
  'never',
  'Object',
  'object',
  'Promise',
  'ReadableStream',
  'Uint8Array',
  'ArrayBuffer',
  'Partial',
  'Blob',
  'ServiceWorkerRegistration',
  'Record',
  'Error'
];

// find all types (except for the built-ins and primitives) referenced in the function declaration
function findTypes(
  typeCheck: ts.TypeChecker,
  node: ts.Node,
  sourceFile: ts.SourceFile,
  types: Set<string>,
  excludes: string[] = []
): void {
  const typesToIgnore = [...BUILTIN_TYPES, ...excludes];

  function findTypesRecursively(node: ts.Node): void {
    if (ts.isTypeReferenceNode(node)) {
      let typeName = node.typeName.getText(sourceFile);
      if (ts.isIdentifier(node.typeName)) {
        typeName = node.typeName.text;
      }

      // include the type if it's not in the excludes list or a builtin type
      if (!typesToIgnore.includes(typeName)) {
        const symbol = typeCheck.getSymbolAtLocation(node.typeName);
        const declaration = symbol?.declarations
          ? symbol.declarations[0]
          : undefined;

        // ignore type parameters.
        if (!declaration || !ts.isTypeParameterDeclaration(declaration)) {
          types.add(typeName);
        }
      }
    }

    ts.forEachChild(node, findTypesRecursively);
  }

  findTypesRecursively(node);
}

createOverloads(argv as Options);
