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
goog.provide('fb.core.ReadonlyRestClient');
goog.require('fb.core.util');
goog.require('fb.util');
goog.require('fb.util.json');
goog.require('fb.util.jwt');
goog.require('fb.util.obj');


/**
 * An implementation of fb.core.ServerActions that communicates with the server via REST requests.
 * This is mostly useful for compatibility with crawlers, where we don't want to spin up a full
 * persistent connection (using WebSockets or long-polling)
 */
fb.core.ReadonlyRestClient = goog.defineClass(null, {
  /**
   * @param {!fb.core.RepoInfo} repoInfo Data about the namespace we are connecting to
   * @param {function(string, *, boolean, ?number)} onDataUpdate A callback for new data from the server
   * @implements {fb.core.ServerActions}
   */
  constructor: function(repoInfo, onDataUpdate, authTokenProvider) {
    /** @private {function(...[*])} */
    this.log_ = fb.core.util.logWrapper('p:rest:');

    /** @private {!fb.core.RepoInfo} */
    this.repoInfo_ = repoInfo;

    /** @private {function(string, *, boolean, ?number)} */
    this.onDataUpdate_ = onDataUpdate;

    /** @private {!fb.core.AuthTokenProvider} */
    this.authTokenProvider_ = authTokenProvider;

    /**
     * We don't actually need to track listens, except to prevent us calling an onComplete for a listen
     * that's been removed. :-/
     *
     * @private {!Object.<string, !Object>}
     */
    this.listens_ = { };
  },

  /** @inheritDoc */
  listen: function(query, currentHashFn, tag, onComplete) {
    var pathString = query.path.toString();
    this.log_('Listen called for ' + pathString + ' ' + query.queryIdentifier());

    // Mark this listener so we can tell if it's removed.
    var listenId = fb.core.ReadonlyRestClient.getListenId_(query, tag);
    var thisListen = new Object();
    this.listens_[listenId] = thisListen;

    var queryStringParamaters = query.getQueryParams().toRestQueryStringParameters();

    var self = this;
    this.restRequest_(pathString + '.json', queryStringParamaters, function(error, result) {
      var data = result;

      if (error === 404) {
        data = null;
        error = null;
      }

      if (error === null) {
        self.onDataUpdate_(pathString, data, /*isMerge=*/false, tag);
      }

      if (fb.util.obj.get(self.listens_, listenId) === thisListen) {
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
  },

  /** @inheritDoc */
  unlisten: function(query, tag) {
    var listenId = fb.core.ReadonlyRestClient.getListenId_(query, tag);
    delete this.listens_[listenId];
  },

  /** @inheritDoc */
  refreshAuthToken: function(token) {
    // no-op since we just always call getToken.
  },

  /** @inheritDoc */
  onDisconnectPut: function(pathString, data, opt_onComplete) { },

  /** @inheritDoc */
  onDisconnectMerge: function(pathString, data, opt_onComplete) { },

  /** @inheritDoc */
  onDisconnectCancel: function(pathString, opt_onComplete) { },

  /** @inheritDoc */
  put: function(pathString, data, opt_onComplete, opt_hash) { },

  /** @inheritDoc */
  merge: function(pathString, data, onComplete, opt_hash) { },

  /** @inheritDoc */
  reportStats: function(stats) { },

  /**
   * Performs a REST request to the given path, with the provided query string parameters,
   * and any auth credentials we have.
   *
   * @param {!string} pathString
   * @param {!Object.<string, *>} queryStringParameters
   * @param {?function(?number, *=)} callback
   * @private
   */
  restRequest_: function(pathString, queryStringParameters, callback) {
    queryStringParameters = queryStringParameters || { };

    queryStringParameters['format'] = 'export';

    var self = this;

    this.authTokenProvider_.getToken(/*forceRefresh=*/false).then(function(authTokenData) {
      var authToken = authTokenData && authTokenData.accessToken;
      if (authToken) {
        queryStringParameters['auth'] = authToken;
      }

      var url = (self.repoInfo_.secure ? 'https://' : 'http://') +
        self.repoInfo_.host +
        pathString +
        '?' +
        fb.util.querystring(queryStringParameters);

      self.log_('Sending REST request for ' + url);
      var xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function () {
        if (callback && xhr.readyState === 4) {
          self.log_('REST Response for ' + url + ' received. status:', xhr.status, 'response:', xhr.responseText);
          var res = null;
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              res = fb.util.json.eval(xhr.responseText);
            } catch (e) {
              fb.core.util.warn('Failed to parse JSON response for ' + url + ': ' + xhr.responseText);
            }
            callback(null, res);
          } else {
            // 401 and 404 are expected.
            if (xhr.status !== 401 && xhr.status !== 404) {
              fb.core.util.warn('Got unsuccessful REST response for ' + url + ' Status: ' + xhr.status);
            }
            callback(xhr.status);
          }
          callback = null;
        }
      };

      xhr.open('GET', url, /*asynchronous=*/true);
      xhr.send();
    });
  },

  statics: {
    /**
     * @param {!fb.api.Query} query
     * @param {?number=} opt_tag
     * @return {string}
     * @private
     */
    getListenId_: function(query, opt_tag) {
      if (goog.isDef(opt_tag)) {
        return 'tag$' + opt_tag;
      } else {
        fb.core.util.assert(query.getQueryParams().isDefault(), "should have a tag if it's not a default query.");
        return query.path.toString();
      }
    }
  }
}); // end fb.core.ReadonlyRestClient
