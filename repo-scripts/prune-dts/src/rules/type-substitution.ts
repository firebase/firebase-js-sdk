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
  let changed = true;
  let iterations = 0;
  const maxIterations = 20;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    const typeRefs = sourceFile.getDescendantsOfKind(SyntaxKind.TypeReference);

    for (const typeRef of typeRefs) {
      if (typeof typeRef.wasForgotten === 'function' && typeRef.wasForgotten()) {
        continue;
      }

      // Check if the declaration enclosing this typeRef is unexported; if so, skip unless needed
      const topLevelDecl = getTopLevelDeclaration(typeRef);
      if (topLevelDecl && !isDeclarationExported(topLevelDecl)) {
        continue;
      }

      const typeNameNode = typeRef.getTypeName();
      const typeName = typeNameNode.getText().trim();

      const targetDecl = findTopLevelDeclaration(typeName, sourceFile);
      if (!targetDecl) continue;

      if (isDeclarationExported(targetDecl)) {
        continue;
      }

      const visited = new Set<Node>();
      const replacement = resolveExportedReplacement(
        targetDecl,
        sourceFile,
        visited
      );

      if (replacement) {
        // Keep any type arguments intact (`Promise<PrivateType>` -> `Promise<PublicReplacement>`)
        const typeArgs = typeRef.getTypeArguments();
        const typeArgsText =
          typeArgs.length > 0
            ? `<${typeArgs.map((a) => a.getText()).join(', ')}>`
            : '';

        typeRef.replaceWithText(`${replacement}${typeArgsText}`);
        changed = true;
        break; // Break and restart query after AST mutation
      }
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
  visited: Set<Node>
): string | undefined {
  if (visited.has(decl)) return undefined;
  visited.add(decl);

  const declName =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof (decl as any).getName === 'function' ? (decl as any).getName() : null;
  if (!declName) return undefined;

  // 1. Check if there is an exported subclass or interface that extends/implements `decl`
  const classes = sourceFile.getClasses();
  for (const cls of classes) {
    if (isDeclarationExported(cls)) {
      const baseClass = cls.getBaseClass();
      if (baseClass && baseClass.getName() === declName) {
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
    if (isDeclarationExported(iface)) {
      for (const ext of iface.getExtends()) {
        if (ext.getText().trim().split('<')[0].trim() === declName) {
          return iface.getName() || iface.getText();
        }
      }
    }
  }

  // 2. If no exported subclass exists, check `decl`'s own `extends` and `implements` clauses
  if (decl.getKind() === SyntaxKind.ClassDeclaration) {
    const cls = decl as ClassDeclaration;
    const baseClass = cls.getBaseClass();
    if (baseClass) {
      if (isDeclarationExported(baseClass)) {
        return baseClass.getName() || baseClass.getText();
      } else {
        const parentRes = resolveExportedReplacement(
          baseClass,
          sourceFile,
          visited
        );
        if (parentRes) return parentRes;
      }
    }
    for (const impl of cls.getImplements()) {
      const parentName = impl.getText().trim().split('<')[0].trim();
      const parentDecl = findTopLevelDeclaration(parentName, sourceFile);
      if (parentDecl) {
        if (isDeclarationExported(parentDecl)) {
          return parentName;
        } else {
          const parentRes = resolveExportedReplacement(
            parentDecl,
            sourceFile,
            visited
          );
          if (parentRes) return parentRes;
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
        if (isDeclarationExported(parentDecl)) {
          return parentName;
        } else {
          const parentRes = resolveExportedReplacement(
            parentDecl,
            sourceFile,
            visited
          );
          if (parentRes) return parentRes;
        }
      } else {
        return parentName;
      }
    }
  } else if (decl.getKind() === SyntaxKind.TypeAliasDeclaration) {
    // 3. Recursive type alias expansion (`L46`)
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
  if (cls) return cls;
  const iface = sourceFile.getInterface(cleanName);
  if (iface) return iface;
  const ta = sourceFile.getTypeAlias(cleanName);
  if (ta) return ta;
  return undefined;
}

/**
 * Checks if a declaration is exported or inside an exported module/namespace.
 */
function isDeclarationExported(node: Node): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (node as any).hasExportKeyword === 'function' && (node as any).hasExportKeyword()) {
    return true;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (node as any).hasDefaultKeyword === 'function' && (node as any).hasDefaultKeyword()) {
    return true;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const name = typeof (node as any).getName === 'function' ? (node as any).getName() : null;
  if (name) {
    const sourceFile = node.getSourceFile();
    const exportDecls = sourceFile.getDescendantsOfKind(SyntaxKind.ExportSpecifier);
    for (const exp of exportDecls) {
      if (exp.getName() === name) {
        return true;
      }
    }
  }
  const parent = node.getParent();
  if (parent && parent.getKind() === SyntaxKind.ModuleBlock) {
    // Inside a namespace/module, a declaration is only exported if it explicitly has the `export` keyword.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return typeof (node as any).hasExportKeyword === 'function' && (node as any).hasExportKeyword();
  }
  return false;
}

/**
 * Walks up the AST to find the enclosing top-level statement (`ClassDeclaration`, `InterfaceDeclaration`, etc.).
 */
function getTopLevelDeclaration(node: Node): Node | undefined {
  let curr: Node | undefined = node;
  while (curr) {
    const parent = curr.getParent();
    if (parent && parent.getKind() === SyntaxKind.SourceFile) {
      return curr;
    }
    if (parent && parent.getKind() === SyntaxKind.ModuleBlock) {
      return curr;
    }
    curr = parent;
  }
  return undefined;
}
