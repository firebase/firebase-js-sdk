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
import { AppCheckTokenProvider } from '../../core/AppCheckTokenProvider';
import { Code, DataConnectError } from '../../core/error';
import { AuthTokenProvider } from '../../core/FirebaseAuthProvider';
import { logDebug } from '../../logger';
import { urlBuilder } from '../../util/url';

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

export interface DataConnectResponse<Data> {
  data: Data;
  errors: Error[];
  extensions: DataConnectExtensions;
}

export interface DataConnectStreamResponse<Data> {
  requestId: string;
  data: Data;
  dataEtag: string; // TODO: actually a hash
  errors: Error[];
  cancelled: boolean;
}

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
   * Subscribes to a query to receive updates over a stream.
   * @param queryName The name of the query to subscribe to.
   * @param body The variables associated with the subscription.
   */
  invokeSubscription<Variables>(queryName: string, body?: Variables): void;

  /**
   * Unsubscribes from an active subscription.
   * @param queryName The name of the query to unsubscribe from.
   * @param body The variables associated with the subscription.
   */
  invokeUnsubscription<Variables>(
    queryName: string,
    variables: Variables
  ): void;

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
  onTokenChanged: (token: string | null) => void;

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
  protected _stream = true; // TODO: make this dynamic
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
      {
        host: this._host,
        sslEnabled: this._secure,
        streamEnabled: this._stream,
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

  abstract invokeSubscription<Variables>(
    queryName: string,
    body?: Variables
  ): void;

  abstract invokeUnsubscription<Variables>(
    queryName: string,
    variables: Variables
  ): void;

  abstract onTokenChanged(newToken: string | null): void;

  _setCallerSdkType(callerSdkType: CallerSdkType): void {
    this._callerSdkType = callerSdkType;
  }
}

/**
 * Base interface for stream request payloads sent over the stream to the server.
 */
interface StreamRequest {
  name: string; // connectorResourcePath
  requestId: string;
  authToken?: string; // TODO: type
  dataEtag?: string; // TODO: type
}

/**
 * Fields for an execute request payload.
 * @internal
 */
interface ExecuteRequestKind<Variables> {
  operationName: string;
  variables?: Variables;
}

/**
 * Fields for a resume request payload.
 * @internal
 */
interface ResumeRequestKind {}

/**
 * Fields for a cancel request payload.
 * @internal
 */
interface CancelRequestKind {}

/**
 * Fields for a subscribe request payload.
 * @internal
 */
export interface SubscribeStreamRequest<Variables> extends StreamRequest {
  subscribe: ExecuteRequestKind<Variables>;
  execute?: never;
  resume?: never;
  cancel?: never;
}

/**
 * Fields for an execute request payload.
 * @internal
 */
export interface ExecuteStreamRequest<Variables> extends StreamRequest {
  execute: ExecuteRequestKind<Variables>;
  subscribe?: never;
  resume?: never;
  cancel?: never;
}

/**
 * Fields for a cancel request payload.
 * @internal
 */
export interface ResumeStreamRequest extends StreamRequest {
  resume?: ResumeRequestKind;
  subscribe?: never;
  execute?: never;
  cancel?: never;
}

/**
 * Fields for a cancel (unsubscribe) request payload.
 * @internal
 */
export interface CancelStreamRequest extends StreamRequest {
  cancel: CancelRequestKind;
  subscribe?: never;
  execute?: never;
  resume?: never;
}

/**
 * Shape of the request body to be sent over the stream to the server.
 * @internal
 */
export type DataConnectStreamRequest<Variables> =
  | ExecuteStreamRequest<Variables>
  | SubscribeStreamRequest<Variables>
  | ResumeStreamRequest
  | CancelStreamRequest;
