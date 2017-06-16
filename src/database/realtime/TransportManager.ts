import { BrowserPollConnection } from "./BrowserPollConnection";
import { WebSocketConnection } from "./WebSocketConnection";
import { warn, each } from "../core/util/util";

/**
 * Currently simplistic, this class manages what transport a Connection should use at various stages of its
 * lifecycle.
 *
 * It starts with longpolling in a browser, and httppolling on node. It then upgrades to websockets if
 * they are available.
 * @constructor
 * @param {!fb.core.RepoInfo} repoInfo Metadata around the namespace we're connecting to
 */
export class TransportManager {
  transports_: Array<any>;
  /**
   * @const
   * @type {!Array.<function(new:Transport, string, fb.core.RepoInfo, string=)>}
   */
  static get ALL_TRANSPORTS() {
    return [
      BrowserPollConnection,
      WebSocketConnection
    ];
  }
  constructor(repoInfo) {
    this.initTransports_(repoInfo);
  };

  /**
   * @param {!fb.core.RepoInfo} repoInfo
   * @private
   */
  initTransports_(repoInfo) {
    var isWebSocketsAvailable = WebSocketConnection && WebSocketConnection['isAvailable']();
    var isSkipPollConnection = isWebSocketsAvailable && !WebSocketConnection.previouslyFailed();

    if (repoInfo.webSocketOnly) {
      if (!isWebSocketsAvailable)
        warn('wss:// URL used, but browser isn\'t known to support websockets.  Trying anyway.');

      isSkipPollConnection = true;
    }

    if (isSkipPollConnection) {
      this.transports_ = [WebSocketConnection];
    } else {
      var transports = this.transports_ = [];
      each(TransportManager.ALL_TRANSPORTS, function(i, transport) {
        if (transport && transport['isAvailable']()) {
          transports.push(transport);
        }
      });
    }
  }

  /**
   * @return {function(new:Transport, !string, !fb.core.RepoInfo, string=, string=)} The constructor for the
   * initial transport to use
   */
  initialTransport() {
    if (this.transports_.length > 0) {
      return this.transports_[0];
    } else {
      throw new Error('No transports available');
    }
  }

  /**
   * @return {?function(new:Transport, function(),function(), string=)} The constructor for the next
   * transport, or null
   */
  upgradeTransport() {
    if (this.transports_.length > 1) {
      return this.transports_[1];
    } else {
      return null;
    }
  }
}

