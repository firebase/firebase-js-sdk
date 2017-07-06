import { RepoInfo } from '../core/RepoInfo';

export abstract class Transport {
  /**
   * Bytes received since connection started.
   * @type {number}
   */
  abstract bytesReceived: number;

  /**
   * Bytes sent since connection started.
   * @type {number}
   */
  abstract bytesSent: number;

  /**
   *
   * @param {string} connId An identifier for this connection, used for logging
   * @param {RepoInfo} repoInfo The info for the endpoint to send data to.
   * @param {string=} transportSessionId Optional transportSessionId if this is connecting to an existing transport session
   * @param {string=} lastSessionId Optional lastSessionId if there was a previous connection
   * @interface
   */
  constructor(connId: string, repoInfo: RepoInfo, transportSessionId?: string, lastSessionId?: string) {}

  /**
   * @param {function(Object)} onMessage Callback when messages arrive
   * @param {function()} onDisconnect Callback with connection lost.
   */
  abstract open(onMessage: (a: Object) => any, onDisconnect: () => any);

  abstract start();

  abstract close();

  /**
   * @param {!Object} data The JSON data to transmit
   */
  abstract send(data: Object);
}