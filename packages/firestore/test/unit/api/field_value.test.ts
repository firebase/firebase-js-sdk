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

import {
  arrayRemove,
  arrayUnion,
  deleteField,
  FieldValue,
  increment,
  maximum,
  minimum,
  serverTimestamp
} from '../../../src';
import { expectEqual, expectNotEqual } from '../../util/helpers';

describe('FieldValue', () => {
  it('support equality checking with isEqual()', () => {
    expectEqual(deleteField(), deleteField());
    expectEqual(serverTimestamp(), serverTimestamp());
    expectNotEqual(deleteField(), serverTimestamp());

    expectEqual(minimum(1), minimum(1));
    expectNotEqual(minimum(1), minimum(2));
    expectEqual(maximum(1), maximum(1));
    expectNotEqual(maximum(1), maximum(2));
    expectNotEqual(minimum(1), maximum(1));

    // Test NaN equality
    expectEqual(minimum(NaN), minimum(NaN));
    expectEqual(maximum(NaN), maximum(NaN));
  });

  it('support instanceof checks', () => {
    expect(deleteField()).toBeInstanceOf(FieldValue);
    expect(serverTimestamp()).toBeInstanceOf(FieldValue);
    expect(arrayRemove(1)).toBeInstanceOf(FieldValue);
    expect(arrayUnion('a')).toBeInstanceOf(FieldValue);
    expect(arrayRemove('a')).toBeInstanceOf(FieldValue);
    expect(increment(1)).toBeInstanceOf(FieldValue);
    expect(minimum(1)).toBeInstanceOf(FieldValue);
    expect(maximum(1)).toBeInstanceOf(FieldValue);
  });

  it('JSON.stringify() does not throw', () => {
    JSON.stringify(deleteField());
    JSON.stringify(serverTimestamp());
    JSON.stringify(increment(1));
    JSON.stringify(arrayUnion(2));
    JSON.stringify(arrayRemove(3));
    JSON.stringify(minimum(4));
    JSON.stringify(maximum(5));
  });
});
