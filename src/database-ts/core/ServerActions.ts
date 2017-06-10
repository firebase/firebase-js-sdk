/**
 * Interface defining the set of actions that can be performed against the Firebase server
 * (basically corresponds to our wire protocol).
 *
 * @interface
 */
export class ServerActions {

  /**
   * @param {!fb.api.Query} query
   * @param {function():string} currentHashFn
   * @param {?number} tag
   * @param {function(string, *)} onComplete
   */
  listen() {}

  /**
   * Remove a listen.
   *
   * @param {!fb.api.Query} query
   * @param {?number} tag
   */
  unlisten() {}

  /**
   * @param {string} pathString
   * @param {*} data
   * @param {function(string, string)=} opt_onComplete
   * @param {string=} opt_hash
   */
  put() {}

  /**
   * @param {string} pathString
   * @param {*} data
   * @param {function(string, ?string)} onComplete
   * @param {string=} opt_hash
   */
  merge() {}

  /**
   * Refreshes the auth token for the current connection.
   * @param {string} token The authentication token
   */
  refreshAuthToken() {}

  /**
   * @param {string} pathString
   * @param {*} data
   * @param {function(string, string)=} opt_onComplete
   */
  onDisconnectPut() {}

  /**
   * @param {string} pathString
   * @param {*} data
   * @param {function(string, string)=} opt_onComplete
   */
  onDisconnectMerge() {}

  /**
   * @param {string} pathString
   * @param {function(string, string)=} opt_onComplete
   */
  onDisconnectCancel() {}

  /**
   * @param {Object.<string, *>} stats
   */
  reportStats() {}

}; // fb.core.ServerActions
