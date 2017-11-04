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
import { SnapshotVersion } from '../../../src/core/snapshot_version';
import { MutationResult } from '../../../src/model/mutation';
import {
  PersistentListenStream,
  PersistentWriteStream,
  WatchStreamListener,
  WriteStreamListener
} from '../../../src/remote/persistent_stream';
import {
  DocumentWatchChange,
  ExistenceFilterChange,
  WatchTargetChange
} from '../../../src/remote/watch_change';
import { AsyncQueue } from '../../../src/util/async_queue';
import { Deferred } from '../../../src/util/promise';
import { Datastore } from '../../../src/remote/datastore';
import { asyncIt, setMutation } from '../../util/helpers';
import { drainAsyncQueue, withTestDatastore } from '../util/helpers';

/**
 * StreamEventType combines the events that can be observed by the
 * WatchStreamListener and WriteStreamListener.
 */
type StreamEventType =
  | 'handshakeComplete'
  | 'mutationResult'
  | 'watchChange'
  | 'open'
  | 'close';

const SINGLE_MUTATION = [setMutation('docs/1', { foo: 'bar' })];

class StreamStatusListener implements WatchStreamListener, WriteStreamListener {
  private pendingCallbacks: StreamEventType[] = [];
  private pendingPromises: Deferred<StreamEventType>[] = [];

  /**
   * Returns a Promise that resolves when the next callback fires. Resolves the
   * returned Promise immediately if there is already an unprocessed callback.
   *
   * This method asserts that the observed callback type matches
   * `expectedCallback`.
   */
  awaitCallback(expectedCallback: StreamEventType): Promise<void> {
    let promise: Promise<StreamEventType>;

    if (this.pendingCallbacks.length > 0) {
      let pendingCallback = this.pendingCallbacks.shift();
      promise = Promise.resolve(pendingCallback);
    } else {
      const deferred = new Deferred<StreamEventType>();
      this.pendingPromises.push(deferred);
      promise = deferred.promise;
    }

    return promise.then(actualCallback => {
      expect(actualCallback).to.equal(expectedCallback);
    });
  }

  /**
   * Verifies that we did not encounter any unexpected callbacks.
   */
  verifyNoPendingCallbacks(): void {
    expect(this.pendingCallbacks).to.be.empty;
  }

  onHandshakeComplete(): Promise<void> {
    return this.resolvePending('handshakeComplete');
  }

  onMutationResult(
    commitVersion: SnapshotVersion,
    results: MutationResult[]
  ): Promise<void> {
    return this.resolvePending('mutationResult');
  }

  onWatchChange(
    watchChange:
      | DocumentWatchChange
      | WatchTargetChange
      | ExistenceFilterChange,
    snapshot: SnapshotVersion
  ): Promise<void> {
    return this.resolvePending('watchChange');
  }

  onOpen(): Promise<void> {
    return this.resolvePending('open');
  }

  onClose(err?: firestore.FirestoreError): Promise<void> {
    return this.resolvePending('close');
  }

  private resolvePending(actualCallback: StreamEventType): Promise<void> {
    if (this.pendingPromises.length > 0) {
      let pendingPromise = this.pendingPromises.shift();
      pendingPromise.resolve(actualCallback);
    } else {
      this.pendingCallbacks.push(actualCallback);
    }
    return Promise.resolve();
  }
}

describe('Watch Stream', () => {
  let streamListener: StreamStatusListener;

  beforeEach(() => {
    streamListener = new StreamStatusListener();
  });

  afterEach(() => {
    streamListener.verifyNoPendingCallbacks();
  });

  /**
   * Verifies that the watch stream does not issue an onClose callback after a
   * call to stop().
   */
  asyncIt('can be stopped before handshake', () => {
    let watchStream: PersistentListenStream;

    return withTestDatastore(ds => {
      watchStream = ds.newPersistentWatchStream();
      watchStream.start(streamListener);

      return streamListener.awaitCallback('open').then(() => {
        // Stop must not call onClose because the full implementation of the callback could
        // attempt to restart the stream in the event it had pending watches.
        watchStream.stop();
      });
    });
  });
});

describe('Write Stream', () => {
  let queue: AsyncQueue;
  let streamListener: StreamStatusListener;

  beforeEach(() => {
    queue = new AsyncQueue();
    streamListener = new StreamStatusListener();
  });

  afterEach(() => {
    streamListener.verifyNoPendingCallbacks();
  });

  /**
   * Verifies that the write stream does not issue an onClose callback after a
   * call to stop().
   */
  asyncIt('can be stopped before handshake', () => {
    let writeStream: PersistentWriteStream;

    return withTestDatastore(ds => {
      writeStream = ds.newPersistentWriteStream();
      writeStream.start(streamListener);
      return streamListener.awaitCallback('open');
    }).then(() => {
      // Don't start the handshake.

      // Stop must not call onClose because the full implementation of the callback could
      // attempt to restart the stream in the event it had pending writes.
      writeStream.stop();
    });
  });

  asyncIt('can be stopped after handshake', () => {
    let writeStream: PersistentWriteStream;

    return withTestDatastore(ds => {
      writeStream = ds.newPersistentWriteStream();
      writeStream.start(streamListener);
      return streamListener.awaitCallback('open');
    })
      .then(() => {
        // Writing before the handshake should throw
        expect(() => writeStream.writeMutations(SINGLE_MUTATION)).to.throw(
          'Handshake must be complete before writing mutations'
        );
        writeStream.writeHandshake();
        return streamListener.awaitCallback('handshakeComplete');
      })
      .then(() => {
        // Now writes should succeed
        writeStream.writeMutations(SINGLE_MUTATION);
        return streamListener.awaitCallback('mutationResult');
      })
      .then(() => {
        writeStream.stop();
      });
  });

  asyncIt('closes when idle', () => {
    let queue = new AsyncQueue();

    return withTestDatastore(ds => {
      let writeStream = ds.newPersistentWriteStream();
      writeStream.start(streamListener);
      return streamListener
        .awaitCallback('open')
        .then(() => {
          writeStream.writeHandshake();
          return streamListener.awaitCallback('handshakeComplete');
        })
        .then(() => {
          writeStream.markIdle();
          expect(queue.delayedOperationsCount).to.be.equal(1);
          return Promise.all([
            streamListener.awaitCallback('close'),
            queue.drain(/*executeDelayedTasks=*/ true)
          ]);
        })
        .then(() => {
          expect(writeStream.isOpen()).to.be.false;
        });
    }, queue);
  });

  asyncIt('cancels idle on write', () => {
    let queue = new AsyncQueue();

    return withTestDatastore(ds => {
      let writeStream = ds.newPersistentWriteStream();
      writeStream.start(streamListener);
      return streamListener
        .awaitCallback('open')
        .then(() => {
          writeStream.writeHandshake();
          return streamListener.awaitCallback('handshakeComplete');
        })
        .then(() => {
          // Mark the stream idle, but immediately cancel the idle timer by issuing another write.
          writeStream.markIdle();
          expect(queue.delayedOperationsCount).to.be.equal(1);
          writeStream.writeMutations(SINGLE_MUTATION);
          return streamListener.awaitCallback('mutationResult');
        })
        .then(() => queue.drain(/*executeDelayedTasks=*/ true))
        .then(() => {
          expect(writeStream.isOpen()).to.be.true;
        });
    }, queue);
  });
});
