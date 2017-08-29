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

import { assert } from '@firebase/util';
import { forEach } from '@firebase/util';
import { PersistentStorage } from './storage/storage';
import { LONG_POLLING, WEBSOCKET } from '../realtime/Constants';

/**
 * A class that holds metadata about a Repo object
 *
 * @constructor
 */
export class RepoInfo {
  host: string;
  domain: string;
  internalHost: string;

  /**
   * @param {string} host Hostname portion of the url for the repo
   * @param {boolean} secure Whether or not this repo is accessed over ssl
   * @param {string} namespace The namespace represented by the repo
   * @param {boolean} webSocketOnly Whether to prefer websockets over all other transports (used by Nest).
   * @param {string=} persistenceKey Override the default session persistence storage key
   */
  constructor(
    host: string,
    public secure: boolean,
    public namespace: string,
    public webSocketOnly: boolean,
    public persistenceKey: string = ''
  ) {
    this.host = host.toLowerCase();
    this.domain = this.host.substr(this.host.indexOf('.') + 1);
    this.internalHost = PersistentStorage.get('host:' + host) || this.host;
  }

  needsQueryParam(): boolean {
    return this.host !== this.internalHost;
  }

  isCacheableHost(): boolean {
    return this.internalHost.substr(0, 2) === 's-';
  }

  isDemoHost() {
    return this.domain === 'firebaseio-demo.com';
  }

  isCustomHost() {
    return (
      this.domain !== 'firebaseio.com' && this.domain !== 'firebaseio-demo.com'
    );
  }

  updateHost(newHost: string) {
    if (newHost !== this.internalHost) {
      this.internalHost = newHost;
      if (this.isCacheableHost()) {
        PersistentStorage.set('host:' + this.host, this.internalHost);
      }
    }
  }

  /**
   * Returns the websocket URL for this repo
   * @param {string} type of connection
   * @param {Object} params list
   * @return {string} The URL for this repo
   */
  connectionURL(type: string, params: { [k: string]: string }): string {
    assert(typeof type === 'string', 'typeof type must == string');
    assert(typeof params === 'object', 'typeof params must == object');

    let connURL: string;
    if (type === WEBSOCKET) {
      connURL =
        (this.secure ? 'wss://' : 'ws://') + this.internalHost + '/.ws?';
    } else if (type === LONG_POLLING) {
      connURL =
        (this.secure ? 'https://' : 'http://') + this.internalHost + '/.lp?';
    } else {
      throw new Error('Unknown connection type: ' + type);
    }
    if (this.needsQueryParam()) {
      params['ns'] = this.namespace;
    }

    const pairs: string[] = [];

    forEach(params, (key: string, value: string) => {
      pairs.push(key + '=' + value);
    });

    return connURL + pairs.join('&');
  }

  /** @return {string} */
  toString(): string {
    let str = this.toURLString();
    if (this.persistenceKey) {
      str += '<' + this.persistenceKey + '>';
    }
    return str;
  }

  /** @return {string} */
  toURLString(): string {
    return (this.secure ? 'https://' : 'http://') + this.host;
  }
}
