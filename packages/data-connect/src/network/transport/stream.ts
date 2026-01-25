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

import { DataConnectOptions, TransportOptions } from '../../api/DataConnect';
import { AppCheckTokenProvider } from '../../core/AppCheckTokenProvider';
import { Code, DataConnectError } from '../../core/error';
import { AuthTokenProvider } from '../../core/FirebaseAuthProvider';

import {
  CallerSdkType,
  CallerSdkTypeEnum,
  DataConnectResponse,
  DataConnectStreamRequest,
  DataConnectTransportClass,
  ExecuteStreamRequest,
  SubscribeStreamRequest,
  CancelStreamRequest,
  DataConnectStreamResponse,
  AuthenticationStreamRequest,
  DataConnectStreamCallbacks
} from '.';

const EXECUTE_STR = 'exec';
const SUBSCRIBE_STR = 'sub';
const AUTHENTICATION_STR = 'auth';
type RequestType =
  | typeof EXECUTE_STR
  | typeof SUBSCRIBE_STR
  | typeof AUTHENTICATION_STR;

/**
 * A Transport implementation that uses WebSockets to stream requests and responses.
 * This class handles the lifecycle of the WebSocket connection, including automatic
 * reconnection and request correlation.
 * @internal
 */
export class StreamTransport extends DataConnectTransportClass {
  // TODO: handle app check and auth... in RESTTransport there are providers that get called... probably have to do something like that here, too

  /** The current established connection to the server. Undefined if disconnected. */
  private _connection: WebSocket | undefined = undefined;

  /**
   * Tracks any ongoing connection attempt. This ensures we don't open multiple streams if multiple
   * requests are fired simultaneously.
   */
  private _connectionAttempt: Promise<void> | null = null;

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
   * Map of active execution RequestIds and their corresponding Promise resolvers.
   */
  private _executeRequestPromises = new Map<
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { resolve: (data: any) => void; reject: (err: any) => void } // TODO: can type better?
  >();

  // TODO: we need to also track the request body so that if the stream disconnects/reconnects, we can re-subscribe... unless...?
  /**
   * Map of active subscription RequestIds and their corresponding callbacks. These callbacks are
   * provided by the query layer, which handles calling the user's registered callbacks
   */
  private _subscribeRequestCallbacks = new Map<
    // TODO: these callbacks should be supplied by the query layer when invoking the subscribe transport functions
    string,
    DataConnectStreamCallbacks<unknown>
  >();

  /**
   * Map of active subscription query name, variable combinations and their corresponding RequestIds.
   */
  private _subscribeRequestIds = new Map<
    { queryName: string; variables?: unknown },
    string
  >();

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
  }

  /**
   * Ensures that that there is an open connection. If there is none, it initiates a new one.
   * If a connection attempt is already in progress, it returns the existing promise.
   * @returns A promise that resolves when the stream is open and ready.
   */
  private ensureConnection(): Promise<void> {
    if (this._connection?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }
    if (this._connectionAttempt) {
      return this._connectionAttempt;
    }
    this._connectionAttempt = new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(this.endpointUrl);
      ws.onopen = () => {
        this._connection = ws;
        resolve();
      };
      ws.onerror = err => {
        this._connectionAttempt = null;
        reject(err);
      };
      ws.onmessage = ev => this.handleMessage(ev);
      ws.onclose = () => {
        this._connection = undefined;
        this._connectionAttempt = null;
        // Clean up pending requests on close so calls don't hang indefinitely
        this._executeRequestPromises.forEach(p =>
          p.reject(
            new DataConnectError(
              Code.OTHER,
              'Socket closed, could not complete request'
            )
          )
        );
        this._executeRequestPromises.clear();
      };
    });

    return this._connectionAttempt;
  }

  /**
   * Open a new stream connection. Errors if the connection fails.
   */
  openConnection(): void {
    this.ensureConnection().catch(err => {
      throw new DataConnectError(
        Code.OTHER,
        `Failed to open connection: ${err}`
      );
    });
  }

  /**
   * Closes the current stream connection if one exists.
   */
  closeConnection(): void {
    if (this._connection) {
      this._connection.close();
      this._connection = undefined;
      this._connectionAttempt = null;
    }
  }

  /**
   * Forces a reconnection by closing the existing connection and opening a new one.
   */
  // TODO: is this right?
  reconnect(): void {
    this.closeConnection();
    this.openConnection();
  }

  /**
   * Create a unique id for a request over the stream.
   * @returns the request id as a string
   */
  private _makeRequestId(requestType: RequestType): string {
    return `${requestType}-${this._executionRequestNumber++}`;
  }

  /**
   * Send a message over the stream.
   * Automatically ensures the connection is open before sending.
   * @param requestBody The body of the message to be sent.
   * @throws DataConnectError if sending fails.
   */
  private _sendMessage<Variables>(
    requestBody: DataConnectStreamRequest<Variables>
  ): void {
    this.ensureConnection()
      .then(() => {
        this._connection!.send(JSON.stringify(requestBody));
      })
      .catch(err => {
        throw new DataConnectError(
          Code.OTHER,
          `Failed to send message: ${err}`
        );
      });
  }

  /**
   * Internal helper to send a message over the connection to execute a one-off query or mutation.
   * @param body The execution payload.
   */
  private _sendExecuteMessage<Variables>(
    body: ExecuteStreamRequest<Variables>
  ): void {
    this._sendMessage(body);
  }

  /**
   * Internal helper to send a message over the connection to subscribe to a query.
   * @param subscribeRequestBody The subscription payload.
   */
  private _sendSubscribeMessage<Variables>(
    subscribeRequestBody: SubscribeStreamRequest<Variables>
  ): void {
    this._sendMessage(subscribeRequestBody);
  }

  /**
   * Internal helper to send a message over the connection to subscribe to a query.
   * @param cancelStreamRequest The cancel/unsubscription payload.
   */
  private _sendCancelMessage(cancelStreamRequest: CancelStreamRequest): void {
    this._sendMessage(cancelStreamRequest);
  }

  /**
   * Internal helper to send a message over the connection to subscribe to a query.
   * @param cancelStreamRequest The cancel/unsubscription payload.
   */
  private _sendAuthenticationMessaage(
    authenticationMessage: AuthenticationStreamRequest
  ): void {
    this._sendMessage(authenticationMessage);
  }

  /**
   * Handles incoming stream messages.
   * Parses the message, finds the matching pending request ID, and resolves the associated promise.
   * @param ev The MessageEvent from the stream.
   */
  private handleMessage(ev: MessageEvent): void {
    const result = this._parseStreamResponse(ev.data);
    const requestId = result.requestId;

    const dataConnectResponse: DataConnectResponse<unknown> = {
      data: result.data,
      errors: result.errors,
      extensions: { dataConnect: [] } // TODO: actually fill this... it should be coming from result.extensions... right?
    };

    if (this._executeRequestPromises.has(requestId)) {
      // TODO: when do we use reject? if there was an ERROR error, like something really went wrong with the stream? in that case, it probably won't get called when handling a message, but rather in catach statements of stream-related functions, right...?
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { resolve, reject } = this._executeRequestPromises.get(requestId)!;
      // TODO: make this into a QueryResult? no... should bubble up to caller of transport function
      resolve(dataConnectResponse);
      this._executeRequestPromises.delete(requestId);
    } else if (this._subscribeRequestCallbacks.has(requestId)) {
      // TODO: my understanding: this is definitely a data update notification. but lowkey what if there's also an ack from the server for unsubscriptions?
      const { resultCallback } =
        this._subscribeRequestCallbacks.get(requestId)!;
      resultCallback(dataConnectResponse);
    } else {
      // TODO: error?
      throw new DataConnectError(
        Code.OTHER,
        `Unrecognized requestId '${requestId}'`
      );
    }
  }

  /**
   * Parse a response from the server. Assert that it has a requestId.
   * @param json the message from the server to be parsed
   * @returns the parsed message as a DataConnectStreamResponse
   */
  private _parseStreamResponse<Data>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    json: any // TODO: type better
  ): DataConnectStreamResponse<Data> {
    const message = JSON.parse(json);
    // eslint-disable-next-line no-console
    console.log('\nMESSAGE:\n', message); // DEBUGGING
    if (!('result' in message)) {
      throw new DataConnectError(
        Code.OTHER,
        'message from stream did not include result'
      );
    }
    if (!('requestId' in message.result)) {
      throw new DataConnectError(
        Code.OTHER,
        'server response did not include requestId'
      );
    }
    return message.result as DataConnectStreamResponse<Data>;
  }

  /**
   * Invokes a Query via the streaming transport.
   * @param queryName The name of the query.
   * @param body The variables for the query.
   * @returns A promise resolving to the query result.
   */
  invokeQuery<Data, Variables>(
    queryName: string,
    body?: Variables
  ): Promise<DataConnectResponse<Data>> {
    return this._invokeExecute(queryName, body);
  }

  /**
   * Invokes a Mutation via the streaming transport.
   * @param mutationName The name of the mutation.
   * @param body The variables for the mutation.
   * @returns A promise resolving to the mutation result.
   */
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
    // TODO: "To save bandwidth, the Data Connect SDK should include data_etag of cached data in subsequent requests, so the backend can avoid sending redundant data already in SDK cache.
    const body: ExecuteStreamRequest<Variables> = {
      'name': this.connectorResourcePath,
      requestId,
      'execute': { operationName, variables }
    };
    this._sendExecuteMessage<Variables>(body);
    const responsePromise = new Promise<DataConnectResponse<Data>>(
      (resolve, reject) => {
        this._executeRequestPromises.set(requestId, { resolve, reject });
      }
    );
    return responsePromise;
  }

  /**
   * Internal helper to subscribe to a Query over the stream.
   * @param queryName The name of the query.
   * @param variables The query variables.
   */
  invokeSubscription<Data, Variables>(
    streamCallbacks: DataConnectStreamCallbacks<Data>,
    queryName: string,
    variables: Variables
  ): void {
    const requestId = this._makeRequestId(SUBSCRIBE_STR);
    // TODO: "To save bandwidth, the Data Connect SDK should include data_etag of cached data in subsequent requests, so the backend can avoid sending redundant data already in SDK cache.
    const body: SubscribeStreamRequest<Variables> = {
      'name': this.connectorResourcePath,
      requestId,
      'subscribe': { operationName: queryName, variables }
    };
    this._sendSubscribeMessage<Variables>(body);
    this._subscribeRequestIds.set({ queryName, variables }, requestId);
    this._subscribeRequestCallbacks.set(
      requestId,
      streamCallbacks as DataConnectStreamCallbacks<unknown> // TODO: is there a way to avoid casting this?
    );
  }

  /**
   * Internal helper to unsubscribe from a Query over the stream.
   * @param queryName The name of the query.
   * @param variables The query variables.
   */
  invokeUnsubscription<Variables>(
    queryName: string,
    variables: Variables
  ): void {
    const requestId = this._subscribeRequestIds.get({
      queryName,
      variables: variables as object | undefined
    });
    if (!requestId) {
      // TODO: should we do anything else in this case?
      console.warn(
        `Requested unsubscription of query which is not currently being subscribed to: '${queryName}' with variables ${variables}`
      );
      return;
    }

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
    try {
      callbacks.cancelCallback();
      this._subscribeRequestIds.delete({ queryName, variables });
      this._subscribeRequestCallbacks.delete(requestId);
    } catch (e) {
      if (e instanceof DataConnectError) {
        throw e;
      }
      throw new DataConnectError(
        Code.OTHER,
        `Failed to unsubscribe from query '${queryName}' with variables ${variables}`
      );
    }
  }

  // TODO: type better
  // TODO: tear down stream, open new one + reauthenticate
  onTokenChanged(newToken: string | null): void {
    throw new Error('Method not implemented.');
  }
}
