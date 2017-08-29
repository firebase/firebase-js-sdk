/**
* Copyright 2017 Google Inc.
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

import { RepoInfo } from '../core/RepoInfo';

export interface TransportConstructor {
  new (
    connId: string,
    repoInfo: RepoInfo,
    transportSessionId?: string,
    lastSessionId?: string
  ): Transport;
  isAvailable: () => boolean;
  responsesRequiredToBeHealthy?: number;
  healthyTimeout?: number;
}

export abstract class Transport {
  /**
   * Bytes received since connection started.
   * @type {number}
   */
  abstract bytesReceived: number;

  /**
   * Bytes sent since connection started.
   * @type {number}
   */
  abstract bytesSent: number;

  /**
   * An identifier for this connection, used for logging
   * @type {string}
   */
  abstract connId: string;

  /**
   *
   * @param {string} connId An identifier for this connection, used for logging
   * @param {RepoInfo} repoInfo The info for the endpoint to send data to.
   * @param {string=} transportSessionId Optional transportSessionId if this is connecting to an existing transport session
   * @param {string=} lastSessionId Optional lastSessionId if there was a previous connection
   * @interface
   */
  constructor(
    connId: string,
    repoInfo: RepoInfo,
    transportSessionId?: string,
    lastSessionId?: string
  ) {}

  /**
   * @param {function(Object)} onMessage Callback when messages arrive
   * @param {function()} onDisconnect Callback with connection lost.
   */
  abstract open(
    onMessage: (a: Object) => void,
    onDisconnect: (a?: boolean) => void
  ): void;

  abstract start(): void;

  abstract close(): void;

  /**
   * @param {!Object} data The JSON data to transmit
   */
  abstract send(data: Object): void;

  abstract markConnectionHealthy(): void;

  abstract markConnectionHealthy(): void;
}

export interface TransportConstructor {
  new (
    connId: string,
    RepoInfo,
    transportSessionId?: string,
    lastSessionId?: string
  );
}
