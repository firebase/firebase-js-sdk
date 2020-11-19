/**
 * @license
 * Copyright 2017 Google LLC
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

/** @type {string|boolean|undefined} */
goog.net.WebChannel.Options.messageContentType;

/** @type {Object<string, string>|undefined|undefined} */
goog.net.WebChannel.Options.messageUrlParams;

/** @type {boolean|undefined} */
goog.net.WebChannel.Options.clientProtocolHeaderRequired;

/** @type {number|undefined} */
goog.net.WebChannel.Options.concurrentRequestLimit;

/** @type {boolean|undefined} */
goog.net.WebChannel.Options.supportsCrossDomainXhr;

/** @type {boolean|undefined} */
goog.net.WebChannel.Options.sendRawJson;

/** @type {string|undefined} */
goog.net.WebChannel.Options.httpSessionIdParam;

/** @type {string|undefined} */
goog.net.WebChannel.Options.httpHeadersOverwriteParam;

goog.net.WebChannel.Options.backgroundChannelTest;

/** @type {boolean|undefined} */
goog.net.WebChannel.Options.fastHandshake;

/** @type {!Object<string, boolean|number>|undefined} */
goog.net.WebChannel.Options.internalChannelParams;

/** @type {boolean|undefined} */
goog.net.WebChannel.Options.forceLongPolling;

/** @type {boolean|undefined} */
goog.net.WebChannel.Options.detectBufferingProxy;

goog.labs.net.webChannel.requestStats.Event = {};
goog.labs.net.webChannel.requestStats.Event.STAT_EVENT;

goog.labs.net.webChannel.requestStats.StatEvent = {};
goog.labs.net.webChannel.requestStats.StatEvent.stat;

goog.labs.net.webChannel.requestStats.Stat = {};
goog.labs.net.webChannel.requestStats.Stat.PROXY;
goog.labs.net.webChannel.requestStats.Stat.NOPROXY;
