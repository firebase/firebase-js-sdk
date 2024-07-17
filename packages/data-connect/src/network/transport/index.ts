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

// Change this to only specify specific args.
export interface DataConnectTransport {
  invokeQuery<T, U>(
    queryName: string,
    body?: U
  ): PromiseLike<{ data: T; errors: Error[] }>;
  invokeMutation<T, U>(
    queryName: string,
    body?: U
  ): PromiseLike<{ data: T; errors: Error[] }>;
  useEmulator(host: string, port?: number, sslEnabled?: boolean): void;
  onTokenChanged: (token: string | null) => void;
}

export interface CancellableOperation<T> extends PromiseLike<{ data: T }> {
  cancel: () => void;
}

export interface QueryResponse<T> extends CancellableOperation<T> {}
// export type QueryResponse<T> = {
//     //   Type '{ data: T; }' is not assignable to type 'T'.
//      then: (a: (data: T) => void) => void;
// }
export interface MutationResponse<T> extends CancellableOperation<T> {}

export interface Sender<T> {
  abort: () => void;
  send: () => Promise<T>;
}

export type TransportClass = new (
  options: DataConnectOptions,
  apiKey?: string,
  authProvider?: AuthTokenProvider,
  appCheckProvider?: AppCheckTokenProvider,
  transportOptions?: TransportOptions
) => DataConnectTransport;
export * from '../../core/FirebaseAuthProvider';
