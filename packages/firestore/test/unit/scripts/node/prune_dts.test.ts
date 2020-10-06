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
import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import { pruneDts } from '../../../../scripts/prune-dts';

function runScript(source: string): string {
  const tmpDir = os.tmpdir();
  const inputFile = path.resolve(tmpDir, 'input.d.ts');
  const outputFile = path.resolve(tmpDir, 'output.d.ts');
  fs.writeFileSync(inputFile, source, 'utf-8');
  pruneDts(inputFile, outputFile);
  return fs.readFileSync(outputFile, 'utf-8');
}

describe.only('Prune DTS', () => {
  it('handles different generic types', async () => {
    const input = `
class A<T> {
  aData: T;
}

export declare class B<K> extends A<K> {
  bData: K;
}

export {}`;

    const expectedOutput = `
export declare class B<K> {
  aData: K;
  bData: K;
}
    `;

    const actualOutput = runScript(input);
    expect(actualOutput).to.equal(expectedOutput);
  });
});
