import { SourceFile } from 'ts-morph';

/**
 * Modifies constructors marked with `@hideconstructor` to be private or protected.
 */
export function hideConstructors(sourceFile: SourceFile): void {}
