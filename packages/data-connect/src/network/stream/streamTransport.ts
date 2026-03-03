/**
 * @license
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Code, DataConnectError } from '../../core/error';
import {
  AbstractDataConnectTransport,
  DataConnectResponse,
  DataConnectResponseWithMaxAge,
  SubscribeNotificationHook
} from '../transport';

import { DataConnectStreamRequest } from './wire';

/**
 * The base class for all DataConnectStreamTransport implementations. Handles management of logical
 * streams (requests), authentication, data routing to query layer, etc. Concrete stream transport
 * implementations should extend this class and implement the abstract {@link DataConnectStreamTransportInterface} methods.
 * @internal
 */
export abstract class AbstractDataConnectStreamTransport extends AbstractDataConnectTransport {
  /**
   * Open a physical connection to the server.
   * @returns a promise which resolves when the connection is ready, or rejects if it fails to open.
   */
  protected abstract openConnection(): Promise<void>;

  /**
   * Close the physical connection with the server. Handles no cleanup - simply closes the
   * implementation-specific connection.
   * @returns a promise which resolves when the connection is ready, or rejects if it fails to open.
   */
  protected abstract closeConnection(): Promise<void>;

  /**
   * Queue a message to be sent over the stream.
   * @param requestBody The body of the message to be sent.
   * @throws DataConnectError if sending fails.
   */
  protected abstract sendMessage<Variables>(
    requestBody: DataConnectStreamRequest<Variables>
  ): void;

  invokeQuery<Data, Variables>(
    queryName: string,
    body?: Variables
  ): Promise<DataConnectResponseWithMaxAge<Data>> {
    throw new DataConnectError(Code.OTHER, 'Not yet implemented');
  }

  invokeMutation<Data, Variables>(
    queryName: string,
    body?: Variables
  ): Promise<DataConnectResponse<Data>> {
    throw new DataConnectError(Code.OTHER, 'Not yet implemented');
  }

  invokeSubscribe<Data, Variables>(
    notifyQueryManager: SubscribeNotificationHook<Data>,
    queryName: string,
    body?: Variables
  ): void {
    throw new DataConnectError(Code.OTHER, 'Not yet implemented');
  }

  invokeUnsubscribe<Variables>(queryName: string, body?: Variables): void {
    throw new DataConnectError(Code.OTHER, 'Not yet implemented');
  }

  onAuthTokenChanged(newToken: string | null): void {
    this._authToken = newToken;
  }
}
