/**
 * @license
 * Copyright 2026 Google LLC
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

import {
  FieldPath,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  startAt,
  Timestamp,
  updateDoc,
  where
} from '../util/firebase_export';
import {
  apiDescribe,
  toDataArray,
  withTestCollection,
  withTestCollectionSettings,
  withTestDoc,
  withTestDocAndSettings
} from '../util/helpers';
import { DEFAULT_SETTINGS } from '../util/settings';

// Allow custom types for testing.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTestData = any;

apiDescribe('Nested Fields', persistence => {
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
      return setDoc(doc, testData())
        .then(() => getDoc(doc))
        .then(docSnap => {
          expect(docSnap.data()).toEqual(testData());
        });
    });
  });

  it('can be read directly with .get(<string>)', () => {
    return withTestDoc(persistence, doc => {
      const obj = testData();
      return setDoc(doc, obj)
        .then(() => getDoc(doc))
        .then(docSnap => {
          expect(docSnap.data()).toEqual(obj);
          expect(docSnap.get('name')).toEqual(obj.name);
          expect(docSnap.get('metadata')).toEqual(obj.metadata);
          expect(docSnap.get('metadata.deep.field')).toEqual(
            obj.metadata.deep.field
          );
          expect(docSnap.get('metadata.nofield')).toBeUndefined();
          expect(docSnap.get('nometadata.nofield')).toBeUndefined();
        });
    });
  });

  it('can be read directly with .get(<FieldPath>)', () => {
    return withTestDoc(persistence, doc => {
      const obj = testData();
      return setDoc(doc, obj)
        .then(() => getDoc(doc))
        .then(docSnap => {
          expect(docSnap.data()).toEqual(obj);
          expect(docSnap.get(new FieldPath('name'))).toEqual(obj.name);
          expect(docSnap.get(new FieldPath('metadata'))).toEqual(obj.metadata);
          expect(
            docSnap.get(new FieldPath('metadata', 'deep', 'field'))
          ).toEqual(obj.metadata.deep.field);
          expect(
            docSnap.get(new FieldPath('metadata', 'nofield'))
          ).toBeUndefined();
          expect(
            docSnap.get(new FieldPath('nometadata', 'nofield'))
          ).toBeUndefined();
        });
    });
  });

  it('can be updated with update(<string>)', () => {
    return withTestDoc(persistence, doc => {
      return setDoc(doc, testData())
        .then(() =>
          updateDoc(doc, {
            'metadata.deep.field': 100,
            'metadata.added': 200
          })
        )
        .then(() => getDoc(doc))
        .then(docSnap => {
          expect(docSnap.data()).toEqual({
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
      return setDoc(doc, testData())
        .then(() =>
          updateDoc(
            doc,
            new FieldPath('metadata', 'deep', 'field'),
            100,
            new FieldPath('metadata', 'added'),
            200
          )
        )
        .then(() => getDoc(doc))
        .then(docSnap => {
          expect(docSnap.data()).toEqual({
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
      return getDocs(query(coll, where('metadata.createdAt', '>=', 200))).then(
        results => {
          // inequality adds implicit sort on field
          expect(toDataArray(results)).toEqual([testData(200), testData(300)]);
        }
      );
    });
  });

  it('can be used with query.where(<FieldPath>).', () => {
    const testDocs = {
      '1': testData(300),
      '2': testData(100),
      '3': testData(200)
    };
    return withTestCollection(persistence, testDocs, coll => {
      return getDocs(
        query(coll, where(new FieldPath('metadata', 'createdAt'), '>=', 200))
      ).then(results => {
        // inequality adds implicit sort on field
        expect(toDataArray(results)).toEqual([testData(200), testData(300)]);
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
      return getDocs(query(coll, orderBy('metadata.createdAt'))).then(
        results => {
          expect(toDataArray(results)).toEqual([
            testData(100),
            testData(200),
            testData(300)
          ]);
        }
      );
    });
  });

  it('can be used with query.orderBy(<FieldPath>).', () => {
    const testDocs = {
      '1': testData(300),
      '2': testData(100),
      '3': testData(200)
    };
    return withTestCollection(persistence, testDocs, coll => {
      return getDocs(
        query(coll, orderBy(new FieldPath('metadata', 'createdAt')))
      ).then(results => {
        expect(toDataArray(results)).toEqual([
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
apiDescribe('Fields with special characters', persistence => {
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
      return setDoc(doc, testData())
        .then(() => getDoc(doc))
        .then(docSnap => {
          expect(docSnap.data()).toEqual(testData());
        });
    });
  });

  it('can be read directly with .data(<field>)', () => {
    return withTestDoc(persistence, doc => {
      const obj = testData();
      return setDoc(doc, obj)
        .then(() => getDoc(doc))
        .then(docSnap => {
          expect(docSnap.data()).toEqual(obj);
          expect(docSnap.get(new FieldPath('field.dot'))).toEqual(
            obj['field.dot']
          );
          expect(docSnap.get('field\\slash')).toEqual(obj['field\\slash']);
        });
    });
  });

  it('can be updated with update()', () => {
    return withTestDoc(persistence, doc => {
      return setDoc(doc, testData())
        .then(() => {
          return updateDoc(
            doc,
            new FieldPath('field.dot'),
            100,
            'field\\slash',
            200
          );
        })
        .then(() => getDoc(doc))
        .then(docSnap => {
          expect(docSnap.data()).toEqual({
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
      return getDocs(query(coll, where(new FieldPath('field.dot'), '>=', 200)))
        .then(results => {
          expect(toDataArray(results)).toEqual(expected);
        })
        .then(() => getDocs(query(coll, where('field\\slash', '>=', 200))))
        .then(results => {
          expect(toDataArray(results)).toEqual(expected);
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
      return getDocs(query(coll, orderBy(new FieldPath('field.dot'))))
        .then(results => {
          expect(toDataArray(results)).toEqual(expected);
        })
        .then(() => getDocs(query(coll, orderBy('field\\slash'))))
        .then(results => {
          expect(toDataArray(results)).toEqual(expected);
        });
    });
  });
});

apiDescribe('Timestamp Fields in snapshots', persistence => {
  // Figure out how to pass in the Timestamp type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const testDataWithTimestamps = (ts: any): AnyTestData => {
    return { timestamp: ts, nested: { timestamp2: ts } };
  };

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
      return setDoc(doc, testDataWithTimestamps(timestamp))
        .then(() => getDoc(doc))
        .then(docSnap => {
          expect(docSnap.get('timestamp')).toBeInstanceOf(Timestamp);
          expect(docSnap.get('timestamp')).toEqual(truncatedTimestamp);
          expect(docSnap.data()!['timestamp']).toBeInstanceOf(Timestamp);
          expect(docSnap.data()!['timestamp']).toEqual(truncatedTimestamp);

          expect(docSnap.get('nested.timestamp2')).toBeInstanceOf(Timestamp);
          expect(docSnap.get('nested.timestamp2')).toEqual(truncatedTimestamp);
          expect(docSnap.data()!['nested']['timestamp2']).toBeInstanceOf(
            Timestamp
          );
          expect(docSnap.data()!['nested']['timestamp2']).toEqual(
            truncatedTimestamp
          );
        });
    });
  });
});

apiDescribe('`undefined` properties', persistence => {
  const settings = { ...DEFAULT_SETTINGS };
  settings.ignoreUndefinedProperties = true;

  it('are ignored in set()', () => {
    return withTestDocAndSettings(persistence, settings, async doc => {
      await setDoc(doc, { foo: 'foo', 'bar': undefined });
      const docSnap = await getDoc(doc);
      expect(docSnap.data()).toEqual({ foo: 'foo' });
    });
  });

  it('are ignored in set({ merge: true })', () => {
    return withTestDocAndSettings(persistence, settings, async doc => {
      await setDoc(doc, { foo: 'foo', bar: 'unchanged' });
      await setDoc(doc, { foo: 'foo', bar: undefined }, { merge: true });
      const docSnap = await getDoc(doc);
      expect(docSnap.data()).toEqual({ foo: 'foo', bar: 'unchanged' });
    });
  });

  it('are ignored in update()', () => {
    return withTestDocAndSettings(persistence, settings, async doc => {
      await setDoc(doc, {});
      await updateDoc(doc, { a: { foo: 'foo', 'bar': undefined } });
      await updateDoc(doc, 'b', { foo: 'foo', 'bar': undefined });
      const docSnap = await getDoc(doc);
      expect(docSnap.data()).toEqual({
        a: { foo: 'foo' },
        b: { foo: 'foo' }
      });
    });
  });

  it('are ignored in Query.where()', () => {
    return withTestCollectionSettings(
      persistence,
      settings,
      { 'doc1': { nested: { foo: 'foo' } } },
      async coll => {
        const filteredQuery = query(
          coll,
          where('nested', '==', {
            foo: 'foo',
            'bar': undefined
          })
        );
        const querySnap = await getDocs(filteredQuery);
        expect(querySnap.size).toBe(1);
      }
    );
  });

  it('are ignored in Query.startAt()', () => {
    return withTestCollectionSettings(
      persistence,
      settings,
      { 'doc1': { nested: { foo: 'foo' } } },
      async coll => {
        const orderedQuery = query(
          coll,
          orderBy('nested'),
          startAt({ foo: 'foo', 'bar': undefined })
        );
        const querySnap = await getDocs(orderedQuery);
        expect(querySnap.size).toBe(1);
      }
    );
  });
});
