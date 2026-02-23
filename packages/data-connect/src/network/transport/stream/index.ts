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

import { CallerSdkType, CallerSdkTypeEnum } from '..';
import { DataConnectOptions, TransportOptions } from '../../../api/DataConnect';
import { AppCheckTokenProvider } from '../../../core/AppCheckTokenProvider';
import { AuthTokenProvider } from '../../../core/FirebaseAuthProvider';

import {
  DataConnectResponse,
  DataConnectTransportClass,
  getGoogApiClientValue,
  SubscribeNotificationHook
} from '..';
import { Code, DataConnectError } from '../../../core/error';

import {
  CancelStreamRequest,
  DataConnectStreamRequest,
  ExecuteStreamRequest,
  queryRequestIsResume,
  ResumeStreamRequest,
  StreamRequestHeaders,
  SubscribeStreamRequest
} from './wire';

/**
 * @internal
 */
export interface ActiveRequest<Data, Variables> {
  operationName: string;
  variables?: Variables;
  requestBody: DataConnectStreamRequest<Data>;
}

/**
 * Key to identify requests coming from the operation layer.
 * @internal
 */
interface ActiveRequestKey {
  operationName: string;
  variables?: unknown;
}

/** the request id of the first request over the stream */
const FIRST_REQUEST_ID = 1;

/** Initial backoff time in milliseconds after an error. */
const BACKOFF_INITIAL_DELAY_MS = 1000;

/** The multiplier to use to determine the extended base delay after each reconnection attempt. */
const BACKOFF_FACTOR = 1.3;

/** Maximum backoff time in milliseconds */
const BACKOFF_MAX_DELAY_MS = 30 * 1000;

/** Reset delay back to MIN_DELAY after being connected for 30sec. */
const BACKOFF_RESET_DELAY_MS = 30000;

/**
 * Internal class for abstract management of logical streams (requests), authentication, data routing
 * to query layer, and all other non-connection-specific implementation of streaming protocol and functionality.
 * @internal
 */
export abstract class DataConnectStreamTransportClass extends DataConnectTransportClass {
  /** current auth uid. used to detect if a different user logs in */
  private _authUid: string | null | undefined;
  /** should the next request include auth token? */
  private _shouldIncludeAuth = true;

  /** True if the physical stream connection is fully open and ready to transmit data. */
  abstract get streamConnected(): boolean;

  /** is this connection closing down? */
  private _pendingClose = false;
  /** True if the stream connection has been requested to close */
  get isPendingClose(): boolean {
    return this._pendingClose;
  }
  /** current connection close timeout from setTimeout(), if any */
  private _closeTimeout: NodeJS.Timeout | null = null;
  /** has the close timeout finished? */
  private _closeTimeoutFinished = false;
  /** current backoff delay in ms */
  private _backoffDelay = BACKOFF_INITIAL_DELAY_MS;
  /** current backoff timer from setTimeout(), if any */
  private _backoffTimer: NodeJS.Timeout | null = null;
  /** current stable connection timer from setTimeout(), if any */
  private _stableConnectionTimer: NodeJS.Timeout | null = null;
  /** callback fired when the stream finishes closing */
  onGracefulStreamClose?: () => void;

  /** Consecutive failed connection attempts before we give up */
  private readonly MAX_CONNECTION_ATTEMPTS = 3;
  /** Current number of failed connection attempts in this instance of stream transport */
  private _failedConnectionAttempts = 0;
  /** True if the stream completely failed to establish connection after MAX_CONNECTION_ATTEMPTS */
  get isUnableToConnect() {
    return this._failedConnectionAttempts >= this.MAX_CONNECTION_ATTEMPTS;
  }

  /**
   * Tracks if the next message to be sent is the first message of the stream.
   * If true, we must include the 'name' field in the request body.
   */
  private _isFirstStreamMessage = true;
  /**
   * Tracks the last auth token sent to the server.
   * Used to detect if the token has changed and needs to be resent.
   */
  private _lastSentAccessToken: string | null = null;

  /**
   * Map of query/variables to their active execute/resume request bodies.
   */
  private _activeQueryExecuteRequests = new Map<
    ActiveRequestKey,
    ExecuteStreamRequest<unknown> | ResumeStreamRequest
  >();

  /**
   * Map of mutation/variables to their their active execute request bodies.
   */
  private _activeMutationExecuteRequests = new Map<
    ActiveRequestKey,
    Array<ExecuteStreamRequest<unknown>>
  >();

  /**
   * Map of query/variables to their their active subscribe request bodies.
   */
  private _activeSubscribeRequests = new Map<
    ActiveRequestKey,
    SubscribeStreamRequest<unknown>
  >();

  /**
   * Map of RequestIds for active subscriptions that are pending cancellation to their query/variables.
   */
  private _pendingCancellations = new Map<string, ActiveRequestKey>();

  private get _hasActiveSubscribeRequests(): boolean {
    return this._activeSubscribeRequests.size > 0;
  }

  private get _hasActiveExecuteRequests(): boolean {
    return (
      this._activeQueryExecuteRequests.size > 0 ||
      this._activeMutationExecuteRequests.size > 0
    );
  }

  /**
   * True if there are active subscriptions on the stream
   */
  get hasActiveSubscriptions(): boolean {
    return this._hasActiveSubscribeRequests;
  }

  /**
   * Map of active execution RequestIds and their corresponding Promises and resolvers.
   */
  private _executeRequestPromises = new Map<
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
   * Map of active subscription RequestIds and their corresponding notification hooks. These allow the
   * query layer to be updated when the transport layer receives data updates from the server.
   */
  protected _subscribeNotificationHooks = new Map<
    string,
    SubscribeNotificationHook<unknown>
  >();

  /**
   * The resource path formatted for the Data Connect backend.
   * Added to each request to identify which connector the request is associated with.
   */
  get connectorResourcePath(): string {
    return `projects/${this._project}/locations/${this._location}/services/${this._serviceName}/connectors/${this._connectorName}`;
  }

  constructor(
    options: DataConnectOptions,
    protected apiKey?: string | undefined,
    protected appId?: string | null,
    protected authProvider?: AuthTokenProvider | undefined,
    protected appCheckProvider?: AppCheckTokenProvider | undefined,
    transportOptions?: TransportOptions | undefined,
    protected _isUsingGen = false,
    protected _callerSdkType: CallerSdkType = CallerSdkTypeEnum.Base
  ) {
    super(
      options,
      apiKey,
      appId,
      authProvider,
      appCheckProvider,
      transportOptions,
      _isUsingGen,
      _callerSdkType
    );

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      // TODO(stephenarosaj): handle Cordova quirks if necessary (see packages/database/src/core/util/OnlineMonitor.ts)
      window.addEventListener('online', () => this._onOnline());
      document.addEventListener('visibilitychange', () =>
        this._onVisibilityChange()
      );
    }
  }

  /** Monotonically increasing sequence number for request ids. starts at 1 */
  private _requestNumber = FIRST_REQUEST_ID;

  /**
   * Open a physical connection to the server.
   * @returns a promise which resolves when the connection is ready, or rejects if it fails to open.
   */
  protected abstract openConnection(): Promise<void>;

  /**
   * Called when the connection is lost/closed by the server or network.
   * Handles exponential backoff and reconnection logic.
   */
  protected _handleConnectionLost(): void {
    if (this._pendingClose) {
      // expected close
      return;
    }

    if (this.isUnableToConnect) {
      // stop trying to reconnect if we've completely given up
      return;
    }

    if (this._stableConnectionTimer) {
      clearTimeout(this._stableConnectionTimer);
      this._stableConnectionTimer = null;
    }

    this._failedConnectionAttempts++;
    if (this.isUnableToConnect) {
      this._clearAllPendingRequests(
        new DataConnectError(
          Code.OTHER,
          `Failed to establish a streaming connection after ${this.MAX_CONNECTION_ATTEMPTS} attempts. WebSockets may not be supported in this environment.`
        )
      );
      return;
    }

    // randomize delay to avoid thundering herd
    const jitter = (Math.random() - 0.5) * this._backoffDelay;
    const delay = Math.max(0, this._backoffDelay + jitter);

    if (this._backoffTimer) {
      clearTimeout(this._backoffTimer);
    }
    this._backoffTimer = setTimeout(() => {
      this._attemptReconnect();
    }, delay);

    // increase backoff for next time
    this._backoffDelay = Math.min(
      this._backoffDelay * BACKOFF_FACTOR,
      BACKOFF_MAX_DELAY_MS
    );
  }

  /**
   * Attempt to reconnect to the server.
   */
  private async _attemptReconnect(): Promise<void> {
    try {
      await this.openConnection();

      // if successful, reset backoff after a stable period
      if (this._stableConnectionTimer) {
        clearTimeout(this._stableConnectionTimer);
      }
      this._stableConnectionTimer = setTimeout(() => {
        this._backoffDelay = BACKOFF_INITIAL_DELAY_MS;
        this._failedConnectionAttempts = 0;
      }, BACKOFF_RESET_DELAY_MS);

      // resend active requests
      await this._resendActiveRequests();
    } catch (err) {
      // if failed, try again with backoff
      this._handleConnectionLost();
    }
  }

  private _onOnline(): void {
    this._triggerInstantReconnect();
  }

  private _onVisibilityChange(): void {
    if (!document.hidden) {
      this._triggerInstantReconnect();
    }
  }

  /**
   * If not connected, bypass backoff and try to connect immediately.
   */
  private _triggerInstantReconnect(): void {
    if (this._backoffTimer && !this._pendingClose) {
      clearTimeout(this._backoffTimer);
      this._backoffTimer = null;
      // reset backoff delay since we are triggered by environment
      this._backoffDelay = BACKOFF_INITIAL_DELAY_MS;
      this._attemptReconnect();
    }
  }

  /**
   * Resend all active requests. Used after a reconnection.
   */
  private async _resendActiveRequests(): Promise<void> {
    this._requestNumber = FIRST_REQUEST_ID;

    // re-request existing subscriptions
    for (const [activeRequestKey, subscribeRequestBody] of this
      ._activeSubscribeRequests) {
      this._activeSubscribeRequests.delete(activeRequestKey);
      const oldRequestId = subscribeRequestBody.requestId;
      const notificationHook =
        this._subscribeNotificationHooks.get(oldRequestId);
      this._subscribeNotificationHooks.delete(oldRequestId);
      if (notificationHook) {
        // re-invoke subscription
        this.invokeSubscribe(
          notificationHook,
          activeRequestKey.operationName,
          activeRequestKey.variables
        );
      } else {
        // edge case
        console.warn(
          `While reconnecting, found query '${activeRequestKey.operationName}' with variables ${activeRequestKey.variables} with active subscribe request with requestId '${oldRequestId}', but requestId did not have any tracked notification hook. Dropping subscription.`
        );
      }
    }

    // re-request existing mutations
    for (const [activeRequestKey, mutationRequestSet] of this
      ._activeMutationExecuteRequests) {
      this._activeMutationExecuteRequests.delete(activeRequestKey);
      for (const mutationRequestBody of mutationRequestSet) {
        const oldRequestId = mutationRequestBody.requestId;
        const oldPromise = this._executeRequestPromises.get(oldRequestId);
        this._executeRequestPromises.delete(oldRequestId);
        if (oldPromise) {
          // re-invoke mutation, and connect new promise to old promise
          void this.invokeMutation(
            activeRequestKey.operationName,
            activeRequestKey.variables
          ).then(response => oldPromise.resolve(response));
        } else {
          // edge case
          console.warn(
            `While reconnecting, found mutation '${activeRequestKey.operationName}' with variables ${activeRequestKey.variables} with active execution request with requestId '${oldRequestId}', but requestId did not have any tracked execution promises. Dropping execution.`
          );
        }
      }
    }

    // re-request existing queries
    for (const [activeRequestKey, queryRequestBody] of this
      ._activeQueryExecuteRequests) {
      this._activeQueryExecuteRequests.delete(activeRequestKey);
      const oldRequestId = queryRequestBody.requestId;
      const oldPromise = this._executeRequestPromises.get(oldRequestId);
      this._executeRequestPromises.delete(oldRequestId);
      if (oldPromise) {
        // re-invoke query, and connect new promise to old promise
        void this.invokeQuery(
          activeRequestKey.operationName,
          activeRequestKey.variables
        ).then(response => oldPromise.resolve(response));
      } else {
        // edge case
        console.warn(
          `While reconnecting, found query '${activeRequestKey.operationName}' with variables ${activeRequestKey.variables} with active execution request with requestId '${oldRequestId}', but requestId did not have any tracked execution promises. Dropping execution.`
        );
      }
    }
  }

  /**
   * Close the physical connection with the server. Handles no cleanup - simply closes the
   * implementation-specific connection.
   * @returns a promise which resolves when the connection is ready, or rejects if it fails to open.
   */
  protected abstract closeConnection(): Promise<void>;

  /**
   * Begin closing the connection. Waits for and cleans up all active requests, and waits for 1 minute.
   * Will be called when there are no more active subscriptions.
   */
  private _prepareToClose(): void {
    if (this._pendingClose) {
      return;
    }
    this._pendingClose = true;

    this._activeSubscribeRequests.forEach(requestBody => {
      this.invokeUnsubscribe(
        requestBody.subscribe.operationName,
        requestBody.subscribe.variables
      );
    });

    const waitTime = 1000 * 60; // 1 minute
    this._closeTimeout = setTimeout(async () => {
      this._closeTimeoutFinished = true;
      await this._attemptClose();
    }, waitTime);
  }

  /**
   * Attempt to close the connection. Will only close if there are no active requests preventing it
   * from doing so.
   */
  private async _attemptClose(): Promise<void> {
    if (this._hasActiveSubscribeRequests || this._hasActiveExecuteRequests) {
      // any subscriptions will prepare to close once they are cancelled
      // if we are pending close, any active execute requests will re-attempt once they resolve
      // TODO(stephenarosaj): if we are in fact pending close, should we set a fallback? like a 3 minute time so that if the execute requests don't resolve then we will close without waiting forever for a response?
      return;
    }
    await this.closeConnection();
    this.onGracefulStreamClose?.();
  }

  /**
   * Forcefully close the connection and re-establish it.
   */
  private async _forceReconnect(): Promise<void> {
    // prevent auto-reconnect logic from triggering during this explicit reconnect
    this._pendingClose = true;
    try {
      await this.closeConnection();
    } finally {
      this._pendingClose = false;
    }

    await this.openConnection();
  }

  /**
   * Reject all pending execute promises and subscribe hooks with the given error. Clear active request
   * tracking maps without cancelling or re-invoking any requests.
   */
  private _clearAllPendingRequests(error: DataConnectError): void {
    this._activeQueryExecuteRequests.clear();
    this._activeMutationExecuteRequests.clear();
    this._activeSubscribeRequests.clear();

    for (const [requestId, { reject }] of this._executeRequestPromises) {
      this._executeRequestPromises.delete(requestId);
      reject(error);
    }

    for (const [requestId, notifyHook] of this._subscribeNotificationHooks) {
      this._subscribeNotificationHooks.delete(requestId);
      notifyHook({
        data: null,
        errors: [error],
        extensions: {}
      });
    }
  }

  /**
   * Cancel closing the connection.
   */
  private _cancelClose(): void {
    if (this._closeTimeout) {
      clearTimeout(this._closeTimeout);
    }
    this._pendingClose = false;
    this._closeTimeoutFinished = false;
  }

  /**
   * Called by the concrete transport implementation when the physical connection is ready.
   * Resets stream state variables.
   */
  protected onConnectionReady(): void {
    this._isFirstStreamMessage = true;
    this._lastSentAccessToken = null;
  }

  /**
   * Generated and returns the next request ID.
   */
  private _nextRequestId(): string {
    return (this._requestNumber++).toString();
  }

  /**
   * Attaches headers and adds fields required for initial request
   * @returns the requestBody, with attached headers or initial request fields
   */
  private _prepareMessage<
    Variables,
    StreamBody extends DataConnectStreamRequest<Variables>
  >(requestBody: StreamBody): StreamBody {
    const headers: StreamRequestHeaders = {};

    headers['X-Goog-Api-Client'] = getGoogApiClientValue(
      this._isUsingGen,
      this._callerSdkType
    );
    if (this.appId) {
      headers['x-firebase-gmpid'] = this.appId;
    }

    const accessToken = this._accessToken;
    if (this._shouldIncludeAuth && accessToken) {
      if (
        this._isFirstStreamMessage ||
        accessToken !== this._lastSentAccessToken
      ) {
        headers.authToken = accessToken;
        this._lastSentAccessToken = accessToken;
      }
    }

    if (this._isFirstStreamMessage) {
      if (this._appCheckToken) {
        headers.appCheckToken = this._appCheckToken;
      }
      requestBody.name = this.connectorResourcePath;
      this._isFirstStreamMessage = false;
    }

    // requestBody.headers = headers; // TODO(stephenarosaj): add this in when the backend is ready
    return requestBody;
  }

  /**
   * Connection-specific implementation that queues a message to be sent over the stream.
   * Must ensure the connection is open and ready before sending.
   * @param requestBody The body of the message to be sent.
   * @throws DataConnectError if sending fails.
   */
  protected abstract sendMessage<Variables>(
    requestBody: DataConnectStreamRequest<Variables>
  ): void;

  /**
   * Internal helper to queue a message to execute a one-off query or mutation.
   * @param executeRequestBody The execution payload.
   */
  private _sendExecuteMessage<Variables>(
    executeRequestBody: ExecuteStreamRequest<Variables>
  ): void {
    const requestBody = this._prepareMessage(executeRequestBody);
    this.sendMessage(requestBody);
  }

  /**
   * Internal helper to queue a message to subscribe to a query.
   * @param subscribeRequestBody The subscription payload.
   */
  private _sendSubscribeMessage<Variables>(
    subscribeRequestBody: SubscribeStreamRequest<Variables>
  ): void {
    const requestBody = this._prepareMessage(subscribeRequestBody);
    this.sendMessage(requestBody);
  }

  /**
   * Internal helper to queue a message to unsubscribe to a query.
   * @param cancelRequestBody The cancel/unsubscription payload.
   */
  private _sendCancelMessage(cancelRequestBody: CancelStreamRequest): void {
    const requestBody = this._prepareMessage(cancelRequestBody);
    this.sendMessage(requestBody);
  }

  /**
   * Internal helper to queue a message to resume a query.
   * @param resumeRequestBody The resume payload.
   */
  private _sendResumeMessage(resumeRequestBody: ResumeStreamRequest): void {
    const requestBody = this._prepareMessage(resumeRequestBody);
    this.sendMessage(requestBody);
  }

  /**
   * Handle a response message from the server. Called by the connection-specific implementation after
   * it's transformed a message from the server into a DataConnectResponse.
   * @param requestId the requestId associated with this response.
   * @param response the response from the server.
   */
  protected async _handleMessage<Data>(
    requestId: string,
    response: DataConnectResponse<Data>
  ): Promise<void> {
    if (this._executeRequestPromises.has(requestId)) {
      // TODO(stephenarosaj): when do we use reject? if there was an ERROR error, like something really went wrong with the stream? in that case, it probably won't get called when handling a message, but rather in catach statements of stream-related functions, right...?
      const { resolve } = this._executeRequestPromises.get(requestId)!;
      resolve(response);
      this._executeRequestPromises.delete(requestId);

      // if we are waiting for this request to resolve to cancel a subscription, now we can do so
      const activeRequestKey = this._pendingCancellations.get(requestId);
      if (activeRequestKey) {
        this._pendingCancellations.delete(requestId);
        this.invokeUnsubscribe(
          activeRequestKey.operationName,
          activeRequestKey.variables
        );
      }

      // if we are waiting to close the stream, see if resolving this request will finally let us do so
      if (this._pendingClose && this._closeTimeoutFinished) {
        await this._attemptClose();
      }
    } else if (this._subscribeNotificationHooks.has(requestId)) {
      const notifyQueryManager =
        this._subscribeNotificationHooks.get(requestId)!;
      notifyQueryManager(response);
    } else {
      throw new DataConnectError(
        Code.OTHER,
        `Unrecognized requestId '${requestId}'`
      );
    }
  }

  private _makeNewExecutePromise<Data>(
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
    this._executeRequestPromises.set(requestId, {
      resolve: resolveFn!,
      reject: rejectFn!,
      promise: responsePromise as Promise<DataConnectResponse<unknown>>
    });

    return responsePromise;
  }

  invokeQuery<Data, Variables>(
    queryName: string,
    variables?: Variables
  ): Promise<DataConnectResponse<Data>> {
    const requestId = this._nextRequestId();
    const activeRequestKey = { operationName: queryName, variables };
    const activeExecuteRequest =
      this._activeQueryExecuteRequests.get(activeRequestKey);
    if (activeExecuteRequest) {
      // there is already an active execute request for this queryName + variables
      // do not duplicate requests. return the already pending promise
      const activeRequestPromise = this._executeRequestPromises.get(requestId);
      if (activeRequestPromise) {
        return activeRequestPromise.promise as Promise<
          DataConnectResponse<Data>
        >;
      } else {
        // edge case - no active request promise somehow, so make a new one and re-request from server
        console.warn(
          `invokeQuery for operation '${queryName}' with variables ${variables} found activeRequest with requestId '${requestId}', but requestId did not have any tracked executeRequestPromise. Re-requesting from server.`
        );
      }
    }

    let body: ExecuteStreamRequest<Variables> | ResumeStreamRequest;
    const activeSubscribeRequest =
      this._activeSubscribeRequests.get(activeRequestKey);
    if (activeSubscribeRequest) {
      // there is already an active subscribe request for this queryName + variables
      // do not use an execute request. use a resume request
      body = {
        requestId,
        'resume': {}
      };
      this._sendResumeMessage(body);
    } else {
      // there is no active subscribe request - use an execut request
      // TODO(stephenarosaj): "To save bandwidth, the Data Connect SDK should include data_etag of cached data in subsequent requests, so the backend can avoid sending redundant data already in SDK cache.
      body = {
        requestId,
        'execute': activeRequestKey
      };
      this._sendExecuteMessage<Variables>(body);
    }

    this._activeQueryExecuteRequests.set(activeRequestKey, body);

    return this._makeNewExecutePromise<Data>(requestId);
  }

  invokeMutation<Data, Variables>(
    mutationName: string,
    variables?: Variables
  ): Promise<DataConnectResponse<Data>> {
    const requestId = this._nextRequestId();
    const activeRequestKey = { operationName: mutationName, variables };
    // TODO(stephenarosaj): "To save bandwidth, the Data Connect SDK should include data_etag of cached data in subsequent requests, so the backend can avoid sending redundant data already in SDK cache.
    const body: ExecuteStreamRequest<Variables> = {
      requestId,
      'execute': activeRequestKey
    };
    this._sendExecuteMessage<Variables>(body);

    const mutationRequestBodies =
      this._activeMutationExecuteRequests.get(activeRequestKey) || [];
    mutationRequestBodies.push(body);
    this._activeMutationExecuteRequests.set(
      activeRequestKey,
      mutationRequestBodies
    );

    return this._makeNewExecutePromise<Data>(requestId);
  }

  invokeSubscribe<Data, Variables>(
    notifyQueryManager: SubscribeNotificationHook<Data>,
    queryName: string,
    variables: Variables
  ): void {
    const activeRequestKey = { operationName: queryName, variables };
    const activeRequest = this._activeSubscribeRequests.get(activeRequestKey);
    if (activeRequest) {
      // we have already subscribed to this query
      const requestId = activeRequest.requestId;
      const existingNotify = this._subscribeNotificationHooks.get(requestId);
      if (existingNotify) {
        // and we already have a notificaiton hook set up to pass data updates to the query layer
        return;
      } else {
        // edge case - no active request notification hook, so make a new one and re-request from server
        console.warn(
          `invokeSubscribe for operation '${queryName}' with variables ${variables} found activeRequest with requestId '${requestId}', but requestId did not have any tracked executeRequestPromise. Re-requesting from server.`
        );
      }
    }

    // if we are waiting to close the stream, cancel closing!
    this._cancelClose();

    const requestId = this._nextRequestId();

    // TODO(stephenarosaj): "To save bandwidth, the Data Connect SDK should include data_etag of cached data in subsequent requests, so the backend can avoid sending redundant data already in SDK cache.
    const body: SubscribeStreamRequest<Variables> = {
      requestId,
      'subscribe': activeRequestKey
    };

    this._sendSubscribeMessage<Variables>(body);
    this._activeSubscribeRequests.set(activeRequestKey, body);
    this._subscribeNotificationHooks.set(
      requestId,
      notifyQueryManager as SubscribeNotificationHook<unknown> // TODO(stephenarosaj): is there a way to avoid casting this?
    );
  }

  invokeUnsubscribe<Variables>(queryName: string, variables: Variables): void {
    const activeRequestKey = { operationName: queryName, variables };
    const subscribeRequest =
      this._activeSubscribeRequests.get(activeRequestKey);
    if (!subscribeRequest) {
      console.warn(
        `Requested unsubscription of query which is not currently being subscribed to: '${queryName}' with variables ${variables}`
      );
      return;
    }
    const requestId = subscribeRequest.requestId;

    const executeRequest =
      this._activeQueryExecuteRequests.get(activeRequestKey);
    if (executeRequest && queryRequestIsResume(executeRequest)) {
      // there is an existing resume request for the active subscription - we must wait for it to resolve
      this._pendingCancellations.set(requestId, activeRequestKey);
      return;
    }

    const notifyQueryManager = this._subscribeNotificationHooks.get(requestId);
    if (!notifyQueryManager) {
      // edge case - no notification hook, so no way for transport layer to update query layer of
      // new data from server. we don't want updates anymore anyways, so just log and continue.
      console.warn(
        `Requested unsubscription found valid requestId '${requestId}', but requestId did not have any tracked notification hook. Cancelling anyways.`
      );
    }

    const body: CancelStreamRequest = {
      requestId,
      cancel: {}
    };
    this._sendCancelMessage(body);
    this._activeSubscribeRequests.delete(activeRequestKey);
    this._subscribeNotificationHooks.delete(requestId);

    /** close stream if no more subscriptions */
    if (!this._hasActiveSubscribeRequests) {
      this._prepareToClose();
    }
  }

  /**
   * Handle auth token change event - send new token with next request, or if this new token is for
   * a different user, tear down and reconnect the stream.
   */
  async onAuthTokenChanged(newToken: string | null): Promise<void> {
    const oldAuthToken = this._accessToken;
    this._accessToken = newToken;

    const oldAuthUid = this._authUid;
    const newAuthUid = this.authProvider?.getAuth().getUid();
    this._authUid = newAuthUid;

    if (
      (oldAuthToken && newToken === null) ||
      (oldAuthUid && newAuthUid !== oldAuthUid)
    ) {
      // (user logged out) || (old user was logged in previously, now new user is logged in)
      if (this._hasActiveSubscribeRequests || this._hasActiveExecuteRequests) {
        await this._forceReconnect();
      }
    }
  }
}
