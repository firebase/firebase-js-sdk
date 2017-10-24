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
import { EmptyCredentialsProvider } from '../../../src/api/credentials';
import { SnapshotVersion } from '../../../src/core/snapshot_version';
import { MutationResult } from '../../../src/model/mutation';
import { PlatformSupport } from '../../../src/platform/platform';
import { Datastore } from '../../../src/remote/datastore';
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
import { asyncIt } from '../../util/helpers';
import { getDefaultDatabaseInfo } from '../util/helpers';
import FirestoreError = firestore.FirestoreError;

type StreamStatusCallback =
  | 'onHandshakeComplete'
  | 'onMutationResult'
  | 'onWatchChange'
  | 'onOpen'
  | 'onClose';

class StreamStatusListener implements WatchStreamListener, WriteStreamListener {
  private pendingStates: StreamStatusCallback[] = [];
  private pendingPromises: Deferred<StreamStatusCallback>[] = [];

  private resolvePending(actualCallback: StreamStatusCallback) {
    let pendingPromise = this.pendingPromises.shift();
    if (pendingPromise) {
      pendingPromise.resolve(actualCallback);
    } else {
      this.pendingStates.push(actualCallback);
    }
    return Promise.resolve();
  }

  onHandshakeComplete(): Promise<void> {
    return this.resolvePending('onHandshakeComplete');
  }

  onMutationResult(
    commitVersion: SnapshotVersion,
    results: MutationResult[]
  ): Promise<void> {
    return this.resolvePending('onMutationResult');
  }

  onWatchChange(
    watchChange:
      | DocumentWatchChange
      | WatchTargetChange
      | ExistenceFilterChange,
    snapshot: SnapshotVersion
  ): Promise<void> {
    return this.resolvePending('onWatchChange');
  }

  onOpen(): Promise<void> {
    return this.resolvePending('onOpen');
  }

  onClose(err?: FirestoreError): Promise<void> {
    return this.resolvePending('onClose');
  }

  /**
   * Returns a Promise that resolves when the 'expectedCallback' fires.
   * Resolves the returned Promise immediately if there is already an
   * unprocessed callback.
   * Fails the test if the expected callback does not match the name of the
   * actual callback function.
   */
  awaitCallback(expectedCallback: StreamStatusCallback): Promise<void> {
    if (this.pendingStates.length > 0) {
      expect(this.pendingStates.shift()).to.eq(expectedCallback);
      return Promise.resolve();
    } else {
      const deferred = new Deferred<StreamStatusCallback>();
      this.pendingPromises.push(deferred);
      return deferred.promise.then(actualCallback => {
        expect(actualCallback).to.equal(expectedCallback);
      });
    }
  }

  verifyNoPendingCallbacks(): void {
    expect(this.pendingStates).to.be.empty;
  }
}

describe('Watch Stream', () => {
  let queue: AsyncQueue;
  let streamListener: StreamStatusListener;

  beforeEach(() => {
    queue = new AsyncQueue();
    streamListener = new StreamStatusListener();
  });

  afterEach(() => {
    streamListener.verifyNoPendingCallbacks();
  });

  function initializeWatchStream(): Promise<PersistentListenStream> {
    const databaseInfo = getDefaultDatabaseInfo();

    return PlatformSupport.getPlatform()
      .loadConnection(databaseInfo)
      .then(conn => {
        const serializer = PlatformSupport.getPlatform().newSerializer(
          databaseInfo.databaseId
        );
        return new Datastore(
          databaseInfo,
          queue,
          conn,
          new EmptyCredentialsProvider(),
          serializer
        );
      })
      .then(ds => {
        return ds.newPersistentWatchStream(streamListener);
      });
  }

  asyncIt('can be stopped before handshake', () => {
    let watchStream: PersistentListenStream;

    return initializeWatchStream()
      .then(ws => {
        watchStream = ws;
        watchStream.start();
        return streamListener.awaitCallback('onOpen');
      })
      .then(() => {
        watchStream.stop();
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

  function initializeWriteStream(): Promise<PersistentWriteStream> {
    const databaseInfo = getDefaultDatabaseInfo();

    return PlatformSupport.getPlatform()
      .loadConnection(databaseInfo)
      .then(conn => {
        const serializer = PlatformSupport.getPlatform().newSerializer(
          databaseInfo.databaseId
        );
        return new Datastore(
          databaseInfo,
          queue,
          conn,
          new EmptyCredentialsProvider(),
          serializer
        );
      })
      .then(ds => {
        return ds.newPersistentWriteStream(streamListener);
      });
  }

  asyncIt('can be stopped before handshake', () => {
    let writeStream: PersistentWriteStream;

    return initializeWriteStream()
      .then(ws => {
        writeStream = ws;
        writeStream.start();
        return streamListener.awaitCallback('onOpen');
      })
      .then(() => {
        writeStream.stop();
      });
  });

  asyncIt('can be stopped after handshake', () => {
    let writeStream: PersistentWriteStream;

    return initializeWriteStream()
      .then(ws => {
        writeStream = ws;
        writeStream.start();
        return streamListener.awaitCallback('onOpen');
      })
      .then(() => {
        writeStream.writeHandshake();
        return streamListener.awaitCallback('onHandshakeComplete');
      })
      .then(() => {
        writeStream.stop();
      });
  });
});
