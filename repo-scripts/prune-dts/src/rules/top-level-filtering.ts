import { SourceFile, Statement, SyntaxKind } from 'ts-morph';

/**
 * Removes top-level declarations that are not exported.
 */
export function filterTopLevelDeclarations(sourceFile: SourceFile): void {
  const exportSpecifierNames = new Set(
    sourceFile
      .getDescendantsOfKind(SyntaxKind.ExportSpecifier)
      .map((spec) => spec.getName())
  );

  const statements: Statement[] = [
    ...sourceFile.getStatements(),
    ...sourceFile.getModules().flatMap((m) => m.getStatements())
  ];
  const toRemove: Statement[] = [];

  for (const stmt of statements) {
    // Preserve export/import declarations (`export { Foo }`, `import { Bar }`) and assignments (`export default Foo`)
    // so barrel re-exports and module type imports are not stripped.
    if (
      stmt.getKindName() === 'ExportDeclaration' ||
      stmt.getKindName() === 'ExportAssignment' ||
      stmt.getKindName() === 'ImportDeclaration' ||
      stmt.getKindName() === 'ImportEqualsDeclaration'
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
      // Check if the declaration lacks an inline `export` keyword but is exported in a separate `export { Name }` block.
      if (name && exportSpecifierNames.has(name)) {
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
