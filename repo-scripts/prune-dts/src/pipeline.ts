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
 * Top-level orchestrator for pruning non-exported declarations and private members from a declaration file (`.d.ts`).
 */
export function pruneDts(
  inputLocation: string,
  outputLocation: string,
  otherExportFileLocations: string[] = []
): void {
  const project = new Project({
    compilerOptions: {
      declaration: true,
      noEmitOnError: false,
      skipLibCheck: true
    }
  });

  const sourceFile = project.addSourceFileAtPath(inputLocation);
  const leadingLicense = extractLicenseHeader(sourceFile);

  // Execute AST transformation rules sequentially:
  deduplicateCrossFileExports(sourceFile, otherExportFileLocations);
  flattenInheritance(sourceFile);
  substitutePrivateTypeReferences(sourceFile);
  stripPrivateMembers(sourceFile);
  hideConstructors(sourceFile);
  filterTopLevelDeclarations(sourceFile);

  preserveLicenseHeader(sourceFile, leadingLicense);
  fs.writeFileSync(outputLocation, sourceFile.getFullText(), 'utf-8');
}
