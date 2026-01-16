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

/**
 * this is analagous to the RESTTransport class
 * @internal
 */
export class StreamTransport
  extends DataConnectTransportClass
  implements DataConnectStreamManager
{
  /** The current established connection to the server */
  private _connection: WebSocket | undefined = undefined;

  /** Tracks any ongoing connection attempt */
  private _connectionAttempt: Promise<void> | null = null;

  // TODO: make this real
  /** The endpoint for connecting to the server via a stream connection */
  get endpointUrl(): string {
    return `ws://127.0.0.1:9399/v1/Connect/locations/ignored`;
  }

  /** Added to each request to identify which connector the request is associated with */
  get connectorResourcePath(): string {
    return `projects/${this._project}/locations/${this._location}/services/${this._serviceName}/connectors/${this._connectorName}`;
  }

  /** requestId --> promise functions that will resolve/reject with request results */
  private _pendingRequests = new Map<
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { resolve: (data: any) => void; reject: (err: any) => void }
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
   * Ensure that that there is an open connection. If there is none, open a new one.
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
        // Clean up pending requests on close
        this._pendingRequests.forEach(p =>
          p.reject(
            new DataConnectError(
              Code.OTHER,
              'Socket closed, could not complete request'
            )
          )
        );
        this._pendingRequests.clear();
      };
    });

    return this._connectionAttempt;
  }

  openConnection(): void {
    this.ensureConnection().catch(err => {
      throw new DataConnectError(
        Code.OTHER,
        `Failed to open connection: ${err}`
      );
    });
  }

  closeConnection(): void {
    if (this._connection) {
      this._connection.close();
      this._connection = undefined;
      this._connectionAttempt = null;
    }
  }

  // TODO: is this right?
  reconnect(): void {
    this.closeConnection();
    this.openConnection();
  }

  /**
   * Sends a message over the stream.
   * Should not be used directly.
   * @param requestBody
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


  private sendExecuteMessage<Variables>(
    streamRequestBody: ExecuteStreamRequestBody<Variables>
  ): void {
    this._sendMessage(streamRequestBody);
  }

  sendSubscribeMessage<Variables>(
    subscribeRequestBody: SubscribeStreamRequestBody<Variables>
  ): void {
    this._sendMessage(subscribeRequestBody);
  }

  /**
   * Handle an incoming message from the server.
   * @param ev
   */
  private handleMessage(ev: MessageEvent): void {
    try {
      // eslint-disable-next-line no-console
      console.log('MESSAGE RECEIVED:', ev.data); // DEBUGGING
      const msg = JSON.parse(ev.data); // TODO: type the message, probably need some sort of enum to determine what type of message it is
      const requestId = msg.requestId;
      if (requestId && this._pendingRequests.has(requestId)) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { resolve, reject } = this._pendingRequests.get(requestId)!;
        resolve(msg); // TODO: do something with the message other than just pass it along, depending on message type - we should be resolving to DataConnectResponse<Data> if it succeeds
        this._pendingRequests.delete(requestId);
      }
    } catch (e) {
      console.error('Error handling WebSocket message', e);
    }
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

  private _invokeExecute<Data, Variables>(
    operationName: string,
    variables?: Variables
  ): Promise<DataConnectResponse<Data>> {
    const requestId = crypto.randomUUID(); // TODO: update
    const requestBody: DataConnectStreamRequestBody<Variables> = {
      'name': this.connectorResourcePath,
      requestId,
      'execute': { operationName, variables }
    };
    this.sendExecuteMessage<Variables>(requestBody);
    const responsePromise = new Promise<DataConnectResponse<Data>>(
      (resolve, reject) => {
        this._pendingRequests.set(requestId, { resolve, reject });
      }
    );
    return responsePromise;
  }

  invokeSubscription<Variables>(url: string, body: Variables): void {
    throw new Error('Method not implemented.');
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
