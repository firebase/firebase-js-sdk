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
  disableNetwork,
  doc,
  DocumentData,
  getCountFromServer,
  query,
  QueryDocumentSnapshot,
  terminate,
  where,
  writeBatch
} from '../util/firebase_export';
import {
  apiDescribe,
  withEmptyTestCollection,
  withTestCollection,
  withTestDb
} from '../util/helpers';
import { USE_EMULATOR } from '../util/settings';

apiDescribe('Count quries', (persistence: boolean) => {
  it('can run count query getCountFromServer', () => {
    const testDocs = {
      a: { author: 'authorA', title: 'titleA' },
      b: { author: 'authorB', title: 'titleB' }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const snapshot = await getCountFromServer(coll);
      expect(snapshot.data().count).to.equal(2);
    });
  });

  it("count query doesn't use converter", () => {
    const testDocs = {
      a: { author: 'authorA', title: 'titleA' },
      b: { author: 'authorB', title: 'titleB' }
    };
    const throwingConverter = {
      toFirestore(obj: never): DocumentData {
        throw new Error('should never be called');
      },
      fromFirestore(snapshot: QueryDocumentSnapshot): never {
        throw new Error('should never be called');
      }
    };
    return withTestCollection(persistence, testDocs, async coll => {
      const query_ = query(
        coll,
        where('author', '==', 'authorA')
      ).withConverter(throwingConverter);
      const snapshot = await getCountFromServer(query_);
      expect(snapshot.data().count).to.equal(1);
    });
  });

  it('count query supports collection groups', () => {
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
      const snapshot = await getCountFromServer(
        collectionGroup(db, collectionGroupId)
      );
      expect(snapshot.data().count).to.equal(2);
    });
  });

  it('getCountFromServer fails if firestore is terminated', () => {
    return withEmptyTestCollection(persistence, async (coll, firestore) => {
      await terminate(firestore);
      expect(() => getCountFromServer(coll)).to.throw(
        'The client has already been terminated.'
      );
    });
  });

  it("terminate doesn't crash when there is count query in flight", () => {
    return withEmptyTestCollection(persistence, async (coll, firestore) => {
      void getCountFromServer(coll);
      await terminate(firestore);
    });
  });

  it('getCountFromServer fails if user is offline', () => {
    return withEmptyTestCollection(persistence, async (coll, firestore) => {
      await disableNetwork(firestore);
      await expect(getCountFromServer(coll)).to.be.eventually.rejectedWith(
        'Failed to get count result because the client is offline'
      );
    });
  });

  // Only verify the error message for missing indexes when running against
  // production, since the Firestore Emulator does not require index creation
  // and will, therefore, never fail in this situation.
  // eslint-disable-next-line no-restricted-properties
  (USE_EMULATOR ? it.skip : it)(
    'getCountFromServer error message is good if missing index',
    () => {
      return withEmptyTestCollection(persistence, async coll => {
        const query_ = query(
          coll,
          where('key1', '==', 42),
          where('key2', '<', 42)
        );
        await expect(getCountFromServer(query_)).to.be.eventually.rejectedWith(
          /index.*https:\/\/console\.firebase\.google\.com/
        );
      });
    }
  );
});
