/**
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
import { apiDescribe, withTestDoc, withTestCollection } from '../util/helpers';

apiDescribe('GetOptions', persistence => {
  it('get document while online with default get options', () => {
    const initialData = { key: 'value' };
    return withTestDoc(persistence, docRef => {
      return docRef
        .set(initialData)
        .then(() => docRef.get())
        .then(doc => {
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
        expect(qrySnap.docChanges.length).to.equal(3);
        let docsData = {};
        qrySnap.forEach(doc => {
          docsData[doc.id] = doc.data();
        });
        expect(docsData).to.deep.equal(initialDocs);
      });
    });
  });

  it('get document while offline with default get options', () => {
    const initialData = { key: 'value' };
    const newData = { key2: 'value2' };
    return withTestDoc(persistence, docRef => {
      return docRef
        .set(initialData)
        .then(() => docRef.firestore.disableNetwork())
        .then(() => {
          // NB: since we're offline, the returned promise won't complete
          docRef.set(newData);
          return docRef.get();
        })
        .then(doc => {
          expect(doc.exists).to.be.true;
          expect(doc.metadata.fromCache).to.be.true;
          expect(doc.metadata.hasPendingWrites).to.be.true;
          expect(doc.data()).to.deep.equal(newData);
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
      // force local cache of these
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
            return colRef.get();
          })
          .then(qrySnap => {
            expect(qrySnap.metadata.fromCache).to.be.true;
            expect(qrySnap.metadata.hasPendingWrites).to.be.true;
            let docsData = {};
            qrySnap.forEach(doc => {
              docsData[doc.id] = doc.data();
            });
            if (persistence) {
              expect(qrySnap.docChanges.length).to.equal(4);
              expect(docsData).to.deep.equal({
                doc1: { key1: 'value1' },
                doc2: { key2: 'value2', key2b: 'value2b' },
                doc3: { key3b: 'value3b' },
                doc4: { key4: 'value4' }
              });
            } else {
              expect(qrySnap.docChanges.length).to.equal(3);
              expect(docsData).to.deep.equal({
                doc2: { key2b: 'value2b' },
                doc3: { key3b: 'value3b' },
                doc4: { key4: 'value4' }
              });
            }
          })
      );
    });
  });

  it('get document while online cache only', () => {
    const initialData = { key: 'value' };
    return withTestDoc(persistence, docRef => {
      return docRef
        .set(initialData)
        .then(() => docRef.get({ source: 'cache' }))
        .then(doc => {
          if (persistence) {
            expect(doc.exists).to.be.true;
            expect(doc.metadata.fromCache).to.be.true;
            expect(doc.metadata.hasPendingWrites).to.be.false;
            expect(doc.data()).to.deep.equal(initialData);
          } else {
            expect.fail();
          }
        })
        .catch(err => {
          // we expect an error when persistence has been disabled (since the
          // document won't be in the local cache.)
          expect(persistence).to.be.false;
        });
    });
  });

  it('get collection while online cache only', () => {
    const initialDocs = {
      doc1: { key1: 'value1' },
      doc2: { key2: 'value2' },
      doc3: { key3: 'value3' }
    };
    return withTestCollection(persistence, initialDocs, colRef => {
      // force local cache of these
      return colRef
        .get()
        .then(ignored => colRef.get({ source: 'cache' }))
        .then(qrySnap => {
          expect(qrySnap.metadata.fromCache).to.be.true;
          expect(qrySnap.metadata.hasPendingWrites).to.be.false;
          if (persistence) {
            expect(qrySnap.docChanges.length).to.equal(3);
            let docsData = {};
            qrySnap.forEach(doc => {
              docsData[doc.id] = doc.data();
            });
            expect(docsData).to.deep.equal(initialDocs);
          } else {
            expect(qrySnap.docChanges.length).to.equal(0);
            expect(qrySnap.empty).to.be.true;
          }
        });
    });
  });

  it('get document while offline cache only', () => {
    const initialData = { key: 'value' };
    const newData = { key2: 'value2' };
    return withTestDoc(persistence, docRef => {
      return docRef
        .set(initialData)
        .then(() => docRef.firestore.disableNetwork())
        .then(() => {
          // NB: since we're offline, the returned promise won't complete
          docRef.set(newData);
          return docRef.get({ source: 'cache' });
        })
        .then(doc => {
          expect(doc.exists).to.be.true;
          expect(doc.metadata.fromCache).to.be.true;
          expect(doc.metadata.hasPendingWrites).to.be.true;
          expect(doc.data()).to.deep.equal(newData);
        });
    });
  });

  it('get collection while offline cache only', () => {
    const initialDocs = {
      doc1: { key1: 'value1' },
      doc2: { key2: 'value2' },
      doc3: { key3: 'value3' }
    };
    return withTestCollection(persistence, initialDocs, colRef => {
      // force local cache of these
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
          let docsData = {};
          qrySnap.forEach(doc => {
            docsData[doc.id] = doc.data();
          });
          if (persistence) {
            expect(qrySnap.docChanges.length).to.equal(4);
            expect(docsData).to.deep.equal({
              doc1: { key1: 'value1' },
              doc2: { key2: 'value2', key2b: 'value2b' },
              doc3: { key3b: 'value3b' },
              doc4: { key4: 'value4' }
            });
          } else {
            expect(qrySnap.docChanges.length).to.equal(3);
            expect(docsData).to.deep.equal({
              doc2: { key2b: 'value2b' },
              doc3: { key3b: 'value3b' },
              doc4: { key4: 'value4' }
            });
          }
        });
    });
  });

  it('get document while online server only', () => {
    const initialData = { key: 'value' };
    return withTestDoc(persistence, docRef => {
      return docRef
        .set(initialData)
        .then(() => docRef.get({ source: 'server' }))
        .then(doc => {
          expect(doc.exists).to.be.true;
          expect(doc.metadata.fromCache).to.be.false;
          expect(doc.metadata.hasPendingWrites).to.be.false;
          expect(doc.data()).to.deep.equal(initialData);
        });
    });
  });

  it('get collection while online server only', () => {
    const initialDocs = {
      doc1: { key1: 'value1' },
      doc2: { key2: 'value2' },
      doc3: { key3: 'value3' }
    };
    return withTestCollection(persistence, initialDocs, colRef => {
      return colRef.get({ source: 'server' }).then(qrySnap => {
        expect(qrySnap.metadata.fromCache).to.be.false;
        expect(qrySnap.metadata.hasPendingWrites).to.be.false;
        expect(qrySnap.docChanges.length).to.equal(3);
        let docsData = {};
        qrySnap.forEach(doc => {
          docsData[doc.id] = doc.data();
        });
        expect(docsData).to.deep.equal(initialDocs);
      });
    });
  });

  it('get document while offline server only', () => {
    const initialData = { key: 'value' };
    return withTestDoc(persistence, docRef => {
      return docRef
        .set(initialData)
        .then(() => docRef.firestore.disableNetwork())
        .then(() => docRef.get({ source: 'server' }))
        .then(doc => {
          expect.fail();
        })
        .catch(expected => {});
    });
  });

  it('get collection while offline server only', () => {
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
          .then(qrySnap => {
            expect.fail();
          })
          .catch(expected => {})
      );
    });
  });

  it('get document while offline with different get options', () => {
    const initialData = { key: 'value' };
    const newData = { key2: 'value2' };
    return withTestDoc(persistence, docRef => {
      return docRef
        .set(initialData)
        .then(() => docRef.firestore.disableNetwork())
        .then(() => {
          // NB: since we're offline, the returned promise won't complete
          docRef.set(newData);

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
          expect(doc.metadata.hasPendingWrites).to.be.true;
          expect(doc.data()).to.deep.equal(newData);
          return Promise.resolve();
        })
        .then(() => docRef.get())
        .then(doc => {
          expect(doc.exists).to.be.true;
          expect(doc.metadata.fromCache).to.be.true;
          expect(doc.metadata.hasPendingWrites).to.be.true;
          expect(doc.data()).to.deep.equal(newData);
          return Promise.resolve();
        })
        .then(() => docRef.get({ source: 'server' }))
        .then(doc => {
          expect.fail();
        })
        .catch(expected => {});
    });
  });

  it('get collection while offline with different get options', () => {
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
            let docsData = {};
            qrySnap.forEach(doc => {
              docsData[doc.id] = doc.data();
            });
            if (persistence) {
              expect(qrySnap.docChanges.length).to.equal(4);
              expect(docsData).to.deep.equal({
                doc1: { key1: 'value1' },
                doc2: { key2: 'value2', key2b: 'value2b' },
                doc3: { key3b: 'value3b' },
                doc4: { key4: 'value4' }
              });
            } else {
              expect(qrySnap.docChanges.length).to.equal(3);
              expect(docsData).to.deep.equal({
                doc2: { key2b: 'value2b' },
                doc3: { key3b: 'value3b' },
                doc4: { key4: 'value4' }
              });
            }
          })
          .then(() => colRef.get())
          .then(qrySnap => {
            expect(qrySnap.metadata.fromCache).to.be.true;
            expect(qrySnap.metadata.hasPendingWrites).to.be.true;
            let docsData = {};
            qrySnap.forEach(doc => {
              docsData[doc.id] = doc.data();
            });
            if (persistence) {
              expect(qrySnap.docChanges.length).to.equal(4);
              expect(docsData).to.deep.equal({
                doc1: { key1: 'value1' },
                doc2: { key2: 'value2', key2b: 'value2b' },
                doc3: { key3b: 'value3b' },
                doc4: { key4: 'value4' }
              });
            } else {
              expect(qrySnap.docChanges.length).to.equal(3);
              expect(docsData).to.deep.equal({
                doc2: { key2b: 'value2b' },
                doc3: { key3b: 'value3b' },
                doc4: { key4: 'value4' }
              });
            }
          })
          .then(() => colRef.get({ source: 'server' }))
          .then(qrySnap => {
            expect.fail();
          })
          .catch(expected => {})
      );
    });
  });

  it('get non existing doc while online with default get options', () => {
    return withTestDoc(persistence, docRef => {
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
        expect(qrySnap.docChanges.length).to.equal(0);
        expect(qrySnap.metadata.fromCache).to.be.false;
        expect(qrySnap.metadata.hasPendingWrites).to.be.false;
      });
    });
  });

  it('get non existing doc while offline with default get options', () => {
    return withTestDoc(persistence, docRef => {
      return docRef.firestore
        .disableNetwork()
        .then(() => docRef.get())
        .then(doc => {
          expect.fail();
        })
        .catch(expected => {});
    });
  });

  it('get non existing collection while offline with default get options', () => {
    return withTestCollection(persistence, {}, colRef => {
      return colRef.firestore
        .disableNetwork()
        .then(() => colRef.get())
        .then(qrySnap => {
          expect(qrySnap.empty).to.be.true;
          expect(qrySnap.docChanges.length).to.equal(0);
          expect(qrySnap.metadata.fromCache).to.be.true;
          expect(qrySnap.metadata.hasPendingWrites).to.be.false;
        });
    });
  });

  it('get non existing doc while online cache only', () => {
    return withTestDoc(persistence, docRef => {
      // attempt to get doc. Currently, this is expected to fail. In the
      // future, we might consider adding support for negative cache hits so
      // that we know certain documents *don't* exist.
      return docRef
        .get({ source: 'cache' })
        .then(doc => {
          expect.fail();
        })
        .catch(expected => {});
    });
  });

  it('get non existing collection while online cache only', () => {
    return withTestCollection(persistence, {}, colRef => {
      return colRef.get({ source: 'cache' }).then(qrySnap => {
        expect(qrySnap.empty).to.be.true;
        expect(qrySnap.docChanges.length).to.equal(0);
        expect(qrySnap.metadata.fromCache).to.be.true;
        expect(qrySnap.metadata.hasPendingWrites).to.be.false;
      });
    });
  });

  it('get non existing doc while offline cache only', () => {
    return withTestDoc(persistence, docRef => {
      return (
        docRef.firestore
          .disableNetwork()
          // attempt to get doc. Currently, this is expected to fail. In the
          // future, we might consider adding support for negative cache hits so
          // that we know certain documents *don't* exist.
          .then(() => docRef.get({ source: 'cache' }))
          .then(doc => {
            expect.fail();
          })
          .catch(expected => {})
      );
    });
  });

  it('get non existing collection while offline cache only', () => {
    return withTestCollection(persistence, {}, colRef => {
      return colRef.firestore
        .disableNetwork()
        .then(() => colRef.get({ source: 'cache' }))
        .then(qrySnap => {
          expect(qrySnap.empty).to.be.true;
          expect(qrySnap.docChanges.length).to.equal(0);
          expect(qrySnap.metadata.fromCache).to.be.true;
          expect(qrySnap.metadata.hasPendingWrites).to.be.false;
        });
    });
  });

  it('get non existing doc while online server only', () => {
    return withTestDoc(persistence, docRef => {
      return docRef.get({ source: 'server' }).then(doc => {
        expect(doc.exists).to.be.false;
        expect(doc.metadata.fromCache).to.be.false;
        expect(doc.metadata.hasPendingWrites).to.be.false;
      });
    });
  });

  it('get non existing collection while online server only', () => {
    return withTestCollection(persistence, {}, colRef => {
      return colRef.get({ source: 'server' }).then(qrySnap => {
        expect(qrySnap.empty).to.be.true;
        expect(qrySnap.docChanges.length).to.equal(0);
        expect(qrySnap.metadata.fromCache).to.be.false;
        expect(qrySnap.metadata.hasPendingWrites).to.be.false;
      });
    });
  });

  it('get non existing doc while offline server only', () => {
    return withTestDoc(persistence, docRef => {
      return (
        docRef.firestore
          .disableNetwork()
          // attempt to get doc. Currently, this is expected to fail. In the
          // future, we might consider adding support for negative cache hits so
          // that we know certain documents *don't* exist.
          .then(() => docRef.get({ source: 'server' }))
          .then(doc => {
            expect.fail();
          })
          .catch(expected => {})
      );
    });
  });

  it('get non existing collection while offline server only', () => {
    return withTestCollection(persistence, {}, colRef => {
      return colRef.firestore
        .disableNetwork()
        .then(() => colRef.get({ source: 'server' }))
        .then(qrySnap => {
          expect.fail();
        })
        .catch(expected => {});
    });
  });
});
