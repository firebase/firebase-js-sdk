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

import { assert, safeGet } from '@firebase/util';

import { AppCheckTokenProvider } from './AppCheckTokenProvider';
import { AuthTokenProvider } from './AuthTokenProvider';
import { RepoInfo } from './RepoInfo';
import { ServerActions } from './ServerActions';
import { logWrapper, warn } from './util/util';
import { QueryContext } from './view/EventRegistration';
import { queryParamsToRestQueryStringParameters } from './view/QueryParams';

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
   */
  private listens_: { [k: string]: object } = {};

  static getListenId_(query: QueryContext, tag?: number | null): string {
    if (tag !== undefined) {
      return 'tag$' + tag;
    } else {
      assert(
        query._queryParams.isDefault(),
        "should have a tag if it's not a default query."
      );
      return query._path.toString();
    }
  }

  /**
   * @param repoInfo_ - Data about the namespace we are connecting to
   * @param onDataUpdate_ - A callback for new data from the server
   */
  constructor(
    private repoInfo_: RepoInfo,
    private onDataUpdate_: (
      a: string,
      b: unknown,
      c: boolean,
      d: number | null
    ) => void,
    private authTokenProvider_: AuthTokenProvider,
    private appCheckTokenProvider_: AppCheckTokenProvider
  ) {
    super();
  }

  /** @inheritDoc */
  async listen(
    query: QueryContext,
    currentHashFn: () => string,
    tag: number | null,
    onComplete: (a: string, b: unknown) => void
  ) {
    const pathString = query._path.toString();
    this.log_('Listen called for ' + pathString + ' ' + query._queryIdentifier);

    // Mark this listener so we can tell if it's removed.
    const listenId = ReadonlyRestClient.getListenId_(query, tag);
    const thisListen = {};
    this.listens_[listenId] = thisListen;

    const queryStringParameters = queryParamsToRestQueryStringParameters(
      query._queryParams
    );

    let [response, data] = await this.restRequest_(
      pathString + '.json',
      queryStringParameters
    );

    let error = response.status;

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

  /** @inheritDoc */
  unlisten(query: QueryContext, tag: number | null) {
    const listenId = ReadonlyRestClient.getListenId_(query, tag);
    delete this.listens_[listenId];
  }

  async get(query: QueryContext): Promise<string> {
    const queryStringParameters = queryParamsToRestQueryStringParameters(
      query._queryParams
    );

    const pathString = query._path.toString();

    let [response, data] = await this.restRequest_(
      pathString + '.json',
      queryStringParameters
    );

    if (response.status === 404) {
      data = null;
    } else if (!response.ok) {
      throw new Error(data as string);
    }

    this.onDataUpdate_(pathString, data, /*isMerge=*/ false, /*tag=*/ null);
    return data as string;
  }

  /** @inheritDoc */
  refreshAuthToken(token: string) {
    // no-op since we just always call getToken.
  }

  /**
   * Performs a REST request to the given path, with the provided query string parameters,
   * and any auth credentials we have.
   */
  private async restRequest_<T = unknown>(
    pathString: string,
    queryStringParameters: Record<string, string | number> = {}
  ): Promise<[Response, T | null]> {
    // Fetch tokens
    const [authToken, appCheckToken] = await Promise.all([
      this.authTokenProvider_.getToken(/*forceRefresh=*/ false),
      this.appCheckTokenProvider_.getToken(/*forceRefresh=*/ false)
    ]);

    // Configure URL parameters
    const searchParams = new URLSearchParams(
      queryStringParameters as Record<string, string>
    );
    if (authToken && authToken.accessToken) {
      searchParams.set('auth', authToken.accessToken);
    }
    if (appCheckToken && appCheckToken.token) {
      searchParams.set('ac', appCheckToken.token);
    }
    searchParams.set('format', 'export');
    searchParams.set('ns', this.repoInfo_.namespace);

    // Build & send the request
    const url =
      (this.repoInfo_.secure ? 'https://' : 'http://') +
      this.repoInfo_.host +
      pathString +
      '?' +
      searchParams.toString();

    this.log_('Sending REST request for ' + url);
    const response = await fetch(url);
    if (!response.ok) {
      // Request was not successful, so throw an error
      throw new Error(
        `REST request at ${url} returned error: ${response.status}`
      );
    }

    this.log_(
      'REST Response for ' + url + ' received. status:',
      response.status
    );
    let result: T | null = null;
    try {
      result = await response.json();
    } catch (e) {
      warn('Failed to parse server response as json.', e);
    }

    return [response, result];
  }
}
