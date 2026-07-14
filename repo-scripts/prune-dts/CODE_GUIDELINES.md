# `prune-dts` Architectural & Code Guidelines

To keep cognitive load low, maximize scannability, and ensure the codebase is self-evident to all future maintainers across our `ts-morph` migration, every file and function across `src/` must adhere to these 10 core guidelines:

---

## 1. Single Responsibility per File and Function
Keep files focused on exactly one domain concept (`member-stripping.ts` only strips `_`-prefixed members; `constructor-visibility.ts` only handles `@hideconstructor`). When a developer opens a file or looks at a function, the entire scope should fit in their working memory without mental switching or scrolling across unrelated logic. Keep individual rule files between 40 and 120 lines.

## 2. Explicit, Self-Documenting Naming over Abbreviations
Name functions, variables, and AST nodes by exactly what they represent (`filterTopLevelDeclarations(sourceFile)`, `unexportedBaseDeclaration`, `isMarkedWithHideConstructor`). Avoid cryptic abbreviations (`sf`, `dec`, `chk`) or vague generic words (`data`, `item`, `node`, `process()`) that force the reader to mentally map abbreviations back to domain concepts.

## 3. Stateless, Pure Transformation Passes
Design each transformation pass (`src/rules/*.ts`) to accept a `SourceFile` (and necessary context), perform its AST modifications, and exit without reading or writing global or module-level state. If a pass needs information from another rule or symbol lookup, pass it in explicitly via parameters. Stateless code eliminates hidden side-effects across passes.

## 4. Early Guard Returns (Flattening Control Flow)
Avoid deeply nested `if / else if / else` blocks (the "arrow anti-pattern"). Check pre-conditions right at the start of a loop or function and exit immediately:

```typescript
if (member.getName().startsWith('_')) {
  member.remove();
  return;
}
```

Keeping the primary transformation logic at the top indentation level lets readers scan linear execution flow effortlessly.

## 5. Isolation of I/O from Pure AST Logic
Keep filesystem operations (`Project.addSourceFileAtPath`, `sourceFile.saveSync()`) strictly inside the top-level orchestrator (`pipeline.ts`). The core rule files (`src/rules/*.ts`) should only operate on in-memory AST nodes (`SourceFile`). This separation makes every rule trivial to test, reason about, and debug without touching the disk.

## 6. One Level of Abstraction per Function
Do not mix high-level workflow orchestration with low-level syntax parsing in the same function. If `pipeline.ts` reads like a high-level recipe (`stripPrivateMembers(sourceFile)`), it should not contain inline regular expressions or raw token loops on the same line. Delegate low-level node inspection to focused helper utilities (`src/utils/`).

## 7. Make Order-of-Operations & Hidden Dependencies Explicit
If `Rule B` relies on `Rule A` running first (for example, running `flattenInheritance` *before* `filterTopLevelDeclarations` deletes `PrivateBase`), document that exact invariant directly in `pipeline.ts` where the sequence is called. Never leave implicit ordering assumptions hidden across multiple files.

## 8. Uniform Handling of Similar Concepts
Use predictable, consistent patterns across similar tasks. If we iterate and check `.isExported()` for classes, interfaces, and enums, structure those checks uniformly using `ts-morph`'s shared interfaces (`ExportableNode`) rather than using one API pattern for classes and a completely different ad-hoc loop for enums.

## 9. Intent-Driven Comments (*Why* over *What*)
Write comments that explain non-obvious design choices, invariants, or tricky TypeScript AST edge cases:

```typescript
// Extract leading @license before AST mutation because replacing statement #0 with NotEmittedStatement drops file-level comments.
```

Avoid redundant comments that just restate obvious code syntax (`// Remove the node`).

## 10. Fail Fast with Actionable Context
If an unexpected or illegal AST state is encountered, throw an explicit error with domain context immediately (`Error: Base class '${baseName}' extended by '${childName}' was not found in symbol table`) rather than returning `undefined` and letting it crash 10 stack frames deeper (`Cannot read properties of undefined`).
