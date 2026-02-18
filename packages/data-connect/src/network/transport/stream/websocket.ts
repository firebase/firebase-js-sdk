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

import { CallerSdkType, CallerSdkTypeEnum, DataConnectResponse } from '..';
import { DataConnectOptions, TransportOptions } from '../../../api/DataConnect';
import { AppCheckTokenProvider } from '../../../core/AppCheckTokenProvider';
import { Code, DataConnectError } from '../../../core/error';
import { AuthTokenProvider } from '../../../core/FirebaseAuthProvider';

import { DataConnectStreamRequest, DataConnectStreamResponse } from './wire';

import { DataConnectStreamTransportClass } from '.';

/**
 * A StreamTransport implementation that uses WebSockets to stream requests and responses.
 * This class handles the lifecycle of the WebSocket connection, including automatic
 * reconnection and request correlation.
 * @internal
 */
export class WebsocketTransport extends DataConnectStreamTransportClass {
  // TODO(stephenarosaj): handle app check and auth... in RESTTransport there are providers that get called... probably have to do something like that here, too

  /** The current established connection to the server. Undefined if disconnected. */
  private _connection: WebSocket | undefined = undefined;

  protected _streamIsSupported = true;

  /**
   * Tracks any ongoing connection attempt. This ensures we don't open multiple streams if multiple
   * requests are fired simultaneously.
   */
  private _connectionAttempt: Promise<void> | null = null;

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

  // TODO(stephenarosaj): idea - what if ensure connection was implementation-independent, using _connectionAttempt and such, and open() was actually the implementation-specific stuff...?
  /**
   * Ensures that that there is an open connection. If there is none, it initiates a new one.
   * If a connection attempt is already in progress, it returns the existing promise.
   * @returns A promise that resolves when the stream is open and ready.
   */
  private _ensureConnection(): Promise<void> {
    if (this._connection?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }
    if (this._connectionAttempt) {
      return this._connectionAttempt;
    }
    this._connectionAttempt = new Promise<void>((resolve, reject) => {
      // eslint-disable-next-line no-console
      console.log(this.endpointUrl); // DEBUGGING
      const ws = new WebSocket(this.endpointUrl);
      ws.onopen = () => {
        this._connection = ws;
        resolve();
      };
      ws.onerror = err => {
        this._connectionAttempt = null;
        reject(`Could not open websocket connection: ${JSON.stringify(err)}`);
      };
      ws.onmessage = ev => this._handleWebSocketMessage(ev);
      ws.onclose = ev => this._handleDisconnect(ev);
    });

    return this._connectionAttempt;
  }

  openConnection(): Promise<void> {
    return this._ensureConnection().catch(err => {
      throw new DataConnectError(
        Code.OTHER,
        `Failed to open connection: ${err}`
      );
    });
  }

  closeConnection(): Promise<void> {
    if (!this._connection) {
      return Promise.resolve();
    }
    this._connection.close();
    this._connection = undefined;
    this._connectionAttempt = null;
    return Promise.resolve();
  }

  /**
   * Handle a disconnection from the server. Should gracefully clean up outstanding requests, and
   * orchestrate reconnection attempts.
   * @param ev the CloseEvent that closed the WebSocket.
   */
  private _handleDisconnect(ev: CloseEvent): void {
    this._connection = undefined;
    this._connectionAttempt = null;

    // server will drop all requests on disconnect
    // TODO(stephenarosaj): requeue all requests for when connection comes back online
    // TODO(stephenarosaj): what do we do with pending execute requests? do we resolve them as failed after a timeout (if reconnect before timeout, stop the timeout)?
    // TODO(stephenarosaj): NOTE: if we are re-requesting, the first request needs to have auth and app check, and
    // TODO(stephenarosaj): use ev.code and ev.wasClean to figure out what kind of disconnect this was and what to do next
  }

  sendMessage<Variables>(
    requestBody: DataConnectStreamRequest<Variables>
  ): void {
    this._ensureConnection()
      .then(() => {
        this._connection!.send(JSON.stringify(requestBody));
      })
      .catch(err => {
        // eslint-disable-next-line no-console
        console.log('\nCONNECTION:\n', this._connection);
        throw new DataConnectError(
          Code.OTHER,
          `Failed to send message: ${JSON.stringify(err)}`
        );
      });
  }

  /**
   * Handles incoming WebSocket messages.
   * @param ev The MessageEvent from the WebSocket.
   */
  private _handleWebSocketMessage(ev: MessageEvent): void {
    const result = this._parseWebSocketData(ev.data);
    const requestId = result.requestId;

    const response: DataConnectResponse<unknown> = {
      data: result.data,
      errors: result.errors,
      extensions: { dataConnect: [] } // TODO(stephenarosaj): actually fill this... it should be coming from result.extensions... right?
    };

    this._handleMessage(requestId, response);
  }

  /**
   * Parse a response from the server. Assert that it has a requestId.
   * @param data the message from the server to be parsed
   * @returns the parsed message as a DataConnectStreamResponse
   */
  private _parseWebSocketData<Data>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any // TODO(stephenarosaj): type better
  ): DataConnectStreamResponse<Data> {
    const webSocketMessage = JSON.parse(data);
    // eslint-disable-next-line no-console
    console.log('\n_parseWebSocketData:\n', webSocketMessage); // DEBUGGING
    if (!('result' in webSocketMessage)) {
      throw new DataConnectError(
        Code.OTHER,
        'message from stream did not include result'
      );
    }
    if (!('requestId' in webSocketMessage.result)) {
      throw new DataConnectError(
        Code.OTHER,
        'server response did not include requestId'
      );
    }
    return webSocketMessage.result as DataConnectStreamResponse<Data>;
  }
}
