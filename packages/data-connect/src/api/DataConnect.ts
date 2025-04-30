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
import { AppCheckInternalComponentName } from '@firebase/app-check-interop-types';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { Provider } from '@firebase/component';
import { isCloudWorkstation, pingServer } from '@firebase/util';

import { AppCheckTokenProvider } from '../core/AppCheckTokenProvider';
import { Code, DataConnectError } from '../core/error';
import {
  AuthTokenProvider,
  FirebaseAuthProvider
} from '../core/FirebaseAuthProvider';
import { QueryManager } from '../core/QueryManager';
import { logDebug, logError } from '../logger';
import {
  CallerSdkType,
  CallerSdkTypeEnum,
  DataConnectTransport,
  TransportClass
} from '../network';
import { RESTTransport } from '../network/transport/rest';

import { MutationManager } from './Mutation';

/**
 * Connector Config for calling Data Connect backend.
 */
export interface ConnectorConfig {
  location: string;
  connector: string;
  service: string;
}

/**
 * Options to connect to emulator
 */
export interface TransportOptions {
  host: string;
  sslEnabled?: boolean;
  port?: number;
}

const FIREBASE_DATA_CONNECT_EMULATOR_HOST_VAR =
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
/**
 * DataConnectOptions including project id
 */
export interface DataConnectOptions extends ConnectorConfig {
  projectId: string;
}

/**
 * Class representing Firebase Data Connect
 */
export class DataConnect {
  _queryManager!: QueryManager;
  _mutationManager!: MutationManager;
  isEmulator = false;
  _initialized = false;
  private _transport!: DataConnectTransport;
  private _transportClass: TransportClass | undefined;
  private _transportOptions?: TransportOptions;
  private _authTokenProvider?: AuthTokenProvider;
  _isUsingGeneratedSdk: boolean = false;
  _callerSdkType: CallerSdkType = CallerSdkTypeEnum.Base;
  private _appCheckTokenProvider?: AppCheckTokenProvider;
  // @internal
  constructor(
    public readonly app: FirebaseApp,
    // TODO(mtewani): Replace with _dataConnectOptions in the future
    private readonly dataConnectOptions: DataConnectOptions,
    private readonly _authProvider: Provider<FirebaseAuthInternalName>,
    private readonly _appCheckProvider: Provider<AppCheckInternalComponentName>
  ) {
    if (typeof process !== 'undefined' && process.env) {
      const host = process.env[FIREBASE_DATA_CONNECT_EMULATOR_HOST_VAR];
      if (host) {
        logDebug('Found custom host. Using emulator');
        this.isEmulator = true;
        this._transportOptions = parseOptions(host);
      }
    }
  }
  // @internal
  _useGeneratedSdk(): void {
    if (!this._isUsingGeneratedSdk) {
      this._isUsingGeneratedSdk = true;
    }
  }
  _setCallerSdkType(callerSdkType: CallerSdkType): void {
    this._callerSdkType = callerSdkType;
    if (this._initialized) {
      this._transport._setCallerSdkType(callerSdkType);
    }
  }
  _delete(): Promise<void> {
    _removeServiceInstance(
      this.app,
      'data-connect',
      JSON.stringify(this.getSettings())
    );
    return Promise.resolve();
  }

  // @internal
  getSettings(): ConnectorConfig {
    const copy = JSON.parse(JSON.stringify(this.dataConnectOptions));
    delete copy.projectId;
    return copy;
  }

  // @internal
  setInitialized(): void {
    if (this._initialized) {
      return;
    }
    if (this._transportClass === undefined) {
      logDebug('transportClass not provided. Defaulting to RESTTransport.');
      this._transportClass = RESTTransport;
    }

    if (this._authProvider) {
      this._authTokenProvider = new FirebaseAuthProvider(
        this.app.name,
        this.app.options,
        this._authProvider
      );
    }
    if (this._appCheckProvider) {
      this._appCheckTokenProvider = new AppCheckTokenProvider(
        this.app,
        this._appCheckProvider
      );
    }

    this._initialized = true;
    this._transport = new this._transportClass(
      this.dataConnectOptions,
      this.app.options.apiKey,
      this.app.options.appId,
      this._authTokenProvider,
      this._appCheckTokenProvider,
      undefined,
      this._isUsingGeneratedSdk,
      this._callerSdkType
    );
    if (this._transportOptions) {
      this._transport.useEmulator(
        this._transportOptions.host,
        this._transportOptions.port,
        this._transportOptions.sslEnabled
      );
    }
    this._queryManager = new QueryManager(this._transport);
    this._mutationManager = new MutationManager(this._transport);
  }

  // @internal
  enableEmulator(transportOptions: TransportOptions): void {
    if (
      this._initialized &&
      !areTransportOptionsEqual(this._transportOptions, transportOptions)
    ) {
      logError('enableEmulator called after initialization');
      throw new DataConnectError(
        Code.ALREADY_INITIALIZED,
        'DataConnect instance already initialized!'
      );
    }
    this._transportOptions = transportOptions;
    this.isEmulator = true;
  }
}

/**
 * @internal
 * @param transportOptions1
 * @param transportOptions2
 * @returns
 */
export function areTransportOptionsEqual(
  transportOptions1: TransportOptions,
  transportOptions2: TransportOptions
): boolean {
  return (
    transportOptions1.host === transportOptions2.host &&
    transportOptions1.port === transportOptions2.port &&
    transportOptions1.sslEnabled === transportOptions2.sslEnabled
  );
}

/**
 * Connect to the DataConnect Emulator
 * @param dc Data Connect instance
 * @param host host of emulator server
 * @param port port of emulator server
 * @param sslEnabled use https
 */
export function connectDataConnectEmulator(
  dc: DataConnect,
  host: string,
  port?: number,
  sslEnabled = false
): void {
  // Workaround to get cookies in Firebase Studio
  if (isCloudWorkstation(host)) {
    void pingServer(`https://${host}${port ? `:${port}` : ''}`);
  }
  dc.enableEmulator({ host, port, sslEnabled });
}

/**
 * Initialize DataConnect instance
 * @param options ConnectorConfig
 */
export function getDataConnect(options: ConnectorConfig): DataConnect;
/**
 * Initialize DataConnect instance
 * @param app FirebaseApp to initialize to.
 * @param options ConnectorConfig
 */
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

  if (!app || Object.keys(app).length === 0) {
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
  validateDCOptions(dcOptions);

  logDebug('Creating new DataConnect instance');
  // Initialize with options.
  return provider.initialize({
    instanceIdentifier: identifier,
    options: dcOptions
  });
}

/**
 *
 * @param dcOptions
 * @returns {void}
 * @internal
 */
export function validateDCOptions(dcOptions: ConnectorConfig): boolean {
  const fields = ['connector', 'location', 'service'];
  if (!dcOptions) {
    throw new DataConnectError(Code.INVALID_ARGUMENT, 'DC Option Required');
  }
  fields.forEach(field => {
    if (dcOptions[field] === null || dcOptions[field] === undefined) {
      throw new DataConnectError(Code.INVALID_ARGUMENT, `${field} Required`);
    }
  });
  return true;
}

/**
 * Delete DataConnect instance
 * @param dataConnect DataConnect instance
 * @returns
 */
export function terminate(dataConnect: DataConnect): Promise<void> {
  return dataConnect._delete();
  // TODO(mtewani): Stop pending tasks
}
