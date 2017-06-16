/**
 *
 * @param {string} connId An identifier for this connection, used for logging
 * @param {fb.core.RepoInfo} repoInfo The info for the endpoint to send data to.
 * @param {string=} sessionId Optional sessionId if we're connecting to an existing session
 * @interface
 */
export const Transport = function(connId, repoInfo, sessionId) {};

/**
 * @param {function(Object)} onMessage Callback when messages arrive
 * @param {function()} onDisconnect Callback with connection lost.
 */
Transport.prototype.open = function(onMessage, onDisconnect) {};

Transport.prototype.start = function() {};

Transport.prototype.close = function() {};

/**
 * @param {!Object} data The JSON data to transmit
 */
Transport.prototype.send = function(data) {};

/**
 * Bytes received since connection started.
 * @type {number}
 */
Transport.prototype.bytesReceived;

/**
 * Bytes sent since connection started.
 * @type {number}
 */
Transport.prototype.bytesSent;
