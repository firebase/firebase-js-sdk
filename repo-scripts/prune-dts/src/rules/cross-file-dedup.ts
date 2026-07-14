import { SourceFile } from 'ts-morph';

/**
 * Deduplicates export declarations shared across multiple declaration files.
 */
export function deduplicateCrossFileExports(
  sourceFile: SourceFile,
  otherExportFileLocations: string[] = []
): void {}
