/**
 * @license
 * Copyright 2017 Google LLC
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
import { warn } from '../core/util/util';

import { BrowserPollConnection } from './BrowserPollConnection';
import { TransportConstructor } from './Transport';
import { WebSocketConnection } from './WebSocketConnection';

/**
 * Currently simplistic, this class manages what transport a Connection should use at various stages of its
 * lifecycle.
 *
 * It starts with longpolling in a browser, and httppolling on node. It then upgrades to websockets if
 * they are available.
 */
export class TransportManager {
  private transports_: TransportConstructor[];

  static get ALL_TRANSPORTS() {
    return [BrowserPollConnection, WebSocketConnection];
  }

  /**
   * @param repoInfo - Metadata around the namespace we're connecting to
   */
  constructor(repoInfo: RepoInfo) {
    this.initTransports_(repoInfo);
  }

  private initTransports_(repoInfo: RepoInfo) {
    const isWebSocketsAvailable: boolean =
      WebSocketConnection && WebSocketConnection['isAvailable']();
    let isSkipPollConnection =
      isWebSocketsAvailable && !WebSocketConnection.previouslyFailed();

    if (repoInfo.webSocketOnly) {
      if (!isWebSocketsAvailable) {
        warn(
          "wss:// URL used, but browser isn't known to support websockets.  Trying anyway."
        );
      }

      isSkipPollConnection = true;
    }

    if (isSkipPollConnection) {
      this.transports_ = [WebSocketConnection];
    } else {
      const transports = (this.transports_ = [] as TransportConstructor[]);
      for (const transport of TransportManager.ALL_TRANSPORTS) {
        if (transport && transport['isAvailable']()) {
          transports.push(transport);
        }
      }
    }
  }

  /**
   * @returns The constructor for the initial transport to use
   */
  initialTransport(): TransportConstructor {
    if (this.transports_.length > 0) {
      return this.transports_[0];
    } else {
      throw new Error('No transports available');
    }
  }

  /**
   * @returns The constructor for the next transport, or null
   */
  upgradeTransport(): TransportConstructor | null {
    if (this.transports_.length > 1) {
      return this.transports_[1];
    } else {
      return null;
    }
  }
}
