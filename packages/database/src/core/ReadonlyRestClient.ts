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

import { assert, jsonEval, safeGet, querystring } from '@firebase/util';
import { logWrapper, warn } from './util/util';

import { ServerActions } from './ServerActions';
import { RepoInfo } from './RepoInfo';
import { AuthTokenProvider } from './AuthTokenProvider';
import { Query } from '../api/Query';

/**
 * An implementation of ServerActions that communicates with the server via REST requests.
 * This is mostly useful for compatibility with crawlers, where we don't want to spin up a full
 * persistent connection (using WebSockets or long-polling)
 */
export class ReadonlyRestClient extends ServerActions {
  reportStats(stats: { [k: string]: unknown }): void {
    throw new Error('Method not implemented.');
  }

  /** @private {function(...[*])} */
  private log_: (...args: unknown[]) => void = logWrapper('p:rest:');

  /**
   * We don't actually need to track listens, except to prevent us calling an onComplete for a listen
   * that's been removed. :-/
   *
   * @private {!Object.<string, !Object>}
   */
  private listens_: { [k: string]: object } = {};

  /**
   * @param {!Query} query
   * @param {?number=} tag
   * @return {string}
   * @private
   */
  static getListenId_(query: Query, tag?: number | null): string {
    if (tag !== undefined) {
      return 'tag$' + tag;
    } else {
      assert(
        query.getQueryParams().isDefault(),
        "should have a tag if it's not a default query."
      );
      return query.path.toString();
    }
  }

  /**
   * @param {!RepoInfo} repoInfo_ Data about the namespace we are connecting to
   * @param {function(string, *, boolean, ?number)} onDataUpdate_ A callback for new data from the server
   * @param {AuthTokenProvider} authTokenProvider_
   * @implements {ServerActions}
   */
  constructor(
    private repoInfo_: RepoInfo,
    private onDataUpdate_: (
      a: string,
      b: unknown,
      c: boolean,
      d: number | null
    ) => void,
    private authTokenProvider_: AuthTokenProvider
  ) {
    super();
  }

  /** @inheritDoc */
  listen(
    query: Query,
    currentHashFn: () => string,
    tag: number | null,
    onComplete: (a: string, b: unknown) => void
  ) {
    const pathString = query.path.toString();
    this.log_(
      'Listen called for ' + pathString + ' ' + query.queryIdentifier()
    );

    // Mark this listener so we can tell if it's removed.
    const listenId = ReadonlyRestClient.getListenId_(query, tag);
    const thisListen = {};
    this.listens_[listenId] = thisListen;

    const queryStringParameters = query
      .getQueryParams()
      .toRestQueryStringParameters();

    this.restRequest_(
      pathString + '.json',
      queryStringParameters,
      (error, result) => {
        let data = result;

        if (error === 404) {
          data = null;
          error = null;
        }

        if (error === null) {
          this.onDataUpdate_(pathString, data, /*isMerge=*/ false, tag);
        }

        if (safeGet(this.listens_, listenId) === thisListen) {
          let status;
          if (!error) {
            status = 'ok';
          } else if (error === 401) {
            status = 'permission_denied';
          } else {
            status = 'rest_error:' + error;
          }

          onComplete(status, null);
        }
      }
    );
  }

  /** @inheritDoc */
  unlisten(query: Query, tag: number | null) {
    const listenId = ReadonlyRestClient.getListenId_(query, tag);
    delete this.listens_[listenId];
  }

  /** @inheritDoc */
  refreshAuthToken(token: string) {
    // no-op since we just always call getToken.
  }

  /**
   * Performs a REST request to the given path, with the provided query string parameters,
   * and any auth credentials we have.
   *
   * @param {!string} pathString
   * @param {!Object.<string, *>} queryStringParameters
   * @param {?function(?number, *=)} callback
   * @private
   */
  private restRequest_(
    pathString: string,
    queryStringParameters: { [k: string]: string | number } = {},
    callback: ((a: number | null, b?: unknown) => void) | null
  ) {
    queryStringParameters['format'] = 'export';

    this.authTokenProvider_
      .getToken(/*forceRefresh=*/ false)
      .then(authTokenData => {
        const authToken = authTokenData && authTokenData.accessToken;
        if (authToken) {
          queryStringParameters['auth'] = authToken;
        }

        const url =
          (this.repoInfo_.secure ? 'https://' : 'http://') +
          this.repoInfo_.host +
          pathString +
          '?' +
          'ns=' +
          this.repoInfo_.namespace +
          querystring(queryStringParameters);

        this.log_('Sending REST request for ' + url);
        const xhr = new XMLHttpRequest();
        xhr.onreadystatechange = () => {
          if (callback && xhr.readyState === 4) {
            this.log_(
              'REST Response for ' + url + ' received. status:',
              xhr.status,
              'response:',
              xhr.responseText
            );
            let res = null;
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                res = jsonEval(xhr.responseText);
              } catch (e) {
                warn(
                  'Failed to parse JSON response for ' +
                    url +
                    ': ' +
                    xhr.responseText
                );
              }
              callback(null, res);
            } else {
              // 401 and 404 are expected.
              if (xhr.status !== 401 && xhr.status !== 404) {
                warn(
                  'Got unsuccessful REST response for ' +
                    url +
                    ' Status: ' +
                    xhr.status
                );
              }
              callback(xhr.status);
            }
            callback = null;
          }
        };

        xhr.open('GET', url, /*asynchronous=*/ true);
        xhr.send();
      });
  }
}
