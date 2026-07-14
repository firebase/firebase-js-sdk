import { SourceFile } from 'ts-morph';

/**
 * Helper utilities for symbol table graph analysis across source files.
 */
export function isInternalSymbolName(name: string): boolean {
  return name.startsWith('_');
}
