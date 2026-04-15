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
 * A promise returned to the user from invokeQuery, and the functions that resolve/reject it.
 */
interface InvokeQueryPromise<Data> {
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
  private activeInvokeQueryRequests = new Map<
    string,
    ExecuteStreamRequest<unknown> | ResumeStreamRequest
  >();

  /**
   * Map of query/variables to an active queued execute requests awaiting for active request to resolve.
   */
  private queuedInvokeQueryRequests = new Map<
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    InvokeQueryPromise<any>
  >();

  /**
   * Map of mutation/variables to their active execute request bodies.
   */
  private activeInvokeMutationRequests = new Map<
    string,
    Array<ExecuteStreamRequest<unknown>>
  >();

  /**
   * Map of query/variables to their active subscribe request bodies.
   */
  private activeInvokeSubscribeRequests = new Map<
    string,
    SubscribeStreamRequest<unknown>
  >();

  /**
   * Map of active execution/resume RequestIds and their corresponding Promises and resolvers. Since
   * resume requests use the same RequestId as an active subscription, active Subscribe IDs may be
   * present in this map.
   */
  private executeRequestPromises = new Map<
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    InvokeQueryPromise<any>
  >();

  /**
   * Map of active resume RequestIds and their corresponding Promises and resolvers.
   */
  private resumeRequestPromises = new Map<
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    InvokeQueryPromise<any>
  >();

  /**
   * Map of active subscription RequestIds and their corresponding observers.
   */
  private subscribeObservers = new Map<string, SubscribeObserver<unknown>>();

  /**
   * Map of subscribe RequestIds to deferred unsubscription details.
   * Used when a client unsubscribes while a resume request is actively pending.
   */
  private pendingCancellations = new Map<
    string,
    { operationName: string; variables: unknown }
  >();

  /** current close timeout from setTimeout(), if any */
  private closeTimeout: NodeJS.Timeout | null = null;
  /** has the close timeout finished? */
  private closeTimeoutFinished = false;
  /** current auth uid. used to detect if a different user logs in */
  private authUid: string | null | undefined;
  /** Flag to ensure we wait for the initial auth state once per connection attempt. */
  private hasWaitedForInitialAuth = false;

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
  ): InvokeQueryPromise<Data> {
    let resolveFn: (response: DataConnectResponse<Data>) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rejectFn: (reason: any) => void;
    const responsePromise = new Promise<DataConnectResponse<Data>>(
      (resolve, reject) => {
        resolveFn = resolve;
        rejectFn = reject;
      }
    );
    const executeRequestPromise: InvokeQueryPromise<Data> = {
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
    this.activeInvokeSubscribeRequests.set(mapKey, subscribeBody);
    this.subscribeObservers.set(
      requestId,
      observer as SubscribeObserver<unknown>
    );
  }

  /**
   * Cleans up the InvokeQuery request tracking data structures, deleting the tracked request and
   * it's associated promise.
   */
  private cleanupInvokeQueryRequest(requestId: string, mapKey: string): void {
    this.executeRequestPromises.delete(requestId);
    this.resumeRequestPromises.delete(requestId);
    this.activeInvokeQueryRequests.delete(mapKey);
  }

  /**
   * Cleans up the mutation execute request tracking data structures, deleting the tracked request and
   * it's associated promise.
   */
  private cleanupMutationExecuteRequest(
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
   * Begin closing the connection. Waits for and cleans up all active requests, and waits for
   * {@linkcode IDLE_CONNECTION_TIMEOUT_MS}. This is a graceful close - it will be called when there are
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
   * Reject all active and pending execute/resume promises and notify all subscribe observers with
   * the given error. Clear active request tracking maps without cancelling or re-invoking any requests.
   */
  private rejectAllRequests(code: Code, reason: string): void {
    this.activeInvokeQueryRequests.clear();
    this.activeInvokeMutationRequests.clear();
    this.activeInvokeSubscribeRequests.clear();

    const error = new DataConnectError(code, reason);

    for (const [requestId, { rejectFn }] of this.executeRequestPromises) {
      this.executeRequestPromises.delete(requestId);
      rejectFn(error);
    }
    for (const [requestId, { rejectFn }] of this.resumeRequestPromises) {
      this.resumeRequestPromises.delete(requestId);
      rejectFn(error);
    }
    for (const [requestId, { rejectFn }] of this.queuedInvokeQueryRequests) {
      this.queuedInvokeQueryRequests.delete(requestId);
      rejectFn(error);
    }
    for (const [requestId, observer] of this.subscribeObservers) {
      this.subscribeObservers.delete(requestId);
      observer.onDisconnect(code, reason);
    }
    this.pendingCancellations.clear();
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
    const mapKey = this.getMapKey(queryName, variables);

    if (this.activeInvokeQueryRequests.has(mapKey)) {
      return this.queueInvokeQueryRequest(mapKey);
    }

    return this.executeOrResumeQuery(queryName, variables, mapKey);
  }

  /**
   * Queue a new query execute/resume request to be executed after the currently active query execute/resume
   * request resolves, and track + return a promise associated with the queued request. If there is
   * already a queued request for this mapKey, return the existing queued request's promise instead.
   */
  private queueInvokeQueryRequest<Data>(
    mapKey: string
  ): Promise<DataConnectResponse<Data>> {
    const existingQueued = this.queuedInvokeQueryRequests.get(mapKey);
    if (existingQueued) {
      return existingQueued.responsePromise as Promise<
        DataConnectResponse<Data>
      >;
    }

    let resolveFn: (response: DataConnectResponse<Data>) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rejectFn: (reason: any) => void;
    // unlike the other places where we create a response promise, we don't add a .finally() block
    // to cleanup the queued request map here, because this response promise is returned to the user
    // and therefore won't be resolved until it is popped and a response comes in from the server
    // for it. however, it DOES need to be moved from the queued map to the active map when popped.
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
   * Executes a query, or resumes an active subscription to the query if one exists.
   */
  private executeOrResumeQuery<Data, Variables>(
    queryName: string,
    variables: Variables | undefined,
    mapKey: string,
    injectedResolvers?: {
      responsePromise: Promise<DataConnectResponse<Data>>;
      resolveFn: (response: DataConnectResponse<Data>) => void;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rejectFn: (reason: any) => void;
    }
  ): Promise<DataConnectResponse<Data>> {
    const activeSubscription = this.activeInvokeSubscribeRequests.get(mapKey);

    let resolveFn: (response: DataConnectResponse<Data>) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rejectFn: (reason: any) => void;
    let responsePromise: Promise<DataConnectResponse<Data>>;

    if (injectedResolvers) {
      resolveFn = injectedResolvers.resolveFn;
      rejectFn = injectedResolvers.rejectFn;
      responsePromise = injectedResolvers.responsePromise;
    } else {
      responsePromise = new Promise<DataConnectResponse<Data>>(
        (resolve, reject) => {
          resolveFn = resolve;
          rejectFn = reject;
        }
      );
    }

    let requestId: string;
    let requestBody: ExecuteStreamRequest<Variables> | ResumeStreamRequest;

    if (activeSubscription) {
      // resume!
      requestId = activeSubscription.requestId;
      requestBody = { requestId, resume: {} } as ResumeStreamRequest;
      this.resumeRequestPromises.set(requestId, {
        responsePromise,
        resolveFn: resolveFn!,
        rejectFn: rejectFn!
      });
    } else {
      // execute!
      requestId = this.nextRequestId();
      requestBody = {
        requestId,
        execute: { operationName: queryName, variables }
      } as ExecuteStreamRequest<Variables>;
      this.executeRequestPromises.set(requestId, {
        responsePromise,
        resolveFn: resolveFn!,
        rejectFn: rejectFn!
      });
    }

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
   * When a query invoke (execute/resume) request is fulfilled, clean up and trigger the next queued
   * request if one exists.
   */
  private onInvokeQueryRequestFulfilled<Data>(
    queryName: string,
    variables: unknown,
    mapKey: string,
    requestId: string
  ): void {
    this.cleanupInvokeQueryRequest(requestId, mapKey);

    const queuedRequestPromise = this.queuedInvokeQueryRequests.get(mapKey);
    if (!queuedRequestPromise) {
      // Safe exit for connection timeouts
      if (
        !this.hasActiveSubscriptions &&
        !this.hasActiveExecuteRequests &&
        this.closeTimeoutFinished
      ) {
        void this.attemptClose();
      }
      return;
    }

    // move the queued request to the active request map - delete it here and it will be added to active
    // by executeOrResumeQuery
    this.queuedInvokeQueryRequests.delete(mapKey);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void this.executeOrResumeQuery(
      queryName,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      variables as any,
      mapKey,
      {
        responsePromise: queuedRequestPromise.responsePromise as Promise<
          DataConnectResponse<Data>
        >,
        resolveFn: queuedRequestPromise.resolveFn,
        rejectFn: queuedRequestPromise.rejectFn
      }
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
      this.activeInvokeSubscribeRequests.delete(mapKey);
      this.subscribeObservers.delete(requestId);
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
    const subscribeRequest = this.activeInvokeSubscribeRequests.get(mapKey);
    if (!subscribeRequest) {
      return;
    }

    const requestId = subscribeRequest.requestId;
    // delete the observer right away, but don't yet delete the invoke subscribe request as we may
    // have an active resume request for this invoke subscribe request
    this.subscribeObservers.delete(requestId);
    const resumePromise = this.resumeRequestPromises.get(requestId);
    if (resumePromise) {
      this.pendingCancellations.set(requestId, {
        operationName: queryName,
        variables
      });
      return;
    }
    // there is no pending resume, delete the invoke subscribe request
    this.activeInvokeSubscribeRequests.delete(mapKey);

    const cancelBody: CancelStreamRequest = {
      requestId,
      cancel: {}
    };

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
      this.handleInvokeQueryResponse(resolveFn, rejectFn, response);
    } else if (
      this.subscribeObservers.has(requestId) ||
      this.resumeRequestPromises.has(requestId)
    ) {
      const observer = this.subscribeObservers.get(requestId);
      const resumePromise = this.resumeRequestPromises.get(requestId);
      if (observer) {
        await observer.onData(response);
      }
      if (resumePromise) {
        const { resolveFn, rejectFn } = resumePromise;
        this.handleInvokeQueryResponse(resolveFn, rejectFn, response);
        const deferredCancel = this.pendingCancellations.get(requestId);
        if (deferredCancel) {
          this.pendingCancellations.delete(requestId);
          const cancelBody: CancelStreamRequest = {
            requestId,
            cancel: {}
          };
          this.sendRequestMessage(cancelBody).catch(err => {
            logError(
              `Stream Transport failed to send unsubscribe message: ${err}`
            );
          });
          if (!this.hasActiveSubscriptions) {
            this.prepareToCloseGracefully();
          }
        }
      }
    } else {
      throw new DataConnectError(
        Code.OTHER,
        `Stream response contained unrecognized requestId '${requestId}'`
      );
    }
  }

  private handleInvokeQueryResponse<Data>(
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
