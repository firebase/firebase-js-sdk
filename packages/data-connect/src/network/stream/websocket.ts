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
import { logError } from '../../logger';
import { websocketUrlBuilder } from '../../util/url';
import {
  CallerSdkType,
  CallerSdkTypeEnum,
  DataConnectResponse
} from '../transport';

import { AbstractDataConnectStreamTransport } from './streamTransport';
import { DataConnectStreamRequest, DataConnectStreamResponse } from './wire';

/** The WebSocket implementation to be used by the {@link WebSocketTransport}. */
let connectWebSocket: typeof WebSocket | null = globalThis.WebSocket;

/**
 * This function is ONLY used for testing and for ensuring compatability in environments which may
 * be using a poyfill and/or bundlers. It should not be called by users of the Firebase JS SDK.
 * @internal
 */
export function initializeWebSocket(webSocketImpl: typeof WebSocket): void {
  connectWebSocket = webSocketImpl;
}

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

// TODO(stephenarosaj): Node environments only support close codes 1000 or 3000-4999 - update to use 3000-4999 range to specify why we're closing
/**
 * Defined by https://www.rfc-editor.org/rfc/rfc6455#section-7.4
 * @internal
 */
export enum WebSocketCloseCode {
  GRACEFUL_CLOSE = 1000,
  GOING_AWAY = 1001,
  PROTOCOL_ERROR = 1002
}

/**
 * An {@link AbstractDataConnectStreamTransport | Stream Transport} implementation that uses {@link WebSocket | WebSockets} to stream requests and responses.
 * This class handles the lifecycle of the WebSocket connection, including automatic
 * reconnection and request correlation.
 * @internal
 */
export class WebSocketTransport extends AbstractDataConnectStreamTransport {
  get endpointUrl(): string {
    return websocketUrlBuilder(
      {
        connector: this._connectorName,
        location: this._location,
        projectId: this._project,
        service: this._serviceName
      },
      {
        host: this._host,
        sslEnabled: this._secure,
        port: this._port
      }
    );
  }

  /** Decodes binary WebSocket responses to strings */
  private decoder: TextDecoder | undefined = undefined;

  /**
   * Decodes a WebSocket response from a Uint8Array to a JSON object.
   * Emulator does not send messages as Uint8Arrays, but prod does.
   */
  private decodeBinaryResponse(data: ArrayBuffer): string {
    if (!this.decoder) {
      this.decoder = new TextDecoder('utf-8');
    }
    return this.decoder.decode(data);
  }

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

  protected ensureConnection(): Promise<void> {
    try {
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
        this.connection!.binaryType = 'arraybuffer';

        ws.onopen = () => {
          this.onConnectionReady();
          resolve();
        };

        ws.onerror = event => {
          this.connectionAttempt = null;
          this.handleError(
            `Error using WebSocket connection, closing WebSocket`
          );
          reject(`Error using WebSocket connection, closing WebSocket`);
        };

        ws.onmessage = ev =>
          this.handleWebSocketMessage(ev).catch(async reason => {
            this.handleError(reason);
          });

        ws.onclose = ev => this.handleWebsocketDisconnect(ev);
      });

      return this.connectionAttempt;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  protected openConnection(): Promise<void> {
    return this.ensureConnection().catch(err => {
      throw new DataConnectError(
        Code.OTHER,
        `Failed to open connection: ${err}`
      );
    });
  }

  protected closeConnection(code?: number, reason?: string): Promise<void> {
    if (!this.connection) {
      this.connectionAttempt = null;
      return Promise.resolve();
    }
    let error;
    try {
      this.connection.close(code, reason);
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
    this.onStreamClose(ev.code, ev.reason);
  }

  /**
   * Handle an error that occurred on the WebSocket. Close the connection and reject all active requests.
   */
  private handleError(error?: unknown): void {
    logError(`DataConnect WebSocket error, closing stream: ${error}`);
    const code = WebSocketCloseCode.GRACEFUL_CLOSE;
    let reason = 'Protocol Error';
    if (error instanceof WebSocketDataConnectError) {
      reason = error.message;
    }
    void this.closeConnection(code, reason);
  }

  protected sendMessage<Variables>(
    requestBody: DataConnectStreamRequest<Variables>
  ): Promise<void> {
    return this.ensureConnection().then(() => {
      try {
        this.connection!.send(JSON.stringify(requestBody));
        return Promise.resolve();
      } catch (err) {
        this.handleError(err);
        throw new DataConnectError(
          Code.OTHER,
          `Failed to send message: ${String(err)}`
        );
      }
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
    const dataIsString = typeof data === 'string';
    /** raw websocket message */
    let webSocketMessage;
    /** object containing data, errors, and extensions */
    let result;
    try {
      if (dataIsString) {
        webSocketMessage = JSON.parse(data);
      } else {
        webSocketMessage = JSON.parse(this.decodeBinaryResponse(data));
      }
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
    if (dataIsString) {
      if (!('result' in webSocketMessage)) {
        throw new WebSocketDataConnectError(
          WebSocketCloseCode.PROTOCOL_ERROR,
          'WebSocket message from emulator did not include result'
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
      result = webSocketMessage.result;
    } else {
      result = webSocketMessage;
    }
    if (!('requestId' in result)) {
      throw new WebSocketDataConnectError(
        WebSocketCloseCode.PROTOCOL_ERROR,
        'WebSocket message did not include requestId'
      );
    }
    return result as DataConnectStreamResponse<Data>;
  }
}
