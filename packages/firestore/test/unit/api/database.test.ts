/**
 * Copyright 2017 Google Inc.
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
import { DocumentReference, Query } from '../../../src/api/database';
import { documentReference, query } from '../../util/api_helpers';
import { expectEqual, expectNotEqual} from '../../util/helpers';

describe('DocumentReference', () => {
  it('DocumentReference equality checks', () => {
    expectEqual(documentReference('rooms/foo'), documentReference('rooms/foo'));
    expectNotEqual(documentReference('rooms/foo'), documentReference('rooms/bar'));
  });
});

describe('Query', () => {
  it('Query equality checks', () => {
    expectEqual(query('foo'), query('foo'));
    expectNotEqual(query('foo'), query('bar'));
  });
});
