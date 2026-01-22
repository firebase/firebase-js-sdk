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
import {
  Code,
  DataConnectError,
  DataConnectOperationError,
  DataConnectOperationFailureResponse,
  DataConnectOperationFailureResponseErrorInfo
} from '../../core/error';
import { AuthTokenProvider } from '../../core/FirebaseAuthProvider';
import { encoderImpl } from '../../util/encoder';

import {
  CallerSdkType,
  CallerSdkTypeEnum,
  DataConnectResponse,
  DataConnectStreamRequest,
  DataConnectTransportClass,
  ExecuteStreamRequest,
  SubscribeStreamRequest,
  CancelStreamRequest,
  DataConnectStreamResponse
} from '.';

/**
 * A Transport implementation that uses WebSockets to stream requests and responses.
 * This class handles the lifecycle of the WebSocket connection, including automatic
 * reconnection and request correlation.
 * @internal
 */
export class StreamTransport extends DataConnectTransportClass {
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
   * Map of active execution requests and their corresponding Promise resolvers.
   */
  private _executeRequests = new Map<
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { resolve: (data: any) => void; reject: (err: any) => void } // TODO: can type better?
  >();

  /**
   * Map of active subscription requests and their corresponding Promise resolvers.
   */
  private _subscribeRequests = new Map<
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { resolve: (data: any) => void; reject: (err: any) => void } // TODO: can type better?
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
      // eslint-disable-next-line no-console
      console.log(this.endpointUrl);
      ws.onopen = () => {
        this._connection = ws;
        // eslint-disable-next-line no-console
        console.log('WebSocket Connected'); // DEBUGGING
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
        this._executeRequests.forEach(p =>
          p.reject(
            new DataConnectError(
              Code.OTHER,
              'Socket closed, could not complete request'
            )
          )
        );
        this._executeRequests.clear();
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
   * Create a unique id for an execute request over the stream.
   * @returns the request id as a string
   */
  private _makeExecuteRequestId(): string {
    return `execute-${this._executionRequestNumber++}`;
  }

  /**
   * Create a unique id for a subscribe request over the stream. Can be used to correlate requests
   * with future responses, or cancel an existing subscription.
   * @param name name of the operation
   * @param variables the operation's variables
   * @returns the request id as a string
   */
  private _makeSubscribeRequestId<Variables>(
    name: string,
    variables: Variables
  ): string {
    // TODO: should this be simpler? maybe it should be similar to the execution request ID...? the only reason we need a unique AND identifying ID is so the SDK can lookup for an existing request when we want to unsubscribe, so maybe let's keep the complexity on the SDK side only
    const queryKey = encoderImpl({
      name,
      variables
    });
    return `subscribe-${queryKey}`;
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
   * Handles incoming stream messages.
   * Parses the message, finds the matching pending request ID, and resolves the associated promise.
   * @param ev The MessageEvent from the stream.
   */
  private handleMessage(ev: MessageEvent): void {
    try {
      // eslint-disable-next-line no-console
      console.log('MESSAGE RECEIVED:', ev.data); // DEBUGGING
      const response = this._parseStreamResponse(ev.data);
      const requestId = response.requestId;

      if (response.errors) {
        const stringified = JSON.stringify(response.errors);
        const failureResponse: DataConnectOperationFailureResponse = {
          errors:
            response.errors as unknown as DataConnectOperationFailureResponseErrorInfo[], // TODO: type this properly, or return a different type of error
          data: response.data as Record<string, unknown>
        };
        throw new DataConnectOperationError(
          'DataConnect error while performing request: ' + stringified,
          failureResponse
        );
      }

      if (this._executeRequests.has(requestId)) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { resolve, reject } = this._executeRequests.get(requestId)!;
        resolve(response.data); // TODO: do something with the message other than just pass it along, depending on message type - we should be resolving to DataConnectResponse<Data> if it succeeds
        this._executeRequests.delete(requestId);
      }
      if (this._subscribeRequests.has(requestId)) {
        // TODO: call callbacks
      }
    } catch (e) {
      if (e instanceof Error) {
        const err = new DataConnectError(
          Code.OTHER,
          `error receiving message: ${e.name}: ${e.message}`
        );
        if (e instanceof DataConnectError) {
          err.customData = e.customData;
        }
        throw err;
      }
      throw new DataConnectError(Code.OTHER, 'error receiving message');
    }
  }

  /**
   * Parse a response from the server. Assert that it has a requestId.
   * @param msg the message from the server to be parsed
   * @returns the parsed message as a DataConnectStreamResponse
   */
  private _parseStreamResponse<Data>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    msg: any
  ): DataConnectStreamResponse<Data> {
    const response = JSON.parse(msg.data);
    if (!response.requestId) {
      throw new DataConnectError(
        Code.OTHER,
        'message from stream did not include requestId'
      );
    }
    return response as DataConnectStreamResponse<Data>;
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
    const requestId = this._makeExecuteRequestId();
    // TODO: "To save bandwidth, the Data Connect SDK should include data_etag of cached data in subsequent requests, so the backend can avoid sending redundant data already in SDK cache.
    const body: ExecuteStreamRequest<Variables> = {
      'name': this.connectorResourcePath,
      requestId,
      'execute': { operationName, variables }
    };
    this._sendExecuteMessage<Variables>(body);
    const responsePromise = new Promise<DataConnectResponse<Data>>(
      (resolve, reject) => {
        this._executeRequests.set(requestId, { resolve, reject });
      }
    );
    return responsePromise;
  }

  /**
   * Internal helper to subscribe to a Query over the stream.
   * @param queryName The name of the query.
   * @param variables The query variables.
   */
  invokeSubscription<Variables>(queryName: string, variables: Variables): void {
    const requestId = this._makeSubscribeRequestId(queryName, variables);
    // TODO: "To save bandwidth, the Data Connect SDK should include data_etag of cached data in subsequent requests, so the backend can avoid sending redundant data already in SDK cache.
    const body: SubscribeStreamRequest<Variables> = {
      'name': this.connectorResourcePath,
      requestId,
      'subscribe': { operationName: queryName, variables }
    };
    this._sendSubscribeMessage<Variables>(body);
    // TODO: track the request in the subscription requests map
    // TODO: need to connect this to our QueryManager's callback system - probably add/remove handling logic when subscribing/unsubscribing which just calls onNext()/onError() with the returned data
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
    const requestId = this._makeSubscribeRequestId(queryName, variables);
    const request = this._subscribeRequests.get(requestId);
    if (!request) {
      // TODO: should we do anything else in this case?
      console.warn(
        `Requested unsubscription of query which is not currently being subscribed to: '${queryName}' with variables ${variables}`
      );
      return;
    }
    const body: CancelStreamRequest = {
      name: this.connectorResourcePath,
      requestId,
      cancel: {}
    };
    this._sendCancelMessage(body);
    // TODO: add to subscription requests (?), call callbacks, etc.
  }

  // TODO: implement
  onTokenChanged(newToken: string | null): void {
    throw new Error('Method not implemented.');
  }
}
