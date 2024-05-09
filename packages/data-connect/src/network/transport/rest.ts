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

import { DataConnectTransport } from '.';
import { DataConnectOptions, TransportOptions } from '../../api/DataConnect';
import { DataConnectError, Code } from '../../core/error';
import { AuthTokenProvider } from '../../core/FirebaseAuthProvider';
import { logDebug } from '../../logger';
import { addToken, urlBuilder } from '../../util/url';
import { dcFetch } from '../fetch';

export class RESTTransport implements DataConnectTransport {
  private host = '';
  private port: number | undefined;
  private location = 'l';
  private connectorName = '';
  private secure = true;
  private project = 'p';
  private serviceName: string;
  private accessToken: string | null = null;
  private authInitialized_ = false;
  constructor(
    options: DataConnectOptions,
    private apiKey?: string | undefined,
    private authProvider?: AuthTokenProvider | undefined,
    transportOptions?: TransportOptions | undefined
  ) {
    if (transportOptions) {
      if (typeof transportOptions.port === 'number') {
        this.port = transportOptions.port;
      }
      if (typeof transportOptions.sslEnabled !== 'undefined') {
        this.secure = transportOptions.sslEnabled;
      }
      this.host = transportOptions.host;
    }
    const { location, projectId: project, connector, service } = options;
    if (location) {
      this.location = location;
    }
    if (project) {
      this.project = project;
    }
    this.serviceName = service;
    if (!connector) {
      throw new DataConnectError(
        Code.INVALID_ARGUMENT,
        'Connector Name required!'
      );
    }
    this.connectorName = connector;
    this.authProvider?.addTokenChangeListener(token => {
      logDebug(`New Token Available: ${token}`);
      this.accessToken = token;
    });
  }
  get endpointUrl(): string {
    return urlBuilder(
      {
        connector: this.connectorName,
        location: this.location,
        projectId: this.project,
        service: this.serviceName
      },
      { host: this.host, sslEnabled: this.secure, port: this.port }
    );
  }
  useEmulator(host: string, port?: number, isSecure?: boolean): void {
    this.host = host;
    if (typeof port === 'number') {
      this.port = port;
    }
    if (typeof isSecure !== 'undefined') {
      this.secure = isSecure;
    }
  }
  onTokenChanged(newToken: string | null) {
    this.accessToken = newToken;
  }

  getWithAuth() {
    let starterPromise: Promise<string | null> = new Promise(resolve =>
      resolve(this.accessToken)
    );
    if (!this.authInitialized_) {
      if (this.authProvider) {
        starterPromise = this.authProvider
          .getToken(/*forceToken=*/ false)
          .then(data => {
            if (!data) {
              return null;
            }
            this.accessToken = data.accessToken;
            return this.accessToken;
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
          name: `projects/${this.project}/locations/${this.location}/services/${this.serviceName}/connectors/${this.connectorName}`,
          operationName: queryName,
          variables: body
        } as unknown as U, // TODO(mtewani): This is a patch, fix this.
        abortController,
        this.accessToken
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
          name: `projects/${this.project}/locations/${this.location}/services/${this.serviceName}/connectors/${this.connectorName}`,
          operationName: mutationName,
          variables: body
        } as unknown as U,
        abortController,
        this.accessToken
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
