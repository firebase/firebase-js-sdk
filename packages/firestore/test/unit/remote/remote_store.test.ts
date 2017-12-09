import { expect } from 'chai';
import { AsyncQueue } from '../../../src/util/async_queue';
import { Connection, Stream } from '../../../src/remote/connection';
import { LocalStore } from '../../../src/local/local_store';

import * as persistenceHelpers from '../local/persistence_test_helpers';
import { User } from '../../../src/auth/user';
import { NoOpGarbageCollector } from '../../../src/local/no_op_garbage_collector';
import { RemoteStore } from '../../../src/remote/remote_store';
import { Datastore } from '../../../src/remote/datastore';
import { EmptyCredentialsProvider } from '../../../src/api/credentials';
import { DatabaseId, DatabaseInfo } from '../../../src/core/database_info';
import { JsonProtoSerializer } from '../../../src/remote/serializer';
import { OnlineState } from '../../../src/core/types';

class MockConnection implements Connection {
  invokeRPC(rpcName: string, request: any): Promise<any> {
    throw new Error('Not implemented!');
  }

  invokeStreamingRPC(rpcName: string, request: any): Promise<any[]> {
    throw new Error('Not implemented!');
  }

  openStream(rpcName: string): Stream<any, any> {
    throw new Error('Not implemented!');
  }
}

describe('RemoteStore', () => {
  it('handles repeated network enabling and disabling', async () => {
    const persistence = await persistenceHelpers.testMemoryPersistence();
    const localStore = new LocalStore(
      persistence,
      User.UNAUTHENTICATED,
      new NoOpGarbageCollector()
    );

    const queue = new AsyncQueue();
    const connection = new MockConnection();
    const databaseInfo = new DatabaseInfo(
      new DatabaseId('project'),
      'persistenceKey',
      'host',
      false
    );
    const serializer = new JsonProtoSerializer(databaseInfo.databaseId, {
      useProto3Json: true
    });
    const initialBackoffDelay = 1;
    const datastore = new Datastore(
      databaseInfo,
      queue,
      connection,
      new EmptyCredentialsProvider(),
      serializer,
      initialBackoffDelay
    );

    // While networking is enabled, we expect 'Unknown' state. We are using
    // mocks so we will never get to healthy. But, we shouldn't get to Failed
    // unless we explicitly disable networking.
    // Furthermore, we only expect updates on state changes, so enabling when
    // networking is already enabled should not produce an update.
    let currentOnlineState: OnlineState = OnlineState.Unknown;
    let updateCount = 0;
    const remoteStore = new RemoteStore(
      localStore,
      datastore,
      (onlineState: OnlineState) => {
        currentOnlineState = onlineState;
        updateCount++;
      }
    );
    await remoteStore.enableNetwork();
    expect(currentOnlineState).to.equal(OnlineState.Unknown);
    await remoteStore.enableNetwork();
    expect(currentOnlineState).to.equal(OnlineState.Unknown);
    expect(updateCount).to.equal(0);

    // Make sure that disabling produces an event, and that repeated disabling
    // is idempotent.
    await remoteStore.disableNetwork();
    expect(currentOnlineState).to.equal(OnlineState.Failed);
    expect(updateCount).to.equal(1);
    await remoteStore.disableNetwork();
    expect(currentOnlineState).to.equal(OnlineState.Failed);
    expect(updateCount).to.equal(1);

    // Finally, ensure that we get an event when we reenable networking.
    await remoteStore.enableNetwork();
    expect(currentOnlineState).to.equal(OnlineState.Unknown);
    expect(updateCount).to.equal(2);
  });
});
