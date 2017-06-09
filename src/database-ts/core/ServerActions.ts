import { Query } from "../api/Query";

export abstract class ServerActions {
  abstract listen(query: Query, 
                  currentHashFn: () => string, 
                  tag: number, 
                  onComplete: (status: string, data: any) => void): void

  /**
   * Remove a listen.
   */
  abstract unlisten(query: Query, tag: number): void

  /**
   * @param {string} pathString
   * @param {*} data
   * @param {function(string, string)=} opt_onComplete
   * @param {string=} opt_hash
   */
  put(pathString: string, data: any, onComplete?, hash?) {}

  /**
   * @param {string} pathString
   * @param {*} data
   * @param {function(string, ?string)} onComplete
   * @param {string=} opt_hash
   */
  merge(pathString: string, data: any, onComplete, hash?: string) {}

  /**
   * Refreshes the auth token for the current connection.
   * @param {string} token The authentication token
   */
  refreshAuthToken(token: string) {}

  onDisconnectPut(pathString: string, data: any, onComplete?) {}

  onDisconnectMerge(pathString: string, data: any, onComplete?) {}

  onDisconnectCancel(pathString: string, onComplete?) {}

  reportStats(stats) {}
}