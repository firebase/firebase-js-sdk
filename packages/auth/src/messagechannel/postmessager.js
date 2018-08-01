/**
 * @fileoverview Defines the PostMessager interface needed for the
 * `fireauth.messagechannel.Sender`, in addition to 2 types of implementations.
 */

goog.provide('fireauth.messagechannel.PostMessager');
goog.provide('fireauth.messagechannel.WindowPostMessager');
goog.provide('fireauth.messagechannel.WorkerClientPostMessager');


/**
 * This is the interface defining the postMessage format of a window which
 * takes an additional second parameter for target origin.
 *
 * @typedef {{
 *   postMessage: function(*, string, !Array<!Transferable>)
 * }}
 */
fireauth.messagechannel.Window;


/**
 * This is the interface defining the postMessage format of a worker or
 * ServiceWorkerClient, etc. which just takes a message and a list of
 * Transferables.
 *
 * @typedef {{
 *   postMessage: function(*, !Array<!Transferable>)
 * }}
 */
fireauth.messagechannel.WorkerClient;


/**
 * Defines a common interface to postMessage data to a specified PostMessager.
 * @interface
 */
fireauth.messagechannel.PostMessager = function() {};


/**
 * Sends a message to the specified context.
 * @param {*} message The message to send.
 * @param {!Array<!Transferable>} transfer The list of `Transferable` objects
 *     that are transferred with the message. The ownsership fo these objects is
 *     given to the destination side and they are no longer usable on the
 *     sending side.
 */
fireauth.messagechannel.PostMessager.prototype.postMessage =
    function(message, transfer) {};



/**
 * Defines the implementation for postMessaging to a window context.
 * @param {!fireauth.messagechannel.Window} win The window PostMessager.
 * @param {?string=} opt_targetOrigin The target origin.
 * @constructor
 * @implements {fireauth.messagechannel.PostMessager}
 */
fireauth.messagechannel.WindowPostMessager = function(win, opt_targetOrigin) {
  /**
   * @const @private {!fireauth.messagechannel.Window} The window PostMessager.
   */
  this.win_ = win;
  /** @const @private {string} The postMessage target origin. */
  this.targetOrigin_ = opt_targetOrigin || '*';
};


/**
 * Sends a message to the specified window context.
 * @param {*} message The message to send.
 * @param {!Array<!Transferable>} transfer The list of `Transferable` objects
 *     that are transferred with the message. The ownsership fo these objects is
 *     given to the destination side and they are no longer usable on the
 *     sending side.
 * @override
 */
fireauth.messagechannel.WindowPostMessager.prototype.postMessage =
    function(message, transfer) {
  this.win_.postMessage(message, this.targetOrigin_, transfer);
};


/**
 * Defines the implementation for postMessaging to a worker/client context.
 * @param {!fireauth.messagechannel.WorkerClient} worker The worker/client
 *     PostMessager.
 * @constructor
 * @implements {fireauth.messagechannel.PostMessager}
 */
fireauth.messagechannel.WorkerClientPostMessager = function(worker) {
  /**
   * @const @private {!fireauth.messagechannel.WorkerClient} The worker/client
   *     PostMessager.
   */
  this.worker_ = worker;
};


/**
 * Sends a message to the specified worker/client context.
 * @param {*} message The message to send.
 * @param {!Array<!Transferable>} transfer The list of `Transferable` objects
 *     that are transferred with the message. The ownsership fo these objects is
 *     given to the destination side and they are no longer usable on the
 *     sending side.
 * @override
 */
fireauth.messagechannel.WorkerClientPostMessager.prototype.postMessage =
    function(message, transfer) {
  this.worker_.postMessage(message, transfer);
};
