/**
 * @license
 * Copyright 2018 Google Inc.
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
  apiDescribe,
  toDataMap,
  withTestCollection,
  withTestDocAndInitialData
} from '../util/helpers';

// tslint:disable:no-floating-promises

apiDescribe('GetOptions', (persistence: boolean) => {
  it('get document while online with default get options', () => {
    const initialData = { key: 'value' };
    return withTestDocAndInitialData(persistence, initialData, docRef => {
      return docRef.get().then(doc => {
        expect(doc.exists).to.be.true;
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
      return colRef.get().then(qrySnap => {
        expect(qrySnap.metadata.fromCache).to.be.false;
        expect(qrySnap.metadata.hasPendingWrites).to.be.false;
        expect(qrySnap.docChanges().length).to.equal(3);
        expect(toDataMap(qrySnap)).to.deep.equal(initialDocs);
      });
    });
  });

  it('get document while offline with default get options', () => {
    const initialData = { key: 'value' };
    return withTestDocAndInitialData(persistence, initialData, docRef => {
      // Register a snapshot to force the data to stay in the cache and not be
      // garbage collected.
      docRef.onSnapshot(() => {});
      return docRef
        .get()
        .then(ignored => docRef.firestore.disableNetwork())
        .then(() => docRef.get())
        .then(doc => {
          expect(doc.exists).to.be.true;
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
    return withTestCollection(persistence, initialDocs, colRef => {
      // Register a snapshot to force the data to stay in the cache and not be
      // garbage collected.
      colRef.onSnapshot(() => {});
      return colRef
        .get()
        .then(ignored => colRef.firestore.disableNetwork())
        .then(() => {
          // NB: since we're offline, the returned promises won't complete
          colRef.doc('doc2').set({ key2b: 'value2b' }, { merge: true });
          colRef.doc('doc3').set({ key3b: 'value3b' });
          colRef.doc('doc4').set({ key4: 'value4' });
          return colRef.get();
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
      docRef.onSnapshot(() => {});
      return docRef
        .get()
        .then(ignored => docRef.get({ source: 'cache' }))
        .then(doc => {
          expect(doc.exists).to.be.true;
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
      colRef.onSnapshot(() => {});
      return colRef
        .get()
        .then(ignored => colRef.get({ source: 'cache' }))
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

    return withTestDocAndInitialData(persistence, initialData, docRef => {
      // Register a snapshot to force the data to stay in the cache and not be
      // garbage collected.
      docRef.onSnapshot(() => {});
      return docRef
        .get()
        .then(ignored => docRef.firestore.disableNetwork())
        .then(() => docRef.get({ source: 'cache' }))
        .then(doc => {
          expect(doc.exists).to.be.true;
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
    return withTestCollection(persistence, initialDocs, colRef => {
      // Register a snapshot to force the data to stay in the cache and not be
      // garbage collected.
      colRef.onSnapshot(() => {});
      return colRef
        .get()
        .then(ignored => colRef.firestore.disableNetwork())
        .then(() => {
          // NB: since we're offline, the returned promises won't complete
          colRef.doc('doc2').set({ key2b: 'value2b' }, { merge: true });
          colRef.doc('doc3').set({ key3b: 'value3b' });
          colRef.doc('doc4').set({ key4: 'value4' });
          return colRef.get({ source: 'cache' });
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
      return docRef.get({ source: 'server' }).then(doc => {
        expect(doc.exists).to.be.true;
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
      return colRef.get({ source: 'server' }).then(qrySnap => {
        expect(qrySnap.metadata.fromCache).to.be.false;
        expect(qrySnap.metadata.hasPendingWrites).to.be.false;
        expect(qrySnap.docChanges().length).to.equal(3);
        expect(toDataMap(qrySnap)).to.deep.equal(initialDocs);
      });
    });
  });

  it('get document while offline with source=server', () => {
    const initialData = { key: 'value' };
    return withTestDocAndInitialData(persistence, initialData, docRef => {
      return docRef
        .get({ source: 'server' })
        .then(ignored => {})
        .then(() => docRef.firestore.disableNetwork())
        .then(() => docRef.get({ source: 'server' }))
        .then(
          doc => {
            expect.fail();
          },
          expected => {}
        );
    });
  });

  it('get collection while offline with source=server', () => {
    const initialDocs = {
      doc1: { key1: 'value1' },
      doc2: { key2: 'value2' },
      doc3: { key3: 'value3' }
    };
    return withTestCollection(persistence, initialDocs, colRef => {
      // force local cache of these
      return (
        colRef
          .get()
          // now go offine. Note that if persistence is disabled, this will cause
          // the initialDocs to be garbage collected.
          .then(ignored => colRef.firestore.disableNetwork())
          .then(() => colRef.get({ source: 'server' }))
          .then(
            qrySnap => {
              expect.fail();
            },
            expected => {}
          )
      );
    });
  });

  it('get document while offline with different get options', () => {
    const initialData = { key: 'value' };

    return withTestDocAndInitialData(persistence, initialData, docRef => {
      // Register a snapshot to force the data to stay in the cache and not be
      // garbage collected.
      docRef.onSnapshot(() => {});
      return docRef
        .get()
        .then(ignored => docRef.firestore.disableNetwork())
        .then(() => {
          // Create an initial listener for this query (to attempt to disrupt the
          // gets below) and wait for the listener to deliver its initial
          // snapshot before continuing.
          return new Promise((resolve, reject) => {
            docRef.onSnapshot(
              docSnap => {
                resolve();
              },
              error => {
                reject();
              }
            );
          });
        })
        .then(() => docRef.get({ source: 'cache' }))
        .then(doc => {
          expect(doc.exists).to.be.true;
          expect(doc.metadata.fromCache).to.be.true;
          expect(doc.metadata.hasPendingWrites).to.be.false;
          expect(doc.data()).to.deep.equal(initialData);
          return Promise.resolve();
        })
        .then(() => docRef.get())
        .then(doc => {
          expect(doc.exists).to.be.true;
          expect(doc.metadata.fromCache).to.be.true;
          expect(doc.metadata.hasPendingWrites).to.be.false;
          expect(doc.data()).to.deep.equal(initialData);
          return Promise.resolve();
        })
        .then(() => docRef.get({ source: 'server' }))
        .then(
          doc => {
            expect.fail();
          },
          expected => {}
        );
    });
  });

  it('get collection while offline with different get options', () => {
    const initialDocs = {
      doc1: { key1: 'value1' },
      doc2: { key2: 'value2' },
      doc3: { key3: 'value3' }
    };
    return withTestCollection(persistence, initialDocs, colRef => {
      // Register a snapshot to force the data to stay in the cache and not be
      // garbage collected.
      colRef.onSnapshot(() => {});
      return (
        colRef
          .get()
          // now go offine. Note that if persistence is disabled, this will cause
          // the initialDocs to be garbage collected.
          .then(ignored => colRef.firestore.disableNetwork())
          .then(() => {
            // NB: since we're offline, the returned promises won't complete
            colRef.doc('doc2').set({ key2b: 'value2b' }, { merge: true });
            colRef.doc('doc3').set({ key3b: 'value3b' });
            colRef.doc('doc4').set({ key4: 'value4' });

            // Create an initial listener for this query (to attempt to disrupt the
            // gets below) and wait for the listener to deliver its initial
            // snapshot before continuing.
            return new Promise((resolve, reject) => {
              colRef.onSnapshot(
                qrySnap => {
                  resolve();
                },
                error => {
                  reject();
                }
              );
            });
          })
          .then(() => colRef.get({ source: 'cache' }))
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
          .then(() => colRef.get())
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
          .then(() => colRef.get({ source: 'server' }))
          .then(
            qrySnap => {
              expect.fail();
            },
            expected => {}
          )
      );
    });
  });

  it('get non existing doc while online with default get options', () => {
    return withTestDocAndInitialData(persistence, null, docRef => {
      return docRef.get().then(doc => {
        expect(doc.exists).to.be.false;
        expect(doc.metadata.fromCache).to.be.false;
        expect(doc.metadata.hasPendingWrites).to.be.false;
      });
    });
  });

  it('get non existing collection while online with default get options', () => {
    return withTestCollection(persistence, {}, colRef => {
      return colRef.get().then(qrySnap => {
        //expect(qrySnap.count).to.equal(0);
        expect(qrySnap.empty).to.be.true;
        expect(qrySnap.docChanges().length).to.equal(0);
        expect(qrySnap.metadata.fromCache).to.be.false;
        expect(qrySnap.metadata.hasPendingWrites).to.be.false;
      });
    });
  });

  it('get non existing doc while offline with default get options', () => {
    return withTestDocAndInitialData(persistence, null, docRef => {
      return (
        docRef.firestore
          .disableNetwork()
          // Attempt to get doc. This will fail since there's nothing in cache.
          .then(() => docRef.get())
          .then(
            doc => {
              expect.fail();
            },
            expected => {}
          )
      );
    });
  });

  // TODO(b/112267729): We should raise a fromCache=true event with a
  // nonexistent snapshot, but because the default source goes through a normal
  // listener, we do not.
  // tslint:disable-next-line:ban
  it.skip('get deleted doc while offline with default get options', () => {
    return withTestDocAndInitialData(persistence, null, docRef => {
      return docRef
        .delete()
        .then(() => docRef.firestore.disableNetwork())
        .then(() => docRef.get())
        .then(doc => {
          expect(doc.exists).to.be.false;
          expect(doc.data()).to.be.undefined;
          expect(doc.metadata.fromCache).to.be.true;
          expect(doc.metadata.hasPendingWrites).to.be.false;
        });
    });
  });

  it('get non existing collection while offline with default get options', () => {
    return withTestCollection(persistence, {}, colRef => {
      return colRef.firestore
        .disableNetwork()
        .then(() => colRef.get())
        .then(qrySnap => {
          expect(qrySnap.empty).to.be.true;
          expect(qrySnap.docChanges().length).to.equal(0);
          expect(qrySnap.metadata.fromCache).to.be.true;
          expect(qrySnap.metadata.hasPendingWrites).to.be.false;
        });
    });
  });

  it('get non existing doc while online with source=cache', () => {
    return withTestDocAndInitialData(persistence, null, docRef => {
      // Attempt to get doc.  This will fail since there's nothing in cache.
      return docRef.get({ source: 'cache' }).then(
        doc => {
          expect.fail();
        },
        expected => {}
      );
    });
  });

  it('get non existing collection while online with source=cache', () => {
    return withTestCollection(persistence, {}, colRef => {
      return colRef.get({ source: 'cache' }).then(qrySnap => {
        expect(qrySnap.empty).to.be.true;
        expect(qrySnap.docChanges().length).to.equal(0);
        expect(qrySnap.metadata.fromCache).to.be.true;
        expect(qrySnap.metadata.hasPendingWrites).to.be.false;
      });
    });
  });

  it('get non existing doc while offline with source=cache', () => {
    return withTestDocAndInitialData(persistence, null, docRef => {
      return (
        docRef.firestore
          .disableNetwork()
          // Attempt to get doc.  This will fail since there's nothing in cache.
          .then(() => docRef.get({ source: 'cache' }))
          .then(
            doc => {
              expect.fail();
            },
            expected => {}
          )
      );
    });
  });

  // We need the deleted doc to stay in cache, so only run this with persistence.
  // tslint:disable-next-line:ban
  (persistence ? it : it.skip)(
    'get deleted doc while offline with source=cache',
    () => {
      return withTestDocAndInitialData(persistence, null, docRef => {
        return (
          docRef
            .delete()
            .then(() => docRef.firestore.disableNetwork())
            // Should get a document with exists=false, fromCache=true
            .then(() => docRef.get({ source: 'cache' }))
            .then(doc => {
              expect(doc.exists).to.be.false;
              expect(doc.data()).to.be.undefined;
              expect(doc.metadata.fromCache).to.be.true;
              expect(doc.metadata.hasPendingWrites).to.be.false;
            })
        );
      });
    }
  );

  it('get non existing collection while offline with source=cache', () => {
    return withTestCollection(persistence, {}, colRef => {
      return colRef.firestore
        .disableNetwork()
        .then(() => colRef.get({ source: 'cache' }))
        .then(qrySnap => {
          expect(qrySnap.empty).to.be.true;
          expect(qrySnap.docChanges().length).to.equal(0);
          expect(qrySnap.metadata.fromCache).to.be.true;
          expect(qrySnap.metadata.hasPendingWrites).to.be.false;
        });
    });
  });

  it('get non existing doc while online with source=server', () => {
    return withTestDocAndInitialData(persistence, null, docRef => {
      return docRef.get({ source: 'server' }).then(doc => {
        expect(doc.exists).to.be.false;
        expect(doc.metadata.fromCache).to.be.false;
        expect(doc.metadata.hasPendingWrites).to.be.false;
      });
    });
  });

  it('get non existing collection while online with source=server', () => {
    return withTestCollection(persistence, {}, colRef => {
      return colRef.get({ source: 'server' }).then(qrySnap => {
        expect(qrySnap.empty).to.be.true;
        expect(qrySnap.docChanges().length).to.equal(0);
        expect(qrySnap.metadata.fromCache).to.be.false;
        expect(qrySnap.metadata.hasPendingWrites).to.be.false;
      });
    });
  });

  it('get non existing doc while offline with source=server', () => {
    return withTestDocAndInitialData(persistence, null, docRef => {
      return (
        docRef.firestore
          .disableNetwork()
          // Attempt to get doc.  This will fail since there's nothing in cache.
          .then(() => docRef.get({ source: 'server' }))
          .then(
            doc => {
              expect.fail();
            },
            expected => {}
          )
      );
    });
  });

  it('get non existing collection while offline with source=server', () => {
    return withTestCollection(persistence, {}, colRef => {
      return colRef.firestore
        .disableNetwork()
        .then(() => colRef.get({ source: 'server' }))
        .then(
          qrySnap => {
            expect.fail();
          },
          expected => {}
        );
    });
  });
});
