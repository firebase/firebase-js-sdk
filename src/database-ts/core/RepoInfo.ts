import { assert } from "../../utils/assert";
import { forEach } from "../../utils/obj";
import { PersistentStorage } from './storage/storage';
import { CONSTANTS } from "../realtime/constants";
/**
 * A class that holds metadata about a Repo object
 * @param {string} host Hostname portion of the url for the repo
 * @param {boolean} secure Whether or not this repo is accessed over ssl
 * @param {string} namespace The namespace represented by the repo
 * @param {boolean} webSocketOnly Whether to prefer websockets over all other transports (used by Nest).
 * @param {string=} persistenceKey Override the default session persistence storage key
 * @constructor
 */
export class RepoInfo {
  host
  domain
  secure
  namespace
  webSocketOnly
  persistenceKey
  internalHost

  constructor(host, secure, namespace, webSocketOnly, persistenceKey?) {
    this.host = host.toLowerCase();
    this.domain = this.host.substr(this.host.indexOf('.') + 1);
    this.secure = secure;
    this.namespace = namespace;
    this.webSocketOnly = webSocketOnly;
    this.persistenceKey = persistenceKey || '';
    this.internalHost = PersistentStorage.get('host:' + host) || this.host;
  }
  needsQueryParam() {
    return this.host !== this.internalHost;
  };

  isCacheableHost() {
    return this.internalHost.substr(0, 2) === 's-';
  };

  isDemoHost() {
    return this.domain === 'firebaseio-demo.com';
  };

  isCustomHost() {
    return this.domain !== 'firebaseio.com' && this.domain !== 'firebaseio-demo.com';
  };

  updateHost(newHost) {
    if (newHost !== this.internalHost) {
      this.internalHost = newHost;
      if (this.isCacheableHost()) {
        PersistentStorage.set('host:' + this.host, this.internalHost);
      }
    }
  };

  /**
   * Returns the websocket URL for this repo
   * @param {string} type of connection
   * @param {Object} params list
   * @return {string} The URL for this repo
   */
  connectionURL(type, params) {
    assert(typeof type === 'string', 'typeof type must == string');
    assert(typeof params === 'object', 'typeof params must == object');
    var connURL;
    if (type === CONSTANTS.WEBSOCKET) {
      connURL = (this.secure ? 'wss://' : 'ws://') + this.internalHost + '/.ws?';
    } else if (type === CONSTANTS.LONG_POLLING) {
      connURL = (this.secure ? 'https://' : 'http://') + this.internalHost + '/.lp?';
    } else {
      throw new Error('Unknown connection type: ' + type);
    }
    if (this.needsQueryParam()) {
      params['ns'] = this.namespace;
    }

    var pairs = [];

    forEach(params, function(element, index, obj) {
      pairs.push(index + '=' + element);
    });

    return connURL + pairs.join('&');
  };

  /** @return {string} */
  toString() {
    var str = this.toURLString();
    if (this.persistenceKey) {
      str += '<' + this.persistenceKey + '>';
    }
    return str;
  };

  /** @return {string} */
  toURLString() {
    return (this.secure ? 'https://' : 'http://') + this.host;
  };
}
