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

import { Query } from '../api/Query';

/**
 * Interface defining the set of actions that can be performed against the Firebase server
 * (basically corresponds to our wire protocol).
 *
 * @interface
 */
export abstract class ServerActions {
  /**
   * @param {!Query} query
   * @param {function():string} currentHashFn
   * @param {?number} tag
   * @param {function(string, *)} onComplete
   */
  abstract listen(
    query: Query,
    currentHashFn: () => string,
    tag: number | null,
    onComplete: (a: string, b: any) => void
  ): void;

  /**
   * Remove a listen.
   *
   * @param {!Query} query
   * @param {?number} tag
   */
  abstract unlisten(query: Query, tag: number | null): void;

  /**
   * @param {string} pathString
   * @param {*} data
   * @param {function(string, string)=} onComplete
   * @param {string=} hash
   */
  put(
    pathString: string,
    data: any,
    onComplete?: (a: string, b: string) => void,
    hash?: string
  ) {}

  /**
   * @param {string} pathString
   * @param {*} data
   * @param {function(string, ?string)} onComplete
   * @param {string=} hash
   */
  merge(
    pathString: string,
    data: any,
    onComplete: (a: string, b: string | null) => void,
    hash?: string
  ) {}

  /**
   * Refreshes the auth token for the current connection.
   * @param {string} token The authentication token
   */
  refreshAuthToken(token: string) {}

  /**
   * @param {string} pathString
   * @param {*} data
   * @param {function(string, string)=} onComplete
   */
  onDisconnectPut(
    pathString: string,
    data: any,
    onComplete?: (a: string, b: string) => void
  ) {}

  /**
   * @param {string} pathString
   * @param {*} data
   * @param {function(string, string)=} onComplete
   */
  onDisconnectMerge(
    pathString: string,
    data: any,
    onComplete?: (a: string, b: string) => void
  ) {}

  /**
   * @param {string} pathString
   * @param {function(string, string)=} onComplete
   */
  onDisconnectCancel(
    pathString: string,
    onComplete?: (a: string, b: string) => void
  ) {}

  /**
   * @param {Object.<string, *>} stats
   */
  reportStats(stats: { [k: string]: any }) {}
}
