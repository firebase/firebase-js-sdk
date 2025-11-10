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
