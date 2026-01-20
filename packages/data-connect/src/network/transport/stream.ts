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

// Note: setTimeout from 'timers/promises' removed as it's no longer used for polling

import { DataConnectOptions, TransportOptions } from '../../api/DataConnect';
import { AppCheckTokenProvider } from '../../core/AppCheckTokenProvider';
import { Code, DataConnectError } from '../../core/error';
import { AuthTokenProvider } from '../../core/FirebaseAuthProvider';

import {
  CallerSdkType,
  CallerSdkTypeEnum,
  DataConnectResponse,
  DataConnectStreamManager,
  DataConnectStreamRequestBody,
  DataConnectTransportClass,
  ExecuteStreamRequestBody,
  SubscribeStreamRequestBody
} from '.';

// TODO: add resume and cancel messages
// TODO: add auth_token field

/**
 * A Transport implementation that uses WebSockets to stream requests and responses.
 * This class handles the lifecycle of the WebSocket connection, including automatic
 * reconnection and request correlation.
 * @internal
 */
export class StreamTransport
  extends DataConnectTransportClass
  implements DataConnectStreamManager
{
  /** The current established connection to the server. Undefined if disconnected. */
  private _connection: WebSocket | undefined = undefined;

  /**
   * Tracks any ongoing connection attempt. This ensures we don't open multiple sockets if multiple
   * requests are fired simultaneously.
   */
  private _connectionAttempt: Promise<void> | null = null;

  // TODO: make this real
  /**
   * The endpoint for connecting to the server via a stream connection.
   */
  get endpointUrl(): string {
    return `ws://127.0.0.1:9399/v1/Connect/locations/ignored`;
  }

  /**
   * The resource path formatted for the Data Connect backend.
   * Added to each request to identify which connector the request is associated with.
   */
  get connectorResourcePath(): string {
    return `projects/${this._project}/locations/${this._location}/services/${this._serviceName}/connectors/${this._connectorName}`;
  }

  /**
   * Map of active execution requests and their corresponding Promise resolvers.
   * Used to correlate incoming WebSocket messages (responses) with the requests that triggered them.
   */
  private _executeRequsts = new Map<
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
   * @returns A promise that resolves when the WebSocket is open and ready.
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
        this._executeRequsts.forEach(p =>
          p.reject(
            new DataConnectError(
              Code.OTHER,
              'Socket closed, could not complete request'
            )
          )
        );
        this._executeRequsts.clear();
      };
    });

    return this._connectionAttempt;
  }

  /**
   * Open a new WebSocket connection. Errors if the connection fails.
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
   * Closes the current WebSocket connection if one exists.
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
   * Send a message over the WebSocket stream.
   * Automatically ensures the connection is open before sending.
   * @param requestBody The body of the message to be sent.
   * @throws DataConnectError if sending fails.
   */
  private _sendMessage<Variables>(
    requestBody: DataConnectStreamRequestBody<Variables>
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
    body: ExecuteStreamRequestBody<Variables>
  ): void {
    this._sendMessage(body);
  }

  /**
   * Internal helper to send a message over the connection to subscribe to a query.
   * @param subscribeRequestBody The subscription payload.
   */
  private _sendSubscribeMessage<Variables>(
    subscribeRequestBody: SubscribeStreamRequestBody<Variables>
  ): void {
    this._sendMessage(subscribeRequestBody);
  }

  /**
   * Handles incoming WebSocket messages.
   * Parses the message, finds the matching pending request ID, and resolves the associated promise.
   * @param ev The MessageEvent from the WebSocket.
   */
  private handleMessage(ev: MessageEvent): void {
    try {
      // eslint-disable-next-line no-console
      console.log('MESSAGE RECEIVED:', ev.data); // DEBUGGING
      const msg = JSON.parse(ev.data); // TODO: type the message, probably need some sort of enum to determine what type of message it is
      const requestId = msg.requestId;
      if (requestId && this._executeRequsts.has(requestId)) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { resolve, reject } = this._executeRequsts.get(requestId)!;
        resolve(msg); // TODO: do something with the message other than just pass it along, depending on message type - we should be resolving to DataConnectResponse<Data> if it succeeds
        this._executeRequsts.delete(requestId);
      }
    } catch (e) {
      console.error('Error handling WebSocket message', e);
    }
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
   * Internal helper to execute a standard Query or Mutation over the socket.
   * Generates a request ID, registers the pending request, sends the message, and waits for response.
   * @param operationName The name of the operation.
   * @param variables The operation variables.
   */
  private _invokeExecute<Data, Variables>(
    operationName: string,
    variables?: Variables
  ): Promise<DataConnectResponse<Data>> {
    const requestId = crypto.randomUUID(); // TODO: update
    const body: ExecuteStreamRequestBody<Variables> = {
      'name': this.connectorResourcePath,
      requestId,
      'execute': { operationName, variables }
    };
    this._sendExecuteMessage<Variables>(body);
    const responsePromise = new Promise<DataConnectResponse<Data>>(
      (resolve, reject) => {
        this._executeRequsts.set(requestId, { resolve, reject });
      }
    );
    return responsePromise;
  }

  invokeSubscription<Variables>(
    operationName: string,
    variables: Variables
  ): void {
    const requestId = crypto.randomUUID(); // TODO: update
    const body: DataConnectStreamRequestBody<Variables> = {
      'name': this.connectorResourcePath,
      requestId,
      'subscribe': { operationName, variables }
    };
    this._sendSubscribeMessage<Variables>(body);
    // TODO: need to connect this to our QueryManager's callback system - probably add/remove handling logic when subscribing/unsubscribing which just calls onNext()/onError() with the returned data
  }

  invokeUnsubscription(url?: string): void {
    throw new Error('Method not implemented.');
  }

  onTokenChanged(newToken: string | null): void {
    throw new Error('Method not implemented.');
  }

  // TODO: type
  subscribeQuery<Data, Variables>(
    operationName: string,
    body?: Variables
  ): Promise<DataConnectResponse<Data>> {
    throw new Error('Method not implemented.');
  }

  unsubscribeQuery(): void {
    throw new Error('Method not implemented.');
  }

  heartbeat(): void {
    throw new Error('Method not implemented.');
  }
}
