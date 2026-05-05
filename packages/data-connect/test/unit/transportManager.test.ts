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
import { Code } from '../../src/core/error';
import {
  DataConnectResponse,
  DataConnectResponseWithMaxAge,
  SubscribeObserver
} from '../../src/network';
import { DataConnectTransportManager } from '../../src/network/manager';
import { RESTTransport } from '../../src/network/rest';
import { AbstractDataConnectStreamTransport } from '../../src/network/stream/streamTransport';
import { WebSocketTransport } from '../../src/network/stream/websocket';

use(chaiAsPromised);
use(sinonChai);

/** Interface that exposes private fields of stream transport for testing purposes. */
interface StreamTransportWithInternals {
  onStreamClose(code: number, reason: string): void;
  rejectAllRequests(code: string, reason: string): void;
}

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
    observer: SubscribeObserver<Data>,
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
  const testResponse = { data: { value: 1 } } as DataConnectResponse<TestData>;

  const expectedError = new Error('stream error');

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

  describe('default transport routing', () => {
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
        hasActiveSubscriptions: false
      } as unknown as sinon.SinonStubbedInstance<WebSocketTransport>;
      manager.restTransport = stubRestTransport as unknown as RESTTransport;
      initStreamStub = sinon
        .stub(manager, 'initStreamTransport')
        .callsFake(() => {
          manager.streamTransport =
            stubStreamTransport as unknown as AbstractDataConnectStreamTransport;
          return stubStreamTransport as unknown as AbstractDataConnectStreamTransport;
        });
    });

    it('stream transport should not be initialized by default', () => {
      expect(manager.streamTransport).to.be.undefined;
      expect(initStreamStub).to.not.have.been.called;
    });

    it('invokeQuery should route to REST by default and not initialize stream transport', async () => {
      stubRestTransport.invokeQuery.resolves(testResponse);
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

    it('invokeMutation should route to REST by default and not initialize stream transport', async () => {
      stubRestTransport.invokeMutation.resolves(testResponse);
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

    it('invokeSubscribe should route to streaming by default and initialize stream transport', () => {
      const observer: SubscribeObserver<TestData> = {
        onData: () => {},
        onDisconnect: () => {},
        onError: () => {}
      };
      manager.invokeSubscribe<TestData, TestVariables>(
        observer,
        queryName1,
        variables1
      );
      expect(stubRestTransport.invokeSubscribe).to.not.have.been.called;
      expect(stubStreamTransport.invokeSubscribe).to.have.been.calledWith(
        observer,
        queryName1,
        variables1
      );
      expect(manager.streamTransport).to.exist;
      expect(initStreamStub).to.have.been.called;
    });

    it('invokeUnsubscribe should route to streaming by default when stream transport is already initialized and not initialize stream transport', () => {
      manager.invokeUnsubscribe(queryName1, variables1);
      expect(manager.streamTransport).to.be.undefined;
      expect(initStreamStub).to.not.have.been.called;
      expect(stubRestTransport.invokeUnsubscribe).to.not.have.been.called;
      expect(stubStreamTransport.invokeUnsubscribe).to.not.have.been.called;

      manager.initStreamTransport();
      manager.invokeUnsubscribe(queryName1, variables1);
      expect(stubRestTransport.invokeUnsubscribe).to.not.have.been.called;
      expect(stubStreamTransport.invokeUnsubscribe).to.have.been.calledWith(
        queryName1,
        variables1
      );
    });

    it('useEmulator should route to REST and streaming', () => {
      manager.initStreamTransport();

      manager.useEmulator('localhost', 9000, false);

      expect(stubRestTransport.useEmulator).to.have.been.calledOnceWith(
        'localhost',
        9000,
        false
      );
      expect(stubStreamTransport.useEmulator).to.have.been.calledOnceWith(
        'localhost',
        9000,
        false
      );
    });

    it('onAuthTokenChanged should route to REST and streaming', () => {
      manager.initStreamTransport();

      manager.onAuthTokenChanged('new-token');

      expect(stubRestTransport.onAuthTokenChanged).to.have.been.calledOnceWith(
        'new-token'
      );
      expect(
        stubStreamTransport.onAuthTokenChanged
      ).to.have.been.calledOnceWith('new-token');
    });
  });

  describe('dynamic transport routing', () => {
    it('executeShouldUseStream should return false if streamTransport is not initialized', () => {
      expect(manager.executeShouldUseStream()).to.be.false;
    });

    it('executeShouldUseStream should return true only when all stream conditions are met', () => {
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

      // make stream ready, but still no active subscriptions
      streamIsReadyStub.get(() => true);
      expect(manager.executeShouldUseStream()).to.be.false;

      // add active subscriptions
      hasActiveSubscriptionsStub.get(() => true);
      expect(manager.executeShouldUseStream()).to.be.true;

      // pending close overrides readiness / active subscriptions
      isPendingCloseStub.get(() => true);
      expect(manager.executeShouldUseStream()).to.be.false;
    });

    describe('invokeQuery dynamic routing', () => {
      it('invokeQuery should route to stream if executeShouldUseStream returns true', async () => {
        const streamTransport = manager.initStreamTransport();
        sinon.stub(streamTransport, 'streamIsReady').get(() => true);
        sinon.stub(streamTransport, 'isPendingClose').get(() => false);
        sinon.stub(streamTransport, 'hasActiveSubscriptions').get(() => true);
        sinon.stub(streamTransport, 'isUnableToConnect').get(() => false);

        const restSpy = sinon.stub(manager.restTransport, 'invokeQuery');
        const streamSpy = sinon
          .stub(streamTransport, 'invokeQuery')
          .resolves(testResponse);

        await manager.invokeQuery(queryName1, variables1);

        expect(streamSpy).to.have.been.calledOnceWith(queryName1, variables1);
        expect(restSpy).to.have.not.been.called;
      });

      it('invokeQuery should throw an error if stream transport throws an error and executeShouldUseStream remains true', async () => {
        const streamTransport = manager.initStreamTransport();
        sinon.stub(streamTransport, 'streamIsReady').get(() => true);
        sinon.stub(streamTransport, 'isPendingClose').get(() => false);
        sinon.stub(streamTransport, 'hasActiveSubscriptions').get(() => true);
        sinon.stub(streamTransport, 'isUnableToConnect').get(() => false);

        const streamStub = sinon
          .stub(streamTransport, 'invokeQuery')
          .rejects(expectedError);
        const restStub = sinon
          .stub(manager.restTransport, 'invokeQuery')
          .resolves(testResponse);

        await expect(
          manager.invokeQuery(queryName1, variables1)
        ).to.be.rejectedWith(expectedError);

        expect(streamStub).to.have.been.calledOnceWith(queryName1, variables1);
        expect(restStub).to.not.have.been.called;
      });

      it('invokeQuery should fallback to REST if stream transport throws an error and then executeShouldUseStream becomes false', async () => {
        const streamTransport = manager.initStreamTransport();
        sinon.stub(streamTransport, 'streamIsReady').get(() => true);
        sinon.stub(streamTransport, 'isPendingClose').get(() => false);
        sinon.stub(streamTransport, 'hasActiveSubscriptions').get(() => true);
        sinon.stub(streamTransport, 'isUnableToConnect').get(() => false);

        const streamStub = sinon
          .stub(streamTransport, 'invokeQuery')
          .callsFake(async () => {
            sinon.stub(streamTransport, 'isUnableToConnect').get(() => true);
            throw expectedError;
          });
        const restStub = sinon
          .stub(manager.restTransport, 'invokeQuery')
          .resolves(testResponse);

        await manager.invokeQuery(queryName1, variables1);

        expect(streamStub).to.have.been.calledOnceWith(queryName1, variables1);
        expect(restStub).to.have.been.calledOnceWith(queryName1, variables1);
      });
    });

    describe('invokeMutation dynamic routing', () => {
      it('invokeMutation should route to stream if executeShouldUseStream() returns true', async () => {
        const streamTransport = manager.initStreamTransport();
        sinon.stub(streamTransport, 'streamIsReady').get(() => true);
        sinon.stub(streamTransport, 'isPendingClose').get(() => false);
        sinon.stub(streamTransport, 'hasActiveSubscriptions').get(() => true);
        sinon.stub(streamTransport, 'isUnableToConnect').get(() => false);

        const restSpy = sinon.stub(manager.restTransport, 'invokeMutation');
        const streamSpy = sinon
          .stub(streamTransport, 'invokeMutation')
          .resolves(testResponse);

        await manager.invokeMutation(mutationName1, variables1);

        expect(streamSpy).to.have.been.calledOnceWith(
          mutationName1,
          variables1
        );
        expect(restSpy).to.have.not.been.called;
      });

      it('invokeMutation should throw an error if stream transport throws an error and executeShouldUseStream remains true', async () => {
        const streamTransport = manager.initStreamTransport();
        sinon.stub(streamTransport, 'streamIsReady').get(() => true);
        sinon.stub(streamTransport, 'isPendingClose').get(() => false);
        sinon.stub(streamTransport, 'hasActiveSubscriptions').get(() => true);
        sinon.stub(streamTransport, 'isUnableToConnect').get(() => false);

        const streamStub = sinon
          .stub(streamTransport, 'invokeMutation')
          .rejects(expectedError);
        const restStub = sinon
          .stub(manager.restTransport, 'invokeMutation')
          .resolves(testResponse);

        await expect(
          manager.invokeMutation(mutationName1, variables1)
        ).to.be.rejectedWith(expectedError);

        expect(streamStub).to.have.been.calledOnceWith(
          mutationName1,
          variables1
        );
        expect(restStub).to.not.have.been.called;
      });

      it('invokeMutation should fallback to REST if stream transport throws an error and then executeShouldUseStream becomes false', async () => {
        const streamTransport = manager.initStreamTransport();
        sinon.stub(streamTransport, 'streamIsReady').get(() => true);
        sinon.stub(streamTransport, 'isPendingClose').get(() => false);
        sinon.stub(streamTransport, 'hasActiveSubscriptions').get(() => true);
        sinon.stub(streamTransport, 'isUnableToConnect').get(() => false);

        const streamStub = sinon
          .stub(streamTransport, 'invokeMutation')
          .callsFake(async () => {
            sinon.stub(streamTransport, 'isUnableToConnect').get(() => true);
            throw expectedError;
          });
        const restStub = sinon
          .stub(manager.restTransport, 'invokeMutation')
          .resolves(testResponse);

        await manager.invokeMutation(mutationName1, variables1);

        expect(streamStub).to.have.been.calledOnceWith(
          mutationName1,
          variables1
        );
        expect(restStub).to.have.been.calledOnceWith(mutationName1, variables1);
      });

      it('invokeMutation should fallback to REST for all in-flight mutations if stream fails', async () => {
        const streamTransport = manager.initStreamTransport();
        sinon.stub(streamTransport, 'streamIsReady').get(() => true);
        sinon.stub(streamTransport, 'isPendingClose').get(() => false);
        sinon.stub(streamTransport, 'hasActiveSubscriptions').get(() => true);
        sinon.stub(streamTransport, 'isUnableToConnect').get(() => false);

        let rejectStream!: (reason: unknown) => void;
        const streamPromise = new Promise((_, reject) => {
          rejectStream = reject;
        });

        const streamStub = sinon
          .stub(streamTransport, 'invokeMutation')
          .returns(
            streamPromise as unknown as Promise<DataConnectResponse<unknown>>
          );

        const restStub = sinon
          .stub(manager.restTransport, 'invokeMutation')
          .resolves(testResponse);

        const p1 = manager.invokeMutation(mutationName1, variables1);
        const p2 = manager.invokeMutation('mutation2', { key: 'two' });

        // Verify both called stream transport and are pending
        expect(streamStub).to.have.been.calledTwice;
        expect(restStub).to.not.have.been.called;

        // Mark stream as failed BEFORE resolving/rejecting to trigger fallback
        sinon.stub(streamTransport, 'isUnableToConnect').get(() => true);

        // Fail the stream
        rejectStream(expectedError);

        await Promise.all([p1, p2]);

        expect(restStub).to.have.been.calledTwice;
      });
    });

    describe('invokeSubscribe dynamic routing', () => {
      it('invokeSubscribe should throw an error if isUnableToConnect is true', () => {
        const observer: SubscribeObserver<TestData> = {
          onData: () => {},
          onDisconnect: () => {},
          onError: () => {}
        };
        const streamTransport = manager.initStreamTransport();
        sinon.stub(streamTransport, 'isUnableToConnect').get(() => true);

        const streamStub = sinon
          .stub(streamTransport, 'invokeSubscribe')
          .rejects(expectedError);
        const restStub = sinon
          .stub(manager.restTransport, 'invokeSubscribe')
          .resolves(testResponse);

        expect(() =>
          manager.invokeSubscribe(observer, queryName1, variables1)
        ).to.throw('Subscriptions are unavailable');

        expect(streamStub).to.not.have.been.called;
        expect(restStub).to.not.have.been.called;
      });
    });
  });

  describe('disconnects', () => {
    it('subscriber onDisconnect should be called when stream fails during active subscription', async () => {
      const observer: SubscribeObserver<TestData> = {
        onData: sinon.stub(),
        onDisconnect: sinon.stub(),
        onError: sinon.stub()
      };
      const streamTransport = manager.initStreamTransport();
      sinon.stub(streamTransport, 'streamIsReady').get(() => true);
      sinon.stub(streamTransport, 'isPendingClose').get(() => false);
      sinon.stub(streamTransport, 'hasActiveSubscriptions').get(() => true);
      sinon.stub(streamTransport, 'isUnableToConnect').get(() => false);

      // Add observer directly to tracking map to verify onDisconnect propagation
      const transportWithInternals = streamTransport as unknown as {
        subscribeObservers: Map<string, SubscribeObserver<TestData>>;
      };
      transportWithInternals.subscribeObservers = new Map([['1', observer]]);

      // rejectAllRequests simulates a disconnect without reconnects!
      (
        streamTransport as unknown as StreamTransportWithInternals
      ).rejectAllRequests(
        Code.OTHER,
        'Stream disconnected with code 1006: Abnormal Closure'
      );

      expect(observer.onDisconnect).to.have.been.calledOnceWith(
        Code.OTHER,
        'Stream disconnected with code 1006: Abnormal Closure'
      );
    });

    describe('idle timeout', () => {
      let clock: sinon.SinonFakeTimers;
      let streamTransport: WebSocketTransport;
      let restInvokeQuerySpy: sinon.SinonStub;

      beforeEach(() => {
        clock = sinon.useFakeTimers();
        streamTransport = manager.initStreamTransport() as WebSocketTransport;
        const streamTransportPublic = streamTransport as unknown as {
          openConnection(): Promise<void>;
          sendMessage(payload: unknown): Promise<void>;
        };
        sinon.stub(streamTransportPublic, 'openConnection').resolves();
        sinon.stub(streamTransportPublic, 'sendMessage').resolves();
        sinon.stub(streamTransport, 'streamIsReady').get(() => true);
        restInvokeQuerySpy = sinon
          .stub(manager.restTransport, 'invokeQuery')
          .resolves(testResponse);
      });

      afterEach(() => {
        clock.restore();
      });

      it('should route to REST during idle timeout and disconnect after 60s', async () => {
        const observer: SubscribeObserver<TestData> = {
          onData: () => {},
          onDisconnect: () => {},
          onError: () => {}
        };

        manager.invokeSubscribe(observer, queryName1, variables1);
        expect(manager.executeShouldUseStream()).to.be.true;

        manager.invokeUnsubscribe(queryName1, variables1);
        expect(manager.executeShouldUseStream()).to.be.false;

        // without active streams, should route to REST
        restInvokeQuerySpy.resetHistory();
        await manager.invokeQuery(queryName1, variables1);
        expect(restInvokeQuerySpy).to.have.been.calledOnce;

        await clock.tickAsync(59000);
        expect(manager.streamTransport).to.exist;

        await manager.invokeQuery(queryName1, variables1);
        expect(restInvokeQuerySpy).to.have.been.calledTwice;

        await clock.tickAsync(1000);
        expect(manager.streamTransport).to.be.undefined;
      });

      it('should route to REST after stream automatically closes', async () => {
        const observer: SubscribeObserver<TestData> = {
          onData: () => {},
          onDisconnect: () => {},
          onError: () => {}
        };

        manager.invokeSubscribe(observer, queryName1, variables1);
        manager.invokeUnsubscribe(queryName1, variables1);

        await clock.tickAsync(60000);
        expect(manager.streamTransport).to.be.undefined;

        restInvokeQuerySpy.resetHistory();
        await manager.invokeQuery(queryName1, variables1);
        expect(restInvokeQuerySpy).to.have.been.calledOnce;
      });

      it('should route back to stream after reconnect', async () => {
        const observer: SubscribeObserver<TestData> = {
          onData: () => {},
          onDisconnect: () => {},
          onError: () => {}
        };

        manager.invokeSubscribe(observer, queryName1, variables1);
        manager.invokeUnsubscribe(queryName1, variables1);

        await clock.tickAsync(60000);
        expect(manager.streamTransport).to.be.undefined;

        manager.invokeSubscribe(observer, queryName1, variables1);
        const newStreamTransport = manager.streamTransport!;
        const newStreamTransportPublic = newStreamTransport as unknown as {
          openConnection(): Promise<void>;
          sendMessage(payload: unknown): Promise<void>;
        };
        sinon.stub(newStreamTransportPublic, 'openConnection').resolves();
        sinon.stub(newStreamTransportPublic, 'sendMessage').resolves();
        sinon.stub(newStreamTransport, 'streamIsReady').get(() => true);
        const streamExecuteQueryStub = sinon
          .stub(newStreamTransport, 'invokeQuery')
          .resolves(testResponse);
        await manager.invokeQuery(queryName1, variables1);
        expect(streamExecuteQueryStub).to.have.been.calledOnce;
        expect(restInvokeQuerySpy).to.have.not.been.called;
      });
    });
  });
});
