/**
 * @license
 * Copyright 2017 Google LLC
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

import {
  arrayRemove,
  arrayUnion,
  deleteField,
  FieldValue,
  increment,
  serverTimestamp
} from '../../../src';
import { expectEqual, expectNotEqual } from '../../util/helpers';

describe('FieldValue', () => {
  it('support equality checking with isEqual()', () => {
    expectEqual(deleteField(), deleteField());
    expectEqual(serverTimestamp(), serverTimestamp());
    expectNotEqual(deleteField(), serverTimestamp());
  });

  it('support instanceof checks', () => {
    expect(deleteField()).to.be.an.instanceOf(FieldValue);
    expect(serverTimestamp()).to.be.an.instanceOf(FieldValue);
    expect(arrayRemove(1)).to.be.an.instanceOf(FieldValue);
    expect(arrayUnion('a')).to.be.an.instanceOf(FieldValue);
    expect(arrayRemove('a')).to.be.an.instanceOf(FieldValue);
  });

  it('JSON.stringify() does not throw', () => {
    JSON.stringify(deleteField());
    JSON.stringify(serverTimestamp());
    JSON.stringify(increment(1));
    JSON.stringify(arrayUnion(2));
    JSON.stringify(arrayRemove(3));
  });
});
