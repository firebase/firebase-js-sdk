/**
 * @license
 * Copyright 2017 Google LLC
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

import { EmptyCredentialsProvider, Token } from '../../../src/api/credentials';
import { SnapshotVersion } from '../../../src/core/snapshot_version';
import { MutationResult } from '../../../src/model/mutation';
import {
  newPersistentWatchStream,
  newPersistentWriteStream
} from '../../../src/remote/datastore';
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
import { AsyncQueue, TimerId } from '../../../src/util/async_queue';
import { Code, FirestoreError } from '../../../src/util/error';
import { Deferred } from '../../../src/util/promise';
import { setMutation } from '../../util/helpers';
import { withTestDatastore } from '../util/internal_helpers';

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
  private pendingPromises: Array<Deferred<StreamEventType>> = [];

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
      const pendingCallback = this.pendingCallbacks.shift()!;
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

  onClose(err?: FirestoreError): Promise<void> {
    return this.resolvePending('close');
  }

  private async resolvePending(actualCallback: StreamEventType): Promise<void> {
    if (this.pendingPromises.length > 0) {
      const pendingPromise = this.pendingPromises.shift()!;
      pendingPromise.resolve(actualCallback);
    } else {
      this.pendingCallbacks.push(actualCallback);
    }
  }
}

describe('Watch Stream', () => {
  /**
   * Verifies that the watch stream issues an onClose callback after a
   * call to stop().
   */
  it('can be stopped before handshake', () => {
    return withTestWatchStream((watchStream, streamListener) => {
      return streamListener.awaitCallback('open').then(async () => {
        await watchStream.stop();
        await streamListener.awaitCallback('close');
      });
    });
  });
});

class MockCredentialsProvider extends EmptyCredentialsProvider {
  private states: string[] = [];

  get observedStates(): string[] {
    return this.states;
  }

  getToken(): Promise<Token | null> {
    this.states.push('getToken');
    return super.getToken();
  }

  invalidateToken(): void {
    this.states.push('invalidateToken');
    super.invalidateToken();
  }
}

describe('Write Stream', () => {
  /**
   * Verifies that the write stream issues an onClose callback after a call to
   * stop().
   */
  it('can be stopped before handshake', () => {
    return withTestWriteStream(async (writeStream, streamListener) => {
      await streamListener.awaitCallback('open');
      await writeStream.stop();
      await streamListener.awaitCallback('close');
    });
  });

  it('can be stopped after handshake', () => {
    return withTestWriteStream(async (writeStream, streamListener) => {
      await streamListener.awaitCallback('open');

      // Writing before the handshake should throw
      expect(() => writeStream.writeMutations(SINGLE_MUTATION)).to.throw(
        'Handshake must be complete before writing mutations'
      );
      writeStream.writeHandshake();
      await streamListener.awaitCallback('handshakeComplete');

      // Now writes should succeed
      writeStream.writeMutations(SINGLE_MUTATION);
      await streamListener.awaitCallback('mutationResult');
      await writeStream.stop();

      await streamListener.awaitCallback('close');
    });
  });

  it('closes when idle', () => {
    return withTestWriteStream((writeStream, streamListener, queue) => {
      return streamListener
        .awaitCallback('open')
        .then(() => {
          writeStream.writeHandshake();
          return streamListener.awaitCallback('handshakeComplete');
        })
        .then(() => {
          writeStream.markIdle();
          expect(queue.containsDelayedOperation(TimerId.WriteStreamIdle)).to.be
            .true;
          return Promise.all([
            queue.runAllDelayedOperationsUntil(TimerId.WriteStreamIdle),
            streamListener.awaitCallback('close')
          ]);
        })
        .then(() => {
          expect(writeStream.isOpen()).to.be.false;
        });
    });
  });

  it('cancels idle on write', () => {
    return withTestWriteStream(async (writeStream, streamListener, queue) => {
      await streamListener.awaitCallback('open');
      writeStream.writeHandshake();
      await streamListener.awaitCallback('handshakeComplete');

      // Mark the stream idle, but immediately cancel the idle timer by issuing another write.
      writeStream.markIdle();
      expect(queue.containsDelayedOperation(TimerId.WriteStreamIdle)).to.be
        .true;
      writeStream.writeMutations(SINGLE_MUTATION);
      await streamListener.awaitCallback('mutationResult');

      await queue.runAllDelayedOperationsUntil(TimerId.All);
      expect(writeStream.isOpen()).to.be.true;
    });
  });

  it('force refreshes auth token on receiving unauthenticated error', () => {
    const credentials = new MockCredentialsProvider();

    return withTestWriteStream(async (writeStream, streamListener) => {
      await streamListener.awaitCallback('open');

      // Simulate callback from GRPC with an unauthenticated error -- this should invalidate
      // the token.
      await writeStream.handleStreamClose(
        new FirestoreError(Code.UNAUTHENTICATED, '')
      );
      await streamListener.awaitCallback('close');

      writeStream.start();
      await streamListener.awaitCallback('open');

      // Simulate a different error -- token should not be invalidated this time.
      await writeStream.handleStreamClose(
        new FirestoreError(Code.UNAVAILABLE, '')
      );

      await streamListener.awaitCallback('close');

      writeStream.start();
      await streamListener.awaitCallback('open');
      expect(credentials.observedStates).to.deep.equal([
        'getToken',
        'invalidateToken',
        'getToken',
        'getToken'
      ]);
    }, credentials);
  });
});

export async function withTestWriteStream(
  fn: (
    writeStream: PersistentWriteStream,
    streamListener: StreamStatusListener,
    queue: AsyncQueue
  ) => Promise<void>,
  credentialsProvider = new EmptyCredentialsProvider()
): Promise<void> {
  await withTestDatastore(async datastore => {
    const queue = new AsyncQueue();
    const streamListener = new StreamStatusListener();
    const writeStream = newPersistentWriteStream(
      datastore,
      queue,
      streamListener
    );
    await writeStream.start();
    await fn(writeStream, streamListener, queue);
    streamListener.verifyNoPendingCallbacks();
  }, credentialsProvider);
}

export async function withTestWatchStream(
  fn: (
    watchStream: PersistentListenStream,
    streamListener: StreamStatusListener
  ) => Promise<void>
): Promise<void> {
  await withTestDatastore(async datastore => {
    const queue = new AsyncQueue();
    const streamListener = new StreamStatusListener();
    const watchStream = newPersistentWatchStream(
      datastore,
      queue,
      streamListener
    );
    await watchStream.start();
    await fn(watchStream, streamListener);
    streamListener.verifyNoPendingCallbacks();
  });
}
