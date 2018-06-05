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

import { Query } from '../../../src/core/query';
import { Document } from '../../../src/model/document';
import { Code } from '../../../src/util/error';
import { doc, path } from '../../util/helpers';

import { describeSpec, specTest } from './describe_spec';
import { client, spec } from './spec_builder';
import { RpcError } from './spec_rpc_error';

describeSpec('Writes:', [], () => {
  specTest(
    'Two sequential writes to different documents smoke test.',
    [],
    () => {
      const query = Query.atPath(path('collection'));
      const docAv1 = doc('collection/a', 1000, { v: 1 });
      const docBv1 = doc('collection/b', 500, { v: 1 });
      const docAv2Local = doc(
        'collection/a',
        1000,
        { v: 2 },
        { hasLocalMutations: true }
      );
      const docBv2Local = doc(
        'collection/b',
        500,
        { v: 2 },
        { hasLocalMutations: true }
      );
      const docAv2 = doc('collection/a', 2000, { v: 2 });
      const docBv2 = doc('collection/b', 2500, { v: 2 });

      return spec()
        .userListens(query)
        .watchAcksFull(query, 1000, docAv1, docBv1)
        .expectEvents(query, { added: [docAv1, docBv1] })
        .userSets('collection/a', { v: 2 })
        .expectEvents(query, {
          hasPendingWrites: true,
          modified: [docAv2Local]
        })
        .watchSends({ affects: [query] }, docAv2)
        .watchSnapshots(2000)
        .writeAcks('collection/a', 2000)
        .expectEvents(query, {
          metadata: [docAv2]
        })
        .userSets('collection/b', { v: 2 })
        .expectEvents(query, {
          hasPendingWrites: true,
          modified: [docBv2Local]
        })
        .watchSends({ affects: [query] }, docBv2)
        .watchSnapshots(3000)
        .writeAcks('collection/b', 3000)
        .expectEvents(query, {
          metadata: [docBv2]
        });
    }
  );

  specTest(
    'Event is raised for a local set before and after the write ack',
    [],
    () => {
      const query1 = Query.atPath(path('collection/key'));
      const doc1a = doc('collection/key', 1000, { v: 1 });
      const doc1b = doc(
        'collection/key',
        1000,
        { v: 2 },
        { hasLocalMutations: true }
      );
      const doc1c = doc('collection/key', 2000, { v: 2 });
      return spec()
        .userListens(query1)
        .watchAcksFull(query1, 1000, doc1a)
        .expectEvents(query1, {
          added: [doc1a]
        })
        .userSets('collection/key', { v: 2 })
        .expectEvents(query1, {
          hasPendingWrites: true,
          modified: [doc1b]
        })
        .watchSends({ affects: [query1] }, doc1c)
        .watchSnapshots(2000)
        .writeAcks('collection/key', 2000)
        .expectEvents(query1, {
          metadata: [doc1c]
        });
    }
  );

  specTest('Cache will not keep data for an outdated write ack', [], () => {
    // NOTE: Versions chosen to reproduce a bug that previously existed where
    // web incorrectly compared versions via toString().
    const initialVersion = 1000;
    const ackedVersion = 2000;
    const watchVersion = 10000;

    const query1 = Query.atPath(path('collection/key'));
    const doc1a = doc('collection/key', initialVersion, { v: 1 });
    const doc1b = doc(
      'collection/key',
      1000,
      { v: 2 },
      { hasLocalMutations: true }
    );
    const doc1c = doc('collection/key', watchVersion, { v: 3 });

    return spec()
      .userListens(query1)
      .watchAcksFull(query1, initialVersion, doc1a)
      .expectEvents(query1, { added: [doc1a] })
      .userSets('collection/key', { v: 2 })
      .expectEvents(query1, {
        hasPendingWrites: true,
        modified: [doc1b]
      })
      .watchSends({ affects: [query1] }, doc1c)
      .watchSnapshots(watchVersion)
      .writeAcks('collection/key', ackedVersion) // The ack is already outdated by the newer doc1c
      .expectEvents(query1, {
        modified: [doc1c]
      });
  });

  specTest(
    'Cache raises correct event if write is acked before watch delivers it',
    [],
    () => {
      const query = Query.atPath(path('collection/key'));
      const docV1 = doc('collection/key', 1000, { v: 1 });
      const docV2Local = doc(
        'collection/key',
        1000,
        { v: 2 },
        { hasLocalMutations: true }
      );
      const docV2 = doc('collection/key', 2000, { v: 2 });

      return (
        spec()
          .userListens(query)
          .watchAcksFull(query, 1000, docV1)
          .expectEvents(query, { added: [docV1] })
          .userSets('collection/key', { v: 2 })
          .expectEvents(query, {
            hasPendingWrites: true,
            modified: [docV2Local]
          })
          // The ack arrives before the watch snapshot; no events yet
          .writeAcks('collection/key', 2000)
          .watchSends({ affects: [query] }, docV2)
          .watchSnapshots(2000)
          .expectEvents(query, {
            metadata: [docV2]
          })
      );
    }
  );

  specTest('Cache will hold local write until watch catches up', [], () => {
    const query = Query.atPath(path('collection'));
    const docV1 = doc('collection/key', 1000, { v: 1 });
    const docV2 = doc('collection/key', 2000, { v: 2 });
    const docV3Local = doc(
      'collection/key',
      1000,
      { v: 3 },
      { hasLocalMutations: true }
    );
    const docV3 = doc('collection/key', 3000, { v: 3 });
    const docB = doc('collection/b', 3000, { doc: 'b' });
    return (
      spec()
        .userListens(query)
        .watchAcksFull(query, 1000, docV1)
        .expectEvents(query, { added: [docV1] })
        .userSets('collection/key', { v: 3 })
        .expectEvents(query, {
          hasPendingWrites: true,
          modified: [docV3Local]
        })
        // The ack arrives before the watch snapshot; no events yet
        .writeAcks('collection/key', 3000)
        // watch sends some stale data; no events
        .watchSends({ affects: [query] }, docV2)
        .watchSnapshots(2000)
        // watch catches up; should get both the new doc ('b') and the released
        // write ('key')
        .watchSends({ affects: [query] }, docB, docV3)
        .watchSnapshots(3000)
        .expectEvents(query, {
          added: [docB],
          metadata: [docV3]
        })
    );
  });

  specTest('Writes are pipelined', [], () => {
    const query = Query.atPath(path('collection'));
    const docs: Document[] = [];
    const localDocs: Document[] = [];
    const numWrites = 15;
    for (let i = 0; i < numWrites; i++) {
      const d = doc('collection/a' + i, (i + 1) * 1000, { v: 1 });
      const dLocal = doc(
        'collection/a' + i,
        0,
        { v: 1 },
        { hasLocalMutations: true }
      );
      docs.push(d);
      localDocs.push(dLocal);
    }

    const specification = spec()
      .userListens(query)
      .watchAcks(query)
      .watchCurrents(query, 'resume-token');
    for (let i = 0; i < numWrites; i++) {
      specification.userSets('collection/a' + i, { v: 1 }).expectEvents(query, {
        fromCache: true,
        hasPendingWrites: true,
        added: [localDocs[i]]
      });
    }

    // We don't expect all the writes to be sent out immediately.  Some
    // should be queued up locally.  For now it's a constant in datastore.ts,
    // but in the future it should be negotiated with backend through the
    // the stream.
    specification.expectNumOutstandingWrites(10);
    for (let i = 0; i < numWrites; i++) {
      specification
        .writeAcks('collection/a' + i, (i + 1) * 1000)
        .watchSends({ affects: [query] }, docs[i])
        .watchSnapshots((i + 1) * 1000)
        .expectEvents(query, {
          hasPendingWrites: i < numWrites - 1,
          metadata: [docs[i]]
        });
    }
    return specification;
  });

  specTest('Pipelined writes can fail', [], () => {
    const query = Query.atPath(path('collection'));
    const docs: Document[] = [];
    // Chose a number that is higher than the number of pipelined writes
    const numWrites = 15;
    for (let i = 0; i < numWrites; i++) {
      docs.push(
        doc('collection/a' + i, 0, { v: 1 }, { hasLocalMutations: true })
      );
    }

    // Only listen, no watch events because all writes are local
    const specification = spec().userListens(query);
    for (let i = 0; i < numWrites; i++) {
      specification.userSets('collection/a' + i, { v: 1 }).expectEvents(query, {
        fromCache: true,
        hasPendingWrites: true,
        added: [docs[i]]
      });
    }

    // We don't expect all the writes to be sent out immediately.  Some
    // should be queued up locally.  For now it's a constant in datastore.ts,
    // but in the future it should be negotiated with backend through the
    // the stream.
    specification.expectNumOutstandingWrites(10);
    for (let i = 0; i < numWrites; i++) {
      specification
        .failWrite(
          'collection/a' + i,
          new RpcError(Code.PERMISSION_DENIED, 'permission denied')
        )
        .expectEvents(query, {
          fromCache: true,
          hasPendingWrites: i < numWrites - 1,
          removed: [docs[i]]
        });
    }

    // Write queue is now empty
    specification.expectNumOutstandingWrites(0);

    return specification;
  });

  specTest('Failed writes are released immediately.', [], () => {
    const query = Query.atPath(path('collection'));
    const docAv1 = doc('collection/a', 1000, { v: 1 });
    const docAv2Local = doc(
      'collection/a',
      1000,
      { v: 2 },
      { hasLocalMutations: true }
    );

    const docBLocal = doc(
      'collection/b',
      0,
      { v: 1 },
      { hasLocalMutations: true }
    );
    const docB = doc('collection/b', 2000, { v: 1 });

    return (
      spec()
        .userListens(query)
        .watchAcksFull(query, 1000, docAv1)
        .expectEvents(query, { added: [docAv1] })
        .userSets('collection/b', { v: 1 })
        .expectEvents(query, { hasPendingWrites: true, added: [docBLocal] })
        // ack write but no watch snapshot so it'll be held.
        .writeAcks('collection/b', 2000)
        .userSets('collection/a', { v: 2 })
        .expectEvents(query, {
          hasPendingWrites: true,
          modified: [docAv2Local]
        })
        // reject write, should be released immediately.
        .failWrite(
          'collection/a',
          new RpcError(Code.PERMISSION_DENIED, 'failure')
        )
        .expectEvents(query, { hasPendingWrites: true, modified: [docAv1] })
        // watch updates, B should be visible
        .watchSends({ affects: [query] }, docB)
        .watchSnapshots(2000)
        .expectEvents(query, { metadata: [docB] })
    );
  });

  specTest('Held writes are not re-sent.', [], () => {
    const query = Query.atPath(path('collection'));
    const docALocal = doc(
      'collection/a',
      0,
      { v: 1 },
      { hasLocalMutations: true }
    );
    const docA = doc('collection/a', 1000, { v: 1 });

    const docBLocal = doc(
      'collection/b',
      0,
      { v: 1 },
      { hasLocalMutations: true }
    );
    const docB = doc('collection/b', 2000, { v: 1 });

    return (
      spec()
        .userListens(query)
        .watchAcksFull(query, 500)
        .expectEvents(query, {})
        .userSets('collection/a', { v: 1 })
        .expectEvents(query, {
          hasPendingWrites: true,
          added: [docALocal]
        })
        // ack write but without a watch event.
        .writeAcks('collection/a', 1000)
        // Do another write.
        .userSets('collection/b', { v: 1 })
        .expectEvents(query, {
          hasPendingWrites: true,
          added: [docBLocal]
        })
        // ack second write
        .writeAcks('collection/b', 2000)
        // Finally watcher catches up.
        .watchSends({ affects: [query] }, docA, docB)
        .watchSnapshots(2000)
        .expectEvents(query, {
          metadata: [docA, docB]
        })
    );
  });

  specTest(
    'Held writes are not re-sent after disable/enable network.',
    [],
    () => {
      const query = Query.atPath(path('collection'));
      const docALocal = doc(
        'collection/a',
        0,
        { v: 1 },
        { hasLocalMutations: true }
      );
      const docA = doc('collection/a', 1000, { v: 1 });

      return (
        spec()
          .userListens(query)
          .watchAcksFull(query, 500)
          .expectEvents(query, {})
          .userSets('collection/a', { v: 1 })
          .expectEvents(query, {
            hasPendingWrites: true,
            added: [docALocal]
          })
          // ack write but without a watch event.
          .writeAcks('collection/a', 1000)

          // handshake + write = 2 requests
          .expectWriteStreamRequestCount(2)

          .disableNetwork()
          .expectEvents(query, {
            hasPendingWrites: true,
            fromCache: true
          })

          // handshake + write + close = 3 requests
          .expectWriteStreamRequestCount(3)

          .enableNetwork()
          .expectActiveTargets({ query, resumeToken: 'resume-token-500' })

          // acked write should /not/ have been resent, so count should still be 3
          .expectWriteStreamRequestCount(3)

          // Finally watch catches up.
          .watchAcksFull(query, 2000, docA)
          .expectEvents(query, {
            metadata: [docA]
          })
      );
    }
  );

  specTest(
    'Held writes are released when there are no queries left.',
    [],
    () => {
      const query = Query.atPath(path('collection'));
      const docALocal = doc(
        'collection/a',
        0,
        { v: 1 },
        { hasLocalMutations: true }
      );

      return (
        spec()
          .userListens(query)
          .watchAcksFull(query, 500)
          .expectEvents(query, {})
          .userSets('collection/a', { v: 1 })
          .expectEvents(query, {
            hasPendingWrites: true,
            added: [docALocal]
          })
          // ack write but without a watch event.
          .writeAcks('collection/a', 1000)
          // Unlisten before the write is released.
          .userUnlistens(query)
          // Re-add listen and make sure we don't get any events.
          .userListens(query)
      );
    }
  );

  for (const code of [
    Code.INVALID_ARGUMENT,
    Code.NOT_FOUND,
    Code.ALREADY_EXISTS,
    Code.PERMISSION_DENIED,
    Code.FAILED_PRECONDITION,
    Code.ABORTED,
    Code.OUT_OF_RANGE,
    Code.UNIMPLEMENTED,
    Code.DATA_LOSS
  ]) {
    specTest('Writes that fail with code ' + code + ' are rejected', [], () => {
      const query1 = Query.atPath(path('collection/key'));

      const doc1a = doc(
        'collection/key',
        0,
        { foo: 'bar' },
        { hasLocalMutations: true }
      );
      return spec()
        .userListens(query1)
        .userSets('collection/key', { foo: 'bar' })
        .expectEvents(query1, {
          fromCache: true,
          hasPendingWrites: true,
          added: [doc1a]
        })
        .failWrite('collection/key', new RpcError(code, 'failure'))
        .expectEvents(query1, {
          fromCache: true,
          removed: [doc1a]
        });
    });
  }

  // NOTE: RESOURCE_EXHAUSTED should not be rejected, but we also can't
  // rely on it being retried immediately because we will delay the retry
  // significantly.
  specTest(
    'Writes that fail with code resource_exhausted are not rejected',
    [],
    () => {
      const query1 = Query.atPath(path('collection/key'));
      const doc1a = doc(
        'collection/key',
        0,
        { foo: 'bar' },
        { hasLocalMutations: true }
      );

      return spec()
        .userListens(query1)
        .userSets('collection/key', { foo: 'bar' })
        .expectEvents(query1, {
          fromCache: true,
          hasPendingWrites: true,
          added: [doc1a]
        })
        .failWrite(
          'collection/key',
          new RpcError(Code.RESOURCE_EXHAUSTED, 'transient error'),
          {
            expectUserCallback: false
          }
        );
    }
  );

  for (const code of [
    Code.CANCELLED,
    Code.UNKNOWN,
    Code.DEADLINE_EXCEEDED,
    Code.INTERNAL,
    Code.UNAVAILABLE,
    Code.UNAUTHENTICATED
  ]) {
    specTest('Writes that fail with code ' + code + ' are retried', [], () => {
      const query1 = Query.atPath(path('collection/key'));
      const doc1a = doc(
        'collection/key',
        0,
        { foo: 'bar' },
        { hasLocalMutations: true }
      );
      const doc1b = doc('collection/key', 0, { foo: 'bar' });

      return spec()
        .userListens(query1)
        .userSets('collection/key', { foo: 'bar' })
        .expectEvents(query1, {
          fromCache: true,
          hasPendingWrites: true,
          added: [doc1a]
        })
        .failWrite('collection/key', new RpcError(code, 'transient error'), {
          expectUserCallback: false
        })
        .writeAcks('collection/key', 1000)
        .watchAcks(query1)
        .watchSends({ affects: [query1] }, doc1b)
        .watchCurrents(query1, 'resume-token-1000')
        .watchSnapshots(1000)
        .expectEvents(query1, {
          metadata: [doc1b]
        });
    });
  }

  specTest(
    'Ensure correct events after patching a doc (including a delete) and' +
      ' getting watcher events.',
    [],
    () => {
      const query = Query.atPath(path('collection/doc'));
      const docV1 = doc('collection/doc', 1000, { v: 1, a: { b: 2 } });
      const docV2Local = doc(
        'collection/doc',
        1000,
        { v: 2, a: { b: 2 } },
        { hasLocalMutations: true }
      );
      const docV2 = doc('collection/doc', 2000, { v: 2, a: { b: 2 } });

      return (
        spec()
          .userListens(query)
          .watchAcksFull(query, 500, docV1)
          .expectEvents(query, { added: [docV1] })
          // <DELETE> is the sentinel for FieldValue.delete().
          .userPatches('collection/doc', { v: 2, 'a.c': '<DELETE>' })
          .expectEvents(query, {
            hasPendingWrites: true,
            modified: [docV2Local]
          })
          .watchSends({ affects: [query] }, docV2)
          .watchSnapshots(2000)
          .writeAcks('collection/doc', 2000)
          .expectEvents(query, { metadata: [docV2] })
      );
    }
  );

  specTest('Writes are resent after network disconnect', [], () => {
    const expectRequestCount = requestCounts =>
      requestCounts.handshakes + requestCounts.writes + requestCounts.closes;

    return spec()
      .userSets('collection/key', { foo: 'bar' })
      .expectNumOutstandingWrites(1)
      .disableNetwork()
      .expectWriteStreamRequestCount(
        expectRequestCount({ handshakes: 1, writes: 1, closes: 1 })
      )
      .enableNetwork()
      .expectWriteStreamRequestCount(
        expectRequestCount({ handshakes: 2, writes: 2, closes: 1 })
      )
      .expectNumOutstandingWrites(1)
      .writeAcks('collection/key', 1, { expectUserCallback: false })
      .expectNumOutstandingWrites(0);
  });

  specTest(
    'Pending writes are shared between clients',
    ['multi-client'],
    () => {
      const query = Query.atPath(path('collection'));
      const docV1 = doc(
        'collection/a',
        0,
        { v: 1 },
        { hasLocalMutations: true }
      );
      const docV2 = doc(
        'collection/a',
        0,
        { v: 2 },
        { hasLocalMutations: true }
      );
      const docV3 = doc(
        'collection/a',
        0,
        { v: 3 },
        { hasLocalMutations: true }
      );

      return client(0)
        .userListens(query)
        .watchAcksFull(query, 500)
        .expectEvents(query, {})
        .userSets('collection/a', { v: 1 })
        .expectEvents(query, {
          hasPendingWrites: true,
          added: [docV1]
        })
        .client(1)
        .userListens(query)
        .expectEvents(query, {
          hasPendingWrites: true,
          // TODO(multitab): `fromCache` should reflect the primary client's
          // networking state (and be false).
          fromCache: true,
          added: [docV1]
        })
        .client(0)
        .userSets('collection/a', { v: 2 })
        .expectEvents(query, {
          hasPendingWrites: true,
          modified: [docV2]
        })
        .client(1)
        .expectEvents(query, {
          hasPendingWrites: true,
          fromCache: true,
          modified: [docV2]
        })
        .userSets('collection/a', { v: 3 })
        .expectEvents(query, {
          hasPendingWrites: true,
          fromCache: true,
          modified: [docV3]
        })
        .client(0)
        .expectEvents(query, {
          hasPendingWrites: true,
          modified: [docV3]
        });
    }
  );

  specTest('Write is acknowledged by primary client', ['multi-client'], () => {
    const query = Query.atPath(path('collection'));
    const localDoc = doc(
      'collection/a',
      0,
      { v: 1 },
      { hasLocalMutations: true }
    );
    const remoteDoc = doc('collection/a', 1000, { v: 1 });

    // TODO(multitab): Once query specs are shared between clients,
    // client 0 no longer needs to manually initialize the query
    return client(0)
      .userListens(query)
      .watchAcksFull(query, 500)
      .expectEvents(query, {})
      .client(1)
      .userListens(query)
      .expectEvents(query, {
        fromCache: true
      })
      .userSets('collection/a', { v: 1 })
      .expectEvents(query, {
        hasPendingWrites: true,
        fromCache: true,
        added: [localDoc]
      })
      .client(0)
      .expectEvents(query, {
        hasPendingWrites: true,
        added: [localDoc]
      })
      .writeAcks('collection/a', 1000, { expectUserCallback: false })
      .watchSends({ affects: [query] }, remoteDoc)
      .watchSnapshots(1000)
      .expectEvents(query, {
        metadata: [remoteDoc]
      })
      .client(1)
      .expectUserCallbacks({
        acknowledged: ['collection/a']
      });
    // TODO(b/33446471): This event doesn't fire since we are holding the write
    // acknowledgment.
    // .expectEvents(query, {
    //   fromCache: true,
    //   metadata: [remoteDoc]
    // });
  });

  specTest('Write is rejected by primary client', ['multi-client'], () => {
    const query = Query.atPath(path('collection'));
    const localDoc = doc(
      'collection/a',
      0,
      { v: 1 },
      { hasLocalMutations: true }
    );

    return client(0)
      .userListens(query)
      .watchAcksFull(query, 500)
      .expectEvents(query, {})
      .client(1)
      .userListens(query)
      .expectEvents(query, {
        fromCache: true
      })
      .userSets('collection/a', { v: 1 })
      .expectEvents(query, {
        hasPendingWrites: true,
        fromCache: true,
        added: [localDoc]
      })
      .client(0)
      .expectEvents(query, {
        hasPendingWrites: true,
        added: [localDoc]
      })
      .failWrite(
        'collection/a',
        new RpcError(Code.FAILED_PRECONDITION, 'failure'),
        {
          expectUserCallback: false
        }
      )
      .expectEvents(query, {
        removed: [localDoc]
      })
      .client(1)
      .expectUserCallbacks({
        rejected: ['collection/a']
      })
      .expectEvents(query, {
        fromCache: true,
        removed: [localDoc]
      });
  });
});
