// eslint-disable-next-line import/no-extraneous-dependencies
import * as ts from 'typescript';

// Location of file that includes the asserts
const DECLARING_FILE = "packages/firestore/src/util/assert.ts";

export function removeAsserts(
  program: ts.Program
): ts.TransformerFactory<ts.SourceFile> {
  const removeAsserts = new RemoveAsserts(program.getTypeChecker());
  return (context: ts.TransformationContext) => (file: ts.SourceFile) => {
    return removeAsserts.visitNodeAndChildren(file, context);
  };
}

/** Transformer that removes all "asserts" and "fail" statement from the SDK. */
class RemoveAsserts {
  constructor(
    private readonly typeChecker: ts.TypeChecker,
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
    if (ts.isCallExpression(node)) {
      const signature = this.typeChecker.getResolvedSignature(node);
      if (signature && signature.declaration &&
        signature.declaration.kind === ts.SyntaxKind.FunctionDeclaration) {
        const declaration = signature.declaration as ts.FunctionDeclaration;
        if(declaration && declaration.getSourceFile().fileName.indexOf(
          DECLARING_FILE) >= 0) {
          const method = declaration.name!.text;
          if (method === 'assert') {
            return ts.createEmptyStatement();
          } else if (method === 'fail') {
            if (node.parent.kind === ts.SyntaxKind.ExpressionStatement) {
              return ts.createEmptyStatement();
            } else {
              return ts.updateCall(node, node.expression, [], []);
            }
          }
        }
      }
    }
    return node;
  }
}
