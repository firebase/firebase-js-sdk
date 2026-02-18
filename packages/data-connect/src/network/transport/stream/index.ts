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

  /** is this connection pending close? */
  private _pendingClose = false;
  /** current connection close timeout from setTimeout(), if any */
  private _closeTimeout: NodeJS.Timeout | null = null;
  /** has the close timeout finished? */
  private _closeTimeoutFinished = false;

  /**
   * Map of active query execute/resume requests to their request bodies.
   */
  private _activeQueryExecuteRequests = new Map<
    ActiveRequestKey,
    ExecuteStreamRequest<unknown> | ResumeStreamRequest
  >();

  /**
   * Map of active mutation execute requests to their request bodies.
   */
  private _activeMutationExecuteRequests = new Map<
    ActiveRequestKey,
    Array<ExecuteStreamRequest<unknown>>
  >();

  /**
   * Map of active subscribe requests to their request bodies.
   */
  private _activeSubscribeRequests = new Map<
    ActiveRequestKey,
    SubscribeStreamRequest<unknown>
  >();

  /**
   * Set of subscriptions that are pending cancellation.
   */
  private _pendingCancellations = new Set<ActiveRequestKey>();

  private get _hasActiveSubscribeRequests(): boolean {
    return this._activeSubscribeRequests.size === 0;
  }

  private get _hasActiveExecuteRequests(): boolean {
    return (
      this._activeQueryExecuteRequests.size === 0 &&
      this._activeMutationExecuteRequests.size === 0
    );
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

  /** Monotonically increasing sequence number for request ids. starts at 1 */
  private _requestNumber = FIRST_REQUEST_ID;

  /**
   * Open a physical connection to the server.
   * @returns a promise which resolves when the connection is ready, or rejects if it fails to open.
   */
  protected abstract openConnection(): Promise<void>;

  /**
   * Close the physical connection with the server. Handles no cleanup - simply closes the
   * implementation-specific connection.
   * @returns a promise which resolves when the connection is ready, or rejects if it fails to open.
   */
  protected abstract closeConnection(): Promise<void>;

  /**
   * Begin closing the connection. Waits for and cleans up all active requests, and waits for 1 minute.
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
      // if we are pending close, the active execute requests will re-attempt once they resolve
      // TODO(stephenarosaj): if we are in fact pending close, should we set a fallback, like a 3 minute time so that if the execute requests don't resolve then we will close without waiting forever for a response?
      return;
    }
    await this.closeConnection();
  }

  /**
   * Forcefully close the connection and re-establish it, re-requesting all currently active requests.
   */
  private async _forceReconnect(): Promise<void> {
    // reset the connection
    await this.closeConnection();
    this._requestNumber = FIRST_REQUEST_ID;
    await this.openConnection();

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
        // edge case - no active notification hook somehow, although we were actively subscribed
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
          // edge case - no active execution promise somehow, although this was an active execution request
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
        // edge case - no active execution promise somehow, although this was an active execution request
        console.warn(
          `While reconnecting, found query '${activeRequestKey.operationName}' with variables ${activeRequestKey.variables} with active execution request with requestId '${oldRequestId}', but requestId did not have any tracked execution promises. Dropping execution.`
        );
      }
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

    if (this._shouldIncludeAuth && this._lastToken) {
      headers.authToken = this._lastToken; // TODO(stephenarosaj)
    }
    if (
      requestBody.requestId === FIRST_REQUEST_ID.toString() &&
      this._appCheckToken
    ) {
      headers.appCheckToken = this._appCheckToken;
      requestBody.name = this.connectorResourcePath;
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
    const activeRequest =
      this._activeQueryExecuteRequests.get(activeRequestKey);
    if (activeRequest) {
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

    // TODO(stephenarosaj): "To save bandwidth, the Data Connect SDK should include data_etag of cached data in subsequent requests, so the backend can avoid sending redundant data already in SDK cache.
    const body: ExecuteStreamRequest<Variables> = {
      requestId,
      'execute': activeRequestKey
    };
    this._sendExecuteMessage<Variables>(body);

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
      // TODO(stephenarosaj): should we do anything else in this case? - EDGE CASE #1
      console.warn(
        `Requested unsubscription of query which is not currently being subscribed to: '${queryName}' with variables ${variables}`
      );
      return;
    }
    const requestId = subscribeRequest.requestId;

    const notifyQueryManager = this._subscribeNotificationHooks.get(requestId);
    if (!notifyQueryManager) {
      // edge case - no notification hook, so no way for transport layer to update query layer of
      // new data from server. we don't want updates anymore anyways, so just log and continue.
      console.warn(
        `Requested unsubscription found valid requestId '${requestId}', but requestId did not have any tracked notification hook`
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
      await this._forceReconnect();
    }
  }
}
