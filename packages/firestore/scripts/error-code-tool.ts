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

import * as fs from "fs";
import * as path from "path";

import * as ts from "typescript";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

let isVerbose: boolean = false;

function log(message: any): void {
  if (isVerbose) {
    console.log(message);
  }
}

// Define the names of the functions we are looking for
const targetFunctionNames: Set<string> = new Set(["fail", "hardAssert"]);

// Interface to store information about found call sites
interface CallSiteInfo {
  fileName: string;
  functionName: string;
  line: number;
  character: number;
  argumentsText: string[]; // Added to store argument text
  errorMessage: string | undefined;
  errorCode: number;
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
          // log(`Skipping node_modules directory: ${fullPath}`);
          continue;
        }
        // Recursively scan subdirectories
        tsFiles = tsFiles.concat(getTsFilesRecursive(fullPath));
      } else if (entry.isFile() && (entry.name.endsWith(".ts"))) {
        // Exclude declaration files (.d.ts) as they usually don't contain implementation
        if (!entry.name.endsWith(".d.ts")) {
          tsFiles.push(fullPath);
        }
      }
    }
  } catch (error: any) {
    console.error(`Error reading directory ${dirPath}: ${error.message}`);
    // Optionally, re-throw or handle differently
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
    try {
      // Read the file content
      const sourceText = fs.readFileSync(filePath, "utf8");

      // Create the SourceFile AST node
      const sourceFile = ts.createSourceFile(
        path.basename(filePath), // Use basename for AST node name
        sourceText,
        ts.ScriptTarget.ESNext, // Or your project's target
        true, // Set parent pointers
        ts.ScriptKind.Unknown // Detect TS vs TSX automatically
      );

      // Define the visitor function
      const visit = (node: ts.Node) :void => {
        // Check if the node is a CallExpression (e.g., myFunction(...))
        if (ts.isCallExpression(node)) {
          let functionName: string | null = null;
          const expression = node.expression;

          // Check if the call is directly to an identifier (e.g., fail())
          if (ts.isIdentifier(expression)) {
            functionName = expression.text;
          }
          // Check if the call is to a property access (e.g., utils.fail(), this.hardAssert())
          else if (ts.isPropertyAccessExpression(expression)) {
            // We only care about the final property name being called
            functionName = expression.name.text;
          }
          // Add checks for other forms if needed

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
            let errorCode: number | undefined;
            if (node.arguments && node.arguments.length > 0) {
              node.arguments.forEach((arg: ts.Expression) => {
                // Get the source text of the argument node
                argsText.push(arg.getText(sourceFile));

                if (ts.isStringLiteral(arg)) {
                  errorMessage = arg.getText(sourceFile);
                }
                else if (ts.isNumericLiteral(arg)) {
                  errorCode = parseInt(arg.getText(sourceFile), 10);
                }
              });
            }
            // --- End Extract Arguments ---

            // Store the information (add 1 to line/char for 1-based indexing)
            foundCalls.push({
              fileName: filePath, // Store the full path
              functionName,
              line: line + 1,
              character: character + 1,
              argumentsText: argsText, // Store the extracted arguments,
              errorMessage,
              errorCode: errorCode ?? -1
            });
          }
        }

        // Continue traversing down the AST
        ts.forEachChild(node, visit);
      };

      // Start traversal from the root SourceFile node
      visit(sourceFile);

    } catch (error: any) {
      console.error(`Error processing file ${filePath}: ${error.message}`);
    }
  } // End loop through filePaths

  return foundCalls;
}


// --- Action Handlers ---

function handleList(occurrences: CallSiteInfo[]): void {
  if (occurrences.length === 0) {
    log("No error codes found.");
    return;
  }

  occurrences.sort((a, b) => a.errorCode - b.errorCode).forEach((call) => {
    console.log(
      `CODE: ${call.errorCode}; MESSAGE: ${call.errorMessage}; SOURCE: '${call.functionName}' call at ${path.relative(process.cwd(), call.fileName)}:${call.line}:${call.character}`
    );
  });

}

function handleFind(occurrences: CallSiteInfo[], targetCode: string | number): void {
  // Normalize target code for comparison if necessary (e.g., string vs number)
  const target = typeof targetCode === 'number' ? targetCode : targetCode.toString();

  const foundLocations = occurrences.filter(o => String(o.errorCode) === String(target)); // Compare as strings

  if (foundLocations.length === 0) {
    log(`Error code "${targetCode}" not found.`);
    process.exit(1);
  }

  handleList(foundLocations);
}

function handleCheck(occurrences: CallSiteInfo[]): void {
  if (occurrences.length === 0) {
    log("No error codes found to check for duplicates.");
    return;
  }
  const codeCounts: { [code: string]: CallSiteInfo[] } = {};

  occurrences.forEach(occ => {
    const codeStr = String(occ.errorCode); // Use string representation as key
    if (!codeCounts[codeStr]) {
      codeCounts[codeStr] = [];
    }
    codeCounts[codeStr].push(occ);
  });

  let duplicatesFound = false;
  log("Checking for duplicate error code usage:");
  Object.entries(codeCounts).forEach(([code, locations]) => {
    if (locations.length > 1) {
      duplicatesFound = true;
      console.error(`\nDuplicate error code "${code}" found at ${locations.length} locations:`);
      locations.forEach(loc => {
        const relativePath = path.relative(process.cwd(), loc.fileName);
        console.error(`- ${relativePath}:${loc.line}:${loc.character}`);
      });
    }
  });

  if (!duplicatesFound) {
    log("No duplicate error codes found.");
  }
  else {
    process.exit(1);
  }
}

function handleNew(occurrences: CallSiteInfo[]): void {
  // --- Simple Numeric Scheme: Find max numeric code and add 1 ---
  let maxCode = 0;

  occurrences.forEach(occ => {
    if (occ.errorCode > maxCode) {
      maxCode = occ.errorCode;
    }
  });

  if (occurrences.length === 0) {
    log("0");
    return;
  }

  const newCode = maxCode + 1;
  console.log(newCode);
}

// --- Main Execution ---
async function main(): Promise<void> {
  const argv = yargs(hideBin(process.argv))
    .usage("Usage: $0 [options]")
    .option("dir", {
      alias: 'D',
      describe: "Directory to scan recursively for TS files",
      type: "string",
      demandOption: true,
    })
    .option("verbose", {
      alias: "V",
      describe: "verbose",
      type: "boolean",
    })
    .option("find", {
      alias: "F",
      describe: "Find locations of a specific {errorCode}",
      type: "string",
      nargs: 1,
    })
    .option("list", {
      alias: "L",
      describe: "List all unique error codes found (default action)",
      type: "boolean",
    })
    .option("new", {
      alias: "N",
      describe: "Suggest a new error code based on existing ones",
      type: "boolean",
    })
    .option("check", {
      alias: "C",
      describe: "Check for duplicate usage of error codes",
      type: "boolean",
    })
    .check((argv) => {
      // Enforce mutual exclusivity among options *within* the scan command
      const options = [argv.F, argv.L, argv.N, argv.C].filter(Boolean).length;
      if (options > 1) {
        throw new Error("Options -F, -L, -N, -C are mutually exclusive.");
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
      console.error(`Error: Provided path is not a directory: ${targetDirectory}`);
      process.exit(1);
    }
  } catch (error: any) {
    console.error(`Error accessing directory ${targetDirectory}: ${error.message}`);
    process.exit(1);
  }

  log(`Scanning directory: ${targetDirectory}`);
  const filesToScan = getTsFilesRecursive(targetDirectory);

  if (filesToScan.length === 0) {
    log("No relevant .ts or .tsx files found.");
    process.exit(0);
  }
  log(`Found ${filesToScan.length} files. Analyzing for error codes...`);

  const allOccurrences = findFunctionCalls(filesToScan);
  log(`Scan complete. Found ${allOccurrences.length} potential error code occurrences.`);

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
main().catch(error => {
  console.error("\nAn unexpected error occurred:");
  console.error(error);
  process.exit(1);
});



