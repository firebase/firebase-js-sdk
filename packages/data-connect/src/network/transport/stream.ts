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

import { AppCheckTokenProvider } from '../../core/AppCheckTokenProvider';
import { AuthTokenProvider } from '../../core/FirebaseAuthProvider';

import {
  CallerSdkType,
  CallerSdkTypeEnum,
  DataConnectResponse,
  DataConnectStreamManager,
  DataConnectTransportClass
} from '.';
import { DataConnectOptions, TransportOptions } from '../../api/DataConnect';
import { Code, DataConnectError } from '../../core/error';

interface DataConnectStreamRequestBody<Variables> {
  name: string;
  requestId: string;
  execute: { operationName: string; variables?: Variables };
}

/**
 * this is analagous to the RESTTransport class
 * @internal
 */
export class StreamTransport
  extends DataConnectTransportClass
  implements DataConnectStreamManager<WebSocket>
{
  _connection: WebSocket | undefined = undefined;

  // Track the promise for the ongoing connection attempt to avoid multiple open calls
  private _connectionPromise: Promise<void> | null = null;

  // TODO: make this real
  get endpointUrl(): string {
    return `ws://127.0.0.1:9399/v1/Connect/locations/ignored`;
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

  async invokeQuery<Data, Variables>(
    queryName: string,
    body?: Variables
  ): Promise<DataConnectResponse<Data>> {
    await this.ensureConnection();
    const requestId = crypto.randomUUID(); // TODO: update
    const requestBody: DataConnectStreamRequestBody<Variables> = {
      'name': `projects/${this._project}/locations/${this._location}/services/${this._serviceName}/connectors/${this._connectorName}`,
      requestId,
      'execute': { 'operationName': queryName, 'variables': body }
    };
    this.sendMessage<DataConnectStreamRequestBody<Variables>>(requestBody);
    const responsePromise = new Promise<DataConnectResponse<Data>>(
      (resolve, reject) => {
        this._pendingRequests.set(requestId, { resolve, reject });
      }
    );
    return responsePromise;
  }

  invokeMutation<Data, Variables>(
    queryName: string,
    body?: Variables
  ): Promise<DataConnectResponse<Data>> {
    throw new Error('Method not implemented.');
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

  private ensureConnection(): Promise<void> {
    if (this._connection?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }
    if (this._connectionPromise) {
      return this._connectionPromise;
    }
    this._connectionPromise = new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(this.endpointUrl);
      ws.onopen = () => {
        this._connection = ws;
        // eslint-disable-next-line no-console
        console.log('WebSocket Connected'); // DEBUGGING
        resolve();
      };
      ws.onerror = err => {
        this._connectionPromise = null;
        reject(err);
      };
      ws.onmessage = ev => this.handleMessage(ev);
      ws.onclose = () => {
        this._connection = undefined;
        this._connectionPromise = null;
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

    return this._connectionPromise;
  }

  openConnection(): void {
    this.ensureConnection().catch(err => {
      throw new DataConnectError(
        Code.OTHER,
        `Failed to open connection: ${err}`
      );
    });
  }

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

  sendMessage<RequestBody>(requestBody: RequestBody): void {
    this._connection!.send(JSON.stringify(requestBody));
  }

  closeConnection(): void {
    if (this._connection) {
      this._connection.close();
      this._connection = undefined;
      this._connectionPromise = null;
    }
  }
  reconnect(): void {
    this.closeConnection();
    this.openConnection();
  }
  // TODO: type
  executeOperation<Data, Variables>(
    operationName: string,
    body?: Variables
  ): Promise<DataConnectResponse<Data>> {
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
