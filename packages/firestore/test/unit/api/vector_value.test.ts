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

import { expect } from 'chai';

import { VectorValue } from '../../../src';

describe('VectorValue', () => {
  it('fromJSON reconstructs the value from toJSON', () => {
    const num: number[] = [1, 2, 3];
    const vectorValue = new VectorValue(num);
    const json = vectorValue.toJSON();
    const parsedVectorValue = VectorValue.fromJSON(json);
    expect(vectorValue.isEqual(parsedVectorValue)).to.be.true;
  });

  it('fromJSON parameter order does not matter', () => {
    const type = 'firestore/vectorValue/1.0';
    const data = [1, 2, 3];
    expect(() => {
      VectorValue.fromJSON({ data, type });
    }).to.not.throw;
    expect(() => {
      VectorValue.fromJSON({ type, data });
    }).to.not.throw;
  });

  it('fromJSON empty array does not throw', () => {
    const type = 'firestore/vectorValue/1.0';
    const data = [1, 2, 3];
    expect(() => {
      VectorValue.fromJSON({ type, data });
    }).to.not.throw;
  });

  it('fromJSON missing fields throws', () => {
    const type = 'firestore/vectorValue/1.0';
    const data = [1, 2, 3];
    expect(() => {
      VectorValue.fromJSON({ type /* missing data */ });
    }).to.throw;
    expect(() => {
      VectorValue.fromJSON({ data /* missing type */ });
    }).to.throw;
    expect(() => {
      VectorValue.fromJSON({ type: 1, data });
    }).to.throw;
    expect(() => {
      VectorValue.fromJSON({ type: 'firestore/bytes/1.0', data });
    }).to.throw;
    expect(() => {
      VectorValue.fromJSON({ type, data: 'not a number' });
    });
  });
});
