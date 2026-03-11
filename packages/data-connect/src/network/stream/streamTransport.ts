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
  SubscribeNotificationHook,
  getGoogApiClientValue
} from '../transport';

import { DataConnectStreamRequest, StreamRequestHeaders } from './wire';

/** The request id of the first request over the stream */
const FIRST_REQUEST_ID = 1;

/**
 * The base class for all DataConnectStreamTransport implementations. Handles management of logical
 * streams (requests), authentication, data routing to query layer, etc.
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

  /** The request ID of the next message to be sent. Monotonically increasing sequence number. */
  private _requestNumber = FIRST_REQUEST_ID;
  /**
   * Generates and returns the next request ID.
   */
  private _nextRequestId(): string {
    return (this._requestNumber++).toString();
  }

  /**
   * Tracks if the next message to be sent is the first message of the stream.
   */
  private _isFirstStreamMessage = true;
  /**
   * Tracks the last auth token sent to the server.
   * Used to detect if the token has changed and needs to be resent.
   */
  private _lastSentAuthToken: string | null = null;
  /**
   * Indicates whether we should include the auth token in the next message.
   * Only true if there is an auth token and it is different from the last sent auth token, or this
   * is the first message.
   */
  private get _shouldIncludeAuth(): boolean {
    return (
      this._isFirstStreamMessage ||
      (!!this._authToken && this._authToken !== this._lastSentAuthToken)
    );
  }
  /**
   * The resource path for requests from this Data Connect instance. Used in the opening request of
   * the stream.
   */
  get connectorResourcePath(): string {
    return `projects/${this._project}/locations/${this._location}/services/${this._serviceName}/connectors/${this._connectorName}`;
  }

  /**
   * Called by the concrete transport implementation when the physical connection is ready.
   */
  protected onConnectionReady(): void {
    this._isFirstStreamMessage = true;
    this._lastSentAuthToken = null;
  }

  /**
   * Prepares a stream request by adding necessary headers and metadata.
   * If this is the first message on the stream, it includes the resource name, auth token, and App Check token.
   * If the auth token has changed since the last message, it includes the new auth token.
   * @returns the requestBody, with attached headers and initial request fields
   */
  private _prepareMessage<
    Variables,
    StreamBody extends DataConnectStreamRequest<Variables>
  >(requestBody: StreamBody): StreamBody {
    const preparedRequestBody: StreamBody = { ...requestBody };
    const headers: StreamRequestHeaders = {};
    if (this.appId) {
      headers['x-firebase-gmpid'] = this.appId;
    }
    headers['X-Goog-Api-Client'] = getGoogApiClientValue(
      this._isUsingGen,
      this._callerSdkType
    );
    if (this._shouldIncludeAuth && this._authToken) {
      headers.authToken = this._authToken;
      this._lastSentAuthToken = this._authToken;
    }
    if (this._isFirstStreamMessage) {
      if (this._appCheckToken) {
        headers.appCheckToken = this._appCheckToken;
      }
      preparedRequestBody.name = this.connectorResourcePath;
    }
    preparedRequestBody.headers = headers;
    this._isFirstStreamMessage = false;
    return preparedRequestBody;
  }

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
