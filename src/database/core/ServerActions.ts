import { Query } from '../api/Query';

/**
 * Interface defining the set of actions that can be performed against the Firebase server
 * (basically corresponds to our wire protocol).
 *
 * @interface
 */
export interface ServerActions {

  /**
   * @param {!Query} query
   * @param {function():string} currentHashFn
   * @param {?number} tag
   * @param {function(string, *)} onComplete
   */
  listen(query: Query, currentHashFn: () => string, tag: number | null, onComplete: (a: string, b: any) => any);

  /**
   * Remove a listen.
   *
   * @param {!Query} query
   * @param {?number} tag
   */
  unlisten(query: Query, tag: number | null);

  /**
   * @param {string} pathString
   * @param {*} data
   * @param {function(string, string)=} onComplete
   * @param {string=} hash
   */
  put(pathString: string, data: any, onComplete?: (a: string, b: string) => any, hash?: string);

  /**
   * @param {string} pathString
   * @param {*} data
   * @param {function(string, ?string)} onComplete
   * @param {string=} hash
   */
  merge(pathString: string, data: any, onComplete: (a: string, b: string | null) => any, hash?: string);

  /**
   * Refreshes the auth token for the current connection.
   * @param {string} token The authentication token
   */
  refreshAuthToken(token: string);

  /**
   * @param {string} pathString
   * @param {*} data
   * @param {function(string, string)=} onComplete
   */
  onDisconnectPut(pathString: string, data: any, onComplete?: (a: string, b: string) => any);

  /**
   * @param {string} pathString
   * @param {*} data
   * @param {function(string, string)=} onComplete
   */
  onDisconnectMerge(pathString: string, data: any, onComplete?: (a: string, b: string) => any);

  /**
   * @param {string} pathString
   * @param {function(string, string)=} onComplete
   */
  onDisconnectCancel(pathString: string, onComplete?: (a: string, b: string) => any);

  /**
   * @param {Object.<string, *>} stats
   */
  reportStats(stats: { [k: string]: any });

}
