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
const EXECUTE_STR = 'exec';
const SUBSCRIBE_STR = 'sub';
type RequestType = typeof EXECUTE_STR | typeof SUBSCRIBE_STR;

/**
 * Key to identify requests coming from the operation layer.
 * @internal
 */
interface ActiveRequestKey {
  operationName: string;
  variables?: unknown;
}

/**
 * @internal
 */
export abstract class DataConnectStreamTransportClass extends DataConnectTransportClass {
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
    } // TODO(stephenarosaj): can type better?
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

  /** Monotonically increasing sequence number for execution requests */
  private _executionRequestNumber = 1;

  /**
   * Create a unique id for a request over the stream.
   * @returns the request id as a string
   */
  private _makeRequestId(requestType: RequestType): string {
    return `${requestType}-${this._executionRequestNumber++}`;
  }

  protected abstract openConnection(): Promise<void>;

  protected abstract closeConnection(): void;

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
   * Internal helper to queue a message to execute a one-off query or mutation.
   * @param body The execution payload.
   */
  protected _sendExecuteMessage<Variables>(
    body: ExecuteStreamRequest<Variables>
  ): void {
    this.sendMessage(body);
  }

  /**
   * Internal helper to queue a message to subscribe to a query.
   * @param subscribeRequestBody The subscription payload.
   */
  protected _sendSubscribeMessage<Variables>(
    subscribeRequestBody: SubscribeStreamRequest<Variables>
  ): void {
    this.sendMessage(subscribeRequestBody);
  }

  /**
   * Internal helper to queue a message to unsubscribe to a query.
   * @param cancelStreamRequest The cancel/unsubscription payload.
   */
  protected _sendCancelMessage(cancelStreamRequest: CancelStreamRequest): void {
    this.sendMessage(cancelStreamRequest);
  }

  invokeQuery<Data, Variables>(
    queryName: string,
    variables?: Variables
  ): Promise<DataConnectResponse<Data>> {
    const requestId = this._makeRequestId(EXECUTE_STR);
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
    const requestId = this._makeRequestId(EXECUTE_STR);
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
    const requestId = this._makeRequestId(SUBSCRIBE_STR);

    // TODO(stephenarosaj): "To save bandwidth, the Data Connect SDK should include data_etag of cached data in subsequent requests, so the backend can avoid sending redundant data already in SDK cache.
    const body: SubscribeStreamRequest<Variables> = {
      'name': this.connectorResourcePath,
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
  }

  // TODO(stephenarosaj): type better
  // TODO(stephenarosaj): tear down stream, open new one + reauthenticate
  // TODO(stephenarosaj): what about app check token?
  onAuthTokenChanged(newToken: string | null): void {
    this._accessToken = newToken;
    throw new Error('Method not implemented.');
  }
}
