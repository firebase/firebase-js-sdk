import { Scope, SourceFile, SyntaxKind } from 'ts-morph';

/**
 * Modifies constructors marked with `@hideconstructor` to be private or protected.
 */
export function hideConstructors(sourceFile: SourceFile): void {
  const classes = sourceFile.getDescendantsOfKind(SyntaxKind.ClassDeclaration);

  for (const cls of classes) {
    let hasHideConstructor = false;
    let isProtected = false;

    // Check class-level JSDoc comments for `@hideconstructor`
    const classJsDocs = cls.getJsDocs();
    for (const doc of classJsDocs) {
      const text = doc.getText();
      if (text.includes('@hideconstructor')) {
        hasHideConstructor = true;
        if (text.includes('protected')) {
          isProtected = true;
        }
        const cleanedText = cleanJsDocText(text);
        if (!cleanedText) {
          doc.remove();
        } else {
          doc.replaceWithText(cleanedText);
        }
      }
    }

    // Check constructor-level JSDoc comments across all constructor overloads/declarations
    const constructors = cls.getConstructors();
    let preservedConstructorComment = '';

    for (const ctor of constructors) {
      for (const doc of ctor.getJsDocs()) {
        const text = doc.getText();
        if (text.includes('@hideconstructor')) {
          hasHideConstructor = true;
          if (text.includes('protected')) {
            isProtected = true;
          }
        }
        const cleanedText = cleanJsDocText(text);
        if (cleanedText && !preservedConstructorComment) {
          preservedConstructorComment = cleanedText;
        }
      }
    }

    if (hasHideConstructor) {
      for (const ctor of constructors) {
        ctor.remove();
      }

      const newCtor = cls.addConstructor({});
      newCtor.setScope(isProtected ? Scope.Protected : Scope.Private);

      if (preservedConstructorComment) {
        const innerText = extractJsDocInner(preservedConstructorComment);
        if (innerText) {
          newCtor.addJsDoc(innerText);
        }
      }
    }
  }
}

/**
 * Strips `@hideconstructor` and `@param` tags from JSDoc comments, returning
 * the cleaned comment or empty string if no description remains.
 */
function cleanJsDocText(rawText: string): string {
  const lines = rawText.split('\n');
  const cleanedLines: string[] = [];

  for (const line of lines) {
    if (line.includes('@hideconstructor') || line.includes('@param')) {
      continue;
    }
    cleanedLines.push(line);
  }

  const contentOnly = cleanedLines
    .join('\n')
    .replace(/\/\*\*|\*\/|\*/g, '')
    .trim();
  if (!contentOnly) {
    return '';
  }

  return cleanedLines.join('\n');
}

/**
 * Extracts the inner content from a formatted `/** ... *\/` JSDoc block
 * so it can be passed to `addJsDoc()`.
 */
function extractJsDocInner(formattedJsDoc: string): string {
  const lines = formattedJsDoc.split('\n');
  const innerLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '/**' || trimmed === '*/') {
      continue;
    }
    if (trimmed.startsWith('*')) {
      innerLines.push(trimmed.substring(1).trim());
    } else {
      innerLines.push(trimmed);
    }
  }

  return innerLines.join('\n').trim();
}
