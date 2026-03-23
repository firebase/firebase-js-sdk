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

use(chaiAsPromised);
use(sinonChai);

/** Interface that exposes private fields of TransportManager for testing purposes. */
interface ManagerWithInternals {
  restTransport: RESTTransport;
  streamTransport?: AbstractDataConnectStreamTransport;
  initStreamTransport(): AbstractDataConnectStreamTransport;
  executeShouldUseStream(): boolean;
}

describe('DataConnectTransportManager', () => {
  let manager: DataConnectTransportManager;
  const options: DataConnectOptions = {
    projectId: 'test-project',
    location: 'us-central1',
    connector: 'test-connector',
    service: 'test-service'
  };

  afterEach(() => {
    sinon.restore();
  });

  interface TestVariables {
    key: string;
  }
  const testQueryName = 'testQuery';
  const testMutationName = 'testMutation';
  const testVariables: TestVariables = { key: 'one' };

  interface TestData {
    value: number;
  }
  const testData: TestData = { value: 1 };

  it('should delegate invokeQuery to RESTTransport', async () => {
    manager = new DataConnectTransportManager(options);
    const stub = sinon
      .stub(
        (manager as unknown as { restTransport: RESTTransport }).restTransport,
        'invokeQuery'
      )
      .resolves({ data: testData } as DataConnectResponseWithMaxAge<TestData>);

    await manager.invokeQuery<TestData, TestVariables>(
      testQueryName,
      testVariables
    );

    expect(stub).to.have.been.calledOnceWith(testQueryName, testVariables);
  });

  it('should delegate invokeMutation to RESTTransport', async () => {
    manager = new DataConnectTransportManager(options);
    const stub = sinon
      .stub(
        (manager as unknown as { restTransport: RESTTransport }).restTransport,
        'invokeMutation'
      )
      .resolves({ data: testData } as DataConnectResponse<TestData>);

    await manager.invokeMutation<TestData, TestVariables>(
      testMutationName,
      testVariables
    );

    expect(stub).to.have.been.calledOnceWith(testMutationName, testVariables);
  });

  it('should delegate invokeSubscribe to stream instead of REST', () => {
    manager = new DataConnectTransportManager(options);
    const internalManager = manager as unknown as ManagerWithInternals;
    const stub = sinon.stub(internalManager.restTransport, 'invokeSubscribe');

    const hook: SubscribeNotificationHook<TestData> = () => { };
    expect(internalManager.streamTransport).to.be.undefined;

    manager.invokeSubscribe<TestData, TestVariables>(
      hook,
      'testSub',
      testVariables
    );

    expect(stub).not.to.have.been.called;
    const streamTransport = internalManager.streamTransport;
    expect(streamTransport).to.exist;
    expect(streamTransport!.invokeSubscribe).to.exist;
  });

  describe('initStreamTransport', () => {
    it('should initialize stream transport only once', () => {
      manager = new DataConnectTransportManager(options);
      const internalManager = manager as unknown as ManagerWithInternals;

      expect(internalManager.streamTransport).to.be.undefined;

      const transport1 = internalManager.initStreamTransport();
      expect(transport1).to.exist;
      expect(internalManager.streamTransport).to.equal(transport1);

      const transport2 = internalManager.initStreamTransport();
      expect(transport2).to.equal(transport1);
    });
  });

  describe('executeShouldUseStream', () => {
    it('should return false if streamTransport is not initialized', () => {
      manager = new DataConnectTransportManager(options);
      const internalManager = manager as unknown as ManagerWithInternals;
      expect(internalManager.executeShouldUseStream()).to.be.false;
    });

    it('should return true only when all stream conditions are met', () => {
      manager = new DataConnectTransportManager(options);
      const internalManager = manager as unknown as ManagerWithInternals;
      const streamTransport = internalManager.initStreamTransport();

      // Default state: not ready, no subs, no pending close
      const streamIsReadyStub = sinon.stub(streamTransport, 'streamIsReady').get(() => false);
      const hasActiveSubscriptionsStub = sinon.stub(streamTransport, 'hasActiveSubscriptions').get(() => false);
      const isPendingCloseStub = sinon.stub(streamTransport, 'isPendingClose').get(() => false);

      expect(internalManager.executeShouldUseStream()).to.be.false;

      // Make stream ready
      streamIsReadyStub.get(() => true);
      expect(internalManager.executeShouldUseStream()).to.be.false; // Still no subs

      // Add subscriptions
      hasActiveSubscriptionsStub.get(() => true);
      expect(internalManager.executeShouldUseStream()).to.be.true; // All conditions met!

      // Set pending close
      isPendingCloseStub.get(() => true);
      expect(internalManager.executeShouldUseStream()).to.be.false; // Pending close overrides
    });
  });

  it('should route invokeQuery to stream if executeShouldUseStream() is true', async () => {
    manager = new DataConnectTransportManager(options);
    manager.invokeSubscribe(() => { }, 'test', testVariables);
    const internalManager = manager as unknown as ManagerWithInternals;
    const streamTransport = internalManager.streamTransport!;

    sinon.stub(streamTransport, 'streamIsReady').get(() => true);
    sinon.stub(streamTransport, 'hasActiveSubscriptions').get(() => true);
    sinon.stub(streamTransport, 'isPendingClose').get(() => false);

    const streamSpy = sinon
      .stub(streamTransport, 'invokeQuery')
      .resolves({ data: testData } as unknown as DataConnectResponse<TestData>);
    const restSpy = sinon.stub(internalManager.restTransport, 'invokeQuery');

    await manager.invokeQuery(testQueryName, testVariables);

    expect(streamSpy).to.have.been.calledOnceWith(testQueryName, testVariables);
    expect(restSpy).to.have.not.been.called;
  });

  it('should fallback invokeQuery to REST if stream throws unableToConnect', async () => {
    manager = new DataConnectTransportManager(options);
    manager.invokeSubscribe(() => { }, 'test', testVariables);
    const internalManager = manager as unknown as ManagerWithInternals;
    const streamTransport = internalManager.streamTransport!;

    sinon.stub(streamTransport, 'streamIsReady').get(() => true);
    sinon.stub(streamTransport, 'hasActiveSubscriptions').get(() => true);
    sinon.stub(streamTransport, 'isPendingClose').get(() => false);
    sinon.stub(streamTransport, 'isUnableToConnect').get(() => true);

    const expectedError = new Error('stream error');
    const streamSpy = sinon
      .stub(streamTransport, 'invokeQuery')
      .rejects(expectedError);
    const restSpy = sinon
      .stub(internalManager.restTransport, 'invokeQuery')
      .resolves({ data: testData } as unknown as DataConnectResponse<TestData>);

    await manager.invokeQuery(testQueryName, testVariables);

    expect(streamSpy).to.have.been.calledOnceWith(testQueryName, testVariables);
    expect(restSpy).to.have.been.calledOnceWith(testQueryName, testVariables);
  });

  it('should fallback invokeQuery to REST if stream is pending close', async () => {
    manager = new DataConnectTransportManager(options);
    const internalManager = manager as unknown as ManagerWithInternals;
    const streamTransport = internalManager.initStreamTransport();

    sinon.stub(streamTransport, 'streamIsReady').get(() => true);
    sinon.stub(streamTransport, 'hasActiveSubscriptions').get(() => true);
    sinon.stub(streamTransport, 'isPendingClose').get(() => true);

    const streamSpy = sinon
      .stub(streamTransport, 'invokeQuery')
      .resolves({} as unknown as DataConnectResponse<TestData>);
    const restSpy = sinon
      .stub(internalManager.restTransport, 'invokeQuery')
      .resolves({} as unknown as DataConnectResponse<TestData>);

    await manager.invokeQuery(testQueryName, testVariables);

    expect(streamSpy).to.have.not.been.called;
    expect(restSpy).to.have.been.calledOnceWith('test', testVariables);
  });

  it('should fallback invokeMutation to REST if stream is pending close', async () => {
    manager = new DataConnectTransportManager(options);
    const internalManager = manager as unknown as ManagerWithInternals;
    const streamTransport = internalManager.initStreamTransport();

    sinon.stub(streamTransport, 'streamIsReady').get(() => true);
    sinon.stub(streamTransport, 'hasActiveSubscriptions').get(() => true);
    sinon.stub(streamTransport, 'isPendingClose').get(() => true);

    const streamSpy = sinon
      .stub(streamTransport, 'invokeMutation')
      .resolves({} as unknown as DataConnectResponse<TestData>);
    const restSpy = sinon
      .stub(internalManager.restTransport, 'invokeMutation')
      .resolves({} as unknown as DataConnectResponse<TestData>);

    await manager.invokeMutation(testMutationName, testVariables);

    expect(streamSpy).to.have.not.been.called;
    expect(restSpy).to.have.been.calledOnceWith(testMutationName, testVariables);
  });

  it('should fallback invokeMutation to REST if stream returns unableToConnect error', async () => {
    manager = new DataConnectTransportManager(options);
    manager.invokeSubscribe(() => { }, 'test', testVariables);
    const internalManager = manager as unknown as ManagerWithInternals;
    const streamTransport = internalManager.streamTransport!;

    sinon.stub(streamTransport, 'streamIsReady').get(() => true);
    sinon.stub(streamTransport, 'hasActiveSubscriptions').get(() => true);
    sinon.stub(streamTransport, 'isPendingClose').get(() => false);
    sinon.stub(streamTransport, 'isUnableToConnect').get(() => true);

    const expectedError = new Error('stream error');
    const streamStub = sinon
      .stub(streamTransport, 'invokeMutation')
      .rejects(expectedError);
    const restStub = sinon
      .stub(internalManager.restTransport, 'invokeMutation')
      .resolves({ data: testData } as unknown as DataConnectResponse<TestData>);

    await manager.invokeMutation(testMutationName, testVariables);

    expect(streamStub).to.have.been.calledOnce;
    expect(restStub).to.have.been.calledOnce;
  });

  it('should throw stream error if invokeQuery fails and isUnableToConnect is false', async () => {
    manager = new DataConnectTransportManager(options);
    manager.invokeSubscribe(() => { }, 'test', testVariables);
    const internalManager = manager as unknown as ManagerWithInternals;
    const streamTransport = internalManager.streamTransport!;

    sinon.stub(streamTransport, 'streamIsReady').get(() => true);
    sinon.stub(streamTransport, 'hasActiveSubscriptions').get(() => true);
    sinon.stub(streamTransport, 'isPendingClose').get(() => false);
    sinon.stub(streamTransport, 'isUnableToConnect').get(() => false);

    const expectedError = new Error('some other stream error');
    const streamStub = sinon
      .stub(streamTransport, 'invokeQuery')
      .rejects(expectedError);
    const restStub = sinon.stub(internalManager.restTransport, 'invokeQuery');

    await expect(manager.invokeQuery(testQueryName, testVariables)).to.be.rejectedWith(expectedError);
    expect(streamStub).to.have.been.calledOnce;
    expect(restStub).not.to.have.been.called;
  });

  it('should delegate useEmulator to RESTTransport and StreamTransport', () => {
    manager = new DataConnectTransportManager(options);
    manager.invokeSubscribe(() => { }, 'test', testVariables); // Initialize stream
    const internalManager = manager as unknown as ManagerWithInternals;

    const restStub = sinon.stub(internalManager.restTransport, 'useEmulator');
    const streamStub = sinon.stub(
      internalManager.streamTransport!,
      'useEmulator'
    );

    manager.useEmulator('localhost', 9000, false);

    expect(restStub).to.have.been.calledOnceWith('localhost', 9000, false);
    expect(streamStub).to.have.been.calledOnceWith('localhost', 9000, false);
  });

  it('should delegate onAuthTokenChanged to RESTTransport and StreamTransport', () => {
    manager = new DataConnectTransportManager(options);
    manager.invokeSubscribe(() => { }, 'test', testVariables); // Initialize stream
    const internalManager = manager as unknown as ManagerWithInternals;

    const restStub = sinon.stub(
      internalManager.restTransport,
      'onAuthTokenChanged'
    );
    const streamStub = sinon.stub(
      internalManager.streamTransport!,
      'onAuthTokenChanged'
    );

    manager.onAuthTokenChanged('new-token');

    expect(restStub).to.have.been.calledOnceWith('new-token');
    expect(streamStub).to.have.been.calledOnceWith('new-token');
  });
});

