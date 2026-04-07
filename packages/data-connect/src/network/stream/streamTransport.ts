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
import { logError } from '../../logger';
import {
  AbstractDataConnectTransport,
  DataConnectResponse,
  SubscribeObserver,
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

/** Time to wait before closing an idle connection (no active subscriptions) */
const IDLE_CONNECTION_TIMEOUT_MS = 60 * 1000; // 1 minute

/**
 * A promise that is settled for a request is received, and the functions that resolve or reject it.
 */
interface TrackedExecuteRequestPromise<Data> {
  responsePromise: Promise<DataConnectResponse<Data>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolveFn: (data: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rejectFn: (err: any) => void;
}

/**
 * The base class for all {@link DataConnectStreamTransport | Stream Transport} implementations.
 * Handles management of logical streams (requests), authentication, data routing to query layer, etc.
 * @internal
 */
export abstract class AbstractDataConnectStreamTransport extends AbstractDataConnectTransport {
  /** Optional callback invoked when the stream closes gracefully. */
  onGracefulStreamClose?: () => void;

  /** True if the physical stream connection is fully open and ready to transmit data. */
  abstract get streamIsReady(): boolean;

  /** Is the stream currently waiting to close connection? */
  get isPendingClose(): boolean {
    return this.pendingClose;
  }
  private pendingClose = false;

  // TODO(stephenarosaj): determine this based on the underlying transport when implementing resilience / fallback / disconnects / retries
  get isUnableToConnect(): boolean {
    return false;
  }

  /** True if there are active subscriptions on the stream */
  get hasActiveSubscriptions(): boolean {
    return this.activeSubscribeRequests.size > 0;
  }

  /** True if there are active execute or mutation requests on the stream */
  get hasActiveExecuteRequests(): boolean {
    return (
      this.activeQueryExecuteRequests.size > 0 ||
      this.activeMutationExecuteRequests.size > 0
    );
  }

  /**
   * Open a physical connection to the server.
   * @returns a promise which resolves when the connection is ready, or rejects if it fails to open.
   */
  protected abstract openConnection(): Promise<void>;

  /**
   * Close the physical connection with the server. Handles no cleanup - simply closes the
   * implementation-specific connection.
   * @returns a promise which resolves when the connection is closed, or rejects if it fails to close.
   * On failure to close, the connection is still considered closed.
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

  /**
   * Ensures that that there is an open connection. If there is none, it initiates a new one.
   * If a connection attempt is already in progress, it returns the existing connection promise.
   * @returns A promise that resolves when the stream is open and ready.
   */
  protected abstract ensureConnection(): Promise<void>;

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
    TrackedExecuteRequestPromise<unknown>
  >();

  /**
   * Map of active subscription RequestIds and their corresponding observers.
   */
  private subscribeObservers = new Map<string, SubscribeObserver<unknown>>();

  /** current close timeout from setTimeout(), if any */
  private closeTimeout: NodeJS.Timeout | null = null;
  /** has the close timeout finished? */
  private closeTimeoutFinished = false;
  /** current auth uid. used to detect if a different user logs in */
  private authUid: string | null | undefined;

  /**
   * Tracks a query execution request, storing the request body and creating and storing a promise that
   * will be resolved when the response is received.
   * @returns The reject function and the response promise.
   *
   * @remarks
   * This method returns a promise, but is synchronous.
   */
  private trackQueryExecuteRequest<Data>(
    requestId: string,
    mapKey: string,
    executeBody: ExecuteStreamRequest<unknown>
  ): TrackedExecuteRequestPromise<Data> {
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
    const executeRequestPromise: TrackedExecuteRequestPromise<Data> = {
      responsePromise,
      resolveFn: resolveFn!,
      rejectFn: rejectFn!
    };

    this.activeQueryExecuteRequests.set(mapKey, executeBody);
    this.executeRequestPromises.set(requestId, executeRequestPromise);

    return executeRequestPromise;
  }

  /**
   * Tracks a mutation execution request, storing the request body and creating and storing a promise
   * that will be resolved when the response is received.
   * @returns The reject function and the response promise.
   *
   * @remarks
   * This method returns a promise, but is synchronous.
   */
  private trackMutationExecuteRequest<Data>(
    requestId: string,
    mapKey: string,
    executeBody: ExecuteStreamRequest<unknown>
  ): TrackedExecuteRequestPromise<Data> {
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
    const executeRequestPromise: TrackedExecuteRequestPromise<Data> = {
      responsePromise,
      resolveFn: resolveFn!,
      rejectFn: rejectFn!
    };

    const activeRequests = this.activeMutationExecuteRequests.get(mapKey) || [];
    activeRequests.push(executeBody);
    this.activeMutationExecuteRequests.set(mapKey, activeRequests);
    this.executeRequestPromises.set(requestId, executeRequestPromise);

    return executeRequestPromise;
  }

  /**
   * Tracks a subscribe request, storing the request body and the notification observer.
   * @remarks
   * This method is synchronous.
   */
  private trackSubscribeRequest<Data>(
    requestId: string,
    mapKey: string,
    subscribeBody: SubscribeStreamRequest<unknown>,
    observer: SubscribeObserver<Data>
  ): void {
    this.activeSubscribeRequests.set(mapKey, subscribeBody);
    this.subscribeObservers.set(
      requestId,
      observer as SubscribeObserver<unknown>
    );
  }

  /**
   * Cleans up the query execute request tracking data structures, deleting the tracked request and
   * it's associated promise.
   */
  private cleanupQueryExecuteRequest(requestId: string, mapKey: string): void {
    this.activeQueryExecuteRequests.delete(mapKey);
    this.executeRequestPromises.delete(requestId);
  }

  /**
   * Cleans up the mutation execute request tracking data structures, deleting the tracked request and
   * it's associated promise.
   */
  private cleanupMutationExecuteRequest(
    requestId: string,
    mapKey: string
  ): void {
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
    this.executeRequestPromises.delete(requestId);
  }

  /**
   * Cleans up the subscribe request tracking data structures, deleting the tracked request and
   * it's associated promise.
   */
  private cleanupSubscribeRequest(requestId: string, mapKey: string): void {
    this.activeSubscribeRequests.delete(mapKey);
    this.subscribeObservers.delete(requestId);
  }

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
   * Attempt to close the connection. Will only close if there are no active requests preventing it
   * from doing so.
   */
  private async attemptClose(): Promise<void> {
    if (this.hasActiveSubscriptions || this.hasActiveExecuteRequests) {
      return;
    }
    this.cancelClose();
    await this.closeConnection();
    this.onGracefulStreamClose?.();
  }

  /**
   * Begin closing the connection. Waits for and cleans up all active requests, and waits for
   * {@link IDLE_CONNECTION_TIMEOUT_MS}. This is a graceful close - it will be called when there are
   * no more active subscriptions, so there's no need to cleanup.
   */
  private prepareToCloseGracefully(): void {
    if (this.pendingClose) {
      return;
    }
    this.pendingClose = true;
    this.closeTimeoutFinished = false;
    this.closeTimeout = setTimeout(() => {
      this.closeTimeoutFinished = true;
      void this.attemptClose();
    }, IDLE_CONNECTION_TIMEOUT_MS);
  }

  /**
   * Cancel closing the connection.
   */
  private cancelClose(): void {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
    }
    this.pendingClose = false;
    this.closeTimeoutFinished = false;
  }

  /**
   * Reject all active execute promises and notify all subscribe observers with the given error.
   * Clear active request tracking maps without cancelling or re-invoking any requests.
   */
  private rejectAllActiveRequests(code: Code, reason: string): void {
    this.activeQueryExecuteRequests.clear();
    this.activeMutationExecuteRequests.clear();
    this.activeSubscribeRequests.clear();

    const error = new DataConnectError(code, reason);
    for (const [requestId, { rejectFn }] of this.executeRequestPromises) {
      this.executeRequestPromises.delete(requestId);
      rejectFn(error);
    }

    for (const [requestId, observer] of this.subscribeObservers) {
      this.subscribeObservers.delete(requestId);
      observer.onDisconnect(code, reason);
    }
  }

  /**
   * Called by concrete implementations when the stream is successfully closed, gracefully or otherwise.
   */
  protected onStreamClose(code: number, reason: string): void {
    this.rejectAllActiveRequests(
      Code.OTHER,
      `Stream disconnected with code ${code}: ${reason}`
    );
  }

  /**
   * Prepares a stream request message by adding necessary headers and metadata.
   * If this is the first message on the stream, it includes the resource name, auth token, and App Check token.
   * If the auth token has refreshed since the last message, it includes the new auth token.
   *
   * This method is called by the concrete transport implementation before sending a message.
   *
   * @returns the requestBody, with attached headers and initial request fields
   */
  protected prepareMessage<
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
   * Sends a request message to the server via the concrete implementation.
   * Ensures the connection is ready and prepares the message before sending.
   * @returns A promise that resolves when the request message has been sent.
   */
  private sendRequestMessage<Variables>(
    requestBody: DataConnectStreamRequest<Variables>
  ): Promise<void> {
    if (this.streamIsReady) {
      const prepared = this.prepareMessage(requestBody);
      return this.sendMessage(prepared);
    }
    return this.ensureConnection().then(() => {
      const prepared = this.prepareMessage(requestBody);
      return this.sendMessage(prepared);
    });
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

  /**
   * @inheritdoc
   * @remarks
   * This method synchronously updates the request tracking data structures before sending any message.
   * If any asynchronous functionality is added to this function, it MUST be done in a way that
   * preserves the synchronous update of the tracking data structures before the method returns.
   */
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

    let { responsePromise, rejectFn } = this.trackQueryExecuteRequest<Data>(
      requestId,
      mapKey,
      executeBody
    );
    responsePromise = responsePromise.finally(() => {
      this.cleanupQueryExecuteRequest(requestId, mapKey);
      if (
        !this.hasActiveSubscriptions &&
        !this.hasActiveExecuteRequests &&
        this.closeTimeoutFinished
      ) {
        void this.attemptClose();
      }
    });

    // asynchronous, fire and forget
    this.sendRequestMessage<Variables>(executeBody).catch(err => {
      rejectFn(err);
    });
    return responsePromise;
  }

  /**
   * @inheritdoc
   * @remarks
   * This method synchronously updates the request tracking data structures before sending any message.
   * If any asynchronous functionality is added to this function, it MUST be done in a way that
   * preserves the synchronous update of the tracking data structures before the method returns.
   */
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

    let { responsePromise, rejectFn } = this.trackMutationExecuteRequest<Data>(
      requestId,
      mapKey,
      executeBody
    );
    responsePromise = responsePromise.finally(() => {
      this.cleanupMutationExecuteRequest(requestId, mapKey);
      if (
        !this.hasActiveSubscriptions &&
        !this.hasActiveExecuteRequests &&
        this.closeTimeoutFinished
      ) {
        void this.attemptClose();
      }
    });

    // asynchronous, fire and forget
    this.sendRequestMessage<Variables>(executeBody).catch(err => {
      rejectFn(err);
    });
    return responsePromise;
  }

  /**
   * @inheritdoc
   * @remarks
   * This method synchronously updates the request tracking data structures before sending any message
   * or cancelling the closing of the stream. If any asynchronous functionality is added to this function,
   * it MUST be done in a way that preserves the synchronous update of the tracking data structures
   * before the method returns.
   */
  invokeSubscribe<Data, Variables>(
    observer: SubscribeObserver<Data>,
    queryName: string,
    variables: Variables
  ): void {
    // if we are waiting to close the stream, cancel closing!
    this.cancelClose();

    const requestId = this.nextRequestId();
    const activeRequestKey = { operationName: queryName, variables };
    const mapKey = this.getMapKey(queryName, variables);
    const subscribeBody: SubscribeStreamRequest<Variables> = {
      requestId,
      subscribe: activeRequestKey
    };

    this.trackSubscribeRequest<Data>(
      requestId,
      mapKey,
      subscribeBody,
      observer
    );

    // asynchronous, fire and forget
    this.sendRequestMessage<Variables>(subscribeBody).catch(err => {
      observer.onError(err instanceof Error ? err : new Error(String(err)));
      this.cleanupSubscribeRequest(requestId, mapKey);
      if (!this.hasActiveSubscriptions) {
        this.prepareToCloseGracefully();
      }
    });
  }

  /**
   * @inheritdoc
   * @remarks
   * This method synchronously updates the request tracking data structures before sending any message.
   * If any asynchronous functionality is added to this function, it MUST be done in a way that
   * preserves the synchronous update of the tracking data structures before the method returns.
   */
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

    this.cleanupSubscribeRequest(requestId, mapKey);

    // asynchronous, fire and forget
    this.sendRequestMessage(cancelBody).catch(err => {
      logError(`Stream Transport failed to send unsubscribe message: ${err}`);
    });

    if (!this.hasActiveSubscriptions) {
      this.prepareToCloseGracefully();
    }
  }

  onAuthTokenChanged(newToken: string | null): void {
    const oldAuthToken = this._authToken;
    this._authToken = newToken;

    const oldAuthUid = this.authUid;
    const newAuthUid = this.authProvider?.getAuth()?.getUid();
    this.authUid = newAuthUid;

    // onAuthTokenChanged gets called by the auth provider once it initializes, so we must make sure
    // we don't prematurely disconnect the stream if this is the initial call.
    const isInitialAuth = oldAuthUid === undefined;
    if (isInitialAuth) {
      return;
    }

    if (
      (oldAuthToken && newToken === null) || // user logged out
      (!oldAuthUid && newAuthUid) || // user logged in
      (oldAuthUid && newAuthUid !== oldAuthUid) // logged in user changed
    ) {
      this.rejectAllActiveRequests(
        Code.UNAUTHORIZED,
        'Stream disconnected due to auth change.'
      );
      void this.attemptClose();
    }
  }

  /**
   * Handle a response message from the server. Called by the connection-specific implementation after
   * it's transformed a message from the server into a {@link DataConnectResponse}.
   * @param requestId the requestId associated with this response.
   * @param response the response from the server.
   */
  protected async handleResponse<Data>(
    requestId: string,
    response: DataConnectResponse<Data>
  ): Promise<void> {
    if (this.executeRequestPromises.has(requestId)) {
      // don't clean up the tracking maps here, they're handled automatically when the execute promise settles
      const { resolveFn, rejectFn } =
        this.executeRequestPromises.get(requestId)!;
      if (response.errors && response.errors.length) {
        const failureResponse: DataConnectOperationFailureResponse = {
          errors: response.errors as [],
          data: response.data as Record<string, unknown>
        };
        const stringified = JSON.stringify(response.errors);
        rejectFn(
          new DataConnectOperationError(
            'DataConnect error while performing request: ' + stringified,
            failureResponse
          )
        );
      } else {
        resolveFn(response);
      }
    } else if (this.subscribeObservers.has(requestId)) {
      const observer = this.subscribeObservers.get(requestId)!;
      await observer.onData(response);
    } else {
      throw new DataConnectError(
        Code.OTHER,
        `Stream response contained unrecognized requestId '${requestId}'`
      );
    }
  }
}
