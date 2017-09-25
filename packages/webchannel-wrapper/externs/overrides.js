/**
 * Overrides for the goog.net.WebChannel.Options object provided
 * by closure-library. This prevents the mangling of these properties
 * so downstream clients can properly leverage the API
 */

/** @record @suppress {duplicate} */
goog.net.WebChannel.Options = {};

/** @type {Object<string, string>|undefined} */
goog.net.WebChannel.Options.messageHeaders;

/** @type {Object<string, string>|undefined} */
goog.net.WebChannel.Options.initMessageHeaders;

/** @type {stringboolean|undefined} */
goog.net.WebChannel.Options.messageContentType;

/** @type {Object<string, string>|undefined|undefined} */
goog.net.WebChannel.Options.messageUrlParams;

/** @type {boolean|undefined} */
goog.net.WebChannel.Options.clientProtocolHeaderRequired;

/** @type {number|undefined} */
goog.net.WebChannel.Options.concurrentRequestLimit;

/** @type {boolean|undefined} */
goog.net.WebChannel.Options.supportsCrossDomainXhr;

/** @type {string|undefined} */
goog.net.WebChannel.Options.testUrl;

/** @type {boolean|undefined} */
goog.net.WebChannel.Options.sendRawJson;

/** @type {string|undefined} */
goog.net.WebChannel.Options.httpSessionIdParam;

/** @type {string|undefined} */
goog.net.WebChannel.Options.httpHeadersOverwriteParam;

/** @type {boolean|undefined} */
goog.net.WebChannel.Options.backgroundChannelTest;

/** @type {boolean|undefined} */
goog.net.WebChannel.Options.fastHandshake;
