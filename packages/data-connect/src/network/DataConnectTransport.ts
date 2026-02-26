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

import { DataConnectOptions, TransportOptions } from '../api/DataConnect';
import { AppCheckTokenProvider } from '../core/AppCheckTokenProvider';
import { Code, DataConnectError } from '../core/error';
import { AuthTokenProvider } from '../core/FirebaseAuthProvider';
import { SDK_VERSION } from '../core/version';
import { logDebug } from '../logger';
import { urlBuilder } from '../util/url';

export interface DataConnectEntityArray {
  entityIds: string[];
}

export interface DataConnectSingleEntity {
  entityId: string;
}

export type DataConnectExtension = {
  path: Array<string | number>;
} & (DataConnectEntityArray | DataConnectSingleEntity);

export interface DataConnectExtensions {
  dataConnect?: DataConnectExtension[];
}

export interface DataConnectResponse<T> {
  data: T;
  errors: Error[];
  extensions: DataConnectExtensions;
}

/**
 * enum representing different flavors of the SDK used by developers
 * use the CallerSdkType for type-checking, and the CallerSdkTypeEnum for value-checking/assigning
 */
export type CallerSdkType =
  | 'Base' // Core JS SDK
  | 'Generated' // Generated JS SDK
  | 'TanstackReactCore' // Tanstack non-generated React SDK
  | 'GeneratedReact' // Generated React SDK
  | 'TanstackAngularCore' // Tanstack non-generated Angular SDK
  | 'GeneratedAngular'; // Generated Angular SDK
export const CallerSdkTypeEnum = {
  Base: 'Base', // Core JS SDK
  Generated: 'Generated', // Generated JS SDK
  TanstackReactCore: 'TanstackReactCore', // Tanstack non-generated React SDK
  GeneratedReact: 'GeneratedReact', // Tanstack non-generated Angular SDK
  TanstackAngularCore: 'TanstackAngularCore', // Tanstack non-generated Angular SDK
  GeneratedAngular: 'GeneratedAngular' // Generated Angular SDK
} as const;

/**
 * Constructs the value for the X-Goog-Api-Client header
 * @internal
 */
export function getGoogApiClientValue(
  _isUsingGen: boolean,
  _callerSdkType: CallerSdkType
): string {
  let str = 'gl-js/ fire/' + SDK_VERSION;
  if (
    _callerSdkType !== CallerSdkTypeEnum.Base &&
    _callerSdkType !== CallerSdkTypeEnum.Generated
  ) {
    str += ' js/' + _callerSdkType.toLowerCase();
  } else if (_isUsingGen || _callerSdkType === CallerSdkTypeEnum.Generated) {
    str += ' js/gen';
  }
  return str;
}

/**
 * Type signature of the notification hook passed from the query layer to the transport layer. This
 * will be called by the transport layer to forward data updates from the server to the query layer.
 * @internal
 */
export type SubscribeNotificationHook<Data> = (
  result: DataConnectResponse<Data>
) => void;

/**
 * @internal
 */
export interface DataConnectTransport {
  /**
   * Invoke a query execution request.
   * @param queryName The name of the query to execute.
   * @param body The variables associated with the query.
   * @returns A promise resolving to the DataConnectResponse.
   */
  invokeQuery<Data, Variables>(
    queryName: string,
    body?: Variables
  ): Promise<DataConnectResponse<Data>>;

  /**
   * Invoke a mutation execution request.
   * @param queryName The name of the mutation to execute.
   * @param body The variables associated with the mutation.
   * @returns A promise resolving to the DataConnectResponse.
   */
  invokeMutation<Data, Variables>(
    queryName: string,
    body?: Variables
  ): Promise<DataConnectResponse<Data>>;

  /**
   * Subscribes to a query to receive push notifications of updates.
   * @param notificationHook the notification hook passed to the transport layer - will be called
   * when it receives responses related to this subscription to notify query layer of data updates.
   * @param queryName The name of the query to subscribe to.
   * @param body The variables associated with the subscription.
   */
  invokeSubscribe<Data, Variables>(
    notificationHook: SubscribeNotificationHook<Data>,
    queryName: string,
    body?: Variables
  ): void;

  /**
   * Unsubscribes from an active subscription.
   * @param queryName The name of the query to unsubscribe from.
   * @param body The variables associated with the subscription.
   */
  invokeUnsubscribe<Variables>(queryName: string, variables: Variables): void;

  /**
   * Configures the transport to use a local Data Connect emulator.
   * @param host The host address of the emulator (e.g., '127.0.0.1').
   * @param port The port number the emulator is listening on.
   * @param sslEnabled Whether to use SSL (HTTPS/WSS) for the emulator connection.
   */
  useEmulator(host: string, port?: number, sslEnabled?: boolean): void;

  /**
   * Callback invoked when the Firebase Auth token is refreshed or changed.
   * @param token The new access token or null if signed out.
   */
  onAuthTokenChanged: (token: string | null) => void;

  /**
   * Internal method to set the SDK type for metrics and logging purposes.
   * @param callerSdkType The type of SDK making the call (e.g., generated vs base).
   */
  _setCallerSdkType(callerSdkType: CallerSdkType): void;
}

/**
 * @internal
 */
export type TransportClass = new (
  options: DataConnectOptions,
  apiKey?: string,
  appId?: string,
  authProvider?: AuthTokenProvider,
  appCheckProvider?: AppCheckTokenProvider,
  transportOptions?: TransportOptions,
  _isUsingGen?: boolean,
  _callerSdkType?: CallerSdkType
) => DataConnectTransport;

/**
 * @internal
 */
export abstract class DataConnectTransportClass
  implements DataConnectTransport
{
  protected _host = '';
  protected _port: number | undefined;
  protected _location = 'l';
  protected _connectorName = '';
  protected _secure = true;
  /** false by default. implementation will set to true if supported */
  protected _streamIsSupported = false;
  protected _project = 'p';
  protected _serviceName: string;
  protected _accessToken: string | null = null;
  protected _appCheckToken: string | null | undefined = null;
  protected _lastToken: string | null = null;
  protected _isUsingEmulator = false;

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
      this.onAuthTokenChanged(token);
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
      {
        host: this._host,
        sslEnabled: this._secure,
        streamEnabled: this._streamIsSupported,
        port: this._port
      }
    );
  }

  useEmulator(host: string, port?: number, isSecure?: boolean): void {
    this._host = host;
    this._isUsingEmulator = true;
    if (typeof port === 'number') {
      this._port = port;
    }
    if (typeof isSecure !== 'undefined') {
      this._secure = isSecure;
    }
  }

  async getWithAuth(forceToken = false): Promise<string | null> {
    let starterPromise: Promise<string | null> = new Promise(resolve =>
      resolve(this._accessToken)
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
          this._accessToken = data.accessToken;
          return this._accessToken;
        });
    } else {
      starterPromise = new Promise(resolve => resolve(''));
    }
    return starterPromise;
  }

  async withRetry<T>(
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

  _setLastToken(lastToken: string | null): void {
    this._lastToken = lastToken;
  }

  abstract invokeQuery<Data, Variables>(
    queryName: string,
    body?: Variables
  ): Promise<DataConnectResponse<Data>>;

  abstract invokeMutation<Data, Variables>(
    queryName: string,
    body?: Variables
  ): Promise<DataConnectResponse<Data>>;

  abstract invokeSubscribe<Data, Variables>(
    notifyQueryManager: SubscribeNotificationHook<Data>,
    queryName: string,
    body?: Variables
  ): void;

  abstract invokeUnsubscribe<Variables>(
    queryName: string,
    variables: Variables
  ): void;

  abstract onAuthTokenChanged(newToken: string | null): void;

  _setCallerSdkType(callerSdkType: CallerSdkType): void {
    this._callerSdkType = callerSdkType;
  }
}
