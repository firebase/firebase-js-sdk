/**
 * @license
 * Copyright 2017 Google Inc.
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
import { LogLevel, getLogLevel, setLogLevel } from '../../../src/util/log';
import firebase from '../util/firebase_export';
import {
  apiDescribe,
  DEFAULT_SETTINGS,
  toDataArray,
  withTestCollection,
  withTestCollectionSettings,
  withTestDoc
} from '../util/helpers';

const FieldPath = firebase.firestore!.FieldPath;
const FieldValue = firebase.firestore!.FieldValue;
const Timestamp = firebase.firestore!.Timestamp;

// eslint-disable-next-line @typescript-eslint/no-explicit-any, Allow custom types for testing.
type AnyTestData = any;

apiDescribe('Nested Fields', (persistence: boolean) => {
  const testData = (n?: number): AnyTestData => {
    n = n || 1;
    return {
      name: 'room ' + n,
      metadata: {
        createdAt: n,
        deep: {
          field: 'deep-field-' + n
        }
      }
    };
  };

  it('can be written with set()', () => {
    return withTestDoc(persistence, doc => {
      return doc
        .set(testData())
        .then(() => doc.get())
        .then(docSnap => {
          expect(docSnap.data()).to.deep.equal(testData());
        });
    });
  });

  it('can be read directly with .get(<string>)', () => {
    return withTestDoc(persistence, doc => {
      const obj = testData();
      return doc
        .set(obj)
        .then(() => doc.get())
        .then(docSnap => {
          expect(docSnap.data()).to.deep.equal(obj);
          expect(docSnap.get('name')).to.deep.equal(obj.name);
          expect(docSnap.get('metadata')).to.deep.equal(obj.metadata);
          expect(docSnap.get('metadata.deep.field')).to.deep.equal(
            obj.metadata.deep.field
          );
          expect(docSnap.get('metadata.nofield')).to.be.undefined;
          expect(docSnap.get('nometadata.nofield')).to.be.undefined;
        });
    });
  });

  it('can be read directly with .get(<FieldPath>)', () => {
    return withTestDoc(persistence, doc => {
      const obj = testData();
      return doc
        .set(obj)
        .then(() => doc.get())
        .then(docSnap => {
          expect(docSnap.data()).to.deep.equal(obj);
          expect(docSnap.get(new FieldPath('name'))).to.deep.equal(obj.name);
          expect(docSnap.get(new FieldPath('metadata'))).to.deep.equal(
            obj.metadata
          );
          expect(
            docSnap.get(new FieldPath('metadata', 'deep', 'field'))
          ).to.deep.equal(obj.metadata.deep.field);
          expect(docSnap.get(new FieldPath('metadata', 'nofield'))).to.be
            .undefined;
          expect(docSnap.get(new FieldPath('nometadata', 'nofield'))).to.be
            .undefined;
        });
    });
  });

  it('can be updated with update(<string>)', () => {
    return withTestDoc(persistence, doc => {
      return doc
        .set(testData())
        .then(() => {
          return doc.update({
            'metadata.deep.field': 100,
            'metadata.added': 200
          });
        })
        .then(() => doc.get())
        .then(docSnap => {
          expect(docSnap.data()).to.deep.equal({
            name: 'room 1',
            metadata: {
              createdAt: 1,
              deep: {
                field: 100
              },
              added: 200
            }
          });
        });
    });
  });

  it('can be updated with update(<FieldPath>)', () => {
    return withTestDoc(persistence, doc => {
      return doc
        .set(testData())
        .then(() => {
          return doc.update(
            new FieldPath('metadata', 'deep', 'field'),
            100,
            new FieldPath('metadata', 'added'),
            200
          );
        })
        .then(() => doc.get())
        .then(docSnap => {
          expect(docSnap.data()).to.deep.equal({
            name: 'room 1',
            metadata: {
              createdAt: 1,
              deep: {
                field: 100
              },
              added: 200
            }
          });
        });
    });
  });

  it('can be used with query.where(<string>).', () => {
    const testDocs = {
      '1': testData(300),
      '2': testData(100),
      '3': testData(200)
    };
    return withTestCollection(persistence, testDocs, coll => {
      return coll
        .where('metadata.createdAt', '>=', 200)
        .get()
        .then(results => {
          // inequality adds implicit sort on field
          expect(toDataArray(results)).to.deep.equal([
            testData(200),
            testData(300)
          ]);
        });
    });
  });

  it('can be used with query.where(<FieldPath>).', () => {
    const testDocs = {
      '1': testData(300),
      '2': testData(100),
      '3': testData(200)
    };
    return withTestCollection(persistence, testDocs, coll => {
      return coll
        .where(new FieldPath('metadata', 'createdAt'), '>=', 200)
        .get()
        .then(results => {
          // inequality adds implicit sort on field
          expect(toDataArray(results)).to.deep.equal([
            testData(200),
            testData(300)
          ]);
        });
    });
  });

  it('can be used with query.orderBy(<string>).', () => {
    const testDocs = {
      '1': testData(300),
      '2': testData(100),
      '3': testData(200)
    };
    return withTestCollection(persistence, testDocs, coll => {
      return coll
        .orderBy('metadata.createdAt')
        .get()
        .then(results => {
          expect(toDataArray(results)).to.deep.equal([
            testData(100),
            testData(200),
            testData(300)
          ]);
        });
    });
  });

  it('can be used with query.orderBy(<FieldPath>).', () => {
    const testDocs = {
      '1': testData(300),
      '2': testData(100),
      '3': testData(200)
    };
    return withTestCollection(persistence, testDocs, coll => {
      return coll
        .orderBy(new FieldPath('metadata', 'createdAt'))
        .get()
        .then(results => {
          expect(toDataArray(results)).to.deep.equal([
            testData(100),
            testData(200),
            testData(300)
          ]);
        });
    });
  });
});

// NOTE(mikelehen): I originally combined these tests with the above ones, but
// Datastore currently prohibits having nested fields and fields with dots in
// the same entity, so I'm separating them.
apiDescribe('Fields with special characters', (persistence: boolean) => {
  const testData = (n?: number): AnyTestData => {
    n = n || 1;
    return {
      field: 'field ' + n,
      'field.dot': n,
      'field\\slash': n
    };
  };

  it('can be written with set()', () => {
    return withTestDoc(persistence, doc => {
      return doc
        .set(testData())
        .then(() => doc.get())
        .then(docSnap => {
          expect(docSnap.data()).to.deep.equal(testData());
        });
    });
  });

  it('can be read directly with .data(<field>)', () => {
    return withTestDoc(persistence, doc => {
      const obj = testData();
      return doc
        .set(obj)
        .then(() => doc.get())
        .then(docSnap => {
          expect(docSnap.data()).to.deep.equal(obj);
          expect(docSnap.get(new FieldPath('field.dot'))).to.deep.equal(
            obj['field.dot']
          );
          expect(docSnap.get('field\\slash')).to.deep.equal(
            obj['field\\slash']
          );
        });
    });
  });

  it('can be updated with update()', () => {
    return withTestDoc(persistence, doc => {
      return doc
        .set(testData())
        .then(() => {
          return doc.update(
            new FieldPath('field.dot'),
            100,
            'field\\slash',
            200
          );
        })
        .then(() => doc.get())
        .then(docSnap => {
          expect(docSnap.data()).to.deep.equal({
            field: 'field 1',
            'field.dot': 100,
            'field\\slash': 200
          });
        });
    });
  });

  it('can be used in query filters.', () => {
    const testDocs = {
      '1': testData(300),
      '2': testData(100),
      '3': testData(200)
    };
    return withTestCollection(persistence, testDocs, coll => {
      // inequality adds implicit sort on field
      const expected = [testData(200), testData(300)];
      return coll
        .where(new FieldPath('field.dot'), '>=', 200)
        .get()
        .then(results => {
          expect(toDataArray(results)).to.deep.equal(expected);
        })
        .then(() => coll.where('field\\slash', '>=', 200).get())
        .then(results => {
          expect(toDataArray(results)).to.deep.equal(expected);
        });
    });
  });

  it('can be used in a query orderBy.', () => {
    const testDocs = {
      '1': testData(300),
      '2': testData(100),
      '3': testData(200)
    };
    return withTestCollection(persistence, testDocs, coll => {
      const expected = [testData(100), testData(200), testData(300)];
      return coll
        .orderBy(new FieldPath('field.dot'))
        .get()
        .then(results => {
          expect(toDataArray(results)).to.deep.equal(expected);
        })
        .then(() => coll.orderBy('field\\slash').get())
        .then(results => {
          expect(toDataArray(results)).to.deep.equal(expected);
        });
    });
  });
});

apiDescribe('Timestamp Fields in snapshots', (persistence: boolean) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, Figure out how to pass in the Timestamp type
  const testDataWithTimestamps = (ts: any): AnyTestData => {
    return { timestamp: ts, nested: { timestamp2: ts } };
  };

  it('are returned as native dates if timestampsInSnapshots set to false', () => {
    // Avoid the verbose log message triggered by timestampsInSnapshots ==
    // false.
    const logLevel = getLogLevel();
    setLogLevel(LogLevel.SILENT);

    const settings = { ...DEFAULT_SETTINGS };
    settings['timestampsInSnapshots'] = false;

    const timestamp = new Timestamp(100, 123456789);
    const testDocs = { a: testDataWithTimestamps(timestamp) };
    return withTestCollectionSettings(persistence, settings, testDocs, coll => {
      setLogLevel(logLevel);
      return coll
        .doc('a')
        .get()
        .then(docSnap => {
          expect(docSnap.get('timestamp'))
            .to.be.a('date')
            .that.deep.equals(timestamp.toDate());
          expect(docSnap.data()!['timestamp'])
            .to.be.a('date')
            .that.deep.equals(timestamp.toDate());

          expect(docSnap.get('nested.timestamp2'))
            .to.be.a('date')
            .that.deep.equals(timestamp.toDate());
          expect(docSnap.data()!['nested']['timestamp2'])
            .to.be.a('date')
            .that.deep.equals(timestamp.toDate());
        });
    });
  });

  it('are returned as Timestamps', () => {
    const timestamp = new Timestamp(100, 123456000);
    // Timestamps are currently truncated to microseconds after being written to
    // the database, so a truncated version of the timestamp is needed for
    // comparisons.
    const truncatedTimestamp = new Timestamp(
      timestamp.seconds,
      Math.floor(timestamp.nanoseconds / 1000) * 1000
    );

    return withTestDoc(persistence, doc => {
      return doc
        .set(testDataWithTimestamps(timestamp))
        .then(() => doc.get())
        .then(docSnap => {
          expect(docSnap.get('timestamp'))
            .to.be.an.instanceof(Timestamp)
            .that.deep.equals(truncatedTimestamp);
          expect(docSnap.data()!['timestamp'])
            .to.be.an.instanceof(Timestamp)
            .that.deep.equals(truncatedTimestamp);

          expect(docSnap.get('nested.timestamp2'))
            .to.be.an.instanceof(Timestamp)
            .that.deep.equals(truncatedTimestamp);
          expect(docSnap.data()!['nested']['timestamp2'])
            .to.be.an.instanceof(Timestamp)
            .that.deep.equals(truncatedTimestamp);
        });
    });
  });

  it('timestampsInSnapshots affects server timestamps', () => {
    const logLevel = getLogLevel();
    setLogLevel(LogLevel.SILENT);

    const settings = { ...DEFAULT_SETTINGS };
    settings['timestampsInSnapshots'] = false;
    const testDocs = {
      a: { timestamp: FieldValue.serverTimestamp() }
    };

    return withTestCollectionSettings(persistence, settings, testDocs, coll => {
      setLogLevel(logLevel);
      return coll
        .doc('a')
        .get()
        .then(docSnap => {
          expect(
            docSnap.get('timestamp', {
              serverTimestamps: 'estimate'
            })
          ).to.be.an.instanceof(Date);
        });
    });
  });
});
