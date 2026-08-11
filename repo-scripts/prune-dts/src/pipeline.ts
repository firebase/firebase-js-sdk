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

import * as fs from 'fs';
import { Project } from 'ts-morph';
import { extractLicenseHeader, preserveLicenseHeader } from './utils/license';
import { deduplicateCrossFileExports } from './rules/cross-file-dedup';
import { flattenInheritance } from './rules/inheritance-flattening';
import { substitutePrivateTypeReferences } from './rules/type-substitution';
import { stripPrivateMembers } from './rules/member-stripping';
import { hideConstructors } from './rules/constructor-visibility';
import { filterTopLevelDeclarations } from './rules/top-level-filtering';

/**
 * Prunes non-exported declarations and private members from a declaration file (`.d.ts`).
 */
export function pruneDts(
  inputLocation: string,
  outputLocation: string,
  otherExportFileLocations: string[] = []
): void {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    skipLoadingLibFiles: true,
    compilerOptions: {
      declaration: true,
      noEmitOnError: false,
      skipLibCheck: true
    }
  });

  const sourceFile = project.addSourceFileAtPath(inputLocation);
  const leadingLicense = extractLicenseHeader(sourceFile);

  // Execute AST transformation rules sequentially.
  // Note: substitutePrivateTypeReferences must run BEFORE flattenInheritance so that
  // `extends` and `implements` clauses can be inspected before flattenInheritance strips them.
  deduplicateCrossFileExports(sourceFile, otherExportFileLocations);
  substitutePrivateTypeReferences(sourceFile);
  sourceFile.forgetDescendants();
  flattenInheritance(sourceFile);
  sourceFile.forgetDescendants();
  stripPrivateMembers(sourceFile);
  sourceFile.forgetDescendants();
  hideConstructors(sourceFile);
  filterTopLevelDeclarations(sourceFile);

  preserveLicenseHeader(sourceFile, leadingLicense);
  fs.writeFileSync(outputLocation, sourceFile.getFullText(), 'utf-8');
}
