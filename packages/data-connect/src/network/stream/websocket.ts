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
  DataConnectResponse
} from '../transport';

import { AbstractDataConnectStreamTransport } from './streamTransport';
import { DataConnectStreamRequest, DataConnectStreamResponse } from './wire';

let connectWebSocket: typeof WebSocket | null = globalThis.WebSocket;

/**
 * Error with associated {@link WebSocketCloseCode} to be passed to {@link WebSocket.close}
 */
class WebSocketDataConnectError extends DataConnectError {
  constructor(readonly closeCode: WebSocketCloseCode, message: string) {
    super(Code.OTHER, message);

    // Ensure the instanceof operator works as expected on subclasses of Error.
    // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#custom_error_types
    // and https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-2.html#support-for-newtarget
    Object.setPrototypeOf(this, WebSocketDataConnectError.prototype);
  }
}

/**
 * Defined by https://www.rfc-editor.org/rfc/rfc6455#section-7.4
 * @internal
 */
export enum WebSocketCloseCode {
  GRACEFUL_CLOSE = 1000,
  GOING_AWAY = 1001,
  PROTOCOL_ERROR = 1002
}

/** Set the WebSocket implementation to be used by the {@link WebSocketTransport}. */
export function initializeWebSocket(webSocketImpl: typeof WebSocket): void {
  connectWebSocket = webSocketImpl;
}

/**
 * An {@link AbstractDataConnectStreamTransport | Stream Transport} implementation that uses {@link WebSocket | WebSockets} to stream requests and responses.
 * This class handles the lifecycle of the WebSocket connection, including automatic
 * reconnection and request correlation.
 * @internal
 */
export class WebSocketTransport extends AbstractDataConnectStreamTransport {
  /** The current connection to the server. Undefined if disconnected. */
  private connection: WebSocket | undefined = undefined;

  get streamIsReady(): boolean {
    return this.connection?.readyState === WebSocket.OPEN;
  }

  /**
   * Current connection attempt. If null, we are not currently attemping to connect (not connected,
   * or already connected). Will be resolved or rejected when the connection is opened or fails to open.
   */
  private connectionAttempt: Promise<void> | null = null;

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
   * If a connection attempt is already in progress, it returns the existing {@link connectionAttempt | promise}.
   * @returns A promise that resolves when the stream is open and ready.
   */
  private ensureConnection(): Promise<void> {
    if (this.streamIsReady) {
      return Promise.resolve();
    }
    if (this.connectionAttempt) {
      return this.connectionAttempt;
    }
    this.connectionAttempt = new Promise<void>((resolve, reject) => {
      if (!connectWebSocket) {
        throw new DataConnectError(
          Code.OTHER,
          'No WebSocket Implementation detected!'
        );
      }
      const ws = new connectWebSocket(this.endpointUrl);
      this.connection = ws;
      ws.onopen = () => {
        this.onConnectionReady();
        resolve();
      };
      ws.onerror = event => {
        this.connectionAttempt = null;
        reject(`Could not open websocket connection`);
      };
      ws.onmessage = ev =>
        this.handleWebSocketMessage(ev).catch(async reason => {
          console.error(
            'DataConnect WebSocket protocol error, closing stream:',
            reason
          );
          if (this.connection) {
            if (reason instanceof WebSocketDataConnectError) {
              this.connection.close(reason.closeCode, reason.message);
            } else {
              this.connection.close(
                WebSocketCloseCode.PROTOCOL_ERROR,
                'Protocol Error'
              );
            }
          }
        });
      ws.onclose = ev => this.handleWebsocketDisconnect(ev);
    });

    return this.connectionAttempt;
  }

  protected openConnection(): Promise<void> {
    return this.ensureConnection().catch(err => {
      throw new DataConnectError(
        Code.OTHER,
        `Failed to open connection: ${err}`
      );
    });
  }

  protected closeConnection(): Promise<void> {
    if (!this.connection) {
      return Promise.resolve();
    }
    let error;
    try {
      this.connection.close();
    } catch (e) {
      error = e;
    } finally {
      this.connection = undefined;
      this.connectionAttempt = null;
    }
    if (error) {
      return Promise.reject(error);
    }
    return Promise.resolve();
  }

  /**
   * Handle a disconnection from the server. Initiates graceful clean up and reconnection attempts.
   * @param ev the {@link CloseEvent} that closed the WebSocket.
   */
  private handleWebsocketDisconnect(ev: CloseEvent): void {
    this.connection = undefined;
    this.connectionAttempt = null;
    // TODO(stephenarosaj): check code, alert manager if need be, initiate reconnection, cleanup, etc.
  }

  protected sendMessage<Variables>(
    requestBody: DataConnectStreamRequest<Variables>
  ): Promise<void> {
    return this.ensureConnection()
      .then(() => {
        this.connection!.send(JSON.stringify(requestBody));
      })
      .catch(err => {
        // TODO(stephenarosaj): based on whether the error has a closeCode or not, we should perhaps close the connection, alert the manager, re-connect, etc.
        throw new DataConnectError(
          Code.OTHER,
          `Failed to send message: ${String(err)}`
        );
      });
  }

  /**
   * Handles incoming WebSocket messages.
   * @param ev The {@link MessageEvent} from the WebSocket.
   */
  private async handleWebSocketMessage(ev: MessageEvent): Promise<void> {
    const result: DataConnectStreamResponse<unknown> = this.parseWebSocketData(
      ev.data
    );
    const requestId = result.requestId;

    const response: DataConnectResponse<unknown> = {
      data: result.data,
      errors: result.errors,
      extensions: result.extensions || { dataConnect: [] }
    };

    await this.handleResponse(requestId, response);
  }

  /**
   * Parse a response from the server. Assert that it has a {@link DataConnectStreamResponse.requestId | requestId}.
   * @param data the message from the server to be parsed
   * @returns the parsed message as a {@link DataConnectStreamResponse}
   * @throws {WebSocketDataConnectError} if parsing fails or message is malformed.
   */
  private parseWebSocketData<Data>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any
  ): DataConnectStreamResponse<Data> {
    let webSocketMessage;
    try {
      webSocketMessage = JSON.parse(data);
    } catch (err) {
      throw new WebSocketDataConnectError(
        WebSocketCloseCode.PROTOCOL_ERROR,
        'Could not parse WebSocket message'
      );
    }
    if (typeof webSocketMessage !== 'object' || webSocketMessage === null) {
      throw new WebSocketDataConnectError(
        WebSocketCloseCode.PROTOCOL_ERROR,
        'WebSocket message is not an object'
      );
    }
    if (!('result' in webSocketMessage)) {
      throw new WebSocketDataConnectError(
        WebSocketCloseCode.PROTOCOL_ERROR,
        'WebSocket message did not include result'
      );
    }
    if (
      typeof webSocketMessage.result !== 'object' ||
      webSocketMessage.result === null
    ) {
      throw new WebSocketDataConnectError(
        WebSocketCloseCode.PROTOCOL_ERROR,
        'WebSocket message result is not an object'
      );
    }
    if (!('requestId' in webSocketMessage.result)) {
      throw new WebSocketDataConnectError(
        WebSocketCloseCode.PROTOCOL_ERROR,
        'WebSocket message did not include requestId'
      );
    }
    return webSocketMessage.result as DataConnectStreamResponse<Data>;
  }
}
