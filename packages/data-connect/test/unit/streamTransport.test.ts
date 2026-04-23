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
import { AuthTokenProvider } from '../../src/core/FirebaseAuthProvider';
import * as logger from '../../src/logger';
import {
  CallerSdkType,
  CallerSdkTypeEnum,
  DataConnectResponse,
  getGoogApiClientValue
} from '../../src/network';
import {
  AbstractDataConnectStreamTransport,
  InvokeOperationPromise
} from '../../src/network/stream/streamTransport';
import {
  DataConnectStreamRequest,
  ExecuteStreamRequest,
  ResumeStreamRequest,
  SubscribeStreamRequest
} from '../../src/network/stream/wire';

import { expectIsNotSettled, sleep } from './testUtils';

chai.use(sinonChai);
chai.use(chaiAsPromised);

class TestStreamTransport extends AbstractDataConnectStreamTransport {
  get streamIsReady(): boolean {
    return true;
  }

  get endpointUrl(): string {
    return 'https://endpoint.url';
  }

  protected openConnection(): Promise<void> {
    return Promise.resolve();
  }
  protected closeConnection(): Promise<void> {
    return Promise.resolve();
  }
  protected ensureConnection(): Promise<void> {
    return Promise.resolve();
  }
  protected sendMessage<Variables>(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    requestBody: DataConnectStreamRequest<Variables>
  ): Promise<void> {
    return Promise.resolve();
  }

  /** Manually trigger onConnectionReady for testing purposes. */
  triggerOnConnectionReady(): void {
    this.onConnectionReady();
  }

  /** Manually invoke token change for testing purposes. */
  invokeOnAuthTokenChanged(token: string | null): void {
    this.onAuthTokenChanged(token);
  }

  /** Manually set auth token for testing purposes. */
  setAuthToken(token: string | null): void {
    this._authToken = token;
  }

  authProvider = {
    getAuth: () => ({ getUid: () => this._authToken }),
    getToken: (forceToken?: boolean) =>
      Promise.resolve({ accessToken: this._authToken || 'token' })
  } as unknown as AuthTokenProvider;

  /** Manually set app check token for testing purposes. */
  setAppCheckToken(token: string | null): void {
    this._appCheckToken = token;
  }

  /** Manually resolve a request for testing purposes. */
  invokeHandleResponse<Data>(
    requestId: string,
    response: DataConnectResponse<Data>
  ): Promise<void> {
    return this.handleResponse(requestId, response);
  }
}

/** Interface that exposes some private fields and methods of TestStreamTransport for testing purposes. */
interface TransportWithInternals {
  _connectorResourcePath: string;
  _isUsingGen: boolean;
  appId: string | undefined;
  _callerSdkType: CallerSdkType;
  _setCallerSdkType(type: CallerSdkType): void;
  invokeOnAuthTokenChanged(token: string | null): void;
  setAuthToken(token: string | null): void;
  authProvider: { getAuth: () => { getUid(): string | null } };
  setAppCheckToken(token: string | null): void;
  nextRequestId(): string;
  triggerOnConnectionReady(): void;
  closeConnection(): Promise<void>;
  cancelClose(): void;
  sendRequestMessage<Variables>(
    requestBody: DataConnectStreamRequest<Variables>
  ): Promise<void>;
  getWithAuth(forceToken?: boolean): Promise<string | null>;
  hasWaitedForInitialAuth: boolean;
  prepareMessage<
    Variables,
    StreamBody extends DataConnectStreamRequest<Variables>
  >(
    requestBody: StreamBody
  ): StreamBody;
  activeInvokeQueryRequests: Map<
    string,
    ExecuteStreamRequest<unknown> | ResumeStreamRequest
  >;
  queuedInvokeQueryRequests: Map<string, InvokeOperationPromise<unknown>>;
  activeInvokeMutationRequests: Map<
    string,
    Array<ExecuteStreamRequest<unknown>>
  >;
  activeInvokeSubscribeRequests: Map<string, SubscribeStreamRequest<unknown>>;
  executeRequestPromises: Map<string, InvokeOperationPromise<unknown>>;
  subscribeObservers: Map<string, unknown>;
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
  ): Promise<void>;
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
  const queryName1 = 'testQuery1';
  const queryName2 = 'testQuery2';
  const variables1 = { foo: 'bar', num: 1 };
  const variables2 = { abc: 'xyz', num: 2 };
  const mutationName1 = 'testMutation1';
  const mutationName2 = 'testMutation2';
  const expectedError = new Error('test error');

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
    transport.hasWaitedForInitialAuth = true;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('sendRequestMessage', () => {
    it('should wait until auth token and app check token have been initialized before sending the message', async () => {
      transport.hasWaitedForInitialAuth = false;

      let resolveAuth!: () => void;
      const authPromise = new Promise<string | null>(resolve => {
        resolveAuth = () => resolve('token');
      });

      const getWithAuthStub = sinon
        .stub(transport, 'getWithAuth')
        .returns(authPromise);
      const sendMessageSpy = sinon.spy(transport, 'sendMessage');

      const promise = transport.sendRequestMessage(unpreparedMessage);

      expect(getWithAuthStub).to.have.been.calledOnce;
      expect(sendMessageSpy).to.not.have.been.called;

      resolveAuth();
      await promise;

      expect(sendMessageSpy).to.have.been.calledOnce;
      expect(sendMessageSpy).to.have.been.calledAfter(getWithAuthStub);
    });
  });

  describe('prepareMessage', () => {
    it('should not change data fields', () => {
      const preparedMessage = transport.prepareMessage(unpreparedMessage);
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
          const preparedMessage = transport.prepareMessage(unpreparedMessage);
          expect(preparedMessage.headers).to.exist;
          expect(preparedMessage.headers?.['X-Firebase-Auth-Token']).to.equal(
            initialAuthToken
          );
        });

        it('should NOT add the same auth token to subsequent messages', () => {
          transport.prepareMessage(unpreparedMessage);
          const secondPreparedMessage =
            transport.prepareMessage(unpreparedMessage);
          expect(secondPreparedMessage.headers?.['X-Firebase-Auth-Token']).to.be
            .undefined;
        });

        it('should include auth token when it changes', () => {
          transport.prepareMessage(unpreparedMessage);
          const secondPreparedMessage =
            transport.prepareMessage(unpreparedMessage);
          expect(secondPreparedMessage.headers?.['X-Firebase-Auth-Token']).to.be
            .undefined;
          transport.setAuthToken(newAuthToken);
          const thirdPreparedMessage =
            transport.prepareMessage(unpreparedMessage);
          expect(
            thirdPreparedMessage.headers?.['X-Firebase-Auth-Token']
          ).to.equal(newAuthToken);
        });
      });

      describe('app check token', () => {
        it('should add app check token to the first message', () => {
          const firstPreparedMessage =
            transport.prepareMessage(unpreparedMessage);
          expect(firstPreparedMessage.headers).to.exist;
          expect(
            firstPreparedMessage.headers?.['X-Firebase-App-Check']
          ).to.equal(initialAppCheckToken);
        });

        it('should NOT add the same app check token to subsequent messages', () => {
          transport.prepareMessage(unpreparedMessage);
          const secondPreparedMessage =
            transport.prepareMessage(unpreparedMessage);
          expect(secondPreparedMessage.headers?.['X-Firebase-App-Check']).to.be
            .undefined;
        });

        it('should NOT include app check token when it changes', () => {
          transport.prepareMessage(unpreparedMessage);
          const secondPreparedMessage =
            transport.prepareMessage(unpreparedMessage);
          expect(secondPreparedMessage.headers?.['X-Firebase-App-Check']).to.be
            .undefined;
          transport.setAppCheckToken(newAppCheckToken);
          const thirdPreparedMessage =
            transport.prepareMessage(unpreparedMessage);
          expect(thirdPreparedMessage.headers?.['X-Firebase-App-Check']).to.be
            .undefined;
        });
      });

      describe('x-firebase-gmpid', () => {
        it('should add x-firebase-gmpid to every message if appId is set', () => {
          const firstPreparedMessage =
            transport.prepareMessage(unpreparedMessage);
          expect(firstPreparedMessage.headers).to.exist;
          expect(firstPreparedMessage.headers?.['x-firebase-gmpid']).to.equal(
            initialAppId
          );

          const secondPreparedMessage =
            transport.prepareMessage(unpreparedMessage);
          expect(secondPreparedMessage.headers?.['x-firebase-gmpid']).to.equal(
            initialAppId
          );

          transport.appId = newAppId;
          const thirdPreparedMessage =
            transport.prepareMessage(unpreparedMessage);
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
        const secondPreparedMessage =
          transport.prepareMessage(unpreparedMessage);
        expect(secondPreparedMessage.headers?.['X-Goog-Api-Client']).to.equal(
          expectedInitialGoogApiClientValue
        );
        transport._isUsingGen = true;
        transport._setCallerSdkType(CallerSdkTypeEnum.GeneratedReact);
        const expectedThirdGoogApiClientValue = getGoogApiClientValue(
          true,
          CallerSdkTypeEnum.GeneratedReact
        );
        const thirdPreparedMessage =
          transport.prepareMessage(unpreparedMessage);
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
        const secondPreparedMessage =
          transport.prepareMessage(unpreparedMessage);
        expect(secondPreparedMessage.name).to.be.undefined;
      });
    });

    it('should reset connection state on onConnectionReady()', () => {
      // First message receives the initial payload (name, appCheckToken, authToken)
      transport.prepareMessage(unpreparedMessage);

      // Second message should not have any of these initial fields
      const secondMessage = transport.prepareMessage(unpreparedMessage);
      expect(secondMessage.name).to.be.undefined;
      expect(secondMessage.headers?.['X-Firebase-App-Check']).to.be.undefined;
      expect(secondMessage.headers?.['X-Firebase-Auth-Token']).to.be.undefined;

      // Trigger the physical connection reset
      transport.triggerOnConnectionReady();

      // The next message should be treated as a "first" message again
      const thirdMessage = transport.prepareMessage(unpreparedMessage);
      expect(thirdMessage.name).to.equal(expectedName);
      expect(thirdMessage.headers?.['X-Firebase-App-Check']).to.equal(
        initialAppCheckToken
      );
      expect(thirdMessage.headers?.['X-Firebase-Auth-Token']).to.equal(
        initialAuthToken
      );
    });
  });

  describe('Request Tracking', () => {
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
        it('should populate tracking maps synchronously and then call sendMessage', async () => {
          const sendMessageSpy = sinon.spy(transport, 'sendMessage');

          const queryPromise = transport.invokeQuery(queryName1, variables1);

          const expectedKey = transport.getMapKey(queryName1, variables1);
          expect(transport.activeInvokeQueryRequests.has(expectedKey)).to.be
            .true;
          const request = transport.activeInvokeQueryRequests.get(expectedKey);
          expect(request?.execute?.operationName).to.equal(queryName1);
          expect(request?.execute?.variables).to.deep.equal(variables1);

          const requestId = request!.requestId;
          expect(transport.executeRequestPromises.has(requestId)).to.be.true;

          expect(sendMessageSpy).to.have.been.calledOnce;
          const sentMessage = sendMessageSpy.firstCall.args[0];
          expect(sentMessage.requestId).to.equal(requestId);
          expect(sentMessage.execute).to.not.be.undefined;
          expect(sentMessage.execute?.operationName).to.equal(queryName1);
          expect(sentMessage.execute?.variables).to.deep.equal(variables1);
          await expectIsNotSettled(queryPromise);
        });

        it('should asynchronously clean up and reject if sendMessage fails', async () => {
          const sendMessageStub = sinon
            .stub(transport, 'sendMessage')
            .rejects(expectedError);

          const queryPromise = transport.invokeQuery(queryName1, variables1);
          await expect(queryPromise).to.be.rejectedWith(expectedError);

          const mapKey = transport.getMapKey(queryName1, variables1);
          expect(transport.activeInvokeQueryRequests.has(mapKey)).to.be.false;

          const requestId = sendMessageStub.firstCall.args[0].requestId;
          expect(transport.executeRequestPromises.has(requestId)).to.be.false;
        });

        describe('optimizations', () => {
          describe('de-duplication of identical requests', () => {
            it('should send the first request and queue subsequent requests when they are identical', async () => {
              const sendMessageSpy = sinon.spy(transport, 'sendMessage');

              const promises = [];
              for (let i = 1; i <= 20; i++) {
                promises.push(transport.invokeQuery(queryName1, variables1));
              }
              const mapKey = transport.getMapKey(queryName1, variables1);

              expect(sendMessageSpy).to.have.been.calledOnce;
              const sentMessage = sendMessageSpy.firstCall.args[0];
              expect(sentMessage.execute?.operationName).to.equal(queryName1);

              expect(transport.activeInvokeQueryRequests.has(mapKey)).to.be
                .true;
              const activeRequest =
                transport.activeInvokeQueryRequests.get(mapKey);
              expect(activeRequest?.execute?.operationName).to.equal(
                queryName1
              );

              const queuedMap = transport.queuedInvokeQueryRequests;
              expect(queuedMap.has(mapKey)).to.be.true;

              // promises 1 and 2 should be different, but 2-20 should be the same!
              expect(promises[0]).to.not.equal(promises[1]);
              for (let i = 1; i < 20; i++) {
                expect(promises[i]).to.equal(promises[1]);
              }
            });

            it('should resolve only the first request when it completes', async () => {
              sinon.stub(transport, 'sendMessage').resolves();

              const promises = [];
              for (let i = 1; i <= 20; i++) {
                promises.push(transport.invokeQuery(queryName1, variables1));
              }

              const mapKey = transport.getMapKey(queryName1, variables1);
              const activeRequest =
                transport.activeInvokeQueryRequests.get(mapKey);
              const requestId1 = activeRequest!.requestId;

              const response1 = {
                data: { result: '1' },
                errors: [],
                extensions: {}
              };

              await transport.invokeHandleResponse(requestId1, response1);

              // verify promise 1 resolved, but other promises are not yet settled
              const result1 = await promises[0];
              expect(result1).to.deep.equal(response1);
              for (let i = 1; i < 20; i++) {
                await expectIsNotSettled(promises[i], 100);
              }
            });

            it('should send the next request and clear queue when first request completes', async () => {
              const sendMessageSpy = sinon.spy(transport, 'sendMessage');

              const promises = [];
              for (let i = 1; i <= 20; i++) {
                promises.push(transport.invokeQuery(queryName1, variables1));
              }

              const mapKey = transport.getMapKey(queryName1, variables1);
              const activeRequest =
                transport.activeInvokeQueryRequests.get(mapKey);
              const requestId1 = activeRequest!.requestId;

              const response1 = {
                data: { result: '1' },
                errors: [],
                extensions: {}
              };

              await transport.invokeHandleResponse(requestId1, response1);

              // verify queued request was popped + sent
              expect(transport.queuedInvokeQueryRequests.has(mapKey)).to.be
                .false;
              expect(transport.activeInvokeQueryRequests.has(mapKey)).to.be
                .true;
              expect(sendMessageSpy).to.have.been.calledTwice;
              const secondSentMessage = sendMessageSpy.secondCall.args[0];
              expect(secondSentMessage.execute?.operationName).to.equal(
                queryName1
              );
              expect(secondSentMessage.requestId).to.not.equal(requestId1);
            });

            it('should send the next request even if the first request fails with response errors', async () => {
              const sendMessageSpy = sinon.spy(transport, 'sendMessage');

              const promises = [];
              for (let i = 1; i <= 20; i++) {
                promises.push(transport.invokeQuery(queryName1, variables1));
              }

              const mapKey = transport.getMapKey(queryName1, variables1);
              const activeRequest =
                transport.activeInvokeQueryRequests.get(mapKey);
              const requestId1 = activeRequest!.requestId;
              const promise1 = promises[0];
              expect(transport.activeInvokeQueryRequests.has(mapKey)).to.be
                .true;
              expect(transport.queuedInvokeQueryRequests.has(mapKey)).to.be
                .true;

              const errorResponse = {
                data: null,
                errors: [new Error('Query failed')],
                extensions: {}
              };
              await transport.invokeHandleResponse(requestId1, errorResponse);

              await expect(promise1).to.be.rejectedWith(
                /DataConnect error while performing request/
              );
              expect(transport.queuedInvokeQueryRequests.has(mapKey)).to.be
                .false;
              expect(transport.activeInvokeQueryRequests.has(mapKey)).to.be
                .true;
              expect(sendMessageSpy).to.have.been.calledTwice;

              // queued request should not be affected by the failure of request 1
              const secondSentMessage = sendMessageSpy.secondCall.args[0];
              expect(secondSentMessage.execute?.operationName).to.equal(
                queryName1
              );
              expect(secondSentMessage.requestId).to.not.equal(requestId1);
              await expectIsNotSettled(promises[1], 100);
              const activeRequest2 =
                transport.activeInvokeQueryRequests.get(mapKey);
              const requestId2 = activeRequest2!.requestId;
              const response2 = {
                data: { result: '2' },
                errors: [],
                extensions: {}
              };
              await transport.invokeHandleResponse(requestId2, response2);
              const result2 = await promises[1];
              expect(result2).to.deep.equal(response2);
            });

            it('should send the next request even if the first request fails with errors', async () => {
              const sendMessageStub = sinon.stub(transport, 'sendMessage');
              sendMessageStub.onFirstCall().rejects(expectedError);
              sendMessageStub.onSecondCall().resolves();

              const promises = [];
              for (let i = 1; i <= 20; i++) {
                promises.push(transport.invokeQuery(queryName1, variables1));
              }

              const mapKey = transport.getMapKey(queryName1, variables1);
              const activeRequest =
                transport.activeInvokeQueryRequests.get(mapKey);
              const requestId1 = activeRequest!.requestId;

              await expect(promises[0]).to.be.rejectedWith(expectedError);
              expect(transport.queuedInvokeQueryRequests.has(mapKey)).to.be
                .false;
              expect(transport.activeInvokeQueryRequests.has(mapKey)).to.be
                .true;
              expect(sendMessageStub).to.have.been.calledTwice;

              const secondSentMessage = sendMessageStub.secondCall.args[0];
              expect(secondSentMessage.execute?.operationName).to.equal(
                queryName1
              );
              expect(secondSentMessage.requestId).to.not.equal(requestId1);
            });

            it('should resolve all waiting promises when a queued request completes', async () => {
              sinon.stub(transport, 'sendMessage').resolves();

              const promises = [];
              for (let i = 1; i <= 20; i++) {
                promises.push(transport.invokeQuery(queryName1, variables1));
              }

              const mapKey = transport.getMapKey(queryName1, variables1);
              const activeRequest1 =
                transport.activeInvokeQueryRequests.get(mapKey);
              const requestId1 = activeRequest1!.requestId;
              const response1 = {
                data: { result: '1' },
                errors: [],
                extensions: {}
              };
              await transport.invokeHandleResponse(requestId1, response1);

              const activeRequest2 =
                transport.activeInvokeQueryRequests.get(mapKey);
              const requestId2 = activeRequest2!.requestId;
              expect(requestId2).to.not.equal(requestId1);

              const response2 = {
                data: { result: '2' },
                errors: [],
                extensions: {}
              };

              await transport.invokeHandleResponse(requestId2, response2);

              // verify all queued promises resolved to response2, and nothing active or in queue
              for (let i = 1; i < 20; i++) {
                const result = await promises[i];
                expect(result).to.deep.equal(response2);
              }
              expect(transport.activeInvokeQueryRequests.has(mapKey)).to.be
                .false;
              expect(transport.queuedInvokeQueryRequests.has(mapKey)).to.be
                .false;
            });
          });
        });
      });

      describe('invokeMutation', () => {
        it('should populate tracking maps synchronously and then call sendMessage', async () => {
          const sendMessageSpy = sinon.spy(transport, 'sendMessage');

          const mutationPromise = transport.invokeMutation(
            mutationName1,
            variables1
          );

          const expectedKey = transport.getMapKey(mutationName1, variables1);
          const requests =
            transport.activeInvokeMutationRequests.get(expectedKey);
          expect(requests).to.have.lengthOf(1);
          expect(requests![0].execute?.operationName).to.equal(mutationName1);
          const requestId = requests![0].requestId;
          expect(transport.executeRequestPromises.has(requestId)).to.be.true;

          expect(sendMessageSpy).to.have.been.calledOnce;
          const sentMessage = sendMessageSpy.firstCall.args[0];
          expect(sentMessage.requestId).to.equal(requestId);
          expect(sentMessage.execute).to.not.be.undefined;
          expect(sentMessage.execute?.operationName).to.equal(mutationName1);
          expect(sentMessage.execute?.variables).to.deep.equal(variables1);
          await expectIsNotSettled(mutationPromise);
        });

        it('should asynchronously clean up and reject if sendMessage fails', async () => {
          const sendMessageStub = sinon
            .stub(transport, 'sendMessage')
            .rejects(expectedError);

          const mutationPromise = transport.invokeMutation(
            mutationName1,
            variables1
          );
          await expect(mutationPromise).to.be.rejectedWith(expectedError);

          const mapKey = transport.getMapKey(mutationName1, variables1);
          expect(transport.activeInvokeMutationRequests.has(mapKey)).to.be
            .false;

          const requestId = sendMessageStub.firstCall.args[0].requestId;
          expect(transport.executeRequestPromises.has(requestId)).to.be.false;
        });

        describe('de-duplication', () => {
          it('should NOT de-duplicate identical mutation requests', async () => {
            const sendMessageSpy = sinon.spy(transport, 'sendMessage');

            const promises = [];
            for (let i = 1; i <= 5; i++) {
              promises.push(
                transport.invokeMutation(mutationName1, variables1)
              );
            }

            expect(sendMessageSpy.callCount).to.equal(5);

            const mapKey = transport.getMapKey(mutationName1, variables1);
            const requests = transport.activeInvokeMutationRequests.get(mapKey);
            expect(requests).to.have.lengthOf(5);

            for (let i = 0; i < 5; i++) {
              for (let j = i + 1; j < 5; j++) {
                expect(promises[i]).to.not.equal(promises[j]);
              }
            }
          });

          it('mutation requests should resolve totally independent of one another', async () => {
            const sendMessageSpy = sinon.spy(transport, 'sendMessage');

            const promise1 = transport.invokeMutation(
              mutationName1,
              variables1
            );
            const promise2 = transport.invokeMutation(
              mutationName1,
              variables1
            );
            const promise3 = transport.invokeMutation(
              mutationName1,
              variables1
            );

            expect(sendMessageSpy.callCount).to.equal(3);

            const mapKey = transport.getMapKey(mutationName1, variables1);
            const requests = transport.activeInvokeMutationRequests.get(mapKey);
            expect(requests).to.have.lengthOf(3);

            const requestId1 = requests![0].requestId;
            const requestId2 = requests![1].requestId;
            const requestId3 = requests![2].requestId;

            const response1 = {
              data: { result: '1' },
              errors: [],
              extensions: {}
            };
            const response2 = {
              data: { result: '2' },
              errors: [],
              extensions: {}
            };
            const response3 = {
              data: { result: '3' },
              errors: [],
              extensions: {}
            };

            await transport.invokeHandleResponse(requestId1, response1);
            expect(await promise1).to.deep.equal(response1);
            await expectIsNotSettled(promise2, 100);
            await expectIsNotSettled(promise3, 100);

            await transport.invokeHandleResponse(requestId2, response2);
            expect(await promise1).to.deep.equal(response1);
            expect(await promise2).to.deep.equal(response2);
            await expectIsNotSettled(promise3, 100);

            await transport.invokeHandleResponse(requestId3, response3);
            expect(await promise1).to.deep.equal(response1);
            expect(await promise2).to.deep.equal(response2);
            expect(await promise3).to.deep.equal(response3);

            expect(transport.activeInvokeMutationRequests.has(mapKey)).to.be
              .false;
            expect(transport.executeRequestPromises.has(requestId1)).to.be
              .false;
            expect(transport.executeRequestPromises.has(requestId2)).to.be
              .false;
            expect(transport.executeRequestPromises.has(requestId3)).to.be
              .false;
          });
        });
      });

      describe('invokeSubscribe', () => {
        it('should populate tracking maps synchronously and then call sendMessage', async () => {
          const sendMessageSpy = sinon.spy(transport, 'sendMessage');
          const observer = {
            onData: sinon.spy(),
            onDisconnect: sinon.spy(),
            onError: sinon.spy()
          };

          transport.invokeSubscribe(observer, queryName1, variables1);

          const expectedKey = transport.getMapKey(queryName1, variables1);
          expect(transport.activeInvokeSubscribeRequests.has(expectedKey)).to.be
            .true;
          const request =
            transport.activeInvokeSubscribeRequests.get(expectedKey);
          expect(request?.subscribe?.operationName).to.equal(queryName1);
          expect(request?.subscribe?.variables).to.deep.equal(variables1);

          const requestId = request!.requestId;
          expect(transport.subscribeObservers.has(requestId)).to.be.true;

          expect(sendMessageSpy).to.have.been.calledOnce;
          const sentMessage = sendMessageSpy.firstCall.args[0];
          expect(sentMessage.requestId).to.equal(requestId);
          expect(sentMessage.subscribe).to.not.be.undefined;
          expect(sentMessage.subscribe?.operationName).to.equal(queryName1);
          expect(sentMessage.subscribe?.variables).to.deep.equal(variables1);
        });

        it('should de-duplicate identical subscribe requests', async () => {
          const sendMessageSpy = sinon.spy(transport, 'sendMessage');
          const observer1 = {
            onData: sinon.spy(),
            onDisconnect: sinon.spy(),
            onError: sinon.spy()
          };
          const observer2 = {
            onData: sinon.spy(),
            onDisconnect: sinon.spy(),
            onError: sinon.spy()
          };

          transport.invokeSubscribe(observer1, queryName1, variables1);
          transport.invokeSubscribe(observer2, queryName1, variables1);

          expect(sendMessageSpy.callCount).to.equal(1);
        });

        it('should asynchronously call observer with error and clean up if sendMessage fails', async () => {
          const sendMessageStub = sinon
            .stub(transport, 'sendMessage')
            .rejects(expectedError);
          const observer = {
            onData: sinon.spy(),
            onDisconnect: sinon.spy(),
            onError: sinon.spy()
          };

          transport.invokeSubscribe(observer, queryName1, variables1);

          // invokeSubscribe's sendMessage is fire and forget
          await sleep(500);
          expect(observer.onError).to.have.been.calledOnce;
          const result = observer.onError.firstCall.args[0];
          expect(result).to.equal(expectedError);

          const mapKey = transport.getMapKey(queryName1, variables1);
          expect(transport.activeInvokeSubscribeRequests.has(mapKey)).to.be
            .false;
          const requestId = sendMessageStub.firstCall.args[0].requestId;
          expect(transport.subscribeObservers.has(requestId)).to.be.false;
        });
      });

      describe('invokeUnsubscribe', () => {
        it('should de-populate tracking maps and call sendMessage', async () => {
          const sendMessageSpy = sinon.spy(transport, 'sendMessage');
          const observer = {
            onData: sinon.spy(),
            onDisconnect: sinon.spy(),
            onError: sinon.spy()
          };

          transport.invokeSubscribe(observer, queryName1, variables1);

          const expectedKey = transport.getMapKey(queryName1, variables1);
          expect(transport.activeInvokeSubscribeRequests.has(expectedKey)).to.be
            .true;
          const subscribeRequest =
            transport.activeInvokeSubscribeRequests.get(expectedKey);
          const subscribeRequestId = subscribeRequest!.requestId;
          expect(transport.subscribeObservers.has(subscribeRequestId)).to.be
            .true;

          transport.invokeUnsubscribe(queryName1, variables1);

          expect(sendMessageSpy).to.have.been.calledTwice;
          const unsubscribeMessage = sendMessageSpy.secondCall.args[0];

          expect(transport.activeInvokeSubscribeRequests.has(expectedKey)).to.be
            .false;
          expect(transport.subscribeObservers.has(subscribeRequestId)).to.be
            .false;
          expect(unsubscribeMessage.cancel).to.not.be.undefined;
        });

        it('should asynchronously clean up and log error if sendMessage fails', async () => {
          const logErrorStub = sinon.stub(logger, 'logError');
          const observer = {
            onData: sinon.spy(),
            onDisconnect: sinon.spy(),
            onError: sinon.spy()
          };

          const sendMessageStub = sinon.stub(transport, 'sendMessage');
          sendMessageStub.onFirstCall().resolves();
          sendMessageStub.onSecondCall().rejects(expectedError);

          transport.invokeSubscribe(observer, queryName1, variables1);

          const expectedKey = transport.getMapKey(queryName1, variables1);
          const subscribeRequest =
            transport.activeInvokeSubscribeRequests.get(expectedKey);
          const subscribeRequestId = subscribeRequest?.requestId!;

          transport.invokeUnsubscribe(queryName1, variables1);
          // invokeUnsubscribe's sendMessage is fire and forget
          await sleep(500);

          expect(sendMessageStub).to.have.been.calledTwice;
          expect(logErrorStub).to.have.been.calledOnce;
          expect(logErrorStub).to.have.been.calledWithMatch(
            'Stream Transport failed to send unsubscribe message'
          );

          expect(transport.activeInvokeSubscribeRequests.has(expectedKey)).to.be
            .false;
          expect(transport.subscribeObservers.has(subscribeRequestId)).to.be
            .false;
        });
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

      const errorResponse: DataConnectResponse<unknown> = {
        data: {},
        errors: [expectedError],
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
          `Stream response contained unrecognized requestId '${unknownRequestId}'`
        );
      });

      describe('invokeQuery tracking', async () => {
        it('should route data to resolve the correct query promise when response is received', async () => {
          const queryPromise1 = transport.invokeQuery(queryName1, variables1);
          const queryPromise2 = transport.invokeQuery(queryName2, variables2);

          const expectedKey1 = transport.getMapKey(queryName1, variables1);
          const request1 =
            transport.activeInvokeQueryRequests.get(expectedKey1);
          const requestId1 = request1!.requestId;
          const expectedKey2 = transport.getMapKey(queryName2, variables2);
          const request2 =
            transport.activeInvokeQueryRequests.get(expectedKey2);
          const requestId2 = request2!.requestId;

          await transport.invokeHandleResponse(requestId1, response1);
          const result1 = await queryPromise1;
          expect(result1).to.deep.equal(response1);

          await transport.invokeHandleResponse(requestId2, response2);
          const result2 = await queryPromise2;
          expect(result2).to.deep.equal(response2);
        });

        it('should clean map when response is received', async () => {
          const queryPromise1 = transport.invokeQuery(queryName1, variables1);
          const queryPromise2 = transport.invokeQuery(queryName2, variables2);

          const expectedKey1 = transport.getMapKey(queryName1, variables1);
          const request1 =
            transport.activeInvokeQueryRequests.get(expectedKey1);
          const requestId1 = request1!.requestId;
          const expectedKey2 = transport.getMapKey(queryName2, variables2);
          const request2 =
            transport.activeInvokeQueryRequests.get(expectedKey2);
          const requestId2 = request2!.requestId;

          await transport.invokeHandleResponse(requestId1, response1);
          await queryPromise1;
          expect(transport.activeInvokeQueryRequests.has(expectedKey1)).to.be
            .false;
          expect(transport.activeInvokeQueryRequests.has(expectedKey2)).to.be
            .true;

          await transport.invokeHandleResponse(requestId2, response2);
          await queryPromise2;

          expect(transport.activeInvokeQueryRequests.has(expectedKey1)).to.be
            .false;
          expect(transport.activeInvokeQueryRequests.has(expectedKey2)).to.be
            .false;
        });

        it('should reject the correct query promise with DataConnectOperationError if response has errors', async () => {
          const queryPromise1 = transport.invokeQuery(queryName1, variables1);
          const queryPromise2 = transport.invokeQuery(queryName2, variables2);
          const expectedKey1 = transport.getMapKey(queryName1, variables1);
          const expectedKey2 = transport.getMapKey(queryName2, variables2);
          const request1 =
            transport.activeInvokeQueryRequests.get(expectedKey1);
          const requestId1 = request1!.requestId;
          const request2 =
            transport.activeInvokeQueryRequests.get(expectedKey2);
          const requestId2 = request2!.requestId;

          await transport.invokeHandleResponse(requestId1, errorResponse);
          await transport.invokeHandleResponse(requestId2, errorResponse);
          await expect(queryPromise1).to.be.rejectedWith(
            `DataConnect error while performing request: ${JSON.stringify([
              expectedError
            ])}`
          );
          await expect(queryPromise2).to.be.rejectedWith(
            `DataConnect error while performing request: ${JSON.stringify([
              expectedError
            ])}`
          );
        });

        it('should clean map correctly when handleResponse rejects', async () => {
          void transport.invokeQuery(queryName1, variables1);
          void transport.invokeQuery(queryName2, variables2);

          const expectedKey1 = transport.getMapKey(queryName1, variables1);
          const request1 =
            transport.activeInvokeQueryRequests.get(expectedKey1);
          const requestId1 = request1!.requestId;
          const expectedKey2 = transport.getMapKey(queryName2, variables2);
          const request2 =
            transport.activeInvokeQueryRequests.get(expectedKey2);
          const requestId2 = request2!.requestId;

          await transport.invokeHandleResponse(requestId1, errorResponse);
          expect(transport.activeInvokeQueryRequests.has(expectedKey1)).to.be
            .false;
          expect(transport.executeRequestPromises.has(requestId1)).to.be.false;
          expect(transport.activeInvokeQueryRequests.has(expectedKey2)).to.be
            .true;
          expect(transport.executeRequestPromises.has(requestId2)).to.be.true;

          await transport.invokeHandleResponse(requestId2, errorResponse);
          expect(transport.activeInvokeQueryRequests.has(expectedKey2)).to.be
            .false;
          expect(transport.executeRequestPromises.has(requestId2)).to.be.false;
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
            transport.activeInvokeMutationRequests.get(expectedKey1);
          const requestId1 = activeRequests1![0].requestId;
          const expectedKey2 = transport.getMapKey(mutationName2, variables2);
          const activeRequests2 =
            transport.activeInvokeMutationRequests.get(expectedKey2);
          const requestId2 = activeRequests2![0].requestId;

          await transport.invokeHandleResponse(requestId1, response1);
          const result1 = await mutationPromise1;
          expect(result1).to.deep.equal(response1);
          await expectIsNotSettled(mutationPromise2);

          await transport.invokeHandleResponse(requestId2, response2);
          const result2 = await mutationPromise2;
          expect(result2).to.deep.equal(response2);
        });

        it('should clean map of the correct tracked request when response is received', async () => {
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
            transport.activeInvokeMutationRequests.get(expectedKey1);
          const requestId1 = activeRequests1![0].requestId;
          const expectedKey2 = transport.getMapKey(mutationName2, variables2);
          const activeRequests2 =
            transport.activeInvokeMutationRequests.get(expectedKey2);
          const requestId2 = activeRequests2![0].requestId;

          await transport.invokeHandleResponse(requestId1, response1);
          await mutationPromise1;
          expect(transport.executeRequestPromises.has(requestId1)).to.be.false;
          expect(transport.activeInvokeMutationRequests.has(expectedKey1)).to.be
            .false;
          expect(transport.executeRequestPromises.has(requestId2)).to.be.true;
          expect(transport.activeInvokeMutationRequests.has(expectedKey2)).to.be
            .true;

          await transport.invokeHandleResponse(requestId2, response2);
          await mutationPromise2;
          expect(transport.executeRequestPromises.has(requestId2)).to.be.false;
          expect(transport.activeInvokeMutationRequests.has(expectedKey2)).to.be
            .false;
        });

        it('should reject the correct mutation promise with DataConnectOperationError if response has errors', async () => {
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
            transport.activeInvokeMutationRequests.get(expectedKey1);
          const requestId1 = activeRequests1![0].requestId;
          const expectedKey2 = transport.getMapKey(mutationName2, variables2);
          const activeRequests2 =
            transport.activeInvokeMutationRequests.get(expectedKey2);
          const requestId2 = activeRequests2![0].requestId;

          await transport.invokeHandleResponse(requestId1, errorResponse);
          await expect(mutationPromise1).to.be.rejectedWith(
            `DataConnect error while performing request: ${JSON.stringify([
              expectedError
            ])}`
          );
          await expectIsNotSettled(mutationPromise2);

          await transport.invokeHandleResponse(requestId2, errorResponse);
          await expect(mutationPromise2).to.be.rejectedWith(
            `DataConnect error while performing request: ${JSON.stringify([
              expectedError
            ])}`
          );
        });

        it('should clean map correctly when handleResponse rejects', async () => {
          transport.invokeMutation(mutationName1, variables1).catch(() => { });
          transport.invokeMutation(mutationName2, variables2).catch(() => { });
          const expectedKey1 = transport.getMapKey(mutationName1, variables1);
          const expectedKey2 = transport.getMapKey(mutationName2, variables2);
          const activeRequests1 =
            transport.activeInvokeMutationRequests.get(expectedKey1);
          const activeRequests2 =
            transport.activeInvokeMutationRequests.get(expectedKey2);
          const requestId1 = activeRequests1![0].requestId;
          const requestId2 = activeRequests2![0].requestId;

          await transport.invokeHandleResponse(requestId1, errorResponse);
          expect(transport.activeInvokeMutationRequests.has(expectedKey1)).to.be
            .false;
          expect(transport.executeRequestPromises.has(requestId1)).to.be.false;
          expect(transport.activeInvokeMutationRequests.has(expectedKey2)).to.be
            .true;
          expect(transport.executeRequestPromises.has(requestId2)).to.be.true;

          await transport.invokeHandleResponse(requestId2, errorResponse);
          expect(transport.activeInvokeMutationRequests.has(expectedKey2)).to.be
            .false;
          expect(transport.executeRequestPromises.has(requestId2)).to.be.false;
        });
      });

      describe('invokeSubscribe tracking', async () => {
        const observer1 = {
          onData: sinon.spy(),
          onDisconnect: sinon.spy(),
          onError: sinon.spy()
        };
        const observer2 = {
          onData: sinon.spy(),
          onDisconnect: sinon.spy(),
          onError: sinon.spy()
        };

        afterEach(() => {
          observer1.onData.resetHistory();
          observer1.onDisconnect.resetHistory();
          observer1.onError.resetHistory();
          observer2.onData.resetHistory();
          observer2.onDisconnect.resetHistory();
          observer2.onError.resetHistory();
        });

        it('should route data to the correct subscribe observer whenever a response is received', async () => {
          transport.invokeSubscribe(observer1, queryName1, variables1);
          transport.invokeSubscribe(observer2, queryName2, variables2);

          const expectedKey1 = transport.getMapKey(queryName1, variables1);
          const request1 =
            transport.activeInvokeSubscribeRequests.get(expectedKey1);
          const requestId1 = request1?.requestId!;

          await transport.invokeHandleResponse(requestId1, response1);
          expect(observer1.onData).to.have.been.calledOnce;
          expect(observer1.onData).to.have.been.calledWithExactly(response1);
          await transport.invokeHandleResponse(requestId1, response2);
          expect(observer1.onData).to.have.been.calledTwice;
          expect(observer1.onData).to.have.been.calledWithExactly(response2);

          const expectedKey2 = transport.getMapKey(queryName2, variables2);
          const request2 =
            transport.activeInvokeSubscribeRequests.get(expectedKey2);
          const requestId2 = request2?.requestId!;

          await transport.invokeHandleResponse(requestId2, response3);
          expect(observer2.onData).to.have.been.calledOnce;
          expect(observer2.onData).to.have.been.calledWithExactly(response3);
          await transport.invokeHandleResponse(requestId2, response4);
          expect(observer2.onData).to.have.been.calledTwice;
          expect(observer2.onData).to.have.been.calledWithExactly(response4);
        });

        it('should route error response to the correct subscribe observer whenever an error response is received', async () => {
          transport.invokeSubscribe(observer1, queryName1, variables1);
          transport.invokeSubscribe(observer2, queryName2, variables2);

          const expectedKey1 = transport.getMapKey(queryName1, variables1);
          const request1 =
            transport.activeInvokeSubscribeRequests.get(expectedKey1);
          const requestId1 = request1?.requestId!;
          const expectedKey2 = transport.getMapKey(queryName2, variables2);
          const request2 =
            transport.activeInvokeSubscribeRequests.get(expectedKey2);
          const requestId2 = request2?.requestId!;

          await transport.invokeHandleResponse(requestId1, errorResponse);
          expect(observer1.onData).to.have.been.calledOnce;
          expect(observer1.onData).to.have.been.calledWithExactly(
            errorResponse
          );
          await transport.invokeHandleResponse(requestId2, errorResponse);
          expect(observer2.onData).to.have.been.calledOnce;
          expect(observer2.onData).to.have.been.calledWithExactly(
            errorResponse
          );
        });

        it('should NOT clean map when handleResponse rejects', async () => {
          transport.invokeSubscribe(observer1, queryName1, variables1);
          transport.invokeSubscribe(observer2, queryName2, variables2);
          const expectedKey1 = transport.getMapKey(queryName1, variables1);
          const expectedKey2 = transport.getMapKey(queryName2, variables2);
          const request1 =
            transport.activeInvokeSubscribeRequests.get(expectedKey1);
          const request2 =
            transport.activeInvokeSubscribeRequests.get(expectedKey2);
          const requestId1 = request1?.requestId!;
          const requestId2 = request2?.requestId!;

          await transport.invokeHandleResponse(requestId1, errorResponse);
          await transport.invokeHandleResponse(requestId2, errorResponse);
          expect(transport.activeInvokeSubscribeRequests.has(expectedKey1)).to
            .be.true;
          expect(transport.subscribeObservers.has(requestId1)).to.be.true;
          expect(transport.activeInvokeSubscribeRequests.has(expectedKey2)).to
            .be.true;
          expect(transport.subscribeObservers.has(requestId2)).to.be.true;
        });
      });
    });
  });

  describe('Disconnects', () => {
    let clock: sinon.SinonFakeTimers;

    beforeEach(() => {
      clock = sinon.useFakeTimers();
    });

    afterEach(() => {
      clock.restore();
    });

    it('should close connection after 60 seconds of idle (no active subscriptions)', async () => {
      const closeSpy = sinon.spy(transport, 'closeConnection');
      sinon.stub(transport, 'sendMessage').resolves();
      const observer = {
        onData: sinon.spy(),
        onDisconnect: sinon.spy(),
        onError: sinon.spy()
      };

      await transport.invokeSubscribe(observer, queryName1, variables1);
      await transport.invokeUnsubscribe(queryName1, variables1);

      await clock.tickAsync(1000 * 59);
      expect(closeSpy).to.not.have.been.called;

      await clock.tickAsync(1000 * 2);
      expect(closeSpy).to.have.been.calledOnce;
    });

    it('should cancel close if a new subscription arrives during timeout', async () => {
      const closeSpy = sinon.spy(transport, 'closeConnection');
      sinon.stub(transport, 'sendMessage').resolves();
      const observer = {
        onData: sinon.spy(),
        onDisconnect: sinon.spy(),
        onError: sinon.spy()
      };

      await transport.invokeSubscribe(observer, queryName1, variables1);
      await transport.invokeUnsubscribe(queryName1, variables1);

      await clock.tickAsync(1000 * 30);
      expect(closeSpy).to.not.have.been.called;

      await transport.invokeSubscribe(observer, queryName2, variables2);

      await clock.tickAsync(1000 * 65);
      expect(closeSpy).to.not.have.been.called;
    });

    it('should restart close timeout if subscribe fails and leaves no active subscriptions', async () => {
      const closeSpy = sinon.spy(transport, 'closeConnection');
      const sendMessageStub = sinon.stub(transport, 'sendMessage');
      sendMessageStub.resolves();
      const observer = {
        onData: sinon.spy(),
        onDisconnect: sinon.spy(),
        onError: sinon.spy()
      };

      await transport.invokeSubscribe(observer, queryName1, variables1);
      await transport.invokeUnsubscribe(queryName1, variables1);

      await clock.tickAsync(1000 * 30);
      expect(closeSpy).to.not.have.been.called;

      sendMessageStub.rejects();
      await transport.invokeSubscribe(observer, queryName2, variables2);

      await clock.tickAsync(1000 * 30);
      expect(closeSpy).to.not.have.been.called;

      await clock.tickAsync(1000 * 35);
      expect(closeSpy).to.have.been.calledOnce;
    });

    it('should not close connection if there are active execute requests', async () => {
      const closeSpy = sinon.spy(transport, 'closeConnection');
      sinon.stub(transport, 'sendMessage').resolves();
      const observer = {
        onData: sinon.spy(),
        onDisconnect: sinon.spy(),
        onError: sinon.spy()
      };

      await transport.invokeSubscribe(observer, queryName1, variables1);
      await transport.invokeUnsubscribe(queryName1, variables1);

      void transport.invokeQuery(queryName2, variables2);

      await clock.tickAsync(1000 * 65);
      expect(closeSpy).to.not.have.been.called;
    });

    it('should close connection when last execute request finishes after idle timeout', async () => {
      const closeSpy = sinon.spy(transport, 'closeConnection');
      sinon.stub(transport, 'sendMessage').resolves();
      const observer = {
        onData: sinon.spy(),
        onDisconnect: sinon.spy(),
        onError: sinon.spy()
      };

      await transport.invokeSubscribe(observer, queryName1, variables1);
      await transport.invokeUnsubscribe(queryName1, variables1);

      const queryPromise = transport.invokeQuery(queryName2, variables2);

      await clock.tickAsync(1000 * 65);
      expect(closeSpy).to.not.have.been.called;

      const expectedKey = transport.getMapKey(queryName2, variables2);
      const request = transport.activeInvokeQueryRequests.get(expectedKey);
      const requestId = request!.requestId;

      const dummyResponse = {
        data: { result: 'result' },
        errors: [],
        extensions: {}
      };
      await transport.invokeHandleResponse(requestId, dummyResponse);
      await queryPromise;

      expect(closeSpy).to.have.been.calledOnce;
    });

    describe('Auth Disconnects', () => {
      it('should close stream immediately on illegal auth change (login)', async () => {
        const closeSpy = sinon.spy(transport, 'closeConnection');
        const observer = {
          onData: sinon.spy(),
          onDisconnect: sinon.spy(),
          onError: sinon.spy()
        };

        transport.setAuthToken(null);
        const getAuthStub = sinon.stub(transport.authProvider, 'getAuth');
        getAuthStub.returns({ getUid: () => null });
        transport.invokeOnAuthTokenChanged(null); // Establish baseline (unauth)

        transport.invokeSubscribe(observer, queryName1, variables1);

        transport.setAuthToken('new-token');
        getAuthStub.returns({ getUid: () => 'some-uid' });
        transport.invokeOnAuthTokenChanged('new-token'); // Change (login)

        expect(closeSpy).to.have.been.calledOnce;
      });

      it('should close stream immediately on illegal auth change (logout)', async () => {
        const closeSpy = sinon.spy(transport, 'closeConnection');
        const observer = {
          onData: sinon.spy(),
          onDisconnect: sinon.spy(),
          onError: sinon.spy()
        };

        transport.setAuthToken('initial-token');
        const getAuthStub = sinon.stub(transport.authProvider, 'getAuth');
        getAuthStub.returns({ getUid: () => 'some-uid' });
        transport.invokeOnAuthTokenChanged('initial-token'); // Establish baseline (auth)

        transport.invokeSubscribe(observer, queryName1, variables1);

        transport.setAuthToken(null);
        getAuthStub.returns({ getUid: () => null });
        transport.invokeOnAuthTokenChanged(null); // Change (logout)

        expect(closeSpy).to.have.been.calledOnce;
      });

      it('should close stream immediately on illegal auth change (user change)', async () => {
        const closeSpy = sinon.spy(transport, 'closeConnection');
        const observer = {
          onData: sinon.spy(),
          onDisconnect: sinon.spy(),
          onError: sinon.spy()
        };

        transport.setAuthToken('token-a');
        const getAuthStub = sinon.stub(transport.authProvider, 'getAuth');
        getAuthStub.returns({ getUid: () => 'user-a' });
        transport.invokeOnAuthTokenChanged('token-a'); // Establish baseline (user A)

        transport.invokeSubscribe(observer, queryName1, variables1);

        transport.setAuthToken('token-b');
        getAuthStub.returns({ getUid: () => 'user-b' });
        transport.invokeOnAuthTokenChanged('token-b'); // Change (user B)

        expect(closeSpy).to.have.been.calledOnce;
      });

      it('should NOT close stream on valid auth token refresh (same user)', async () => {
        const closeSpy = sinon.spy(transport, 'closeConnection');
        const observer = {
          onData: sinon.spy(),
          onDisconnect: sinon.spy(),
          onError: sinon.spy()
        };

        transport.setAuthToken('initial-token');

        // Stub getUid to return the same user ID regardless of token
        sinon
          .stub(transport.authProvider, 'getAuth')
          .returns({ getUid: () => 'same-user' });

        transport.invokeOnAuthTokenChanged('initial-token'); // Establish baseline

        transport.invokeSubscribe(observer, queryName1, variables1);

        transport.setAuthToken('refreshed-token');
        transport.invokeOnAuthTokenChanged('refreshed-token'); // Refresh

        expect(closeSpy).to.not.have.been.called;
      });
    });
  });
});
