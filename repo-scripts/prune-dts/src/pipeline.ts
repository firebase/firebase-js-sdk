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
