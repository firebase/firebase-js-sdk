/**
 * @license
 * Copyright 2026 Google LLC
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

import { Node, SourceFile, Statement, SyntaxKind } from 'ts-morph';

/**
 * Removes top-level declarations that are not exported.
 */
export function filterTopLevelDeclarations(sourceFile: SourceFile): void {
  const exportSpecifierNames = new Set(
    sourceFile
      .getDescendantsOfKind(SyntaxKind.ExportSpecifier)
      .map(spec => spec.getName())
  );

  const statements: Statement[] = [
    ...sourceFile.getStatements(),
    ...sourceFile.getModules().flatMap(m => m.getStatements())
  ];
  const toRemove: Statement[] = [];

  for (const stmt of statements) {
    // Preserve export/import declarations (`export { Foo }`, `import { Bar }`) and assignments (`export default Foo`)
    // so barrel re-exports and module type imports are not stripped.
    const kind = stmt.getKind();
    if (
      kind === SyntaxKind.ExportDeclaration ||
      kind === SyntaxKind.ExportAssignment ||
      kind === SyntaxKind.ImportDeclaration ||
      kind === SyntaxKind.ImportEqualsDeclaration
    ) {
      continue;
    }

    const hasExport = Node.isExportable(stmt) && stmt.hasExportKeyword();
    const hasDefault = Node.isExportable(stmt) && stmt.hasDefaultKeyword();

    if (!hasExport && !hasDefault) {
      const name = Node.isNameable(stmt)
        ? stmt.getName()
        : Node.isVariableStatement(stmt)
          ? stmt.getDeclarations()[0]?.getName()
          : undefined;
      // Check if the declaration lacks an inline `export` keyword but is exported in a separate `export { Name }` block.
      if (name && exportSpecifierNames.has(name)) {
        continue;
      }
      toRemove.push(stmt);
    }
  }

  for (const node of toRemove) {
    if (node.wasForgotten()) {
      continue;
    }
    node.remove();
  }
}
