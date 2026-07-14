/**
 * @license
 * Copyright 2026 Google LLC
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

import { expect } from 'chai';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { format, resolveConfig } from 'prettier';
import { addBlankLines, pruneDts, removeUnusedImports } from './prune-dts';

const testCasesDir = path.resolve(__dirname, 'tests');
const e2eOutputCasesDir = path.resolve(__dirname, 'tests', 'e2e');
const tmpDir = os.tmpdir();

const e2ePackages = [
  'firestore',
  'database',
  'storage-public',
  'messaging',
  'data-connect'
];

async function runFullPipeline(inputFile: string): Promise<string> {
  const outputFile = path.resolve(tmpDir, 'e2e_output.d.ts');
  pruneDts(inputFile, outputFile);
  await addBlankLines(outputFile);
  await removeUnusedImports(outputFile);
  return outputFile;
}

const updateSnapshots =
  process.env.UPDATE_SNAPSHOTS === '1' ||
  process.env.UPDATE_SNAPSHOTS === 'true';

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const RESET = useColor ? '\x1b[0m' : '';
const RED = useColor ? '\x1b[31m' : '';
const GREEN = useColor ? '\x1b[32m' : '';
const CYAN = useColor ? '\x1b[36m' : '';
const DIM = useColor ? '\x1b[90m' : '';

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
    `\n${CYAN}Inspect: git diff --no-index ${relativeExpected} ${actualPath}`,
    `Update:  UPDATE_SNAPSHOTS=1 npm run test:e2e${RESET}`
  ].join('\n');

  const error = new Error(errorMessage);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (error as any).showDiff = false;
  throw error;
}

describe('Prune DTS - Full E2E Production Pipeline Parity', () => {
  for (const pkg of e2ePackages) {
    it(`[e2e] ${pkg}`, async () => {
      const absoluteInputFile = path.resolve(testCasesDir, `${pkg}.input.d.ts`);
      const absoluteOutputFile = path.resolve(
        e2eOutputCasesDir,
        `${pkg}.output.d.ts`
      );

      if (!fs.existsSync(absoluteInputFile)) {
        throw new Error(`Missing E2E input snapshot: ${absoluteInputFile}`);
      }
      if (!fs.existsSync(absoluteOutputFile)) {
        throw new Error(`Missing E2E output snapshot: ${absoluteOutputFile}`);
      }

      const tmpFile = await runFullPipeline(absoluteInputFile);
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
        `[e2e] ${pkg}`,
        absoluteOutputFile
      );
    });
  }
});
