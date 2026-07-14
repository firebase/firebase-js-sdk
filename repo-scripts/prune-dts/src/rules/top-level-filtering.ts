import { Node, SourceFile, Statement, SyntaxKind } from 'ts-morph';

/**
 * Removes top-level declarations that are not exported.
 */
export function filterTopLevelDeclarations(sourceFile: SourceFile): void {
  const statements: Statement[] = [
    ...sourceFile.getStatements(),
    ...sourceFile.getModules().flatMap((m) => m.getStatements())
  ];
  const toRemove: Statement[] = [];

  for (const stmt of statements) {
    if (
      stmt.getKindName() === 'ExportDeclaration' ||
      stmt.getKindName() === 'ExportAssignment'
    ) {
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hasExport = typeof (stmt as any).hasExportKeyword === 'function' && (stmt as any).hasExportKeyword();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hasDefault = typeof (stmt as any).hasDefaultKeyword === 'function' && (stmt as any).hasDefaultKeyword();

    if (!hasExport && !hasDefault) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const name = typeof (stmt as any).getName === 'function' ? (stmt as any).getName() : null;
      if (name && isNameInExportDeclarations(name, sourceFile)) {
        continue;
      }
      toRemove.push(stmt);
    }
  }

  for (const node of toRemove) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (node as any).wasForgotten === 'function' && (node as any).wasForgotten()) {
      continue;
    }
    node.remove();
  }
}

function isNameInExportDeclarations(name: string, sourceFile: SourceFile): boolean {
  const exportSpecs = sourceFile.getDescendantsOfKind(SyntaxKind.ExportSpecifier);
  for (const spec of exportSpecs) {
    if (spec.getName() === name) {
      return true;
    }
  }
  return false;
}
