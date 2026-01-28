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
  SubscribeTransportCallback
} from '..';

import {
  AuthenticationStreamRequest,
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
   * Map of active execution RequestIds and their corresponding Promise resolvers.
   */
  protected _executeRequestPromises = new Map<
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { resolve: (data: any) => void; reject: (err: any) => void } // TODO: can type better?
  >();

  // TODO: we need to also track the request body so that if the stream disconnects/reconnects, we can re-subscribe... unless...?
  /**
   * Map of active subscription RequestIds and their corresponding callbacks. These callbacks are
   * provided by the operation layer, which handles calling the user's registered callbacks
   */
  protected _subscribeRequestCallbacks = new Map<
    // TODO: these callbacks should be supplied by the operation layer when invoking the subscribe transport functions
    string,
    SubscribeTransportCallback<unknown>
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
   * Internal helper to queue a message to subscribe to a query.
   * @param cancelStreamRequest The cancel/unsubscription payload.
   */
  protected _sendCancelMessage(cancelStreamRequest: CancelStreamRequest): void {
    this.sendMessage(cancelStreamRequest);
  }

  /**
   * Internal helper to queue a message to subscribe to a query.
   * @param cancelStreamRequest The cancel/unsubscription payload.
   */
  protected _sendAuthenticationMessage(
    authenticationMessage: AuthenticationStreamRequest
  ): void {
    this.sendMessage(authenticationMessage);
  }

  invokeQuery<Data, Variables>(
    queryName: string,
    body?: Variables
  ): Promise<DataConnectResponse<Data>> {
    return this._invokeExecute(queryName, body);
  }

  invokeMutation<Data, Variables>(
    mutationName: string,
    body?: Variables
  ): Promise<DataConnectResponse<Data>> {
    return this._invokeExecute(mutationName, body);
  }

  /**
   * Internal helper to execute a Query or Mutation over the stream.
   * @param operationName The name of the operation.
   * @param variables The operation variables.
   */
  private _invokeExecute<Data, Variables>(
    operationName: string,
    variables?: Variables
  ): Promise<DataConnectResponse<Data>> {
    const requestId = this._makeRequestId(EXECUTE_STR);
    const activeRequestKey = { operationName, variables };
    // TODO: "To save bandwidth, the Data Connect SDK should include data_etag of cached data in subsequent requests, so the backend can avoid sending redundant data already in SDK cache.
    const body: ExecuteStreamRequest<Variables> = {
      'name': this.connectorResourcePath,
      requestId,
      'execute': activeRequestKey
    };

    this._sendExecuteMessage<Variables>(body);
    this._activeExecuteRequests.set(activeRequestKey, body);
    const responsePromise = new Promise<DataConnectResponse<Data>>(
      (resolve, reject) => {
        this._executeRequestPromises.set(requestId, { resolve, reject });
      }
    );
    return responsePromise;
  }

  invokeSubscribe<Data, Variables>(
    callback: SubscribeTransportCallback<Data>,
    queryName: string,
    variables: Variables
  ): void {
    const activeRequestKey = { operationName: queryName, variables };
    if (this._activeSubscribeRequests.get(activeRequestKey)) {
      // we have already subscribed to this query
      // TODO: should we run an ad-hoc execute?
      return;
    }
    const requestId = this._makeRequestId(SUBSCRIBE_STR);

    // TODO: "To save bandwidth, the Data Connect SDK should include data_etag of cached data in subsequent requests, so the backend can avoid sending redundant data already in SDK cache.
    const body: SubscribeStreamRequest<Variables> = {
      'name': this.connectorResourcePath,
      requestId,
      'subscribe': activeRequestKey
    };

    this._sendSubscribeMessage<Variables>(body);
    this._activeSubscribeRequests.set(activeRequestKey, body);
    this._subscribeRequestCallbacks.set(
      requestId,
      callback as SubscribeTransportCallback<unknown> // TODO: is there a way to avoid casting this?
    );
  }

  invokeUnsubscribe<Variables>(queryName: string, variables: Variables): void {
    const activeRequestKey = { operationName: queryName, variables };
    const subscribeRequest =
      this._activeSubscribeRequests.get(activeRequestKey);
    if (!subscribeRequest) {
      // TODO: should we do anything else in this case?
      console.warn(
        `Requested unsubscription of query which is not currently being subscribed to: '${queryName}' with variables ${variables}`
      );
      return;
    }
    const requestId = subscribeRequest.requestId;

    const callbacks = this._subscribeRequestCallbacks.get(requestId);
    if (!callbacks) {
      // TODO: should we do anything else in this case?
      console.warn(
        `Requested unsubscription found valid requestId '${requestId}', but requestId did not have any tracked callbacks`
      );
      return;
    }

    const body: CancelStreamRequest = {
      name: this.connectorResourcePath,
      requestId,
      cancel: {}
    };
    this._sendCancelMessage(body);
    this._activeSubscribeRequests.delete(activeRequestKey);
    this._subscribeRequestCallbacks.delete(requestId);
  }

  // TODO: type better
  // TODO: tear down stream, open new one + reauthenticate
  // TODO: what about app check token?
  onAuthTokenChanged(newToken: string | null): void {
    this._authToken = newToken;
    throw new Error('Method not implemented.');
  }
}
