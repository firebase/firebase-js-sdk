/**
 * @license
 * Copyright 2024 Google LLC
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
  endAt,
  endBefore,
  equalTo,
  limitToFirst,
  limitToLast,
  orderByChild,
  orderByKey,
  orderByPriority,
  orderByValue,
  startAfter,
  startAt
} from '../src';

import { createTestApp } from './exp/integration.test';

describe('Query Constraints', () => {
  let defaultApp;

  beforeEach(() => {
    defaultApp = createTestApp();
  });
  it('query constraint types are exposed', () => {
    const queryConstraintTypes = [
      { qc: endAt(0), name: 'endAt' },
      { qc: endBefore(0), name: 'endBefore' },
      { qc: startAt(0), name: 'startAt' },
      { qc: startAfter(0), name: 'startAfter' },
      { qc: limitToFirst(1), name: 'limitToFirst' },
      { qc: limitToLast(1), name: 'limitToLast' },
      { qc: orderByChild('a'), name: 'orderByChild' },
      { qc: orderByKey(), name: 'orderByKey' },
      { qc: orderByPriority(), name: 'orderByPriority' },
      { qc: orderByValue(), name: 'orderByValue' },
      { qc: equalTo(''), name: 'equalTo' }
    ];
    queryConstraintTypes.forEach(({ qc, name }) => {
      expect(qc.type).to.equal(name);
    });
  });
});
