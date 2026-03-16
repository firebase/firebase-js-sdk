/**
 * @license
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  Code,
  DataConnectError,
  DataConnectOperationError,
  DataConnectOperationFailureResponse
} from '../../core/error';
import {
  AbstractDataConnectTransport,
  DataConnectResponse,
  SubscribeNotificationHook,
  getGoogApiClientValue
} from '../transport';

import {
  CancelStreamRequest,
  DataConnectStreamRequest,
  ExecuteStreamRequest,
  ResumeStreamRequest,
  StreamRequestHeaders,
  SubscribeStreamRequest
} from './wire';

/** The request id of the first request over the stream */
const FIRST_REQUEST_ID = 1;

/**
 * The base class for all DataConnectStreamTransport implementations. Handles management of logical
 * streams (requests), authentication, data routing to query layer, etc.
 * @internal
 */
export abstract class AbstractDataConnectStreamTransport extends AbstractDataConnectTransport {
  /**
   * Open a physical connection to the server.
   * @returns a promise which resolves when the connection is ready, or rejects if it fails to open.
   */
  protected abstract openConnection(): Promise<void>;

  /**
   * Close the physical connection with the server. Handles no cleanup - simply closes the
   * implementation-specific connection.
   * @returns a promise which resolves when the connection is closed, or rejects if it fails to close.
   */
  protected abstract closeConnection(): Promise<void>;

  /**
   * Queue a message to be sent over the stream.
   * @param requestBody The body of the message to be sent.
   * @throws DataConnectError if sending fails.
   */
  protected abstract sendMessage<Variables>(
    requestBody: DataConnectStreamRequest<Variables>
  ): Promise<void>;

  /** The request ID of the next message to be sent. Monotonically increasing sequence number. */
  private requestNumber = FIRST_REQUEST_ID;
  /**
   * Generates and returns the next request ID.
   */
  private nextRequestId(): string {
    return (this.requestNumber++).toString();
  }

  /**
   * Map of query/variables to their active execute/resume request bodies.
   */
  private activeQueryExecuteRequests = new Map<
    string,
    ExecuteStreamRequest<unknown> | ResumeStreamRequest
  >();

  /**
   * Map of mutation/variables to their active execute request bodies.
   */
  private activeMutationExecuteRequests = new Map<
    string,
    Array<ExecuteStreamRequest<unknown>>
  >();

  /**
   * Map of query/variables to their active subscribe request bodies.
   */
  private activeSubscribeRequests = new Map<
    string,
    SubscribeStreamRequest<unknown>
  >();

  /**
   * Map of active execution RequestIds and their corresponding Promises and resolvers.
   */
  private executeRequestPromises = new Map<
    string,
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolve: (data: any) => void;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reject: (err: any) => void;
      promise: Promise<DataConnectResponse<unknown>>;
    }
  >();

  /**
   * Map of active subscription RequestIds and their corresponding notification hooks.
   */
  private subscribeNotificationHooks = new Map<
    string,
    SubscribeNotificationHook<unknown>
  >();

  /**
   * Tracks if the next message to be sent is the first message of the stream.
   */
  private isFirstStreamMessage = true;
  /**
   * Tracks the last auth token sent to the server.
   * Used to detect if the token has changed and needs to be resent.
   */
  private lastSentAuthToken: string | null = null;
  /**
   * Indicates whether we should include the auth token in the next message.
   * Only true if there is an auth token and it is different from the last sent auth token, or this
   * is the first message.
   */
  private get shouldIncludeAuth(): boolean {
    return (
      this.isFirstStreamMessage ||
      (!!this._authToken && this._authToken !== this.lastSentAuthToken)
    );
  }

  /**
   * Called by the concrete transport implementation when the physical connection is ready.
   */
  protected onConnectionReady(): void {
    this.isFirstStreamMessage = true;
    this.lastSentAuthToken = null;
  }

  /**
   * Prepares a stream request by adding necessary headers and metadata.
   * If this is the first message on the stream, it includes the resource name, auth token, and App Check token.
   * If the auth token has changed since the last message, it includes the new auth token.
   * @returns the requestBody, with attached headers and initial request fields
   */
  private prepareMessage<
    Variables,
    StreamBody extends DataConnectStreamRequest<Variables>
  >(requestBody: StreamBody): StreamBody {
    const preparedRequestBody: StreamBody = { ...requestBody };
    const headers: StreamRequestHeaders = {};
    if (this.appId) {
      headers['x-firebase-gmpid'] = this.appId;
    }
    headers['X-Goog-Api-Client'] = getGoogApiClientValue(
      this._isUsingGen,
      this._callerSdkType
    );
    if (this.shouldIncludeAuth && this._authToken) {
      headers.authToken = this._authToken;
      this.lastSentAuthToken = this._authToken;
    }
    if (this.isFirstStreamMessage) {
      if (this._appCheckToken) {
        headers.appCheckToken = this._appCheckToken;
      }
      preparedRequestBody.name = this._connectorResourcePath;
    }
    preparedRequestBody.headers = headers;
    this.isFirstStreamMessage = false;
    return preparedRequestBody;
  }

  /**
   * Internal helper to queue a message to execute a one-off query or mutation.
   */
  private sendExecuteMessage<Variables>(
    executeRequestBody: ExecuteStreamRequest<Variables>
  ): Promise<void> {
    const preparedRequestBody = this.prepareMessage(executeRequestBody);
    return this.sendMessage(preparedRequestBody);
  }

  /**
   * Internal helper to queue a message to subscribe to a query.
   */
  private sendSubscribeMessage<Variables>(
    subscribeRequestBody: SubscribeStreamRequest<Variables>
  ): Promise<void> {
    const preparedRequestBody = this.prepareMessage(subscribeRequestBody);
    return this.sendMessage(preparedRequestBody);
  }

  /**
   * Internal helper to queue a message to unsubscribe to a query.
   */
  private sendCancelMessage(cancelRequestBody: CancelStreamRequest): Promise<void> {
    const preparedRequestBody = this.prepareMessage(cancelRequestBody);
    return this.sendMessage(preparedRequestBody);
  }

  /**
   * Internal helper to queue a message to resume a query.
   */
  private sendResumeMessage(resumeRequestBody: ResumeStreamRequest): Promise<void> {
    const preparedRequestBody = this.prepareMessage(resumeRequestBody);
    return this.sendMessage(preparedRequestBody);
  }

  /**
   * Creates, tracks, and returns a promise that will be resolved when the response for the given
   * request ID is received.
   */
  private makeExecutePromise<Data>(
    requestId: string
  ): Promise<DataConnectResponse<Data>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let resolveFn: (data: any) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rejectFn: (err: any) => void;
    const responsePromise = new Promise<DataConnectResponse<Data>>(
      (resolve, reject) => {
        resolveFn = resolve;
        rejectFn = reject;
      }
    );
    this.executeRequestPromises.set(requestId, {
      resolve: resolveFn!,
      reject: rejectFn!,
      promise: responsePromise
    });
    return responsePromise;
  }

  /**
   * Helper to generate a consistent string key for the tracking maps.
   */
  private getMapKey(operationName: string, variables?: unknown): string {
    const sortedVariables = this.sortObjectKeys(variables);
    return JSON.stringify({ operationName, variables: sortedVariables });
  }

  /**
   * Recursively sorts the keys of an object.
   */
  private sortObjectKeys(obj: unknown): unknown {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
      return obj;
    }
    const sortedObj: Record<string, unknown> = {};
    Object.keys(obj as Record<string, unknown>)
      .sort()
      .forEach(key => {
        sortedObj[key] = this.sortObjectKeys(
          (obj as Record<string, unknown>)[key]
        );
      });
    return sortedObj;
  }

  invokeQuery<Data, Variables>(
    queryName: string,
    variables?: Variables
  ): Promise<DataConnectResponse<Data>> {
    const requestId = this.nextRequestId();
    const activeRequestKey = { operationName: queryName, variables };
    const mapKey = this.getMapKey(queryName, variables);
    const executeBody: ExecuteStreamRequest<Variables> = {
      requestId,
      execute: activeRequestKey
    };

    this.activeQueryExecuteRequests.set(mapKey, executeBody);

    const responsePromise = this.makeExecutePromise<Data>(requestId).finally(() => {
      const executeRequest = this.activeQueryExecuteRequests.get(mapKey);
      if (executeRequest && executeRequest.requestId === requestId) {
        this.activeQueryExecuteRequests.delete(mapKey);
      }
    });

    this.sendExecuteMessage<Variables>(executeBody).catch(err => {
      const requestPromise = this.executeRequestPromises.get(requestId);
      if (requestPromise) {
        requestPromise.reject(err);
        this.executeRequestPromises.delete(requestId);
      }
    });

    return responsePromise;
  }

  invokeMutation<Data, Variables>(
    mutationName: string,
    variables?: Variables
  ): Promise<DataConnectResponse<Data>> {
    const requestId = this.nextRequestId();
    const activeRequestKey = { operationName: mutationName, variables };
    const mapKey = this.getMapKey(mutationName, variables);
    const executeBody: ExecuteStreamRequest<Variables> = {
      requestId,
      execute: activeRequestKey
    };

    const mutationRequestBodies =
      this.activeMutationExecuteRequests.get(mapKey) || [];
    mutationRequestBodies.push(executeBody);
    this.activeMutationExecuteRequests.set(mapKey, mutationRequestBodies);

    const responsePromise = this.makeExecutePromise<Data>(requestId).finally(() => {
      const executeRequests = this.activeMutationExecuteRequests.get(mapKey);
      if (executeRequests) {
        const updatedRequests = executeRequests.filter(
          req => req.requestId !== requestId
        );
        if (updatedRequests.length > 0) {
          this.activeMutationExecuteRequests.set(mapKey, updatedRequests);
        } else {
          this.activeMutationExecuteRequests.delete(mapKey);
        }
      }
    });

    this.sendExecuteMessage<Variables>(executeBody).catch(err => {
      const requestPromise = this.executeRequestPromises.get(requestId);
      if (requestPromise) {
        requestPromise.reject(err);
        this.executeRequestPromises.delete(requestId);
      }
    });

    return responsePromise;
  }

  invokeSubscribe<Data, Variables>(
    notifyQueryManager: SubscribeNotificationHook<Data>,
    queryName: string,
    variables: Variables
  ): void {
    const requestId = this.nextRequestId();
    const activeRequestKey = { operationName: queryName, variables };
    const mapKey = this.getMapKey(queryName, variables);
    const subscribeBody: SubscribeStreamRequest<Variables> = {
      requestId,
      subscribe: activeRequestKey
    };

    this.activeSubscribeRequests.set(mapKey, subscribeBody);
    this.subscribeNotificationHooks.set(
      requestId,
      notifyQueryManager as SubscribeNotificationHook<unknown>
    );

    this.sendSubscribeMessage<Variables>(subscribeBody).catch(err => {
      this.activeSubscribeRequests.delete(mapKey);
      this.subscribeNotificationHooks.delete(requestId);
      notifyQueryManager({
        data: undefined as unknown as Data,
        extensions: {},
        errors: [err instanceof Error ? err : new Error(String(err))]
      });
    });
  }

  invokeUnsubscribe<Variables>(queryName: string, variables: Variables): void {
    const mapKey = this.getMapKey(queryName, variables);
    const subscribeRequest = this.activeSubscribeRequests.get(mapKey);
    if (!subscribeRequest) {
      return;
    }
    const requestId = subscribeRequest.requestId;
    const cancelBody: CancelStreamRequest = {
      requestId,
      cancel: {}
    };

    this.sendCancelMessage(cancelBody).catch(err => {
      console.error('Failed to send unsubscribe message', err);
    });

    this.activeSubscribeRequests.delete(mapKey);
    this.subscribeNotificationHooks.delete(requestId);
  }

  onAuthTokenChanged(newToken: string | null): void {
    this._authToken = newToken;
  }

  /**
   * Handle a response message from the server. Called by the connection-specific implementation after
   * it's transformed a message from the server into a DataConnectResponse.
   * @param requestId the requestId associated with this response.
   * @param response the response from the server.
   */
  protected async handleResponse<Data>(
    requestId: string,
    response: DataConnectResponse<Data>
  ): Promise<void> {
    if (this.executeRequestPromises.has(requestId)) {
      // TODO(stephenarosaj): make errors better
      const { resolve, reject } = this.executeRequestPromises.get(requestId)!;
      if (response.errors && response.errors.length) {
        const failureResponse: DataConnectOperationFailureResponse = {
          errors: response.errors as [],
          data: response.data as Record<string, unknown>
        };
        const stringified = JSON.stringify(response.errors);
        reject(
          new DataConnectOperationError(
            'DataConnect error while performing request: ' + stringified,
            failureResponse
          )
        );
      } else {
        resolve(response);
      }
      this.executeRequestPromises.delete(requestId);
    } else if (this.subscribeNotificationHooks.has(requestId)) {
      const notifyQueryManager =
        this.subscribeNotificationHooks.get(requestId)!;
      notifyQueryManager(response);
    } else {
      throw new DataConnectError(
        Code.OTHER,
        `Unrecognized requestId '${requestId}'`
      );
    }
  }
}
