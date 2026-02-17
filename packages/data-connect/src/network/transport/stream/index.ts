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
  SubscribeNotificationHook
} from '..';
import { Code, DataConnectError } from '../../../core/error';

import {
  CancelStreamRequest,
  DataConnectStreamRequest,
  ExecuteStreamRequest,
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
  /** should the next request include auth token? */
  protected _shouldIncludeAuth = true;

  /** is this connection pending close? */
  protected _pendingClose = false;
  /** current connection close timeout from setTimeout(), if any */
  protected _closeTimeout: NodeJS.Timeout | null = null;
  /** has the close timeout finished? */
  protected _closeTimeoutFinished = false;

  /**
   * Map of active execute requests to their request bodies.
   */
  protected _activeExecuteRequests = new Map<
    ActiveRequestKey,
    ExecuteStreamRequest<unknown>
  >();

  /**
   * Map of active subscribe requests to their request bodies.
   */
  protected _activeSubscribeRequests = new Map<
    ActiveRequestKey,
    SubscribeStreamRequest<unknown>
  >();

  protected get _hasActiveSubscribeRequests(): boolean {
    return this._activeSubscribeRequests.size === 0;
  }

  protected get _hasActiveExecuteRequests(): boolean {
    return this._activeExecuteRequests.size === 0;
  }

  /**
   * Map of active execution RequestIds and their corresponding Promises and resolvers.
   */
  protected _executeRequestPromises = new Map<
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

  protected abstract openConnection(): Promise<void>;

  protected abstract closeConnection(): void;

  /**
   * Begin closing the connection. Waits for and cleans up all active requests, and waits for 1 minute.
   */
  protected _prepareToClose(): void {
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
    this._closeTimeout = setTimeout(() => {
      this._closeTimeoutFinished = true;
      this._attemptClose();
    }, waitTime);
  }

  /**
   * Attempt to close the connection. Will only close if there are no active requests preventing it
   * from doing so.
   */
  protected _attemptClose(): void {
    if (this._hasActiveSubscribeRequests || this._hasActiveExecuteRequests) {
      // any subscriptions will prepare to close once they are cancelled
      // if we are pending close, the active execute requests will re-attempt once they resolve
      // TODO(stephenarosaj): if we are in fact pending close, should we set a fallback, like a 3 minute time so that if the execute requests don't resolve then we will close without waiting forever for a response?
      return;
    }
    this.closeConnection();
  }

  /**
   * Cancel closing the connection.
   */
  protected _cancelClose(): void {
    if (this._closeTimeout) {
      clearTimeout(this._closeTimeout);
    }
    this._pendingClose = false;
    this._closeTimeoutFinished = false;
  }

  /**
   * Generated and returns the next request ID.
   */
  protected _nextRequestId(): string {
    return (this._requestNumber++).toString();
  }

  protected _attachHeaders<
    Variables,
    StreamBody extends DataConnectStreamRequest<Variables>
  >(requestBody: StreamBody): StreamBody {
    if (requestBody.requestId === FIRST_REQUEST_ID.toString()) {
      // body.appCheckToken = '...'; // TODO
      requestBody.name = this.connectorResourcePath;
      // eslint-disable-next-line no-console
      console.log(`attaching for requestid ${requestBody.requestId}`); // DEBUGGING
    }
    if (this._shouldIncludeAuth) {
      // body.authToken = '...'; // TODO
    }
    // eslint-disable-next-line no-console
    console.log('HEADERS:', requestBody); // DEBUGGING
    return requestBody;
  }

  /**
   * Queues a message to be sent over the stream.
   * Automatically ensures the connection is open before sending.
   * @param requestBody The body of the message to be sent.
   * @throws DataConnectError if sending fails.
   */
  protected abstract sendMessage<Variables>(
    requestBody: DataConnectStreamRequest<Variables>
  ): void;

  /**
   * Attaches headers before sending message.
   * @param requestBody The body of the message to be sent.
   * @throws DataConnectError if sending fails.
   */
  protected _sendMessageWithHeaders<Variables>(
    requestBody: DataConnectStreamRequest<Variables>
  ): void {
    const body = this._attachHeaders(requestBody);
    this.sendMessage(body);
  }

  /**
   * Internal helper to queue a message to execute a one-off query or mutation.
   * @param body The execution payload.
   */
  protected _sendExecuteMessage<Variables>(
    body: ExecuteStreamRequest<Variables>
  ): void {
    this._sendMessageWithHeaders(body);
  }

  /**
   * Internal helper to queue a message to subscribe to a query.
   * @param subscribeRequestBody The subscription payload.
   */
  protected _sendSubscribeMessage<Variables>(
    subscribeRequestBody: SubscribeStreamRequest<Variables>
  ): void {
    this._sendMessageWithHeaders(subscribeRequestBody);
  }

  /**
   * Internal helper to queue a message to unsubscribe to a query.
   * @param cancelStreamRequest The cancel/unsubscription payload.
   */
  protected _sendCancelMessage(cancelStreamRequest: CancelStreamRequest): void {
    this._sendMessageWithHeaders(cancelStreamRequest);
  }

  /**
   * Handle a response message from the server.
   * @param requestId the requestId associated with this response.
   * @param response the response from the server.
   */
  protected _handleMessage<Data>(
    requestId: string,
    response: DataConnectResponse<Data>
  ): void {
    if (this._executeRequestPromises.has(requestId)) {
      // TODO(stephenarosaj): when do we use reject? if there was an ERROR error, like something really went wrong with the stream? in that case, it probably won't get called when handling a message, but rather in catach statements of stream-related functions, right...?
      const { resolve } = this._executeRequestPromises.get(requestId)!;
      resolve(response);
      this._executeRequestPromises.delete(requestId);
      // if we are waiting to close the stream, see if resolving this request will finally let us do so
      if (this._pendingClose && this._closeTimeoutFinished) {
        this._attemptClose();
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

  invokeQuery<Data, Variables>(
    queryName: string,
    variables?: Variables
  ): Promise<DataConnectResponse<Data>> {
    const requestId = this._nextRequestId();
    const activeRequestKey = { operationName: queryName, variables };
    const activeRequest = this._activeExecuteRequests.get(activeRequestKey);
    if (activeRequest) {
      // there is already an active execute request for this queryName + variables
      // do not duplicate requests. return the already pending promise
      const activeRequestPromise = this._executeRequestPromises.get(requestId);
      if (activeRequestPromise) {
        return activeRequestPromise.promise as Promise<
          DataConnectResponse<Data>
        >;
      } else {
        // edge case - no active request promise, so make a new one and re-request from server
        console.warn(
          `invokeQuery for operation '${queryName}' with variables ${variables} found activeRequest with requestId '${requestId}', but requestId did not have any tracked executeRequestPromise. Re-requesting from server.`
        );
      }
    }
    // TODO(stephenarosaj): "To save bandwidth, the Data Connect SDK should include data_etag of cached data in subsequent requests, so the backend can avoid sending redundant data already in SDK cache.
    const body: ExecuteStreamRequest<Variables> = {
      'name': this.connectorResourcePath,
      requestId,
      'execute': activeRequestKey
    };
    this._sendExecuteMessage<Variables>(body);
    this._activeExecuteRequests.set(activeRequestKey, body);

    // track and returna a promise so that transport layer can update query layer when results come
    // in, and de-duplicate identical requests that come in before server responds

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

  invokeMutation<Data, Variables>(
    mutationName: string,
    variables?: Variables
  ): Promise<DataConnectResponse<Data>> {
    const requestId = this._nextRequestId();
    const activeRequestKey = { operationName: mutationName, variables };
    // TODO(stephenarosaj): "To save bandwidth, the Data Connect SDK should include data_etag of cached data in subsequent requests, so the backend can avoid sending redundant data already in SDK cache.
    const body: ExecuteStreamRequest<Variables> = {
      'name': this.connectorResourcePath,
      requestId,
      'execute': activeRequestKey
    };
    this._sendExecuteMessage<Variables>(body);
    this._activeExecuteRequests.set(activeRequestKey, body);

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
      name: this.connectorResourcePath,
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

  // TODO(stephenarosaj): type better
  // TODO(stephenarosaj): tear down stream, open new one + reauthenticate
  // TODO(stephenarosaj): what about app check token?
  onAuthTokenChanged(newToken: string | null): void {
    this._accessToken = newToken;
    throw new Error('Method not implemented.');
  }
}
