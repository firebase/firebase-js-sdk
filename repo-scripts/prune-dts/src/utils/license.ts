import { SourceFile } from 'ts-morph';

/**
 * Extracts any leading file comment (such as `@license`) from the source file
 * so it can be preserved across AST transformations.
 */
export function extractLicenseHeader(sourceFile: SourceFile): string {
  const fullText = sourceFile.getFullText();
  const firstStatement = sourceFile.getStatements()[0];
  if (!firstStatement) {
    return '';
  }

  const startIdx = firstStatement.getStart();
  const leadingText = fullText.substring(0, startIdx).trim();
  if (leadingText.includes('@license')) {
    return leadingText;
  }
  return '';
}

/**
 * Ensures the leading license header is preserved in the output file if statement removal dropped it.
 */
export function preserveLicenseHeader(
  sourceFile: SourceFile,
  leadingLicense: string
): void {
  if (!leadingLicense) {
    return;
  }

  const fullText = sourceFile.getFullText().trimStart();
  if (!fullText.startsWith(leadingLicense)) {
    sourceFile.replaceWithText(`${leadingLicense}\n\n${fullText}`);
  }
}
