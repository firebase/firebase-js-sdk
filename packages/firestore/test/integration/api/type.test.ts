/**
 * @license
 * Copyright 2017 Google LLC
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

import * as firestore from '@firebase/firestore-types';
import { expect } from 'chai';
import { addEqualityMatcher } from '../../util/equality_matcher';
import * as firebaseExport from '../util/firebase_export';
import { apiDescribe, withTestDb, withTestDoc } from '../util/helpers';
import { EventsAccumulator } from '../util/events_accumulator';

const Blob = firebaseExport.Blob;
const GeoPoint = firebaseExport.GeoPoint;
const Timestamp = firebaseExport.Timestamp;

apiDescribe('Firestore', (persistence: boolean) => {
  addEqualityMatcher();

  async function expectRoundtrip(
    db: firestore.FirebaseFirestore,
    data: {},
    validateSnapshots = true
  ): Promise<void> {
    const collection = db.collection(db.collection('a').doc().id);
    const doc = collection.doc();
    await doc.set(data);

    let docSnapshot = await doc.get();
    expect(docSnapshot.data()).to.deep.equal(data);

    if (validateSnapshots) {
      let querySnapshot = await collection.get();
      docSnapshot = querySnapshot.docs[0];
      expect(docSnapshot.data()).to.deep.equal(data);

      const eventsAccumulator = new EventsAccumulator<
        firestore.QuerySnapshot
      >();
      const unlisten = collection.onSnapshot(eventsAccumulator.storeEvent);
      querySnapshot = await eventsAccumulator.awaitEvent();
      docSnapshot = querySnapshot.docs[0];
      expect(docSnapshot.data()).to.deep.equal(data);

      unlisten();
    }
  }

  it('can read and write null fields', () => {
    return withTestDb(persistence, db => {
      return expectRoundtrip(db, { a: 1, b: null });
    });
  });

  it('can read and write number fields', () => {
    return withTestDb(persistence, db => {
      // TODO(b/174486484): If we build ViewSnapshots from IndexedDb, this test
      // fails since we first store the backend proto in IndexedDb, which turns
      // -0.0 into 0.0.
      const validateSnapshots = !persistence;
      return expectRoundtrip(
        db,
        { a: 1, b: NaN, c: Infinity, d: -0.0 },
        validateSnapshots
      );
    });
  });

  it('can read and write array fields', () => {
    return withTestDb(persistence, db => {
      return expectRoundtrip(db, { array: [1, 'foo', { deep: true }, null] });
    });
  });

  it('can read and write geo point fields', () => {
    return withTestDoc(persistence, doc => {
      return doc
        .set({
          geopoint1: new GeoPoint(1.23, 4.56),
          geopoint2: new GeoPoint(0, 0)
        })
        .then(() => {
          return doc.get();
        })
        .then(docSnapshot => {
          const latLong = docSnapshot.data()!['geopoint1'];
          expect(latLong instanceof GeoPoint).to.equal(true);
          expect(latLong.latitude).to.equal(1.23);
          expect(latLong.longitude).to.equal(4.56);

          const zeroLatLong = docSnapshot.data()!['geopoint2'];
          expect(zeroLatLong instanceof GeoPoint).to.equal(true);
          expect(zeroLatLong.latitude).to.equal(0);
          expect(zeroLatLong.longitude).to.equal(0);
        });
    });
  });

  it('can read and write bytes fields', () => {
    return withTestDoc(persistence, doc => {
      return doc
        .set({
          bytes: Blob.fromUint8Array(new Uint8Array([0, 1, 255]))
        })
        .then(() => {
          return doc.get();
        })
        .then(docSnapshot => {
          const blob = docSnapshot.data()!['bytes'];
          // TODO(firestorexp): As part of the Compat migration, the SDK
          // should re-wrap the firestore-exp types into the Compat API.
          // Comment this change back in once this is complete (note that this
          // check passes in the legacy API).
          // expect(blob instanceof Blob).to.equal(true);
          expect(blob.toUint8Array()).to.deep.equal(
            new Uint8Array([0, 1, 255])
          );
        });
    });
  });

  it('can read and write date fields', () => {
    return withTestDb(persistence, db => {
      const dateValue = new Date('2017-04-10T09:10:11.123Z');
      // Dates are returned as Timestamps, so expectRoundtrip can't be used
      // here.
      const doc = db.collection('rooms').doc();
      return doc
        .set({ date: dateValue })
        .then(() => doc.get())
        .then(snapshot => {
          expect(snapshot.data()).to.deep.equal({
            date: Timestamp.fromDate(dateValue)
          });
        });
    });
  });

  it('can read and write timestamp fields', () => {
    return withTestDb(persistence, db => {
      const timestampValue = Timestamp.now();
      return expectRoundtrip(db, { timestamp: timestampValue });
    });
  });

  it('can read and write document references', () => {
    return withTestDoc(persistence, doc => {
      return expectRoundtrip(doc.firestore, { a: 42, ref: doc });
    });
  });

  it('can read and write document references in an array', () => {
    return withTestDoc(persistence, doc => {
      return expectRoundtrip(doc.firestore, { a: 42, refs: [doc] });
    });
  });
});
