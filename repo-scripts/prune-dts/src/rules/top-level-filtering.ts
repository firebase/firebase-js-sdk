import { SourceFile } from 'ts-morph';

/**
 * Removes top-level declarations that are not exported.
 */
export function filterTopLevelDeclarations(sourceFile: SourceFile): void {
  const statements = sourceFile.getStatements();

  for (const stmt of statements) {
    // Keep export declarations (`export { Foo }`) and export assignments (`export default Foo`).
    if (
      stmt.getKindName() === 'ExportDeclaration' ||
      stmt.getKindName() === 'ExportAssignment'
    ) {
      continue;
    }

    // Check if the declaration itself is exported (`export class Foo`, `export interface Foo`, etc.).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (stmt as any).isExported === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(stmt as any).isExported()) {
        stmt.remove();
      }
    }
  }
}
