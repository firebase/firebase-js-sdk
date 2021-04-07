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

import { assert } from '@firebase/util';

import { LONG_POLLING, WEBSOCKET } from '../realtime/Constants';

import { PersistentStorage } from './storage/storage';
import { each } from './util/util';

/**
 * A class that holds metadata about a Repo object
 */
export class RepoInfo {
  private _host: string;
  private _domain: string;
  internalHost: string;

  /**
   * @param host - Hostname portion of the url for the repo
   * @param secure - Whether or not this repo is accessed over ssl
   * @param namespace - The namespace represented by the repo
   * @param webSocketOnly - Whether to prefer websockets over all other transports (used by Nest).
   * @param nodeAdmin - Whether this instance uses Admin SDK credentials
   * @param persistenceKey - Override the default session persistence storage key
   */
  constructor(
    host: string,
    public readonly secure: boolean,
    public readonly namespace: string,
    public readonly webSocketOnly: boolean,
    public readonly nodeAdmin: boolean = false,
    public readonly persistenceKey: string = '',
    public readonly includeNamespaceInQueryParams: boolean = false
  ) {
    this._host = host.toLowerCase();
    this._domain = this._host.substr(this._host.indexOf('.') + 1);
    this.internalHost =
      (PersistentStorage.get('host:' + host) as string) || this._host;
  }

  isCacheableHost(): boolean {
    return this.internalHost.substr(0, 2) === 's-';
  }

  isCustomHost() {
    return (
      this._domain !== 'firebaseio.com' &&
      this._domain !== 'firebaseio-demo.com'
    );
  }

  get host() {
    return this._host;
  }

  set host(newHost: string) {
    if (newHost !== this.internalHost) {
      this.internalHost = newHost;
      if (this.isCacheableHost()) {
        PersistentStorage.set('host:' + this._host, this.internalHost);
      }
    }
  }

  toString(): string {
    let str = this.toURLString();
    if (this.persistenceKey) {
      str += '<' + this.persistenceKey + '>';
    }
    return str;
  }

  toURLString(): string {
    const protocol = this.secure ? 'https://' : 'http://';
    const query = this.includeNamespaceInQueryParams
      ? `?ns=${this.namespace}`
      : '';
    return `${protocol}${this.host}/${query}`;
  }
}

function repoInfoNeedsQueryParam(repoInfo: RepoInfo): boolean {
  return (
    repoInfo.host !== repoInfo.internalHost ||
    repoInfo.isCustomHost() ||
    repoInfo.includeNamespaceInQueryParams
  );
}

/**
 * Returns the websocket URL for this repo
 * @param repoInfo - RepoInfo object
 * @param type - of connection
 * @param params - list
 * @returns The URL for this repo
 */
export function repoInfoConnectionURL(
  repoInfo: RepoInfo,
  type: string,
  params: { [k: string]: string }
): string {
  assert(typeof type === 'string', 'typeof type must == string');
  assert(typeof params === 'object', 'typeof params must == object');

  let connURL: string;
  if (type === WEBSOCKET) {
    connURL =
      (repoInfo.secure ? 'wss://' : 'ws://') + repoInfo.internalHost + '/.ws?';
  } else if (type === LONG_POLLING) {
    connURL =
      (repoInfo.secure ? 'https://' : 'http://') +
      repoInfo.internalHost +
      '/.lp?';
  } else {
    throw new Error('Unknown connection type: ' + type);
  }
  if (repoInfoNeedsQueryParam(repoInfo)) {
    params['ns'] = repoInfo.namespace;
  }

  const pairs: string[] = [];

  each(params, (key: string, value: string) => {
    pairs.push(key + '=' + value);
  });

  return connURL + pairs.join('&');
}
