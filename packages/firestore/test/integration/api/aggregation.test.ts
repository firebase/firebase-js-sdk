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
  collection,
  collectionGroup,
  countQuery,
  doc,
  disableNetwork,
  getAggregateFromServerDirect,
  query,
  terminate,
  where,
  writeBatch
} from '../util/firebase_export';
import {
  apiDescribe,
  postConverter,
  withEmptyTestCollection,
  withTestCollection,
  withTestDb
} from '../util/helpers';

apiDescribe('Aggregation query', (persistence: boolean) => {
  it('can run count query getAggregateFromServerDirect', () => {
    const testDocs = {
      a: { author: 'authorA', title: 'titleA' },
      b: { author: 'authorB', title: 'titleB' }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const countQuery_ = countQuery(coll);
      const snapshot = await getAggregateFromServerDirect(countQuery_);
      expect(snapshot.getCount()).to.equal(2);
    });
  });

  it('aggregateQuery.query equals to original query', () => {
    return withEmptyTestCollection(persistence, async coll => {
      const query_ = query(coll);
      const aggregateQuery_ = countQuery(query_);
      expect(aggregateQuery_.query).to.be.equal(query_);
    });
  });

  it('aggregateQuerySnapshot.query equals to aggregateQuery', () => {
    return withEmptyTestCollection(persistence, async coll => {
      const aggregateQuery_ = countQuery(coll);
      const snapshot = await getAggregateFromServerDirect(aggregateQuery_);
      expect(snapshot.query).to.be.equal(aggregateQuery_);
    });
  });

  it('aggregate query supports withConverter', () => {
    const testDocs = {
      a: { author: 'authorA', title: 'titleA' },
      b: { author: 'authorB', title: 'titleB' }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const query_ = query(
        coll,
        where('author', '==', 'authorA')
      ).withConverter(postConverter);
      const countQuery_ = countQuery(query_);
      const snapshot = await getAggregateFromServerDirect(countQuery_);
      expect(snapshot.getCount()).to.equal(1);
    });
  });

  it('aggregate query supports collection groups', () => {
    return withTestDb(persistence, async db => {
      const collectionGroupId = doc(collection(db, 'aggregateQueryTest')).id;
      const docPaths = [
        `${collectionGroupId}/cg-doc1`,
        `abc/123/${collectionGroupId}/cg-doc2`,
        `zzz${collectionGroupId}/cg-doc3`,
        `abc/123/zzz${collectionGroupId}/cg-doc4`,
        `abc/123/zzz/${collectionGroupId}`
      ];
      const batch = writeBatch(db);
      for (const docPath of docPaths) {
        batch.set(doc(db, docPath), { x: 1 });
      }
      await batch.commit();
      const countQuery_ = countQuery(collectionGroup(db, collectionGroupId));
      const snapshot = await getAggregateFromServerDirect(countQuery_);
      expect(snapshot.getCount()).to.equal(2);
    });
  });

  it('aggregate query fails if firestore is terminated', () => {
    return withEmptyTestCollection(persistence, async (coll, firestore) => {
      await terminate(firestore);
      const countQuery_ = countQuery(coll);
      expect(() => getAggregateFromServerDirect(countQuery_)).to.throw(
        'The client has already been terminated.'
      );
    });
  });

  it("terminate doesn't crash when there is aggregate query in flight", () => {
    return withEmptyTestCollection(persistence, async (coll, firestore) => {
      const countQuery_ = countQuery(coll);
      void getAggregateFromServerDirect(countQuery_);
      await terminate(firestore);
    });
  });

  it('getAggregateFromServerDirect fails if user is offline', () => {
    return withEmptyTestCollection(
      persistence,
      async (collection, firestore) => {
        await disableNetwork(firestore);
        const countQuery_ = countQuery(collection);
        await expect(
          getAggregateFromServerDirect(countQuery_)
        ).to.be.eventually.rejectedWith(
          'Failed to get aggregate result because the client is offline'
        );
      }
    );
  });
});
