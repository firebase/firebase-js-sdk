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
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { DataConnectOptions } from '../../src/api/DataConnect';
import {
  CallerSdkType,
  CallerSdkTypeEnum,
  DataConnectResponse,
  getGoogApiClientValue
} from '../../src/network';
import { AbstractDataConnectStreamTransport } from '../../src/network/stream/streamTransport';
import {
  CancelStreamRequest,
  DataConnectStreamRequest,
  ExecuteStreamRequest,
  ResumeStreamRequest,
  SubscribeStreamRequest
} from '../../src/network/stream/wire';

use(sinonChai);

class TestStreamTransport extends AbstractDataConnectStreamTransport {
  protected openConnection(): Promise<void> {
    return Promise.resolve();
  }
  protected closeConnection(): Promise<void> {
    return Promise.resolve();
  }
  protected sendMessage<Variables>(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    requestBody: DataConnectStreamRequest<Variables>
  ): void {
    // no-op
  }

  /**
   * Manually trigger onConnectionReady for testing purposes.
   */
  triggerOnConnectionReady(): void {
    this.onConnectionReady();
  }

  /**
   * Manually set auth token for testing purposes.
   */
  setAuthToken(token: string | null): void {
    this.onAuthTokenChanged(token);
  }

  /**
   * Manually set app check token for testing purposes.
   */
  setAppCheckToken(token: string | null): void {
    this._appCheckToken = token;
  }

  /**
   * Manually resolve a request for testing purposes.
   */
  resolveRequest<Data>(
    requestId: string,
    response: DataConnectResponse<Data>
  ): Promise<void> {
    return this._handleMessage(requestId, response);
  }
}


/**
 * Interface that exposes some private fields and methods of TestStreamTransport for testing purposes.
 */
interface TransportWithInternals {
  _nextRequestId(): string;
  connectorResourcePath: string;
  _isUsingGen: boolean;
  _callerSdkType: CallerSdkType;
  _setCallerSdkType(type: CallerSdkType): void;
  setAuthToken(token: string | null): void;
  setAppCheckToken(token: string | null): void;
  _prepareMessage<
    Variables,
    StreamBody extends DataConnectStreamRequest<Variables>
  >(
    requestBody: StreamBody
  ): StreamBody;
  _activeQueryExecuteRequests: Map<
    string,
    ExecuteStreamRequest<unknown> | ResumeStreamRequest
  >;
  _activeMutationExecuteRequests: Map<
    string,
    Array<ExecuteStreamRequest<unknown>>
  >;
  _activeSubscribeRequests: Map<string, SubscribeStreamRequest<unknown>>;
  _executeRequestPromises: Map<
    string,
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolve: (data: any) => void;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reject: (err: any) => void;
      promise: Promise<DataConnectResponse<unknown>>;
    }
  >;
  _subscribeNotificationHooks: Map<string, unknown>;
  _getMapKey(operationName: string, variables?: unknown): string;
  invokeQuery<_Data, _Variables>(
    queryName: string,
    variables?: _Variables
  ): Promise<unknown>;
  invokeMutation<_Data, _Variables>(
    mutationName: string,
    variables?: _Variables
  ): Promise<unknown>;
  invokeSubscribe<_Data, _Variables>(
    notify: unknown,
    queryName: string,
    variables: _Variables
  ): void;
  invokeUnsubscribe<_Variables>(queryName: string, variables: _Variables): void;
  sendMessage<Variables>(
    requestBody: DataConnectStreamRequest<Variables>
  ): void;
  resolveRequest<_Data>(
    requestId: string,
    response: DataConnectResponse<_Data>
  ): Promise<void>;
}

describe('AbstractDataConnectStreamTransport', () => {
  const dcOptions: DataConnectOptions = {
    projectId: 'p',
    location: 'l',
    service: 's',
    connector: 'c'
  };
  let transport: TransportWithInternals;
  let expectedName: string;
  let expectedInitialGoogApiClientValue: string;
  const firstRequestId = '1';
  const unpreparedMessage: DataConnectStreamRequest<unknown> = {
    requestId: firstRequestId,
    execute: { operationName: 'test' }
  };
  const initialAuthToken = 'initial-auth-token';
  const newAuthToken = 'new-auth-token';
  const initialAppCheckToken = 'initial-app-check-token';
  const newAppCheckToken = 'new-app-check-token';

  beforeEach(() => {
    transport = new TestStreamTransport(
      dcOptions
    ) as unknown as TransportWithInternals;
    expectedName = transport.connectorResourcePath;
    transport._isUsingGen = true;
    transport._callerSdkType = CallerSdkTypeEnum.Generated;
    expectedInitialGoogApiClientValue = getGoogApiClientValue(
      transport._isUsingGen,
      transport._callerSdkType
    );
    transport.setAuthToken(initialAuthToken);
    transport.setAppCheckToken(initialAppCheckToken);
  });

  describe('_prepareMessage', () => {
    it('should not change data fields', () => {
      const preparedMessage = transport._prepareMessage(
        unpreparedMessage
      ) as DataConnectStreamRequest<unknown>;
      expect(preparedMessage.requestId).to.equal(unpreparedMessage.requestId);
      expect(preparedMessage.execute).to.equal(unpreparedMessage.execute);
      expect(preparedMessage.resume).to.equal(unpreparedMessage.resume);
      expect(preparedMessage.subscribe).to.equal(unpreparedMessage.subscribe);
      expect(preparedMessage.cancel).to.equal(unpreparedMessage.cancel);
      expect(preparedMessage.dataEtag).to.equal(unpreparedMessage.dataEtag);
    });

    describe('should handle headers properly', () => {
      describe('auth token', () => {
        it('should add auth token to the first message', () => {
          const preparedMessage = transport._prepareMessage(
            unpreparedMessage
          ) as DataConnectStreamRequest<unknown>;
          expect(preparedMessage.headers).to.exist;
          expect(preparedMessage.headers?.authToken).to.equal(initialAuthToken);
        });

        it('should NOT add the same auth token to subsequent messages', () => {
          transport._prepareMessage(unpreparedMessage);
          const secondPreparedMessage = transport._prepareMessage(
            unpreparedMessage
          ) as DataConnectStreamRequest<unknown>;
          expect(secondPreparedMessage.headers?.authToken).to.be.undefined;
        });

        it('should include auth token when it changes', () => {
          transport._prepareMessage(unpreparedMessage);
          const secondPreparedMessage = transport._prepareMessage(
            unpreparedMessage
          ) as DataConnectStreamRequest<unknown>;
          expect(secondPreparedMessage.headers?.authToken).to.be.undefined;
          transport.setAuthToken(newAuthToken);
          const thirdPreparedMessage = transport._prepareMessage(
            unpreparedMessage
          ) as DataConnectStreamRequest<unknown>;
          expect(thirdPreparedMessage.headers?.authToken).to.equal(
            newAuthToken
          );
        });
      });

      describe('app check token', () => {
        it('should add app check token to the first message', () => {
          const firstPreparedMessage = transport._prepareMessage(
            unpreparedMessage
          ) as DataConnectStreamRequest<unknown>;
          expect(firstPreparedMessage.headers).to.exist;
          expect(firstPreparedMessage.headers?.appCheckToken).to.equal(
            initialAppCheckToken
          );
        });

        it('should NOT add the same app check token to subsequent messages', () => {
          transport._prepareMessage(unpreparedMessage);
          const secondPreparedMessage = transport._prepareMessage(
            unpreparedMessage
          ) as DataConnectStreamRequest<unknown>;
          expect(secondPreparedMessage.headers?.appCheckToken).to.be.undefined;
        });

        it('should NOT include app check token when it changes', () => {
          transport._prepareMessage(unpreparedMessage);
          const secondPreparedMessage = transport._prepareMessage(
            unpreparedMessage
          ) as DataConnectStreamRequest<unknown>;
          expect(secondPreparedMessage.headers?.appCheckToken).to.be.undefined;
          transport.setAppCheckToken(newAppCheckToken);
          const thirdPreparedMessage = transport._prepareMessage(
            unpreparedMessage
          ) as DataConnectStreamRequest<unknown>;
          expect(thirdPreparedMessage.headers?.appCheckToken).to.be.undefined;
        });
      });

      it('should add X-Goog-Api-Client to every message based on caller sdk type', () => {
        const firstPreparedMessage =
          transport._prepareMessage(unpreparedMessage);
        expect(firstPreparedMessage.headers?.['X-Goog-Api-Client']).to.equal(
          expectedInitialGoogApiClientValue
        );
        const secondPreparedMessage = transport._prepareMessage(
          unpreparedMessage
        ) as DataConnectStreamRequest<unknown>;
        expect(secondPreparedMessage.headers?.['X-Goog-Api-Client']).to.equal(
          expectedInitialGoogApiClientValue
        );
        transport._isUsingGen = true;
        transport._setCallerSdkType(CallerSdkTypeEnum.GeneratedReact);
        const expectedThirdGoogApiClientValue = getGoogApiClientValue(
          true,
          CallerSdkTypeEnum.GeneratedReact
        );
        const thirdPreparedMessage = transport._prepareMessage(
          unpreparedMessage
        ) as DataConnectStreamRequest<unknown>;
        expect(thirdPreparedMessage.headers?.['X-Goog-Api-Client']).to.equal(
          expectedThirdGoogApiClientValue
        );
      });
    });

    describe('should handle name properly', () => {
      it('should add name to the first message', () => {
        const firstPreparedMessage =
          transport._prepareMessage(unpreparedMessage);
        expect(firstPreparedMessage.name).to.equal(expectedName);
      });

      it('should NOT add name to subsequent messages', () => {
        transport._prepareMessage(unpreparedMessage);
        const secondPreparedMessage = transport._prepareMessage(
          unpreparedMessage
        ) as DataConnectStreamRequest<unknown>;
        expect(secondPreparedMessage.name).to.be.undefined;
      });
    });
  });

  describe('Request Tracking', () => {
    it('_getMapKey should sort keys consistently for map lookups', () => {
      const queryName = 'sortQuery';
      const variables1 = { a: 1, b: 2, c: 3, d: 4 };
      const variables2 = { b: 2, a: 1, d: 4, c: 3 };
      expect(transport._getMapKey(queryName, variables1)).to.equal(transport._getMapKey(queryName, variables2));
    });

    it('should generate unique request IDs', () => {
      const id1 = transport._nextRequestId();
      const id2 = transport._nextRequestId();
      expect(id1).to.not.equal(id2);
      expect(Number(id1)).to.be.lessThan(Number(id2));
    });

    describe('Incoming Requests from Transport Layer', () => {
      it('invokeQuery should populate tracking maps and call sendMessage', async () => {
        const sendMessageSpy = sinon.spy(transport, 'sendMessage');
        const queryName = 'testQuery';
        const variables = { foo: 'bar' };

        const _promise = transport.invokeQuery(queryName, variables);

        const expectedKey = transport._getMapKey(queryName, variables);
        expect(transport._activeQueryExecuteRequests.has(expectedKey)).to.be.true;
        const request = transport._activeQueryExecuteRequests.get(expectedKey);
        expect(request?.execute?.operationName).to.equal(queryName);
        expect(request?.execute?.variables).to.deep.equal(variables);

        const requestId = (request as ExecuteStreamRequest<unknown>).requestId;
        expect(transport._executeRequestPromises.has(requestId)).to.be.true;

        expect(sendMessageSpy).to.have.been.calledOnce;
        const sentMessage = sendMessageSpy.firstCall.args[0];
        expect(sentMessage.requestId).to.equal(requestId);
        expect(sentMessage.execute).to.not.be.undefined;
        expect(sentMessage.execute?.operationName).to.equal(queryName);
        expect(sentMessage.execute?.variables).to.deep.equal(variables);
      });

      it('invokeMutation should populate tracking maps and call sendMessage', async () => {
        const sendMessageSpy = sinon.spy(transport, 'sendMessage');
        const mutationName = 'testMutation';
        const variables = { foo: 'bar' };

        const _promise = transport.invokeMutation(mutationName, variables);

        const expectedKey = transport._getMapKey(mutationName, variables);
        const activeRequests = transport._activeMutationExecuteRequests.get(expectedKey);
        expect(activeRequests).to.have.lengthOf(1);
        expect(activeRequests![0].execute?.operationName).to.equal(mutationName);
        const requestId = activeRequests![0].requestId;
        expect(transport._executeRequestPromises.has(requestId)).to.be.true;

        expect(sendMessageSpy).to.have.been.calledOnce;
        const sentMessage = sendMessageSpy.firstCall.args[0];
        expect(sentMessage.requestId).to.equal(requestId);
        expect(sentMessage.execute).to.not.be.undefined;
        expect(sentMessage.execute?.operationName).to.equal(mutationName);
        expect(sentMessage.execute?.variables).to.deep.equal(variables);
      });

      it('invokeSubscribe should populate tracking maps and call sendMessage', async () => {
        const sendMessageSpy = sinon.spy(transport, 'sendMessage');
        const queryName = 'testQuery';
        const variables = { foo: 'bar' };
        const hook = sinon.spy();

        transport.invokeSubscribe(hook, queryName, variables);

        const expectedKey = transport._getMapKey(queryName, variables);
        expect(transport._activeSubscribeRequests.has(expectedKey)).to.be.true;
        const request = transport._activeSubscribeRequests.get(expectedKey);
        expect(request?.subscribe?.operationName).to.equal(queryName);
        expect(request?.subscribe?.variables).to.deep.equal(variables);

        const requestId = (request as SubscribeStreamRequest<unknown>).requestId;
        expect(transport._subscribeNotificationHooks.has(requestId)).to.be.true;

        expect(sendMessageSpy).to.have.been.calledOnce;
        const sentMessage = sendMessageSpy.firstCall.args[0];
        expect(sentMessage.requestId).to.equal(requestId);
        expect(sentMessage.subscribe).to.not.be.undefined;
        expect(sentMessage.subscribe?.operationName).to.equal(queryName);
        expect(sentMessage.subscribe?.variables).to.deep.equal(variables);
      });

      it('invokeUnsubscribe should de-populate tracking maps and call sendMessage', async () => {
        const sendMessageSpy = sinon.spy(transport, 'sendMessage');
        const queryName = 'testQuery';
        const variables = { foo: 'bar' };
        const hook = sinon.spy();

        transport.invokeSubscribe(hook, queryName, variables);

        const expectedKey = transport._getMapKey(queryName, variables);
        expect(transport._activeSubscribeRequests.has(expectedKey)).to.be.true;
        const subscribeRequest = transport._activeSubscribeRequests.get(expectedKey);
        const subscribeRequestId = (subscribeRequest as SubscribeStreamRequest<unknown>).requestId;
        expect(transport._subscribeNotificationHooks.has(subscribeRequestId)).to.be.true;

        transport.invokeUnsubscribe(queryName, variables);

        expect(sendMessageSpy).to.have.been.calledTwice;
        const unsubscribeMessage = sendMessageSpy.secondCall.args[0];

        expect(transport._activeSubscribeRequests.has(expectedKey)).to.be.false;
        expect(transport._subscribeNotificationHooks.has(subscribeRequestId)).to.be.false;
        expect(unsubscribeMessage.cancel).to.not.be.undefined;
      });
    });
  });
});
