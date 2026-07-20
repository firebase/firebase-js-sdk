import { SourceFile, SyntaxKind } from 'ts-morph';

/**
 * Removes members whose names start with an underscore from classes and interfaces.
 * Strips properties, methods, getters, and setters, while leaving constructor parameter
 * identifiers untouched.
 */
export function stripPrivateMembers(sourceFile: SourceFile): void {
  const classes = sourceFile.getDescendantsOfKind(SyntaxKind.ClassDeclaration);
  for (const cls of classes) {
    for (const prop of cls.getProperties()) {
      if (prop.getName().startsWith('_')) {
        prop.remove();
      }
    }
    for (const method of cls.getMethods()) {
      if (method.getName().startsWith('_')) {
        method.remove();
      }
    }
    for (const getAcc of cls.getGetAccessors()) {
      if (getAcc.getName().startsWith('_')) {
        getAcc.remove();
      }
    }
    for (const setAcc of cls.getSetAccessors()) {
      if (setAcc.getName().startsWith('_')) {
        setAcc.remove();
      }
    }
  }

  const interfaces = sourceFile.getDescendantsOfKind(
    SyntaxKind.InterfaceDeclaration
  );
  for (const iface of interfaces) {
    for (const prop of iface.getProperties()) {
      if (prop.getName().startsWith('_')) {
        prop.remove();
      }
    }
    for (const method of iface.getMethods()) {
      if (method.getName().startsWith('_')) {
        method.remove();
      }
    }
  }
}
