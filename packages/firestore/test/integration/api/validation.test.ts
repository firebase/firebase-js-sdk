/**
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
import * as firestore from '@firebase/firestore-types';

import firebase from '../util/firebase_export';
import {
  DEFAULT_PROJECT_ID,
  ALT_PROJECT_ID,
  apiDescribe,
  withAlternateTestDb,
  withTestCollection,
  withTestDb
} from '../util/helpers';

// We're using 'as any' to pass invalid values to APIs for testing purposes.
// tslint:disable:no-any

interface ValidationIt {
  (
    persistence: boolean,
    message: string,
    testFunction: (db: firestore.FirebaseFirestore) => void | Promise<any>
  ): void;
  skip: (
    persistence: boolean,
    message: string,
    testFunction: (db: firestore.FirebaseFirestore) => void | Promise<any>
  ) => void;
  only: (
    persistence: boolean,
    message: string,
    testFunction: (db: firestore.FirebaseFirestore) => void | Promise<any>
  ) => void;
}

// Since most of our tests are "synchronous" but require a Firestore instance,
// we have a helper wrapper around it() and withTestDb() to optimize for that.
const validationIt: ValidationIt = Object.assign(
  (
    persistence: boolean,
    message: string,
    testFunction: (db: firestore.FirebaseFirestore) => void | Promise<any>
  ) => {
    it(message, () => {
      return withTestDb(persistence, async db => {
        const maybePromise = testFunction(db);
        if (maybePromise) {
          return maybePromise;
        }
      });
    });
  },
  {
    skip: function(
      persistence: boolean,
      message: string,
      _: (db: firestore.FirebaseFirestore) => void | Promise<any>
    ) {
      it.skip(message, () => {});
    },
    only: function(
      persistence: boolean,
      message: string,
      testFunction: (db: firestore.FirebaseFirestore) => void | Promise<any>
    ) {
      it.only(message, () => {
        return withTestDb(persistence, async db => {
          const maybePromise = testFunction(db);
          if (maybePromise) {
            return maybePromise;
          }
        });
      });
    }
  }
);

// NOTE: The JS SDK does extensive validation of argument counts, types, etc.
// since it is an untyped language. These tests are not exhaustive as that would
// be extremely tedious, but we do try to hit every error template at least
// once.
apiDescribe('Validation:', persistence => {
  describe('FirestoreSettings', () => {
    validationIt(persistence, 'validates options', db => {
      // NOTE: 'credentials' is an undocumented API so ideally we wouldn't
      // show it in the error, but I don't think it's worth the trouble of
      // hiding it.
      expect(() => db.settings({ invalid: true } as any)).to.throw(
        "Unknown option 'invalid' passed to function settings(). " +
          'Available options: host, ssl, credentials'
      );

      expect(() =>
        db.settings({
          ssl: true
        })
      ).to.throw("Can't provide ssl option if host option is not set");

      expect(() => db.settings({ host: null as any })).to.throw(
        'Function settings() requires its host option to be of type ' +
          'string, but it was: null'
      );
    });

    validationIt(persistence, 'disallows changing settings after use', db => {
      db.doc('foo/bar');
      expect(() =>
        db.settings({ host: 'something-else.example.com' })
      ).to.throw(
        'Firestore has already been started and its settings can no ' +
          'longer be changed. You can only call settings() before ' +
          'calling any other methods on a Firestore object.'
      );
    });
  });

  describe('Firestore', () => {
    validationIt(
      persistence,
      'disallows calling enablePersistence after use',
      db => {
        db.doc('foo/bar');
        expect(() => db.enablePersistence()).to.throw(
          'Firestore has already been started and persistence can no ' +
            'longer be enabled. You can only call enablePersistence() ' +
            'before calling any other methods on a Firestore object.'
        );
      }
    );

    validationIt(
      persistence,
      'throws for invalid transaction functions.',
      db => {
        expect(() => db.runTransaction(null as any)).to.throw(
          'Function Firestore.runTransaction() requires its first ' +
            'argument to be of type function, but it was: null'
        );
      }
    );

    it("fails transaction if function doesn't return a Promise.", () => {
      return withTestDb(persistence, db => {
        return db.runTransaction(() => 5 as any).then(
          x => expect.fail('Transaction should fail'),
          err => {
            expect(err.message).to.equal(
              'Transaction callback must return a Promise'
            );
          }
        );
      });
    });
  });

  describe('Collection paths', () => {
    validationIt(persistence, 'must be strings', db => {
      const baseDocRef = db.doc('foo/bar');
      expect(() => db.collection(null as any)).to.throw(
        'Function Firestore.collection() requires its first argument ' +
          'to be of type string, but it was: null'
      );
      expect(() => baseDocRef.collection(null as any)).to.throw(
        'Function DocumentReference.collection() requires its first ' +
          'argument to be of type string, but it was: null'
      );
      expect(() => (baseDocRef.collection as any)('foo', 'bar')).to.throw(
        'Function DocumentReference.collection() requires 1 argument, ' +
          'but was called with 2 arguments.'
      );
    });

    validationIt(persistence, 'must be odd-length', db => {
      const baseDocRef = db.doc('foo/bar');
      const badAbsolutePaths = ['foo/bar', 'foo/bar/baz/quu'];
      const badRelativePaths = ['/', 'baz/quu'];
      const badPathLengths = [2, 4];

      for (let i = 0; i < badAbsolutePaths.length; i++) {
        const error =
          'Invalid collection reference. Collection references ' +
          'must have an odd number of segments, but ' +
          `${badAbsolutePaths[i]} has ${badPathLengths[i]}`;
        expect(() => db.collection(badAbsolutePaths[i])).to.throw(error);
        expect(() => baseDocRef.collection(badRelativePaths[i])).to.throw(
          error
        );
      }
    });

    validationIt(persistence, 'must not have empty segments', db => {
      // NOTE: leading / trailing slashes are okay.
      db.collection('/foo/');
      db.collection('/foo');
      db.collection('foo/');

      const badPaths = ['foo//bar//baz', '//foo', 'foo//'];
      const collection = db.collection('test-collection');
      const doc = collection.doc('test-document');
      for (const path of badPaths) {
        const reason = `Invalid path (${path}). Paths must not contain // in them.`;
        expect(() => db.collection(path)).to.throw(reason);
        expect(() => db.doc(path)).to.throw(reason);
        expect(() => collection.doc(path)).to.throw(reason);
        expect(() => doc.collection(path)).to.throw(reason);
      }
    });
  });

  describe('Document paths', () => {
    validationIt(persistence, 'must be strings', db => {
      const baseCollectionRef = db.collection('foo');
      expect(() => db.doc(null as any)).to.throw(
        'Function Firestore.doc() requires its first argument to be ' +
          'of type string, but it was: null'
      );
      expect(() => baseCollectionRef.doc(null as any)).to.throw(
        'Function CollectionReference.doc() requires its first ' +
          'argument to be of type string, but it was: null'
      );
      expect(() => baseCollectionRef.doc(undefined as any)).to.throw(
        'Function CollectionReference.doc() requires its first ' +
          'argument to be of type string, but it was: undefined'
      );
      expect(() => (baseCollectionRef.doc as any)('foo', 'bar')).to.throw(
        'Function CollectionReference.doc() requires between 0 and ' +
          '1 arguments, but was called with 2 arguments.'
      );
    });

    validationIt(persistence, 'must be even-length', db => {
      const baseCollectionRef = db.collection('foo');
      const badAbsolutePaths = ['foo', 'foo/bar/baz'];
      const badRelativePaths = ['/', 'bar/baz'];
      const badPathLengths = [1, 3];

      for (let i = 0; i < badAbsolutePaths.length; i++) {
        const error =
          'Invalid document reference. Document references ' +
          'must have an even number of segments, but ' +
          `${badAbsolutePaths[i]} has ${badPathLengths[i]}`;
        expect(() => db.doc(badAbsolutePaths[i])).to.throw(error);
        expect(() => baseCollectionRef.doc(badRelativePaths[i])).to.throw(
          error
        );
      }
    });
  });

  validationIt(persistence, 'Listen options are validated', db => {
    const collection = db.collection('test');
    const fn = () => {};

    const doc = collection.doc();
    expect(() => doc.onSnapshot({ bad: true } as any, fn)).to.throw(
      `Unknown option 'bad' passed to function ` +
        `DocumentReference.onSnapshot(). Available options: ` +
        `includeMetadataChanges`
    );

    expect(() => collection.onSnapshot({ bad: true } as any, fn)).to.throw(
      `Unknown option 'bad' passed to function ` +
        `Query.onSnapshot(). Available options: ` +
        `includeQueryMetadataChanges, includeDocumentMetadataChanges`
    );
  });

  validationIt(persistence, 'Snapshot options are validated', db => {
    const docRef = db.collection('test').doc();

    return docRef
      .set({ test: 1 })
      .then(() => {
        return docRef.get();
      })
      .then(snapshot => {
        expect(() => snapshot.get('test', { bad: true } as any)).to.throw(
          `Unknown option 'bad' passed to function ` +
            `DocumentSnapshot.get(). Available options: ` +
            `serverTimestamps`
        );
        expect(() =>
          snapshot.data({ serverTimestamps: 'foo' } as any)
        ).to.throw(
          `Invalid value "foo" provided to function DocumentSnapshot.data() for option "serverTimestamps". Acceptable values: "estimate", "previous", "none"`
        );
      });
  });

  describe('Writes', () => {
    /** Class used to verify custom classes can't be used in writes. */
    class TestClass {
      constructor(public readonly property: string) {}
    }

    validationIt(persistence, 'must be objects.', db => {
      // PORTING NOTE: The error for firebase.firestore.FieldValue.delete()
      // is different for minified builds, so omit testing it specifically.
      const badData = [
        42,
        [1],
        new Date(),
        null,
        () => {},
        new TestClass('foo')
      ];
      const errorDescriptions = [
        '42',
        'an array',
        'a custom Date object',
        'null',
        'a function',
        'a custom TestClass object'
      ];
      const promises = [];
      for (let i = 0; i < badData.length; i++) {
        const error =
          'Data must be an object, but it was: ' + errorDescriptions[i];
        promises.push(expectWriteToFail(db, badData[i], error));
      }
      return Promise.all(promises);
    });

    validationIt(
      persistence,
      'must not contain custom objects or functions.',
      db => {
        const badData = [
          { foo: new TestClass('foo') },
          { foo: [new TestClass('foo')] },
          { foo: { bar: new TestClass('foo') } },
          { foo: () => {} },
          { foo: [() => {}] },
          { foo: { bar: () => {} } }
        ];
        const errorDescriptions = [
          'Unsupported field value: a custom TestClass object (found in field foo)',
          'Unsupported field value: a custom TestClass object',
          'Unsupported field value: a custom TestClass object (found in field foo.bar)',
          'Unsupported field value: a function (found in field foo)',
          'Unsupported field value: a function',
          'Unsupported field value: a function (found in field foo.bar)'
        ];
        const promises = [];
        for (let i = 0; i < badData.length; i++) {
          promises.push(
            expectWriteToFail(db, badData[i], errorDescriptions[i])
          );
        }
        return Promise.all(promises);
      }
    );

    validationIt(
      persistence,
      'must not contain directly nested arrays.',
      db => {
        return expectWriteToFail(
          db,
          { 'nested-array': [1, [2]] },
          'Nested arrays are not supported'
        );
      }
    );

    validationIt(persistence, 'may contain indirectly nested arrays.', db => {
      const data = { 'nested-array': [1, { foo: [2] }] };

      const ref = db.collection('foo').doc();
      const ref2 = db.collection('foo').doc();

      ref
        .set(data)
        .then(() => {
          return ref.firestore
            .batch()
            .set(ref, data)
            .commit();
        })
        .then(() => {
          return ref.update(data);
        })
        .then(() => {
          return ref.firestore
            .batch()
            .update(ref, data)
            .commit();
        })
        .then(() => {
          return ref.firestore.runTransaction(async txn => {
            // Note ref2 does not exist at this point so set that and update ref.
            txn.update(ref, data);
            txn.set(ref2, data);
          });
        });
    });

    validationIt(persistence, 'must not contain undefined.', db => {
      return expectWriteToFail(
        db,
        { foo: undefined },
        'Unsupported field value: undefined (found in field foo)'
      );
    });

    validationIt(
      persistence,
      'must not contain references to a different database',
      db => {
        return withAlternateTestDb(persistence, db2 => {
          const ref = db2.doc('baz/quu');
          const data = { foo: ref };
          return expectWriteToFail(
            db,
            data,
            `Document reference is for database ` +
              `${ALT_PROJECT_ID}/(default) but should be for database ` +
              `${DEFAULT_PROJECT_ID}/(default) (found in field ` +
              `foo)`
          );
        });
      }
    );

    validationIt(persistence, 'must not contain reserved field names.', db => {
      return Promise.all([
        expectWriteToFail(
          db,
          { __baz__: 1 },
          'Document fields cannot begin and end with __ (found in field ' +
            '__baz__)'
        ),
        expectWriteToFail(
          db,
          { foo: { __baz__: 1 } },
          'Document fields cannot begin and end with __ (found in field ' +
            'foo.__baz__)'
        ),
        expectWriteToFail(
          db,
          { __baz__: { foo: 1 } },
          'Document fields cannot begin and end with __ (found in field ' +
            '__baz__)'
        ),

        expectUpdateToFail(
          db,
          { 'foo.__baz__': 1 },
          'Document fields cannot begin and end with __ (found in field ' +
            'foo.__baz__)'
        ),
        expectUpdateToFail(
          db,
          { '__baz__.foo': 1 },
          'Document fields cannot begin and end with __ (found in field ' +
            '__baz__.foo)'
        )
      ]);
    });

    validationIt(
      persistence,
      'via set() must not contain FieldValue.delete()',
      db => {
        return expectSetToFail(
          db,
          { foo: firebase.firestore.FieldValue.delete() },
          'FieldValue.delete() cannot be used with set() unless you pass ' +
            '{merge:true} (found in field foo)'
        );
      }
    );

    validationIt(
      persistence,
      'via update() must not contain nested FieldValue.delete()',
      db => {
        return expectUpdateToFail(
          db,
          { foo: { bar: firebase.firestore.FieldValue.delete() } },
          'FieldValue.delete() can only appear at the top level of your ' +
            'update data (found in field foo.bar)'
        );
      }
    );
  });

  validationIt(
    persistence,
    'Batch writes require correct Document References',
    db => {
      return withAlternateTestDb(persistence, async db2 => {
        const badRef = db2.doc('foo/bar');
        const reason =
          'Provided document reference is from a different Firestore instance.';
        const data = { foo: 1 };
        const batch = db.batch();
        expect(() => batch.set(badRef, data)).to.throw(reason);
        expect(() => batch.update(badRef, data)).to.throw(reason);
        expect(() => batch.delete(badRef)).to.throw(reason);
      });
    }
  );

  validationIt(
    persistence,
    'Transaction writes require correct Document References',
    db => {
      return withAlternateTestDb(persistence, db2 => {
        const badRef = db2.doc('foo/bar');
        const reason =
          'Provided document reference is from a different Firestore instance.';
        const data = { foo: 1 };
        return db.runTransaction(async txn => {
          expect(() => txn.get(badRef)).to.throw(reason);
          expect(() => txn.set(badRef, data)).to.throw(reason);
          expect(() => txn.update(badRef, data)).to.throw(reason);
          expect(() => txn.delete(badRef)).to.throw(reason);
        });
      });
    }
  );

  validationIt(persistence, 'Field paths must not have empty segments', db => {
    const badFieldPaths = ['', 'foo..baz', '.foo', 'foo.'];
    const promises = [];
    for (const fieldPath of badFieldPaths) {
      const reason =
        `Invalid field path (${fieldPath}). Paths must not be ` +
        `empty, begin with '.', end with '.', or contain '..'`;
      promises.push(expectFieldPathToFail(db, fieldPath, reason));
    }
    return Promise.all(promises);
  });

  validationIt(
    persistence,
    'Field paths must not have invalid segments',
    db => {
      const badFieldPaths = [
        'foo~bar',
        'foo*bar',
        'foo/bar',
        'foo[1',
        'foo]1',
        'foo[1]'
      ];
      const promises = [];
      for (const fieldPath of badFieldPaths) {
        const reason =
          `Invalid field path (${fieldPath}). Paths must not ` +
          `contain '~', '*', '/', '[', or ']'`;
        promises.push(expectFieldPathToFail(db, fieldPath, reason));
      }
      return Promise.all(promises);
    }
  );

  describe('Queries', () => {
    validationIt(persistence, 'with non-positive limit fail', db => {
      const collection = db.collection('test');
      expect(() => collection.limit(0)).to.throw(
        'Invalid Query. Query limit (0) is invalid. Limit must be ' +
          'positive.'
      );
      expect(() => collection.limit(-1)).to.throw(
        'Invalid Query. Query limit (-1) is invalid. Limit must be ' +
          'positive.'
      );
    });

    validationIt(persistence, 'with null or NaN inequalities fail', db => {
      const collection = db.collection('test');
      expect(() => collection.where('a', '>', null)).to.throw(
        'Invalid query. You can only perform equals comparisons on ' + 'null.'
      );
      expect(() => collection.where('a', '>', Number.NaN)).to.throw(
        'Invalid query. You can only perform equals comparisons on NaN.'
      );
    });

    it('cannot be created from documents missing sort values', () => {
      const testDocs = {
        f: { k: 'f', nosort: 1 } // should not show up
      };
      return withTestCollection(persistence, testDocs, coll => {
        const query = coll.orderBy('sort');
        return coll
          .doc('f')
          .get()
          .then(doc => {
            expect(doc.data()).to.deep.equal({ k: 'f', nosort: 1 });
            const reason =
              `Invalid query. You are trying to start or end a ` +
              `query using a document for which the field 'sort' (used as ` +
              `the orderBy) does not exist.`;
            expect(() => query.startAt(doc)).to.throw(reason);
            expect(() => query.startAfter(doc)).to.throw(reason);
            expect(() => query.endBefore(doc)).to.throw(reason);
            expect(() => query.endAt(doc)).to.throw(reason);
          });
      });
    });

    validationIt(
      persistence,
      'must not have more components than order by.',
      db => {
        const collection = db.collection('collection');
        const query = collection.orderBy('foo');
        const reason =
          `Too many arguments provided to Query.startAt(). ` +
          `The number of arguments must be less than or equal to the ` +
          `number of Query.orderBy() clauses`;
        expect(() => query.startAt(1, 2)).to.throw(reason);
        expect(() => query.orderBy('bar').startAt(1, 2, 3)).to.throw(reason);
      }
    );

    validationIt(
      persistence,
      'order-by-key bounds must be strings without slashes.',
      db => {
        const collection = db.collection('collection');
        const query = collection.orderBy(
          firebase.firestore.FieldPath.documentId()
        );
        expect(() => query.startAt(1)).to.throw(
          'Invalid query. Expected a string for document ID in ' +
            'Query.startAt(), but got a number'
        );
        expect(() => query.startAt('foo/bar')).to.throw(
          `Invalid query. Document ID 'foo/bar' contains a slash in ` +
            'Query.startAt()'
        );
      }
    );

    validationIt(persistence, 'with different inequality fields fail', db => {
      const collection = db.collection('test');
      expect(() =>
        collection.where('x', '>=', 32).where('y', '<', 'cat')
      ).to.throw(
        'Invalid query. All where filters with an ' +
          'inequality (<, <=, >, or >=) must be on the same field.' +
          ` But you have inequality filters on 'x' and 'y'`
      );
    });

    validationIt(
      persistence,
      'with inequality different than first orderBy fail.',
      db => {
        const collection = db.collection('test');
        const reason =
          `Invalid query. You have a where filter with an ` +
          `inequality (<, <=, >, or >=) on field 'x' and so you must also ` +
          `use 'x' as your first Query.orderBy(), but your first ` +
          `Query.orderBy() is on field 'y' instead.`;
        expect(() => collection.where('x', '>', 32).orderBy('y')).to.throw(
          reason
        );
        expect(() => collection.orderBy('y').where('x', '>', 32)).to.throw(
          reason
        );
        expect(() =>
          collection
            .where('x', '>', 32)
            .orderBy('y')
            .orderBy('x')
        ).to.throw(reason);
        expect(() =>
          collection
            .orderBy('y')
            .orderBy('x')
            .where('x', '>', 32)
        ).to.throw(reason);
      }
    );

    validationIt(
      persistence,
      'must not specify starting or ending point after orderBy',
      db => {
        const collection = db.collection('collection');
        const query = collection.orderBy('foo');
        let reason =
          'Invalid query. You must not call Query.startAt() or ' +
          'Query.startAfter() before calling Query.orderBy().';
        expect(() => query.startAt(1).orderBy('bar')).to.throw(reason);
        expect(() => query.startAfter(1).orderBy('bar')).to.throw(reason);

        reason =
          'Invalid query. You must not call Query.endAt() or ' +
          'Query.endBefore() before calling Query.orderBy().';
        expect(() => query.endAt(1).orderBy('bar')).to.throw(reason);
        expect(() => query.endBefore(1).orderBy('bar')).to.throw(reason);
      }
    );

    validationIt(
      persistence,
      'must be non-empty strings or references when filtering by document ID',
      db => {
        const collection = db.collection('test');
        expect(() =>
          collection.where(firebase.firestore.FieldPath.documentId(), '>=', '')
        ).to.throw(
          'Function Query.where() requires its third parameter to be ' +
            'a valid document ID if the first parameter is ' +
            'FieldPath.documentId(), but it was an empty string.'
        );
        expect(() =>
          collection.where(
            firebase.firestore.FieldPath.documentId(),
            '>=',
            'foo/bar/baz'
          )
        ).to.throw(
          'Function Query.where() requires its third parameter to be ' +
            'a valid document ID if the first parameter is ' +
            'FieldPath.documentId(), but it contains a slash.'
        );
        expect(() =>
          collection.where(firebase.firestore.FieldPath.documentId(), '>=', 1)
        ).to.throw(
          'Function Query.where() requires its third parameter to be ' +
            'a string or a DocumentReference if the first parameter is ' +
            'FieldPath.documentId(), but it was: 1.'
        );
      }
    );
  });
});

function expectSetToFail(
  db: firestore.FirebaseFirestore,
  data: any,
  reason: string
): Promise<void> {
  return expectWriteToFail(
    db,
    data,
    reason,
    /*includeSets=*/ true,
    /*includeUpdates=*/ false
  );
}

function expectUpdateToFail(
  db: firestore.FirebaseFirestore,
  data: any,
  reason: string
): Promise<void> {
  return expectWriteToFail(
    db,
    data,
    reason,
    /*includeSets=*/ false,
    /*includeUpdates=*/ true
  );
}

/**
 * Performs a write using each set and/or update API and makes sure it fails
 * with the expected reason.
 */
function expectWriteToFail(
  db: firestore.FirebaseFirestore,
  data: any,
  reason: string,
  includeSets?: boolean,
  includeUpdates?: boolean
): Promise<void> {
  if (includeSets === undefined) {
    includeSets = true;
  }
  if (includeUpdates === undefined) {
    includeUpdates = true;
  }

  const docRef = db.doc('foo/bar');
  const error = (fnName: string) =>
    `Function ${fnName}() called with invalid data. ${reason}`;

  if (includeSets) {
    expect(() => docRef.set(data)).to.throw(error('DocumentReference.set'));
    expect(() => docRef.firestore.batch().set(docRef, data)).to.throw(
      error('WriteBatch.set')
    );
  }

  if (includeUpdates) {
    expect(() => docRef.update(data)).to.throw(
      error('DocumentReference.update')
    );
    expect(() => docRef.firestore.batch().update(docRef, data)).to.throw(
      error('WriteBatch.update')
    );
  }

  return docRef.firestore.runTransaction(async txn => {
    if (includeSets) {
      expect(() => txn.set(docRef, data)).to.throw(error('Transaction.set'));
    }

    if (includeUpdates) {
      expect(() => txn.update(docRef, data)).to.throw(
        error('Transaction.update')
      );
    }
  });
}

/**
 * Tests a field path with all of our APIs that accept field paths and ensures
 * they fail with the specified reason.
 */
function expectFieldPathToFail(
  db: firestore.FirebaseFirestore,
  path: string,
  reason: string
): Promise<void> {
  // Get an arbitrary snapshot we can use for testing.
  const docRef = db.collection('test').doc();
  return docRef
    .set({ test: 1 })
    .then(() => {
      return docRef.get();
    })
    .then(snapshot => {
      // Snapshot paths.
      expect(() => snapshot.get(path)).to.throw(
        'Function DocumentSnapshot.get() called with invalid data. ' + reason
      );

      // Query filter / order fields.
      const coll = db.collection('test-collection');
      // <=, etc omitted for brevity since the code path is trivially
      // shared.
      expect(() => coll.where(path, '==', 1)).to.throw(
        'Function Query.where() called with invalid data. ' + reason
      );
      expect(() => coll.orderBy(path)).to.throw(
        'Function Query.orderBy() called with invalid data. ' + reason
      );

      // Update paths.
      const data = {} as { [field: string]: number };
      data[path] = 1;
      return expectUpdateToFail(db, data, reason);
    });
}
