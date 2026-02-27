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
import { AuthTokenProvider } from '../core/FirebaseAuthProvider';

import {
  CallerSdkType,
  DataConnectResponse,
  DataConnectResponseWithMaxAge,
  DataConnectTransport,
  SubscribeNotificationHook
} from './DataConnectTransport';
import { RESTTransport } from './rest/RestTransport';

/**
 * Entry point for the transport layer. Manages routing between transport implementations.
 * @internal
 */
export class DataConnectTransportManager implements DataConnectTransport {
  private restTransport: RESTTransport;
  private _isUsingEmulator = false; // TODO(stephenarosaj): this will be used in a future PR.

  // TODO(stephenarosaj): these unused fields will be used in a future PR.
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

  invokeQuery<Data, Variables>(
    queryName: string,
    body?: Variables
  ): Promise<DataConnectResponseWithMaxAge<Data>> {
    return this.restTransport.invokeQuery(queryName, body);
  }

  invokeMutation<Data, Variables>(
    queryName: string,
    body?: Variables
  ): Promise<DataConnectResponse<Data>> {
    return this.restTransport.invokeMutation(queryName, body);
  }

  invokeSubscribe<Data, Variables>(
    notificationHook: SubscribeNotificationHook<Data>,
    queryName: string,
    body?: Variables
  ): void {
    this.restTransport.invokeSubscribe(notificationHook, queryName, body);
  }

  invokeUnsubscribe<Variables>(queryName: string, body?: Variables): void {
    this.restTransport.invokeUnsubscribe(queryName, body);
  }

  useEmulator(host: string, port?: number, sslEnabled?: boolean): void {
    this._isUsingEmulator = true;
    this.transportOptions = { host, port, sslEnabled };
    this.restTransport.useEmulator(host, port, sslEnabled);
  }

  onAuthTokenChanged(token: string | null): void {
    this.restTransport.onAuthTokenChanged(token);
  }

  _setCallerSdkType(callerSdkType: CallerSdkType): void {
    this._callerSdkType = callerSdkType;
    this.restTransport._setCallerSdkType(callerSdkType);
  }
}
