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

import { DataConnectOptions, TransportOptions } from '../../api/DataConnect';
import { DataConnectError, Code } from '../../core/error';
import { AuthTokenProvider } from '../../core/FirebaseAuthProvider';
import { logDebug } from '../../logger';
import { addToken, urlBuilder } from '../../util/url';
import { dcFetch } from '../fetch';

import { DataConnectTransport } from '.';
import { AppCheckTokenProvider } from '../../core/AppCheckTokenProvider';

export class RESTTransport implements DataConnectTransport {
  private _host = '';
  private _port: number | undefined;
  private _location = 'l';
  private _connectorName = '';
  private _secure = true;
  private _project = 'p';
  private _serviceName: string;
  private _accessToken: string | null = null;
  private _appCheckToken: string | null = null;
  private _authInitialized = false;
  constructor(
    options: DataConnectOptions,
    private apiKey?: string | undefined,
    private authProvider?: AuthTokenProvider | undefined,
    private appCheckProvider?: AppCheckTokenProvider | undefined,
    transportOptions?: TransportOptions | undefined
  ) {
    if (transportOptions) {
      if (typeof transportOptions.port === 'number') {
        this._port = transportOptions.port;
      }
      if (typeof transportOptions.sslEnabled !== 'undefined') {
        this._secure = transportOptions.sslEnabled;
      }
      this._host = transportOptions.host;
    }
    const { location, projectId: project, connector, service } = options;
    if (location) {
      this._location = location;
    }
    if (project) {
      this._project = project;
    }
    this._serviceName = service;
    if (!connector) {
      throw new DataConnectError(
        Code.INVALID_ARGUMENT,
        'Connector Name required!'
      );
    }
    this._connectorName = connector;
    this.authProvider?.addTokenChangeListener(token => {
      logDebug(`New Token Available: ${token}`);
      this._accessToken = token;
    });
    this.appCheckProvider?.addTokenChangeListener(result => {
      const { token } = result;
      logDebug(`New App Check Token Available: ${token}`);
      this._appCheckToken = token;
    });
  }
  get endpointUrl(): string {
    return urlBuilder(
      {
        connector: this._connectorName,
        location: this._location,
        projectId: this._project,
        service: this._serviceName
      },
      { host: this._host, sslEnabled: this._secure, port: this._port }
    );
  }
  useEmulator(host: string, port?: number, isSecure?: boolean): void {
    this._host = host;
    if (typeof port === 'number') {
      this._port = port;
    }
    if (typeof isSecure !== 'undefined') {
      this._secure = isSecure;
    }
  }
  onTokenChanged(newToken: string | null) {
    this._accessToken = newToken;
  }

  getWithAuth() {
    let starterPromise: Promise<string | null> = new Promise(resolve =>
      resolve(this._accessToken)
    );
    if (!this._authInitialized) {
      if (this.authProvider) {
        starterPromise = this.authProvider
          .getToken(/*forceToken=*/ false)
          .then(data => {
            if (!data) {
              return null;
            }
            this._accessToken = data.accessToken;
            return this._accessToken;
          });
      } else {
        starterPromise = new Promise(resolve => resolve(''));
      }
    }
    return starterPromise;
  }

  // TODO(mtewani): Update U to include shape of body defined in line 13.
  invokeQuery = <T, U = unknown>(queryName: string, body: U) => {
    const abortController = new AbortController();

    // TODO(mtewani): Update to proper value
    const withAuth = this.getWithAuth().then(() => {
      return dcFetch<T, U>(
        addToken(`${this.endpointUrl}:executeQuery`, this.apiKey),
        {
          name: `projects/${this._project}/locations/${this._location}/services/${this._serviceName}/connectors/${this._connectorName}`,
          operationName: queryName,
          variables: body
        } as unknown as U, // TODO(mtewani): This is a patch, fix this.
        abortController,
        this._accessToken,
        this._appCheckToken
      );
    });

    return {
      then: withAuth.then.bind(withAuth)
    };
  };
  invokeMutation = <T, U = unknown>(mutationName: string, body: U) => {
    const abortController = new AbortController();
    const taskResult = this.getWithAuth().then(() => {
      return dcFetch<T, U>(
        addToken(`${this.endpointUrl}:executeMutation`, this.apiKey),
        {
          name: `projects/${this._project}/locations/${this._location}/services/${this._serviceName}/connectors/${this._connectorName}`,
          operationName: mutationName,
          variables: body
        } as unknown as U,
        abortController,
        this._accessToken,
        this._appCheckToken
      );
    });

    return {
      then: taskResult.then.bind(taskResult),
      // catch: taskResult.catch.bind(taskResult),
      // finally: taskResult.finally.bind(taskResult),
      cancel: () => abortController.abort()
    };
  };
}