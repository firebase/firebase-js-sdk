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

import { logWrapper, warn } from "../../utils/libs/logger";
import { assert } from "../../utils/libs/assert";
import { encodeQuerystring } from "../../utils/libs/querystring";
import { ServerActions } from "./ServerActions";

/**
 * An implementation of ServerActions that communicates with the server via REST requests.
 * This is mostly useful for compatibility with crawlers, where we don't want to spin up a full
 * persistent connection (using WebSockets or long-polling)
 */
export class ReadonlyRestClient extends ServerActions {
  /**
   * @param {!fb.api.Query} query
   * @param {?number=} opt_tag
   * @return {string}
   * @private
   */
  static getListenId(query, tag?) {
    if (tag !== undefined) {
      return 'tag$' + tag;
    } else {
      assert(query.getQueryParams().isDefault(), "should have a tag if it's not a default query.");
      return query.path.toString();
    }
  }

  private log = logWrapper('p:rest:');
  private listens = {};

  constructor(private repoInfo, private onDataUpdate, private authTokenProvider) {
    super();
  }

  /** @inheritDoc */
  listen(query, currentHashFn, tag, onComplete) {
    var pathString = query.path.toString();
    this.log('Listen called for ' + pathString + ' ' + query.queryIdentifier());

    // Mark this listener so we can tell if it's removed.
    var listenId = ReadonlyRestClient.getListenId(query, tag);
    var thisListen = new Object();
    this.listens[listenId] = thisListen;

    var queryStringParamaters = query.getQueryParams().toRestQueryStringParameters();

    this.restRequest(pathString + '.json', queryStringParamaters, (error, result) => {
      var data = result;

      if (error === 404) {
        data = null;
        error = null;
      }

      if (error === null) {
        this.onDataUpdate(pathString, data, /*isMerge=*/false, tag);
      }

      if (this.listens[listenId] === thisListen) {
        var status;
        if (!error) {
          status = 'ok';
        } else if (error == 401) {
          status = 'permission_denied';
        } else {
          status = 'rest_error:' + error;
        }

        onComplete(status, null);
      }
    });
  }

  unlisten(query, tag) {
    var listenId = ReadonlyRestClient.getListenId(query, tag);
    delete this.listens[listenId];
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
  private restRequest(pathString, queryStringParameters, callback) {
    queryStringParameters = queryStringParameters || { };

    queryStringParameters['format'] = 'export';

    var self = this;

    this.authTokenProvider.getToken(/*forceRefresh=*/false).then(function(authTokenData) {
      var authToken = authTokenData && authTokenData.accessToken;
      if (authToken) {
        queryStringParameters['auth'] = authToken;
      }

      var url = (self.repoInfo.secure ? 'https://' : 'http://') +
        self.repoInfo.host +
        pathString +
        '?' +
        encodeQuerystring(queryStringParameters);

      self.log('Sending REST request for ' + url);
      var xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function () {
        if (callback && xhr.readyState === 4) {
          self.log('REST Response for ' + url + ' received. status:', xhr.status, 'response:', xhr.responseText);
          var res = null;
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              res = JSON.parse(xhr.responseText);
            } catch (e) {
              warn('Failed to parse JSON response for ' + url + ': ' + xhr.responseText);
            }
            callback(null, res);
          } else {
            // 401 and 404 are expected.
            if (xhr.status !== 401 && xhr.status !== 404) {
              warn('Got unsuccessful REST response for ' + url + ' Status: ' + xhr.status);
            }
            callback(xhr.status);
          }
          callback = null;
        }
      };

      xhr.open('GET', url, /*asynchronous=*/true);
      xhr.send();
    });
  }
}
