import { assert } from '../../utils/assert';
import { logWrapper, warn } from './util/util';
import { jsonEval } from '../../utils/json';
import { safeGet } from '../../utils/obj';
import { querystring } from '../../utils/util';
import { ServerActions } from './ServerActions';
import { RepoInfo } from './RepoInfo';
import { AuthTokenProvider } from './AuthTokenProvider';
import { Query } from '../api/Query';

/**
 * An implementation of ServerActions that communicates with the server via REST requests.
 * This is mostly useful for compatibility with crawlers, where we don't want to spin up a full
 * persistent connection (using WebSockets or long-polling)
 */
export class ReadonlyRestClient implements ServerActions {
  /** @private {function(...[*])} */
  private log_: (...args: any[]) => any = logWrapper('p:rest:');

  /**
   * We don't actually need to track listens, except to prevent us calling an onComplete for a listen
   * that's been removed. :-/
   *
   * @private {!Object.<string, !Object>}
   */
  private listens_: { [k: string]: Object } = {};

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
      assert(query.getQueryParams().isDefault(), 'should have a tag if it\'s not a default query.');
      return query.path.toString();
    }
  }

  /**
   * @param {!RepoInfo} repoInfo_ Data about the namespace we are connecting to
   * @param {function(string, *, boolean, ?number)} onDataUpdate_ A callback for new data from the server
   * @param {AuthTokenProvider} authTokenProvider_
   * @implements {ServerActions}
   */
  constructor(private repoInfo_: RepoInfo,
              private onDataUpdate_: (a: string, b: any, c: boolean, d: number | null) => any,
              private authTokenProvider_: AuthTokenProvider) {
  }

  /** @inheritDoc */
  listen(query: Query, currentHashFn: () => string, tag: number | null, onComplete: (a: string, b: any) => any) {
    const pathString = query.path.toString();
    this.log_('Listen called for ' + pathString + ' ' + query.queryIdentifier());

    // Mark this listener so we can tell if it's removed.
    const listenId = ReadonlyRestClient.getListenId_(query, tag);
    const thisListen = {};
    this.listens_[listenId] = thisListen;

    const queryStringParamaters = query.getQueryParams().toRestQueryStringParameters();

    this.restRequest_(pathString + '.json', queryStringParamaters, (error, result) => {
      let data = result;

      if (error === 404) {
        data = null;
        error = null;
      }

      if (error === null) {
        this.onDataUpdate_(pathString, data, /*isMerge=*/false, tag);
      }

      if (safeGet(this.listens_, listenId) === thisListen) {
        let status;
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
  unlisten(query: Query, tag: number | null) {
    const listenId = ReadonlyRestClient.getListenId_(query, tag);
    delete this.listens_[listenId];
  }

  /** @inheritDoc */
  refreshAuthToken(token: string) {
    // no-op since we just always call getToken.
  }

  /** @inheritDoc */
  onDisconnectPut(pathString: string, data: any, onComplete?: (a: string, b: string) => any) { }

  /** @inheritDoc */
  onDisconnectMerge(pathString: string, data: any, onComplete?: (a: string, b: string) => any) { }

  /** @inheritDoc */
  onDisconnectCancel(pathString: string, onComplete?: (a: string, b: string) => any) { }

  /** @inheritDoc */
  put(pathString: string, data: any, onComplete?: (a: string, b: string) => any, hash?: string) { }

  /** @inheritDoc */
  merge(pathString: string, data: any, onComplete: (a: string, b: string | null) => any, hash?: string) { }

  /** @inheritDoc */
  reportStats(stats: { [k: string]: any }) { }

  /**
   * Performs a REST request to the given path, with the provided query string parameters,
   * and any auth credentials we have.
   *
   * @param {!string} pathString
   * @param {!Object.<string, *>} queryStringParameters
   * @param {?function(?number, *=)} callback
   * @private
   */
  private restRequest_(pathString: string, queryStringParameters: {[k: string]: any} = {},
                       callback: ((a: number | null, b?: any) => any) | null) {
    queryStringParameters['format'] = 'export';

    this.authTokenProvider_.getToken(/*forceRefresh=*/false).then((authTokenData) => {
      const authToken = authTokenData && authTokenData.accessToken;
      if (authToken) {
        queryStringParameters['auth'] = authToken;
      }

      const url = (this.repoInfo_.secure ? 'https://' : 'http://') +
        this.repoInfo_.host +
        pathString +
        '?' +
        querystring(queryStringParameters);

      this.log_('Sending REST request for ' + url);
      const xhr = new XMLHttpRequest();
      xhr.onreadystatechange = () => {
        if (callback && xhr.readyState === 4) {
          this.log_('REST Response for ' + url + ' received. status:', xhr.status, 'response:', xhr.responseText);
          let res = null;
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
}
