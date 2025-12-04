/**
 * @license
 * Copyright 2025 Google LLC
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
  count,
  setDoc,
  getAggregateFromServer,
  getDoc,
  average
} from '../util/firebase_export';
import { apiDescribe, withTestCollection, withTestDoc } from '../util/helpers';

apiDescribe('console support', persistence => {
  it('supports DocumentSnapshot serialization to proto', async () => {
    await withTestDoc(persistence, async (docRef, firestore) => {
      await setDoc(docRef, { foo: 3, bar: 3.5 });
      const doc = await getDoc(docRef);
      expect(doc._fieldsProto()).to.deep.equal({
        'foo': {
          'integerValue': '3'
        },
        'bar': {
          'doubleValue': 3.5
        }
      });
    });
  });

  it('supports AggregateSnapshot serialization to proto', async () => {
    await withTestCollection(
      persistence,
      {
        1: { foo: 1 },
        2: { foo: 1 }
      },
      async collRef => {
        const doc = await getAggregateFromServer(collRef, {
          count: count(),
          avg: average('foo')
        });
        expect(doc._fieldsProto()).to.deep.equal({
          'count': {
            'integerValue': '2'
          },
          'avg': {
            'doubleValue': 1.0
          }
        });
      }
    );
  });
});
