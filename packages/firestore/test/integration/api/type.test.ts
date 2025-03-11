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

import { expect } from 'chai';

import { addEqualityMatcher } from '../../util/equality_matcher';
import { EventsAccumulator } from '../util/events_accumulator';
import {
  bsonBinaryData,
  bsonObjectId,
  bsonTimestamp,
  Bytes,
  collection,
  doc,
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  FirestoreError,
  GeoPoint,
  getDoc,
  getDocs,
  int32,
  maxKey,
  minKey,
  onSnapshot,
  orderBy,
  query,
  QuerySnapshot,
  refEqual,
  regex,
  runTransaction,
  setDoc,
  Timestamp,
  updateDoc,
  vector
} from '../util/firebase_export';
import {
  apiDescribe,
  withTestProjectIdAndCollectionSettings,
  withTestDb,
  withTestDbsSettings,
  withTestDoc
} from '../util/helpers';
import { DEFAULT_SETTINGS } from '../util/settings';

apiDescribe('Firestore', persistence => {
  addEqualityMatcher();

  async function expectRoundtrip(
    db: Firestore,
    data: {},
    validateSnapshots = true,
    expectedData?: {}
  ): Promise<DocumentSnapshot> {
    expectedData = expectedData ?? data;

    const collRef = collection(db, doc(collection(db, 'a')).id);
    const docRef = doc(collRef);

    await setDoc(docRef, data);
    let docSnapshot = await getDoc(docRef);
    expect(docSnapshot.data()).to.deep.equal(expectedData);

    await updateDoc(docRef, data);
    docSnapshot = await getDoc(docRef);
    expect(docSnapshot.data()).to.deep.equal(expectedData);

    // Validate that the transaction API returns the same types
    await runTransaction(db, async transaction => {
      docSnapshot = await transaction.get(docRef);
      expect(docSnapshot.data()).to.deep.equal(expectedData);
    });

    if (validateSnapshots) {
      let querySnapshot = await getDocs(collRef);
      docSnapshot = querySnapshot.docs[0];
      expect(docSnapshot.data()).to.deep.equal(expectedData);

      const eventsAccumulator = new EventsAccumulator<QuerySnapshot>();
      const unlisten = onSnapshot(collRef, eventsAccumulator.storeEvent);
      querySnapshot = await eventsAccumulator.awaitEvent();
      docSnapshot = querySnapshot.docs[0];
      expect(docSnapshot.data()).to.deep.equal(expectedData);

      unlisten();
    }

    return docSnapshot;
  }

  // TODO(Mila/BSON): Transactions against nightly is having issue, remove this after prod supports BSON
  async function expectRoundtripWithoutTransaction(
    db: Firestore,
    data: {},
    validateSnapshots = true,
    expectedData?: {}
  ): Promise<DocumentSnapshot> {
    expectedData = expectedData ?? data;

    const collRef = collection(db, doc(collection(db, 'a')).id);
    const docRef = doc(collRef);

    await setDoc(docRef, data);
    let docSnapshot = await getDoc(docRef);
    expect(docSnapshot.data()).to.deep.equal(expectedData);

    await updateDoc(docRef, data);
    docSnapshot = await getDoc(docRef);
    expect(docSnapshot.data()).to.deep.equal(expectedData);

    if (validateSnapshots) {
      let querySnapshot = await getDocs(collRef);
      docSnapshot = querySnapshot.docs[0];
      expect(docSnapshot.data()).to.deep.equal(expectedData);

      const eventsAccumulator = new EventsAccumulator<QuerySnapshot>();
      const unlisten = onSnapshot(collRef, eventsAccumulator.storeEvent);
      querySnapshot = await eventsAccumulator.awaitEvent();
      docSnapshot = querySnapshot.docs[0];
      expect(docSnapshot.data()).to.deep.equal(expectedData);

      unlisten();
    }

    return docSnapshot;
  }

  it('can read and write null fields', () => {
    return withTestDb(persistence, async db => {
      await expectRoundtrip(db, { a: 1, b: null });
    });
  });

  it('can read and write number fields', () => {
    return withTestDb(persistence, async db => {
      // TODO(b/174486484): This test should always test -0.0, but right now
      // this leaks to flakes as we turn -0.0 into 0.0 when we build the
      // snapshot from IndexedDb
      const validateSnapshots = !persistence;
      await expectRoundtrip(
        db,
        { a: 1, b: NaN, c: Infinity, d: persistence ? 0.0 : 0.0 },
        validateSnapshots
      );
    });
  });

  it('can read and write array fields', () => {
    return withTestDb(persistence, async db => {
      await expectRoundtrip(db, { array: [1, 'foo', { deep: true }, null] });
    });
  });

  it('can read and write geo point fields', () => {
    return withTestDb(persistence, async db => {
      const docSnapshot = await expectRoundtrip(db, {
        geopoint1: new GeoPoint(1.23, 4.56),
        geopoint2: new GeoPoint(0, 0)
      });

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

  it('can read and write bytes fields', () => {
    return withTestDb(persistence, async db => {
      const docSnapshot = await expectRoundtrip(db, {
        bytes: Bytes.fromUint8Array(new Uint8Array([0, 1, 255]))
      });

      const blob = docSnapshot.data()!['bytes'];
      // TODO(firestorexp): As part of the Compat migration, the SDK
      // should re-wrap the firestore-exp types into the Compat API.
      // Comment this change back in once this is complete (note that this
      // check passes in the legacy API).
      // expect(blob instanceof Blob).to.equal(true);
      expect(blob.toUint8Array()).to.deep.equal(new Uint8Array([0, 1, 255]));
    });
  });

  it('can read and write date fields', () => {
    return withTestDb(persistence, async db => {
      const date = new Date('2017-04-10T09:10:11.123Z');
      // Dates are returned as Timestamps
      const data = { date };
      const expectedData = { date: Timestamp.fromDate(date) };

      await expectRoundtrip(
        db,
        data,
        /* validateSnapshot= */ true,
        expectedData
      );
    });
  });

  it('can read and write timestamp fields', () => {
    return withTestDb(persistence, async db => {
      const timestampValue = Timestamp.now();
      await expectRoundtrip(db, { timestamp: timestampValue });
    });
  });

  it('can read and write document references', () => {
    return withTestDoc(persistence, async (doc, db) => {
      await expectRoundtrip(db, { a: 42, ref: doc });
    });
  });

  it('can read and write document references in an array', () => {
    return withTestDoc(persistence, async (doc, db) => {
      await expectRoundtrip(db, { a: 42, refs: [doc] });
    });
  });

  it('can read and write vector fields', () => {
    return withTestDoc(persistence, async (doc, db) => {
      await expectRoundtrip(db, { vector: vector([1, 2, 3]) });
    });
  });

  // TODO(Mila/BSON): simplify the test setup once prod support BSON
  const NIGHTLY_PROJECT_ID = 'firestore-sdk-nightly';
  const settings = {
    ...DEFAULT_SETTINGS,
    host: 'test-firestore.sandbox.googleapis.com'
  };

  it('can read and write minKey fields', () => {
    return withTestDbsSettings(
      persistence,
      NIGHTLY_PROJECT_ID,
      settings,
      1,
      async dbs => {
        await expectRoundtripWithoutTransaction(dbs[0], { min: minKey() });
      }
    );
  });

  it('can read and write maxKey fields', () => {
    return withTestDbsSettings(
      persistence,
      NIGHTLY_PROJECT_ID,
      settings,
      1,
      async dbs => {
        await expectRoundtripWithoutTransaction(dbs[0], { max: maxKey() });
      }
    );
  });

  it('can read and write regex fields', () => {
    return withTestDbsSettings(
      persistence,
      NIGHTLY_PROJECT_ID,
      settings,
      1,
      async dbs => {
        await expectRoundtripWithoutTransaction(dbs[0], {
          regex: regex('^foo', 'i')
        });
      }
    );
  });

  it('can read and write int32 fields', () => {
    return withTestDbsSettings(
      persistence,
      NIGHTLY_PROJECT_ID,
      settings,
      1,
      async dbs => {
        await expectRoundtripWithoutTransaction(dbs[0], { int32: int32(1) });
      }
    );
  });

  it('can read and write bsonTimestamp fields', () => {
    return withTestDbsSettings(
      persistence,
      NIGHTLY_PROJECT_ID,
      settings,
      1,
      async dbs => {
        await expectRoundtripWithoutTransaction(dbs[0], {
          bsonTimestamp: bsonTimestamp(1, 2)
        });
      }
    );
  });

  it('can read and write bsonObjectId fields', () => {
    return withTestDbsSettings(
      persistence,
      NIGHTLY_PROJECT_ID,
      settings,
      1,
      async dbs => {
        await expectRoundtripWithoutTransaction(dbs[0], {
          objectId: bsonObjectId('507f191e810c19729de860ea')
        });
      }
    );
  });

  it('can read and write bsonBinaryData fields', () => {
    return withTestDbsSettings(
      persistence,
      NIGHTLY_PROJECT_ID,
      settings,
      1,
      async dbs => {
        await expectRoundtripWithoutTransaction(dbs[0], {
          binary: bsonBinaryData(1, new Uint8Array([1, 2, 3]))
        });
      }
    );
  });

  it('can read and write bson fields in an array', () => {
    return withTestDbsSettings(
      persistence,
      NIGHTLY_PROJECT_ID,
      settings,
      1,
      async dbs => {
        await expectRoundtripWithoutTransaction(dbs[0], {
          array: [
            bsonBinaryData(1, new Uint8Array([1, 2, 3])),
            bsonObjectId('507f191e810c19729de860ea'),
            int32(1),
            minKey(),
            maxKey(),
            regex('^foo', 'i')
          ]
        });
      }
    );
  });

  it('can read and write bson fields in an object', () => {
    return withTestDbsSettings(
      persistence,
      NIGHTLY_PROJECT_ID,
      settings,
      1,
      async dbs => {
        await expectRoundtripWithoutTransaction(dbs[0], {
          object: {
            binary: bsonBinaryData(1, new Uint8Array([1, 2, 3])),
            objectId: bsonObjectId('507f191e810c19729de860ea'),
            int32: int32(1),
            min: minKey(),
            max: maxKey(),
            regex: regex('^foo', 'i')
          }
        });
      }
    );
  });

  it('invalid 32-bit integer gets rejected', async () => {
    return withTestProjectIdAndCollectionSettings(
      persistence,
      NIGHTLY_PROJECT_ID,
      settings,
      {},
      async coll => {
        const docRef = doc(coll, 'test-doc');
        let errorMessage;
        try {
          await setDoc(docRef, { key: int32(2147483648) });
        } catch (err) {
          errorMessage = (err as FirestoreError)?.message;
        }
        expect(errorMessage).to.contains(
          "The field '__int__' value (2,147,483,648) is too large to be converted to a 32-bit integer."
        );

        try {
          await setDoc(docRef, { key: int32(-2147483650) });
        } catch (err) {
          errorMessage = (err as FirestoreError)?.message;
        }
        expect(errorMessage).to.contains(
          "The field '__int__' value (-2,147,483,650) is too large to be converted to a 32-bit integer."
        );
      }
    );
  });

  it('invalid BSON timestamp gets rejected', async () => {
    return withTestProjectIdAndCollectionSettings(
      persistence,
      NIGHTLY_PROJECT_ID,
      settings,
      {},
      async coll => {
        const docRef = doc(coll, 'test-doc');
        let errorMessage;
        try {
          // BSON timestamp larger than 32-bit integer gets rejected
          await setDoc(docRef, { key: bsonTimestamp(4294967296, 2) });
        } catch (err) {
          errorMessage = (err as FirestoreError)?.message;
        }
        expect(errorMessage).to.contains(
          "The field 'seconds' value (4,294,967,296) does not represent an unsigned 32-bit integer."
        );

        try {
          // negative BSON timestamp gets rejected
          await setDoc(docRef, { key: bsonTimestamp(-1, 2) });
        } catch (err) {
          errorMessage = (err as FirestoreError)?.message;
        }
        expect(errorMessage).to.contains(
          "The field 'seconds' value (-1) does not represent an unsigned 32-bit integer."
        );
      }
    );
  });

  it('invalid regex value gets rejected', async () => {
    return withTestProjectIdAndCollectionSettings(
      persistence,
      NIGHTLY_PROJECT_ID,
      settings,
      {},
      async coll => {
        const docRef = doc(coll, 'test-doc');
        let errorMessage;
        try {
          await setDoc(docRef, { key: regex('foo', 'a') });
        } catch (err) {
          errorMessage = (err as FirestoreError)?.message;
        }
        expect(errorMessage).to.contains(
          "Invalid regex option 'a'. Supported options are 'i', 'm', 's', 'u', and 'x'."
        );
      }
    );
  });

  it('invalid bsonObjectId value gets rejected', async () => {
    return withTestProjectIdAndCollectionSettings(
      persistence,
      NIGHTLY_PROJECT_ID,
      settings,
      {},
      async coll => {
        const docRef = doc(coll, 'test-doc');

        let errorMessage;
        try {
          // bsonObjectId with length not equal to 24 gets rejected
          await setDoc(docRef, { key: bsonObjectId('foo') });
        } catch (err) {
          errorMessage = (err as FirestoreError)?.message;
        }
        expect(errorMessage).to.contains(
          'Object ID hex string has incorrect length.'
        );
      }
    );
  });

  it('invalid bsonBinaryData value gets rejected', async () => {
    return withTestProjectIdAndCollectionSettings(
      persistence,
      NIGHTLY_PROJECT_ID,
      settings,
      {},
      async coll => {
        const docRef = doc(coll, 'test-doc');
        let errorMessage;
        try {
          await setDoc(docRef, {
            key: bsonBinaryData(1234, new Uint8Array([1, 2, 3]))
          });
        } catch (err) {
          errorMessage = (err as FirestoreError)?.message;
        }
        expect(errorMessage).to.contains(
          'The subtype for BsonBinaryData must be a value in the inclusive [0, 255] range.'
        );
      }
    );
  });

  it('can order values of different TypeOrder together', async () => {
    const testDocs: { [key: string]: DocumentData } = {
      nullValue: { key: null },
      minValue: { key: minKey() },
      booleanValue: { key: true },
      nanValue: { key: NaN },
      int32Value: { key: int32(1) },
      doubleValue: { key: 2.0 },
      integerValue: { key: 3 },
      timestampValue: { key: new Timestamp(100, 123456000) },
      bsonTimestampValue: { key: bsonTimestamp(1, 2) },
      stringValue: { key: 'string' },
      bytesValue: { key: Bytes.fromUint8Array(new Uint8Array([0, 1, 255])) },
      bsonBinaryValue: { key: bsonBinaryData(1, new Uint8Array([1, 2, 3])) },
      // referenceValue: {key: ref('coll/doc')},
      referenceValue: { key: 'placeholder' },
      objectIdValue: { key: bsonObjectId('507f191e810c19729de860ea') },
      geoPointValue: { key: new GeoPoint(0, 0) },
      regexValue: { key: regex('^foo', 'i') },
      arrayValue: { key: [1, 2] },
      vectorValue: { key: vector([1, 2]) },
      objectValue: { key: { a: 1 } },
      maxValue: { key: maxKey() }
    };

    return withTestProjectIdAndCollectionSettings(
      persistence,
      NIGHTLY_PROJECT_ID,
      settings,
      testDocs,
      async coll => {
        // TODO(Mila/BSON): remove after prod supports bson
        const docRef = doc(coll, 'doc');
        await setDoc(doc(coll, 'referenceValue'), { key: docRef });

        const orderedQuery = query(coll, orderBy('key'));
        const snapshot = await getDocs(orderedQuery);
        for (let i = 0; i < snapshot.docs.length; i++) {
          const actualDoc = snapshot.docs[i].data().key;
          const expectedDoc =
            testDocs[snapshot.docs[i].id as keyof typeof testDocs].key;
          if (actualDoc instanceof DocumentReference) {
            // deep.equal doesn't work with DocumentReference
            expect(refEqual(actualDoc, docRef)).to.be.true;
          } else {
            expect(actualDoc).to.deep.equal(expectedDoc);
          }
        }
      }
    );
  });
});
