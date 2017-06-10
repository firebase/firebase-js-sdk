import { 
  error, 
  logWrapper,
  requireKey, 
  setTimeoutNonBlocking, 
  warn ,
} from "../core/util/util";
import { PersistentStorage } from "../core/storage/storage";
import { CONSTANTS } from "./Constants";
import { TransportManager } from "./TransportManager";

// Abort upgrade attempt if it takes longer than 60s.
var UPGRADE_TIMEOUT = 60000;

// For some transports (WebSockets), we need to "validate" the transport by exchanging a few requests and responses.
// If we haven't sent enough requests within 5s, we'll start sending noop ping requests.
var DELAY_BEFORE_SENDING_EXTRA_REQUESTS = 5000;

// If the initial data sent triggers a lot of bandwidth (i.e. it's a large put or a listen for a large amount of data)
// then we may not be able to exchange our ping/pong requests within the healthy timeout.  So if we reach the timeout
// but we've sent/received enough bytes, we don't cancel the connection.
var BYTES_SENT_HEALTHY_OVERRIDE = 10 * 1024;
var BYTES_RECEIVED_HEALTHY_OVERRIDE = 100 * 1024;


var REALTIME_STATE_CONNECTING = 0;
var REALTIME_STATE_CONNECTED = 1;
var REALTIME_STATE_DISCONNECTED = 2;

var MESSAGE_TYPE = 't';
var MESSAGE_DATA = 'd';
var CONTROL_SHUTDOWN = 's';
var CONTROL_RESET = 'r';
var CONTROL_ERROR = 'e';
var CONTROL_PONG = 'o';
var SWITCH_ACK = 'a';
var END_TRANSMISSION = 'n';
var PING = 'p';

var SERVER_HELLO = 'h';

/**
 * Creates a new real-time connection to the server using whichever method works
 * best in the current browser.
 *
 * @constructor
 * @param {!string} connId - an id for this connection
 * @param {!fb.core.RepoInfo} repoInfo - the info for the endpoint to connect to
 * @param {function(Object)} onMessage - the callback to be triggered when a server-push message arrives
 * @param {function(number, string)} onReady - the callback to be triggered when this connection is ready to send messages.
 * @param {function()} onDisconnect - the callback to be triggered when a connection was lost
 * @param {function(string)} onKill - the callback to be triggered when this connection has permanently shut down.
 * @param {string=} lastSessionId - last session id in persistent connection. is used to clean up old session in real-time server

 */
export class Connection {
  conn_;
  connectionCount;
  healthyTimeout_;
  id;
  isHealthy_;
  lastSessionId;
  log_;
  onDisconnect_;
  onKill_;
  onMessage_;
  onReady_;
  pendingDataMessages;
  primaryResponsesRequired_
  repoInfo_;
  rx_;
  secondaryConn_;
  secondaryResponsesRequired_;
  sessionId;
  state_;
  transportManager_;
  tx_;

  constructor(connId, repoInfo, onMessage, onReady, onDisconnect, onKill, lastSessionId) {
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
  start_() {
    var conn = this.transportManager_.initialTransport();
    this.conn_ = new conn(this.nextTransportId_(), this.repoInfo_, /*transportSessionId=*/undefined, this.lastSessionId);

    // For certain transports (WebSockets), we need to send and receive several messages back and forth before we
    // can consider the transport healthy.
    this.primaryResponsesRequired_ = conn['responsesRequiredToBeHealthy'] || 0;

    var onMessageReceived = this.connReceiver_(this.conn_);
    var onConnectionLost = this.disconnReceiver_(this.conn_);
    this.tx_ = this.conn_;
    this.rx_ = this.conn_;
    this.secondaryConn_ = null;
    this.isHealthy_ = false;

    var self = this;
    /*
    * Firefox doesn't like when code from one iframe tries to create another iframe by way of the parent frame.
    * This can occur in the case of a redirect, i.e. we guessed wrong on what server to connect to and received a reset.
    * Somehow, setTimeout seems to make this ok. That doesn't make sense from a security perspective, since you should
    * still have the context of your originating frame.
    */
    setTimeout(function() {
      // self.conn_ gets set to null in some of the tests. Check to make sure it still exists before using it
      self.conn_ && self.conn_.open(onMessageReceived, onConnectionLost);
    }, Math.floor(0));


    var healthyTimeout_ms = conn['healthyTimeout'] || 0;
    if (healthyTimeout_ms > 0) {
      this.healthyTimeout_ = setTimeoutNonBlocking(function() {
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
  nextTransportId_() {
    return 'c:' + this.id + ':' + this.connectionCount++;
  };

  disconnReceiver_(conn) {
    var self = this;
    return function(everConnected) {
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

  connReceiver_(conn) {
    var self = this;
    return function(message) {
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
    var msg = {'t': 'd', 'd': dataMsg};
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

  onSecondaryControl_(controlData) {
    if (MESSAGE_TYPE in controlData) {
      var cmd = controlData[MESSAGE_TYPE];
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

  onSecondaryMessageReceived_(parsedData) {
    var layer = requireKey('t', parsedData);
    var data = requireKey('d', parsedData);
    if (layer == 'c') {
      this.onSecondaryControl_(data);
    } else if (layer == 'd') {
      // got a data message, but we're still second connection. Need to buffer it up
      this.pendingDataMessages.push(data);
    } else {
      throw new Error('Unknown protocol layer: ' + layer);
    }
  };

  upgradeIfSecondaryHealthy_() {
    if (this.secondaryResponsesRequired_ <= 0) {
      this.log_('Secondary connection is healthy.');
      this.isHealthy_ = true;
      this.secondaryConn_.markConnectionHealthy();
      this.proceedWithUpgrade_();
    } else {
      // Send a ping to make sure the connection is healthy.
      this.log_('sending ping on secondary.');
      this.secondaryConn_.send({'t': 'c', 'd': {'t': PING, 'd': { } }});
    }
  };

  proceedWithUpgrade_() {
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

  onPrimaryMessageReceived_(parsedData) {
    // Must refer to parsedData properties in quotes, so closure doesn't touch them.
    var layer = requireKey('t', parsedData);
    var data = requireKey('d', parsedData);
    if (layer == 'c') {
      this.onControl_(data);
    } else if (layer == 'd') {
      this.onDataMessage_(data);
    }
  };

  onDataMessage_(message) {
    this.onPrimaryResponse_();

    // We don't do anything with data messages, just kick them up a level
    this.onMessage_(message);
  };

  onPrimaryResponse_() {
    if (!this.isHealthy_) {
      this.primaryResponsesRequired_--;
      if (this.primaryResponsesRequired_ <= 0) {
        this.log_('Primary connection is healthy.');
        this.isHealthy_ = true;
        this.conn_.markConnectionHealthy();
      }
    }
  };

  onControl_(controlData) {
    var cmd = requireKey(MESSAGE_TYPE, controlData);
    if (MESSAGE_DATA in controlData) {
      var payload = controlData[MESSAGE_DATA];
      if (cmd === SERVER_HELLO) {
        this.onHandshake_(payload);
      } else if (cmd === END_TRANSMISSION) {
        this.log_('recvd end transmission on primary');
        this.rx_ = this.secondaryConn_;
        for (var i = 0; i < this.pendingDataMessages.length; ++i) {
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
  onHandshake_(handshake) {
    var timestamp = handshake['ts'];
    var version = handshake['v'];
    var host = handshake['h'];
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

  tryStartUpgrade_() {
    var conn = this.transportManager_.upgradeTransport();
    if (conn) {
      this.startUpgrade_(conn);
    }
  };

  startUpgrade_(conn) {
    this.secondaryConn_ = new conn(this.nextTransportId_(),
      this.repoInfo_, this.sessionId);
    // For certain transports (WebSockets), we need to send and receive several messages back and forth before we
    // can consider the transport healthy.
    this.secondaryResponsesRequired_ = conn['responsesRequiredToBeHealthy'] || 0;

    var onMessage = this.connReceiver_(this.secondaryConn_);
    var onDisconnect = this.disconnReceiver_(this.secondaryConn_);
    this.secondaryConn_.open(onMessage, onDisconnect);

    // If we haven't successfully upgraded after UPGRADE_TIMEOUT, give up and kill the secondary.
    var self = this;
    setTimeoutNonBlocking(function() {
      if (self.secondaryConn_) {
        self.log_('Timed out trying to upgrade.');
        self.secondaryConn_.close();
      }
    }, Math.floor(UPGRADE_TIMEOUT));
  };

  onReset_(host) {
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

  onConnectionEstablished_(conn, timestamp) {
    this.log_('Realtime connection established.');
    this.conn_ = conn;
    this.state_ = REALTIME_STATE_CONNECTED;

    if (this.onReady_) {
      this.onReady_(timestamp, this.sessionId);
      this.onReady_ = null;
    }

    var self = this;
    // If after 5 seconds we haven't sent enough requests to the server to get the connection healthy,
    // send some pings.
    if (this.primaryResponsesRequired_ === 0) {
      this.log_('Primary connection is healthy.');
      this.isHealthy_ = true;
    } else {
      setTimeoutNonBlocking(function() {
        self.sendPingOnPrimaryIfNecessary_();
      }, Math.floor(DELAY_BEFORE_SENDING_EXTRA_REQUESTS));
    }
  };

  sendPingOnPrimaryIfNecessary_() {
    // If the connection isn't considered healthy yet, we'll send a noop ping packet request.
    if (!this.isHealthy_ && this.state_ === REALTIME_STATE_CONNECTED)
    {
        this.log_('sending ping on primary.');
        this.sendData_({'t': 'c', 'd': {'t': PING, 'd': {} }});
    }
  };

  onSecondaryConnectionLost_() {
    var conn = this.secondaryConn_;
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
  onConnectionLost_(everConnected) {
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
  onConnectionShutdown_(reason) {
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


  sendData_(data) {
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
  closeConnections_() {
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
};

