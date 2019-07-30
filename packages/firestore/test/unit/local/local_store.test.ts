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
import { PublicFieldValue } from '../../../src/api/field_value';
import { Timestamp } from '../../../src/api/timestamp';
import { User } from '../../../src/auth/user';
import { Query } from '../../../src/core/query';
import { TargetId } from '../../../src/core/types';
import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import { LocalStore, LocalWriteResult } from '../../../src/local/local_store';
import { LocalViewChanges } from '../../../src/local/local_view_changes';
import { Persistence } from '../../../src/local/persistence';
import {
  documentKeySet,
  DocumentMap,
  MaybeDocumentMap
} from '../../../src/model/collections';
import { MaybeDocument, NoDocument } from '../../../src/model/document';
import {
  Mutation,
  MutationResult,
  Precondition
} from '../../../src/model/mutation';
import {
  MutationBatch,
  MutationBatchResult
} from '../../../src/model/mutation_batch';
import { emptyByteString } from '../../../src/platform/platform';
import { RemoteEvent } from '../../../src/remote/remote_event';
import {
  WatchChangeAggregator,
  WatchTargetChange,
  WatchTargetChangeState
} from '../../../src/remote/watch_change';
import { assert } from '../../../src/util/assert';
import { addEqualityMatcher } from '../../util/equality_matcher';
import {
  deletedDoc,
  deleteMutation,
  doc,
  docAddedRemoteEvent,
  docUpdateRemoteEvent,
  expectEqual,
  key,
  localViewChanges,
  mapAsArray,
  patchMutation,
  path,
  setMutation,
  TestSnapshotVersion,
  transformMutation,
  unknownDoc,
  version
} from '../../util/helpers';

import { FieldValue, IntegerValue } from '../../../src/model/field_value';
import * as persistenceHelpers from './persistence_test_helpers';

class LocalStoreTester {
  private promiseChain: Promise<void> = Promise.resolve();
  private lastChanges: MaybeDocumentMap | null = null;
  private lastTargetId: TargetId | null = null;
  private batches: MutationBatch[] = [];
  constructor(public localStore: LocalStore, readonly gcIsEager: boolean) {}

  after(
    op: Mutation | Mutation[] | RemoteEvent | LocalViewChanges
  ): LocalStoreTester {
    if (op instanceof Mutation) {
      return this.afterMutations([op]);
    } else if (op instanceof Array) {
      return this.afterMutations(op);
    } else if (op instanceof LocalViewChanges) {
      return this.afterViewChanges(op);
    } else {
      return this.afterRemoteEvent(op);
    }
  }

  afterMutations(mutations: Mutation[]): LocalStoreTester {
    this.promiseChain = this.promiseChain
      .then(() => {
        return this.localStore.localWrite(mutations);
      })
      .then((result: LocalWriteResult) => {
        this.batches.push(
          new MutationBatch(result.batchId, Timestamp.now(), [], mutations)
        );
        this.lastChanges = result.changes;
      });
    return this;
  }

  afterRemoteEvent(remoteEvent: RemoteEvent): LocalStoreTester {
    this.promiseChain = this.promiseChain
      .then(() => {
        return this.localStore.applyRemoteEvent(remoteEvent);
      })
      .then((result: MaybeDocumentMap) => {
        this.lastChanges = result;
      });
    return this;
  }

  afterViewChanges(viewChanges: LocalViewChanges): LocalStoreTester {
    this.promiseChain = this.promiseChain.then(() =>
      this.localStore.notifyLocalViewChanges([viewChanges])
    );
    return this;
  }

  afterAcknowledgingMutation(options: {
    documentVersion: TestSnapshotVersion;
    transformResult?: FieldValue;
  }): LocalStoreTester {
    this.promiseChain = this.promiseChain
      .then(() => {
        const batch = this.batches.shift()!;
        expect(batch.mutations.length).to.equal(
          1,
          'Acknowledging more than one mutation not supported.'
        );
        const ver = version(options.documentVersion);
        const mutationResults = [
          new MutationResult(
            ver,
            options.transformResult ? [options.transformResult] : null
          )
        ];
        const write = MutationBatchResult.from(
          batch,
          ver,
          mutationResults,
          /*streamToken=*/ emptyByteString()
        );

        return this.localStore.acknowledgeBatch(write);
      })
      .then((changes: MaybeDocumentMap) => {
        this.lastChanges = changes;
      });
    return this;
  }

  afterRejectingMutation(): LocalStoreTester {
    this.promiseChain = this.promiseChain
      .then(() => {
        return this.localStore.rejectBatch(this.batches.shift()!.batchId);
      })
      .then((changes: MaybeDocumentMap) => {
        this.lastChanges = changes;
      });
    return this;
  }

  afterAllocatingQuery(query: Query): LocalStoreTester {
    this.promiseChain = this.promiseChain.then(() => {
      return this.localStore.allocateQuery(query).then(result => {
        this.lastTargetId = result.targetId;
      });
    });
    return this;
  }

  afterReleasingQuery(query: Query): LocalStoreTester {
    this.promiseChain = this.promiseChain.then(() => {
      return this.localStore.releaseQuery(
        query,
        /*keepPersistedQueryData=*/ false
      );
    });
    return this;
  }

  toReturnTargetId(id: TargetId): LocalStoreTester {
    this.promiseChain = this.promiseChain.then(() => {
      expect(this.lastTargetId).to.equal(id);
    });
    return this;
  }

  toReturnChanged(...docs: MaybeDocument[]): LocalStoreTester {
    this.promiseChain = this.promiseChain.then(() => {
      assert(
        this.lastChanges !== null,
        'Called toReturnChanged() without prior after()'
      );
      expect(this.lastChanges!.size).to.equal(docs.length, 'number of changes');
      for (const doc of docs) {
        const returned = this.lastChanges!.get(doc.key);
        expectEqual(
          doc,
          returned,
          `Expected '${
            returned ? returned.toString() : null
          }' to equal '${doc.toString()}'.`
        );
      }
      this.lastChanges = null;
    });
    return this;
  }

  toReturnRemoved(...keyStrings: string[]): LocalStoreTester {
    this.promiseChain = this.promiseChain.then(() => {
      assert(
        this.lastChanges !== null,
        'Called toReturnRemoved() without prior after()'
      );
      expect(this.lastChanges!.size).to.equal(
        keyStrings.length,
        'Number of actual changes mismatched number of expected changes'
      );
      for (const keyString of keyStrings) {
        const returned = this.lastChanges!.get(key(keyString));
        expect(returned).to.be.an.instanceof(NoDocument);
      }
      this.lastChanges = null;
    });
    return this;
  }

  toContain(doc: MaybeDocument): LocalStoreTester {
    this.promiseChain = this.promiseChain.then(() => {
      return this.localStore.readDocument(doc.key).then(result => {
        expectEqual(result, doc);
      });
    });
    return this;
  }

  toNotContain(keyStr: string): LocalStoreTester {
    this.promiseChain = this.promiseChain.then(() => {
      return this.localStore.readDocument(key(keyStr)).then(result => {
        expect(result).to.be.null;
      });
    });
    return this;
  }

  toNotContainIfEager(doc: MaybeDocument): LocalStoreTester {
    if (this.gcIsEager) {
      return this.toNotContain(doc.key.toString());
    } else {
      return this.toContain(doc);
    }
  }

  finish(): Promise<void> {
    return this.promiseChain;
  }
}

describe('LocalStore w/ Memory Persistence', () => {
  addEqualityMatcher();
  genericLocalStoreTests(
    persistenceHelpers.testMemoryEagerPersistence,
    /* gcIsEager= */ true
  );
});

describe('LocalStore w/ IndexedDB Persistence', () => {
  if (!IndexedDbPersistence.isAvailable()) {
    console.warn(
      'No IndexedDB. Skipping LocalStore w/ IndexedDB persistence tests.'
    );
    return;
  }

  addEqualityMatcher();
  genericLocalStoreTests(
    persistenceHelpers.testIndexedDbPersistence,
    /* gcIsEager= */ false
  );
});

function genericLocalStoreTests(
  getPersistence: () => Promise<Persistence>,
  gcIsEager: boolean
): void {
  let persistence: Persistence;
  let localStore: LocalStore;

  beforeEach(async () => {
    persistence = await getPersistence();
    localStore = new LocalStore(persistence, User.UNAUTHENTICATED);
  });

  afterEach(async () => {
    await persistence.shutdown();
    await persistenceHelpers.clearTestPersistence();
  });

  function expectLocalStore(): LocalStoreTester {
    return new LocalStoreTester(localStore, gcIsEager);
  }

  it('handles SetMutation', () => {
    return expectLocalStore()
      .after(setMutation('foo/bar', { foo: 'bar' }))
      .toReturnChanged(
        doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true }))
      .afterAcknowledgingMutation({ documentVersion: 1 })
      .toReturnChanged(
        doc('foo/bar', 1, { foo: 'bar' }, { hasCommittedMutations: true })
      )
      .toNotContainIfEager(
        doc('foo/bar', 1, { foo: 'bar' }, { hasCommittedMutations: true })
      )
      .finish();
  });

  it('handles SetMutation -> Document', () => {
    return expectLocalStore()
      .after(setMutation('foo/bar', { foo: 'bar' }))
      .toReturnChanged(
        doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true }))
      .afterAllocatingQuery(Query.atPath(path('foo')))
      .after(docUpdateRemoteEvent(doc('foo/bar', 2, { it: 'changed' }), [2]))
      .toReturnChanged(
        doc('foo/bar', 2, { foo: 'bar' }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 2, { foo: 'bar' }, { hasLocalMutations: true }))
      .finish();
  });

  it(
    'handles SetMutation -> Ack (Held) -> SetMutation -> Reject -> ' +
      'RemoteEvent (Release Ack)',
    () => {
      return (
        expectLocalStore()
          // Start a query so that acks must be held.
          .afterAllocatingQuery(Query.atPath(path('foo')))
          .toReturnTargetId(2)
          .after(setMutation('foo/bar', { foo: 'bar' }))
          .toReturnChanged(
            doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true })
          )
          .toContain(
            doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true })
          )
          // Last seen version is zero, so this ack must be held.
          .afterAcknowledgingMutation({ documentVersion: 1 })
          .toReturnChanged(
            doc('foo/bar', 1, { foo: 'bar' }, { hasCommittedMutations: true })
          )
          .toNotContainIfEager(
            doc('foo/bar', 1, { foo: 'bar' }, { hasCommittedMutations: true })
          )
          .after(setMutation('bar/baz', { bar: 'baz' }))
          .toReturnChanged(
            doc('bar/baz', 0, { bar: 'baz' }, { hasLocalMutations: true })
          )
          .toContain(
            doc('bar/baz', 0, { bar: 'baz' }, { hasLocalMutations: true })
          )
          .afterRejectingMutation()
          .toReturnRemoved('bar/baz')
          .toNotContain('bar/baz')
          .afterRemoteEvent(
            docAddedRemoteEvent(doc('foo/bar', 2, { it: 'changed' }), [2])
          )
          .toReturnChanged(doc('foo/bar', 2, { it: 'changed' }))
          .toContain(doc('foo/bar', 2, { it: 'changed' }))
          .toNotContain('bar/baz')
          .finish()
      );
    }
  );

  it('handles NoDocument -> SetMutation -> Ack', () => {
    const query = Query.atPath(path('foo'));
    return expectLocalStore()
      .afterAllocatingQuery(query)
      .toReturnTargetId(2)
      .after(docUpdateRemoteEvent(deletedDoc('foo/bar', 2), [2]))
      .toReturnRemoved('foo/bar')
      .toNotContainIfEager(deletedDoc('foo/bar', 2))
      .after(setMutation('foo/bar', { foo: 'bar' }))
      .toReturnChanged(
        doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true }))
      .afterReleasingQuery(query)
      .afterAcknowledgingMutation({ documentVersion: 3 })
      .toReturnChanged(
        doc('foo/bar', 3, { foo: 'bar' }, { hasCommittedMutations: true })
      )
      .toNotContainIfEager(
        doc('foo/bar', 3, { foo: 'bar' }, { hasCommittedMutations: true })
      )
      .finish();
  });

  it('handles SetMutation -> NoDocument', () => {
    return expectLocalStore()
      .afterAllocatingQuery(Query.atPath(path('foo')))
      .toReturnTargetId(2)
      .after(setMutation('foo/bar', { foo: 'bar' }))
      .toReturnChanged(
        doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true })
      )
      .after(docUpdateRemoteEvent(deletedDoc('foo/bar', 2), [2]))
      .toReturnChanged(
        doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true }))
      .finish();
  });

  it('handles Document -> SetMutation -> Ack ->  Document', () => {
    return (
      expectLocalStore()
        .afterAllocatingQuery(Query.atPath(path('foo')))
        .toReturnTargetId(2)
        .after(docAddedRemoteEvent(doc('foo/bar', 2, { it: 'base' }), [2]))
        .toReturnChanged(doc('foo/bar', 2, { it: 'base' }))
        .toContain(doc('foo/bar', 2, { it: 'base' }))
        .after(setMutation('foo/bar', { foo: 'bar' }))
        .toReturnChanged(
          doc('foo/bar', 2, { foo: 'bar' }, { hasLocalMutations: true })
        )
        .toContain(
          doc('foo/bar', 2, { foo: 'bar' }, { hasLocalMutations: true })
        )
        .afterAcknowledgingMutation({ documentVersion: 3 })
        // We haven't seen the remote event yet
        .toReturnChanged(
          doc('foo/bar', 3, { foo: 'bar' }, { hasCommittedMutations: true })
        )
        .toContain(
          doc('foo/bar', 3, { foo: 'bar' }, { hasCommittedMutations: true })
        )
        .after(docUpdateRemoteEvent(doc('foo/bar', 3, { it: 'changed' }), [2]))
        .toReturnChanged(doc('foo/bar', 3, { it: 'changed' }))
        .toContain(doc('foo/bar', 3, { it: 'changed' }))
        .finish()
    );
  });

  it('handles PatchMutation without prior document', () => {
    return expectLocalStore()
      .after(patchMutation('foo/bar', { foo: 'bar' }))
      .toReturnRemoved('foo/bar')
      .toNotContain('foo/bar')
      .afterAcknowledgingMutation({ documentVersion: 1 })
      .toReturnChanged(unknownDoc('foo/bar', 1))
      .toNotContainIfEager(unknownDoc('foo/bar', 1))
      .finish();
  });

  it('handles PatchMutation -> Document -> Ack', () => {
    return expectLocalStore()
      .after(patchMutation('foo/bar', { foo: 'bar' }))
      .toReturnRemoved('foo/bar')
      .toNotContain('foo/bar')
      .afterAllocatingQuery(Query.atPath(path('foo')))
      .toReturnTargetId(2)
      .after(docUpdateRemoteEvent(doc('foo/bar', 1, { it: 'base' }), [2]))
      .toReturnChanged(
        doc(
          'foo/bar',
          1,
          { foo: 'bar', it: 'base' },
          { hasLocalMutations: true }
        )
      )
      .toContain(
        doc(
          'foo/bar',
          1,
          { foo: 'bar', it: 'base' },
          { hasLocalMutations: true }
        )
      )
      .afterAcknowledgingMutation({ documentVersion: 2 })
      .toReturnChanged(
        doc(
          'foo/bar',
          2,
          { foo: 'bar', it: 'base' },
          { hasCommittedMutations: true }
        )
      )
      .after(
        docUpdateRemoteEvent(doc('foo/bar', 2, { foo: 'bar', it: 'base' }), [2])
      )
      .toReturnChanged(
        doc(
          'foo/bar',
          2,
          { foo: 'bar', it: 'base' },
          { hasLocalMutations: false }
        )
      )
      .toContain(doc('foo/bar', 2, { foo: 'bar', it: 'base' }))
      .finish();
  });

  it('handles PatchMutation -> Ack -> Document', () => {
    return expectLocalStore()
      .after(patchMutation('foo/bar', { foo: 'bar' }))
      .toReturnRemoved('foo/bar')
      .toNotContain('foo/bar')
      .afterAcknowledgingMutation({ documentVersion: 1 })
      .toReturnChanged(unknownDoc('foo/bar', 1))
      .toNotContainIfEager(unknownDoc('foo/bar', 1))
      .afterAllocatingQuery(Query.atPath(path('foo')))
      .toReturnTargetId(2)
      .after(docUpdateRemoteEvent(doc('foo/bar', 1, { it: 'base' }), [2]))
      .toReturnChanged(doc('foo/bar', 1, { it: 'base' }))
      .toContain(doc('foo/bar', 1, { it: 'base' }))
      .finish();
  });

  it('handles DeleteMutation -> Ack', () => {
    return expectLocalStore()
      .after(deleteMutation('foo/bar'))
      .toReturnRemoved('foo/bar')
      .toContain(deletedDoc('foo/bar', 0))
      .afterAcknowledgingMutation({ documentVersion: 1 })
      .toReturnRemoved('foo/bar')
      .toNotContainIfEager(
        deletedDoc('foo/bar', 1, { hasCommittedMutations: true })
      )
      .finish();
  });

  it('handles Document -> DeleteMutation -> Ack', () => {
    const query = Query.atPath(path('foo'));
    return (
      expectLocalStore()
        .afterAllocatingQuery(query)
        .toReturnTargetId(2)
        .after(docUpdateRemoteEvent(doc('foo/bar', 1, { it: 'base' }), [2]))
        .toReturnChanged(doc('foo/bar', 1, { it: 'base' }))
        .toContain(doc('foo/bar', 1, { it: 'base' }))
        .after(deleteMutation('foo/bar'))
        .toReturnRemoved('foo/bar')
        .toContain(deletedDoc('foo/bar', 0))
        // remove the mutation so only the mutation is pinning the doc
        .afterReleasingQuery(query)
        .afterAcknowledgingMutation({ documentVersion: 2 })
        .toReturnRemoved('foo/bar')
        .toNotContainIfEager(
          deletedDoc('foo/bar', 2, { hasCommittedMutations: true })
        )
        .finish()
    );
  });

  it('handles DeleteMutation -> Document -> Ack', () => {
    const query = Query.atPath(path('foo'));
    return (
      expectLocalStore()
        .afterAllocatingQuery(query)
        .toReturnTargetId(2)
        .after(deleteMutation('foo/bar'))
        .toReturnRemoved('foo/bar')
        .toContain(deletedDoc('foo/bar', 0))
        .after(docUpdateRemoteEvent(doc('foo/bar', 1, { it: 'base' }), [2]))
        .toReturnRemoved('foo/bar')
        .toContain(deletedDoc('foo/bar', 0))
        // Don't need to keep doc pinned anymore
        .afterReleasingQuery(query)
        .afterAcknowledgingMutation({ documentVersion: 2 })
        .toReturnRemoved('foo/bar')
        .toNotContainIfEager(
          deletedDoc('foo/bar', 2, { hasCommittedMutations: true })
        )
        .finish()
    );
  });

  it('handles Document -> NoDocument -> Document', () => {
    return expectLocalStore()
      .afterAllocatingQuery(Query.atPath(path('foo')))
      .toReturnTargetId(2)
      .after(docUpdateRemoteEvent(doc('foo/bar', 1, { it: 'base' }), [2]))
      .toReturnChanged(doc('foo/bar', 1, { it: 'base' }))
      .toContain(doc('foo/bar', 1, { it: 'base' }))
      .after(docUpdateRemoteEvent(deletedDoc('foo/bar', 2), [2]))
      .toReturnRemoved('foo/bar')
      .toNotContainIfEager(deletedDoc('foo/bar', 2))
      .after(docUpdateRemoteEvent(doc('foo/bar', 3, { it: 'changed' }), [2]))
      .toReturnChanged(doc('foo/bar', 3, { it: 'changed' }))
      .toContain(doc('foo/bar', 3, { it: 'changed' }))
      .finish();
  });

  it('handles SetMutation -> PatchMutation -> Document -> Ack -> Ack', () => {
    const query = Query.atPath(path('foo'));
    return expectLocalStore()
      .after(setMutation('foo/bar', { foo: 'old' }))
      .toReturnChanged(
        doc('foo/bar', 0, { foo: 'old' }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 0, { foo: 'old' }, { hasLocalMutations: true }))
      .after(patchMutation('foo/bar', { foo: 'bar' }))
      .toReturnChanged(
        doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true }))
      .afterAllocatingQuery(query)
      .toReturnTargetId(2)
      .after(docUpdateRemoteEvent(doc('foo/bar', 1, { it: 'base' }), [2]))
      .toReturnChanged(
        doc('foo/bar', 1, { foo: 'bar' }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 1, { foo: 'bar' }, { hasLocalMutations: true }))
      .afterReleasingQuery(query)
      .afterAcknowledgingMutation({ documentVersion: 2 }) // delete mutation
      .toReturnChanged(
        doc('foo/bar', 2, { foo: 'bar' }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 2, { foo: 'bar' }, { hasLocalMutations: true }))
      .afterAcknowledgingMutation({ documentVersion: 3 }) // patch mutation
      .toReturnChanged(
        doc('foo/bar', 3, { foo: 'bar' }, { hasCommittedMutations: true })
      )
      .toNotContainIfEager(
        doc('foo/bar', 3, { foo: 'bar' }, { hasCommittedMutations: true })
      )
      .finish();
  });

  it('handles SetMutation + PatchMutation', () => {
    return expectLocalStore()
      .after([
        setMutation('foo/bar', { foo: 'old' }),
        patchMutation('foo/bar', { foo: 'bar' })
      ])
      .toReturnChanged(
        doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true }))
      .finish();
  });

  it('handles SetMutation -> Ack -> PatchMutation -> Reject', () => {
    if (!gcIsEager) {
      return;
    }
    return (
      expectLocalStore()
        .after(setMutation('foo/bar', { foo: 'old' }))
        .toContain(
          doc('foo/bar', 0, { foo: 'old' }, { hasLocalMutations: true })
        )
        .afterAcknowledgingMutation({ documentVersion: 1 })
        // After having been ack'd, there is nothing pinning the document
        .toNotContain('foo/bar')
        .after(patchMutation('foo/bar', { foo: 'bar' }))
        // A blind patch is not visible in the cache
        .toNotContain('foo/bar')
        .afterRejectingMutation()
        .toNotContain('foo/bar')
        .finish()
    );
  });

  it('handles SetMutation(A) + SetMutation(B) + PatchMutation(A)', () => {
    return expectLocalStore()
      .after([
        setMutation('foo/bar', { foo: 'old' }),
        setMutation('bar/baz', { bar: 'baz' }),
        patchMutation('foo/bar', { foo: 'bar' })
      ])
      .toReturnChanged(
        doc('bar/baz', 0, { bar: 'baz' }, { hasLocalMutations: true }),
        doc('bar/baz', 0, { bar: 'baz' }, { hasLocalMutations: true })
      )
      .finish();
  });

  it('handles DeleteMutation -> PatchMutation -> Ack -> Ack', () => {
    return expectLocalStore()
      .after(deleteMutation('foo/bar'))
      .toReturnRemoved('foo/bar')
      .toContain(deletedDoc('foo/bar', 0))
      .after(patchMutation('foo/bar', { foo: 'bar' }))
      .toReturnRemoved('foo/bar')
      .toContain(deletedDoc('foo/bar', 0))
      .afterAcknowledgingMutation({ documentVersion: 2 }) // delete mutation
      .toReturnRemoved('foo/bar')
      .toContain(deletedDoc('foo/bar', 2, { hasCommittedMutations: true }))
      .afterAcknowledgingMutation({ documentVersion: 3 }) // patch mutation
      .toReturnChanged(unknownDoc('foo/bar', 3))
      .toNotContainIfEager(unknownDoc('foo/bar', 3))
      .finish();
  });

  it('collects garbage after ChangeBatch with no target ids', () => {
    if (!gcIsEager) {
      return;
    }

    return expectLocalStore()
      .after(docAddedRemoteEvent(deletedDoc('foo/bar', 2), [], [], [1]))
      .toNotContain('foo/bar')
      .after(
        docUpdateRemoteEvent(doc('foo/bar', 2, { foo: 'bar' }), [], [], [1])
      )
      .toNotContain('foo/bar')
      .finish();
  });

  it('collects garbage after ChangeBatch', () => {
    if (!gcIsEager) {
      return;
    }
    const query = Query.atPath(path('foo'));
    return expectLocalStore()
      .afterAllocatingQuery(query)
      .toReturnTargetId(2)
      .after(docAddedRemoteEvent(doc('foo/bar', 2, { foo: 'bar' }), [2]))
      .toContain(doc('foo/bar', 2, { foo: 'bar' }))
      .after(docUpdateRemoteEvent(doc('foo/bar', 2, { foo: 'baz' }), [], [2]))
      .toNotContain('foo/bar')
      .finish();
  });

  it('collects garbage after acknowledged mutation', () => {
    const query = Query.atPath(path('foo'));
    if (!gcIsEager) {
      return;
    }
    return (
      expectLocalStore()
        .afterAllocatingQuery(query)
        .toReturnTargetId(2)
        .after(docAddedRemoteEvent(doc('foo/bar', 0, { foo: 'old' }), [2]))
        .after(patchMutation('foo/bar', { foo: 'bar' }))
        // Release the query so that our target count goes back to 0 and we are considered
        // up-to-date.
        .afterReleasingQuery(query)
        .after(setMutation('foo/bah', { foo: 'bah' }))
        .after(deleteMutation('foo/baz'))
        .toContain(
          doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true })
        )
        .toContain(
          doc('foo/bah', 0, { foo: 'bah' }, { hasLocalMutations: true })
        )
        .toContain(deletedDoc('foo/baz', 0))
        .afterAcknowledgingMutation({ documentVersion: 3 })
        .toNotContain('foo/bar')
        .toContain(
          doc('foo/bah', 0, { foo: 'bah' }, { hasLocalMutations: true })
        )
        .toContain(deletedDoc('foo/baz', 0))
        .afterAcknowledgingMutation({ documentVersion: 4 })
        .toNotContain('foo/bar')
        .toNotContain('foo/bah')
        .toContain(deletedDoc('foo/baz', 0))
        .afterAcknowledgingMutation({ documentVersion: 5 })
        .toNotContain('foo/bar')
        .toNotContain('foo/bah')
        .toNotContain('foo/baz')
        .finish()
    );
  });

  it('collects garbage after rejected mutation', () => {
    if (!gcIsEager) {
      return;
    }
    const query = Query.atPath(path('foo'));
    return (
      expectLocalStore()
        .afterAllocatingQuery(query)
        .toReturnTargetId(2)
        .after(docAddedRemoteEvent(doc('foo/bar', 0, { foo: 'old' }), [2]))
        .after(patchMutation('foo/bar', { foo: 'bar' }))
        // Release the query so that our target count goes back to 0 and we are considered
        // up-to-date.
        .afterReleasingQuery(query)
        .after(setMutation('foo/bah', { foo: 'bah' }))
        .after(deleteMutation('foo/baz'))
        .toContain(
          doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true })
        )
        .toContain(
          doc('foo/bah', 0, { foo: 'bah' }, { hasLocalMutations: true })
        )
        .toContain(deletedDoc('foo/baz', 0))
        .afterRejectingMutation() // patch mutation
        .toNotContain('foo/bar')
        .toContain(
          doc('foo/bah', 0, { foo: 'bah' }, { hasLocalMutations: true })
        )
        .toContain(deletedDoc('foo/baz', 0))
        .afterRejectingMutation() // set mutation
        .toNotContain('foo/bar')
        .toNotContain('foo/bah')
        .toContain(deletedDoc('foo/baz', 0))
        .afterRejectingMutation() // delete mutation
        .toNotContain('foo/bar')
        .toNotContain('foo/bah')
        .toNotContain('foo/baz')
        .finish()
    );
  });

  it('pins documents in the local view', () => {
    if (!gcIsEager) {
      return;
    }
    const query = Query.atPath(path('foo'));
    return expectLocalStore()
      .afterAllocatingQuery(query)
      .toReturnTargetId(2)
      .after(docAddedRemoteEvent(doc('foo/bar', 1, { foo: 'bar' }), [2]))
      .after(setMutation('foo/baz', { foo: 'baz' }))
      .toContain(doc('foo/bar', 1, { foo: 'bar' }))
      .toContain(doc('foo/baz', 0, { foo: 'baz' }, { hasLocalMutations: true }))
      .after(localViewChanges(2, { added: ['foo/bar', 'foo/baz'] }))
      .after(docUpdateRemoteEvent(doc('foo/bar', 1, { foo: 'bar' }), [], [2]))
      .after(docUpdateRemoteEvent(doc('foo/baz', 2, { foo: 'baz' }), [2]))
      .afterAcknowledgingMutation({ documentVersion: 2 })
      .toContain(doc('foo/bar', 1, { foo: 'bar' }))
      .toContain(doc('foo/baz', 2, { foo: 'baz' }))
      .after(localViewChanges(2, { removed: ['foo/bar', 'foo/baz'] }))
      .afterReleasingQuery(query)
      .toNotContain('foo/bar')
      .toNotContain('foo/baz')
      .finish();
  });

  it('throws away documents with unknown target-ids immediately', () => {
    if (!gcIsEager) {
      return;
    }
    const targetId = 321;
    return expectLocalStore()
      .after(docAddedRemoteEvent(doc('foo/bar', 1, {}), [], [], [targetId]))
      .toNotContain('foo/bar')
      .finish();
  });

  it('can execute document queries', () => {
    const localStore = expectLocalStore().localStore;
    return localStore
      .localWrite([
        setMutation('foo/bar', { foo: 'bar' }),
        setMutation('foo/baz', { foo: 'baz' }),
        setMutation('foo/bar/Foo/Bar', { Foo: 'Bar' })
      ])
      .then(() => {
        return localStore.executeQuery(Query.atPath(path('foo/bar')));
      })
      .then((docs: DocumentMap) => {
        expect(docs.size).to.equal(1);
        expectEqual(docs.minKey(), key('foo/bar'));
      });
  });

  it('can execute collection queries', () => {
    const localStore = expectLocalStore().localStore;
    return localStore
      .localWrite([
        setMutation('fo/bar', { fo: 'bar' }),
        setMutation('foo/bar', { foo: 'bar' }),
        setMutation('foo/baz', { foo: 'baz' }),
        setMutation('foo/bar/Foo/Bar', { Foo: 'Bar' }),
        setMutation('fooo/blah', { fooo: 'blah' })
      ])
      .then(() => {
        return localStore.executeQuery(Query.atPath(path('foo')));
      })
      .then((docs: DocumentMap) => {
        expect(docs.size).to.equal(2);
        expectEqual(docs.minKey(), key('foo/bar'));
        expectEqual(docs.maxKey(), key('foo/baz'));
      });
  });

  it('can execute mixed collection queries', async () => {
    const query = Query.atPath(path('foo'));
    const queryData = await localStore.allocateQuery(query);
    expect(queryData.targetId).to.equal(2);
    await localStore.applyRemoteEvent(
      docAddedRemoteEvent(doc('foo/baz', 10, { a: 'b' }), [2], [])
    );
    await localStore.applyRemoteEvent(
      docUpdateRemoteEvent(doc('foo/bar', 20, { a: 'b' }), [2], [])
    );
    await localStore.localWrite([setMutation('foo/bonk', { a: 'b' })]);
    const docs = await localStore.executeQuery(query);
    expect(mapAsArray(docs)).to.deep.equal([
      { key: key('foo/bar'), value: doc('foo/bar', 20, { a: 'b' }) },
      { key: key('foo/baz'), value: doc('foo/baz', 10, { a: 'b' }) },
      {
        key: key('foo/bonk'),
        value: doc('foo/bonk', 0, { a: 'b' }, { hasLocalMutations: true })
      }
    ]);
  });

  it('persists resume tokens', async () => {
    if (gcIsEager) {
      return;
    }
    const query = Query.atPath(path('foo/bar'));
    const queryData = await localStore.allocateQuery(query);
    const targetId = queryData.targetId;
    const resumeToken = 'abc';
    const watchChange = new WatchTargetChange(
      WatchTargetChangeState.Current,
      [targetId],
      resumeToken
    );
    const aggregator = new WatchChangeAggregator({
      getRemoteKeysForTarget: () => documentKeySet(),
      getQueryDataForTarget: () => queryData
    });
    aggregator.handleTargetChange(watchChange);
    const remoteEvent = aggregator.createRemoteEvent(version(1000));
    await localStore.applyRemoteEvent(remoteEvent);

    // Stop listening so that the query should become inactive (but persistent)
    await localStore.releaseQuery(query, /*keepPersistedQueryData=*/ false);

    // Should come back with the same resume token
    const queryData2 = await localStore.allocateQuery(query);
    expect(queryData2.resumeToken).to.deep.equal(resumeToken);
  });

  it('does not replace resume token with empty resume token', async () => {
    if (gcIsEager) {
      return;
    }
    const query = Query.atPath(path('foo/bar'));
    const queryData = await localStore.allocateQuery(query);
    const targetId = queryData.targetId;
    const resumeToken = 'abc';

    const watchChange1 = new WatchTargetChange(
      WatchTargetChangeState.Current,
      [targetId],
      resumeToken
    );
    const aggregator1 = new WatchChangeAggregator({
      getRemoteKeysForTarget: () => documentKeySet(),
      getQueryDataForTarget: () => queryData
    });
    aggregator1.handleTargetChange(watchChange1);
    const remoteEvent1 = aggregator1.createRemoteEvent(version(1000));
    await localStore.applyRemoteEvent(remoteEvent1);

    const watchChange2 = new WatchTargetChange(
      WatchTargetChangeState.Current,
      [targetId],
      emptyByteString()
    );
    const aggregator2 = new WatchChangeAggregator({
      getRemoteKeysForTarget: () => documentKeySet(),
      getQueryDataForTarget: () => queryData
    });
    aggregator2.handleTargetChange(watchChange2);
    const remoteEvent2 = aggregator2.createRemoteEvent(version(2000));
    await localStore.applyRemoteEvent(remoteEvent2);

    // Stop listening so that the query should become inactive (but persistent)
    await localStore.releaseQuery(query, /*keepPersistedQueryData=*/ false);

    // Should come back with the same resume token
    const queryData2 = await localStore.allocateQuery(query);
    expect(queryData2.resumeToken).to.deep.equal(resumeToken);
  });

  // TODO(mrschmidt): The FieldValue.increment() field transform tests below
  // would probably be better implemented as spec tests but currently they don't
  // support transforms.

  it('handles SetMutation -> TransformMutation -> TransformMutation', () => {
    return expectLocalStore()
      .after(setMutation('foo/bar', { sum: 0 }))
      .toReturnChanged(
        doc('foo/bar', 0, { sum: 0 }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 0, { sum: 0 }, { hasLocalMutations: true }))
      .after(
        transformMutation('foo/bar', { sum: PublicFieldValue.increment(1) })
      )
      .toReturnChanged(
        doc('foo/bar', 0, { sum: 1 }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 0, { sum: 1 }, { hasLocalMutations: true }))
      .after(
        transformMutation('foo/bar', { sum: PublicFieldValue.increment(2) })
      )
      .toReturnChanged(
        doc('foo/bar', 0, { sum: 3 }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 0, { sum: 3 }, { hasLocalMutations: true }))
      .finish();
  });

  it('handles SetMutation -> Ack -> TransformMutation -> Ack -> TransformMutation', () => {
    if (gcIsEager) {
      // Since this test doesn't start a listen, Eager GC removes the documents
      // from the cache as soon as the mutation is applied. This creates a lot
      // of special casing in this unit test but does not expand its test
      // coverage.
      return;
    }

    return expectLocalStore()
      .after(setMutation('foo/bar', { sum: 0 }))
      .toReturnChanged(
        doc('foo/bar', 0, { sum: 0 }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 0, { sum: 0 }, { hasLocalMutations: true }))
      .afterAcknowledgingMutation({ documentVersion: 1 })
      .toReturnChanged(
        doc('foo/bar', 1, { sum: 0 }, { hasCommittedMutations: true })
      )
      .toContain(doc('foo/bar', 1, { sum: 0 }, { hasCommittedMutations: true }))
      .after(
        transformMutation('foo/bar', { sum: PublicFieldValue.increment(1) })
      )
      .toReturnChanged(
        doc('foo/bar', 1, { sum: 1 }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 1, { sum: 1 }, { hasLocalMutations: true }))
      .afterAcknowledgingMutation({
        documentVersion: 2,
        transformResult: new IntegerValue(1)
      })
      .toReturnChanged(
        doc('foo/bar', 2, { sum: 1 }, { hasCommittedMutations: true })
      )
      .toContain(doc('foo/bar', 2, { sum: 1 }, { hasCommittedMutations: true }))
      .after(
        transformMutation('foo/bar', { sum: PublicFieldValue.increment(2) })
      )
      .toReturnChanged(
        doc('foo/bar', 2, { sum: 3 }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 2, { sum: 3 }, { hasLocalMutations: true }))
      .finish();
  });

  it('handles SetMutation -> TransformMutation -> RemoteEvent -> TransformMutation', () => {
    const query = Query.atPath(path('foo'));
    return (
      expectLocalStore()
        .afterAllocatingQuery(query)
        .toReturnTargetId(2)
        .after(setMutation('foo/bar', { sum: 0 }))
        .toReturnChanged(
          doc('foo/bar', 0, { sum: 0 }, { hasLocalMutations: true })
        )
        .toContain(doc('foo/bar', 0, { sum: 0 }, { hasLocalMutations: true }))
        .afterRemoteEvent(
          docAddedRemoteEvent(doc('foo/bar', 1, { sum: 0 }), [2])
        )
        .afterAcknowledgingMutation({ documentVersion: 1 })
        .toReturnChanged(doc('foo/bar', 1, { sum: 0 }))
        .toContain(doc('foo/bar', 1, { sum: 0 }))
        .after(
          transformMutation('foo/bar', { sum: PublicFieldValue.increment(1) })
        )
        .toReturnChanged(
          doc('foo/bar', 1, { sum: 1 }, { hasLocalMutations: true })
        )
        .toContain(doc('foo/bar', 1, { sum: 1 }, { hasLocalMutations: true }))
        // The value in this remote event gets ignored since we still have a
        // pending transform mutation.
        .afterRemoteEvent(
          docUpdateRemoteEvent(doc('foo/bar', 2, { sum: 1337 }), [2])
        )
        .toReturnChanged(
          doc('foo/bar', 2, { sum: 1 }, { hasLocalMutations: true })
        )
        .toContain(doc('foo/bar', 2, { sum: 1 }, { hasLocalMutations: true }))
        // Add another increment. Note that we still compute the increment based
        // on the local value.
        .after(
          transformMutation('foo/bar', { sum: PublicFieldValue.increment(2) })
        )
        .toReturnChanged(
          doc('foo/bar', 2, { sum: 3 }, { hasLocalMutations: true })
        )
        .toContain(doc('foo/bar', 2, { sum: 3 }, { hasLocalMutations: true }))
        .afterAcknowledgingMutation({
          documentVersion: 3,
          transformResult: new IntegerValue(1)
        })
        .toReturnChanged(
          doc('foo/bar', 3, { sum: 3 }, { hasLocalMutations: true })
        )
        .toContain(doc('foo/bar', 3, { sum: 3 }, { hasLocalMutations: true }))
        .afterAcknowledgingMutation({
          documentVersion: 4,
          transformResult: new IntegerValue(1339)
        })
        .toReturnChanged(
          doc('foo/bar', 4, { sum: 1339 }, { hasCommittedMutations: true })
        )
        .toContain(
          doc('foo/bar', 4, { sum: 1339 }, { hasCommittedMutations: true })
        )
        .finish()
    );
  });

  it('holds back only non-idempotent transforms', () => {
    const query = Query.atPath(path('foo'));
    return (
      expectLocalStore()
        .afterAllocatingQuery(query)
        .toReturnTargetId(2)
        .after(setMutation('foo/bar', { sum: 0, arrayUnion: [] }))
        .toReturnChanged(
          doc(
            'foo/bar',
            0,
            { sum: 0, arrayUnion: [] },
            { hasLocalMutations: true }
          )
        )
        .afterAcknowledgingMutation({ documentVersion: 1 })
        .toReturnChanged(
          doc(
            'foo/bar',
            1,
            { sum: 0, arrayUnion: [] },
            { hasCommittedMutations: true }
          )
        )
        .afterRemoteEvent(
          docAddedRemoteEvent(doc('foo/bar', 1, { sum: 0, arrayUnion: [] }), [
            2
          ])
        )
        .toReturnChanged(doc('foo/bar', 1, { sum: 0, arrayUnion: [] }))
        .afterMutations([
          transformMutation('foo/bar', { sum: PublicFieldValue.increment(1) }),
          transformMutation('foo/bar', {
            arrayUnion: PublicFieldValue.arrayUnion('foo')
          })
        ])
        .toReturnChanged(
          doc(
            'foo/bar',
            1,
            { sum: 1, arrayUnion: ['foo'] },
            { hasLocalMutations: true }
          )
        )
        // The sum transform is not idempotent and the backend's updated value
        // is ignored. The ArrayUnion transform is recomputed and includes the
        // backend value.
        .afterRemoteEvent(
          docUpdateRemoteEvent(
            doc('foo/bar', 2, { sum: 1337, arrayUnion: ['bar'] }),
            [2]
          )
        )
        .toReturnChanged(
          doc(
            'foo/bar',
            2,
            { sum: 1, arrayUnion: ['bar', 'foo'] },
            { hasLocalMutations: true }
          )
        )
        .finish()
    );
  });

  it('handles MergeMutation with Transform -> RemoteEvent', () => {
    const query = Query.atPath(path('foo'));
    return expectLocalStore()
      .afterAllocatingQuery(query)
      .toReturnTargetId(2)
      .afterMutations([
        patchMutation('foo/bar', {}, Precondition.NONE),
        transformMutation('foo/bar', { sum: PublicFieldValue.increment(1) })
      ])
      .toReturnChanged(
        doc('foo/bar', 0, { sum: 1 }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 0, { sum: 1 }, { hasLocalMutations: true }))
      .afterRemoteEvent(
        docAddedRemoteEvent(doc('foo/bar', 1, { sum: 1337 }), [2])
      )
      .toReturnChanged(
        doc('foo/bar', 1, { sum: 1 }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 1, { sum: 1 }, { hasLocalMutations: true }))
      .finish();
  });

  it('handles PatchMutation with Transform -> RemoteEvent', () => {
    // Note: This test reflects the current behavior, but it may be preferable
    // to replay the mutation once we receive the first value from the backend.

    const query = Query.atPath(path('foo'));
    return expectLocalStore()
      .afterAllocatingQuery(query)
      .toReturnTargetId(2)
      .afterMutations([
        patchMutation('foo/bar', {}),
        transformMutation('foo/bar', { sum: PublicFieldValue.increment(1) })
      ])
      .toReturnChanged(deletedDoc('foo/bar', 0))
      .toNotContain('foo/bar')
      .afterRemoteEvent(
        docAddedRemoteEvent(doc('foo/bar', 1, { sum: 1337 }), [2])
      )
      .toReturnChanged(
        doc('foo/bar', 1, { sum: 1 }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 1, { sum: 1 }, { hasLocalMutations: true }))
      .finish();
  });
}
