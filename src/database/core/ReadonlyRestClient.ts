import { assert } from "../../utils/assert";
import { logWrapper, warn } from "./util/util";
import { jsonEval } from "../../utils/json";
import { safeGet } from "../../utils/obj";
import { querystring } from "../../utils/util";

/**
 * An implementation of ServerActions that communicates with the server via REST requests.
 * This is mostly useful for compatibility with crawlers, where we don't want to spin up a full
 * persistent connection (using WebSockets or long-polling)
 */
export class ReadonlyRestClient {
  /** @private {function(...[*])} */
  private log_;

  /** @private {!RepoInfo} */
  private repoInfo_;

  /** @private {function(string, *, boolean, ?number)} */
  private onDataUpdate_;

  /** @private {!AuthTokenProvider} */
  private authTokenProvider_;

  /**
   * We don't actually need to track listens, except to prevent us calling an onComplete for a listen
   * that's been removed. :-/
   *
   * @private {!Object.<string, !Object>}
   */
  private listens_;
  
  /**
   * @param {!Query} query
   * @param {?number=} opt_tag
   * @return {string}
   * @private
   */
  static getListenId_(query, tag?) {
    if (tag !== undefined) {
      return 'tag$' + tag;
    } else {
      assert(query.getQueryParams().isDefault(), "should have a tag if it's not a default query.");
      return query.path.toString();
    }
  }
  /**
   * @param {!RepoInfo} repoInfo Data about the namespace we are connecting to
   * @param {function(string, *, boolean, ?number)} onDataUpdate A callback for new data from the server
   * @implements {ServerActions}
   */
  constructor(repoInfo, onDataUpdate, authTokenProvider) {
    this.log_ = logWrapper('p:rest:');
    this.repoInfo_ = repoInfo;
    this.onDataUpdate_ = onDataUpdate;
    this.authTokenProvider_ = authTokenProvider;
    this.listens_ = { };
  }

  /** @inheritDoc */
  listen(query, currentHashFn, tag, onComplete) {
    var pathString = query.path.toString();
    this.log_('Listen called for ' + pathString + ' ' + query.queryIdentifier());

    // Mark this listener so we can tell if it's removed.
    var listenId = ReadonlyRestClient.getListenId_(query, tag);
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

      if (safeGet(self.listens_, listenId) === thisListen) {
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

  /** @inheritDoc */
  unlisten(query, tag) {
    var listenId = ReadonlyRestClient.getListenId_(query, tag);
    delete this.listens_[listenId];
  }

  /** @inheritDoc */
  refreshAuthToken(token) {
    // no-op since we just always call getToken.
  }

  /** @inheritDoc */
  onDisconnectPut(pathString, data, opt_onComplete) { }

  /** @inheritDoc */
  onDisconnectMerge(pathString, data, opt_onComplete) { }

  /** @inheritDoc */
  onDisconnectCancel(pathString, opt_onComplete) { }

  /** @inheritDoc */
  put(pathString, data, opt_onComplete, opt_hash) { }

  /** @inheritDoc */
  merge(pathString, data, onComplete, opt_hash) { }

  /** @inheritDoc */
  reportStats(stats) { }

  /**
   * Performs a REST request to the given path, with the provided query string parameters,
   * and any auth credentials we have.
   *
   * @param {!string} pathString
   * @param {!Object.<string, *>} queryStringParameters
   * @param {?function(?number, *=)} callback
   * @private
   */
  restRequest_(pathString, queryStringParameters, callback) {
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
        querystring(queryStringParameters);

      self.log_('Sending REST request for ' + url);
      var xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function () {
        if (callback && xhr.readyState === 4) {
          self.log_('REST Response for ' + url + ' received. status:', xhr.status, 'response:', xhr.responseText);
          var res = null;
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              res = jsonEval(xhr.responseText);
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
}; // end ReadonlyRestClient
