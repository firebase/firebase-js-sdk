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

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */

import * as fs from 'fs';
import { getRandomValues } from 'node:crypto';
import * as path from 'path';

import * as ts from 'typescript';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

let isVerbose: boolean = false;

function log(message: any): void {
  if (isVerbose) {
    console.log(message);
  }
}

// Define the names of the functions we are looking for
const targetFunctionNames: Set<string> = new Set(['fail', 'hardAssert']);

// Interface to store information about found call sites
interface CallSiteInfo {
  fileName: string;
  functionName: string;
  line: number;
  character: number;
  argumentsText: string[]; // Added to store argument text
  errorMessage: string | undefined;
  assertionId: string;
}

/**
 * Recursively finds all files with .ts extensions in a directory.
 * @param dirPath The absolute path to the directory to scan.
 * @returns An array of absolute paths to the found TypeScript files.
 */
function getTsFilesRecursive(dirPath: string): string[] {
  let tsFiles: string[] = [];
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Ignore node_modules for performance and relevance
        if (entry.name === 'node_modules') {
          continue;
        }
        // Recursively scan subdirectories
        tsFiles = tsFiles.concat(getTsFilesRecursive(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        // Exclude declaration files (.d.ts) as they usually don't contain implementation
        if (!entry.name.endsWith('.d.ts')) {
          tsFiles.push(fullPath);
        }
      }
    }
  } catch (error: any) {
    console.error(`Error reading directory ${dirPath}: ${error.message}`);
    throw error;
  }
  return tsFiles;
}

/**
 * Analyzes TypeScript source files to find calls to specific functions.
 * @param filePaths An array of absolute paths to the TypeScript files to scan.
 * @returns An array of objects detailing the found call sites.
 */
function findFunctionCalls(filePaths: string[]): CallSiteInfo[] {
  const foundCalls: CallSiteInfo[] = [];

  for (const filePath of filePaths) {
    // Read the file content
    const sourceText = fs.readFileSync(filePath, 'utf8');

    // Create the SourceFile AST node
    const sourceFile = ts.createSourceFile(
      path.basename(filePath), // Use basename for AST node name
      sourceText,
      ts.ScriptTarget.ESNext,
      true, // Set parent pointers
      ts.ScriptKind.Unknown // Detect TS vs TSX automatically
    );

    // Define the visitor function
    const visit = (node: ts.Node): void => {
      // Check if the node is a CallExpression (e.g., myFunction(...))
      if (ts.isCallExpression(node)) {
        let functionName: string | null = null;
        const expression = node.expression;

        // Check if the call is directly to an identifier (e.g., fail())
        if (ts.isIdentifier(expression)) {
          functionName = expression.text;
        }

        // If we found a function name, and it's one we're looking for
        if (functionName && targetFunctionNames.has(functionName)) {
          // Get line and character number
          const { line, character } = ts.getLineAndCharacterOfPosition(
            sourceFile,
            node.getStart() // Get start position of the call expression
          );

          // --- Extract Arguments ---
          const argsText: string[] = [];
          let errorMessage: string | undefined;
          let assertionId: string | undefined;
          if (node.arguments && node.arguments.length > 0) {
            node.arguments.forEach((arg: ts.Expression) => {
              // Get the source text of the argument node
              argsText.push(arg.getText(sourceFile));

              if (ts.isStringLiteral(arg)) {
                errorMessage = arg.getText(sourceFile);
              } else if (ts.isNumericLiteral(arg)) {
                assertionId = arg.getText(sourceFile);
              }
            });
          }

          // Store the information (add 1 to line/char for 1-based indexing)
          foundCalls.push({
            fileName: filePath, // Store the full path
            functionName,
            line: line + 1,
            character: character + 1,
            argumentsText: argsText, // Store the extracted arguments,
            errorMessage,
            assertionId: assertionId ?? 'INVALID'
          });
        }
      }

      // Continue traversing down the AST
      ts.forEachChild(node, visit);
    };

    // Start traversal from the root SourceFile node
    visit(sourceFile);
  } // End loop through filePaths

  return foundCalls;
}

// --- Action Handlers ---

function handleList(occurrences: CallSiteInfo[]): void {
  if (occurrences.length === 0) {
    log('No assertion ids found.');
    return;
  }

  occurrences
    .sort((a, b) => a.assertionId.localeCompare(b.assertionId))
    .forEach(call => {
      console.log(
        `ID: ${call.assertionId}; MESSAGE: ${call.errorMessage}; SOURCE: '${
          call.functionName
        }' call at ${path.relative(process.cwd(), call.fileName)}:${
          call.line
        }:${call.character}`
      );
    });
}

function find(
  occurrences: CallSiteInfo[],
  targetId: string | number
): CallSiteInfo[] {
  const target =
    typeof targetId === 'number' ? targetId.toString(16) : targetId;
  return occurrences.filter(o => String(o.assertionId) === String(target));
}

function handleFind(
  occurrences: CallSiteInfo[],
  targetId: string | number
): void {
  const foundLocations = find(occurrences, targetId);

  if (foundLocations.length === 0) {
    log(`Assertion id "${targetId}" not found.`);
    process.exit(1);
  }

  handleList(foundLocations);
}

function handleCheck(occurrences: CallSiteInfo[]): void {
  if (occurrences.length === 0) {
    log('No assertion ids found to check for duplicates.');
    return;
  }
  const idCounts: { [id: string]: CallSiteInfo[] } = {};

  occurrences.forEach(occ => {
    // Count ID occurrences
    const codeStr = String(occ.assertionId); // Use string representation as key
    if (!idCounts[codeStr]) {
      idCounts[codeStr] = [];
    }
    idCounts[codeStr].push(occ);

    // validate formats
    if (!/^0x[0-9a-f]{4}$/.test(occ.assertionId)) {
      console.error(
        `Invalid assertion ID '${occ.assertionId}'. Must match /^0x[0-9a-f]{4}$/`
      );

      const relativePath = path.relative(process.cwd(), occ.fileName);
      console.error(`- at '${relativePath}:${occ.line}:${occ.character}`);
    }
  });

  let duplicatesFound = false;
  log('Checking for duplicate assertion id usage:');
  Object.entries(idCounts).forEach(([code, locations]) => {
    if (locations.length > 1) {
      duplicatesFound = true;
      console.error(
        `\nDuplicate assertion id "${code}" found at ${locations.length} locations:`
      );
      locations.forEach(loc => {
        const relativePath = path.relative(process.cwd(), loc.fileName);
        console.error(`- ${relativePath}:${loc.line}:${loc.character}`);
      });
    }
  });

  if (!duplicatesFound) {
    log('No duplicate assertion ids found.');
  } else {
    process.exit(1);
  }
}

function randomId(): string {
  const randomBytes = new Uint8Array(2);
  getRandomValues(randomBytes);

  return (
    '0x' +
    Array.from(randomBytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('')
  );
}

function handleNew(occurrences: CallSiteInfo[]): void {
  let newCode: string = randomId();

  // If we find this code already is used, regenerate it.
  while (find(occurrences, newCode).length > 0) {
    newCode = randomId();
  }

  console.log(newCode);
}

// --- Main Execution ---
async function main(): Promise<void> {
  const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 [options]')
    .option('dir', {
      alias: 'D',
      describe: 'Directory to scan recursively for TS files',
      type: 'string',
      demandOption: true
    })
    .option('verbose', {
      alias: 'V',
      describe: 'verbose',
      type: 'boolean'
    })
    .option('find', {
      alias: 'F',
      describe: 'Find locations of a specific {assertionId}',
      type: 'string',
      nargs: 1
    })
    .option('list', {
      alias: 'L',
      describe: 'List all unique assertion ids found (default action)',
      type: 'boolean'
    })
    .option('new', {
      alias: 'N',
      describe: 'Suggest a new assertion id based on existing ones',
      type: 'boolean'
    })
    .option('check', {
      alias: 'C',
      describe: 'Check for duplicate usage of assertion ids',
      type: 'boolean'
    })
    .check(argv => {
      // Enforce mutual exclusivity among options *within* the scan command
      const options = [argv.F, argv.L, argv.N, argv.C].filter(Boolean).length;
      if (options > 1) {
        throw new Error('Options -F, -L, -N, -C are mutually exclusive.');
      }
      return true;
    })
    .help()
    .alias('help', 'h')
    .strict()
    .parse(); // Execute parsing

  // Extract directory path (safe due to demandOption)
  const targetDirectory = path.resolve(argv['dir'] as string);

  // set verbosity
  isVerbose = !!argv['verbose'];

  // Validate directory
  try {
    const stats = fs.statSync(targetDirectory);
    if (!stats.isDirectory()) {
      console.error(
        `Error: Provided path is not a directory: ${targetDirectory}`
      );
      process.exit(1);
    }
  } catch (error: any) {
    console.error(
      `Error accessing directory ${targetDirectory}: ${error.message}`
    );
    process.exit(1);
  }

  log(`Scanning directory: ${targetDirectory}`);
  const filesToScan = getTsFilesRecursive(targetDirectory);

  if (filesToScan.length === 0) {
    log('No relevant .ts or .tsx files found.');
    process.exit(0);
  }
  log(`Found ${filesToScan.length} files. Analyzing for assertion ids...`);

  const allOccurrences = findFunctionCalls(filesToScan);
  log(
    `Scan complete. Found ${allOccurrences.length} potential assertion id occurrences.`
  );

  // Determine action based on flags
  if (argv['find']) {
    handleFind(allOccurrences, argv['find']);
  } else if (argv['new']) {
    handleNew(allOccurrences);
  } else if (argv['check']) {
    handleCheck(allOccurrences);
  } else {
    // Default action is List (-L or no flag)
    handleList(allOccurrences);
  }
}

// Run the main function
void main();
