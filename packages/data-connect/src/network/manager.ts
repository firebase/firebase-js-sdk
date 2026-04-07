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

import { DataConnectOptions, TransportOptions } from '../api/DataConnect';
import { AppCheckTokenProvider } from '../core/AppCheckTokenProvider';
import { Code, DataConnectError } from '../core/error';
import { AuthTokenProvider } from '../core/FirebaseAuthProvider';

import { RESTTransport } from './rest';
import { AbstractDataConnectStreamTransport } from './stream/streamTransport';
import { WebSocketTransport } from './stream/websocket';
import {
  CallerSdkType,
  DataConnectResponse,
  DataConnectResponseWithMaxAge,
  DataConnectTransportInterface,
  SubscribeObserver
} from './transport';

/**
 * Entry point for the transport layer. Manages routing between transport implementations.
 * @internal
 */
export class DataConnectTransportManager
  implements DataConnectTransportInterface
{
  private restTransport: RESTTransport;
  private streamTransport?: AbstractDataConnectStreamTransport;
  private isUsingEmulator = false;

  constructor(
    private options: DataConnectOptions,
    private apiKey?: string,
    private appId?: string | null,
    private authProvider?: AuthTokenProvider,
    private appCheckProvider?: AppCheckTokenProvider,
    private transportOptions?: TransportOptions,
    private _isUsingGen = false,
    private _callerSdkType?: CallerSdkType
  ) {
    this.restTransport = new RESTTransport(
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
   * Initializes the stream transport if it hasn't been already.
   */
  private initStreamTransport(): AbstractDataConnectStreamTransport {
    if (!this.streamTransport) {
      this.streamTransport = new WebSocketTransport(
        this.options,
        this.apiKey,
        this.appId,
        this.authProvider,
        this.appCheckProvider,
        this.transportOptions,
        this._isUsingGen,
        this._callerSdkType
      );
      if (this.isUsingEmulator && this.transportOptions) {
        this.streamTransport.useEmulator(
          this.transportOptions.host!,
          this.transportOptions.port,
          this.transportOptions.sslEnabled
        );
      }
      this.streamTransport.onGracefulStreamClose = () => {
        this.streamTransport = undefined;
      };
    }
    return this.streamTransport;
  }

  /**
   * Returns true if the stream is in a healthy, ready connection state and has active subscriptions.
   */
  private executeShouldUseStream(): boolean {
    return (
      !!this.streamTransport &&
      !this.streamTransport.isPendingClose &&
      this.streamTransport.streamIsReady &&
      this.streamTransport.hasActiveSubscriptions &&
      !this.streamTransport.isUnableToConnect
    );
  }

  /**
   * Prefer to use Streaming Transport connection when one is available.
   * @inheritdoc
   */
  invokeQuery<Data, Variables>(
    queryName: string,
    body?: Variables
  ): Promise<DataConnectResponseWithMaxAge<Data>> {
    if (this.executeShouldUseStream()) {
      return this.streamTransport!.invokeQuery<Data, Variables>(
        queryName,
        body
      ).catch(err => {
        if (this.executeShouldUseStream()) {
          throw err;
        }
        return this.restTransport.invokeQuery<Data, Variables>(queryName, body);
      });
    }
    return this.restTransport.invokeQuery(queryName, body);
  }

  /**
   * Prefer to use Streaming Transport connection when one is available.
   * @inheritdoc
   */
  invokeMutation<Data, Variables>(
    queryName: string,
    body?: Variables
  ): Promise<DataConnectResponse<Data>> {
    if (this.executeShouldUseStream()) {
      return this.streamTransport!.invokeMutation<Data, Variables>(
        queryName,
        body
      ).catch(err => {
        if (this.executeShouldUseStream()) {
          throw err;
        }
        return this.restTransport.invokeMutation<Data, Variables>(
          queryName,
          body
        );
      });
    }
    return this.restTransport.invokeMutation(queryName, body);
  }

  invokeSubscribe<Data, Variables>(
    observer: SubscribeObserver<Data>,
    queryName: string,
    body?: Variables
  ): void {
    const streamTransport = this.initStreamTransport();
    if (streamTransport.isUnableToConnect) {
      throw new DataConnectError(
        Code.OTHER,
        'Unable to connect streaming connection to server. Subscriptions are unavailable.'
      );
    }
    streamTransport.invokeSubscribe(observer, queryName, body);
  }

  invokeUnsubscribe<Variables>(queryName: string, body?: Variables): void {
    if (this.streamTransport) {
      this.streamTransport.invokeUnsubscribe(queryName, body);
    }
  }

  useEmulator(host: string, port?: number, sslEnabled?: boolean): void {
    this.isUsingEmulator = true;
    this.transportOptions = { host, port, sslEnabled };
    this.restTransport.useEmulator(host, port, sslEnabled);
    if (this.streamTransport) {
      this.streamTransport.useEmulator(host, port, sslEnabled);
    }
  }

  onAuthTokenChanged(token: string | null): void {
    this.restTransport.onAuthTokenChanged(token);
    if (this.streamTransport) {
      this.streamTransport.onAuthTokenChanged(token);
    }
  }

  _setCallerSdkType(callerSdkType: CallerSdkType): void {
    this._callerSdkType = callerSdkType;
    this.restTransport._setCallerSdkType(callerSdkType);
    if (this.streamTransport) {
      this.streamTransport._setCallerSdkType(callerSdkType);
    }
  }
}
