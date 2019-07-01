/**
 * @license
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

declare const MozWebSocket: any;

import { assert, CONSTANTS as ENV_CONSTANTS } from '@firebase/util';
import { logWrapper, splitStringBySize } from '../core/util/util';
import { StatsManager } from '../core/stats/StatsManager';
import {
  FORGE_DOMAIN,
  FORGE_REF,
  LAST_SESSION_PARAM,
  PROTOCOL_VERSION,
  REFERER_PARAM,
  TRANSPORT_SESSION_PARAM,
  VERSION_PARAM,
  WEBSOCKET
} from './Constants';
import { PersistentStorage } from '../core/storage/storage';
import { jsonEval, stringify } from '@firebase/util';
import { isNodeSdk } from '@firebase/util';
import { Transport } from './Transport';
import { StatsCollection } from '../core/stats/StatsCollection';
import { SDK_VERSION } from '../core/version';

const WEBSOCKET_MAX_FRAME_SIZE = 16384;
const WEBSOCKET_KEEPALIVE_INTERVAL = 45000;

let WebSocketImpl = null;
if (typeof MozWebSocket !== 'undefined') {
  WebSocketImpl = MozWebSocket;
} else if (typeof WebSocket !== 'undefined') {
  WebSocketImpl = WebSocket;
}

export function setWebSocketImpl(impl) {
  WebSocketImpl = impl;
}

/**
 * Create a new websocket connection with the given callbacks.
 * @constructor
 * @implements {Transport}
 */
export class WebSocketConnection implements Transport {
  keepaliveTimer: number | null = null;
  frames: string[] | null = null;
  totalFrames = 0;
  bytesSent = 0;
  bytesReceived = 0;
  connURL: string;
  onDisconnect: (a?: boolean) => void;
  onMessage: (msg: Object) => void;
  mySock: any | null;
  private log_: (...a: any[]) => void;
  private stats_: StatsCollection;
  private everConnected_: boolean;
  private isClosed_: boolean;

  /**
   * @param {string} connId identifier for this transport
   * @param {RepoInfo} repoInfo The info for the websocket endpoint.
   * @param {string=} transportSessionId Optional transportSessionId if this is connecting to an existing transport
   *                                         session
   * @param {string=} lastSessionId Optional lastSessionId if there was a previous connection
   */
  constructor(
    public connId: string,
    repoInfo: RepoInfo,
    transportSessionId?: string,
    lastSessionId?: string
  ) {
    this.log_ = logWrapper(this.connId);
    this.stats_ = StatsManager.getCollection(repoInfo);
    this.connURL = WebSocketConnection.connectionURL_(
      repoInfo,
      transportSessionId,
      lastSessionId
    );
  }

  /**
   * @param {RepoInfo} repoInfo The info for the websocket endpoint.
   * @param {string=} transportSessionId Optional transportSessionId if this is connecting to an existing transport
   *                                         session
   * @param {string=} lastSessionId Optional lastSessionId if there was a previous connection
   * @return {string} connection url
   * @private
   */
  private static connectionURL_(
    repoInfo: RepoInfo,
    transportSessionId?: string,
    lastSessionId?: string
  ): string {
    const urlParams: { [k: string]: string } = {};
    urlParams[VERSION_PARAM] = PROTOCOL_VERSION;

    if (
      !isNodeSdk() &&
      typeof location !== 'undefined' &&
      location.href &&
      location.href.indexOf(FORGE_DOMAIN) !== -1
    ) {
      urlParams[REFERER_PARAM] = FORGE_REF;
    }
    if (transportSessionId) {
      urlParams[TRANSPORT_SESSION_PARAM] = transportSessionId;
    }
    if (lastSessionId) {
      urlParams[LAST_SESSION_PARAM] = lastSessionId;
    }
    return repoInfo.connectionURL(WEBSOCKET, urlParams);
  }

  /**
   *
   * @param onMessage Callback when messages arrive
   * @param onDisconnect Callback with connection lost.
   */
  open(onMessage: (msg: Object) => void, onDisconnect: (a?: boolean) => void) {
    this.onDisconnect = onDisconnect;
    this.onMessage = onMessage;

    this.log_('Websocket connecting to ' + this.connURL);

    this.everConnected_ = false;
    // Assume failure until proven otherwise.
    PersistentStorage.set('previous_websocket_failure', true);

    try {
      if (isNodeSdk()) {
        const device = ENV_CONSTANTS.NODE_ADMIN ? 'AdminNode' : 'Node';
        // UA Format: Firebase/<wire_protocol>/<sdk_version>/<platform>/<device>
        const options: { [k: string]: object } = {
          headers: {
            'User-Agent': `Firebase/${PROTOCOL_VERSION}/${SDK_VERSION}/${
              process.platform
            }/${device}`
          }
        };

        // Plumb appropriate http_proxy environment variable into faye-websocket if it exists.
        const env = process['env'];
        const proxy =
          this.connURL.indexOf('wss://') == 0
            ? env['HTTPS_PROXY'] || env['https_proxy']
            : env['HTTP_PROXY'] || env['http_proxy'];

        if (proxy) {
          options['proxy'] = { origin: proxy };
        }

        this.mySock = new WebSocketImpl(this.connURL, [], options);
      } else {
        this.mySock = new WebSocketImpl(this.connURL);
      }
    } catch (e) {
      this.log_('Error instantiating WebSocket.');
      const error = e.message || e.data;
      if (error) {
        this.log_(error);
      }
      this.onClosed_();
      return;
    }

    this.mySock.onopen = () => {
      this.log_('Websocket connected.');
      this.everConnected_ = true;
    };

    this.mySock.onclose = () => {
      this.log_('Websocket connection was disconnected.');
      this.mySock = null;
      this.onClosed_();
    };

    this.mySock.onmessage = (m: object) => {
      this.handleIncomingFrame(m);
    };

    this.mySock.onerror = (e: any) => {
      this.log_('WebSocket error.  Closing connection.');
      const error = e.message || e.data;
      if (error) {
        this.log_(error);
      }
      this.onClosed_();
    };
  }

  /**
   * No-op for websockets, we don't need to do anything once the connection is confirmed as open
   */
  start() {}

  static forceDisallow_: Boolean;

  static forceDisallow() {
    WebSocketConnection.forceDisallow_ = true;
  }

  static isAvailable(): boolean {
    let isOldAndroid = false;
    if (typeof navigator !== 'undefined' && navigator.userAgent) {
      const oldAndroidRegex = /Android ([0-9]{0,}\.[0-9]{0,})/;
      const oldAndroidMatch = navigator.userAgent.match(oldAndroidRegex);
      if (oldAndroidMatch && oldAndroidMatch.length > 1) {
        if (parseFloat(oldAndroidMatch[1]) < 4.4) {
          isOldAndroid = true;
        }
      }
    }

    return (
      !isOldAndroid &&
      WebSocketImpl !== null &&
      !WebSocketConnection.forceDisallow_
    );
  }

  /**
   * Number of response before we consider the connection "healthy."
   * @type {number}
   */
  static responsesRequiredToBeHealthy = 2;

  /**
   * Time to wait for the connection te become healthy before giving up.
   * @type {number}
   */
  static healthyTimeout = 30000;

  /**
   * Returns true if we previously failed to connect with this transport.
   * @return {boolean}
   */
  static previouslyFailed(): boolean {
    // If our persistent storage is actually only in-memory storage,
    // we default to assuming that it previously failed to be safe.
    return (
      PersistentStorage.isInMemoryStorage ||
      PersistentStorage.get('previous_websocket_failure') === true
    );
  }

  markConnectionHealthy() {
    PersistentStorage.remove('previous_websocket_failure');
  }

  private appendFrame_(data: string) {
    this.frames.push(data);
    if (this.frames.length == this.totalFrames) {
      const fullMess = this.frames.join('');
      this.frames = null;
      const jsonMess = jsonEval(fullMess) as object;

      //handle the message
      this.onMessage(jsonMess);
    }
  }

  /**
   * @param {number} frameCount The number of frames we are expecting from the server
   * @private
   */
  private handleNewFrameCount_(frameCount: number) {
    this.totalFrames = frameCount;
    this.frames = [];
  }

  /**
   * Attempts to parse a frame count out of some text. If it can't, assumes a value of 1
   * @param {!String} data
   * @return {?String} Any remaining data to be process, or null if there is none
   * @private
   */
  private extractFrameCount_(data: string): string | null {
    assert(this.frames === null, 'We already have a frame buffer');
    // TODO: The server is only supposed to send up to 9999 frames (i.e. length <= 4), but that isn't being enforced
    // currently.  So allowing larger frame counts (length <= 6).  See https://app.asana.com/0/search/8688598998380/8237608042508
    if (data.length <= 6) {
      const frameCount = Number(data);
      if (!isNaN(frameCount)) {
        this.handleNewFrameCount_(frameCount);
        return null;
      }
    }
    this.handleNewFrameCount_(1);
    return data;
  }

  /**
   * Process a websocket frame that has arrived from the server.
   * @param mess The frame data
   */
  handleIncomingFrame(mess: { [k: string]: any }) {
    if (this.mySock === null) return; // Chrome apparently delivers incoming packets even after we .close() the connection sometimes.
    const data = mess['data'] as string;
    this.bytesReceived += data.length;
    this.stats_.incrementCounter('bytes_received', data.length);

    this.resetKeepAlive();

    if (this.frames !== null) {
      // we're buffering
      this.appendFrame_(data);
    } else {
      // try to parse out a frame count, otherwise, assume 1 and process it
      const remainingData = this.extractFrameCount_(data);
      if (remainingData !== null) {
        this.appendFrame_(remainingData);
      }
    }
  }

  /**
   * Send a message to the server
   * @param {Object} data The JSON object to transmit
   */
  send(data: Object) {
    this.resetKeepAlive();

    const dataStr = stringify(data);
    this.bytesSent += dataStr.length;
    this.stats_.incrementCounter('bytes_sent', dataStr.length);

    //We can only fit a certain amount in each websocket frame, so we need to split this request
    //up into multiple pieces if it doesn't fit in one request.

    const dataSegs = splitStringBySize(dataStr, WEBSOCKET_MAX_FRAME_SIZE);

    //Send the length header
    if (dataSegs.length > 1) {
      this.sendString_(String(dataSegs.length));
    }

    //Send the actual data in segments.
    for (let i = 0; i < dataSegs.length; i++) {
      this.sendString_(dataSegs[i]);
    }
  }

  private shutdown_() {
    this.isClosed_ = true;
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }

    if (this.mySock) {
      this.mySock.close();
      this.mySock = null;
    }
  }

  private onClosed_() {
    if (!this.isClosed_) {
      this.log_('WebSocket is closing itself');
      this.shutdown_();

      // since this is an internal close, trigger the close listener
      if (this.onDisconnect) {
        this.onDisconnect(this.everConnected_);
        this.onDisconnect = null;
      }
    }
  }

  /**
   * External-facing close handler.
   * Close the websocket and kill the connection.
   */
  close() {
    if (!this.isClosed_) {
      this.log_('WebSocket is being closed');
      this.shutdown_();
    }
  }

  /**
   * Kill the current keepalive timer and start a new one, to ensure that it always fires N seconds after
   * the last activity.
   */
  resetKeepAlive() {
    clearInterval(this.keepaliveTimer);
    this.keepaliveTimer = setInterval(() => {
      //If there has been no websocket activity for a while, send a no-op
      if (this.mySock) {
        this.sendString_('0');
      }
      this.resetKeepAlive();
    }, Math.floor(WEBSOCKET_KEEPALIVE_INTERVAL)) as any;
  }

  /**
   * Send a string over the websocket.
   *
   * @param {string} str String to send.
   * @private
   */
  private sendString_(str: string) {
    // Firefox seems to sometimes throw exceptions (NS_ERROR_UNEXPECTED) from websocket .send()
    // calls for some unknown reason.  We treat these as an error and disconnect.
    // See https://app.asana.com/0/58926111402292/68021340250410
    try {
      this.mySock.send(str);
    } catch (e) {
      this.log_(
        'Exception thrown from WebSocket.send():',
        e.message || e.data,
        'Closing connection.'
      );
      setTimeout(this.onClosed_.bind(this), 0);
    }
  }
}
