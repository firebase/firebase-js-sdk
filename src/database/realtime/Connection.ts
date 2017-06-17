import {
  error,
  logWrapper,
  requireKey,
  setTimeoutNonBlocking,
  warn,
} from '../core/util/util';
import { PersistentStorage } from '../core/storage/storage';
import { CONSTANTS } from './Constants';
import { TransportManager } from './TransportManager';
import { RepoInfo } from '../core/RepoInfo';

// Abort upgrade attempt if it takes longer than 60s.
const UPGRADE_TIMEOUT = 60000;

// For some transports (WebSockets), we need to "validate" the transport by exchanging a few requests and responses.
// If we haven't sent enough requests within 5s, we'll start sending noop ping requests.
const DELAY_BEFORE_SENDING_EXTRA_REQUESTS = 5000;

// If the initial data sent triggers a lot of bandwidth (i.e. it's a large put or a listen for a large amount of data)
// then we may not be able to exchange our ping/pong requests within the healthy timeout.  So if we reach the timeout
// but we've sent/received enough bytes, we don't cancel the connection.
const BYTES_SENT_HEALTHY_OVERRIDE = 10 * 1024;
const BYTES_RECEIVED_HEALTHY_OVERRIDE = 100 * 1024;


const REALTIME_STATE_CONNECTING = 0;
const REALTIME_STATE_CONNECTED = 1;
const REALTIME_STATE_DISCONNECTED = 2;

const MESSAGE_TYPE = 't';
const MESSAGE_DATA = 'd';
const CONTROL_SHUTDOWN = 's';
const CONTROL_RESET = 'r';
const CONTROL_ERROR = 'e';
const CONTROL_PONG = 'o';
const SWITCH_ACK = 'a';
const END_TRANSMISSION = 'n';
const PING = 'p';

const SERVER_HELLO = 'h';

/**
 * Creates a new real-time connection to the server using whichever method works
 * best in the current browser.
 *
 * @constructor
 * @param {!string} connId - an id for this connection
 * @param {!RepoInfo} repoInfo - the info for the endpoint to connect to
 * @param {function(Object)} onMessage - the callback to be triggered when a server-push message arrives
 * @param {function(number, string)} onReady - the callback to be triggered when this connection is ready to send messages.
 * @param {function()} onDisconnect - the callback to be triggered when a connection was lost
 * @param {function(string)} onKill - the callback to be triggered when this connection has permanently shut down.
 * @param {string=} lastSessionId - last session id in persistent connection. is used to clean up old session in real-time server

 */
export class Connection {
  connectionCount;
  id;
  lastSessionId;
  pendingDataMessages;
  sessionId;

  private conn_;
  private healthyTimeout_;
  private isHealthy_;
  private log_;
  private onDisconnect_;
  private onKill_;
  private onMessage_;
  private onReady_;
  private primaryResponsesRequired_;
  private repoInfo_;
  private rx_;
  private secondaryConn_;
  private secondaryResponsesRequired_;
  private state_;
  private transportManager_;
  private tx_;

  constructor(connId: string,
              repoInfo: RepoInfo,
              onMessage: (a: Object) => any,
              onReady: (a: number, b: string) => any,
              onDisconnect: () => any,
              onKill: (a: string) => any,
              lastSessionId?: string) {
    this.id = connId;
    this.log_ = logWrapper('c:' + this.id + ':');
    this.onMessage_ = onMessage;
    this.onReady_ = onReady;
    this.onDisconnect_ = onDisconnect;
    this.onKill_ = onKill;
    this.repoInfo_ = repoInfo;
    this.pendingDataMessages = [];
    this.connectionCount = 0;
    this.transportManager_ = new TransportManager(repoInfo);
    this.state_ = REALTIME_STATE_CONNECTING;
    this.lastSessionId = lastSessionId;
    this.log_('Connection created');
    this.start_();
  }

  /**
   * Starts a connection attempt
   * @private
   */
  private start_() {
    const conn = this.transportManager_.initialTransport();
    this.conn_ = new conn(this.nextTransportId_(), this.repoInfo_, /*transportSessionId=*/undefined, this.lastSessionId);

    // For certain transports (WebSockets), we need to send and receive several messages back and forth before we
    // can consider the transport healthy.
    this.primaryResponsesRequired_ = conn['responsesRequiredToBeHealthy'] || 0;

    const onMessageReceived = this.connReceiver_(this.conn_);
    const onConnectionLost = this.disconnReceiver_(this.conn_);
    this.tx_ = this.conn_;
    this.rx_ = this.conn_;
    this.secondaryConn_ = null;
    this.isHealthy_ = false;

    const self = this;
    /*
     * Firefox doesn't like when code from one iframe tries to create another iframe by way of the parent frame.
     * This can occur in the case of a redirect, i.e. we guessed wrong on what server to connect to and received a reset.
     * Somehow, setTimeout seems to make this ok. That doesn't make sense from a security perspective, since you should
     * still have the context of your originating frame.
     */
    setTimeout(function () {
      // self.conn_ gets set to null in some of the tests. Check to make sure it still exists before using it
      self.conn_ && self.conn_.open(onMessageReceived, onConnectionLost);
    }, Math.floor(0));


    const healthyTimeout_ms = conn['healthyTimeout'] || 0;
    if (healthyTimeout_ms > 0) {
      this.healthyTimeout_ = setTimeoutNonBlocking(function () {
        self.healthyTimeout_ = null;
        if (!self.isHealthy_) {
          if (self.conn_ && self.conn_.bytesReceived > BYTES_RECEIVED_HEALTHY_OVERRIDE) {
            self.log_('Connection exceeded healthy timeout but has received ' + self.conn_.bytesReceived +
              ' bytes.  Marking connection healthy.');
            self.isHealthy_ = true;
            self.conn_.markConnectionHealthy();
          } else if (self.conn_ && self.conn_.bytesSent > BYTES_SENT_HEALTHY_OVERRIDE) {
            self.log_('Connection exceeded healthy timeout but has sent ' + self.conn_.bytesSent +
              ' bytes.  Leaving connection alive.');
            // NOTE: We don't want to mark it healthy, since we have no guarantee that the bytes have made it to
            // the server.
          } else {
            self.log_('Closing unhealthy connection after timeout.');
            self.close();
          }
        }
      }, Math.floor(healthyTimeout_ms));
    }
  };

  /**
   * @return {!string}
   * @private
   */
  private nextTransportId_() {
    return 'c:' + this.id + ':' + this.connectionCount++;
  };

  private disconnReceiver_(conn) {
    const self = this;
    return function (everConnected) {
      if (conn === self.conn_) {
        self.onConnectionLost_(everConnected);
      } else if (conn === self.secondaryConn_) {
        self.log_('Secondary connection lost.');
        self.onSecondaryConnectionLost_();
      } else {
        self.log_('closing an old connection');
      }
    }
  };

  private connReceiver_(conn) {
    const self = this;
    return function (message) {
      if (self.state_ != REALTIME_STATE_DISCONNECTED) {
        if (conn === self.rx_) {
          self.onPrimaryMessageReceived_(message);
        } else if (conn === self.secondaryConn_) {
          self.onSecondaryMessageReceived_(message);
        } else {
          self.log_('message on old connection');
        }
      }
    };
  };

  /**
   *
   * @param {Object} dataMsg An arbitrary data message to be sent to the server
   */
  sendRequest(dataMsg) {
    // wrap in a data message envelope and send it on
    const msg = {'t': 'd', 'd': dataMsg};
    this.sendData_(msg);
  };

  tryCleanupConnection() {
    if (this.tx_ === this.secondaryConn_ && this.rx_ === this.secondaryConn_) {
      this.log_('cleaning up and promoting a connection: ' + this.secondaryConn_.connId);
      this.conn_ = this.secondaryConn_;
      this.secondaryConn_ = null;
      // the server will shutdown the old connection
    }
  };

  private onSecondaryControl_(controlData) {
    if (MESSAGE_TYPE in controlData) {
      const cmd = controlData[MESSAGE_TYPE];
      if (cmd === SWITCH_ACK) {
        this.upgradeIfSecondaryHealthy_();
      } else if (cmd === CONTROL_RESET) {
        // Most likely the session wasn't valid. Abandon the switch attempt
        this.log_('Got a reset on secondary, closing it');
        this.secondaryConn_.close();
        // If we were already using this connection for something, than we need to fully close
        if (this.tx_ === this.secondaryConn_ || this.rx_ === this.secondaryConn_) {
          this.close();
        }
      } else if (cmd === CONTROL_PONG) {
        this.log_('got pong on secondary.');
        this.secondaryResponsesRequired_--;
        this.upgradeIfSecondaryHealthy_();
      }
    }
  };

  private onSecondaryMessageReceived_(parsedData) {
    const layer = requireKey('t', parsedData);
    const data = requireKey('d', parsedData);
    if (layer == 'c') {
      this.onSecondaryControl_(data);
    } else if (layer == 'd') {
      // got a data message, but we're still second connection. Need to buffer it up
      this.pendingDataMessages.push(data);
    } else {
      throw new Error('Unknown protocol layer: ' + layer);
    }
  };

  private upgradeIfSecondaryHealthy_() {
    if (this.secondaryResponsesRequired_ <= 0) {
      this.log_('Secondary connection is healthy.');
      this.isHealthy_ = true;
      this.secondaryConn_.markConnectionHealthy();
      this.proceedWithUpgrade_();
    } else {
      // Send a ping to make sure the connection is healthy.
      this.log_('sending ping on secondary.');
      this.secondaryConn_.send({'t': 'c', 'd': {'t': PING, 'd': {}}});
    }
  };

  private proceedWithUpgrade_() {
    // tell this connection to consider itself open
    this.secondaryConn_.start();
    // send ack
    this.log_('sending client ack on secondary');
    this.secondaryConn_.send({'t': 'c', 'd': {'t': SWITCH_ACK, 'd': {}}});

    // send end packet on primary transport, switch to sending on this one
    // can receive on this one, buffer responses until end received on primary transport
    this.log_('Ending transmission on primary');
    this.conn_.send({'t': 'c', 'd': {'t': END_TRANSMISSION, 'd': {}}});
    this.tx_ = this.secondaryConn_;

    this.tryCleanupConnection();
  };

  private onPrimaryMessageReceived_(parsedData) {
    // Must refer to parsedData properties in quotes, so closure doesn't touch them.
    const layer = requireKey('t', parsedData);
    const data = requireKey('d', parsedData);
    if (layer == 'c') {
      this.onControl_(data);
    } else if (layer == 'd') {
      this.onDataMessage_(data);
    }
  };

  private onDataMessage_(message) {
    this.onPrimaryResponse_();

    // We don't do anything with data messages, just kick them up a level
    this.onMessage_(message);
  };

  private onPrimaryResponse_() {
    if (!this.isHealthy_) {
      this.primaryResponsesRequired_--;
      if (this.primaryResponsesRequired_ <= 0) {
        this.log_('Primary connection is healthy.');
        this.isHealthy_ = true;
        this.conn_.markConnectionHealthy();
      }
    }
  };

  private onControl_(controlData) {
    const cmd = requireKey(MESSAGE_TYPE, controlData);
    if (MESSAGE_DATA in controlData) {
      const payload = controlData[MESSAGE_DATA];
      if (cmd === SERVER_HELLO) {
        this.onHandshake_(payload);
      } else if (cmd === END_TRANSMISSION) {
        this.log_('recvd end transmission on primary');
        this.rx_ = this.secondaryConn_;
        for (let i = 0; i < this.pendingDataMessages.length; ++i) {
          this.onDataMessage_(this.pendingDataMessages[i]);
        }
        this.pendingDataMessages = [];
        this.tryCleanupConnection();
      } else if (cmd === CONTROL_SHUTDOWN) {
        // This was previously the 'onKill' callback passed to the lower-level connection
        // payload in this case is the reason for the shutdown. Generally a human-readable error
        this.onConnectionShutdown_(payload);
      } else if (cmd === CONTROL_RESET) {
        // payload in this case is the host we should contact
        this.onReset_(payload);
      } else if (cmd === CONTROL_ERROR) {
        error('Server Error: ' + payload);
      } else if (cmd === CONTROL_PONG) {
        this.log_('got pong on primary.');
        this.onPrimaryResponse_();
        this.sendPingOnPrimaryIfNecessary_();
      } else {
        error('Unknown control packet command: ' + cmd);
      }
    }
  };

  /**
   *
   * @param {Object} handshake The handshake data returned from the server
   * @private
   */
  private onHandshake_(handshake) {
    const timestamp = handshake['ts'];
    const version = handshake['v'];
    const host = handshake['h'];
    this.sessionId = handshake['s'];
    this.repoInfo_.updateHost(host);
    // if we've already closed the connection, then don't bother trying to progress further
    if (this.state_ == REALTIME_STATE_CONNECTING) {
      this.conn_.start();
      this.onConnectionEstablished_(this.conn_, timestamp);
      if (CONSTANTS.PROTOCOL_VERSION !== version) {
        warn('Protocol version mismatch detected');
      }
      // TODO: do we want to upgrade? when? maybe a delay?
      this.tryStartUpgrade_();
    }
  };

  private tryStartUpgrade_() {
    const conn = this.transportManager_.upgradeTransport();
    if (conn) {
      this.startUpgrade_(conn);
    }
  };

  private startUpgrade_(conn) {
    this.secondaryConn_ = new conn(this.nextTransportId_(),
      this.repoInfo_, this.sessionId);
    // For certain transports (WebSockets), we need to send and receive several messages back and forth before we
    // can consider the transport healthy.
    this.secondaryResponsesRequired_ = conn['responsesRequiredToBeHealthy'] || 0;

    const onMessage = this.connReceiver_(this.secondaryConn_);
    const onDisconnect = this.disconnReceiver_(this.secondaryConn_);
    this.secondaryConn_.open(onMessage, onDisconnect);

    // If we haven't successfully upgraded after UPGRADE_TIMEOUT, give up and kill the secondary.
    const self = this;
    setTimeoutNonBlocking(function () {
      if (self.secondaryConn_) {
        self.log_('Timed out trying to upgrade.');
        self.secondaryConn_.close();
      }
    }, Math.floor(UPGRADE_TIMEOUT));
  };

  private onReset_(host) {
    this.log_('Reset packet received.  New host: ' + host);
    this.repoInfo_.updateHost(host);
    // TODO: if we're already "connected", we need to trigger a disconnect at the next layer up.
    // We don't currently support resets after the connection has already been established
    if (this.state_ === REALTIME_STATE_CONNECTED) {
      this.close();
    } else {
      // Close whatever connections we have open and start again.
      this.closeConnections_();
      this.start_();
    }
  };

  private onConnectionEstablished_(conn, timestamp) {
    this.log_('Realtime connection established.');
    this.conn_ = conn;
    this.state_ = REALTIME_STATE_CONNECTED;

    if (this.onReady_) {
      this.onReady_(timestamp, this.sessionId);
      this.onReady_ = null;
    }

    const self = this;
    // If after 5 seconds we haven't sent enough requests to the server to get the connection healthy,
    // send some pings.
    if (this.primaryResponsesRequired_ === 0) {
      this.log_('Primary connection is healthy.');
      this.isHealthy_ = true;
    } else {
      setTimeoutNonBlocking(function () {
        self.sendPingOnPrimaryIfNecessary_();
      }, Math.floor(DELAY_BEFORE_SENDING_EXTRA_REQUESTS));
    }
  };

  private sendPingOnPrimaryIfNecessary_() {
    // If the connection isn't considered healthy yet, we'll send a noop ping packet request.
    if (!this.isHealthy_ && this.state_ === REALTIME_STATE_CONNECTED) {
      this.log_('sending ping on primary.');
      this.sendData_({'t': 'c', 'd': {'t': PING, 'd': {}}});
    }
  };

  private onSecondaryConnectionLost_() {
    const conn = this.secondaryConn_;
    this.secondaryConn_ = null;
    if (this.tx_ === conn || this.rx_ === conn) {
      // we are relying on this connection already in some capacity. Therefore, a failure is real
      this.close();
    }
  };

  /**
   *
   * @param {boolean} everConnected Whether or not the connection ever reached a server. Used to determine if
   * we should flush the host cache
   * @private
   */
  private onConnectionLost_(everConnected) {
    this.conn_ = null;

    // NOTE: IF you're seeing a Firefox error for this line, I think it might be because it's getting
    // called on window close and REALTIME_STATE_CONNECTING is no longer defined.  Just a guess.
    if (!everConnected && this.state_ === REALTIME_STATE_CONNECTING) {
      this.log_('Realtime connection failed.');
      // Since we failed to connect at all, clear any cached entry for this namespace in case the machine went away
      if (this.repoInfo_.isCacheableHost()) {
        PersistentStorage.remove('host:' + this.repoInfo_.host);
        // reset the internal host to what we would show the user, i.e. <ns>.firebaseio.com
        this.repoInfo_.internalHost = this.repoInfo_.host;
      }
    } else if (this.state_ === REALTIME_STATE_CONNECTED) {
      this.log_('Realtime connection lost.');
    }

    this.close();
  };

  /**
   *
   * @param {string} reason
   * @private
   */
  private onConnectionShutdown_(reason) {
    this.log_('Connection shutdown command received. Shutting down...');

    if (this.onKill_) {
      this.onKill_(reason);
      this.onKill_ = null;
    }

    // We intentionally don't want to fire onDisconnect (kill is a different case),
    // so clear the callback.
    this.onDisconnect_ = null;

    this.close();
  };


  private sendData_(data) {
    if (this.state_ !== REALTIME_STATE_CONNECTED) {
      throw 'Connection is not connected';
    } else {
      this.tx_.send(data);
    }
  };

  /**
   * Cleans up this connection, calling the appropriate callbacks
   */
  close() {
    if (this.state_ !== REALTIME_STATE_DISCONNECTED) {
      this.log_('Closing realtime connection.');
      this.state_ = REALTIME_STATE_DISCONNECTED;

      this.closeConnections_();

      if (this.onDisconnect_) {
        this.onDisconnect_();
        this.onDisconnect_ = null;
      }
    }
  };

  /**
   *
   * @private
   */
  private closeConnections_() {
    this.log_('Shutting down all connections');
    if (this.conn_) {
      this.conn_.close();
      this.conn_ = null;
    }

    if (this.secondaryConn_) {
      this.secondaryConn_.close();
      this.secondaryConn_ = null;
    }

    if (this.healthyTimeout_) {
      clearTimeout(this.healthyTimeout_);
      this.healthyTimeout_ = null;
    }
  };
}


