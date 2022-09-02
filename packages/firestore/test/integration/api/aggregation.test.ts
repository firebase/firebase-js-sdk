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
  disableNetwork,
  getAggregateFromServerDirect,
  query
} from '../util/firebase_export';
import { apiDescribe, withTestCollection } from '../util/helpers';

apiDescribe('Aggregation query', (persistence: boolean) => {
  it('can run count query getAggregateFromServerDirect', () => {
    const testDocs = {
      a: { k: 'a', sort: 1 },
      b: { k: 'b', sort: 2 },
      c: { k: 'c', sort: 2 }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const query_ = query(coll);
      const countQuery_ = countQuery(query_);
      const snapshot = await getAggregateFromServerDirect(countQuery_);
      expect(snapshot.getCount()).to.equal(3);
    });
  });

  it('getAggregateFromServerDirect fails if user is offline async', () => {
    const testDocs = { a: { k: 'a', sort: 1 } };
    return withTestCollection(
      persistence,
      testDocs,
      async (coll, firestore) => {
        await disableNetwork(firestore);
        const query_ = query(coll);
        const countQuery_ = countQuery(query_);
        await expect(
          getAggregateFromServerDirect(countQuery_)
        ).to.be.eventually.rejectedWith(
          'Failed to get aggregate result because the client is offline'
        );
      }
    );
  });
});
