/**
 * @license
 * Copyright 2020 Google LLC
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

import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { format, resolveConfig } from 'prettier';
import { expect } from 'chai';
import { describe, it } from 'mocha';
import { pruneDts } from './prune-dts';

const testCasesDir = path.resolve(__dirname, 'tests');
const tmpDir = os.tmpdir();

const testDataFilter = /(.*).input.d.ts/;
const testCaseFilterRe = /.*/;

async function runScript(inputFile: string): Promise<string> {
  const outputFile = path.resolve(tmpDir, 'output.d.ts');
  pruneDts(inputFile, outputFile);
  return outputFile;
}

interface TestCase {
  name: string;
  absoluteInputFile: string;
  absoluteOutputFile: string;
}

function discoverUnitCases(): TestCase[] {
  const unitDir = path.resolve(testCasesDir, 'unit');
  if (!fs.existsSync(unitDir)) return [];
  return fs
    .readdirSync(unitDir)
    .filter(fileName => testDataFilter.test(fileName))
    .map(fileName => {
      const testCaseName = fileName.match(testDataFilter)![1];
      return {
        name: testCaseName.replace(/-/g, ' '),
        absoluteInputFile: path.join(unitDir, `${testCaseName}.input.d.ts`),
        absoluteOutputFile: path.join(unitDir, `${testCaseName}.output.d.ts`)
      };
    });
}

function discoverPackageCases(): TestCase[] {
  const packagesDir = path.resolve(testCasesDir, 'packages');
  const pruneOnlyDir = path.resolve(packagesDir, 'prune-only');
  if (!fs.existsSync(packagesDir) || !fs.existsSync(pruneOnlyDir)) return [];
  return fs
    .readdirSync(packagesDir)
    .filter(fileName => testDataFilter.test(fileName))
    .map(fileName => {
      const testCaseName = fileName.match(testDataFilter)![1];
      return {
        name: testCaseName.replace(/-/g, ' '),
        absoluteInputFile: path.join(packagesDir, `${testCaseName}.input.d.ts`),
        absoluteOutputFile: path.join(pruneOnlyDir, `${testCaseName}.output.d.ts`)
      };
    });
}

/**
 * Controls suite filtering (`unit`, `production`, or `all`).
 */
const testMode = process.env.TEST_MODE || 'all';

/**
 * When `UPDATE_SNAPSHOTS=1` is set, `assertAndReport` automatically overwrites expected `.output.d.ts`
 * snapshot files with the actual formatted output when baseline modifications occur.
 */
const updateSnapshots =
  process.env.UPDATE_SNAPSHOTS === '1' ||
  process.env.UPDATE_SNAPSHOTS === 'true';

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const RESET = useColor ? '\x1b[0m' : '';
const RED = useColor ? '\x1b[31m' : '';
const GREEN = useColor ? '\x1b[32m' : '';
const CYAN = useColor ? '\x1b[36m' : '';
const DIM = useColor ? '\x1b[90m' : '';

/**
 * Asserts string equality between actual and expected .d.ts outputs.
 *
 * On failure:
 * 1. Writes actual output to /tmp/prune-dts-failures/<test-name>.actual.d.ts for direct inspection.
 * 2. Outputs the exact git diff --no-index command to easily inspect line differences.
 */
function assertAndReport(
  actual: string,
  expected: string,
  testName: string,
  expectedPath: string
): void {
  if (actual === expected) {
    return;
  }

  if (updateSnapshots) {
    console.log(`[SNAPSHOT UPDATED] ${expectedPath}`);
    fs.writeFileSync(expectedPath, actual, 'utf-8');
    return;
  }

  const failDir = path.resolve('/tmp', 'prune-dts-failures');
  fs.mkdirSync(failDir, { recursive: true });
  const actualPath = path.join(
    failDir,
    `${testName.replace(/\s+/g, '-')}.actual.d.ts`
  );
  fs.writeFileSync(actualPath, actual, 'utf-8');

  const actualLines = actual.split('\n');
  const expectedLines = expected.split('\n');
  let diffLine = 1;
  const maxLines = Math.max(actualLines.length, expectedLines.length);
  for (let i = 0; i < maxLines; i++) {
    if (actualLines[i] !== expectedLines[i]) {
      diffLine = i + 1;
      break;
    }
  }

  const startIdx = Math.max(0, diffLine - 3);
  const endIdx = Math.min(maxLines, diffLine + 3);
  const previewLines: string[] = [];
  for (let i = startIdx; i < endIdx; i++) {
    const exp = expectedLines[i];
    const act = actualLines[i];
    if (exp === act && exp !== undefined) {
      previewLines.push(`${DIM}    ${exp}${RESET}`);
    } else {
      if (exp !== undefined) previewLines.push(`${RED}-   ${exp}${RESET}`);
      if (act !== undefined) previewLines.push(`${GREEN}+   ${act}${RESET}`);
    }
  }

  const relativeExpected = path.relative(process.cwd(), expectedPath);
  const errorMessage = [
    `${RESET}\nMismatch at line ${diffLine}:`,
    `  Expected: ${relativeExpected}:${diffLine}`,
    `  Actual:   ${actualPath}:${diffLine}\n`,
    ...previewLines,
    `\n${CYAN}Inspect: git diff --no-index ${relativeExpected} ${actualPath}`
  ].join('\n');

  const error = new Error(errorMessage);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (error as any).showDiff = false;
  throw error;
}

describe('Prune DTS', () => {
  const unitCases = discoverUnitCases();
  const productionCases = discoverPackageCases();

  if (testMode === 'all' || testMode === 'unit') {
    describe('Unit Rules', () => {
      for (const testCase of unitCases) {
        it(testCase.name, async () => {
          const { absoluteInputFile, absoluteOutputFile } = testCase;

          const tmpFile = await runScript(absoluteInputFile);
          const prettierConfig = await resolveConfig(absoluteInputFile);

          const expectedDtsUnformatted = fs.readFileSync(
            absoluteOutputFile,
            'utf-8'
          );
          const expectedDts = await format(expectedDtsUnformatted, {
            filepath: absoluteOutputFile,
            ...prettierConfig
          });
          const actualDtsUnformatted = fs.readFileSync(tmpFile, 'utf-8');
          const actualDts = await format(actualDtsUnformatted, {
            filepath: tmpFile,
            ...prettierConfig
          });

          assertAndReport(
            actualDts,
            expectedDts,
            testCase.name,
            absoluteOutputFile
          );
        });
      }
    });
  }

  if (testMode === 'all' || testMode === 'production') {
    describe('Production Regressions', () => {
      for (const testCase of productionCases) {
        it(testCase.name, async () => {
          const { absoluteInputFile, absoluteOutputFile } = testCase;

          const tmpFile = await runScript(absoluteInputFile);
          const prettierConfig = await resolveConfig(absoluteInputFile);

          const expectedDtsUnformatted = fs.readFileSync(
            absoluteOutputFile,
            'utf-8'
          );
          const expectedDts = await format(expectedDtsUnformatted, {
            filepath: absoluteOutputFile,
            ...prettierConfig
          });
          const actualDtsUnformatted = fs.readFileSync(tmpFile, 'utf-8');
          const actualDts = await format(actualDtsUnformatted, {
            filepath: tmpFile,
            ...prettierConfig
          });

          assertAndReport(
            actualDts,
            expectedDts,
            testCase.name,
            absoluteOutputFile
          );
        });
      }
    });
  }
});
