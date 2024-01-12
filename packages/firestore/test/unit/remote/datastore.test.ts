/**
 * @license
 * Copyright 2021 Google LLC
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

import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {
  EmptyAppCheckTokenProvider,
  EmptyAuthCredentialsProvider,
  Token
} from '../../../src/api/credentials';
import { DatabaseId } from '../../../src/core/database_info';
import { ResourcePath } from '../../../src/model/path';
import { Connection, Stream } from '../../../src/remote/connection';
import {
  Datastore,
  newDatastore,
  invokeCommitRpc,
  invokeBatchGetDocumentsRpc
} from '../../../src/remote/datastore';
import { JsonProtoSerializer } from '../../../src/remote/serializer';
import { Code, FirestoreError } from '../../../src/util/error';

use(chaiAsPromised);

// TODO(b/185584343): Improve the coverage of these tests.
// At the time of writing, the tests only cover the error handling in
// `invokeRPC()` and `invokeStreamingRPC()`.
describe('Datastore', () => {
  class MockConnection implements Connection {
    terminateInvoked = false;

    terminate(): void {
      this.terminateInvoked = true;
    }

    invokeRPC<Req, Resp>(
      rpcName: string,
      path: ResourcePath,
      request: Req,
      token: Token | null
    ): Promise<Resp> {
      throw new Error('MockConnection.invokeRPC() must be replaced');
    }

    invokeStreamingRPC<Req, Resp>(
      rpcName: string,
      path: ResourcePath,
      request: Req,
      token: Token | null
    ): Promise<Resp[]> {
      throw new Error('MockConnection.invokeStreamingRPC() must be replaced');
    }

    openStream<Req, Resp>(
      rpcName: string,
      token: Token | null
    ): Stream<Req, Resp> {
      throw new Error('MockConnection.openStream() must be replaced');
    }

    shouldResourcePathBeIncludedInRequest: boolean = false;
  }

  class MockAuthCredentialsProvider extends EmptyAuthCredentialsProvider {
    invalidateTokenInvoked = false;
    invalidateToken(): void {
      this.invalidateTokenInvoked = true;
    }
  }

  class MockAppCheckTokenProvider extends EmptyAppCheckTokenProvider {
    invalidateTokenInvoked = false;
    invalidateToken(): void {
      this.invalidateTokenInvoked = true;
    }
  }

  const serializer = new JsonProtoSerializer(
    new DatabaseId('test-project'),
    /* useProto3Json= */ false
  );

  async function invokeDatastoreImplInvokeRpc(
    datastore: Datastore
  ): Promise<void> {
    // Since we cannot access the `DatastoreImpl` class directly, invoke its
    // `invokeRPC()` method indirectly via `invokeCommitRpc()`.
    await invokeCommitRpc(datastore, /* mutations= */ []);
  }

  async function invokeDatastoreImplInvokeStreamingRPC(
    datastore: Datastore
  ): Promise<void> {
    // Since we cannot access the `DatastoreImpl` class directly, invoke its
    // `invokeStreamingRPC()` method indirectly via
    // `invokeBatchGetDocumentsRpc()`.
    await invokeBatchGetDocumentsRpc(datastore, /* keys= */ []);
  }

  it('newDatastore() returns an an instance of Datastore', () => {
    const datastore = newDatastore(
      new EmptyAuthCredentialsProvider(),
      new EmptyAppCheckTokenProvider(),
      new MockConnection(),
      serializer
    );
    expect(datastore).to.be.an.instanceof(Datastore);
  });

  it('DatastoreImpl.invokeRPC() fails if terminated', async () => {
    const datastore = newDatastore(
      new EmptyAuthCredentialsProvider(),
      new EmptyAppCheckTokenProvider(),
      new MockConnection(),
      serializer
    );
    datastore.terminate();
    await expect(invokeDatastoreImplInvokeRpc(datastore))
      .to.eventually.be.rejectedWith(/terminated/)
      .and.include({
        'name': 'FirebaseError',
        'code': Code.FAILED_PRECONDITION
      });
  });

  it('Connection.terminate() invoked if Datastore terminated', async () => {
    const connection = new MockConnection();
    const datastore = newDatastore(
      new EmptyAuthCredentialsProvider(),
      new EmptyAppCheckTokenProvider(),
      connection,
      serializer
    );
    datastore.terminate();
    await expect(connection.terminateInvoked).to.equal(true);
  });

  it('DatastoreImpl.invokeRPC() rethrows a FirestoreError', async () => {
    const connection = new MockConnection();
    connection.invokeRPC = () =>
      Promise.reject(new FirestoreError(Code.ABORTED, 'zzyzx'));
    const authCredentials = new MockAuthCredentialsProvider();
    const appCheckCredentials = new MockAppCheckTokenProvider();
    const datastore = newDatastore(
      authCredentials,
      appCheckCredentials,
      connection,
      serializer
    );
    await expect(invokeDatastoreImplInvokeRpc(datastore))
      .to.eventually.be.rejectedWith('zzyzx')
      .and.include({
        'name': 'FirebaseError',
        'code': Code.ABORTED
      });
    expect(authCredentials.invalidateTokenInvoked).to.be.false;
    expect(appCheckCredentials.invalidateTokenInvoked).to.be.false;
  });

  it('DatastoreImpl.invokeRPC() wraps unknown exceptions in a FirestoreError', async () => {
    const connection = new MockConnection();
    connection.invokeRPC = () => Promise.reject('zzyzx');
    const authCredentials = new MockAuthCredentialsProvider();
    const appCheckCredentials = new MockAppCheckTokenProvider();
    const datastore = newDatastore(
      authCredentials,
      appCheckCredentials,
      connection,
      serializer
    );
    await expect(invokeDatastoreImplInvokeRpc(datastore))
      .to.eventually.be.rejectedWith('zzyzx')
      .and.include({
        'name': 'FirebaseError',
        'code': Code.UNKNOWN
      });
    expect(authCredentials.invalidateTokenInvoked).to.be.false;
    expect(appCheckCredentials.invalidateTokenInvoked).to.be.false;
  });

  it('DatastoreImpl.invokeRPC() invalidates the token if unauthenticated', async () => {
    const connection = new MockConnection();
    connection.invokeRPC = () =>
      Promise.reject(new FirestoreError(Code.UNAUTHENTICATED, 'zzyzx'));
    const authCredentials = new MockAuthCredentialsProvider();
    const appCheckCredentials = new MockAppCheckTokenProvider();
    const datastore = newDatastore(
      authCredentials,
      appCheckCredentials,
      connection,
      serializer
    );
    await expect(invokeDatastoreImplInvokeRpc(datastore))
      .to.eventually.be.rejectedWith('zzyzx')
      .and.include({
        'name': 'FirebaseError',
        'code': Code.UNAUTHENTICATED
      });
    expect(authCredentials.invalidateTokenInvoked).to.be.true;
    expect(appCheckCredentials.invalidateTokenInvoked).to.be.true;
  });

  it('DatastoreImpl.invokeStreamingRPC() fails if terminated', async () => {
    const datastore = newDatastore(
      new EmptyAuthCredentialsProvider(),
      new EmptyAppCheckTokenProvider(),
      new MockConnection(),
      serializer
    );
    datastore.terminate();
    await expect(invokeDatastoreImplInvokeStreamingRPC(datastore))
      .to.eventually.be.rejectedWith(/terminated/)
      .and.include({
        'name': 'FirebaseError',
        'code': Code.FAILED_PRECONDITION
      });
  });

  it('DatastoreImpl.invokeStreamingRPC() rethrows a FirestoreError', async () => {
    const connection = new MockConnection();
    connection.invokeStreamingRPC = () =>
      Promise.reject(new FirestoreError(Code.ABORTED, 'zzyzx'));
    const authCredentials = new MockAuthCredentialsProvider();
    const appCheckCredentials = new MockAppCheckTokenProvider();
    const datastore = newDatastore(
      authCredentials,
      appCheckCredentials,
      connection,
      serializer
    );
    await expect(invokeDatastoreImplInvokeStreamingRPC(datastore))
      .to.eventually.be.rejectedWith('zzyzx')
      .and.include({
        'name': 'FirebaseError',
        'code': Code.ABORTED
      });
    expect(authCredentials.invalidateTokenInvoked).to.be.false;
    expect(appCheckCredentials.invalidateTokenInvoked).to.be.false;
  });

  it('DatastoreImpl.invokeStreamingRPC() wraps unknown exceptions in a FirestoreError', async () => {
    const connection = new MockConnection();
    connection.invokeStreamingRPC = () => Promise.reject('zzyzx');
    const authCredentials = new MockAuthCredentialsProvider();
    const appCheckCredentials = new MockAppCheckTokenProvider();
    const datastore = newDatastore(
      authCredentials,
      appCheckCredentials,
      connection,
      serializer
    );
    await expect(invokeDatastoreImplInvokeStreamingRPC(datastore))
      .to.eventually.be.rejectedWith('zzyzx')
      .and.include({
        'name': 'FirebaseError',
        'code': Code.UNKNOWN
      });
    expect(authCredentials.invalidateTokenInvoked).to.be.false;
    expect(appCheckCredentials.invalidateTokenInvoked).to.be.false;
  });

  it('DatastoreImpl.invokeStreamingRPC() invalidates the token if unauthenticated', async () => {
    const connection = new MockConnection();
    connection.invokeStreamingRPC = () =>
      Promise.reject(new FirestoreError(Code.UNAUTHENTICATED, 'zzyzx'));
    const authCredentials = new MockAuthCredentialsProvider();
    const appCheckCredentials = new MockAppCheckTokenProvider();
    const datastore = newDatastore(
      authCredentials,
      appCheckCredentials,
      connection,
      serializer
    );
    await expect(invokeDatastoreImplInvokeStreamingRPC(datastore))
      .to.eventually.be.rejectedWith('zzyzx')
      .and.include({
        'name': 'FirebaseError',
        'code': Code.UNAUTHENTICATED
      });
    expect(authCredentials.invalidateTokenInvoked).to.be.true;
    expect(appCheckCredentials.invalidateTokenInvoked).to.be.true;
  });
});
