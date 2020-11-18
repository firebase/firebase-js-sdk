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
import { expect } from 'chai';
import { describe, it } from 'mocha';

import { pruneDts } from './prune-dts';

const testCasesDir = path.resolve(__dirname, 'tests');
const tmpDir = os.tmpdir();

const testDataFilter = /(.*).input.d.ts/;
const testCaseFilterRe = /.*inherits.*/;

function runScript(filename: string): string {
  const inputFile = path.resolve(testCasesDir, filename);
  const outputFile = path.resolve(tmpDir, 'output.d.ts');
  pruneDts(inputFile, outputFile);
  return fs.readFileSync(outputFile, 'utf-8');
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
    it(testCase.name, () => {
      const expectedDts = fs.readFileSync(
        path.resolve(testCasesDir, testCase.outputFileName),
        'utf-8'
      );
      const actualDts = runScript(testCase.inputFileName);
      expect(actualDts).to.equal(expectedDts);
    });
  }
});
