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
  inputFileName: string;
  outputFileName: string;
}

function getTestCases(): TestCase[] {
  if (
    !fs.existsSync(testCasesDir) ||
    !fs.lstatSync(testCasesDir).isDirectory()
  ) {
    throw new Error(`${testCasesDir} folder does not exist`);
  }

  return fs
    .readdirSync(testCasesDir)
    .filter((fileName: string) => testDataFilter.test(fileName))
    .filter((fileName: string) => testCaseFilterRe.test(fileName))
    .map((fileName: string) => {
      const testCaseName = fileName.match(testDataFilter)![1];

      const inputFileName = `${testCaseName}.input.d.ts`;
      const outputFileName = `${testCaseName}.output.d.ts`;

      const name = testCaseName.replace(/-/g, ' ');
      return { name, inputFileName, outputFileName };
    });
}

describe('Prune DTS', () => {
  for (const testCase of getTestCases()) {
    it(testCase.name, async () => {
      const absoluteInputFile = path.resolve(
        testCasesDir,
        testCase.inputFileName
      );
      const absoluteOutputFile = path.resolve(
        testCasesDir,
        testCase.outputFileName
      );

      const tmpFile = await runScript(absoluteInputFile);
      const prettierConfig = await resolveConfig(absoluteInputFile);

      const expectedDtsUnformatted = fs.readFileSync(
        absoluteOutputFile,
        'utf-8'
      );
      const expectedDts = format(expectedDtsUnformatted, {
        filepath: absoluteOutputFile,
        ...prettierConfig
      });
      const actualDtsUnformatted = fs.readFileSync(tmpFile, 'utf-8');
      const actualDts = format(actualDtsUnformatted, {
        filepath: tmpFile,
        ...prettierConfig
      });

      expect(actualDts).to.equal(expectedDts);
    });
  }
});
