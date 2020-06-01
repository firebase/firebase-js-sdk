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
import { FieldValue } from '../../../src/api/field_value';
import { FieldPath } from '../../../src/api/field_path';
import { expectEqual, expectNotEqual } from '../../util/helpers';

describe('FieldValue', () => {
  it('support equality checking with isEqual()', () => {
    expectEqual(FieldValue.delete(), FieldValue.delete());
    expectEqual(FieldValue.serverTimestamp(), FieldValue.serverTimestamp());
    expectNotEqual(FieldValue.delete(), FieldValue.serverTimestamp());
    expectNotEqual(FieldValue.delete(), FieldPath.documentId());
  });

  it('support instanceof checks', () => {
    expect(FieldValue.delete()).to.be.an.instanceOf(FieldValue);
    expect(FieldValue.serverTimestamp()).to.be.an.instanceOf(FieldValue);
    expect(FieldValue.increment(1)).to.be.an.instanceOf(FieldValue);
    expect(FieldValue.arrayUnion('a')).to.be.an.instanceOf(FieldValue);
    expect(FieldValue.arrayRemove('a')).to.be.an.instanceOf(FieldValue);
  });
});
