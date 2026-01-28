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
  DataConnectResponse,
  DataConnectTransportClass
} from '../../../';
import { DataConnectError, Code } from '../../../core/error';
import { logDebug } from '../../../logger';
import { addToken } from '../../../util/url';

import { dcFetch } from './fetch';

export class RESTTransport extends DataConnectTransportClass {
  async getWithAuth(forceToken = false): Promise<string | null> {
    let starterPromise: Promise<string | null> = new Promise(resolve =>
      resolve(this._authToken)
    );
    if (this.appCheckProvider) {
      const appCheckToken = await this.appCheckProvider.getToken();
      if (appCheckToken) {
        this._appCheckToken = appCheckToken.token;
      }
    }
    if (this.authProvider) {
      starterPromise = this.authProvider
        .getToken(/*forceToken=*/ forceToken)
        .then(data => {
          if (!data) {
            return null;
          }
          this._authToken = data.accessToken;
          return this._authToken;
        });
    } else {
      starterPromise = new Promise(resolve => resolve(''));
    }
    return starterPromise;
  }

  withRetry<T>(
    promiseFactory: () => Promise<DataConnectResponse<T>>,
    retry = false
  ): Promise<DataConnectResponse<T>> {
    let isNewToken = false;
    return this.getWithAuth(retry)
      .then(res => {
        isNewToken = this._lastToken !== res;
        this._lastToken = res;
        return res;
      })
      .then(promiseFactory)
      .catch(err => {
        // Only retry if the result is unauthorized and the last token isn't the same as the new one.
        if (
          'code' in err &&
          err.code === Code.UNAUTHORIZED &&
          !retry &&
          isNewToken
        ) {
          logDebug('Retrying due to unauthorized');
          return this.withRetry(promiseFactory, true);
        }
        throw err;
      });
  }

  invokeQuery: <Data, Variables>(
    queryName: string,
    body?: Variables
  ) => Promise<DataConnectResponse<Data>> = <Variables, Data = unknown>(
    queryName: string,
    body: Data
  ) => {
    const abortController = new AbortController();

    // TODO(mtewani): Update U to include shape of body defined in line 13.
    // TODO(mtewani): Update to proper value
    const withAuth = this.withRetry(() =>
      dcFetch<Variables, Data>(
        addToken(`${this.endpointUrl}:executeQuery`, this.apiKey),
        {
          name: `projects/${this._project}/locations/${this._location}/services/${this._serviceName}/connectors/${this._connectorName}`,
          operationName: queryName,
          variables: body
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
  };

  invokeMutation: <Data, Variables>(
    queryName: string,
    body?: Variables
  ) => Promise<DataConnectResponse<Data>> = <Data, Variables = unknown>(
    mutationName: string,
    body: Variables
  ) => {
    const abortController = new AbortController();
    const taskResult = this.withRetry(() => {
      return dcFetch<Data, Variables>(
        addToken(`${this.endpointUrl}:executeMutation`, this.apiKey),
        {
          name: `projects/${this._project}/locations/${this._location}/services/${this._serviceName}/connectors/${this._connectorName}`,
          operationName: mutationName,
          variables: body
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
  };

  invokeSubscribe(): void {
    throw new DataConnectError(
      Code.NOT_SUPPORTED,
      'Subscriptions are not supported using REST!'
    );
  }

  invokeUnsubscribe(): void {
    throw new DataConnectError(
      Code.NOT_SUPPORTED,
      'Unsubscriptions are not supported using REST!'
    );
  }

  onAuthTokenChanged(newToken: string | null): void {
    this._authToken = newToken;
  }

  _setCallerSdkType(callerSdkType: CallerSdkType): void {
    this._callerSdkType = callerSdkType;
  }
}
