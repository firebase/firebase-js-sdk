/**
 * @license
 * Copyright 2022 Google LLC
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
  countQuery,
  getAggregateFromServerDirect,
  query
} from '../util/firebase_export';
import { apiDescribe, withTestCollection } from '../util/helpers';

apiDescribe('Aggregation COUNT query:', (persistence: boolean) => {
  it.only('empty collection count equals to 0', () => {
    const testDocs = {};
    return withTestCollection(persistence, testDocs, collection => {
      const countQuery_ = countQuery(query(collection));
      return getAggregateFromServerDirect(countQuery_).then(snapshot => {
        expect(snapshot.getCount()).to.equal(0);
      });
    });
  });
  
  it.only('test collection count equals to 6', () => {
    const testDocs = {
      a: { k: 'a' },
      b: { k: 'b' },
      c: { k: 'c' },
      d: { k: 'd' },
      e: { k: 'e' },
      f: { k: 'f' }
    };
    return withTestCollection(persistence, testDocs, collection => {
      const countQuery_ = countQuery(query(collection));
      return getAggregateFromServerDirect(countQuery_).then(snapshot => {
        expect(snapshot.getCount()).to.equal(6);
      });
    });
  });
});
