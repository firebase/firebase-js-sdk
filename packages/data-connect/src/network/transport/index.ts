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
import { AuthTokenProvider } from '../../core/FirebaseAuthProvider';

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

export interface DataConnectResponse<T> {
  data: T;
  errors: Error[];
  extensions: DataConnectExtensions;
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
