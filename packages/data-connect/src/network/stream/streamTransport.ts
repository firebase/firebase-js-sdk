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

/** The Request ID of the first request over the stream */
const FIRST_REQUEST_ID = 1;

/** Time to wait before closing an idle connection (no active subscriptions). */
const IDLE_CONNECTION_TIMEOUT_MS = 60 * 1000; // 1 minute

/**
 * A promise returned to the user when invoking an operation via {@linkcode AbstractDataConnectStreamTransport.invokeQuery | invokeQuery}
 * or {@linkcode AbstractDataConnectStreamTransport.invokeMutation | invokeMutation} and the functions
 * that resolve/reject it.
 * @internal
 */
export interface InvokeOperationPromise<Data> {
  responsePromise: Promise<DataConnectResponse<Data>>;
  resolveFn: (response: DataConnectResponse<Data>) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rejectFn: (reason: any) => void;
}

/**
 * The base class for all Stream Transport implementations.
 * Handles management of logical streams (requests), authentication, data routing to query layer,
 * request optimizations, etc.
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

  /** True if the transport is unable to connect to the server */
  isUnableToConnect = false;

  /** True if there are active subscriptions on the stream */
  get hasActiveSubscriptions(): boolean {
    return this.activeInvokeSubscribeRequests.size > 0;
  }

  /** True if there are active execute or mutation requests on the stream */
  get hasActiveExecuteRequests(): boolean {
    return (
      this.activeInvokeQueryRequests.size > 0 ||
      this.activeInvokeMutationRequests.size > 0
    );
  }

  /**
   * Open a physical connection to the server.
   * @returns a promise which resolves when the connection is ready, or rejects if it fails to open.
   */
  protected abstract openConnection(): Promise<void>;

  /**
   * Close the physical connection with the server. Handles no cleanup - simply closes the
   * implementation-specific connection. On failure to close, the connection is still considered closed.
   * @returns a promise which resolves when the connection is closed, or rejects if it fails to close.
   */
  protected abstract closeConnection(): Promise<void>;

  /**
   * Queue a {@linkcode DataConnectStreamRequest} to be sent over the stream.
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

  /** The Request ID of the next message to be sent. Monotonically increasing sequence number starting at {@linkcode FIRST_REQUEST_ID}. */
  private requestNumber = FIRST_REQUEST_ID;
  /**
   * Generates and returns the next Request ID. Starts at {@linkcode FIRST_REQUEST_ID} and increments
   * for each request sent.
   */
  private nextRequestId(): string {
    return (this.requestNumber++).toString();
  }

  /**
   * Map of query/variables to their active {@linkcode ExecuteStreamRequest} or {@linkcode ResumeStreamRequest}
   * request bodies. These requests are de-duplicated by query/variables so that there is only one active
   * request for each query/variables combination.
   */
  private activeInvokeQueryRequests = new Map<
    string,
    ExecuteStreamRequest<unknown> | ResumeStreamRequest
  >();

  /**
   * Map of query/variables to the promises returned to the user, for invokeQuery requests which are
   * queued and waiting for active request to resolve.
   */
  private queuedInvokeQueryRequests = new Map<
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    InvokeOperationPromise<any>
  >();

  /**
   * Map of mutation/variables to their active {@linkcode ExecuteStreamRequest} request bodies. Mutations
   * can have more than one active request at a time as they are not idempotent, and therefore should
   * not be de-duplicated.
   */
  private activeInvokeMutationRequests = new Map<
    string,
    Array<ExecuteStreamRequest<unknown>>
  >();

  /**
   * Map of query/variables to their active {@linkcode SubscribeStreamRequest} request bodies. There
   * may only be one active request for each query/variables combination.
   */
  private activeInvokeSubscribeRequests = new Map<
    string,
    SubscribeStreamRequest<unknown>
  >();

  /**
   * Map of active {@linkcode ExecuteStreamRequest} RequestIds from {@linkcode invokeQuery} and {@linkcode invokeMutation},
   * and their corresponding {@linkcode InvokeOperationPromise}.
   */
  private executeRequestPromises = new Map<
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    InvokeOperationPromise<any>
  >();

  /**
   * Map of active {@linkcode invokeSubscribe} RequestIds and their corresponding {@linkcode SubscribeObserver}.
   */
  private subscribeObservers = new Map<string, SubscribeObserver<unknown>>();

  /** current close timeout from setTimeout(), if any */
  private closeTimeout: NodeJS.Timeout | null = null;
  /** has the close timeout finished? */
  private closeTimeoutFinished = false;
  /** current auth uid. used to detect if a different user logs in */
  private authUid: string | null | undefined;
  /** Flag to ensure we wait for the initial auth state once per connection attempt. */
  private hasWaitedForInitialAuth = false;

  /**
   * Tracks an {@linkcode invokeMutation} request, storing the request body and creating and storing a
   * response promise that will be resolved when the response is received.
   * @returns The tracked {@linkcode InvokeOperationPromise}.
   *
   * @remarks
   * This method returns a promise, but is synchronous.
   */
  private trackInvokeMutationRequest<Data>(
    requestId: string,
    mapKey: string,
    executeBody: ExecuteStreamRequest<unknown>
  ): InvokeOperationPromise<Data> {
    let resolveFn: (response: DataConnectResponse<Data>) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rejectFn: (reason: any) => void;
    const responsePromise = new Promise<DataConnectResponse<Data>>(
      (resolve, reject) => {
        resolveFn = resolve;
        rejectFn = reject;
      }
    );
    const executeRequestPromise: InvokeOperationPromise<Data> = {
      responsePromise,
      resolveFn: resolveFn!,
      rejectFn: rejectFn!
    };

    const activeRequests = this.activeInvokeMutationRequests.get(mapKey) || [];
    activeRequests.push(executeBody);
    this.activeInvokeMutationRequests.set(mapKey, activeRequests);
    this.executeRequestPromises.set(requestId, executeRequestPromise);

    return executeRequestPromise;
  }

  /**
   * Tracks an {@linkcode invokeSubscribe} request, storing the request body and the {@linkcode SubscribeObserver}.
   * @remarks
   * This method is synchronous.
   */
  private trackInvokeSubscribeRequest<Data>(
    requestId: string,
    mapKey: string,
    subscribeBody: SubscribeStreamRequest<unknown>,
    observer: SubscribeObserver<Data>
  ): void {
    this.activeInvokeSubscribeRequests.set(mapKey, subscribeBody);
    this.subscribeObservers.set(
      requestId,
      observer as SubscribeObserver<unknown>
    );
  }

  /**
   * Cleans up the query execute request tracking data structures, deleting the tracked request and
   * it's associated promise.
   */
  private cleanupInvokeQueryRequest(requestId: string, mapKey: string): void {
    this.activeInvokeQueryRequests.delete(mapKey);
    this.executeRequestPromises.delete(requestId);
  }

  /**
   * Cleans up the mutation execute request tracking data structures, deleting the tracked request and
   * it's associated promise.
   */
  private cleanupInvokeMutationRequest(
    requestId: string,
    mapKey: string
  ): void {
    const executeRequests = this.activeInvokeMutationRequests.get(mapKey);
    if (executeRequests) {
      const updatedRequests = executeRequests.filter(
        req => req.requestId !== requestId
      );
      if (updatedRequests.length > 0) {
        this.activeInvokeMutationRequests.set(mapKey, updatedRequests);
      } else {
        this.activeInvokeMutationRequests.delete(mapKey);
      }
    }
    this.executeRequestPromises.delete(requestId);
  }

  /**
   * Cleans up the subscribe request tracking data structures, deleting the tracked request and
   * it's associated promise.
   */
  private cleanupInvokeSubscribeRequest(
    requestId: string,
    mapKey: string
  ): void {
    this.activeInvokeSubscribeRequests.delete(mapKey);
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
    this.hasWaitedForInitialAuth = false;
  }

  /**
   * Attempt to close the connection. Will only close if there are no active requests preventing it
   * from doing so. Does not respect any {@linkcode closeTimeout}.
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
   * Begin closing the connection. Waits for {@linkcode IDLE_CONNECTION_TIMEOUT_MS} without cleaning up
   * any requests (meaning it will not close after the timeout unless the requests are closed first).
   * This is a graceful close - it will be called when there are no more active subscriptions, so
   * there's no need to cleanup.
   */
  private closeAfterTimeout(): void {
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
  private rejectAllRequests(code: Code, reason: string): void {
    this.activeInvokeQueryRequests.clear();
    this.activeInvokeMutationRequests.clear();
    this.activeInvokeSubscribeRequests.clear();

    const error = new DataConnectError(code, reason);
    for (const [mapKey, { rejectFn }] of this.queuedInvokeQueryRequests) {
      this.queuedInvokeQueryRequests.delete(mapKey);
      rejectFn(error);
    }
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
    this.rejectAllRequests(
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
      headers['X-Firebase-Auth-Token'] = this._authToken;
      this.lastSentAuthToken = this._authToken;
    }
    if (this.isFirstStreamMessage) {
      if (this._appCheckToken) {
        headers['X-Firebase-App-Check'] = this._appCheckToken;
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
  private async sendRequestMessage<Variables>(
    requestBody: DataConnectStreamRequest<Variables>
  ): Promise<void> {
    if (!this.hasWaitedForInitialAuth && this.authProvider) {
      await this.getWithAuth();
      this.hasWaitedForInitialAuth = true;
    }
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
   * Helper to generate a consistent string key for the request tracking maps.
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
    const mapKey = this.getMapKey(queryName, variables);

    if (this.activeInvokeQueryRequests.has(mapKey)) {
      return this.queueInvokeQueryRequest(mapKey);
    }

    return this.executeOrResumeQuery(queryName, variables, mapKey);
  }

  /**
   * Queue a new query execute request to be executed after the currently active query execute
   * request resolves, and track + return a promise associated with the queued request. If there is
   * already a queued request for this mapKey, return the existing queued request's promise instead.
   */
  private queueInvokeQueryRequest<Data>(
    mapKey: string
  ): Promise<DataConnectResponse<Data>> {
    const existingQueued = this.queuedInvokeQueryRequests.get(mapKey);
    if (existingQueued) {
      // only queue one request per mapKey - return existing queued request promise
      return existingQueued.responsePromise as Promise<
        DataConnectResponse<Data>
      >;
    }

    let resolveFn: (response: DataConnectResponse<Data>) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rejectFn: (reason: any) => void;
    const responsePromise = new Promise<DataConnectResponse<Data>>(
      (resolve, reject) => {
        resolveFn = resolve;
        rejectFn = reject;
      }
    );

    this.queuedInvokeQueryRequests.set(mapKey, {
      responsePromise,
      resolveFn: resolveFn!,
      rejectFn: rejectFn!
    });

    return responsePromise;
  }

  /**
   * Executes or resumes a query. Does not check for any active requests which may be overwritten by
   * this request - this should be handled by the caller.
   */
  private executeOrResumeQuery<Data, Variables>(
    queryName: string,
    variables: Variables | undefined,
    mapKey: string,
    queuedInvokeOperationPromise?: InvokeOperationPromise<Data>
  ): Promise<DataConnectResponse<Data>> {
    let resolveFn: (response: DataConnectResponse<Data>) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rejectFn: (reason: any) => void;
    let responsePromise: Promise<DataConnectResponse<Data>>;

    if (queuedInvokeOperationPromise) {
      resolveFn = queuedInvokeOperationPromise.resolveFn;
      rejectFn = queuedInvokeOperationPromise.rejectFn;
      responsePromise = queuedInvokeOperationPromise.responsePromise;
    } else {
      responsePromise = new Promise<DataConnectResponse<Data>>(
        (resolve, reject) => {
          resolveFn = resolve;
          rejectFn = reject;
        }
      );
    }

    const requestId = this.nextRequestId();
    const requestBody = {
      requestId,
      execute: { operationName: queryName, variables }
    } as ExecuteStreamRequest<Variables>;

    this.executeRequestPromises.set(requestId, {
      responsePromise,
      resolveFn: resolveFn!,
      rejectFn: rejectFn!
    });

    this.activeInvokeQueryRequests.set(mapKey, requestBody);

    void responsePromise.finally(() => {
      this.onInvokeQueryRequestFulfilled(
        queryName,
        variables,
        mapKey,
        requestId
      );
    });

    this.sendRequestMessage(requestBody).catch(err => {
      rejectFn(err);
    });
    return responsePromise;
  }

  /**
   * When a query invoke request is fulfilled, clean up and trigger the next queued
   * request if one exists.
   */
  private onInvokeQueryRequestFulfilled(
    queryName: string,
    variables: unknown,
    mapKey: string,
    requestId: string
  ): void {
    this.cleanupInvokeQueryRequest(requestId, mapKey);

    const queuedRequestPromise = this.queuedInvokeQueryRequests.get(mapKey);
    if (!queuedRequestPromise) {
      if (
        !this.hasActiveSubscriptions &&
        !this.hasActiveExecuteRequests &&
        this.pendingClose &&
        this.closeTimeoutFinished
      ) {
        void this.attemptClose();
      }
      return;
    }

    this.queuedInvokeQueryRequests.delete(mapKey);

    void this.executeOrResumeQuery(
      queryName,
      variables,
      mapKey,
      queuedRequestPromise
    );
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

    let { responsePromise, rejectFn } = this.trackInvokeMutationRequest<Data>(
      requestId,
      mapKey,
      executeBody
    );
    responsePromise = responsePromise.finally(() => {
      this.cleanupInvokeMutationRequest(requestId, mapKey);
      if (
        !this.hasActiveSubscriptions &&
        !this.hasActiveExecuteRequests &&
        this.pendingClose &&
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
    const mapKey = this.getMapKey(queryName, variables);

    if (this.activeInvokeSubscribeRequests.has(mapKey)) {
      // de-duplicate subscribe requests
      // the Query Layer also de-dupes subscribe requests, but this is here for good measure.
      // note that we do not multiplex observers here, that is handled by the Query Layer.
      return;
    }

    // if we are waiting to close the stream, cancel closing!
    this.cancelClose();
    const requestId = this.nextRequestId();
    const activeRequestKey = { operationName: queryName, variables };
    const subscribeBody: SubscribeStreamRequest<Variables> = {
      requestId,
      subscribe: activeRequestKey
    };

    this.trackInvokeSubscribeRequest<Data>(
      requestId,
      mapKey,
      subscribeBody,
      observer
    );

    // asynchronous, fire and forget
    this.sendRequestMessage<Variables>(subscribeBody).catch(err => {
      observer.onError(err instanceof Error ? err : new Error(String(err)));
      this.cleanupInvokeSubscribeRequest(requestId, mapKey);
      if (!this.hasActiveSubscriptions) {
        this.closeAfterTimeout();
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
    const subscribeRequest = this.activeInvokeSubscribeRequests.get(mapKey);
    if (!subscribeRequest) {
      return;
    }
    const requestId = subscribeRequest.requestId;

    this.subscribeObservers.delete(requestId);
    this.cancelSubscription(requestId, mapKey);
  }

  /**
   * Cancels a subscription, cleans up the request tracking data structures, and checks to see if we
   * should close the stream due to inactivity.
   */
  private cancelSubscription(requestId: string, mapKey: string): void {
    this.activeInvokeSubscribeRequests.delete(mapKey);
    this.subscribeObservers.delete(requestId);
    const cancelBody: CancelStreamRequest = {
      requestId,
      cancel: {}
    };

    // asynchronous, fire and forget
    this.sendRequestMessage(cancelBody).catch(err => {
      logError(`Stream Transport failed to send unsubscribe message: ${err}`);
    });

    if (!this.hasActiveSubscriptions) {
      this.closeAfterTimeout();
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
      this.rejectAllRequests(
        Code.UNAUTHORIZED,
        'Stream disconnected due to auth change.'
      );
      void this.attemptClose();
    }
  }

  /**
   * Handle a response message from the server. Called by the connection-specific implementation after
   * it's transformed a message from the server into a {@linkcode DataConnectResponse}.
   * @param requestId the Request ID associated with this response.
   * @param response the response from the server.
   */
  protected async handleResponse<Data>(
    requestId: string,
    response: DataConnectResponse<Data>
  ): Promise<void> {
    if (this.executeRequestPromises.has(requestId)) {
      const { resolveFn, rejectFn } =
        this.executeRequestPromises.get(requestId)!;
      this.handleInvokeOperationResponse(resolveFn, rejectFn, response);
    } else if (this.subscribeObservers.has(requestId)) {
      const observer = this.subscribeObservers.get(requestId);
      if (observer) {
        // it's possible that this query was pending cancellation with it's observers deleted but
        // an active resume request. so only call onData() if the observer still exists
        try {
          await observer.onData(response);
        } catch (e) {
          logError(`Error in observer callback: ${e}`);
        }
      }
    } else {
      throw new DataConnectError(
        Code.OTHER,
        `Stream response contained unrecognized requestId '${requestId}'`
      );
    }
  }

  /**
   * Handles an invoke operation response, resolving or rejecting the promise returned to the user
   * Does not handle any cleanup for requests - this should be handled by the caller or the promise's
   * finally() block.
   */
  private handleInvokeOperationResponse<Data>(
    resolveFn: (value: DataConnectResponse<Data>) => void,
    rejectFn: (reason: unknown) => void,
    response: DataConnectResponse<Data>
  ): void {
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
  }
}
