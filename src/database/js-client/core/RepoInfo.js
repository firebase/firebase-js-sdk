/**
* Copyright 2017 Google Inc.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
goog.provide('fb.core.RepoInfo');
goog.require('fb.core.storage');

/**
 * A class that holds metadata about a Repo object
 * @param {string} host Hostname portion of the url for the repo
 * @param {boolean} secure Whether or not this repo is accessed over ssl
 * @param {string} namespace The namespace represented by the repo
 * @param {boolean} webSocketOnly Whether to prefer websockets over all other transports (used by Nest).
 * @param {string=} persistenceKey Override the default session persistence storage key
 * @constructor
 */
fb.core.RepoInfo = function(host, secure, namespace, webSocketOnly, persistenceKey) {
  this.host = host.toLowerCase();
  this.domain = this.host.substr(this.host.indexOf('.') + 1);
  this.secure = secure;
  this.namespace = namespace;
  this.webSocketOnly = webSocketOnly;
  this.persistenceKey = persistenceKey || '';
  this.internalHost = fb.core.storage.PersistentStorage.get('host:' + host) || this.host;
};

fb.core.RepoInfo.prototype.needsQueryParam = function() {
  return this.host !== this.internalHost;
};

fb.core.RepoInfo.prototype.isCacheableHost = function() {
  return this.internalHost.substr(0, 2) === 's-';
};

fb.core.RepoInfo.prototype.isDemoHost = function() {
  return this.domain === 'firebaseio-demo.com';
};

fb.core.RepoInfo.prototype.isCustomHost = function() {
  return this.domain !== 'firebaseio.com' && this.domain !== 'firebaseio-demo.com';
};

fb.core.RepoInfo.prototype.updateHost = function(newHost) {
  if (newHost !== this.internalHost) {
    this.internalHost = newHost;
    if (this.isCacheableHost()) {
      fb.core.storage.PersistentStorage.set('host:' + this.host, this.internalHost);
    }
  }
};


/**
 * Returns the websocket URL for this repo
 * @param {string} type of connection
 * @param {Object} params list
 * @return {string} The URL for this repo
 */
fb.core.RepoInfo.prototype.connectionURL = function(type, params) {
  fb.core.util.assert(typeof type === 'string', 'typeof type must == string');
  fb.core.util.assert(typeof params === 'object', 'typeof params must == object');
  var connURL;
  if (type === fb.realtime.Constants.WEBSOCKET) {
    connURL = (this.secure ? 'wss://' : 'ws://') + this.internalHost + '/.ws?';
  } else if (type === fb.realtime.Constants.LONG_POLLING) {
    connURL = (this.secure ? 'https://' : 'http://') + this.internalHost + '/.lp?';
  } else {
    throw new Error('Unknown connection type: ' + type);
  }
  if (this.needsQueryParam()) {
    params['ns'] = this.namespace;
  }

  var pairs = [];

  goog.object.forEach(params, function(element, index, obj) {
    pairs.push(index + '=' + element);
  });

  return connURL + pairs.join('&');
};

/** @return {string} */
fb.core.RepoInfo.prototype.toString = function() {
  var str = this.toURLString();
  if (this.persistenceKey) {
    str += '<' + this.persistenceKey + '>';
  }
  return str;
};

/** @return {string} */
fb.core.RepoInfo.prototype.toURLString = function() {
  return (this.secure ? 'https://' : 'http://') + this.host;
};
