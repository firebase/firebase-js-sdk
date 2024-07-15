/**
 * @license
 * Copyright 2018 Google LLC
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
  deleteDoc,
  disableNetwork,
  doc,
  getDoc,
  getDocFromCache,
  getDocFromServer,
  getDocs,
  onSnapshot,
  setDoc,
  getDocsFromCache,
  getDocsFromServer
} from '../util/firebase_export';
import {
  toDataMap,
  apiDescribe,
  withTestCollection,
  withTestDocAndInitialData,
  withTestDb
} from '../util/helpers';

apiDescribe('GetOptions', persistence => {
  it('get document while online with default get options', () => {
    const initialData = { key: 'value' };
    return withTestDocAndInitialData(persistence, initialData, docRef => {
      return getDoc(docRef).then(doc => {
        expect(doc.exists()).to.be.true;
        expect(doc.metadata.fromCache).to.be.false;
        expect(doc.metadata.hasPendingWrites).to.be.false;
        expect(doc.data()).to.deep.equal(initialData);
      });
    });
  });

  it('get collection while online with default get options', () => {
    const initialDocs = {
      doc1: { key1: 'value1' },
      doc2: { key2: 'value2' },
      doc3: { key3: 'value3' }
    };
    return withTestCollection(persistence, initialDocs, colRef => {
      return getDocs(colRef).then(qrySnap => {
        expect(qrySnap.metadata.fromCache).to.be.false;
        expect(qrySnap.metadata.hasPendingWrites).to.be.false;
        expect(qrySnap.docChanges().length).to.equal(3);
        expect(toDataMap(qrySnap)).to.deep.equal(initialDocs);
      });
    });
  });

  it('get document while offline with default get options', () => {
    const initialData = { key: 'value' };
    // Use an instance with LRU GC.
    return withTestDb(persistence.toLruGc(), async db => {
      const docRef = doc(collection(db, 'test-collection'));
      await setDoc(docRef, initialData);
      return getDoc(docRef)
        .then(() => disableNetwork(db))
        .then(() => getDoc(docRef))
        .then(doc => {
          expect(doc.exists()).to.be.true;
          expect(doc.metadata.fromCache).to.be.true;
          expect(doc.metadata.hasPendingWrites).to.be.false;
          expect(doc.data()).to.deep.equal(initialData);
        });
    });
  });

  it('get collection while offline with default get options', () => {
    const initialDocs = {
      doc1: { key1: 'value1' },
      doc2: { key2: 'value2' },
      doc3: { key3: 'value3' }
    };
    return withTestCollection(persistence, initialDocs, (colRef, db) => {
      // Register a snapshot to force the data to stay in the cache and not be
      // garbage collected.
      onSnapshot(colRef, () => {});
      return getDocs(colRef)
        .then(() => disableNetwork(db))
        .then(() => {
          // NB: since we're offline, the returned promises won't complete
          /* eslint-disable @typescript-eslint/no-floating-promises */
          setDoc(doc(colRef, 'doc2'), { key2b: 'value2b' }, { merge: true });
          setDoc(doc(colRef, 'doc3'), { key3b: 'value3b' });
          setDoc(doc(colRef, 'doc4'), { key4: 'value4' });
          /* eslint-enable @typescript-eslint/no-floating-promises */
          return getDocs(colRef);
        })
        .then(qrySnap => {
          expect(qrySnap.metadata.fromCache).to.be.true;
          expect(qrySnap.metadata.hasPendingWrites).to.be.true;
          const docsData = toDataMap(qrySnap);
          expect(qrySnap.docChanges().length).to.equal(4);
          expect(docsData).to.deep.equal({
            doc1: { key1: 'value1' },
            doc2: { key2: 'value2', key2b: 'value2b' },
            doc3: { key3b: 'value3b' },
            doc4: { key4: 'value4' }
          });
        });
    });
  });

  it('get document while online with source=cache', () => {
    const initialData = { key: 'value' };
    return withTestDocAndInitialData(persistence, initialData, docRef => {
      // Register a snapshot to force the data to stay in the cache and not be
      // garbage collected.
      onSnapshot(docRef, () => {});
      return getDoc(docRef)
        .then(() => getDocFromCache(docRef))
        .then(doc => {
          expect(doc.exists()).to.be.true;
          expect(doc.metadata.fromCache).to.be.true;
          expect(doc.metadata.hasPendingWrites).to.be.false;
          expect(doc.data()).to.deep.equal(initialData);
        });
    });
  });

  it('get collection while online with source=cache', () => {
    const initialDocs = {
      doc1: { key1: 'value1' },
      doc2: { key2: 'value2' },
      doc3: { key3: 'value3' }
    };
    return withTestCollection(persistence, initialDocs, colRef => {
      // Register a snapshot to force the data to stay in the cache and not be
      // garbage collected.
      onSnapshot(colRef, () => {});
      return getDocs(colRef)
        .then(() => getDocsFromCache(colRef))
        .then(qrySnap => {
          expect(qrySnap.metadata.fromCache).to.be.true;
          expect(qrySnap.metadata.hasPendingWrites).to.be.false;
          expect(qrySnap.docChanges().length).to.equal(3);
          expect(toDataMap(qrySnap)).to.deep.equal(initialDocs);
        });
    });
  });

  it('get document while offline with source=cache', () => {
    const initialData = { key: 'value' };

    return withTestDocAndInitialData(persistence, initialData, (docRef, db) => {
      // Register a snapshot to force the data to stay in the cache and not be
      // garbage collected.
      onSnapshot(docRef, () => {});
      return getDoc(docRef)
        .then(() => disableNetwork(db))
        .then(() => getDocFromCache(docRef))
        .then(doc => {
          expect(doc.exists()).to.be.true;
          expect(doc.metadata.fromCache).to.be.true;
          expect(doc.metadata.hasPendingWrites).to.be.false;
          expect(doc.data()).to.deep.equal(initialData);
        });
    });
  });

  it('get collection while offline with source=cache', () => {
    const initialDocs = {
      doc1: { key1: 'value1' },
      doc2: { key2: 'value2' },
      doc3: { key3: 'value3' }
    };
    return withTestCollection(persistence, initialDocs, (colRef, db) => {
      // Register a snapshot to force the data to stay in the cache and not be
      // garbage collected.
      onSnapshot(colRef, () => {});
      return getDocs(colRef)
        .then(() => disableNetwork(db))
        .then(() => {
          // NB: since we're offline, the returned promises won't complete
          /* eslint-disable @typescript-eslint/no-floating-promises */
          setDoc(doc(colRef, 'doc2'), { key2b: 'value2b' }, { merge: true });
          setDoc(doc(colRef, 'doc3'), { key3b: 'value3b' });
          setDoc(doc(colRef, 'doc4'), { key4: 'value4' });
          /* eslint-enable @typescript-eslint/no-floating-promises */

          return getDocsFromCache(colRef);
        })
        .then(qrySnap => {
          expect(qrySnap.metadata.fromCache).to.be.true;
          expect(qrySnap.metadata.hasPendingWrites).to.be.true;
          const docsData = toDataMap(qrySnap);
          expect(qrySnap.docChanges().length).to.equal(4);
          expect(docsData).to.deep.equal({
            doc1: { key1: 'value1' },
            doc2: { key2: 'value2', key2b: 'value2b' },
            doc3: { key3b: 'value3b' },
            doc4: { key4: 'value4' }
          });
        });
    });
  });

  it('get document while online with source=server', () => {
    const initialData = { key: 'value' };
    return withTestDocAndInitialData(persistence, initialData, docRef => {
      return getDocFromServer(docRef).then(doc => {
        expect(doc.exists()).to.be.true;
        expect(doc.metadata.fromCache).to.be.false;
        expect(doc.metadata.hasPendingWrites).to.be.false;
        expect(doc.data()).to.deep.equal(initialData);
      });
    });
  });

  it('get collection while online with source=server', () => {
    const initialDocs = {
      doc1: { key1: 'value1' },
      doc2: { key2: 'value2' },
      doc3: { key3: 'value3' }
    };
    return withTestCollection(persistence, initialDocs, colRef => {
      return getDocsFromServer(colRef).then(qrySnap => {
        expect(qrySnap.metadata.fromCache).to.be.false;
        expect(qrySnap.metadata.hasPendingWrites).to.be.false;
        expect(qrySnap.docChanges().length).to.equal(3);
        expect(toDataMap(qrySnap)).to.deep.equal(initialDocs);
      });
    });
  });

  it('get document while offline with source=server', () => {
    const initialData = { key: 'value' };
    return withTestDocAndInitialData(persistence, initialData, (docRef, db) => {
      return getDocFromServer(docRef)
        .then(() => disableNetwork(db))
        .then(() => getDocFromServer(docRef))
        .then(
          () => {
            expect.fail();
          },
          () => {}
        );
    });
  });

  it('get collection while offline with source=server', () => {
    const initialDocs = {
      doc1: { key1: 'value1' },
      doc2: { key2: 'value2' },
      doc3: { key3: 'value3' }
    };
    return withTestCollection(persistence, initialDocs, (colRef, db) => {
      // force local cache of these
      return (
        getDocs(colRef)
          // now go offline. Note that if persistence is disabled, this will cause
          // the initialDocs to be garbage collected.
          .then(() => disableNetwork(db))
          .then(() => getDocsFromServer(colRef))
          .then(
            () => expect.fail(),
            () => {}
          )
      );
    });
  });

  it('get document while offline with different get options', () => {
    const initialData = { key: 'value' };

    return withTestDocAndInitialData(persistence, initialData, (docRef, db) => {
      // Register a snapshot to force the data to stay in the cache and not be
      // garbage collected.
      onSnapshot(docRef, () => {});
      return getDoc(docRef)
        .then(() => disableNetwork(db))
        .then(() => {
          // Create an initial listener for this query (to attempt to disrupt the
          // gets below) and wait for the listener to deliver its initial
          // snapshot before continuing.
          return new Promise<void>((resolve, reject) => {
            onSnapshot(
              docRef,
              () => resolve(),
              () => reject()
            );
          });
        })
        .then(() => getDocFromCache(docRef))
        .then(doc => {
          expect(doc.exists()).to.be.true;
          expect(doc.metadata.fromCache).to.be.true;
          expect(doc.metadata.hasPendingWrites).to.be.false;
          expect(doc.data()).to.deep.equal(initialData);
        })
        .then(() => getDoc(docRef))
        .then(doc => {
          expect(doc.exists()).to.be.true;
          expect(doc.metadata.fromCache).to.be.true;
          expect(doc.metadata.hasPendingWrites).to.be.false;
          expect(doc.data()).to.deep.equal(initialData);
        })
        .then(() => getDocFromServer(docRef))
        .then(
          () => expect.fail(),
          () => {}
        );
    });
  });

  it('get collection while offline with different get options', () => {
    const initialDocs = {
      doc1: { key1: 'value1' },
      doc2: { key2: 'value2' },
      doc3: { key3: 'value3' }
    };
    return withTestCollection(persistence, initialDocs, (colRef, db) => {
      // Register a snapshot to force the data to stay in the cache and not be
      // garbage collected.
      onSnapshot(colRef, () => {});
      return (
        getDocs(colRef)
          // now go offline. Note that if persistence is disabled, this will cause
          // the initialDocs to be garbage collected.
          .then(() => disableNetwork(db))
          .then(() => {
            // NB: since we're offline, the returned promises won't complete
            /* eslint-disable @typescript-eslint/no-floating-promises */
            setDoc(doc(colRef, 'doc2'), { key2b: 'value2b' }, { merge: true });
            setDoc(doc(colRef, 'doc3'), { key3b: 'value3b' });
            setDoc(doc(colRef, 'doc4'), { key4: 'value4' });
            /* eslint-enable @typescript-eslint/no-floating-promises */

            // Create an initial listener for this query (to attempt to disrupt the
            // gets below) and wait for the listener to deliver its initial
            // snapshot before continuing.
            return new Promise<void>((resolve, reject) => {
              onSnapshot(
                colRef,
                () => resolve(),
                () => reject()
              );
            });
          })
          .then(() => getDocsFromCache(colRef))
          .then(qrySnap => {
            expect(qrySnap.metadata.fromCache).to.be.true;
            expect(qrySnap.metadata.hasPendingWrites).to.be.true;
            const docsData = toDataMap(qrySnap);
            expect(qrySnap.docChanges().length).to.equal(4);
            expect(docsData).to.deep.equal({
              doc1: { key1: 'value1' },
              doc2: { key2: 'value2', key2b: 'value2b' },
              doc3: { key3b: 'value3b' },
              doc4: { key4: 'value4' }
            });
          })
          .then(() => getDocs(colRef))
          .then(qrySnap => {
            expect(qrySnap.metadata.fromCache).to.be.true;
            expect(qrySnap.metadata.hasPendingWrites).to.be.true;
            const docsData = toDataMap(qrySnap);
            expect(qrySnap.docChanges().length).to.equal(4);
            expect(docsData).to.deep.equal({
              doc1: { key1: 'value1' },
              doc2: { key2: 'value2', key2b: 'value2b' },
              doc3: { key3b: 'value3b' },
              doc4: { key4: 'value4' }
            });
          })
          .then(() => getDocsFromServer(colRef))
          .then(
            () => expect.fail(),
            () => {}
          )
      );
    });
  });

  it('get nonexistent doc while online with default get options', () => {
    return withTestDocAndInitialData(persistence, null, docRef => {
      return getDoc(docRef).then(doc => {
        expect(doc.exists()).to.be.false;
        expect(doc.metadata.fromCache).to.be.false;
        expect(doc.metadata.hasPendingWrites).to.be.false;
      });
    });
  });

  it('get nonexistent collection while online with default get options', () => {
    return withTestCollection(persistence, {}, colRef => {
      return getDocs(colRef).then(qrySnap => {
        //expect(qrySnap.count).to.equal(0);
        expect(qrySnap.empty).to.be.true;
        expect(qrySnap.docChanges().length).to.equal(0);
        expect(qrySnap.metadata.fromCache).to.be.false;
        expect(qrySnap.metadata.hasPendingWrites).to.be.false;
      });
    });
  });

  it('get nonexistent doc while offline with default get options', () => {
    return withTestDocAndInitialData(persistence, null, (docRef, db) => {
      return (
        disableNetwork(db)
          // Attempt to get doc. This will fail since there's nothing in cache.
          .then(() => getDoc(docRef))
          .then(
            () => expect.fail(),
            () => {}
          )
      );
    });
  });

  // TODO(b/112267729): We should raise a fromCache=true event with a
  // nonexistent snapshot, but because the default source goes through a normal
  // listener, we do not.
  // eslint-disable-next-line no-restricted-properties
  it.skip('get deleted doc while offline with default get options', () => {
    return withTestDocAndInitialData(persistence, null, (docRef, db) => {
      return deleteDoc(docRef)
        .then(() => disableNetwork(db))
        .then(() => getDoc(docRef))
        .then(doc => {
          expect(doc.exists()).to.be.false;
          expect(doc.data()).to.be.undefined;
          expect(doc.metadata.fromCache).to.be.true;
          expect(doc.metadata.hasPendingWrites).to.be.false;
        });
    });
  });

  it('get nonexistent collection while offline with default get options', () => {
    return withTestCollection(persistence, {}, (colRef, db) => {
      return disableNetwork(db)
        .then(() => getDocs(colRef))
        .then(qrySnap => {
          expect(qrySnap.empty).to.be.true;
          expect(qrySnap.docChanges().length).to.equal(0);
          expect(qrySnap.metadata.fromCache).to.be.true;
          expect(qrySnap.metadata.hasPendingWrites).to.be.false;
        });
    });
  });

  it('get nonexistent doc while online with source=cache', () => {
    return withTestDocAndInitialData(persistence, null, docRef => {
      // Attempt to get doc.  This will fail since there's nothing in cache.
      return getDocFromCache(docRef).then(
        () => expect.fail(),
        () => {}
      );
    });
  });

  it('get nonexistent collection while online with source=cache', () => {
    return withTestCollection(persistence, {}, colRef => {
      return getDocsFromCache(colRef).then(qrySnap => {
        expect(qrySnap.empty).to.be.true;
        expect(qrySnap.docChanges().length).to.equal(0);
        expect(qrySnap.metadata.fromCache).to.be.true;
        expect(qrySnap.metadata.hasPendingWrites).to.be.false;
      });
    });
  });

  it('get nonexistent doc while offline with source=cache', () => {
    return withTestDocAndInitialData(persistence, null, (docRef, db) => {
      return (
        disableNetwork(db)
          // Attempt to get doc.  This will fail since there's nothing in cache.
          .then(() =>
            getDocFromCache(docRef).then(
              () => expect.fail(),
              () => {}
            )
          )
      );
    });
  });

  // We need the deleted doc to stay in cache, so only run this test when the
  // local cache is configured with LRU GC (as opposed to eager GC).
  // eslint-disable-next-line no-restricted-properties,
  (persistence.gc === 'lru' ? it : it.skip)(
    'get deleted doc while offline with source=cache',
    () => {
      return withTestDocAndInitialData(persistence, null, (docRef, db) => {
        return (
          deleteDoc(docRef)
            .then(() => disableNetwork(db))
            // Should get a document with exists=false, fromCache=true
            .then(() => getDocFromCache(docRef))
            .then(doc => {
              expect(doc.exists()).to.be.false;
              expect(doc.data()).to.be.undefined;
              expect(doc.metadata.fromCache).to.be.true;
              expect(doc.metadata.hasPendingWrites).to.be.false;
            })
        );
      });
    }
  );

  it('get nonexistent collection while offline with source=cache', () => {
    return withTestCollection(persistence, {}, (colRef, db) => {
      return disableNetwork(db)
        .then(() => getDocsFromCache(colRef))
        .then(qrySnap => {
          expect(qrySnap.empty).to.be.true;
          expect(qrySnap.docChanges().length).to.equal(0);
          expect(qrySnap.metadata.fromCache).to.be.true;
          expect(qrySnap.metadata.hasPendingWrites).to.be.false;
        });
    });
  });

  it('get nonexistent doc while online with source=server', () => {
    return withTestDocAndInitialData(persistence, null, docRef => {
      return getDocFromServer(docRef).then(doc => {
        expect(doc.exists()).to.be.false;
        expect(doc.metadata.fromCache).to.be.false;
        expect(doc.metadata.hasPendingWrites).to.be.false;
      });
    });
  });

  it('get nonexistent collection while online with source=server', () => {
    return withTestCollection(persistence, {}, (colRef, db) => {
      return getDocsFromServer(colRef).then(qrySnap => {
        expect(qrySnap.empty).to.be.true;
        expect(qrySnap.docChanges().length).to.equal(0);
        expect(qrySnap.metadata.fromCache).to.be.false;
        expect(qrySnap.metadata.hasPendingWrites).to.be.false;
      });
    });
  });

  it('get nonexistent doc while offline with source=server', () => {
    return withTestDocAndInitialData(persistence, null, (docRef, db) => {
      return (
        disableNetwork(db)
          // Attempt to get doc.  This will fail since there's nothing in cache.
          .then(() => getDocFromServer(docRef))
          .then(
            () => expect.fail(),
            () => {}
          )
      );
    });
  });

  it('get nonexistent collection while offline with source=server', () => {
    return withTestCollection(persistence, {}, (colRef, db) => {
      return disableNetwork(db)
        .then(() => getDocsFromServer(colRef))
        .then(
          () => expect.fail(),
          () => {}
        );
    });
  });
});
