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

import { expect } from 'chai';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
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

chai.use(sinonChai);
chai.use(chaiAsPromised);

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
  ): Promise<void> {
    return Promise.resolve();
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
  invokeHandleResponse<Data>(
    requestId: string,
    response: DataConnectResponse<Data>
  ): Promise<void> {
    return this.handleResponse(requestId, response);
  }
}

/**
 * Interface that exposes some private fields and methods of TestStreamTransport for testing purposes.
 */
interface TransportWithInternals {
  nextRequestId(): string;
  _connectorResourcePath: string;
  _isUsingGen: boolean;
  appId: string | undefined;
  _callerSdkType: CallerSdkType;
  _setCallerSdkType(type: CallerSdkType): void;
  setAuthToken(token: string | null): void;
  setAppCheckToken(token: string | null): void;
  prepareMessage<
    Variables,
    StreamBody extends DataConnectStreamRequest<Variables>
  >(
    requestBody: StreamBody
  ): StreamBody;
  activeQueryExecuteRequests: Map<
    string,
    ExecuteStreamRequest<unknown> | ResumeStreamRequest
  >;
  activeMutationExecuteRequests: Map<
    string,
    Array<ExecuteStreamRequest<unknown>>
  >;
  activeSubscribeRequests: Map<string, SubscribeStreamRequest<unknown>>;
  executeRequestPromises: Map<
    string,
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolve: (data: any) => void;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reject: (err: any) => void;
      promise: Promise<DataConnectResponse<unknown>>;
    }
  >;
  subscribeNotificationHooks: Map<string, unknown>;
  getMapKey(operationName: string, variables?: unknown): string;
  invokeQuery<_Data, Variables>(
    queryName: string,
    variables?: Variables
  ): Promise<unknown>;
  invokeMutation<_Data, Variables>(
    mutationName: string,
    variables?: Variables
  ): Promise<unknown>;
  invokeSubscribe<_Data, Variables>(
    notify: unknown,
    queryName: string,
    variables: Variables
  ): void;
  invokeUnsubscribe<Variables>(queryName: string, variables: Variables): void;
  sendMessage<Variables>(
    requestBody: DataConnectStreamRequest<Variables>
  ): void;
  invokeHandleResponse<Data>(
    requestId: string,
    response: DataConnectResponse<Data>
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
  const initialAppId = 'initial-app-id';
  const newAppId = 'new-app-id';

  beforeEach(() => {
    transport = new TestStreamTransport(
      dcOptions
    ) as unknown as TransportWithInternals;
    expectedName = transport._connectorResourcePath;
    transport._isUsingGen = true;
    transport._callerSdkType = CallerSdkTypeEnum.Generated;
    expectedInitialGoogApiClientValue = getGoogApiClientValue(
      transport._isUsingGen,
      transport._callerSdkType
    );
    transport.setAuthToken(initialAuthToken);
    transport.setAppCheckToken(initialAppCheckToken);
    transport.appId = initialAppId;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('prepareMessage', () => {
    it('should not change data fields', () => {
      const preparedMessage = transport.prepareMessage(
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
          const preparedMessage = transport.prepareMessage(
            unpreparedMessage
          ) as DataConnectStreamRequest<unknown>;
          expect(preparedMessage.headers).to.exist;
          expect(preparedMessage.headers?.authToken).to.equal(initialAuthToken);
        });

        it('should NOT add the same auth token to subsequent messages', () => {
          transport.prepareMessage(unpreparedMessage);
          const secondPreparedMessage = transport.prepareMessage(
            unpreparedMessage
          ) as DataConnectStreamRequest<unknown>;
          expect(secondPreparedMessage.headers?.authToken).to.be.undefined;
        });

        it('should include auth token when it changes', () => {
          transport.prepareMessage(unpreparedMessage);
          const secondPreparedMessage = transport.prepareMessage(
            unpreparedMessage
          ) as DataConnectStreamRequest<unknown>;
          expect(secondPreparedMessage.headers?.authToken).to.be.undefined;
          transport.setAuthToken(newAuthToken);
          const thirdPreparedMessage = transport.prepareMessage(
            unpreparedMessage
          ) as DataConnectStreamRequest<unknown>;
          expect(thirdPreparedMessage.headers?.authToken).to.equal(
            newAuthToken
          );
        });
      });

      describe('app check token', () => {
        it('should add app check token to the first message', () => {
          const firstPreparedMessage = transport.prepareMessage(
            unpreparedMessage
          ) as DataConnectStreamRequest<unknown>;
          expect(firstPreparedMessage.headers).to.exist;
          expect(firstPreparedMessage.headers?.appCheckToken).to.equal(
            initialAppCheckToken
          );
        });

        it('should NOT add the same app check token to subsequent messages', () => {
          transport.prepareMessage(unpreparedMessage);
          const secondPreparedMessage = transport.prepareMessage(
            unpreparedMessage
          ) as DataConnectStreamRequest<unknown>;
          expect(secondPreparedMessage.headers?.appCheckToken).to.be.undefined;
        });

        it('should NOT include app check token when it changes', () => {
          transport.prepareMessage(unpreparedMessage);
          const secondPreparedMessage = transport.prepareMessage(
            unpreparedMessage
          ) as DataConnectStreamRequest<unknown>;
          expect(secondPreparedMessage.headers?.appCheckToken).to.be.undefined;
          transport.setAppCheckToken(newAppCheckToken);
          const thirdPreparedMessage = transport.prepareMessage(
            unpreparedMessage
          ) as DataConnectStreamRequest<unknown>;
          expect(thirdPreparedMessage.headers?.appCheckToken).to.be.undefined;
        });
      });

      describe('x-firebase-gmpid', () => {
        it('should add x-firebase-gmpid to every message if appId is set', () => {
          const firstPreparedMessage = transport.prepareMessage(
            unpreparedMessage
          ) as DataConnectStreamRequest<unknown>;
          expect(firstPreparedMessage.headers).to.exist;
          expect(firstPreparedMessage.headers?.['x-firebase-gmpid']).to.equal(
            initialAppId
          );

          const secondPreparedMessage = transport.prepareMessage(
            unpreparedMessage
          ) as DataConnectStreamRequest<unknown>;
          expect(secondPreparedMessage.headers?.['x-firebase-gmpid']).to.equal(
            initialAppId
          );

          transport.appId = newAppId;
          const thirdPreparedMessage = transport.prepareMessage(
            unpreparedMessage
          ) as DataConnectStreamRequest<unknown>;
          expect(thirdPreparedMessage.headers?.['x-firebase-gmpid']).to.equal(
            newAppId
          );
        });
      });

      it('should add X-Goog-Api-Client to every message based on caller sdk type', () => {
        const firstPreparedMessage =
          transport.prepareMessage(unpreparedMessage);
        expect(firstPreparedMessage.headers?.['X-Goog-Api-Client']).to.equal(
          expectedInitialGoogApiClientValue
        );
        const secondPreparedMessage = transport.prepareMessage(
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
        const thirdPreparedMessage = transport.prepareMessage(
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
          transport.prepareMessage(unpreparedMessage);
        expect(firstPreparedMessage.name).to.equal(expectedName);
      });

      it('should NOT add name to subsequent messages', () => {
        transport.prepareMessage(unpreparedMessage);
        const secondPreparedMessage = transport.prepareMessage(
          unpreparedMessage
        ) as DataConnectStreamRequest<unknown>;
        expect(secondPreparedMessage.name).to.be.undefined;
      });
    });

    it('should reset connection state on onConnectionReady()', () => {
      // First message receives the initial payload (name, appCheckToken, authToken)
      transport.prepareMessage(unpreparedMessage);

      // Second message should not have any of these initial fields
      const secondMessage = transport.prepareMessage(
        unpreparedMessage
      ) as DataConnectStreamRequest<unknown>;
      expect(secondMessage.name).to.be.undefined;
      expect(secondMessage.headers?.appCheckToken).to.be.undefined;
      expect(secondMessage.headers?.authToken).to.be.undefined;

      // Trigger the physical connection reset
      (transport as unknown as TestStreamTransport).triggerOnConnectionReady();

      // The next message should be treated as a "first" message again
      const thirdMessage = transport.prepareMessage(
        unpreparedMessage
      ) as DataConnectStreamRequest<unknown>;
      expect(thirdMessage.name).to.equal(expectedName);
      expect(thirdMessage.headers?.appCheckToken).to.equal(
        initialAppCheckToken
      );
      expect(thirdMessage.headers?.authToken).to.equal(initialAuthToken);
    });
  });

  describe('Request Tracking', () => {
    const queryName1 = 'testQuery1';
    const queryName2 = 'testQuery2';
    const variables1 = { foo: 'bar', num: 1 };
    const variables2 = { abc: 'xyz', num: 2 };
    const mutationName1 = 'testMutation1';
    const mutationName2 = 'testMutation2';

    it('getMapKey should sort keys consistently for map lookups', () => {
      const queryName = 'sortQuery';
      const variables1 = { a: 1, b: 2, c: 3, d: 4 };
      const variables2 = { b: 2, a: 1, d: 4, c: 3 };
      expect(transport.getMapKey(queryName, variables1)).to.equal(
        transport.getMapKey(queryName, variables2)
      );
    });

    it('should generate unique request IDs', () => {
      const id1 = transport.nextRequestId();
      const id2 = transport.nextRequestId();
      expect(id1).to.not.equal(id2);
      expect(Number(id1)).to.be.lessThan(Number(id2));
    });

    describe('Incoming Requests from Transport Layer', () => {
      describe('invokeQuery', () => {
        it('should populate tracking maps and call sendMessage', async () => {
          const sendMessageSpy = sinon.spy(transport, 'sendMessage');

          const queryPromise = transport.invokeQuery(queryName1, variables1);

          const didNotSettle = "invokeQuery unsettled after 3 seconds";
          const hasSettled = "invokeQuery DID settle!!!";
          const hasQueryPromiseSettled = Promise.race([
            queryPromise.then(() => hasSettled),
            new Promise((resolve) => {
              setTimeout(() => resolve(didNotSettle), 3000);
            })
          ]);

          const expectedKey = transport.getMapKey(queryName1, variables1);
          expect(transport.activeQueryExecuteRequests.has(expectedKey)).to.be
            .true;
          const request = transport.activeQueryExecuteRequests.get(expectedKey);
          expect(request?.execute?.operationName).to.equal(queryName1);
          expect(request?.execute?.variables).to.deep.equal(variables1);

          const requestId = (request as ExecuteStreamRequest<unknown>)
            .requestId;
          expect(transport.executeRequestPromises.has(requestId)).to.be.true;

          expect(sendMessageSpy).to.have.been.calledOnce;
          const sentMessage = sendMessageSpy.firstCall.args[0];
          expect(sentMessage.requestId).to.equal(requestId);
          expect(sentMessage.execute).to.not.be.undefined;
          expect(sentMessage.execute?.operationName).to.equal(queryName1);
          expect(sentMessage.execute?.variables).to.deep.equal(variables1);
          await expect(hasQueryPromiseSettled).to.eventually.equal(didNotSettle);
        });
      });

      describe('invokeMutation', () => {
        it('should populate tracking maps and call sendMessage', async () => {
          const sendMessageSpy = sinon.spy(transport, 'sendMessage');

          const mutationPromise = transport.invokeMutation(mutationName1, variables1);

          const didNotSettle = "invokeMutation unsettled after 3 seconds";
          const hasSettled = "invokeMutation DID settle!!!";
          const hasMutationPromiseSettled = Promise.race([
            mutationPromise.then(() => hasSettled),
            new Promise((resolve) => {
              setTimeout(() => resolve(didNotSettle), 3000);
            })
          ]);

          const expectedKey = transport.getMapKey(mutationName1, variables1);
          const activeRequests =
            transport.activeMutationExecuteRequests.get(expectedKey);
          expect(activeRequests).to.have.lengthOf(1);
          expect(activeRequests![0].execute?.operationName).to.equal(
            mutationName1
          );
          const requestId = activeRequests![0].requestId;
          expect(transport.executeRequestPromises.has(requestId)).to.be.true;

          expect(sendMessageSpy).to.have.been.calledOnce;
          const sentMessage = sendMessageSpy.firstCall.args[0];
          expect(sentMessage.requestId).to.equal(requestId);
          expect(sentMessage.execute).to.not.be.undefined;
          expect(sentMessage.execute?.operationName).to.equal(mutationName1);
          expect(sentMessage.execute?.variables).to.deep.equal(variables1);
          await expect(hasMutationPromiseSettled).to.eventually.equal(didNotSettle);
        });
      });

      describe('invokeSubscribe', () => {
        it('should populate tracking maps and call sendMessage', async () => {
          const sendMessageSpy = sinon.spy(transport, 'sendMessage');
          const hook = sinon.spy();

          transport.invokeSubscribe(hook, queryName1, variables1);

          const expectedKey = transport.getMapKey(queryName1, variables1);
          expect(transport.activeSubscribeRequests.has(expectedKey)).to.be.true;
          const request = transport.activeSubscribeRequests.get(expectedKey);
          expect(request?.subscribe?.operationName).to.equal(queryName1);
          expect(request?.subscribe?.variables).to.deep.equal(variables1);

          const requestId = (request as SubscribeStreamRequest<unknown>)
            .requestId;
          expect(transport.subscribeNotificationHooks.has(requestId)).to.be
            .true;

          expect(sendMessageSpy).to.have.been.calledOnce;
          const sentMessage = sendMessageSpy.firstCall.args[0];
          expect(sentMessage.requestId).to.equal(requestId);
          expect(sentMessage.subscribe).to.not.be.undefined;
          expect(sentMessage.subscribe?.operationName).to.equal(queryName1);
          expect(sentMessage.subscribe?.variables).to.deep.equal(variables1);
        });
      });

      describe('invokeUnsubscribe', () => {
        it('should de-populate tracking maps and call sendMessage', async () => {
          const sendMessageSpy = sinon.spy(transport, 'sendMessage');
          const hook = sinon.spy();

          transport.invokeSubscribe(hook, queryName1, variables1);

          const expectedKey = transport.getMapKey(queryName1, variables1);
          expect(transport.activeSubscribeRequests.has(expectedKey)).to.be.true;
          const subscribeRequest =
            transport.activeSubscribeRequests.get(expectedKey);
          const subscribeRequestId = (
            subscribeRequest as SubscribeStreamRequest<unknown>
          ).requestId;
          expect(transport.subscribeNotificationHooks.has(subscribeRequestId))
            .to.be.true;

          transport.invokeUnsubscribe(queryName1, variables1);

          expect(sendMessageSpy).to.have.been.calledTwice;
          const unsubscribeMessage = sendMessageSpy.secondCall.args[0];

          expect(transport.activeSubscribeRequests.has(expectedKey)).to.be
            .false;
          expect(transport.subscribeNotificationHooks.has(subscribeRequestId))
            .to.be.false;
          expect(unsubscribeMessage.cancel).to.not.be.undefined;
        });
      });

      describe('Incoming Responses from Server', () => {
        const expectedData1 = { result: 'result', num: 1 };
        const expectedData2 = { result: 'result', num: 2 };
        const expectedData3 = { result: 'result', num: 3 };
        const expectedData4 = { result: 'result', num: 4 };
        const response1: DataConnectResponse<typeof expectedData1> = {
          data: expectedData1,
          errors: [],
          extensions: {}
        };
        const response2: DataConnectResponse<typeof expectedData2> = {
          data: expectedData2,
          errors: [],
          extensions: {}
        };
        const response3: DataConnectResponse<typeof expectedData3> = {
          data: expectedData3,
          errors: [],
          extensions: {}
        };
        const response4: DataConnectResponse<typeof expectedData4> = {
          data: expectedData4,
          errors: [],
          extensions: {}
        };

        it('should throw an error if an unrecognized requestId is received', async () => {
          const unknownRequestId = 'unknown-999';
          const response: DataConnectResponse<unknown> = {
            data: {},
            errors: [],
            extensions: {}
          };
          const errorPromise = transport.invokeHandleResponse(
            unknownRequestId,
            response
          );
          await expect(errorPromise).to.be.rejectedWith(
            `Unrecognized requestId '${unknownRequestId}'`
          );
        });

        describe('invokeQuery tracking', async () => {
          it('should route data to resolve the correct query promise when response is received', async () => {
            const queryPromise1 = transport.invokeQuery(queryName1, variables1);
            const queryPromise2 = transport.invokeQuery(queryName2, variables2);

            const expectedKey1 = transport.getMapKey(queryName1, variables1);
            const request1 =
              transport.activeQueryExecuteRequests.get(expectedKey1);
            const requestId1 = (request1 as ExecuteStreamRequest<unknown>)
              .requestId;
            const expectedKey2 = transport.getMapKey(queryName2, variables2);
            const request2 =
              transport.activeQueryExecuteRequests.get(expectedKey2);
            const requestId2 = (request2 as ExecuteStreamRequest<unknown>)
              .requestId;

            await transport.invokeHandleResponse(requestId1, response1);
            await transport.invokeHandleResponse(requestId2, response2);
            const result1 = await queryPromise1;
            const result2 = await queryPromise2;

            expect(result1).to.deep.equal(response1);
            expect(result2).to.deep.equal(response2);
          });

          it('should clean map when response is received', async () => {
            const queryPromise1 = transport.invokeQuery(queryName1, variables1);
            const queryPromise2 = transport.invokeQuery(queryName2, variables2);

            const expectedKey1 = transport.getMapKey(queryName1, variables1);
            const request1 =
              transport.activeQueryExecuteRequests.get(expectedKey1);
            const requestId1 = (request1 as ExecuteStreamRequest<unknown>)
              .requestId;
            const expectedKey2 = transport.getMapKey(queryName2, variables2);
            const request2 =
              transport.activeQueryExecuteRequests.get(expectedKey2);
            const requestId2 = (request2 as ExecuteStreamRequest<unknown>)
              .requestId;

            await transport.invokeHandleResponse(requestId1, response1);
            await queryPromise1;
            expect(transport.activeQueryExecuteRequests.has(expectedKey1)).to.be
              .false;
            expect(transport.activeQueryExecuteRequests.has(expectedKey2)).to.be
              .true;

            await transport.invokeHandleResponse(requestId2, response2);
            await queryPromise2;

            expect(transport.activeQueryExecuteRequests.has(expectedKey1)).to.be
              .false;
            expect(transport.activeQueryExecuteRequests.has(expectedKey2)).to.be
              .false;
          });
        });

        describe('invokeMutation tracking', async () => {
          it('should route data to resolve the correct mutation promise when response is received', async () => {
            const mutationPromise1 = transport.invokeMutation(
              mutationName1,
              variables1
            );
            const mutationPromise2 = transport.invokeMutation(
              mutationName2,
              variables2
            );

            const expectedKey1 = transport.getMapKey(mutationName1, variables1);
            const activeRequests1 =
              transport.activeMutationExecuteRequests.get(expectedKey1);
            const requestId1 = activeRequests1![0].requestId;
            const expectedKey2 = transport.getMapKey(mutationName2, variables2);
            const activeRequests2 =
              transport.activeMutationExecuteRequests.get(expectedKey2);
            const requestId2 = activeRequests2![0].requestId;

            await transport.invokeHandleResponse(requestId1, response1);
            await transport.invokeHandleResponse(requestId2, response2);
            const result1 = await mutationPromise1;
            const result2 = await mutationPromise2;

            expect(result1).to.deep.equal(response1);
            expect(result2).to.deep.equal(response2);
          });

          it('should clean map when response is received', async () => {
            const mutationPromise1 = transport.invokeMutation(
              mutationName1,
              variables1
            );
            const mutationPromise2 = transport.invokeMutation(
              mutationName2,
              variables2
            );

            const expectedKey1 = transport.getMapKey(mutationName1, variables1);
            const activeRequests1 =
              transport.activeMutationExecuteRequests.get(expectedKey1);
            const requestId1 = activeRequests1![0].requestId;
            const expectedKey2 = transport.getMapKey(mutationName2, variables2);
            const activeRequests2 =
              transport.activeMutationExecuteRequests.get(expectedKey2);
            const requestId2 = activeRequests2![0].requestId;

            await transport.invokeHandleResponse(requestId1, response1);
            await mutationPromise1;
            expect(transport.activeMutationExecuteRequests.has(expectedKey1)).to
              .be.false;
            expect(transport.activeMutationExecuteRequests.has(expectedKey2)).to
              .be.true;

            await transport.invokeHandleResponse(requestId2, response2);
            await mutationPromise2;
            expect(transport.activeMutationExecuteRequests.has(expectedKey1)).to
              .be.false;
            expect(transport.activeMutationExecuteRequests.has(expectedKey2)).to
              .be.false;
          });
        });

        describe('invokeSubscribe tracking', async () => {
          const hook1 = sinon.spy();
          const hook2 = sinon.spy();

          afterEach(() => {
            hook1.resetHistory();
            hook2.resetHistory();
          });

          it('should route data to the correct subscribe hook whenever a response is received', async () => {
            transport.invokeSubscribe(hook1, queryName1, variables1);
            transport.invokeSubscribe(hook2, queryName2, variables2);

            const expectedKey1 = transport.getMapKey(queryName1, variables1);
            const request1 =
              transport.activeSubscribeRequests.get(expectedKey1);
            const requestId1 = request1?.requestId!;

            await transport.invokeHandleResponse(requestId1, response1);
            expect(hook1).to.have.been.calledOnce;
            expect(hook1).to.have.been.calledWithExactly(response1);
            await transport.invokeHandleResponse(requestId1, response2);
            expect(hook1).to.have.been.calledTwice;
            expect(hook1).to.have.been.calledWithExactly(response2);

            const expectedKey2 = transport.getMapKey(queryName2, variables2);
            const request2 =
              transport.activeSubscribeRequests.get(expectedKey2);
            const requestId2 = request2?.requestId!;

            await transport.invokeHandleResponse(requestId2, response3);
            expect(hook2).to.have.been.calledOnce;
            expect(hook2).to.have.been.calledWithExactly(response3);
            await transport.invokeHandleResponse(requestId2, response4);
            expect(hook2).to.have.been.calledTwice;
            expect(hook2).to.have.been.calledWithExactly(response4);
          });
        });
      });
    });
  });
});
