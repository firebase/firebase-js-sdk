/**
 * @license
 * Copyright 2024 Google LLC
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

import {
  CallerSdkType,
  CallerSdkTypeEnum,
  DataConnectResponse,
  DataConnectTransportClass,
  SubscribeNotificationHook
} from '..';
import { DataConnectOptions, TransportOptions } from '../../api/DataConnect';
import { AppCheckTokenProvider } from '../../core/AppCheckTokenProvider';
import { Code, DataConnectError } from '../../core/error';
import { AuthTokenProvider } from '../../core/FirebaseAuthProvider';
import { addToken } from '../../util/url';

import { dcFetch } from './fetch';

export class RESTTransport extends DataConnectTransportClass {
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

  invokeQuery<Data, Variables>(
    queryName: string,
    body?: Variables
  ): Promise<DataConnectResponse<Data>> {
    const abortController = new AbortController();

    // TODO(mtewani): Update to proper value
    const withAuth = this.withRetry(() =>
      dcFetch<Data, Variables>(
        addToken(`${this.endpointUrl}:executeQuery`, this.apiKey),
        {
          name: `projects/${this._project}/locations/${this._location}/services/${this._serviceName}/connectors/${this._connectorName}`,
          operationName: queryName,
          variables: body as Variables
        },
        abortController,
        this.appId,
        this._authToken,
        this._appCheckToken,
        this._isUsingGen,
        this._callerSdkType,
        this._isUsingEmulator
      )
    );
    return withAuth;
  }

  invokeMutation<Data, Variables>(
    mutationName: string,
    body?: Variables
  ): Promise<DataConnectResponse<Data>> {
    const abortController = new AbortController();
    const taskResult = this.withRetry(() => {
      return dcFetch<Data, Variables>(
        addToken(`${this.endpointUrl}:executeMutation`, this.apiKey),
        {
          name: `projects/${this._project}/locations/${this._location}/services/${this._serviceName}/connectors/${this._connectorName}`,
          operationName: mutationName,
          variables: body as Variables
        },
        abortController,
        this.appId,
        this._authToken,
        this._appCheckToken,
        this._isUsingGen,
        this._callerSdkType,
        this._isUsingEmulator
      );
    });
    return taskResult;
  }

  invokeSubscribe<Data, Variables>(
    notificationHook: SubscribeNotificationHook<Data>,
    queryName: string,
    body?: Variables
  ): void {
    throw new DataConnectError(
      Code.NOT_SUPPORTED,
      'Subscriptions are not supported using REST!'
    );
  }

  invokeUnsubscribe<Variables>(queryName: string, variables: Variables): void {
    throw new DataConnectError(
      Code.NOT_SUPPORTED,
      'Unsubscriptions are not supported using REST!'
    );
  }

  onAuthTokenChanged(newToken: string | null): void {
    this._authToken = newToken;
  }
}
