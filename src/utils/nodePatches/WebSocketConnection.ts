import { WebSocketConnection } from "../../database/realtime/WebSocketConnection";
import { Client as WebSocketImpl } from "faye-websocket";
import { PersistentStorage } from '../../database/core/storage/storage';
import { CONSTANTS as ENV_CONSTANTS } from "../../utils/constants";
import { CONSTANTS } from "../../database/realtime/Constants";
import firebase from "../../app";

/**
 * @param onMessage Callback when messages arrive
 * @param onDisconnect Callback with connection lost.
 */
WebSocketConnection.prototype.open = function(onMessage: (msg: Object) => any, onDisconnect: () => any) {
  this.onDisconnect = onDisconnect;
  this.onMessage = onMessage;

  this.log_('Websocket connecting to ' + this.connURL);

  this.everConnected_ = false;
  // Assume failure until proven otherwise.
  PersistentStorage.set('previous_websocket_failure', true);

  try {
    const device = ENV_CONSTANTS.NODE_ADMIN ? 'AdminNode' : 'Node';
    // UA Format: Firebase/<wire_protocol>/<sdk_version>/<platform>/<device>
    const options = {
      'headers': {
        'User-Agent': `Firebase/${CONSTANTS.PROTOCOL_VERSION}/${firebase.SDK_VERSION}/${process.platform}/${device}`
    }};

    // Plumb appropriate http_proxy environment variable into faye-websocket if it exists.
    const env = process['env'];
    const proxy = (this.connURL.indexOf("wss://") == 0)
        ? (env['HTTPS_PROXY'] || env['https_proxy'])
        : (env['HTTP_PROXY']  || env['http_proxy']);

    if (proxy) {
      options['proxy'] = { origin: proxy };
    }

    this.mySock = new WebSocketImpl(this.connURL, [], options);
  } catch (e) {
    this.log_('Error instantiating WebSocket.');
    const error = e.message || e.data;
    if (error) {
      this.log_(error);
    }
    this.onClosed_();
    return;
  }

  this.mySock.onopen = () => {
    this.log_('Websocket connected.');
    this.everConnected_ = true;
  };

  this.mySock.onclose = () => {
    this.log_('Websocket connection was disconnected.');
    this.mySock = null;
    this.onClosed_();
  };

  this.mySock.onmessage = (m) => {
    this.handleIncomingFrame(m);
  };

  this.mySock.onerror = (e) => {
    this.log_('WebSocket error.  Closing connection.');
    const error = e.message || e.data;
    if (error) {
      this.log_(error);
    }
    this.onClosed_();
  };
}