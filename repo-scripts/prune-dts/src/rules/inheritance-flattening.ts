import {
  ClassDeclaration,
  InterfaceDeclaration,
  Node,
  SourceFile,
  SyntaxKind,
  TypeAliasDeclaration
} from 'ts-morph';

/**
 * Flattens inheritance hierarchies when an exported class or interface extends
 * or implements an unexported base declaration.
 */
export function flattenInheritance(sourceFile: SourceFile): void {
  const classes = sourceFile.getDescendantsOfKind(SyntaxKind.ClassDeclaration);
  for (const cls of classes) {
    flattenClassInheritance(cls, sourceFile);
  }

  const interfaces = sourceFile.getDescendantsOfKind(
    SyntaxKind.InterfaceDeclaration
  );
  for (const iface of interfaces) {
    flattenInterfaceInheritance(iface, sourceFile);
  }
}

/**
 * Flattens unexported `extends` and `implements` clauses for a class declaration.
 */
function flattenClassInheritance(
  cls: ClassDeclaration,
  sourceFile: SourceFile
): void {
  // Handle `extends BaseClass`
  const baseClass = cls.getBaseClass();
  if (baseClass && !isNodeExported(baseClass)) {
    const visited = new Set<Node>();
    const publicBases: string[] = [];
    collectMembersAndPublicBasesFromClass(
      cls,
      baseClass,
      visited,
      publicBases,
      sourceFile
    );

    cls.removeExtends();
    if (publicBases.length > 0) {
      cls.setExtends(publicBases[0]);
    }
  } else if (!baseClass && cls.getExtends()) { // When API Extractor strips @internal base declarations, getBaseClass() returns undefined.
    // If it references an excluded `_`-prefixed internal type, strip the dangling extends clause.
    const extText = cls.getExtends()!.getText().trim().split('<')[0].trim(); // Strip generic type arguments (`_Base<T>` -> `_Base`) to isolate the base identifier name.
    if (extText.startsWith('_')) {
      cls.removeExtends();
    }
  }

  // Handle `implements Iface1, Iface2`
  const implementsNodes = cls.getImplements();
  for (const impl of implementsNodes) {
    const typeText = impl.getText();
    const cleanName = typeText.trim().split('<')[0].trim(); // Strip generic type arguments (e.g., `_Iface<T>` -> `_Iface`) to look up the base declaration.
    const baseDecl = findDeclarationByName(typeText, sourceFile);
    if (baseDecl && !isNodeExported(baseDecl)) {
      const visited = new Set<Node>();
      const publicBases: string[] = [];
      collectMembersAndPublicBasesFromInterface(
        cls,
        baseDecl,
        visited,
        publicBases,
        sourceFile
      );

      cls.removeImplements(impl);
      for (const pubBase of publicBases) {
        cls.addImplements(pubBase);
      }
    } else if (!baseDecl && cleanName.startsWith('_')) {
      // Strip dangling implements clauses for excluded `_`-prefixed internal interfaces.
      cls.removeImplements(impl);
    }
  }
}

/**
 * Flattens unexported `extends BaseIface1, BaseIface2` clauses for an interface declaration.
 */
function flattenInterfaceInheritance(
  iface: InterfaceDeclaration,
  sourceFile: SourceFile
): void {
  const extendsNodes = iface.getExtends();
  for (const ext of extendsNodes) {
    const typeText = ext.getText();
    // Strip generic type arguments (e.g., `_BaseIface<T>` -> `_BaseIface`) to look up the base declaration.
    const cleanName = typeText.trim().split('<')[0].trim();
    const baseDecl = findDeclarationByName(typeText, sourceFile);
    if (baseDecl && !isNodeExported(baseDecl)) {
      const visited = new Set<Node>();
      const publicBases: string[] = [];
      if (baseDecl.getKind() === SyntaxKind.InterfaceDeclaration) {
        collectMembersAndPublicBasesFromInterface(
          iface,
          baseDecl as InterfaceDeclaration,
          visited,
          publicBases,
          sourceFile
        );
      } else if (baseDecl.getKind() === SyntaxKind.TypeAliasDeclaration) {
        collectMembersFromTypeAlias(
          iface,
          baseDecl as TypeAliasDeclaration,
          visited
        );
      }

      iface.removeExtends(ext);
      for (const pubBase of publicBases) {
        iface.addExtends(pubBase);
      }
    } else if (!baseDecl && cleanName.startsWith('_')) {
      // Strip dangling extends clauses for excluded `_`-prefixed internal interfaces/types.
      iface.removeExtends(ext);
    }
  }
}

/**
 * Recursively collects members from an unexported class and finds any public base class ancestors.
 */
function collectMembersAndPublicBasesFromClass(
  targetDecl: ClassDeclaration | InterfaceDeclaration,
  baseClass: ClassDeclaration,
  visited: Set<Node>,
  publicBases: string[],
  sourceFile: SourceFile
): void {
  if (visited.has(baseClass)) {return;}
  visited.add(baseClass);

  const parentBase = baseClass.getBaseClass();
  if (parentBase) {
    if (isNodeExported(parentBase)) {
      publicBases.push(parentBase.getName() || parentBase.getText());
    } else {
      collectMembersAndPublicBasesFromClass(
        targetDecl,
        parentBase,
        visited,
        publicBases,
        sourceFile
      );
    }
  } else {
    const extendsClause = baseClass.getExtends();
    if (extendsClause && !parentBase) {
      const parentName = extendsClause.getText();
      const resolved = findDeclarationByName(parentName, sourceFile);
      if (resolved && !isNodeExported(resolved)) {
        if (resolved.getKind() === SyntaxKind.ClassDeclaration) {
          collectMembersAndPublicBasesFromClass(
            targetDecl,
            resolved as ClassDeclaration,
            visited,
            publicBases,
            sourceFile
          );
        }
      } else {
        publicBases.push(parentName);
      }
    }
  }

  // Build type parameter mapping if targetDecl extends or implements baseClass with type arguments
  const typeArgMap = buildTypeArgMap(targetDecl, baseClass);

  // Copy members after collecting from parent ancestors to maintain top-down member order
  copyDeclarationMembers(targetDecl, baseClass, typeArgMap);
}

/**
 * Builds a mapping from generic parameter names (e.g. `T`) to concrete arguments (e.g. `string`)
 * based on how targetDecl extends or implements baseDecl (`class Child extends Base<string>`).
 */
function buildTypeArgMap(
  targetDecl: ClassDeclaration | InterfaceDeclaration,
  baseDecl: Node
): Map<string, string> {
  const map = new Map<string, string>();
  const baseName =
    typeof (baseDecl as any).getName === 'function' ? (baseDecl as any).getName() : null;
  const targetName =
    typeof (targetDecl as any).getName === 'function' ? (targetDecl as any).getName() : null;

  if (baseName && targetName && !isNodeExported(baseDecl)) {
    map.set(baseName, targetName);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typeParams = typeof (baseDecl as any).getTypeParameters === 'function' ? (baseDecl as any).getTypeParameters() : [];
  if (typeParams.length === 0) {return map;}

  const clauses: Node[] = [];
  if (targetDecl.getKind() === SyntaxKind.ClassDeclaration) {
    const cls = targetDecl as ClassDeclaration;
    const ext = cls.getExtends();
    if (ext) {
      clauses.push(ext);
    }
    clauses.push(...cls.getImplements());
  } else {
    const iface = targetDecl as InterfaceDeclaration;
    clauses.push(...iface.getExtends());
  }

  for (const clause of clauses) {
    const text = clause.getText().trim();
    if (text.split('<')[0].trim() === baseName) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const typeArgs = typeof (clause as any).getTypeArguments === 'function' ? (clause as any).getTypeArguments() : [];
      for (let i = 0; i < typeParams.length; i++) {
        if (i < typeArgs.length) {
          map.set(typeParams[i].getName(), typeArgs[i].getText().trim());
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const defaultNode = typeof (typeParams[i] as any).getDefault === 'function' ? (typeParams[i] as any).getDefault() : null;
          if (defaultNode) {
            map.set(typeParams[i].getName(), defaultNode.getText().trim());
          }
        }
      }
      break;
    }
  }
  return map;
}

/**
 * Recursively collects members from an unexported interface and finds any public base interface ancestors.
 */
function collectMembersAndPublicBasesFromInterface(
  targetDecl: ClassDeclaration | InterfaceDeclaration,
  baseIface: InterfaceDeclaration | Node,
  visited: Set<Node>,
  publicBases: string[],
  sourceFile: SourceFile
): void {
  if (visited.has(baseIface)) {return;}
  visited.add(baseIface);

  if (baseIface.getKind() === SyntaxKind.InterfaceDeclaration) {
    const iface = baseIface as InterfaceDeclaration;
    copyDeclarationMembers(targetDecl, iface);

    for (const ext of iface.getExtends()) {
      const parentName = ext.getText();
      const parentDecl = findDeclarationByName(parentName, sourceFile);
      if (parentDecl && !isNodeExported(parentDecl)) {
        if (parentDecl.getKind() === SyntaxKind.InterfaceDeclaration) {
          collectMembersAndPublicBasesFromInterface(
            targetDecl,
            parentDecl,
            visited,
            publicBases,
            sourceFile
          );
        } else if (parentDecl.getKind() === SyntaxKind.TypeAliasDeclaration) {
          collectMembersFromTypeAlias(
            targetDecl,
            parentDecl as TypeAliasDeclaration,
            visited
          );
        }
      } else {
        publicBases.push(parentName);
      }
    }
  }
}

/**
 * Collects properties from an unexported type alias object literal (`type Foo = { a: string }`).
 */
function collectMembersFromTypeAlias(
  targetDecl: ClassDeclaration | InterfaceDeclaration,
  typeAlias: TypeAliasDeclaration,
  visited: Set<Node>
): void {
  if (visited.has(typeAlias)) {return;}
  visited.add(typeAlias);

  const typeNode = typeAlias.getTypeNode();
  if (typeNode && typeNode.getKind() === SyntaxKind.TypeLiteral) {
    copyDeclarationMembers(targetDecl, typeNode);
  }
}

/**
 * Copies non-private, non-shadowed members (`Property`, `Method`, `GetAccessor`, `SetAccessor`, etc.)
 * from source onto target (`ClassDeclaration` or `InterfaceDeclaration`).
 */
function copyDeclarationMembers(
  targetDecl: ClassDeclaration | InterfaceDeclaration,
  sourceDecl: Node,
  typeArgMap: Map<string, string> = new Map()
): void {
  const initialMemberNames = new Set<string>();
  const isTargetClass =
    targetDecl.getKind() === SyntaxKind.ClassDeclaration;

  if (isTargetClass) {
    const cls = targetDecl as ClassDeclaration;
    cls.getProperties().forEach((p) => initialMemberNames.add(p.getName()));
    cls.getMethods().forEach((m) => initialMemberNames.add(m.getName()));
    cls.getGetAccessors().forEach((g) => initialMemberNames.add(g.getName()));
    cls.getSetAccessors().forEach((s) => initialMemberNames.add(s.getName()));
  } else {
    const iface = targetDecl as InterfaceDeclaration;
    iface.getProperties().forEach((p) => initialMemberNames.add(p.getName()));
    iface.getMethods().forEach((m) => initialMemberNames.add(m.getName()));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getStructure = (node: any): any =>
    typeof node.getStructure === 'function' ? node.getStructure() : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sourceMembers: Node[] = typeof (sourceDecl as any).getMembers === 'function'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (sourceDecl as any).getMembers()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    : typeof (sourceDecl as any).getProperties === 'function' && typeof (sourceDecl as any).getMethods === 'function'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? [...(sourceDecl as any).getProperties(), ...(sourceDecl as any).getMethods()]
    : [
        ...sourceDecl.getChildrenOfKind(SyntaxKind.PropertyDeclaration),
        ...sourceDecl.getChildrenOfKind(SyntaxKind.MethodDeclaration),
        ...sourceDecl.getChildrenOfKind(SyntaxKind.PropertySignature),
        ...sourceDecl.getChildrenOfKind(SyntaxKind.MethodSignature),
        ...sourceDecl.getChildrenOfKind(SyntaxKind.IndexSignature),
        ...sourceDecl.getChildrenOfKind(SyntaxKind.CallSignature),
        ...sourceDecl.getChildrenOfKind(SyntaxKind.ConstructSignature)
      ];

  const propertiesToAdd: any[] = [];
  const methodsToAdd: any[] = [];
  const getAccessorsToAdd: any[] = [];
  const setAccessorsToAdd: any[] = [];
  const indexSignaturesToAdd: any[] = [];
  const callSignaturesToAdd: any[] = [];
  const constructSignaturesToAdd: any[] = [];

  for (const member of sourceMembers) {
    const kind = member.getKind();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (member as any).getScope === 'function' && (member as any).getScope() === 'private') {
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const name = typeof (member as any).getName === 'function' ? (member as any).getName() : null;

    if (name && initialMemberNames.has(name)) {
      continue;
    }

    const structure = getStructure(member);
    if (!structure) {continue;}

    if (typeArgMap.size > 0) {
      substituteStructureTypeArgs(structure, typeArgMap);
    }

    if (isTargetClass) {
      const cls = targetDecl as ClassDeclaration;
      if (!cls.isAbstract() && structure.isAbstract) {
        structure.isAbstract = false;
      }
      if (
        kind === SyntaxKind.PropertyDeclaration ||
        kind === SyntaxKind.PropertySignature
      ) {
        cls.addProperty(structure);
      } else if (
        kind === SyntaxKind.MethodDeclaration ||
        kind === SyntaxKind.MethodSignature
      ) {
        cls.addMethod(structure);
      } else if (kind === SyntaxKind.GetAccessor) {
        cls.addGetAccessor(structure);
      } else if (kind === SyntaxKind.SetAccessor) {
        cls.addSetAccessor(structure);
      }
    } else {
      const iface = targetDecl as InterfaceDeclaration;
      if (
        kind === SyntaxKind.PropertyDeclaration ||
        kind === SyntaxKind.PropertySignature
      ) {
        iface.addProperty(structure);
      } else if (
        kind === SyntaxKind.MethodDeclaration ||
        kind === SyntaxKind.MethodSignature
      ) {
        iface.addMethod(structure);
      } else if (kind === SyntaxKind.IndexSignature) {
        iface.addIndexSignature(structure);
      } else if (kind === SyntaxKind.CallSignature) {
        iface.addCallSignature(structure);
      } else if (kind === SyntaxKind.ConstructSignature) {
        iface.addConstructSignature(structure);
      }
    }
  }
}

/**
 * Replaces generic parameter strings in a structure (e.g. `T` -> `string`).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function substituteStructureTypeArgs(structure: any, typeArgMap: Map<string, string>): void {
  const replaceStr = (str: string | undefined): string | undefined => {
    if (typeof str !== 'string') {return str;}
    let res = str;
    for (const [param, arg] of typeArgMap) {
      const regex = new RegExp(`\\b${param}\\b`, 'g');
      res = res.replace(regex, arg);
    }
    return res;
  };

  if (structure.type) {structure.type = replaceStr(structure.type);}
  if (structure.returnType) {structure.returnType = replaceStr(structure.returnType);}

  if (Array.isArray(structure.parameters)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const param of structure.parameters) {
      if (param.type) {param.type = replaceStr(param.type);}
    }
  }
}

/**
 * Checks if an AST node is exported (or inside an exported namespace).
 */
function isNodeExported(node: Node): boolean {
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
 * Finds a top-level declaration by name in the source file.
 */
function findDeclarationByName(name: string, sourceFile: SourceFile): Node | undefined {
  const cleanName = name.trim().split('<')[0].trim();
  const classes = sourceFile.getClasses();
  for (const cls of classes) {
    if (cls.getName() === cleanName) {return cls;}
  }
  const interfaces = sourceFile.getInterfaces();
  for (const iface of interfaces) {
    if (iface.getName() === cleanName) {return iface;}
  }
  const typeAliases = sourceFile.getTypeAliases();
  for (const ta of typeAliases) {
    if (ta.getName() === cleanName) {return ta;}
  }
  return undefined;
}
