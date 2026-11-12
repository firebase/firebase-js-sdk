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

import { DataConnectOptions } from '../../src/api/DataConnect';
import { Code, DataConnectError } from '../../src/core/error';
import { AuthTokenProvider } from '../../src/core/FirebaseAuthProvider';
import { SDK_VERSION } from '../../src/core/version';
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

import { expectIsNotSettled, flushMicrotasks, sleep } from './testUtils';

vi.mock('../../src/logger', { spy: true });

class TestStreamTransport extends AbstractDataConnectStreamTransport {
  private isTestConnected = true;

  get streamIsReady(): boolean {
    return this.isTestConnected;
  }

  get endpointUrl(): string {
    return 'https://endpoint.url';
  }

  protected openConnection(): Promise<void> {
    this.isTestConnected = true;
    return Promise.resolve();
  }
  protected closeConnection(): Promise<void> {
    this.isTestConnected = false;
    return Promise.resolve();
  }
  protected ensureConnection(): Promise<void> {
    this.isTestConnected = true;
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
  cleanupAndTerminate(code?: Code, reason?: string): Promise<void>;
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
  resumeRequestPromises: Map<string, InvokeOperationPromise<unknown>>;
  pendingCancellations: Map<
    string,
    { operationName: string; variables: unknown }
  >;
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
  onStreamClose(code: number, reason: string): void;
  reconnectTimer: NodeJS.Timeout | null;
  onOnline(): void;
  onVisibilityChange(): void;
  ensureConnection(): Promise<void>;
  dispose(): Promise<void>;
  attemptReconnect(): void;
  onOnlineEventListener(): void;
  onVisibilityChangeEventListener(): void;
  onConnectionReady(): void;
  isTestConnected: boolean;
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

  describe('sendRequestMessage', () => {
    it('should wait until auth token and app check token have been initialized before sending the message', async () => {
      transport.hasWaitedForInitialAuth = false;

      let resolveAuth!: () => void;
      const authPromise = new Promise<string | null>(resolve => {
        resolveAuth = () => resolve('token');
      });

      const getWithAuthStub = vi
        .spyOn(transport, 'getWithAuth')
        .mockReturnValue(authPromise);
      const sendMessageSpy = vi.spyOn(transport, 'sendMessage');

      const promise = transport.sendRequestMessage(unpreparedMessage);

      expect(getWithAuthStub).toHaveBeenCalledTimes(1);
      expect(sendMessageSpy).not.toHaveBeenCalled();

      resolveAuth();
      await promise;

      expect(sendMessageSpy).toHaveBeenCalledTimes(1);
      expect(sendMessageSpy.mock.invocationCallOrder[0]).toBeGreaterThan(
        getWithAuthStub.mock.invocationCallOrder[0]
      );
    });
  });

  describe('prepareMessage', () => {
    it('should not change data fields', () => {
      const preparedMessage = transport.prepareMessage(unpreparedMessage);
      expect(preparedMessage.requestId).toBe(unpreparedMessage.requestId);
      expect(preparedMessage.execute).toBe(unpreparedMessage.execute);
      expect(preparedMessage.resume).toBe(unpreparedMessage.resume);
      expect(preparedMessage.subscribe).toBe(unpreparedMessage.subscribe);
      expect(preparedMessage.cancel).toBe(unpreparedMessage.cancel);
      expect(preparedMessage.dataEtag).toBe(unpreparedMessage.dataEtag);
    });

    describe('should handle headers properly', () => {
      describe('auth token', () => {
        it('should add auth token to the first message', () => {
          const preparedMessage = transport.prepareMessage(unpreparedMessage);
          expect(preparedMessage.headers).toBeDefined();
          expect(preparedMessage.headers?.['X-Firebase-Auth-Token']).toBe(
            initialAuthToken
          );
        });

        it('should NOT add the same auth token to subsequent messages', () => {
          transport.prepareMessage(unpreparedMessage);
          const secondPreparedMessage =
            transport.prepareMessage(unpreparedMessage);
          expect(
            secondPreparedMessage.headers?.['X-Firebase-Auth-Token']
          ).toBeUndefined();
        });

        it('should include auth token when it changes', () => {
          transport.prepareMessage(unpreparedMessage);
          const secondPreparedMessage =
            transport.prepareMessage(unpreparedMessage);
          expect(
            secondPreparedMessage.headers?.['X-Firebase-Auth-Token']
          ).toBeUndefined();
          transport.setAuthToken(newAuthToken);
          const thirdPreparedMessage =
            transport.prepareMessage(unpreparedMessage);
          expect(thirdPreparedMessage.headers?.['X-Firebase-Auth-Token']).toBe(
            newAuthToken
          );
        });
      });

      describe('app check token', () => {
        it('should add app check token to the first message', () => {
          const firstPreparedMessage =
            transport.prepareMessage(unpreparedMessage);
          expect(firstPreparedMessage.headers).toBeDefined();
          expect(firstPreparedMessage.headers?.['X-Firebase-AppCheck']).toBe(
            initialAppCheckToken
          );
        });

        it('should NOT add the same app check token to subsequent messages', () => {
          transport.prepareMessage(unpreparedMessage);
          const secondPreparedMessage =
            transport.prepareMessage(unpreparedMessage);
          expect(
            secondPreparedMessage.headers?.['X-Firebase-AppCheck']
          ).toBeUndefined();
        });

        it('should NOT include app check token when it changes', () => {
          transport.prepareMessage(unpreparedMessage);
          const secondPreparedMessage =
            transport.prepareMessage(unpreparedMessage);
          expect(
            secondPreparedMessage.headers?.['X-Firebase-AppCheck']
          ).toBeUndefined();
          transport.setAppCheckToken(newAppCheckToken);
          const thirdPreparedMessage =
            transport.prepareMessage(unpreparedMessage);
          expect(
            thirdPreparedMessage.headers?.['X-Firebase-AppCheck']
          ).toBeUndefined();
        });
      });

      describe('x-firebase-gmpid', () => {
        it('should add x-firebase-gmpid to every message if appId is set', () => {
          const firstPreparedMessage =
            transport.prepareMessage(unpreparedMessage);
          expect(firstPreparedMessage.headers).toBeDefined();
          expect(firstPreparedMessage.headers?.['x-firebase-gmpid']).toBe(
            initialAppId
          );

          const secondPreparedMessage =
            transport.prepareMessage(unpreparedMessage);
          expect(secondPreparedMessage.headers?.['x-firebase-gmpid']).toBe(
            initialAppId
          );

          transport.appId = newAppId;
          const thirdPreparedMessage =
            transport.prepareMessage(unpreparedMessage);
          expect(thirdPreparedMessage.headers?.['x-firebase-gmpid']).toBe(
            newAppId
          );
        });
      });

      it('should add X-Goog-Api-Client to every message based on caller sdk type', () => {
        const firstPreparedMessage =
          transport.prepareMessage(unpreparedMessage);
        expect(firstPreparedMessage.headers?.['X-Goog-Api-Client']).toBe(
          expectedInitialGoogApiClientValue
        );
        const secondPreparedMessage =
          transport.prepareMessage(unpreparedMessage);
        expect(secondPreparedMessage.headers?.['X-Goog-Api-Client']).toBe(
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
        expect(thirdPreparedMessage.headers?.['X-Goog-Api-Client']).toBe(
          expectedThirdGoogApiClientValue
        );
      });

      it('should add X-Client-Version to only the first message', () => {
        const firstPreparedMessage =
          transport.prepareMessage(unpreparedMessage);
        expect(firstPreparedMessage.headers?.['X-Client-Version']).toBe(
          `web/${SDK_VERSION}`
        );

        const secondPreparedMessage =
          transport.prepareMessage(unpreparedMessage);
        expect(
          secondPreparedMessage.headers?.['X-Client-Version']
        ).toBeUndefined();
      });
    });

    describe('should handle name properly', () => {
      it('should add name to the first message', () => {
        const firstPreparedMessage =
          transport.prepareMessage(unpreparedMessage);
        expect(firstPreparedMessage.name).toBe(expectedName);
      });

      it('should NOT add name to subsequent messages', () => {
        transport.prepareMessage(unpreparedMessage);
        const secondPreparedMessage =
          transport.prepareMessage(unpreparedMessage);
        expect(secondPreparedMessage.name).toBeUndefined();
      });
    });

    it('should reset connection state on onConnectionReady()', () => {
      // First message receives the initial payload (name, appCheckToken, authToken)
      transport.prepareMessage(unpreparedMessage);

      // Second message should not have any of these initial fields
      const secondMessage = transport.prepareMessage(unpreparedMessage);
      expect(secondMessage.name).toBeUndefined();
      expect(secondMessage.headers?.['X-Firebase-AppCheck']).toBeUndefined();
      expect(secondMessage.headers?.['X-Firebase-Auth-Token']).toBeUndefined();
      expect(secondMessage.headers?.['X-Client-Version']).toBeUndefined();

      // Trigger the physical connection reset
      transport.triggerOnConnectionReady();

      // The next message should be treated as a "first" message again
      const thirdMessage = transport.prepareMessage(unpreparedMessage);
      expect(thirdMessage.name).toBe(expectedName);
      expect(thirdMessage.headers?.['X-Firebase-AppCheck']).toBe(
        initialAppCheckToken
      );
      expect(thirdMessage.headers?.['X-Firebase-Auth-Token']).toBe(
        initialAuthToken
      );
      expect(thirdMessage.headers?.['X-Client-Version']).toBe(
        `web/${SDK_VERSION}`
      );
    });
  });

  describe('Request Tracking', () => {
    it('getMapKey should sort keys consistently for map lookups', () => {
      const queryName = 'sortQuery';
      const variables1 = { a: 1, b: 2, c: 3, d: 4 };
      const variables2 = { b: 2, a: 1, d: 4, c: 3 };
      expect(transport.getMapKey(queryName, variables1)).toBe(
        transport.getMapKey(queryName, variables2)
      );
    });

    it('should generate unique request IDs', () => {
      const id1 = transport.nextRequestId();
      const id2 = transport.nextRequestId();
      expect(id1).not.toBe(id2);
      expect(Number(id1)).toBeLessThan(Number(id2));
    });

    describe('Incoming Requests from Transport Layer', () => {
      describe('invokeQuery', () => {
        it('should populate tracking maps synchronously and then call sendMessage', async () => {
          const sendMessageSpy = vi.spyOn(transport, 'sendMessage');

          const queryPromise = transport.invokeQuery(queryName1, variables1);

          const expectedKey = transport.getMapKey(queryName1, variables1);
          expect(transport.activeInvokeQueryRequests.has(expectedKey)).toBe(
            true
          );
          const request = transport.activeInvokeQueryRequests.get(expectedKey);
          expect(request?.execute?.operationName).toBe(queryName1);
          expect(request?.execute?.variables).toEqual(variables1);

          const requestId = request!.requestId;
          expect(transport.executeRequestPromises.has(requestId)).toBe(true);

          expect(sendMessageSpy).toHaveBeenCalledTimes(1);
          const sentMessage = sendMessageSpy.mock.calls[0][0];
          expect(sentMessage.requestId).toBe(requestId);
          expect(sentMessage.execute).toBeDefined();
          expect(sentMessage.execute?.operationName).toBe(queryName1);
          expect(sentMessage.execute?.variables).toEqual(variables1);
          await expectIsNotSettled(queryPromise);
        });

        it('should asynchronously clean up and reject if sendMessage fails', async () => {
          const sendMessageStub = vi
            .spyOn(transport, 'sendMessage')
            .mockRejectedValue(expectedError);

          const queryPromise = transport.invokeQuery(queryName1, variables1);
          await expect(queryPromise).rejects.toThrow(expectedError);

          const mapKey = transport.getMapKey(queryName1, variables1);
          expect(transport.activeInvokeQueryRequests.has(mapKey)).toBe(false);

          const requestId = sendMessageStub.mock.calls[0][0].requestId;
          expect(transport.executeRequestPromises.has(requestId)).toBe(false);
        });

        describe('optimizations', () => {
          describe('prefer resume over execute when executing already subscribed queries', () => {
            it('should send a resume payload if there is an active subscription', async () => {
              const sendMessageSpy = vi.spyOn(transport, 'sendMessage');
              const observer = {
                onData: vi.fn(),
                onDisconnect: vi.fn(),
                onError: vi.fn()
              };

              transport.invokeSubscribe(observer, queryName1, variables1);
              expect(sendMessageSpy).toHaveBeenCalledTimes(1);
              const subscribeMessage = sendMessageSpy.mock.calls[0][0];
              expect(subscribeMessage.subscribe).toBeDefined();
              const subscribeRequestId = subscribeMessage.requestId;

              const queryPromise = transport.invokeQuery(
                queryName1,
                variables1
              );
              expect(sendMessageSpy).toHaveBeenCalledTimes(2);
              const resumeMessage = sendMessageSpy.mock.calls[1][0];
              expect(resumeMessage.resume).toBeDefined();
              expect(resumeMessage.requestId).toBe(subscribeRequestId);

              const response = {
                data: { result: '1' },
                errors: [],
                extensions: {}
              };
              await transport.invokeHandleResponse(
                subscribeRequestId,
                response
              );
              expect(await queryPromise).toEqual(response);
            });

            it('should resolve resume promise even if observer callback throws', async () => {
              vi.spyOn(transport, 'sendMessage').mockResolvedValue();
              const observer = {
                onData: vi.fn(() => {
                  throw new Error('Callback crashed');
                }),
                onDisconnect: vi.fn(),
                onError: vi.fn()
              };

              transport.invokeSubscribe(observer, queryName1, variables1);
              const subscribeRequestId =
                transport.activeInvokeSubscribeRequests.get(
                  transport.getMapKey(queryName1, variables1)
                )!.requestId;

              const queryPromise = transport.invokeQuery(
                queryName1,
                variables1
              );

              const response = {
                data: { result: '1' },
                errors: [],
                extensions: {}
              };

              await transport.invokeHandleResponse(
                subscribeRequestId,
                response
              );
              const result = await queryPromise;
              expect(result).toEqual(response);
            });
          });

          describe('de-duplication of identical requests', () => {
            it('should send the first request and queue subsequent requests when they are identical', async () => {
              const sendMessageSpy = vi.spyOn(transport, 'sendMessage');

              const promises = [];
              for (let i = 1; i <= 20; i++) {
                promises.push(transport.invokeQuery(queryName1, variables1));
              }
              const mapKey = transport.getMapKey(queryName1, variables1);

              expect(sendMessageSpy).toHaveBeenCalledTimes(1);
              const sentMessage = sendMessageSpy.mock.calls[0][0];
              expect(sentMessage.execute?.operationName).toBe(queryName1);

              expect(transport.activeInvokeQueryRequests.has(mapKey)).toBe(
                true
              );
              const activeRequest =
                transport.activeInvokeQueryRequests.get(mapKey);
              expect(activeRequest?.execute?.operationName).toBe(queryName1);

              const queuedMap = transport.queuedInvokeQueryRequests;
              expect(queuedMap.has(mapKey)).toBe(true);

              // promises 1 and 2 should be different, but 2-20 should be the same!
              expect(promises[0]).not.toBe(promises[1]);
              for (let i = 1; i < 20; i++) {
                expect(promises[i]).toBe(promises[1]);
              }
            });

            it('should resolve only the first request when it completes', async () => {
              vi.spyOn(transport, 'sendMessage').mockResolvedValue();

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
              expect(result1).toEqual(response1);
              for (let i = 1; i < 20; i++) {
                await expectIsNotSettled(promises[i], 100);
              }
            });

            it('should send the next request and clear queue when first request completes', async () => {
              const sendMessageSpy = vi.spyOn(transport, 'sendMessage');

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
              expect(transport.queuedInvokeQueryRequests.has(mapKey)).toBe(
                false
              );
              expect(transport.activeInvokeQueryRequests.has(mapKey)).toBe(
                true
              );
              expect(sendMessageSpy).toHaveBeenCalledTimes(2);
              const secondSentMessage = sendMessageSpy.mock.calls[1][0];
              expect(secondSentMessage.execute?.operationName).toBe(queryName1);
              expect(secondSentMessage.requestId).not.toBe(requestId1);
            });

            it('should send the next request even if the first request fails with response errors', async () => {
              const sendMessageSpy = vi.spyOn(transport, 'sendMessage');

              const promises = [];
              for (let i = 1; i <= 20; i++) {
                promises.push(transport.invokeQuery(queryName1, variables1));
              }

              const mapKey = transport.getMapKey(queryName1, variables1);
              const activeRequest =
                transport.activeInvokeQueryRequests.get(mapKey);
              const requestId1 = activeRequest!.requestId;
              const promise1 = promises[0];
              expect(transport.activeInvokeQueryRequests.has(mapKey)).toBe(
                true
              );
              expect(transport.queuedInvokeQueryRequests.has(mapKey)).toBe(
                true
              );

              const errorResponse = {
                data: null,
                errors: [new Error('Query failed')],
                extensions: {}
              };
              await transport.invokeHandleResponse(requestId1, errorResponse);

              await expect(promise1).rejects.toThrow(
                /DataConnect error while performing request/
              );
              expect(transport.queuedInvokeQueryRequests.has(mapKey)).toBe(
                false
              );
              expect(transport.activeInvokeQueryRequests.has(mapKey)).toBe(
                true
              );
              expect(sendMessageSpy).toHaveBeenCalledTimes(2);

              // queued request should not be affected by the failure of request 1
              const secondSentMessage = sendMessageSpy.mock.calls[1][0];
              expect(secondSentMessage.execute?.operationName).toBe(queryName1);
              expect(secondSentMessage.requestId).not.toBe(requestId1);
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
              expect(result2).toEqual(response2);
            });

            it('should send the next request even if the first request fails with errors', async () => {
              const sendMessageStub = vi
                .spyOn(transport, 'sendMessage')
                .mockRejectedValueOnce(expectedError)
                .mockResolvedValueOnce();

              const promises = [];
              for (let i = 1; i <= 20; i++) {
                promises.push(transport.invokeQuery(queryName1, variables1));
              }

              const mapKey = transport.getMapKey(queryName1, variables1);
              const activeRequest =
                transport.activeInvokeQueryRequests.get(mapKey);
              const requestId1 = activeRequest!.requestId;

              await expect(promises[0]).rejects.toThrow(expectedError);
              expect(transport.queuedInvokeQueryRequests.has(mapKey)).toBe(
                false
              );
              expect(transport.activeInvokeQueryRequests.has(mapKey)).toBe(
                true
              );
              expect(sendMessageStub).toHaveBeenCalledTimes(2);

              const secondSentMessage = sendMessageStub.mock.calls[1][0];
              expect(secondSentMessage.execute?.operationName).toBe(queryName1);
              expect(secondSentMessage.requestId).not.toBe(requestId1);
            });

            it('should resolve all waiting promises when a queued request completes', async () => {
              vi.spyOn(transport, 'sendMessage').mockResolvedValue();

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
              expect(requestId2).not.toBe(requestId1);

              const response2 = {
                data: { result: '2' },
                errors: [],
                extensions: {}
              };

              await transport.invokeHandleResponse(requestId2, response2);

              // verify all queued promises resolved to response2, and nothing active or in queue
              for (let i = 1; i < 20; i++) {
                const result = await promises[i];
                expect(result).toEqual(response2);
              }
              expect(transport.activeInvokeQueryRequests.has(mapKey)).toBe(
                false
              );
              expect(transport.queuedInvokeQueryRequests.has(mapKey)).toBe(
                false
              );
            });

            it('should de-duplicate identical resume requests', async () => {
              vi.spyOn(transport, 'sendMessage').mockResolvedValue();
              const observer = {
                onData: vi.fn(),
                onDisconnect: vi.fn(),
                onError: vi.fn()
              };

              transport.invokeSubscribe(observer, queryName1, variables1);

              const promises = [];
              for (let i = 1; i <= 20; i++) {
                promises.push(transport.invokeQuery(queryName1, variables1));
              }
              const mapKey = transport.getMapKey(queryName1, variables1);
              const queuedMap = transport.queuedInvokeQueryRequests;
              expect(queuedMap.has(mapKey)).toBe(true);

              // promises 1 and 2 should be different, but 2-20 should be the same!
              expect(promises[0]).not.toBe(promises[1]);
              for (let i = 1; i < 20; i++) {
                expect(promises[i]).toBe(promises[1]);
              }
            });

            it('should execute first, and then pop as resume if subscribed while waiting', async () => {
              const sendMessageSpy = vi.spyOn(transport, 'sendMessage');

              const queryPromise1 = transport.invokeQuery(
                queryName1,
                variables1
              );
              expect(sendMessageSpy).toHaveBeenCalledTimes(1);
              const executeMessage = sendMessageSpy.mock.calls[0][0];
              expect(executeMessage.execute).toBeDefined();
              const executeRequestId = executeMessage.requestId;

              void transport.invokeQuery(queryName1, variables1);
              expect(sendMessageSpy).toHaveBeenCalledTimes(1);

              const observer = {
                onData: vi.fn(),
                onDisconnect: vi.fn(),
                onError: vi.fn()
              };
              transport.invokeSubscribe(observer, queryName1, variables1);
              expect(sendMessageSpy).toHaveBeenCalledTimes(2);
              const subscribeRequestId =
                sendMessageSpy.mock.calls[1][0].requestId;

              const response1 = {
                data: { result: '1' },
                errors: [],
                extensions: {}
              };
              await transport.invokeHandleResponse(executeRequestId, response1);
              await queryPromise1;

              expect(sendMessageSpy).toHaveBeenCalledTimes(3);
              const resumeMessage = sendMessageSpy.mock.calls[2][0];
              expect(resumeMessage.resume).toBeDefined();
              expect(resumeMessage.requestId).toBe(subscribeRequestId);
            });

            it('should resume first, and then pop as execute if unsubscribed while waiting', async () => {
              const sendMessageSpy = vi.spyOn(transport, 'sendMessage');
              const observer = {
                onData: vi.fn(),
                onDisconnect: vi.fn(),
                onError: vi.fn()
              };

              transport.invokeSubscribe(observer, queryName1, variables1);
              expect(sendMessageSpy).toHaveBeenCalledTimes(1);
              const subscribeRequestId =
                sendMessageSpy.mock.calls[0][0].requestId;

              const queryPromise1 = transport.invokeQuery(
                queryName1,
                variables1
              );
              expect(sendMessageSpy).toHaveBeenCalledTimes(2);

              void transport.invokeQuery(queryName1, variables1);
              expect(sendMessageSpy).toHaveBeenCalledTimes(2);

              transport.invokeUnsubscribe(queryName1, variables1);
              expect(sendMessageSpy).toHaveBeenCalledTimes(2);

              const response1 = {
                data: { result: '1' },
                errors: [],
                extensions: {}
              };
              await transport.invokeHandleResponse(
                subscribeRequestId,
                response1
              );
              await queryPromise1;

              expect(sendMessageSpy.mock.calls.length).toBe(4);
              const cancelMessage = sendMessageSpy.mock.calls[2][0];
              expect(cancelMessage.cancel).toBeDefined();

              const executeMessage = sendMessageSpy.mock.calls[3][0];
              expect(executeMessage.execute).toBeDefined();
              expect(executeMessage.requestId).not.toBe(subscribeRequestId);
            });
          });
        });
      });

      describe('invokeMutation', () => {
        it('should populate tracking maps synchronously and then call sendMessage', async () => {
          const sendMessageSpy = vi.spyOn(transport, 'sendMessage');

          const mutationPromise = transport.invokeMutation(
            mutationName1,
            variables1
          );

          const expectedKey = transport.getMapKey(mutationName1, variables1);
          const requests =
            transport.activeInvokeMutationRequests.get(expectedKey);
          expect(requests).toHaveLength(1);
          expect(requests![0].execute?.operationName).toBe(mutationName1);
          const requestId = requests![0].requestId;
          expect(transport.executeRequestPromises.has(requestId)).toBe(true);

          expect(sendMessageSpy).toHaveBeenCalledTimes(1);
          const sentMessage = sendMessageSpy.mock.calls[0][0];
          expect(sentMessage.requestId).toBe(requestId);
          expect(sentMessage.execute).toBeDefined();
          expect(sentMessage.execute?.operationName).toBe(mutationName1);
          expect(sentMessage.execute?.variables).toEqual(variables1);
          await expectIsNotSettled(mutationPromise);
        });

        it('should asynchronously clean up and reject if sendMessage fails', async () => {
          const sendMessageStub = vi
            .spyOn(transport, 'sendMessage')
            .mockRejectedValue(expectedError);

          const mutationPromise = transport.invokeMutation(
            mutationName1,
            variables1
          );
          await expect(mutationPromise).rejects.toThrow(expectedError);

          const mapKey = transport.getMapKey(mutationName1, variables1);
          expect(transport.activeInvokeMutationRequests.has(mapKey)).toBe(
            false
          );

          const requestId = sendMessageStub.mock.calls[0][0].requestId;
          expect(transport.executeRequestPromises.has(requestId)).toBe(false);
        });

        describe('de-duplication', () => {
          it('should NOT de-duplicate identical mutation requests', async () => {
            const sendMessageSpy = vi.spyOn(transport, 'sendMessage');

            const promises = [];
            for (let i = 1; i <= 5; i++) {
              promises.push(
                transport.invokeMutation(mutationName1, variables1)
              );
            }

            expect(sendMessageSpy.mock.calls.length).toBe(5);

            const mapKey = transport.getMapKey(mutationName1, variables1);
            const requests = transport.activeInvokeMutationRequests.get(mapKey);
            expect(requests).toHaveLength(5);

            for (let i = 0; i < 5; i++) {
              for (let j = i + 1; j < 5; j++) {
                expect(promises[i]).not.toBe(promises[j]);
              }
            }
          });

          it('mutation requests should resolve totally independent of one another', async () => {
            const sendMessageSpy = vi.spyOn(transport, 'sendMessage');

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

            expect(sendMessageSpy.mock.calls.length).toBe(3);

            const mapKey = transport.getMapKey(mutationName1, variables1);
            const requests = transport.activeInvokeMutationRequests.get(mapKey);
            expect(requests).toHaveLength(3);

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
            expect(await promise1).toEqual(response1);
            await expectIsNotSettled(promise2, 100);
            await expectIsNotSettled(promise3, 100);

            await transport.invokeHandleResponse(requestId2, response2);
            expect(await promise1).toEqual(response1);
            expect(await promise2).toEqual(response2);
            await expectIsNotSettled(promise3, 100);

            await transport.invokeHandleResponse(requestId3, response3);
            expect(await promise1).toEqual(response1);
            expect(await promise2).toEqual(response2);
            expect(await promise3).toEqual(response3);

            expect(transport.activeInvokeMutationRequests.has(mapKey)).toBe(
              false
            );
            expect(transport.executeRequestPromises.has(requestId1)).toBe(
              false
            );
            expect(transport.executeRequestPromises.has(requestId2)).toBe(
              false
            );
            expect(transport.executeRequestPromises.has(requestId3)).toBe(
              false
            );
          });
        });
      });

      describe('invokeSubscribe', () => {
        it('should populate tracking maps synchronously and then call sendMessage', async () => {
          const sendMessageSpy = vi.spyOn(transport, 'sendMessage');
          const observer = {
            onData: vi.fn(),
            onDisconnect: vi.fn(),
            onError: vi.fn()
          };

          transport.invokeSubscribe(observer, queryName1, variables1);

          const expectedKey = transport.getMapKey(queryName1, variables1);
          expect(transport.activeInvokeSubscribeRequests.has(expectedKey)).toBe(
            true
          );
          const request =
            transport.activeInvokeSubscribeRequests.get(expectedKey);
          expect(request?.subscribe?.operationName).toBe(queryName1);
          expect(request?.subscribe?.variables).toEqual(variables1);

          const requestId = request!.requestId;
          expect(transport.subscribeObservers.has(requestId)).toBe(true);

          expect(sendMessageSpy).toHaveBeenCalledTimes(1);
          const sentMessage = sendMessageSpy.mock.calls[0][0];
          expect(sentMessage.requestId).toBe(requestId);
          expect(sentMessage.subscribe).toBeDefined();
          expect(sentMessage.subscribe?.operationName).toBe(queryName1);
          expect(sentMessage.subscribe?.variables).toEqual(variables1);
        });

        it('should de-duplicate identical subscribe requests', async () => {
          const sendMessageSpy = vi.spyOn(transport, 'sendMessage');
          const observer1 = {
            onData: vi.fn(),
            onDisconnect: vi.fn(),
            onError: vi.fn()
          };
          const observer2 = {
            onData: vi.fn(),
            onDisconnect: vi.fn(),
            onError: vi.fn()
          };

          transport.invokeSubscribe(observer1, queryName1, variables1);
          transport.invokeSubscribe(observer2, queryName1, variables1);

          expect(sendMessageSpy.mock.calls.length).toBe(1);
        });

        it('should asynchronously call observer with error and clean up if sendMessage fails', async () => {
          const sendMessageStub = vi
            .spyOn(transport, 'sendMessage')
            .mockRejectedValue(expectedError);
          const observer = {
            onData: vi.fn(),
            onDisconnect: vi.fn(),
            onError: vi.fn()
          };

          transport.invokeSubscribe(observer, queryName1, variables1);

          // invokeSubscribe's sendMessage is fire and forget
          await sleep(500);
          expect(observer.onError).toHaveBeenCalledTimes(1);
          const result = observer.onError.mock.calls[0][0];
          expect(result).toBe(expectedError);

          const mapKey = transport.getMapKey(queryName1, variables1);
          expect(transport.activeInvokeSubscribeRequests.has(mapKey)).toBe(
            false
          );
          const requestId = sendMessageStub.mock.calls[0][0].requestId;
          expect(transport.subscribeObservers.has(requestId)).toBe(false);
        });
      });

      describe('invokeUnsubscribe', () => {
        it('should de-populate tracking maps and call sendMessage', async () => {
          const sendMessageSpy = vi.spyOn(transport, 'sendMessage');
          const observer = {
            onData: vi.fn(),
            onDisconnect: vi.fn(),
            onError: vi.fn()
          };

          transport.invokeSubscribe(observer, queryName1, variables1);

          const expectedKey = transport.getMapKey(queryName1, variables1);
          expect(transport.activeInvokeSubscribeRequests.has(expectedKey)).toBe(
            true
          );
          const subscribeRequest =
            transport.activeInvokeSubscribeRequests.get(expectedKey);
          const subscribeRequestId = subscribeRequest!.requestId;
          expect(transport.subscribeObservers.has(subscribeRequestId)).toBe(
            true
          );

          transport.invokeUnsubscribe(queryName1, variables1);

          expect(sendMessageSpy).toHaveBeenCalledTimes(2);
          const unsubscribeMessage = sendMessageSpy.mock.calls[1][0];

          expect(transport.activeInvokeSubscribeRequests.has(expectedKey)).toBe(
            false
          );
          expect(transport.subscribeObservers.has(subscribeRequestId)).toBe(
            false
          );
          expect(unsubscribeMessage.cancel).toBeDefined();
        });

        it('should asynchronously clean up and log error if sendMessage fails', async () => {
          const logErrorStub = vi
            .spyOn(logger, 'logError')
            .mockImplementation(() => {});
          const observer = {
            onData: vi.fn(),
            onDisconnect: vi.fn(),
            onError: vi.fn()
          };

          const sendMessageStub = vi
            .spyOn(transport, 'sendMessage')
            .mockResolvedValueOnce()
            .mockRejectedValueOnce(expectedError);

          transport.invokeSubscribe(observer, queryName1, variables1);

          const expectedKey = transport.getMapKey(queryName1, variables1);
          const subscribeRequest =
            transport.activeInvokeSubscribeRequests.get(expectedKey);
          const subscribeRequestId = subscribeRequest?.requestId!;

          transport.invokeUnsubscribe(queryName1, variables1);
          // invokeUnsubscribe's sendMessage is fire and forget
          await sleep(500);

          expect(sendMessageStub).toHaveBeenCalledTimes(2);
          expect(logErrorStub).toHaveBeenCalledTimes(1);
          expect(logErrorStub).toHaveBeenCalledWith(
            expect.stringContaining(
              'Stream Transport failed to send unsubscribe message'
            )
          );

          expect(transport.activeInvokeSubscribeRequests.has(expectedKey)).toBe(
            false
          );
          expect(transport.subscribeObservers.has(subscribeRequestId)).toBe(
            false
          );
        });

        it('should defer cancellation if there is a pending resume request', async () => {
          const sendMessageSpy = vi.spyOn(transport, 'sendMessage');
          const observer = {
            onData: vi.fn(),
            onDisconnect: vi.fn(),
            onError: vi.fn()
          };

          transport.invokeSubscribe(observer, queryName1, variables1);
          const subscribeRequestId = sendMessageSpy.mock.calls[0][0].requestId;

          const queryPromise = transport.invokeQuery(queryName1, variables1);
          expect(sendMessageSpy).toHaveBeenCalledTimes(2);

          // Unsubscribe while resume is pending
          transport.invokeUnsubscribe(queryName1, variables1);
          // Should NOT have sent cancel message yet
          expect(sendMessageSpy).toHaveBeenCalledTimes(2);

          const response = {
            data: { result: '1' },
            errors: [],
            extensions: {}
          };
          await transport.invokeHandleResponse(subscribeRequestId, response);
          expect(await queryPromise).toEqual(response);

          // Now cancel message should be sent
          expect(sendMessageSpy).toHaveBeenCalledTimes(3);
          const cancelMessage = sendMessageSpy.mock.calls[2][0];
          expect(cancelMessage.cancel).toBeDefined();
          expect(cancelMessage.requestId).toBe(subscribeRequestId);
        });

        it('should resurrect a subscription if re-subscribed while pending cancellation', async () => {
          vi.spyOn(transport, 'sendMessage').mockResolvedValue();
          const observer1 = {
            onData: vi.fn(),
            onDisconnect: vi.fn(),
            onError: vi.fn()
          };
          const observer2 = {
            onData: vi.fn(),
            onDisconnect: vi.fn(),
            onError: vi.fn()
          };

          transport.invokeSubscribe(observer1, queryName1, variables1);
          const subscribeRequestId =
            transport.activeInvokeSubscribeRequests.get(
              transport.getMapKey(queryName1, variables1)
            )!.requestId;

          // Start a resume to put it in flight
          void transport.invokeQuery(queryName1, variables1);

          // Unsubscribe -> goes to pendingCancellations
          transport.invokeUnsubscribe(queryName1, variables1);
          expect(transport.pendingCancellations.has(subscribeRequestId)).toBe(
            true
          );
          expect(transport.subscribeObservers.has(subscribeRequestId)).toBe(
            false
          );

          // Re-subscribe -> should resurrect!
          transport.invokeSubscribe(observer2, queryName1, variables1);
          expect(transport.pendingCancellations.has(subscribeRequestId)).toBe(
            false
          );
          expect(transport.subscribeObservers.get(subscribeRequestId)).toBe(
            observer2
          );
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

      it('should log an error if an unrecognized requestId is received', async () => {
        const logErrorStub = vi
          .spyOn(logger, 'logError')
          .mockImplementation(() => {});
        const unknownRequestId = 'unknown-999';
        const response: DataConnectResponse<unknown> = {
          data: {},
          errors: [],
          extensions: {}
        };
        await transport.invokeHandleResponse(unknownRequestId, response);
        expect(logErrorStub).toHaveBeenCalledTimes(1);
        expect(logErrorStub).toHaveBeenCalledWith(
          expect.stringContaining(
            `Stream response contained unrecognized requestId '${unknownRequestId}'`
          )
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
          expect(result1).toEqual(response1);

          await transport.invokeHandleResponse(requestId2, response2);
          const result2 = await queryPromise2;
          expect(result2).toEqual(response2);
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
          expect(transport.activeInvokeQueryRequests.has(expectedKey1)).toBe(
            false
          );
          expect(transport.activeInvokeQueryRequests.has(expectedKey2)).toBe(
            true
          );

          await transport.invokeHandleResponse(requestId2, response2);
          await queryPromise2;

          expect(transport.activeInvokeQueryRequests.has(expectedKey1)).toBe(
            false
          );
          expect(transport.activeInvokeQueryRequests.has(expectedKey2)).toBe(
            false
          );
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
          await expect(queryPromise1).rejects.toThrow(
            `DataConnect error while performing request: ${JSON.stringify([
              expectedError
            ])}`
          );
          await expect(queryPromise2).rejects.toThrow(
            `DataConnect error while performing request: ${JSON.stringify([
              expectedError
            ])}`
          );
        });

        it('should clean map correctly when handleResponse rejects', async () => {
          transport.invokeQuery(queryName1, variables1).catch(() => {});
          transport.invokeQuery(queryName2, variables2).catch(() => {});

          const expectedKey1 = transport.getMapKey(queryName1, variables1);
          const request1 =
            transport.activeInvokeQueryRequests.get(expectedKey1);
          const requestId1 = request1!.requestId;
          const expectedKey2 = transport.getMapKey(queryName2, variables2);
          const request2 =
            transport.activeInvokeQueryRequests.get(expectedKey2);
          const requestId2 = request2!.requestId;

          await transport.invokeHandleResponse(requestId1, errorResponse);
          expect(transport.activeInvokeQueryRequests.has(expectedKey1)).toBe(
            false
          );
          expect(transport.executeRequestPromises.has(requestId1)).toBe(false);
          expect(transport.activeInvokeQueryRequests.has(expectedKey2)).toBe(
            true
          );
          expect(transport.executeRequestPromises.has(requestId2)).toBe(true);

          await transport.invokeHandleResponse(requestId2, errorResponse);
          expect(transport.activeInvokeQueryRequests.has(expectedKey2)).toBe(
            false
          );
          expect(transport.executeRequestPromises.has(requestId2)).toBe(false);
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
          expect(result1).toEqual(response1);
          await expectIsNotSettled(mutationPromise2);

          await transport.invokeHandleResponse(requestId2, response2);
          const result2 = await mutationPromise2;
          expect(result2).toEqual(response2);
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
          expect(transport.executeRequestPromises.has(requestId1)).toBe(false);
          expect(transport.activeInvokeMutationRequests.has(expectedKey1)).toBe(
            false
          );
          expect(transport.executeRequestPromises.has(requestId2)).toBe(true);
          expect(transport.activeInvokeMutationRequests.has(expectedKey2)).toBe(
            true
          );

          await transport.invokeHandleResponse(requestId2, response2);
          await mutationPromise2;
          expect(transport.executeRequestPromises.has(requestId2)).toBe(false);
          expect(transport.activeInvokeMutationRequests.has(expectedKey2)).toBe(
            false
          );
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
          await expect(mutationPromise1).rejects.toThrow(
            `DataConnect error while performing request: ${JSON.stringify([
              expectedError
            ])}`
          );
          await expectIsNotSettled(mutationPromise2);

          await transport.invokeHandleResponse(requestId2, errorResponse);
          await expect(mutationPromise2).rejects.toThrow(
            `DataConnect error while performing request: ${JSON.stringify([
              expectedError
            ])}`
          );
        });

        it('should clean map correctly when handleResponse rejects', async () => {
          transport.invokeMutation(mutationName1, variables1).catch(() => {});
          transport.invokeMutation(mutationName2, variables2).catch(() => {});
          const expectedKey1 = transport.getMapKey(mutationName1, variables1);
          const expectedKey2 = transport.getMapKey(mutationName2, variables2);
          const activeRequests1 =
            transport.activeInvokeMutationRequests.get(expectedKey1);
          const activeRequests2 =
            transport.activeInvokeMutationRequests.get(expectedKey2);
          const requestId1 = activeRequests1![0].requestId;
          const requestId2 = activeRequests2![0].requestId;

          await transport.invokeHandleResponse(requestId1, errorResponse);
          expect(transport.activeInvokeMutationRequests.has(expectedKey1)).toBe(
            false
          );
          expect(transport.executeRequestPromises.has(requestId1)).toBe(false);
          expect(transport.activeInvokeMutationRequests.has(expectedKey2)).toBe(
            true
          );
          expect(transport.executeRequestPromises.has(requestId2)).toBe(true);

          await transport.invokeHandleResponse(requestId2, errorResponse);
          expect(transport.activeInvokeMutationRequests.has(expectedKey2)).toBe(
            false
          );
          expect(transport.executeRequestPromises.has(requestId2)).toBe(false);
        });
      });

      describe('invokeSubscribe tracking', async () => {
        const observer1 = {
          onData: vi.fn(),
          onDisconnect: vi.fn(),
          onError: vi.fn()
        };
        const observer2 = {
          onData: vi.fn(),
          onDisconnect: vi.fn(),
          onError: vi.fn()
        };

        afterEach(() => {
          observer1.onData.mockClear();
          observer1.onDisconnect.mockClear();
          observer1.onError.mockClear();
          observer2.onData.mockClear();
          observer2.onDisconnect.mockClear();
          observer2.onError.mockClear();
        });

        it('should route data to the correct subscribe observer whenever a response is received', async () => {
          transport.invokeSubscribe(observer1, queryName1, variables1);
          transport.invokeSubscribe(observer2, queryName2, variables2);

          const expectedKey1 = transport.getMapKey(queryName1, variables1);
          const request1 =
            transport.activeInvokeSubscribeRequests.get(expectedKey1);
          const requestId1 = request1?.requestId!;

          await transport.invokeHandleResponse(requestId1, response1);
          expect(observer1.onData).toHaveBeenCalledTimes(1);
          expect(observer1.onData).toHaveBeenLastCalledWith(response1);
          await transport.invokeHandleResponse(requestId1, response2);
          expect(observer1.onData).toHaveBeenCalledTimes(2);
          expect(observer1.onData).toHaveBeenLastCalledWith(response2);

          const expectedKey2 = transport.getMapKey(queryName2, variables2);
          const request2 =
            transport.activeInvokeSubscribeRequests.get(expectedKey2);
          const requestId2 = request2?.requestId!;

          await transport.invokeHandleResponse(requestId2, response3);
          expect(observer2.onData).toHaveBeenCalledTimes(1);
          expect(observer2.onData).toHaveBeenLastCalledWith(response3);
          await transport.invokeHandleResponse(requestId2, response4);
          expect(observer2.onData).toHaveBeenCalledTimes(2);
          expect(observer2.onData).toHaveBeenLastCalledWith(response4);
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
          expect(observer1.onData).toHaveBeenCalledTimes(1);
          expect(observer1.onData).toHaveBeenLastCalledWith(errorResponse);
          await transport.invokeHandleResponse(requestId2, errorResponse);
          expect(observer2.onData).toHaveBeenCalledTimes(1);
          expect(observer2.onData).toHaveBeenLastCalledWith(errorResponse);
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
          expect(
            transport.activeInvokeSubscribeRequests.has(expectedKey1)
          ).toBe(true);
          expect(transport.subscribeObservers.has(requestId1)).toBe(true);
          expect(
            transport.activeInvokeSubscribeRequests.has(expectedKey2)
          ).toBe(true);
          expect(transport.subscribeObservers.has(requestId2)).toBe(true);
        });
      });
    });
  });

  describe('Disconnects', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    describe('Idle Timeout', () => {
      const IDLE_CONNECTION_TIMEOUT_MS = 15 * 1000; // 15 seconds, copied from real implementation

      it('should close connection after grace period when idle (no active subscriptions)', async () => {
        const closeSpy = vi.spyOn(transport, 'closeConnection');
        vi.spyOn(transport, 'sendMessage').mockResolvedValue();
        const observer = {
          onData: vi.fn(),
          onDisconnect: vi.fn(),
          onError: vi.fn()
        };

        await transport.invokeSubscribe(observer, queryName1, variables1);
        await transport.invokeUnsubscribe(queryName1, variables1);

        expect(closeSpy).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(IDLE_CONNECTION_TIMEOUT_MS + 100);
        expect(closeSpy).toHaveBeenCalledTimes(1);
      });

      it('should not close connection if a new subscription arrives during timeout', async () => {
        const closeSpy = vi.spyOn(transport, 'closeConnection');
        vi.spyOn(transport, 'sendMessage').mockResolvedValue();
        const observer = {
          onData: vi.fn(),
          onDisconnect: vi.fn(),
          onError: vi.fn()
        };

        await transport.invokeSubscribe(observer, queryName1, variables1);
        await transport.invokeUnsubscribe(queryName1, variables1);

        expect(closeSpy).not.toHaveBeenCalled();

        await transport.invokeSubscribe(observer, queryName2, variables2);

        await vi.advanceTimersByTimeAsync(IDLE_CONNECTION_TIMEOUT_MS + 100);
        expect(closeSpy).not.toHaveBeenCalled();
      });

      it('should restart close timeout if subscribe fails and leaves no active subscriptions', async () => {
        const closeSpy = vi.spyOn(transport, 'closeConnection');
        const sendMessageStub = vi.spyOn(transport, 'sendMessage');
        sendMessageStub.mockResolvedValue();
        const observer = {
          onData: vi.fn(),
          onDisconnect: vi.fn(),
          onError: vi.fn()
        };

        await transport.invokeSubscribe(observer, queryName1, variables1);
        await transport.invokeUnsubscribe(queryName1, variables1);

        sendMessageStub.mockRejectedValue();
        await transport.invokeSubscribe(observer, queryName2, variables2);

        await flushMicrotasks(1);
        expect(closeSpy).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(IDLE_CONNECTION_TIMEOUT_MS + 100);
        expect(closeSpy).toHaveBeenCalledTimes(1);
      });

      it('should not close connection if there are active execute requests', async () => {
        const closeSpy = vi.spyOn(transport, 'closeConnection');
        vi.spyOn(transport, 'sendMessage').mockResolvedValue();
        const observer = {
          onData: vi.fn(),
          onDisconnect: vi.fn(),
          onError: vi.fn()
        };

        await transport.invokeSubscribe(observer, queryName1, variables1);
        await transport.invokeUnsubscribe(queryName1, variables1);

        void transport.invokeQuery(queryName2, variables2);

        await vi.advanceTimersByTimeAsync(IDLE_CONNECTION_TIMEOUT_MS + 100);
        expect(closeSpy).not.toHaveBeenCalled();
      });

      it('should close connection when last execute request finishes after idle timeout', async () => {
        const closeSpy = vi.spyOn(transport, 'closeConnection');
        vi.spyOn(transport, 'sendMessage').mockResolvedValue();
        const observer = {
          onData: vi.fn(),
          onDisconnect: vi.fn(),
          onError: vi.fn()
        };

        await transport.invokeSubscribe(observer, queryName1, variables1);
        await transport.invokeUnsubscribe(queryName1, variables1);

        const queryPromise = transport.invokeQuery(queryName2, variables2);

        await vi.advanceTimersByTimeAsync(IDLE_CONNECTION_TIMEOUT_MS + 100);
        expect(closeSpy).not.toHaveBeenCalled();

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

        // fast forward time again because the new idle timeout started when the query completed
        await vi.advanceTimersByTimeAsync(IDLE_CONNECTION_TIMEOUT_MS + 100);

        expect(closeSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('Auth Disconnects', () => {
      it('should close stream immediately on illegal auth change (login)', async () => {
        const closeSpy = vi.spyOn(transport, 'closeConnection');
        const observer = {
          onData: vi.fn(),
          onDisconnect: vi.fn(),
          onError: vi.fn()
        };

        transport.setAuthToken(null);
        const getAuthStub = vi.spyOn(transport.authProvider, 'getAuth');
        getAuthStub.mockReturnValue({ getUid: () => null });
        transport.invokeOnAuthTokenChanged(null); // Establish baseline (unauth)

        transport.invokeSubscribe(observer, queryName1, variables1);

        transport.setAuthToken('new-token');
        getAuthStub.mockReturnValue({ getUid: () => 'some-uid' });
        transport.invokeOnAuthTokenChanged('new-token'); // Change (login)

        expect(closeSpy).toHaveBeenCalledTimes(1);
      });

      it('should close stream immediately on illegal auth change (logout)', async () => {
        const closeSpy = vi.spyOn(transport, 'closeConnection');
        const observer = {
          onData: vi.fn(),
          onDisconnect: vi.fn(),
          onError: vi.fn()
        };

        transport.setAuthToken('initial-token');
        const getAuthStub = vi.spyOn(transport.authProvider, 'getAuth');
        getAuthStub.mockReturnValue({ getUid: () => 'some-uid' });
        transport.invokeOnAuthTokenChanged('initial-token'); // Establish baseline (auth)

        transport.invokeSubscribe(observer, queryName1, variables1);

        transport.setAuthToken(null);
        getAuthStub.mockReturnValue({ getUid: () => null });
        transport.invokeOnAuthTokenChanged(null); // Change (logout)

        expect(closeSpy).toHaveBeenCalledTimes(1);
      });

      it('should close stream immediately on illegal auth change (user change)', async () => {
        const closeSpy = vi.spyOn(transport, 'closeConnection');
        const observer = {
          onData: vi.fn(),
          onDisconnect: vi.fn(),
          onError: vi.fn()
        };

        transport.setAuthToken('token-a');
        const getAuthStub = vi.spyOn(transport.authProvider, 'getAuth');
        getAuthStub.mockReturnValue({ getUid: () => 'user-a' });
        transport.invokeOnAuthTokenChanged('token-a'); // Establish baseline (user A)

        transport.invokeSubscribe(observer, queryName1, variables1);

        transport.setAuthToken('token-b');
        getAuthStub.mockReturnValue({ getUid: () => 'user-b' });
        transport.invokeOnAuthTokenChanged('token-b'); // Change (user B)

        expect(closeSpy).toHaveBeenCalledTimes(1);
      });

      it('should NOT close stream on valid auth token refresh (same user)', async () => {
        const closeSpy = vi.spyOn(transport, 'closeConnection');
        const observer = {
          onData: vi.fn(),
          onDisconnect: vi.fn(),
          onError: vi.fn()
        };

        transport.setAuthToken('initial-token');

        // Stub getUid to return the same user ID regardless of token
        vi.spyOn(transport.authProvider, 'getAuth').mockReturnValue({
          getUid: () => 'same-user'
        });

        transport.invokeOnAuthTokenChanged('initial-token'); // Establish baseline

        transport.invokeSubscribe(observer, queryName1, variables1);

        transport.setAuthToken('refreshed-token');
        transport.invokeOnAuthTokenChanged('refreshed-token'); // Refresh

        expect(closeSpy).not.toHaveBeenCalled();
      });
    });

    it('should fail all active mutations on unexpected disconnect', async () => {
      const observer = {
        onData: vi.fn(),
        onDisconnect: vi.fn(),
        onError: vi.fn()
      };
      transport.invokeSubscribe(observer, queryName1, variables1);

      const mutationPromise = transport.invokeMutation(
        mutationName1,
        variables1
      );

      transport.onStreamClose(1006, 'Abnormal Closure');

      await expect(mutationPromise).rejects.toThrow(
        'Mutation aborted due to stream disconnect.'
      );
      expect(transport.activeInvokeMutationRequests.size).toBe(0);
    });
  });

  describe('Reconnects', () => {
    let sendMessageStub: ReturnType<typeof vi.spyOn>;
    let ensureConnectionStub: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      vi.useFakeTimers();
      sendMessageStub = vi.spyOn(transport, 'sendMessage').mockResolvedValue();
      ensureConnectionStub = vi
        .spyOn(transport, 'ensureConnection')
        .mockImplementation(() => {
          transport.isTestConnected = true;
          return Promise.resolve();
        });
    });

    describe('Automatic and Intelligent Reconnection', () => {
      it('should start backoff on unexpected disconnect', async () => {
        const observer = {
          onData: vi.fn(),
          onDisconnect: vi.fn(),
          onError: vi.fn()
        };
        transport.invokeSubscribe(observer, queryName1, variables1);

        // Trigger unexpected disconnect (code 1006)
        transport.onStreamClose(1006, 'Abnormal Closure');

        // Should have started timer
        expect(transport.reconnectTimer).not.toBeNull();
      });

      it('should NOT start backoff on graceful close with no subscriptions', async () => {
        // No active subscriptions
        transport.onStreamClose(1000, 'Normal Closure');

        // Should NOT have started timer
        expect(transport.reconnectTimer).toBeNull();
      });

      it('should re-request active subscriptions and queries on successful reconnect', async () => {
        const attemptReconnectSpy = vi.spyOn(transport, 'attemptReconnect');
        const observer = {
          onData: vi.fn(),
          onDisconnect: vi.fn(),
          onError: vi.fn()
        };
        transport.invokeSubscribe(observer, queryName1, variables1);

        // Stagger an execute request
        void transport.invokeQuery(queryName1, variables1);

        sendMessageStub.mockClear();

        // Trigger unexpected disconnect
        transport.onStreamClose(1006, 'Abnormal Closure');

        // Fast forward time to trigger reconnect
        await vi.advanceTimersByTimeAsync(2000); // Default is 1000 + jitter
        expect(attemptReconnectSpy).toHaveBeenCalledTimes(1);
        expect(ensureConnectionStub).toHaveBeenCalledTimes(1);

        // Should re-send subscribe and then query
        expect(sendMessageStub).toHaveBeenCalledTimes(2);
        const firstSent = sendMessageStub.mock.calls[0][0];
        const secondSent = sendMessageStub.mock.calls[1][0];

        expect(firstSent.subscribe).toBeDefined();
        expect(secondSent.resume).toBeDefined();
      });

      it('onOnline should trigger immediate reconnect if waiting', async () => {
        const observer = {
          onData: vi.fn(),
          onDisconnect: vi.fn(),
          onError: vi.fn()
        };
        transport.invokeSubscribe(observer, queryName1, variables1);
        transport.onStreamClose(1006, 'Abnormal Closure');

        expect(transport.reconnectTimer).not.toBeNull();

        transport.onOnlineEventListener();

        expect(ensureConnectionStub).toHaveBeenCalledTimes(1);
        expect(transport.reconnectTimer).toBeNull();
      });

      it('onVisibilityChange should trigger immediate reconnect if waiting', async () => {
        const isBrowser = typeof window !== 'undefined';
        if (!isBrowser) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (globalThis as any).document = { visibilityState: 'visible' };
        }

        const observer = {
          onData: vi.fn(),
          onDisconnect: vi.fn(),
          onError: vi.fn()
        };
        transport.invokeSubscribe(observer, queryName1, variables1);
        transport.onStreamClose(1006, 'Abnormal Closure');

        expect(transport.reconnectTimer).not.toBeNull();

        transport.onVisibilityChangeEventListener();

        expect(ensureConnectionStub).toHaveBeenCalledTimes(1);
        expect(transport.reconnectTimer).toBeNull();

        if (!isBrowser) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          delete (globalThis as any).document;
        }
      });

      it('should exponentially back off with 1.5 multiplier and [-0.5x, +0.5x] jitter capped at 60s', async () => {
        ensureConnectionStub.mockRejectedValue(
          new DataConnectError(Code.OTHER, 'Connection failed')
        );
        const randomStub = vi.spyOn(Math, 'random');
        const observer = {
          onData: vi.fn(),
          onDisconnect: vi.fn(),
          onError: vi.fn()
        };
        transport.invokeSubscribe(observer, queryName1, variables1);

        // Attempt 1: base delay 1000ms, random=0 -> jitter -500ms -> delay 500ms
        randomStub.mockReturnValue(0);
        transport.onStreamClose(1006, 'Abnormal Closure');

        await vi.advanceTimersByTimeAsync(499);
        expect(ensureConnectionStub).not.toHaveBeenCalled();

        // Set random=1 before attempt 1 failure triggers startReconnectBackoff for attempt 2
        // Attempt 2: base delay 1500ms, random=1 -> jitter +750ms -> delay 2250ms
        randomStub.mockReturnValue(1);
        await vi.advanceTimersByTimeAsync(1);
        expect(ensureConnectionStub).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(2249);
        expect(ensureConnectionStub).toHaveBeenCalledTimes(1);

        // Set random=0.5 before attempt 2 failure triggers startReconnectBackoff for attempt 3
        // Attempt 3: base delay 2250ms, random=0.5 -> jitter 0ms -> delay 2250ms
        randomStub.mockReturnValue(0.5);
        await vi.advanceTimersByTimeAsync(1);
        expect(ensureConnectionStub).toHaveBeenCalledTimes(2);

        await vi.advanceTimersByTimeAsync(2250);
        expect(ensureConnectionStub).toHaveBeenCalledTimes(3);
      });

      it('should attempt reconnection indefinitely without a max attempt limit', async () => {
        ensureConnectionStub.mockRejectedValue(
          new DataConnectError(Code.OTHER, 'Connection failed')
        );
        const observer = {
          onData: vi.fn(),
          onDisconnect: vi.fn(),
          onError: vi.fn()
        };
        transport.invokeSubscribe(observer, queryName1, variables1);
        transport.onStreamClose(1006, 'Abnormal Closure');

        // Fast-forward past 15 reconnection attempts
        for (let i = 0; i < 15; i++) {
          await vi.advanceTimersByTimeAsync(65000);
        }

        expect(ensureConnectionStub.mock.calls.length).toBeGreaterThanOrEqual(
          15
        );
      });
    });
  });

  describe('Dispose', () => {
    let closeConnectionSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      vi.useFakeTimers();
      closeConnectionSpy = vi.spyOn(transport, 'closeConnection');
    });

    it('should clean up event listeners and timers on dispose', async () => {
      const isBrowser = typeof window !== 'undefined';
      let hadAddEventListener = false;
      let hadRemoveEventListener = false;

      let removeEventListenerSpy:
        ReturnType<typeof vi.spyOn> | ReturnType<typeof vi.fn>;
      let removeDocEventListenerSpy:
        ReturnType<typeof vi.spyOn> | ReturnType<typeof vi.fn>;

      if (isBrowser) {
        removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
        removeDocEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyGlobalThis = globalThis as any;

        hadAddEventListener = 'addEventListener' in anyGlobalThis;
        hadRemoveEventListener = 'removeEventListener' in anyGlobalThis;

        if (!hadAddEventListener) {
          anyGlobalThis.addEventListener = () => {};
        }
        if (!hadRemoveEventListener) {
          anyGlobalThis.removeEventListener = () => {};
        }

        removeEventListenerSpy = vi.spyOn(anyGlobalThis, 'removeEventListener');

        anyGlobalThis.document = {
          addEventListener: vi.fn(),
          removeEventListener: vi.fn()
        } as unknown as Document;
        removeDocEventListenerSpy = anyGlobalThis.document.removeEventListener;
      }

      try {
        // Recreate transport after mocking/spying to pick up the correct environment
        transport = new TestStreamTransport(
          dcOptions
        ) as unknown as TransportWithInternals;
        transport._isUsingGen = true;
        transport._callerSdkType = CallerSdkTypeEnum.Generated;
        transport.setAuthToken(initialAuthToken);
        transport.setAppCheckToken(initialAppCheckToken);
        transport.appId = initialAppId;
        transport.hasWaitedForInitialAuth = true;

        closeConnectionSpy = vi.spyOn(transport, 'closeConnection');

        const observer = {
          onData: vi.fn(),
          onDisconnect: vi.fn(),
          onError: vi.fn()
        };
        transport.invokeSubscribe(observer, queryName1, variables1);

        transport.onStreamClose(1006, 'Abnormal Closure');
        expect(transport.reconnectTimer).not.toBeNull();

        await transport.cleanupAndTerminate();

        expect(removeEventListenerSpy).toHaveBeenCalledWith(
          'online',
          transport.onOnlineEventListener
        );
        expect(removeDocEventListenerSpy).toHaveBeenCalledWith(
          'visibilitychange',
          transport.onVisibilityChangeEventListener
        );
      } finally {
        // 2. Cleanup
        vi.restoreAllMocks(); // Automatically restores window/document spies in the browser!

        // Delete the mock objects we added in Node
        if (!isBrowser) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const anyGlobalThis = globalThis as any;
          delete anyGlobalThis.window;
          delete anyGlobalThis.document;
          if (!hadAddEventListener) {
            delete anyGlobalThis.addEventListener;
          }
          if (!hadRemoveEventListener) {
            delete anyGlobalThis.removeEventListener;
          }
        }
      }

      expect(transport.reconnectTimer).toBeNull();
      expect(closeConnectionSpy).toHaveBeenCalledTimes(1);
    });
  });
});
