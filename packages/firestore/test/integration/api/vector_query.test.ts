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

import { setDoc } from '../../../src/lite-api/reference_impl';
import { AutoId } from '../../../src/util/misc';
import {
  query,
  where,
  vector,
  findNearest,
  getDocsFromServer,
  collection,
  DocumentData,
  doc,
  ensureFirestoreConfigured
} from '../util/firebase_export';
import { apiDescribe, withTestDb } from '../util/helpers';

apiDescribe('vector search', persistence => {
  it('supports findNearest by EUCLIDEAN distance', async () => {
    const testId = AutoId.newId();

    return withTestDb(persistence, async firestore => {
      ensureFirestoreConfigured(firestore);

      const collectionReference = collection(
        firestore,
        'index-test-collection'
      );
      const docs: Record<string, DocumentData> = {
        a: { foo: 'bar', testId },
        b: { foo: 'xxx', testId, embedding: vector([10, 10]) },
        c: { foo: 'bar', testId, embedding: vector([1, 1]) },
        d: { foo: 'bar', testId, embedding: vector([10, 0]) },
        e: { foo: 'bar', testId, embedding: vector([20, 0]) },
        f: { foo: 'bar', testId, embedding: vector([100, 100]) }
      };

      for (const docId in docs) {
        if (!docs.hasOwnProperty(docId)) {
          continue;
        }
        await setDoc(doc(collectionReference, docId), docs[docId]);
      }

      const baseQuery = query(
        collectionReference,
        where('foo', '==', 'bar'),
        where('testId', '==', testId)
      );

      const vectorQuery = findNearest(baseQuery, {
        vectorField: 'embedding',
        queryVector: [10, 10],
        limit: 3,
        distanceMeasure: 'EUCLIDEAN'
      });

      const res = await getDocsFromServer(vectorQuery);
      expect(res.size).to.equal(3);
      expect(res.docs[0].id).to.equal('d');
      expect(res.docs[1].id).to.equal('c');
      expect(res.docs[2].id).to.equal('e');
    });
  });
});
