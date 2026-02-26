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

import {
  CallerSdkType,
  DataConnectResponse,
  DataConnectTransport,
  SubscribeNotificationHook
} from './DataConnectTransport';
import { RESTTransport } from './rest/RESTTransport';
import { DataConnectStreamManager } from './stream';
import { WebSocketTransport } from './stream/WebSocketTransport';

/**
 * Manages routing between the REST transport (default) and the Stream transport
 * (lazy-loaded for subscriptions). Implements the DataConnectTransport interface.
 * @internal
 */
export class DataConnectTransportManager implements DataConnectTransport {
  private restTransport: RESTTransport;
  private streamTransport?: DataConnectStreamManager;
  private _isUsingEmulator = false;

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
  private initStreamTransport(): DataConnectStreamManager {
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
      if (this._isUsingEmulator && this.transportOptions) {
        this.streamTransport.useEmulator(
          this.transportOptions.host,
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
  private shouldUseStream(): boolean {
    return (
      !!this.streamTransport &&
      !this.streamTransport.isPendingClose &&
      this.streamTransport.streamConnected &&
      this.streamTransport.hasActiveSubscriptions
    );
  }

  invokeQuery<Data, Variables>(
    queryName: string,
    body?: Variables
  ): Promise<DataConnectResponse<Data>> {
    if (this.shouldUseStream()) {
      return this.streamTransport!.invokeQuery<Data, Variables>(
        queryName,
        body
      ).catch(err => {
        if (this.streamTransport?.isUnableToConnect) {
          // If the stream died while we were waiting, fall back to REST transparently
          return this.restTransport.invokeQuery<Data, Variables>(
            queryName,
            body
          );
        }
        throw err;
      });
    }
    return this.restTransport.invokeQuery(queryName, body);
  }

  invokeMutation<Data, Variables>(
    queryName: string,
    body?: Variables
  ): Promise<DataConnectResponse<Data>> {
    if (this.shouldUseStream()) {
      return this.streamTransport!.invokeMutation<Data, Variables>(
        queryName,
        body
      ).catch(err => {
        if (this.streamTransport?.isUnableToConnect) {
          // If the stream died while we were waiting, fall back to REST transparently
          return this.restTransport.invokeMutation<Data, Variables>(
            queryName,
            body
          );
        }
        throw err;
      });
    }
    return this.restTransport.invokeMutation(queryName, body);
  }

  invokeSubscribe<Data, Variables>(
    notificationHook: SubscribeNotificationHook<Data>,
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

    streamTransport.invokeSubscribe(notificationHook, queryName, body);
  }

  invokeUnsubscribe<Variables>(queryName: string, variables: Variables): void {
    if (this.streamTransport) {
      this.streamTransport.invokeUnsubscribe(queryName, variables);
    }
  }

  useEmulator(host: string, port?: number, sslEnabled?: boolean): void {
    this._isUsingEmulator = true;
    this.transportOptions = { host, port, sslEnabled };
    this.restTransport.useEmulator(host, port, sslEnabled);
    if (this.streamTransport) {
      this.streamTransport.useEmulator(host, port, sslEnabled);
    }
  }

  async onAuthTokenChanged(token: string | null): Promise<void> {
    this.restTransport.onAuthTokenChanged(token);
    if (this.streamTransport) {
      await this.streamTransport.onAuthTokenChanged(token);
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
