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

import * as path from 'path';
import { SourceFile, SyntaxKind } from 'ts-morph';

/**
 * Deduplicates declarations (classes, interfaces, type aliases, enums) that are
 * already exported by another public entry point (`otherExportFileLocations`).
 * For multi-entry point packages (e.g., `firestore/lite` vs `firestore`), duplicate
 * declarations are replaced with a type-only import from the companion bundle.
 */
export function deduplicateCrossFileExports(
  sourceFile: SourceFile,
  otherExportFileLocations: string[] = []
): void {
  if (otherExportFileLocations.length === 0) {
    return;
  }

  const project = sourceFile.getProject();
  const externalSymbols = new Map<string, string>(); // symbolName -> relative import path

  // Map symbols exported by companion bundles to their relative import path
  for (const otherFilePath of otherExportFileLocations) {
    const absPath = path.resolve(otherFilePath);
    let otherFile = project.getSourceFile(absPath);
    if (!otherFile) {
      try {
        otherFile = project.addSourceFileAtPath(absPath);
      } catch {
        continue;
      }
    }

    const exportedDecls = otherFile.getExportedDeclarations();
    let relPath = path.relative(
      path.dirname(sourceFile.getFilePath()),
      otherFile.getFilePath()
    );
    if (!relPath.startsWith('.')) {
      relPath = `./${relPath}`;
    }
    relPath = relPath.replace(/\.d\.ts$/, '').replace(/\.ts$/, '');

    for (const [name] of exportedDecls) {
      externalSymbols.set(name, relPath);
    }
  }

  if (externalSymbols.size === 0) {
    return;
  }

  const statements = sourceFile.getStatements();
  const importsToAdd: Array<{ name: string; moduleSpecifier: string }> = [];
  const toRemove: typeof statements = [];

  for (const stmt of statements) {
    const kind = stmt.getKind();
    if (
      kind === SyntaxKind.ClassDeclaration ||
      kind === SyntaxKind.InterfaceDeclaration ||
      kind === SyntaxKind.TypeAliasDeclaration ||
      kind === SyntaxKind.EnumDeclaration
    ) {
      const name = (stmt as { getName?: () => string | undefined }).getName?.();
      if (name && externalSymbols.has(name)) {
        const moduleSpecifier = externalSymbols.get(name)!;
        importsToAdd.push({ name, moduleSpecifier });
        toRemove.push(stmt);
      }
    }
  }

  for (const stmt of toRemove) {
    if (stmt.wasForgotten()) {
      continue;
    }
    stmt.remove();
  }

  // Add individual type imports right at the top of the file in order of occurrence
  for (let i = importsToAdd.length - 1; i >= 0; i--) {
    const { name, moduleSpecifier } = importsToAdd[i];
    sourceFile.insertImportDeclaration(0, {
      isTypeOnly: true,
      namedImports: [name],
      moduleSpecifier
    });
  }
}
