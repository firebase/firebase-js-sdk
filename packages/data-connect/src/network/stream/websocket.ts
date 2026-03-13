/**
 * @license
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
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
  DataConnectResponse
} from '../transport';

import { AbstractDataConnectStreamTransport } from './streamTransport';
import { DataConnectStreamRequest, DataConnectStreamResponse } from './wire';

let connectWebSocket: typeof WebSocket = globalThis.WebSocket;
export function initializeWebSocket(webSocketImpl: typeof WebSocket): void {
  connectWebSocket = webSocketImpl;
}

/**
 * A StreamTransport implementation that uses WebSockets to stream requests and responses.
 * This class handles the lifecycle of the WebSocket connection.
 * @internal
 */
export class WebSocketTransport extends AbstractDataConnectStreamTransport {
  /** The current established (or establishing) connection to the server. Undefined if disconnected. */
  private connection: WebSocket | undefined = undefined;

  get streamConnected(): boolean {
    return this.connection?.readyState === WebSocket.OPEN;
  }

  /**
   * Any current attempt to connect to the server. null if not currently attempting to connect.
   */
  private connectionAttempt: Promise<void> | null = null;

  constructor(
    options: DataConnectOptions,
    apiKey?: string | undefined,
    appId?: string | null,
    authProvider?: AuthTokenProvider | undefined,
    appCheckProvider?: AppCheckTokenProvider | undefined,
    transportOptions?: TransportOptions | undefined,
    _isUsingGen = false,
    _callerSdkType: CallerSdkType = CallerSdkTypeEnum.Base
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
   * If a connection attempt is already in progress, it returns the existing connection promise.
   * @returns A promise that resolves when the stream is open and ready.
   */
  private ensureConnection(): Promise<void> {
    if (this.streamConnected) {
      return Promise.resolve();
    } else if (this.connectionAttempt) {
      return this.connectionAttempt;
    }
    this.connectionAttempt = new Promise<void>((resolve, reject) => {
      const ws = new connectWebSocket(this.endpointUrl);
      ws.onopen = () => {
        this.connection = ws;
        this.onConnectionReady();
        resolve();
      };
      ws.onerror = err => {
        this.connectionAttempt = null;
        reject(
          new DataConnectError(
            Code.OTHER,
            `Could not establish websocket connection: ${JSON.stringify(err)}`
          )
        );
      };
      ws.onmessage = ev => this.handleWebSocketMessage(ev);
      ws.onclose = ev => this.handleDisconnect(ev);
    });

    return this.connectionAttempt;
  }

  openConnection(): Promise<void> {
    return this.ensureConnection().catch(err => {
      throw new DataConnectError(
        Code.OTHER,
        `Failed to open connection: ${err}`
      );
    });
  }

  closeConnection(): Promise<void> {
    if (!this.connection) {
      return Promise.resolve();
    }
    this.connection.close();
    this.connection = undefined;
    this.connectionAttempt = null;
    return Promise.resolve();
  }

  /**
   * Handle a disconnection from the server. Should gracefully clean up outstanding requests, and
   * orchestrate reconnection attempts.
   * @param ev the CloseEvent that closed the WebSocket.
   */
  private handleDisconnect(ev: CloseEvent): void {
    this.connection = undefined;
    this.connectionAttempt = null;
    // TODO(stephenarosaj): add in reconnect logic
  }

  sendMessage<Variables>(
    requestBody: DataConnectStreamRequest<Variables>
  ): Promise<void> {
    return this.ensureConnection()
      .then(() => {
        this.connection!.send(JSON.stringify(requestBody));
      })
      .catch(err => {
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
  private async handleWebSocketMessage(ev: MessageEvent): Promise<void> {
    const result = this.parseWebSocketData(ev.data);
    const requestId = result.requestId;

    const response: DataConnectResponse<unknown> = {
      data: result.data,
      errors: result.errors,
      extensions: result.extensions
    };

    await this.handleResponse(requestId, response);
  }

  /**
   * Parse a response from the server. Assert that it has a requestId.
   * @param data the message from the server to be parsed
   * @returns the parsed message as a DataConnectStreamResponse
   */
  private parseWebSocketData<Data>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any
  ): DataConnectStreamResponse<Data> {
    let webSocketMessage;
    try {
      webSocketMessage = JSON.parse(data);
    } catch (err) {
      throw new DataConnectError(
        Code.OTHER,
        'server response was not valid JSON'
      );
    }
    if (typeof webSocketMessage !== 'object') {
      throw new DataConnectError(
        Code.OTHER,
        'server response was not a JSON object'
      );
    }
    if (!('result' in webSocketMessage)) {
      throw new DataConnectError(
        Code.OTHER,
        'server response did not include result'
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
