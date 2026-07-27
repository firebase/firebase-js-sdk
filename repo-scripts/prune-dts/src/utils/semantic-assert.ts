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

import { Project } from 'ts-morph';

export interface SemanticDifference {
  symbolName: string;
  kind: string;
  message: string;
}

function normalizeWhitespace(str: string): string {
  return str
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .replace(/\s*([=<>(),;:|&{}[\]?])\s*/g, '$1')
    .replace(/([=:(<,[])\|+/g, '$1')
    .replace(/([=:(<,[])&+/g, '$1')
    .replace(/'/g, '"')
    .trim();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toArray(val: any): any[] {
  if (!val) {
    return [];
  }
  return Array.isArray(val) ? val : [val];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCanonicalDeclarationString(node: any): string {
  const kind = typeof node.getKindName === 'function' ? node.getKindName() : '';
  const name = typeof node.getName === 'function' ? node.getName() : '';

  if (kind === 'ClassDeclaration' || kind === 'InterfaceDeclaration') {
    const typeParams =
      typeof node.getTypeParameters === 'function'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? toArray(node.getTypeParameters())
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((tp: any) => normalizeWhitespace(tp.getText(false)))
            .sort()
            .join(',')
        : '';
    const ext =
      typeof node.getExtends === 'function'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? toArray(node.getExtends())
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((e: any) => normalizeWhitespace(e.getText(false)))
            .sort()
            .join(',')
        : '';
    const impl =
      typeof node.getImplements === 'function'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? toArray(node.getImplements())
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((i: any) => normalizeWhitespace(i.getText(false)))
            .sort()
            .join(',')
        : '';
    const members =
      typeof node.getMembers === 'function'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? toArray(node.getMembers())
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((m: any) => normalizeWhitespace(m.getText(false)))
            .sort()
            .join(' | ')
        : '';

    return `${kind} ${name} <${typeParams}> extends ${ext} implements ${impl} { ${members} }`;
  }

  if (kind === 'EnumDeclaration') {
    const members =
      typeof node.getMembers === 'function'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? toArray(node.getMembers())
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((m: any) => normalizeWhitespace(m.getText(false)))
            .sort()
            .join(' | ')
        : '';
    return `${kind} ${name} { ${members} }`;
  }

  if (kind === 'ModuleDeclaration') {
    const bodyText = node.getBody?.()?.getText(false) || '';
    return `${kind} ${name} { ${normalizeWhitespace(bodyText)} }`;
  }

  return `${kind} ${name}: ${normalizeWhitespace(node.getText(false))}`;
}

/**
 * Asserts that two .d.ts contents are semantically equivalent.
 * Ignores whitespace, formatting, and member ordering.
 */
export function assertSemanticEquals(
  actualContent: string,
  expectedContent: string,
  testName: string
): void {
  if (actualContent === expectedContent) {
    return;
  }

  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: { declaration: true, skipLibCheck: true }
  });

  const actualFile = project.createSourceFile('actual.d.ts', actualContent);
  const expectedFile = project.createSourceFile('expected.d.ts', expectedContent);

  const actualExports = actualFile.getExportedDeclarations();
  const expectedExports = expectedFile.getExportedDeclarations();

  const actualNames = Array.from(actualExports.keys()).sort();
  const expectedNames = Array.from(expectedExports.keys()).sort();

  const missingNames = expectedNames.filter(n => !actualExports.has(n));
  const extraNames = actualNames.filter(n => !expectedExports.has(n));

  const diffs: SemanticDifference[] = [];

  if (missingNames.length > 0) {
    diffs.push({
      symbolName: missingNames.join(', '),
      kind: 'MissingExport',
      message: `Expected export(s) missing in actual output: ${missingNames.join(', ')}`
    });
  }
  if (extraNames.length > 0) {
    diffs.push({
      symbolName: extraNames.join(', '),
      kind: 'UnexpectedExport',
      message: `Unexpected export(s) in actual output: ${extraNames.join(', ')}`
    });
  }

  for (const name of expectedNames) {
    if (!actualExports.has(name)) {
      continue;
    }
    const actualDecls = actualExports.get(name)!;
    const expectedDecls = expectedExports.get(name)!;

    const actualCanonical = actualDecls
      .map(d => getCanonicalDeclarationString(d))
      .sort();
    const expectedCanonical = expectedDecls
      .map(d => getCanonicalDeclarationString(d))
      .sort();

    if (actualCanonical.length !== expectedCanonical.length) {
      diffs.push({
        symbolName: name,
        kind: 'DeclarationCountMismatch',
        message: `Expected ${expectedCanonical.length} declaration(s) for '${name}', but found ${actualCanonical.length}`
      });
      continue;
    }

    for (let i = 0; i < expectedCanonical.length; i++) {
      if (actualCanonical[i] !== expectedCanonical[i]) {
        diffs.push({
          symbolName: name,
          kind: 'SemanticMismatch',
          message: `Semantic difference in '${name}':\n    Expected: ${expectedCanonical[i]}\n    Actual:   ${actualCanonical[i]}`
        });
      }
    }
  }

  if (diffs.length > 0) {
    const details = diffs
      .map(d => `  - [${d.kind}] ${d.symbolName}: ${d.message}`)
      .join('\n');
    throw new Error(`Semantic differences found in '${testName}':\n${details}`);
  }
}
