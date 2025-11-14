/**
 * @license
 * Copyright 2025 Google LLC
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

/**
 * Returns a rollup plugin to replace any `declare module X { Y }` code blocks with `Y`.
 * This was developed to support the generation of `global_index.d.ts`
 * used for the Google3 import of `firebase/firestore`
 *
 * @param fileName perform the replace in this file
 * @param moduleName search for and replace this module declaration
 */
export function replaceDeclareModule(fileName, moduleName) {
  return {
    name: 'replace-declare-module',
    generateBundle(options, bundle) {
      if (!bundle[fileName]) {
        console.warn(
          `[replace-declare-module] File not found in bundle: ${fileName}`
        );
        return;
      }

      const chunk = bundle[fileName];
      if (chunk.type === 'chunk') {
        do {
          const originalString = chunk.code;
          const blockInfo = findDeclareModuleBlock(originalString, moduleName);
          const fullBlock = blockInfo?.fullBlock;
          const innerContent = blockInfo?.innerContent;

          if (!fullBlock || !innerContent) break;

          // 1. Get the segment of the string BEFORE the full block starts.
          const beforeBlock = originalString.substring(0, fullBlock.start);

          // 2. Extract the inner content string based on its start and length.
          // We use innerContent indices here to get the actual content inside the braces.
          const innerContentString = originalString.substring(
            innerContent.start,
            innerContent.start + innerContent.length
          );

          // 3. Get the segment of the string AFTER the full block ends.
          // The start index of the 'after' segment is the end index of the full block.
          const afterBlockStart = fullBlock.start + fullBlock.length;
          const afterBlock = originalString.substring(afterBlockStart);

          // 4. Concatenate the three parts: Before + Inner Content + After
          chunk.code = beforeBlock + innerContentString + afterBlock;
        } while (true);
      }
    }
  };
}

/**
 * Searches a multi-line string for a TypeScript module declaration pattern,
 * finds the matching closing brace while respecting nested braces, and
 * returns the start and length information for the full block and its inner content.
 *
 * @param inputString The multi-line string content to search within.
 * @param moduleName The module name of the declare module block to search for.
 * @returns An object containing the BlockInfo for the full block and inner content, or null if not found.
 */
function findDeclareModuleBlock(inputString, moduleName) {
  // We escape potential regex characters in the module name to ensure it matches literally.
  const escapedModuleName = moduleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Construct the RegExp object dynamically. It searches for:
  // 'declare module ' + single quote + escaped module name + single quote + space + '{'
  const searchRegex = new RegExp(`declare module '${escapedModuleName}' {`);
  const match = inputString.match(searchRegex);

  if (!match || match.index === undefined) {
    console.log('No matching module declaration found.');
    return { fullBlock: null, innerContent: null };
  }

  const fullBlockStartIndex = match.index;

  // 2. Determine the exact index of the opening brace '{'
  // The match[0] gives the text that matched the regex, e.g., "declare module './my-module' {"
  const matchText = match[0];
  const openBraceOffset = matchText.lastIndexOf('{');
  const openBraceIndex = fullBlockStartIndex + openBraceOffset;

  let braceCount = 1;
  let closeBraceIndex = -1;

  // 3. Iterate from the character *after* the opening brace to find the matching '}'
  for (let i = openBraceIndex + 1; i < inputString.length; i++) {
    const char = inputString[i];

    if (char === '{') {
      braceCount++;
    } else if (char === '}') {
      braceCount--;
    }

    // 4. Check if we found the outer closing brace
    if (braceCount === 0) {
      closeBraceIndex = i;
      break;
    }
  }

  if (closeBraceIndex === -1) {
    console.log('Found opening brace but no matching closing brace.');
    return null;
  }

  // 5. Calculate results

  // Full Block: from 'declare module...' to matching '}'
  const fullBlock = {
    start: fullBlockStartIndex,
    length: closeBraceIndex - fullBlockStartIndex + 1
  };

  // Inner Content: from char after '{' to char before '}'
  const innerContent = {
    start: openBraceIndex + 1,
    length: closeBraceIndex - (openBraceIndex + 1)
  };

  return { fullBlock, innerContent };
}
