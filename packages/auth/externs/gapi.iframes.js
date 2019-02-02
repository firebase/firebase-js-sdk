/**
 * @license
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

/**
 * @fileoverview Provide gapi.iframes public api.
 *
 * @externs
 */


var gapi = {};

/**
 * Namespace associated with gapi iframes API.
 * @const
 */
gapi.iframes = {};

/**
 * Type for options bag for create and open functions.
 * Please use gapix.iframes.Options to construct the options.
 * (See javascript/abc/iframes/api/options.js)
 * @typedef {Object<string, *>}
 **/
gapi.iframes.OptionsBag;

/**
 * Type of iframes filter function.
 * @typedef {function(gapi.iframes.Iframe):boolean}
 **/
gapi.iframes.IframesFilter;

/**
 * Message handlers type. The iframe the message came from is passed in as
 * 'this'. The handler can return any value or a Promise for an async response.
 * @typedef {function(this:gapi.iframes.Iframe, *,
 *     !gapi.iframes.Iframe): (*|Thenable)}
 **/
gapi.iframes.MessageHandler;

/**
 * Sent message callback function type.
 * @typedef {function(Array<*>)}
 **/
gapi.iframes.SendCallback;

/**
 * Style function which processes an open request parameter set.
 * It can create the new iframe container and style it,
 * and update the open request parameters accordingly.
 * It can add message handlers to support style specific behavior.
 * @typedef {function(gapi.iframes.OptionsBag)}
 */
gapi.iframes.StyleHandler;

/**
 * Message filter handler type.
 * @typedef {function(this:gapi.iframes.Iframe, *):
 *     (boolean|IThenable<boolean>)}
 **/
gapi.iframes.RpcFilter;

/**
 * Create a new iframe, pass abc context.
 * @param {string} url the url for the opened iframe.
 * @param {Element} whereToPut the location to put the new iframe.
 * @param {gapi.iframes.OptionsBag=} opt_options extra options for the iframe.
 * @return {Element} the new iframe dom element.
 */
gapi.iframes.create = function(url, whereToPut, opt_options) {};

/**
 * Class to handle the iframes context.
 * This contains info about the current iframe - parent, pub/sub etc.
 * In most cases there will be one object for this (selfContext),
 * but for controller iframe, separate object will be created for
 * each controlled iframe.
 * @param {gapi.iframes.OptionsBag=} opt_options Context override options.
 * @constructor
 */
gapi.iframes.Context = function(opt_options) {};

/**
 * Get the default context for current frame.
 * @return {gapi.iframes.Context} The current context.
 */
gapi.iframes.getContext = function() {};

/**
 * Implement an iframes filter to check same origin connection.
 * @param {gapi.iframes.Iframe} iframe - The iframe to check for same
 *      origin as current context.
 * @return {boolean} true if the iframe has same domain has the context.
 */
gapi.iframes.SAME_ORIGIN_IFRAMES_FILTER = function(iframe) {};

/**
 * Implement a filter that accept any iframe.
 * This should be used only if the message handler sanitize the data,
 * and the code that use it must go through security review.
 * @param {gapi.iframes.Iframe} iframe The iframe to check.
 * @return {boolean} always true.
 */
gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER = function(iframe) {};

/**
 * Create an iframes filter that allow iframes from a list of origins.
 * @param {Array<string>} origins List of allowed origins.
 * @return {gapi.iframes.IframesFilter} New iframes filter that allow,
 *     iframes only from the provided origins.
 */
gapi.iframes.makeWhiteListIframesFilter = function(origins) {};

/**
 * Check if the context was disposed.
 * @return {boolean} True if the context was disposed.
 */
gapi.iframes.Context.prototype.isDisposed = function() {};

/**
 * @return {string} Iframe current page frame name.
 */
gapi.iframes.Context.prototype.getFrameName = function() {};

/**
 * Get the context window object.
 * @return {Window} The window object.
 */
gapi.iframes.Context.prototype.getWindow = function() {};

/**
 * Get context global parameters.
 * @param {string} key Parameter name.
 * @return {*} Parameter value.
 */
gapi.iframes.Context.prototype.getGlobalParam = function(key) {};

/**
 * Set context global parameters.
 * @param {string} key Parameter name.
 * @param {*} value Parameter value.
 */
gapi.iframes.Context.prototype.setGlobalParam = function(key, value) {};

/**
 * Register a new style.
 * @param {string} style The new style name.
 * @param {gapi.iframes.StyleHandler} func The style handler.
 */
gapi.iframes.registerStyle = function(style, func) {};

/**
 * Register a new style to handle options before relaying request.
 * @param {string} style The new style name.
 * @param {gapi.iframes.StyleHandler} func The style handler.
 */
gapi.iframes.registerBeforeOpenStyle = function(style, func) {};

/**
 * Get style hanlder.
 * @param {string} style The new style name.
 * @return {gapi.iframes.StyleHandler} The style handler.
 */
gapi.iframes.getStyle = function(style) {};

/**
 * Get a style hanlder for open options before relaying request.
 * @param {string} style The new style name.
 * @return {gapi.iframes.StyleHandler} The style handler.
 */
gapi.iframes.getBeforeOpenStyle = function(style) {};

/**
 * Open a new child iframe and attach rpc to it.
 * @param {!gapi.iframes.OptionsBag} options Open parameters.
 * @return {!gapi.iframes.Iframe} The new Iframe object.
 */
gapi.iframes.Context.prototype.openChild = function(options) {};

/**
 * Open a new iframe, support relay open to parent or other iframe.
 * @param {!gapi.iframes.OptionsBag} options Open parameters.
 * @param {function(gapi.iframes.Iframe)=} opt_callback Callback to be called.
 *      with the created iframe.
 * @return {!IThenable<gapi.iframes.Iframe>} The created iframe.
 */
gapi.iframes.Context.prototype.open = function(options, opt_callback) {};

/**
 * Get the context parent Iframe if available.
 * (Available if current iframe has an id).
 * @return {gapi.iframes.Iframe} Parent iframe.
 */
gapi.iframes.Context.prototype.getParentIframe = function() {};

/**
 * An Iframe object to represent an iframe that can be communicated with.
 * Use send to send a message to the iframe, and register to set a handler
 * for a message from the iframe.
 * @param {gapi.iframes.Context} context New iframe context.
 * @param {string} rpcAddr rpc routing to the iframe.
 * @param {string} frameName The frame-name the rpc messages are identified by.
 * @param {gapi.iframes.OptionsBag} options Iframe options.
 * @constructor
 */
gapi.iframes.Iframe = function(context, rpcAddr, frameName, options) {};

/**
 * Check if the iframe was disposed.
 * @return {boolean} True if the iframe was disposed.
 */
gapi.iframes.Iframe.prototype.isDisposed = function() {};

/**
 * Get the Iframe context.
 * @return {gapi.iframes.Context} Iframe context.
 */
gapi.iframes.Iframe.prototype.getContext = function() {};

/**
 * Get the Iframe name.
 * @return {string} Iframe frame-name.
 */
gapi.iframes.Iframe.prototype.getFrameName = function() {};

/**
 * @return {string} Iframe id.
 */
gapi.iframes.Iframe.prototype.getId = function() {};

/**
 * Get Iframe parameters.
 * @param {string} key Parameter name.
 * @return {*} Parameter value.
 */
gapi.iframes.Iframe.prototype.getParam = function(key) {};

/**
 * Get Iframe parameters.
 * @param {string} key Parameter name.
 * @param {*} value Parameter value.
 */
gapi.iframes.Iframe.prototype.setParam = function(key, value) {};

/**
 * Register a message handler.
 * The handler should have two parameters: the Iframe object and message data.
 * @param {string} message The message to register for.
 * @param {gapi.iframes.MessageHandler} func Message handler.
 * @param {gapi.iframes.IframesFilter=} opt_filter Optional iframe filter,
 *     Default is same origin filter, which is not used if overridden.
 */
gapi.iframes.Iframe.prototype.register = function(message, func, opt_filter) {};

/**
 * Un-register a message handler.
 * @param {string} message Message to unregister from.
 * @param {gapi.iframes.MessageHandler=} opt_func Optional message handler,
 *     if specified only that handler is unregistered,
 *     otherwise all handlers for the message are unregistered.
 */
gapi.iframes.Iframe.prototype.unregister = function(message, opt_func) {};

/**
 * Send a message to the Iframe.
 * If there is no handler for the message, it will be queued,
 * and the callback will be called only when an handler is registered.
 * @param {string} message Message name.
 * @param {*=} opt_data The data to send to the iframe.
 * @param {gapi.iframes.SendCallback=} opt_callback Callback function to call
 *     with return values of handler for the message (list).
 * @param {gapi.iframes.IframesFilter=} opt_filter Optional iframe filter,
 *     Default is same origin filter, which is not used if overridden.
 * @return {!IThenable<Array>} Array of return values of all handlers.
 */
gapi.iframes.Iframe.prototype.send =
    function(message, opt_data, opt_callback, opt_filter) {};

/**
`* Send a ping to the iframe whcih echo back the optional data.
 * Useful to check if the iframe is responsive/correct.
 * @param {!gapi.iframes.SendCallback} callback Callback function to call
 *     with return values (array of first element echo of opt_data).
 * @param {*=} opt_data The data to send to the iframe.
 * @return {!IThenable<Array>} Array of return values of all handlers.
 */
gapi.iframes.Iframe.prototype.ping = function(callback, opt_data) {};

/**
 * Add iframes api registry.
 * @param {string} apiName The api name.
 * @param {Object<string, gapi.iframes.MessageHandler>} registry
 *     Map of handlers.
 * @param {gapi.iframes.IframesFilter=} opt_filter Optional iframe filter,
 *     Default is same origin filter, which is not used if overridden.
 */
gapi.iframes.registerIframesApi = function(apiName, registry, opt_filter) {};

/**
 * Utility function to build api by adding handler one by one.
 * Should be used on initialization time only
 * (is not applied on already opened iframes).
 * @param {string} apiName The api name.
 * @param {string} message The message name to register an handler for.
 * @param {gapi.iframes.MessageHandler} handler The handler to register.
 */
gapi.iframes.registerIframesApiHandler = function(apiName, message, handler) {};

/**
 * Apply an iframes api on the iframe.
 * @param {string} api Name of the api.
 */
gapi.iframes.Iframe.prototype.applyIframesApi = function(api) {};

/**
 * Get the dom node for the iframe.
 * Return null if the iframe is not a direct child iframe.
 * @return {?Element} the iframe dom node.
 */
gapi.iframes.Iframe.prototype.getIframeEl = function() {};

/**
 * Get the iframe container dom node.
 * The site element can be override by the style when
 * the container of the iframe is more then simple parent.
 * The site element is used as reference when positioning
 * other iframes relative the an iframe.
 * @return {?Element} The iframe container dom node.
 */
gapi.iframes.Iframe.prototype.getSiteEl = function() {};

/**
 * Set the iframe container dom node.
 * Can be used by style code to indicate a more complex dom
 * to contain the iframe.
 * @param {!Element} el The iframe container dom node.
 */
gapi.iframes.Iframe.prototype.setSiteEl = function(el) {};

/**
 * Get the Window object of the remote iframe.
 * It is only supported for same origin iframes, otherwise return null.
 * @return {?Window} The window object for the iframe or null.
 */
gapi.iframes.Iframe.prototype.getWindow = function() {};

/**
 * Get the iframe url origin.
 * @return {string} Iframe url origin.
 */
gapi.iframes.Iframe.prototype.getOrigin = function() {};

/**
 * Send a request to close the iframe.
 * @param {*=} opt_params Optional parameters.
 * @param {gapi.iframes.SendCallback=} opt_callback
 *     Optional callback to indicate close was done or canceled.
 * @return {!IThenable<Array>} Array of return values of all handlers.
 */
gapi.iframes.Iframe.prototype.close = function(opt_params, opt_callback) {};

/**
 * Send a request to change the iframe style.
 * @param {*} styleData Restyle parameters.
 * @param {gapi.iframes.SendCallback=} opt_callback
 *     Optional callback to indicate restyle was done or canceled.
 * @return {!IThenable<Array>} Array of return values of all handlers.
 */
gapi.iframes.Iframe.prototype.restyle = function(styleData, opt_callback) {};

/**
 * Register a handler on relayed open iframe to get restyle status.
 * Called in the context of the opener, to handle style changes events.
 * @param {gapi.iframes.MessageHandler} handler Message handler.
 * @param {gapi.iframes.IframesFilter=} opt_filter Optional iframe filter,
 *     default is same origin filter, which is not used if overridden.
 */
gapi.iframes.Iframe.prototype.registerWasRestyled =
    function(handler, opt_filter) {};

/**
 * Register a callback to be notified on iframe closed.
 * Called in the context of the opener, to handle close event.
 * @param {gapi.iframes.MessageHandler} handler Message handler.
 * @param {gapi.iframes.IframesFilter=} opt_filter Optional iframe filter,
 *   Default is same origin filter, which is not used if overrided.
 */
gapi.iframes.Iframe.prototype.registerWasClosed = function(
    handler, opt_filter) {};

/**
 * Close current iframe (send request to parent).
 * @param {*=} opt_params Optional parameters.
 * @param {function(this:gapi.iframes.Iframe, boolean)=} opt_callback
 *     Optional callback to indicate close was done or canceled.
 * @return {!IThenable<boolean>} True if close request was issued,
 *     false if close was denied.
 */
gapi.iframes.Context.prototype.closeSelf =
    function(opt_params, opt_callback) {};

/**
 * Restyle current iframe (send request to parent).
 * @param {*} styleData Restyle parameters.
 * @param {function(this:gapi.iframes.Iframe, boolean)=} opt_callback
 *     Optional callback to indicate restyle was done or canceled.
 * @return {!IThenable<boolean>} True if restyle request was issued,
 *     false if restyle was denied.
 */
gapi.iframes.Context.prototype.restyleSelf =
    function(styleData, opt_callback) {};

/**
 * Style helper function to indicate current iframe is ready.
 * It send ready both to parent and opener, and register methods on
 * the opener.
 * Adds calculated height of current page if height not provided.
 * @param {Object<string, *>=} opt_params Ready message data.
 * @param {Object<string, gapi.iframes.MessageHandler>=} opt_methods
 *     Map of message handler to register on the opener.
 * @param {gapi.iframes.SendCallback=} opt_callback Ready message callback.
 * @param {gapi.iframes.IframesFilter=} opt_filter Optional iframe filter,
 *     used for sending ready and register provided methods to opener.
 */
gapi.iframes.Context.prototype.ready =
    function(opt_params, opt_methods, opt_callback, opt_filter) {};

/**
 * Provide a filter for close request on current iframe.
 * @param {gapi.iframes.RpcFilter} filter Filter function.
 * @return {undefined}
 */
gapi.iframes.Context.prototype.setCloseSelfFilter = function(filter) {};

/**
 * Provide a filter for restyle request on current iframe.
 * @param {gapi.iframes.RpcFilter} filter Filter function.
 * @return {undefined}
 */
gapi.iframes.Context.prototype.setRestyleSelfFilter = function(filter) {};


/**
 * Connect between two iframes, provide the subject each side
 * is subscribed to.
 * @param {gapi.iframes.OptionsBag} iframe1Data - one side of connection.
 * @param {gapi.iframes.OptionsBag=} opt_iframe2Data - other side of connection.
 * Supported options:
 *  iframe: the iframe to connect to.
 *  role: the role to send to that iframe (optional).
 *  data: the data to send to that iframe (optional).
 *  isReady: indicate that we do not need for ready from the other side.
 */
gapi.iframes.Context.prototype.connectIframes =
    function(iframe1Data, opt_iframe2Data) {};

/**
 * Configure how to handle new connection by role.
 * Provide a filter, list of apis, and callback to be notified on connection.
 * @param {string|gapi.iframes.OptionsBag} optionsOrRole Connection options
 *     object (see gapix.iframes.OnConnectOptions}, or connect role.
 *     Options are preferred, and if provided the next optional params will
 *     be ignored.
 * @param {function(!gapi.iframes.Iframe, Object<*>=)=} opt_handler Callback
 *     for the new connection.
 * @param {Array<string>=} opt_apis List of iframes apis to apply to
 *     connected iframes.
 * @param {gapi.iframes.IframesFilter=} opt_filter Optional iframe filter,
 *     Default is same origin filter, which is not used if overridden.
 */
gapi.iframes.Context.prototype.addOnConnectHandler =
    function(optionsOrRole, opt_handler, opt_apis, opt_filter) {};

/**
 * Remove all on connect handlers for a role.
 * @param {string} role Connection role.
 */
gapi.iframes.Context.prototype.removeOnConnectHandler = function(role) {};

/**
 * Helper function to set handler for the opener connection.
 * @param {function(gapi.iframes.Iframe)} handler Callback for new connection.
 * @param {Array<string>=} opt_apis List of iframes apis to apply to
 *     connected iframes.
 * @param {gapi.iframes.IframesFilter=} opt_filter Optional iframe filter,
 *     Default is same origin filter, which is not used if overridden.
 */
gapi.iframes.Context.prototype.addOnOpenerHandler =
    function(handler, opt_apis, opt_filter) {};
