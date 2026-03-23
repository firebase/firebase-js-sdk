/**
 * @license
 * Copyright 2026 Google LLC
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
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { DataConnectOptions } from '../../src/api/DataConnect';
import {
  DataConnectResponse,
  DataConnectResponseWithMaxAge,
  SubscribeNotificationHook
} from '../../src/network';
import { DataConnectTransportManager } from '../../src/network/manager';
import { RESTTransport } from '../../src/network/rest';
import { AbstractDataConnectStreamTransport } from '../../src/network/stream/streamTransport';
import { WebSocketTransport } from '../../src/network/stream/websocket';

use(chaiAsPromised);
use(sinonChai);

/** Interface that exposes private fields of TransportManager for testing purposes. */
interface ManagerWithInternals {
  invokeQuery<Data, Variables>(
    queryName: string,
    body?: Variables
  ): Promise<DataConnectResponseWithMaxAge<Data>>;
  invokeMutation<Data, Variables>(
    queryName: string,
    body?: Variables
  ): Promise<DataConnectResponse<Data>>;
  invokeSubscribe<Data, Variables>(
    notificationHook: SubscribeNotificationHook<Data>,
    queryName: string,
    body?: Variables
  ): void;
  invokeUnsubscribe<Variables>(queryName: string, body?: Variables): void;
  useEmulator(host: string, port?: number, sslEnabled?: boolean): void;
  onAuthTokenChanged: (token: string | null) => void;
  restTransport: RESTTransport;
  streamTransport?: AbstractDataConnectStreamTransport;
  initStreamTransport(): AbstractDataConnectStreamTransport;
  executeShouldUseStream(): boolean;
}

describe('DataConnectTransportManager', () => {
  let manager: ManagerWithInternals;
  const options: DataConnectOptions = {
    projectId: 'test-project',
    location: 'us-central1',
    connector: 'test-connector',
    service: 'test-service'
  };

  beforeEach(() => {
    manager = new DataConnectTransportManager(
      options
    ) as unknown as ManagerWithInternals;
  });

  afterEach(() => {
    sinon.restore();
  });

  interface TestVariables {
    key: string;
  }
  const queryName1 = 'testQuery1';
  // const queryName2 = 'testQuery2';
  const mutationName1 = 'testMutation1';
  const variables1: TestVariables = { key: 'one' };
  // const variables2: TestVariables = { key: 'two' };

  interface TestData {
    value: number;
  }
  const testData: TestData = { value: 1 };

  describe('stream transport initialization', () => {
    it('initStreamTransport should initialize stream transport only once', () => {
      expect(manager.streamTransport).to.be.undefined;

      const transport1 = manager.initStreamTransport();
      expect(transport1).to.exist;
      expect(manager.streamTransport).to.equal(transport1);

      const transport2 = manager.initStreamTransport();
      expect(transport2).to.equal(transport1);
    });
  });

  describe('lazy loading stream transport and default delegation', () => {
    let stubRestTransport: sinon.SinonStubbedInstance<RESTTransport>;
    let stubStreamTransport: sinon.SinonStubbedInstance<WebSocketTransport>;
    let initStreamStub: sinon.SinonStub;
    beforeEach(() => {
      stubRestTransport = {
        invokeQuery: sinon.stub(),
        invokeMutation: sinon.stub(),
        invokeSubscribe: sinon.stub(),
        invokeUnsubscribe: sinon.stub(),
        useEmulator: sinon.stub(),
        onAuthTokenChanged: sinon.stub()
      } as unknown as sinon.SinonStubbedInstance<RESTTransport>;
      stubStreamTransport = {
        invokeQuery: sinon.stub(),
        invokeMutation: sinon.stub(),
        invokeSubscribe: sinon.stub(),
        invokeUnsubscribe: sinon.stub(),
        useEmulator: sinon.stub(),
        onAuthTokenChanged: sinon.stub(),
        hasActiveSubscriptions: false,
      } as unknown as sinon.SinonStubbedInstance<WebSocketTransport>;
      manager.restTransport = stubRestTransport as unknown as RESTTransport;
      initStreamStub = sinon
        .stub(manager, 'initStreamTransport')
        .callsFake(() => {
          manager.streamTransport = stubStreamTransport as unknown as AbstractDataConnectStreamTransport;
          return stubStreamTransport as unknown as AbstractDataConnectStreamTransport;
        });
    });

    it('stream transport should not be initialized by default', () => {
      expect(manager.streamTransport).to.be.undefined;
      expect(initStreamStub).to.not.have.been.called;
    });

    it('manager should delegate invokeQuery to REST by default and not initialize stream transport', async () => {
      stubRestTransport.invokeQuery.resolves({
        data: testData
      } as DataConnectResponseWithMaxAge<TestData>);
      await manager.invokeQuery<TestData, TestVariables>(
        queryName1,
        variables1
      );
      expect(stubRestTransport.invokeQuery).to.have.been.calledWith(
        queryName1,
        variables1
      );
      expect(manager.streamTransport).to.be.undefined;
      expect(initStreamStub).to.not.have.been.called;
    });

    it('manager should delegate invokeMutation to REST by default and not initialize stream transport', async () => {
      stubRestTransport.invokeMutation.resolves({
        data: testData
      } as DataConnectResponse<TestData>);
      await manager.invokeMutation<TestData, TestVariables>(
        mutationName1,
        variables1
      );
      expect(stubRestTransport.invokeMutation).to.have.been.calledWith(
        mutationName1,
        variables1
      );
      expect(manager.streamTransport).to.be.undefined;
      expect(initStreamStub).to.not.have.been.called;
    });

    it('manager should delegate invokeSubscribe to stream transport and initialize stream transport', () => {
      const hook: SubscribeNotificationHook<TestData> = () => { };
      manager.invokeSubscribe<TestData, TestVariables>(
        hook,
        queryName1,
        variables1
      );
      expect(stubRestTransport.invokeSubscribe).to.not.have.been.called;
      expect(stubStreamTransport.invokeSubscribe).to.have.been.calledWith(
        hook,
        queryName1,
        variables1
      );
      expect(manager.streamTransport).to.exist;
      expect(initStreamStub).to.have.been.called;
    });
  });

  describe('executeShouldUseStream', () => {
    it('should return false if streamTransport is not initialized', () => {
      expect(manager.executeShouldUseStream()).to.be.false;
    });

    it('should return true only when all stream conditions are met', () => {
      const streamTransport = manager.initStreamTransport();

      // Default state: not ready, no subs, no pending close
      const streamIsReadyStub = sinon
        .stub(streamTransport, 'streamIsReady')
        .get(() => false);
      const hasActiveSubscriptionsStub = sinon
        .stub(streamTransport, 'hasActiveSubscriptions')
        .get(() => false);
      const isPendingCloseStub = sinon
        .stub(streamTransport, 'isPendingClose')
        .get(() => false);

      expect(manager.executeShouldUseStream()).to.be.false;

      // Make stream ready
      streamIsReadyStub.get(() => true);
      expect(manager.executeShouldUseStream()).to.be.false; // Still no subs

      // Add subscriptions
      hasActiveSubscriptionsStub.get(() => true);
      expect(manager.executeShouldUseStream()).to.be.true; // All conditions met!

      // Set pending close
      isPendingCloseStub.get(() => true);
      expect(manager.executeShouldUseStream()).to.be.false; // Pending close overrides
    });
  });

  it('should route invokeQuery to stream if executeShouldUseStream() is true', async () => {
    manager.invokeSubscribe(() => { }, 'test', variables1);
    const streamTransport = manager.streamTransport!;

    sinon.stub(streamTransport, 'streamIsReady').get(() => true);
    sinon.stub(streamTransport, 'hasActiveSubscriptions').get(() => true);
    sinon.stub(streamTransport, 'isPendingClose').get(() => false);

    const streamSpy = sinon
      .stub(streamTransport, 'invokeQuery')
      .resolves({ data: testData } as unknown as DataConnectResponse<TestData>);
    const restSpy = sinon.stub(manager.restTransport, 'invokeQuery');

    await manager.invokeQuery(queryName1, variables1);

    expect(streamSpy).to.have.been.calledOnceWith(queryName1, variables1);
    expect(restSpy).to.have.not.been.called;
  });

  it('should fallback invokeQuery to REST if stream throws unableToConnect', async () => {
    manager.invokeSubscribe(() => { }, 'test', variables1);
    const streamTransport = manager.streamTransport!;

    sinon.stub(streamTransport, 'streamIsReady').get(() => true);
    sinon.stub(streamTransport, 'hasActiveSubscriptions').get(() => true);
    sinon.stub(streamTransport, 'isPendingClose').get(() => false);
    sinon.stub(streamTransport, 'isUnableToConnect').get(() => true);

    const expectedError = new Error('stream error');
    const streamSpy = sinon
      .stub(streamTransport, 'invokeQuery')
      .rejects(expectedError);
    const restSpy = sinon
      .stub(manager.restTransport, 'invokeQuery')
      .resolves({ data: testData } as unknown as DataConnectResponse<TestData>);

    await manager.invokeQuery(queryName1, variables1);

    expect(streamSpy).to.have.been.calledOnceWith(queryName1, variables1);
    expect(restSpy).to.have.been.calledOnceWith(queryName1, variables1);
  });

  it('should fallback invokeQuery to REST if stream is pending close', async () => {
    const streamTransport = manager.initStreamTransport();

    sinon.stub(streamTransport, 'streamIsReady').get(() => true);
    sinon.stub(streamTransport, 'hasActiveSubscriptions').get(() => true);
    sinon.stub(streamTransport, 'isPendingClose').get(() => true);

    const streamSpy = sinon
      .stub(streamTransport, 'invokeQuery')
      .resolves({} as unknown as DataConnectResponse<TestData>);
    const restSpy = sinon
      .stub(manager.restTransport, 'invokeQuery')
      .resolves({} as unknown as DataConnectResponse<TestData>);

    await manager.invokeQuery(queryName1, variables1);

    expect(streamSpy).to.have.not.been.called;
    expect(restSpy).to.have.been.calledOnceWith(queryName1, variables1);
  });

  it('should fallback invokeMutation to REST if stream is pending close', async () => {
    const streamTransport = manager.initStreamTransport();

    sinon.stub(streamTransport, 'streamIsReady').get(() => true);
    sinon.stub(streamTransport, 'hasActiveSubscriptions').get(() => true);
    sinon.stub(streamTransport, 'isPendingClose').get(() => true);

    const streamSpy = sinon
      .stub(streamTransport, 'invokeMutation')
      .resolves({} as unknown as DataConnectResponse<TestData>);
    const restSpy = sinon
      .stub(manager.restTransport, 'invokeMutation')
      .resolves({} as unknown as DataConnectResponse<TestData>);

    await manager.invokeMutation(mutationName1, variables1);

    expect(streamSpy).to.have.not.been.called;
    expect(restSpy).to.have.been.calledOnceWith(mutationName1, variables1);
  });

  it('should fallback invokeMutation to REST if stream returns unableToConnect error', async () => {
    manager.invokeSubscribe(() => { }, 'test', variables1);
    const streamTransport = manager.streamTransport!;

    sinon.stub(streamTransport, 'streamIsReady').get(() => true);
    sinon.stub(streamTransport, 'hasActiveSubscriptions').get(() => true);
    sinon.stub(streamTransport, 'isPendingClose').get(() => false);
    sinon.stub(streamTransport, 'isUnableToConnect').get(() => true);

    const expectedError = new Error('stream error');
    const streamStub = sinon
      .stub(streamTransport, 'invokeMutation')
      .rejects(expectedError);
    const restStub = sinon
      .stub(manager.restTransport, 'invokeMutation')
      .resolves({ data: testData } as unknown as DataConnectResponse<TestData>);

    await manager.invokeMutation(mutationName1, variables1);

    expect(streamStub).to.have.been.calledOnce;
    expect(restStub).to.have.been.calledOnce;
  });

  it('should throw stream error if invokeQuery fails and isUnableToConnect is false', async () => {
    manager.invokeSubscribe(() => { }, 'test', variables1);
    const streamTransport = manager.streamTransport!;

    sinon.stub(streamTransport, 'streamIsReady').get(() => true);
    sinon.stub(streamTransport, 'hasActiveSubscriptions').get(() => true);
    sinon.stub(streamTransport, 'isPendingClose').get(() => false);
    sinon.stub(streamTransport, 'isUnableToConnect').get(() => false);

    const expectedError = new Error('some other stream error');
    const streamStub = sinon
      .stub(streamTransport, 'invokeQuery')
      .rejects(expectedError);
    const restStub = sinon.stub(manager.restTransport, 'invokeQuery');

    await expect(
      manager.invokeQuery(queryName1, variables1)
    ).to.be.rejectedWith(expectedError);
    expect(streamStub).to.have.been.calledOnce;
    expect(restStub).not.to.have.been.called;
  });

  it('should delegate useEmulator to RESTTransport and StreamTransport', () => {
    manager.invokeSubscribe(() => { }, 'test', variables1); // Initialize stream

    const restStub = sinon.stub(manager.restTransport, 'useEmulator');
    const streamStub = sinon.stub(manager.streamTransport!, 'useEmulator');

    manager.useEmulator('localhost', 9000, false);

    expect(restStub).to.have.been.calledOnceWith('localhost', 9000, false);
    expect(streamStub).to.have.been.calledOnceWith('localhost', 9000, false);
  });

  it('should delegate onAuthTokenChanged to RESTTransport and StreamTransport', () => {
    manager.invokeSubscribe(() => { }, 'test', variables1); // Initialize stream

    const restStub = sinon.stub(manager.restTransport, 'onAuthTokenChanged');
    const streamStub = sinon.stub(
      manager.streamTransport!,
      'onAuthTokenChanged'
    );

    manager.onAuthTokenChanged('new-token');

    expect(restStub).to.have.been.calledOnceWith('new-token');
    expect(streamStub).to.have.been.calledOnceWith('new-token');
  });
});
