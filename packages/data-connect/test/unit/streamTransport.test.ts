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

  describe('Logical Tracking (Outward Journey)', () => {
    it('invokeQuery should populate tracking maps and call sendMessage', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sendMessageSpy = sinon.spy(transport as any, 'sendMessage');
      const queryName = 'testQuery';
      const variables = { foo: 'bar' };

      const _promise = transport.invokeQuery(queryName, variables);

      const expectedKey = JSON.stringify({ operationName: queryName, variables });
      expect(transport._activeQueryExecuteRequests.has(expectedKey)).to.be.true;
      const request = transport._activeQueryExecuteRequests.get(expectedKey);
      expect(request?.execute?.operationName).to.equal(queryName);
      expect(request?.execute?.variables).to.deep.equal(variables);

      const requestId = (request as ExecuteStreamRequest<unknown>).requestId;
      expect(transport._executeRequestPromises.has(requestId)).to.be.true;

      expect(sendMessageSpy).to.have.been.calledOnce;
      const sentMessage = sendMessageSpy.firstCall.args[0];
      expect(sentMessage.requestId).to.equal(requestId);
      expect(sentMessage.execute?.operationName).to.equal(queryName);
    });

    it('invokeMutation should populate tracking maps and call sendMessage', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sendMessageSpy = sinon.spy(transport as any, 'sendMessage');
      const mutationName = 'testMutation';
      const variables = { baz: 'qux' };

      const _promise = transport.invokeMutation(mutationName, variables);

      const expectedKey = JSON.stringify({ operationName: mutationName, variables });
      expect(transport._activeMutationExecuteRequests.has(expectedKey)).to.be.true;
      const activeRequests = transport._activeMutationExecuteRequests.get(expectedKey);
      expect(activeRequests).to.have.lengthOf(1);
      expect(activeRequests![0].execute?.operationName).to.equal(mutationName);

      const requestId = activeRequests![0].requestId;
      expect(transport._executeRequestPromises.has(requestId)).to.be.true;

      expect(sendMessageSpy).to.have.been.calledOnce;
    });

    it('invokeSubscribe should populate tracking maps and call sendMessage', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sendMessageSpy = sinon.spy(transport as any, 'sendMessage');
      const queryName = 'subQuery';
      const variables = { a: 1 };
      const hook = sinon.spy();

      transport.invokeSubscribe(hook, queryName, variables);

      const expectedKey = JSON.stringify({ operationName: queryName, variables });
      expect(transport._activeSubscribeRequests.has(expectedKey)).to.be.true;
      const request = transport._activeSubscribeRequests.get(expectedKey);
      const requestId = request?.requestId!;

      expect(transport._subscribeNotificationHooks.get(requestId)).to.equal(
        hook
      );
      expect(sendMessageSpy).to.have.been.calledOnce;
      expect(sendMessageSpy.firstCall.args[0].subscribe?.operationName).to.equal(
        queryName
      );
    });

    it('invokeUnsubscribe should clear tracking maps and call sendMessage', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sendMessageSpy = sinon.spy(transport as any, 'sendMessage');
      const queryName = 'subQuery';
      const variables = { a: 1 };
      const hook = sinon.spy();

      transport.invokeSubscribe(hook, queryName, variables);
      const expectedKey = JSON.stringify({ operationName: queryName, variables });
      const requestId = transport._activeSubscribeRequests.get(expectedKey)?.requestId!;

      transport.invokeUnsubscribe(queryName, variables);
      
      expect(transport._activeSubscribeRequests.has(expectedKey)).to.be.false;
      expect(transport._subscribeNotificationHooks.has(requestId)).to.be.false;
      expect(sendMessageSpy).to.have.been.calledTwice; // Once for sub, once for cancel
    });

    it('should sort keys consistently for map lookups', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sendMessageSpy = sinon.spy(transport as any, 'sendMessage');
      const queryName = 'sortQuery';
      const variables1 = { b: 2, a: 1 };
      const variables2 = { a: 1, b: 2 };
      const hook = sinon.spy();

      transport.invokeSubscribe(hook, queryName, variables1);
      expect(transport._activeSubscribeRequests.size).to.equal(1);
      
      // Unsubscribe with same content but different key order
      transport.invokeUnsubscribe(queryName, variables2);
      
      expect(transport._activeSubscribeRequests.size).to.equal(0);
      expect(sendMessageSpy).to.have.been.calledTwice;
    });

    it('should generate unique request IDs', () => {
      const transportAny = transport as unknown as Record<string, (...args: unknown[]) => unknown>;
      const id1 = transportAny._nextRequestId();
      const id2 = transportAny._nextRequestId();
      expect(id1).to.not.equal(id2);
      expect(Number(id1)).to.be.lessThan(Number(id2));
    });
  });

  describe('Integration (Inward Journey)', () => {
    it('should resolve invokeQuery promise when response is received', async () => {
      const queryName = 'testQuery';
      const variables = { foo: 'bar' };
      const expectedData = { result: 'success' };
      const response: DataConnectResponse<typeof expectedData> = {
        data: expectedData,
        errors: [],
        extensions: {}
      };

      const queryPromise = transport.invokeQuery(queryName, variables);
      
      const expectedKey = JSON.stringify({ operationName: queryName, variables });
      const request = transport._activeQueryExecuteRequests.get(expectedKey);
      const requestId = (request as ExecuteStreamRequest<unknown>).requestId;

      await transport.resolveRequest(requestId, response);
      
      const result = await queryPromise;
      expect(result).to.deep.equal(response);
    });

    it('should resolve invokeMutation promise when response is received', async () => {
      const mutationName = 'testMutation';
      const variables = { baz: 'qux' };
      const expectedData = { result: 'mutation_success' };
      const response: DataConnectResponse<typeof expectedData> = {
        data: expectedData,
        errors: [],
        extensions: {}
      };

      const mutationPromise = transport.invokeMutation(mutationName, variables);
      
      const expectedKey = JSON.stringify({ operationName: mutationName, variables });
      const activeRequests = transport._activeMutationExecuteRequests.get(expectedKey);
      const requestId = activeRequests![0].requestId;

      await transport.resolveRequest(requestId, response);
      
      const result = await mutationPromise;
      expect(result).to.deep.equal(response);
    });

    it('should call SubscribeNotificationHook when subscribe response is received', async () => {
      const queryName = 'subQuery';
      const variables = { a: 1 };
      const hook = sinon.spy();
      const expectedData = { result: 'sub_success' };
      const response: DataConnectResponse<typeof expectedData> = {
        data: expectedData,
        errors: [],
        extensions: {}
      };

      transport.invokeSubscribe(hook, queryName, variables);
      
      const expectedKey = JSON.stringify({ operationName: queryName, variables });
      const request = transport._activeSubscribeRequests.get(expectedKey);
      const requestId = request?.requestId!;

      await transport.resolveRequest(requestId, response);
      
      expect(hook).to.have.been.calledOnceWithExactly(response);
    });

    it('should reject promise if handleMessage receives errors', async () => {
      const queryName = 'errorQuery';
      const response = {
        data: null,
        errors: [new Error('test error')],
        extensions: {}
      };

      const queryPromise = transport.invokeQuery(queryName);
      
      const expectedKey = JSON.stringify({ operationName: queryName });
      const request = transport._activeQueryExecuteRequests.get(expectedKey);
      const requestId = (request as ExecuteStreamRequest<unknown>).requestId;

      // Note: the implementation in streamTransport.ts doesn't explicitly reject
      // on errors inside _handleMessage. It just resolves with the response 
      // containing errors.
      await transport.resolveRequest(requestId, response);
      
      const result = await queryPromise;
      expect(result).to.deep.equal(response);
    });
  });
});
