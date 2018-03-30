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
import { Timestamp } from '../../../src/api/timestamp';
import { User } from '../../../src/auth/user';
import { Query } from '../../../src/core/query';
import { TargetId } from '../../../src/core/types';
import { EagerGarbageCollector } from '../../../src/local/eager_garbage_collector';
import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import { LocalStore, LocalWriteResult } from '../../../src/local/local_store';
import { LocalViewChanges } from '../../../src/local/local_view_changes';
import { NoOpGarbageCollector } from '../../../src/local/no_op_garbage_collector';
import { Persistence } from '../../../src/local/persistence';
import { DocumentMap, MaybeDocumentMap } from '../../../src/model/collections';
import {
  Document,
  MaybeDocument,
  NoDocument
} from '../../../src/model/document';
import {
  DeleteMutation,
  Mutation,
  MutationResult,
  PatchMutation,
  SetMutation
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
import { assert, fail } from '../../../src/util/assert';
import { addEqualityMatcher } from '../../util/equality_matcher';
import {
  deletedDoc,
  deleteMutation,
  doc,
  docUpdateRemoteEvent,
  expectEqual,
  key,
  localViewChanges,
  mapAsArray,
  patchMutation,
  path,
  setMutation,
  TestSnapshotVersion,
  version
} from '../../util/helpers';

import * as persistenceHelpers from './persistence_test_helpers';

class LocalStoreTester {
  private promiseChain: Promise<void> = Promise.resolve();
  private lastChanges: MaybeDocumentMap | null = null;
  private lastTargetId: TargetId | null = null;
  private batches: MutationBatch[] = [];
  constructor(public localStore: LocalStore) {}

  after(
    op: Mutation | Mutation[] | RemoteEvent | LocalViewChanges
  ): LocalStoreTester {
    if (
      op instanceof SetMutation ||
      op instanceof PatchMutation ||
      op instanceof DeleteMutation
    ) {
      return this.afterMutations([op]);
    } else if (op instanceof Array) {
      return this.afterMutations(op);
    } else if (op instanceof RemoteEvent) {
      return this.afterRemoteEvent(op);
    } else if (op instanceof LocalViewChanges) {
      return this.afterViewChanges(op);
    } else {
      return fail('Unknown operation on LocalStore: ' + op);
    }
  }

  afterMutations(mutations: Mutation[]): LocalStoreTester {
    this.promiseChain = this.promiseChain
      .then(() => {
        return this.localStore.localWrite(mutations);
      })
      .then((result: LocalWriteResult) => {
        this.batches.push(
          new MutationBatch(result.batchId, Timestamp.now(), mutations)
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
    this.promiseChain = this.promiseChain.then(() => {
      return this.localStore.notifyLocalViewChanges([viewChanges]);
    });
    return this;
  }

  afterAcknowledgingMutation(options: {
    documentVersion: TestSnapshotVersion;
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
          new MutationResult(ver, /*transformResults=*/ null)
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

  afterGC(): LocalStoreTester {
    this.promiseChain = this.promiseChain.then(() => {
      return this.localStore.collectGarbage();
    });
    return this;
  }

  toReturnTargetId(id: TargetId): LocalStoreTester {
    this.promiseChain = this.promiseChain.then(() => {
      expect(this.lastTargetId).to.equal(id);
    });
    return this;
  }

  toReturnChanged(...docs: Document[]): LocalStoreTester {
    this.promiseChain = this.promiseChain.then(() => {
      assert(
        this.lastChanges !== null,
        'Called toReturnChanged() without prior after()'
      );
      expect(this.lastChanges!.size).to.equal(docs.length, 'number of changes');
      for (const doc of docs) {
        const returned = this.lastChanges!.get(doc.key);
        expectEqual(doc, returned);
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
        expect(returned instanceof NoDocument).to.be.ok;
      }
      this.lastChanges = null;
    });
    return this;
  }

  toContain(doc: MaybeDocument): LocalStoreTester {
    this.promiseChain = this.promiseChain.then(() => {
      return this.localStore
        .readDocument(doc.key)
        .then((result: MaybeDocument) => {
          expectEqual(result, doc);
        });
    });
    return this;
  }

  toNotContain(keyStr: string): LocalStoreTester {
    this.promiseChain = this.promiseChain.then(() => {
      return this.localStore
        .readDocument(key(keyStr))
        .then((result: MaybeDocument) => {
          expect(result).to.be.null;
        });
    });
    return this;
  }

  finish(): Promise<void> {
    return this.promiseChain;
  }
}

describe('LocalStore w/ Memory Persistence', () => {
  addEqualityMatcher();
  genericLocalStoreTests(persistenceHelpers.testMemoryPersistence);
});

describe('LocalStore w/ IndexedDB Persistence', () => {
  if (!IndexedDbPersistence.isAvailable()) {
    console.warn(
      'No IndexedDB. Skipping LocalStore w/ IndexedDB persistence tests.'
    );
    return;
  }

  addEqualityMatcher();
  genericLocalStoreTests(persistenceHelpers.testIndexedDbPersistence);
});

function genericLocalStoreTests(getPersistence: () => Promise<Persistence>) {
  let persistence: Persistence;
  let localStore: LocalStore;

  beforeEach(() => {
    return getPersistence().then(p => {
      persistence = p;
      localStore = new LocalStore(
        persistence,
        User.UNAUTHENTICATED,
        new EagerGarbageCollector()
      );
      return localStore.start();
    });
  });

  afterEach(() => {
    return persistence.shutdown();
  });

  /**
   * Restarts the local store using the NoOpGarbageCollector instead of the
   * default.
   */
  function restartWithNoOpGarbageCollector(): Promise<void> {
    localStore = new LocalStore(
      persistence,
      User.UNAUTHENTICATED,
      new NoOpGarbageCollector()
    );
    return localStore.start();
  }

  function expectLocalStore(): LocalStoreTester {
    return new LocalStoreTester(localStore);
  }

  it('handles SetMutation', () => {
    return expectLocalStore()
      .after(setMutation('foo/bar', { foo: 'bar' }))
      .toReturnChanged(
        doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true }))
      .afterAcknowledgingMutation({ documentVersion: 1 })
      .toReturnChanged(doc('foo/bar', 0, { foo: 'bar' }))
      .toContain(doc('foo/bar', 0, { foo: 'bar' }))
      .finish();
  });

  it('handles SetMutation -> Document', () => {
    return expectLocalStore()
      .after(setMutation('foo/bar', { foo: 'bar' }))
      .toReturnChanged(
        doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true }))
      .after(docUpdateRemoteEvent(doc('foo/bar', 2, { it: 'changed' }), [1]))
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
          .after(setMutation('foo/bar', { foo: 'bar' }))
          .toReturnChanged(
            doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true })
          )
          .toContain(
            doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true })
          )
          // Last seen version is zero, so this ack must be held.
          .afterAcknowledgingMutation({ documentVersion: 1 })
          .toReturnChanged()
          .toContain(
            doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true })
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
            docUpdateRemoteEvent(doc('foo/bar', 2, { it: 'changed' }), [1])
          )
          .toReturnChanged(doc('foo/bar', 2, { it: 'changed' }))
          .toContain(doc('foo/bar', 2, { it: 'changed' }))
          .toNotContain('bar/baz')
          .finish()
      );
    }
  );

  it('handles NoDocument -> SetMutation -> Ack', () => {
    return expectLocalStore()
      .after(docUpdateRemoteEvent(deletedDoc('foo/bar', 2), [1]))
      .toReturnRemoved('foo/bar')
      .toContain(deletedDoc('foo/bar', 2))
      .after(setMutation('foo/bar', { foo: 'bar' }))
      .toReturnChanged(
        doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true }))
      .afterAcknowledgingMutation({ documentVersion: 3 })
      .toReturnChanged(doc('foo/bar', 0, { foo: 'bar' }))
      .toContain(doc('foo/bar', 0, { foo: 'bar' }))
      .finish();
  });

  it('handles SetMutation -> NoDocument', () => {
    return expectLocalStore()
      .after(setMutation('foo/bar', { foo: 'bar' }))
      .toReturnChanged(
        doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true })
      )
      .after(docUpdateRemoteEvent(deletedDoc('foo/bar', 2), [1]))
      .toReturnChanged(
        doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true }))
      .finish();
  });

  it('handles Document -> SetMutation -> Ack ->  Document', () => {
    return expectLocalStore()
      .after(docUpdateRemoteEvent(doc('foo/bar', 2, { it: 'base' }), [1]))
      .toReturnChanged(doc('foo/bar', 2, { it: 'base' }))
      .toContain(doc('foo/bar', 2, { it: 'base' }))
      .after(setMutation('foo/bar', { foo: 'bar' }))
      .toReturnChanged(
        doc('foo/bar', 2, { foo: 'bar' }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 2, { foo: 'bar' }, { hasLocalMutations: true }))
      .afterAcknowledgingMutation({ documentVersion: 3 })
      .toReturnChanged(doc('foo/bar', 2, { foo: 'bar' }))
      .toContain(doc('foo/bar', 2, { foo: 'bar' }))
      .after(docUpdateRemoteEvent(doc('foo/bar', 3, { it: 'changed' }), [1]))
      .toReturnChanged(doc('foo/bar', 3, { it: 'changed' }))
      .toContain(doc('foo/bar', 3, { it: 'changed' }))
      .finish();
  });

  it('handles PatchMutation without prior document', () => {
    return expectLocalStore()
      .after(patchMutation('foo/bar', { foo: 'bar' }))
      .toReturnRemoved('foo/bar')
      .toNotContain('foo/bar')
      .afterAcknowledgingMutation({ documentVersion: 1 })
      .toReturnRemoved('foo/bar')
      .toNotContain('foo/bar')
      .finish();
  });

  it('handles PatchMutation -> Document -> Ack', () => {
    return expectLocalStore()
      .after(patchMutation('foo/bar', { foo: 'bar' }))
      .toReturnRemoved('foo/bar')
      .toNotContain('foo/bar')
      .after(docUpdateRemoteEvent(doc('foo/bar', 1, { it: 'base' }), [1]))
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
      .toReturnChanged(doc('foo/bar', 1, { foo: 'bar', it: 'base' }))
      .toContain(doc('foo/bar', 1, { foo: 'bar', it: 'base' }))
      .finish();
  });

  it('handles PatchMutation -> Ack -> Document', () => {
    return expectLocalStore()
      .after(patchMutation('foo/bar', { foo: 'bar' }))
      .toReturnRemoved('foo/bar')
      .toNotContain('foo/bar')
      .afterAcknowledgingMutation({ documentVersion: 1 })
      .toReturnRemoved('foo/bar')
      .toNotContain('foo/bar')
      .after(docUpdateRemoteEvent(doc('foo/bar', 1, { it: 'base' }), [1]))
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
      .toContain(deletedDoc('foo/bar', 0))
      .finish();
  });

  it('handles Document -> DeleteMutation -> Ack', () => {
    return expectLocalStore()
      .after(docUpdateRemoteEvent(doc('foo/bar', 1, { it: 'base' }), [1]))
      .toReturnChanged(doc('foo/bar', 1, { it: 'base' }))
      .toContain(doc('foo/bar', 1, { it: 'base' }))
      .after(deleteMutation('foo/bar'))
      .toReturnRemoved('foo/bar')
      .toContain(deletedDoc('foo/bar', 0))
      .afterAcknowledgingMutation({ documentVersion: 2 })
      .toReturnRemoved('foo/bar')
      .toContain(deletedDoc('foo/bar', 0))
      .finish();
  });

  it('handles DeleteMutation -> Document -> Ack', () => {
    return expectLocalStore()
      .after(deleteMutation('foo/bar'))
      .toReturnRemoved('foo/bar')
      .toContain(deletedDoc('foo/bar', 0))
      .after(docUpdateRemoteEvent(doc('foo/bar', 1, { it: 'base' }), [1]))
      .toReturnRemoved('foo/bar')
      .toContain(deletedDoc('foo/bar', 0))
      .afterAcknowledgingMutation({ documentVersion: 2 })
      .toReturnRemoved('foo/bar')
      .toContain(deletedDoc('foo/bar', 0))
      .finish();
  });

  it('handles Document -> NoDocument -> Document', () => {
    return expectLocalStore()
      .after(docUpdateRemoteEvent(doc('foo/bar', 1, { it: 'base' }), [1]))
      .toReturnChanged(doc('foo/bar', 1, { it: 'base' }))
      .toContain(doc('foo/bar', 1, { it: 'base' }))
      .after(docUpdateRemoteEvent(deletedDoc('foo/bar', 2), [1]))
      .toReturnRemoved('foo/bar')
      .toContain(deletedDoc('foo/bar', 2))
      .after(docUpdateRemoteEvent(doc('foo/bar', 3, { it: 'changed' }), [1]))
      .toReturnChanged(doc('foo/bar', 3, { it: 'changed' }))
      .toContain(doc('foo/bar', 3, { it: 'changed' }))
      .finish();
  });

  it('handles SetMutation -> PatchMutation -> Document -> Ack -> Ack', () => {
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
      .after(docUpdateRemoteEvent(doc('foo/bar', 1, { it: 'base' }), [1]))
      .toReturnChanged(
        doc('foo/bar', 1, { foo: 'bar' }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 1, { foo: 'bar' }, { hasLocalMutations: true }))
      .afterAcknowledgingMutation({ documentVersion: 2 }) // delete mutation
      .toReturnChanged(
        doc('foo/bar', 1, { foo: 'bar' }, { hasLocalMutations: true })
      )
      .toContain(doc('foo/bar', 1, { foo: 'bar' }, { hasLocalMutations: true }))
      .afterAcknowledgingMutation({ documentVersion: 3 }) // patch mutation
      .toReturnChanged(doc('foo/bar', 1, { foo: 'bar' }))
      .toContain(doc('foo/bar', 1, { foo: 'bar' }))
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
    return expectLocalStore()
      .after(setMutation('foo/bar', { foo: 'old' }))
      .afterAcknowledgingMutation({ documentVersion: 1 })
      .toContain(doc('foo/bar', 0, { foo: 'old' }))
      .after(patchMutation('foo/bar', { foo: 'bar' }))
      .toContain(doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true }))
      .afterRejectingMutation()
      .toReturnChanged(doc('foo/bar', 0, { foo: 'old' }))
      .toContain(doc('foo/bar', 0, { foo: 'old' }))
      .finish();
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
      .toContain(deletedDoc('foo/bar', 0))
      .afterAcknowledgingMutation({ documentVersion: 3 }) // patch mutation
      .toReturnRemoved('foo/bar')
      .toContain(deletedDoc('foo/bar', 0))
      .finish();
  });

  it('collects garbage after ChangeBatch with no target ids', () => {
    return expectLocalStore()
      .after(docUpdateRemoteEvent(deletedDoc('foo/bar', 2), [1]))
      .afterGC()
      .toNotContain('foo/bar')
      .after(docUpdateRemoteEvent(doc('foo/bar', 2, { foo: 'bar' }), [1]))
      .afterGC()
      .toNotContain('foo/bar')
      .finish();
  });

  it('collects garbage after ChangeBatch', () => {
    const query = Query.atPath(path('foo'));
    return expectLocalStore()
      .afterAllocatingQuery(query)
      .toReturnTargetId(2)
      .after(docUpdateRemoteEvent(doc('foo/bar', 2, { foo: 'bar' }), [2]))
      .afterGC()
      .toContain(doc('foo/bar', 2, { foo: 'bar' }))
      .after(docUpdateRemoteEvent(doc('foo/bar', 2, { foo: 'baz' }), [], [2]))
      .afterGC()
      .toNotContain('foo/bar')
      .finish();
  });

  it('collects garbage after acknowledged mutation', () => {
    return expectLocalStore()
      .after(docUpdateRemoteEvent(doc('foo/bar', 0, { foo: 'old' }), [1]))
      .after(patchMutation('foo/bar', { foo: 'bar' }))
      .after(setMutation('foo/bah', { foo: 'bah' }))
      .after(deleteMutation('foo/baz'))
      .afterGC()
      .toContain(doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true }))
      .toContain(doc('foo/bah', 0, { foo: 'bah' }, { hasLocalMutations: true }))
      .toContain(deletedDoc('foo/baz', 0))
      .afterAcknowledgingMutation({ documentVersion: 3 })
      .afterGC()
      .toNotContain('foo/bar')
      .toContain(doc('foo/bah', 0, { foo: 'bah' }, { hasLocalMutations: true }))
      .toContain(deletedDoc('foo/baz', 0))
      .afterAcknowledgingMutation({ documentVersion: 4 })
      .afterGC()
      .toNotContain('foo/bar')
      .toNotContain('foo/bah')
      .toContain(deletedDoc('foo/baz', 0))
      .afterAcknowledgingMutation({ documentVersion: 5 })
      .afterGC()
      .toNotContain('foo/bar')
      .toNotContain('foo/bah')
      .toNotContain('foo/baz')
      .finish();
  });

  it('collects garbage after rejected mutation', () => {
    return expectLocalStore()
      .after(docUpdateRemoteEvent(doc('foo/bar', 0, { foo: 'old' }), [1]))
      .after(patchMutation('foo/bar', { foo: 'bar' }))
      .after(setMutation('foo/bah', { foo: 'bah' }))
      .after(deleteMutation('foo/baz'))
      .afterGC()
      .toContain(doc('foo/bar', 0, { foo: 'bar' }, { hasLocalMutations: true }))
      .toContain(doc('foo/bah', 0, { foo: 'bah' }, { hasLocalMutations: true }))
      .toContain(deletedDoc('foo/baz', 0))
      .afterRejectingMutation() // patch mutation
      .afterGC()
      .toNotContain('foo/bar')
      .toContain(doc('foo/bah', 0, { foo: 'bah' }, { hasLocalMutations: true }))
      .toContain(deletedDoc('foo/baz', 0))
      .afterRejectingMutation() // set mutation
      .afterGC()
      .toNotContain('foo/bar')
      .toNotContain('foo/bah')
      .toContain(deletedDoc('foo/baz', 0))
      .afterRejectingMutation() // delete mutation
      .afterGC()
      .toNotContain('foo/bar')
      .toNotContain('foo/bah')
      .toNotContain('foo/baz')
      .finish();
  });

  it('pins documents in the local view', () => {
    const query = Query.atPath(path('foo'));
    return expectLocalStore()
      .afterAllocatingQuery(query)
      .toReturnTargetId(2)
      .after(docUpdateRemoteEvent(doc('foo/bar', 1, { foo: 'bar' }), [2]))
      .after(setMutation('foo/baz', { foo: 'baz' }))
      .afterGC()
      .toContain(doc('foo/bar', 1, { foo: 'bar' }))
      .toContain(doc('foo/baz', 0, { foo: 'baz' }, { hasLocalMutations: true }))
      .after(localViewChanges(query, { added: ['foo/bar', 'foo/baz'] }))
      .after(docUpdateRemoteEvent(doc('foo/bar', 1, { foo: 'bar' }), [], [2]))
      .after(docUpdateRemoteEvent(doc('foo/baz', 2, { foo: 'baz' }), [1]))
      .afterAcknowledgingMutation({ documentVersion: 2 })
      .afterGC()
      .toContain(doc('foo/bar', 1, { foo: 'bar' }))
      .toContain(doc('foo/baz', 2, { foo: 'baz' }))
      .after(localViewChanges(query, { removed: ['foo/bar', 'foo/baz'] }))
      .afterGC()
      .toNotContain('foo/bar')
      .toNotContain('foo/baz')
      .finish();
  });

  it('throws away documents with unknown target-ids immediately', () => {
    const targetId = 321;
    return expectLocalStore()
      .after(docUpdateRemoteEvent(doc('foo/bar', 1, {}), [targetId]))
      .toContain(doc('foo/bar', 1, {}))
      .afterGC()
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
      docUpdateRemoteEvent(doc('foo/baz', 10, { a: 'b' }), [2], [])
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
    await restartWithNoOpGarbageCollector();
    const query = Query.atPath(path('foo/bar'));
    const queryData = await localStore.allocateQuery(query);
    const targetId = queryData.targetId;
    const resumeToken = 'abc';
    const watchChange = new WatchTargetChange(
      WatchTargetChangeState.Current,
      [targetId],
      resumeToken
    );
    const aggregator = new WatchChangeAggregator(
      version(1000),
      { [targetId]: queryData },
      {}
    );
    aggregator.add(watchChange);
    const remoteEvent = aggregator.createRemoteEvent();
    await localStore.applyRemoteEvent(remoteEvent);

    // Stop listening so that the query should become inactive (but persistent)
    await localStore.releaseQuery(query);

    // Should come back with the same resume token
    const queryData2 = await localStore.allocateQuery(query);
    expect(queryData2.resumeToken).to.deep.equal(resumeToken);
  });

  it('does not replace resume token with empty resume token', async () => {
    await restartWithNoOpGarbageCollector();
    const query = Query.atPath(path('foo/bar'));
    const queryData = await localStore.allocateQuery(query);
    const targetId = queryData.targetId;
    const resumeToken = 'abc';

    const watchChange1 = new WatchTargetChange(
      WatchTargetChangeState.Current,
      [targetId],
      resumeToken
    );
    const aggregator1 = new WatchChangeAggregator(
      version(1000),
      { [targetId]: queryData },
      {}
    );
    aggregator1.add(watchChange1);
    const remoteEvent1 = aggregator1.createRemoteEvent();
    await localStore.applyRemoteEvent(remoteEvent1);

    const watchChange2 = new WatchTargetChange(
      WatchTargetChangeState.Current,
      [targetId],
      emptyByteString()
    );
    const aggregator2 = new WatchChangeAggregator(
      version(2000),
      { [targetId]: queryData },
      {}
    );
    aggregator2.add(watchChange2);
    const remoteEvent2 = aggregator2.createRemoteEvent();
    await localStore.applyRemoteEvent(remoteEvent2);

    // Stop listening so that the query should become inactive (but persistent)
    await localStore.releaseQuery(query);

    // Should come back with the same resume token
    const queryData2 = await localStore.allocateQuery(query);
    expect(queryData2.resumeToken).to.deep.equal(resumeToken);
  });
}
