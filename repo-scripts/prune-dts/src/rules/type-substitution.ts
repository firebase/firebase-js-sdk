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

import {
  ClassDeclaration,
  InterfaceDeclaration,
  Node,
  SourceFile,
  SyntaxKind,
  TypeAliasDeclaration
} from 'ts-morph';

/**
 * Substitutes references to unexported internal types across public signatures
 * with their closest exported subclass, superclass, or resolved type alias.
 */
export function substitutePrivateTypeReferences(sourceFile: SourceFile): void {
  const exportSpecifierNames = new Set(
    sourceFile
      .getDescendantsOfKind(SyntaxKind.ExportSpecifier)
      .map(spec => spec.getName())
  );
  const replacementCache = new Map<string, string | undefined>();

  let changed = true;
  let iterations = 0;
  const maxIterations = 20;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;
    replacementCache.clear();

    const typeRefs = sourceFile.getDescendantsOfKind(SyntaxKind.TypeReference);
    const replacements: Array<{ start: number; end: number; text: string }> =
      [];

    for (const typeRef of typeRefs) {
      try {
        if (typeRef.wasForgotten()) {
          continue;
        }

        // Check if the declaration enclosing this typeRef is unexported; if so, skip unless needed
        const topLevelDecl = getTopLevelDeclaration(typeRef);
        if (
          topLevelDecl &&
          !isDeclarationExported(topLevelDecl, exportSpecifierNames)
        ) {
          continue;
        }

        const typeNameNode = typeRef.getTypeName();
        const typeName = typeNameNode.getText().trim();

        const targetDecl = findTopLevelDeclaration(typeName, sourceFile);
        if (!targetDecl) {
          continue;
        }

        if (isDeclarationExported(targetDecl, exportSpecifierNames)) {
          continue;
        }

        let replacement: string | undefined;
        if (replacementCache.has(typeName)) {
          replacement = replacementCache.get(typeName);
        } else {
          const visited = new Set<Node>();
          replacement = resolveExportedReplacement(
            targetDecl,
            sourceFile,
            visited,
            exportSpecifierNames
          );
          replacementCache.set(typeName, replacement);
        }

        if (replacement) {
          // Keep any type arguments intact (`Promise<PrivateType>` -> `Promise<PublicReplacement>`)
          const typeArgs = typeRef.getTypeArguments();
          const typeArgsText =
            typeArgs.length > 0
              ? `<${typeArgs.map(a => a.getText()).join(', ')}>`
              : '';

          replacements.push({
            start: typeRef.getStart(),
            end: typeRef.getEnd(),
            text: `${replacement}${typeArgsText}`
          });
        }
      } catch {
        continue;
      }
    }

    if (replacements.length > 0) {
      replacements.sort((a, b) => b.start - a.start);
      let fullText = sourceFile.getFullText();
      for (const { start, end, text } of replacements) {
        fullText =
          fullText.substring(0, start) + text + fullText.substring(end);
      }
      sourceFile.replaceWithText(fullText);
      changed = true;
    }
  }
}

/**
 * Resolves a public replacement string for an unexported declaration using
 * subclass lookup, superclass lookup, or recursive type alias resolution.
 */
function resolveExportedReplacement(
  decl: Node,
  sourceFile: SourceFile,
  visited: Set<Node>,
  exportSpecifierNames: Set<string>
): string | undefined {
  if (visited.has(decl)) {
    return undefined;
  }
  visited.add(decl);

  const declName = (decl as { getName?: () => string | undefined }).getName?.();
  if (!declName) {
    return undefined;
  }

  // Prioritize finding an exported subclass or implementing interface in the public API
  // so callers receive the concrete public model type (e.g. `DocumentSnapshot` over internal `DocumentSnapshot_2`).
  const classes = sourceFile.getClasses();
  for (const cls of classes) {
    if (isDeclarationExported(cls, exportSpecifierNames)) {
      const baseClass = cls.getBaseClass();
      if (baseClass && baseClass.getName() === declName) {
        return cls.getName() || cls.getText();
      }
      const ext = cls.getExtends();
      if (ext && ext.getText().trim().split('<')[0].trim() === declName) {
        return cls.getName() || cls.getText();
      }
      for (const impl of cls.getImplements()) {
        if (impl.getText().trim().split('<')[0].trim() === declName) {
          return cls.getName() || cls.getText();
        }
      }
    }
  }

  const interfaces = sourceFile.getInterfaces();
  for (const iface of interfaces) {
    if (isDeclarationExported(iface, exportSpecifierNames)) {
      for (const ext of iface.getExtends()) {
        if (ext.getText().trim().split('<')[0].trim() === declName) {
          return iface.getName() || iface.getText();
        }
      }
    }
  }

  // If no exported subclass exists, fall back to checking `decl`'s own public `extends` / `implements` ancestors.
  if (decl.getKind() === SyntaxKind.ClassDeclaration) {
    const cls = decl as ClassDeclaration;
    const baseClass = cls.getBaseClass();
    if (baseClass) {
      if (isDeclarationExported(baseClass, exportSpecifierNames)) {
        return baseClass.getName() || baseClass.getText();
      } else {
        const parentRes = resolveExportedReplacement(
          baseClass,
          sourceFile,
          visited,
          exportSpecifierNames
        );
        if (parentRes) {
          return parentRes;
        }
      }
    }
    for (const impl of cls.getImplements()) {
      const parentName = impl.getText().trim().split('<')[0].trim();
      const parentDecl = findTopLevelDeclaration(parentName, sourceFile);
      if (parentDecl) {
        if (isDeclarationExported(parentDecl, exportSpecifierNames)) {
          return parentName;
        } else {
          const parentRes = resolveExportedReplacement(
            parentDecl,
            sourceFile,
            visited,
            exportSpecifierNames
          );
          if (parentRes) {
            return parentRes;
          }
        }
      } else {
        return parentName;
      }
    }
  } else if (decl.getKind() === SyntaxKind.InterfaceDeclaration) {
    const iface = decl as InterfaceDeclaration;
    for (const ext of iface.getExtends()) {
      const parentName = ext.getText().trim().split('<')[0].trim();
      const parentDecl = findTopLevelDeclaration(parentName, sourceFile);
      if (parentDecl) {
        if (isDeclarationExported(parentDecl, exportSpecifierNames)) {
          return parentName;
        } else {
          const parentRes = resolveExportedReplacement(
            parentDecl,
            sourceFile,
            visited,
            exportSpecifierNames
          );
          if (parentRes) {
            return parentRes;
          }
        }
      } else {
        return parentName;
      }
    }
  } else if (decl.getKind() === SyntaxKind.TypeAliasDeclaration) {
    // Recursive type alias expansion
    const typeAlias = decl as TypeAliasDeclaration;
    const typeNode = typeAlias.getTypeNode();
    if (typeNode) {
      return typeNode.getText();
    }
  }

  return undefined;
}

/**
 * Finds a top-level declaration by name.
 */
function findTopLevelDeclaration(
  name: string,
  sourceFile: SourceFile
): Node | undefined {
  const cleanName = name.trim().split('<')[0].trim();
  const cls = sourceFile.getClass(cleanName);
  if (cls) {
    return cls;
  }
  const iface = sourceFile.getInterface(cleanName);
  if (iface) {
    return iface;
  }
  const ta = sourceFile.getTypeAlias(cleanName);
  if (ta) {
    return ta;
  }
  return undefined;
}

/**
 * Checks if a declaration is exported at the file root or inside an exported module/namespace.
 * Supports inline `export`/`default` keywords, separate `export { Specifier }` declarations,
 * and ambient `declare module` / `namespace` block scoping rules.
 */
function isDeclarationExported(
  node: Node,
  exportSpecifierNames: Set<string>
): boolean {
  if ((node as { hasExportKeyword?: () => boolean }).hasExportKeyword?.()) {
    return true;
  }
  if ((node as { hasDefaultKeyword?: () => boolean }).hasDefaultKeyword?.()) {
    return true;
  }
  const name = (node as { getName?: () => string | undefined }).getName?.();
  if (name && exportSpecifierNames.has(name)) {
    return true;
  }
  const parent = node.getParent();
  if (parent && parent.getKind() === SyntaxKind.ModuleBlock) {
    // Inside a namespace/module, a declaration is only exported if it explicitly has the `export` keyword.
    return (
      (node as { hasExportKeyword?: () => boolean }).hasExportKeyword?.() ||
      false
    );
  }
  return false;
}

/**
 * Walks up the AST to find the enclosing top-level statement (`ClassDeclaration`, `InterfaceDeclaration`, etc.).
 */
function getTopLevelDeclaration(node: Node): Node | undefined {
  try {
    if (node.wasForgotten()) {
      return undefined;
    }
    let curr: Node | undefined = node;
    while (curr) {
      const parent = curr.getParent();
      if (
        parent &&
        (parent.getKind() === SyntaxKind.SourceFile ||
          parent.getKind() === SyntaxKind.ModuleBlock)
      ) {
        return curr;
      }
      curr = parent;
    }
    return undefined;
  } catch {
    return undefined;
  }
}
