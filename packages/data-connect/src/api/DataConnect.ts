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
  FirebaseApp,
  _getProvider,
  _removeServiceInstance,
  getApp
} from '@firebase/app';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { Provider } from '@firebase/component';

import {
  AuthTokenProvider,
  FirebaseAuthProvider
} from '../core/FirebaseAuthProvider';
import { QueryManager } from '../core/QueryManager';
import { DataConnectTransport, TransportClass } from '../network';
import { RESTTransport } from '../network/transport/rest';

import { MutationManager } from './Mutation';
import { Code, DataConnectError } from '../core/error';
import { logDebug, logError } from '../logger';

export interface ProjectOptions {
  location: string;
  connector: string;
  service: string;
  projectId: string;
}

export interface ConnectorConfig {
  location: string;
  connector: string;
  service: string;
}

export interface TransportOptions {
  host: string;
  sslEnabled?: boolean;
  port?: number;
}

export const FIREBASE_DATA_CONNECT_EMULATOR_HOST_VAR =
  'FIREBASE_DATA_CONNECT_EMULATOR_HOST';

/**
 *
 * @param fullHost
 * @returns TransportOptions
 * @internal
 */
export function parseOptions(fullHost: string): TransportOptions {
  const [protocol, hostName] = fullHost.split('://');
  const isSecure = protocol === 'https';
  const [host, portAsString] = hostName.split(':');
  const port = Number(portAsString);
  return { host, port, sslEnabled: isSecure };
}
export interface DataConnectOptions extends ConnectorConfig {
  projectId: string;
}

export class DataConnect {
  _queryManager!: QueryManager;
  _mutationManager!: MutationManager;
  public isEmulator = false;
  initialized = false;
  private _transport!: DataConnectTransport;
  private transportClass: TransportClass | undefined;
  private transportOptions?: TransportOptions;
  private authTokenProvider?: AuthTokenProvider;
  constructor(
    public readonly app: FirebaseApp,
    private readonly dataConnectOptions: DataConnectOptions,
    private readonly authProvider: Provider<FirebaseAuthInternalName>
  ) {
    if (typeof process !== 'undefined' && process.env) {
      const host = process.env[FIREBASE_DATA_CONNECT_EMULATOR_HOST_VAR];
      if (host) {
        logDebug('Found custom host. Using emulator');
        this.isEmulator = true;
        this.transportOptions = parseOptions(host);
      }
    }
  }
  _delete() {
    _removeServiceInstance(
      this.app,
      'data-connect',
      JSON.stringify(this.getSettings())
    );
    return Promise.resolve();
  }

  getSettings(): ConnectorConfig {
    const copy = JSON.parse(JSON.stringify(this.dataConnectOptions));
    delete copy.projectId;
    return copy;
  }

  setInitialized() {
    if (this.initialized) {
      return;
    }
    if (this.transportClass === undefined) {
      logDebug('transportClass not provided. Defaulting to RESTTransport.');
      this.transportClass = RESTTransport;
    }

    if (this.authProvider) {
      this.authTokenProvider = new FirebaseAuthProvider(
            this.app.name,
            this.app.options,
            this.authProvider
          );
    }

    this.initialized = true;
    this._transport = new this.transportClass(
      this.dataConnectOptions,
      this.app.options.apiKey,
      this.authTokenProvider
    );
    if (this.transportOptions) {
      this._transport.useEmulator(
        this.transportOptions.host,
        this.transportOptions.port,
        this.transportOptions.sslEnabled
      );
    }
    this._queryManager = new QueryManager(this._transport);
    this._mutationManager = new MutationManager(this._transport);
  }

  enableEmulator(transportOptions: TransportOptions) {
    if (this.initialized) {
      logError('enableEmulator called without initializing');
      throw new DataConnectError(
        Code.ALREADY_INITIALIZED,
        'DataConnect instance already initialized!'
      );
    }
    this.transportOptions = transportOptions;
    this.isEmulator = true;
  }
}

export function connectDataConnectEmulator(
  dc: DataConnect,
  host: string,
  port?: number,
  sslEnabled = false
) {
  dc.enableEmulator({ host, port, sslEnabled });
}

export function getDataConnect(options: ConnectorConfig): DataConnect;
export function getDataConnect(
  app: FirebaseApp,
  options: ConnectorConfig
): DataConnect;
export function getDataConnect(
  appOrOptions: FirebaseApp | ConnectorConfig,
  optionalOptions?: ConnectorConfig
): DataConnect {
  let app: FirebaseApp;
  let dcOptions: ConnectorConfig;
  if ('location' in appOrOptions) {
    dcOptions = appOrOptions;
    app = getApp();
  } else {
    dcOptions = optionalOptions!;
    app = appOrOptions;
  }

  if (!app) {
    app = getApp();
  }
  const provider = _getProvider(app, 'data-connect');
  const identifier = JSON.stringify(dcOptions);
  if (provider.isInitialized(identifier)) {
    const dcInstance = provider.getImmediate({ identifier });
    const options = provider.getOptions(identifier);
    const optionsValid = Object.keys(options).length > 0;
    if (optionsValid) {
      logDebug('Re-using cached instance');
      return dcInstance;
    }
  }
  if (!dcOptions) {
    throw new DataConnectError(Code.INVALID_ARGUMENT, 'DC Option Required');
  }
  logDebug('Creating new DataConnect instance');
  // Initialize with options.
  return provider.initialize({
    instanceIdentifier: identifier,
    options: dcOptions
  });
}

export function terminate(dataConnect: DataConnect) {
  dataConnect._delete();
  // TODO(mtewani): Stop pending tasks
}
