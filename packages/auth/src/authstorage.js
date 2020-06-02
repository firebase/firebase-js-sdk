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
 * @fileoverview Defines utilities for session management.
 */

goog.provide('fireauth.authStorage');
goog.provide('fireauth.authStorage.Key');
goog.provide('fireauth.authStorage.Manager');
goog.provide('fireauth.authStorage.Persistence');

goog.require('fireauth.AuthError');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.storage.Factory');
goog.require('fireauth.storage.IndexedDB');
goog.require('fireauth.storage.Storage');
goog.require('fireauth.util');
goog.require('goog.Promise');
goog.require('goog.array');
goog.require('goog.events');
goog.require('goog.object');



/**
 * The namespace for Firebase Auth storage.
 * @private @const {string}
 */
fireauth.authStorage.NAMESPACE_ = 'firebase';


/**
 * The separator for Firebase Auth storage with App ID key.
 * @private @const {string}
 */
fireauth.authStorage.SEPARATOR_ = ':';


/**
 * @const {number} The IE 10 localStorage cross tab synchronization delay in
 *     milliseconds.
 */
fireauth.authStorage.IE10_LOCAL_STORAGE_SYNC_DELAY = 10;


/**
 * Enums for Auth state persistence.
 * @enum {string}
 */
fireauth.authStorage.Persistence = {
  // State will persist even when the browser window is closed or the activity
  // is destroyed in react-native.
  LOCAL: 'local',
  // State is only stored in memory and will be cleared when the window or
  // activity is refreshed.
  NONE: 'none',
  // State will only persist in current session/tab, relevant to web only, and
  // will be cleared when the tab is closed.
  SESSION: 'session'
};


/**
 * Validates that an argument is a valid persistence value. If an invalid type
 * is specified, an error is thrown synchronously.
 * @param {*} arg The argument to validate.
 */
fireauth.authStorage.validatePersistenceArgument =
    function(arg) {
  // Invalid type error.
  var invalidTypeError = new fireauth.AuthError(
      fireauth.authenum.Error.INVALID_PERSISTENCE);
  // Unsupported type error.
  var unsupportedTypeError = new fireauth.AuthError(
      fireauth.authenum.Error.UNSUPPORTED_PERSISTENCE);
  // Check if the persistence type is a valid one.
  // Throw invalid type error if not valid.
  if (!goog.object.containsValue(fireauth.authStorage.Persistence, arg) ||
      // goog.object.containsValue(fireauth.authStorage.Persistence, ['none'])
      // returns true.
      typeof arg !== 'string') {
    throw invalidTypeError;
  }
  // Validate if the specified type is supported in the current environment.
  switch (fireauth.util.getEnvironment()) {
    case fireauth.util.Env.REACT_NATIVE:
      // This is only supported in a browser.
      if (arg === fireauth.authStorage.Persistence.SESSION) {
        throw unsupportedTypeError;
      }
      break;
    case fireauth.util.Env.NODE:
      // Only none is supported in Node.js.
      if (arg !== fireauth.authStorage.Persistence.NONE) {
        throw unsupportedTypeError;
      }
      break;
    case fireauth.util.Env.WORKER:
      // In a worker environment, either LOCAL or NONE are supported.
      // If indexedDB not supported and LOCAL provided, throw an error.
      if (arg === fireauth.authStorage.Persistence.SESSION ||
          (!fireauth.storage.IndexedDB.isAvailable() &&
           arg !== fireauth.authStorage.Persistence.NONE)) {
        throw unsupportedTypeError;
      }
      break;
    case fireauth.util.Env.BROWSER:
    default:
      // This is restricted by what the browser supports.
      if (!fireauth.util.isWebStorageSupported() &&
          arg !== fireauth.authStorage.Persistence.NONE) {
        throw unsupportedTypeError;
      }
      break;
  }
};


/**
 * Storage key metadata.
 * @typedef {{name: string, persistent: !fireauth.authStorage.Persistence}}
 */
fireauth.authStorage.Key;


/**
 * Storage manager.
 * @param {string} namespace The optional namespace.
 * @param {string} separator The optional separator.
 * @param {boolean} safariLocalStorageNotSynced Whether browser has Safari
 *     iframe restriction with storage event triggering but storage not updated.
 * @param {boolean} runsInBackground Whether browser can detect storage event
 *     when it had already been pushed to the background. This may happen in
 *     some mobile browsers. A localStorage change in the foreground window
 *     will not be detected in the background window via the storage event.
 *     This was detected in iOS 7.x mobile browsers.
 * @param {boolean} webStorageSupported Whether browser web storage is
 *     supported.
 * @constructor @struct @final
 */
fireauth.authStorage.Manager = function(
    namespace,
    separator,
    safariLocalStorageNotSynced,
    runsInBackground,
    webStorageSupported) {
  /** @const @private {string} Storage namespace. */
  this.namespace_ = namespace;
  /** @const @private {string} Storage namespace key separator. */
  this.separator_ = separator;
  /**
   * @const @private {boolean} Whether browser has Safari iframe restriction
   *     with storage event triggering but storage not updated.
   */
  this.safariLocalStorageNotSynced_ = safariLocalStorageNotSynced;
  /**
   *  @private {boolean} Whether browser can detect storage event when it
   *     had already been pushed to the background. This may happen in some
   *     mobile browsers.
   */
  this.runsInBackground_ = runsInBackground;
  /**  @const @private {boolean} Whether browser web storage is supported. */
  this.webStorageSupported_ = webStorageSupported;

  /**
   * @const @private {!Object.<string, !Array<function()>>} The storage event
   *     key to listeners map.
   */
  this.listeners_ = {};

  var storageFactory = fireauth.storage.Factory.getInstance();
  try {
    /**
     * @private {!fireauth.storage.Storage} Persistence storage.
     */
    this.persistentStorage_ = storageFactory.makePersistentStorage();
  } catch (e) {
    // Default to in memory storage if the preferred persistent storage is not
    // supported.
    this.persistentStorage_ = storageFactory.makeInMemoryStorage();
    // Do not use indexedDB fallback.
    this.localStorageNotSynchronized_ = false;
    // Do not set polling functions on window.localStorage.
    this.runsInBackground_ = true;
  }
  try {
    /**
     * @private {!fireauth.storage.Storage} Temporary session storage.
     */
    this.temporaryStorage_ = storageFactory.makeTemporaryStorage();
  } catch (e) {
    // Default to in memory storage if the preferred temporary storage is not
    // supported. This should be a different in memory instance as the
    // persistent storage, since the same key could be available for both types
    // of storage.
    this.temporaryStorage_ = storageFactory.makeInMemoryStorage();
  }
  /**
   * @private {!fireauth.storage.Storage} In memory storage.
   */
  this.inMemoryStorage_ = storageFactory.makeInMemoryStorage();

  /**
   * @const @private {function(!goog.events.BrowserEvent)|
   *                  function(!Array<string>)} Storage change handler.
   */
  this.storageChangeEventHandler_ = goog.bind(this.storageChangeEvent_, this);
  /** @private {!Object.<string, *>} Local map for localStorage. */
  this.localMap_ = {};
};


/**
 * @return {!fireauth.authStorage.Manager} The default Auth storage manager
 *     instance.
 */
fireauth.authStorage.Manager.getInstance = function() {
  // Creates the default instance for Auth storage maanger.
  if (!fireauth.authStorage.Manager.instance_) {
    /**
     * @private {?fireauth.authStorage.Manager} The default storage manager
     *     instance.
     */
    fireauth.authStorage.Manager.instance_ = new fireauth.authStorage.Manager(
        fireauth.authStorage.NAMESPACE_,
        fireauth.authStorage.SEPARATOR_,
        fireauth.util.isSafariLocalStorageNotSynced(),
        fireauth.util.runsInBackground(),
        fireauth.util.isWebStorageSupported());
  }
  return fireauth.authStorage.Manager.instance_;
};


/** Clears storage manager instances. This is used for testing. */
fireauth.authStorage.Manager.clear = function() {
  fireauth.authStorage.Manager.instance_ = null;
};


/**
 * Returns the storage corresponding to the specified persistence.
 * @param {!fireauth.authStorage.Persistence} persistent The type of storage
 *     persistence.
 * @return {!fireauth.storage.Storage} The corresponding storage instance.
 * @private
 */
fireauth.authStorage.Manager.prototype.getStorage_ = function(persistent) {
  switch (persistent) {
    case fireauth.authStorage.Persistence.SESSION:
      return this.temporaryStorage_;
    case fireauth.authStorage.Persistence.NONE:
      return this.inMemoryStorage_;
    case fireauth.authStorage.Persistence.LOCAL:
    default:
      return this.persistentStorage_;
  }
};


/**
 * Constructs the corresponding storage key name.
 * @param {fireauth.authStorage.Key} dataKey The key under which the value is
 *     stored.
 * @param {?string=} opt_id This ID associates storage values with specific
 *     apps.
 * @return {string} The corresponding key name with namespace prefixed.
 * @private
 */
fireauth.authStorage.Manager.prototype.getKeyName_ = function(dataKey, opt_id) {
  return this.namespace_ + this.separator_ + dataKey.name +
      (opt_id ? this.separator_ + opt_id : '');
};


/**
 * Migrates window.localStorage to the provided persistent storage.
 * @param {fireauth.authStorage.Key} dataKey The key under which the persistent
 *     value is supposed to be stored.
 * @param {?string=} opt_id When operating in multiple app mode, this ID
 *     associates storage values with specific apps.
 * @return {!goog.Promise<void>} A promise that resolves when the data stored
 *     in window.localStorage is migrated to the provided persistent storage
 *     identified by the provided data key.
 */
fireauth.authStorage.Manager.prototype.migrateFromLocalStorage =
    function(dataKey, opt_id) {
  var self = this;
  var key = this.getKeyName_(dataKey, opt_id);
  var storage = this.getStorage_(dataKey.persistent);
  // Get data stored in the default persistent storage identified by dataKey.
  return this.get(dataKey, opt_id).then(function(response) {
    // Get the stored value in window.localStorage if available.
    var oldStorageValue = null;
    try {
      oldStorageValue = fireauth.util.parseJSON(
          goog.global['localStorage']['getItem'](key));
    } catch (e) {
      // Set value as null. This will resolve the promise immediately.
    }
    // If data is stored in window.localStorage but no data is available in
    // default persistent storage, migrate data from window.localStorage to
    // default persistent storage.
    if (oldStorageValue && !response) {
      // This condition may fail in situations where a user opens a tab with
      // an old version while using a tab with a new version, or when a
      // developer switches back and forth between and old and new version of
      // the library.
      goog.global['localStorage']['removeItem'](key);
      // Migrate the value to new default persistent storage.
      return self.set(dataKey, oldStorageValue, opt_id);
    } else if (oldStorageValue &&
               response &&
               storage.type != fireauth.storage.Storage.Type.LOCAL_STORAGE) {
      // Data stored in both localStorage and new persistent storage (eg.
      // indexedDB) for some reason.
      // This could happen if the developer is migrating back and forth.
      // The new default persistent storage (eg. indexedDB) takes precedence.
      goog.global['localStorage']['removeItem'](key);
    }
  });
};


/**
 * Gets the stored value from the corresponding storage.
 * @param {fireauth.authStorage.Key} dataKey The key under which the value is
 *     stored.
 * @param {?string=} opt_id When operating in multiple app mode, this ID
 *     associates storage values with specific apps.
 * @return {!goog.Promise} A Promise that resolves with the stored value.
 */
fireauth.authStorage.Manager.prototype.get = function(dataKey, opt_id) {
  var keyName = this.getKeyName_(dataKey, opt_id);
  return this.getStorage_(dataKey.persistent).get(keyName);
};


/**
 * Removes the stored value from the corresponding storage.
 * @param {fireauth.authStorage.Key} dataKey The key under which the value is
 *     stored.
 * @param {?string=} opt_id When operating in multiple app mode, this ID
 *     associates storage values with specific apps.
 * @return {!goog.Promise<void>} A Promise that resolves when the operation is
 *     completed.
 */
fireauth.authStorage.Manager.prototype.remove = function(dataKey, opt_id) {
  var keyName = this.getKeyName_(dataKey, opt_id);
  // Keep local map up to date for requested key if persistent storage is used.
  if (dataKey.persistent == fireauth.authStorage.Persistence.LOCAL) {
    this.localMap_[keyName] = null;
  }
  return this.getStorage_(dataKey.persistent).remove(keyName);
};


/**
 * Stores the value in the corresponding storage.
 * @param {fireauth.authStorage.Key} dataKey The key under which the value is
 *     stored.
 * @param {*} value The value to be stored.
 * @param {?string=} opt_id When operating in multiple app mode, this ID
 *     associates storage values with specific apps.
 * @return {!goog.Promise<void>} A Promise that resolves when the operation is
 *     completed.
 */
fireauth.authStorage.Manager.prototype.set = function(dataKey, value, opt_id) {
  var keyName = this.getKeyName_(dataKey, opt_id);
  var self = this;
  var storage = this.getStorage_(dataKey.persistent);
  return storage.set(keyName, value)
      .then(function() {
        return storage.get(keyName);
      })
      .then(function(serializedValue) {
        // Keep local map up to date for requested key if persistent storage is
        // used.
        if (dataKey.persistent == fireauth.authStorage.Persistence.LOCAL) {
          self.localMap_[keyName] = serializedValue;
        }
      });
};


/**
 * @param {fireauth.authStorage.Key} dataKey The key under which the value is
 *     stored.
 * @param {?string} id When operating in multiple app mode, this ID associates
 *     storage values with specific apps.
 * @param {function()} listener The callback listener to run on storage event
 *     related to key.
 */
fireauth.authStorage.Manager.prototype.addListener =
    function(dataKey, id, listener) {
  var key = this.getKeyName_(dataKey, id);
  // Initialize local map for current key if web storage is supported.
  if (this.webStorageSupported_) {
    this.localMap_[key] = goog.global['localStorage']['getItem'](key);
  }
  if (goog.object.isEmpty(this.listeners_)) {
    // Start listeners.
    this.startListeners_();
  }
  if (!this.listeners_[key]) {
    this.listeners_[key] = [];
  }
  this.listeners_[key].push(listener);
};


/**
 * @param {fireauth.authStorage.Key} dataKey The key under which the value is
 *     stored.
 * @param {?string} id When operating in multiple app mode, this ID associates
 *     storage values with specific apps.
 * @param {function()} listener The listener to remove.
 */
fireauth.authStorage.Manager.prototype.removeListener =
    function(dataKey, id, listener) {
  var key = this.getKeyName_(dataKey, id);
  if (this.listeners_[key]) {
    goog.array.removeAllIf(
        this.listeners_[key],
        function(ele) {
          return ele == listener;
        });
    if (this.listeners_[key].length == 0) {
      delete this.listeners_[key];
    }
  }
  if (goog.object.isEmpty(this.listeners_)) {
    // Stop listeners.
    this.stopListeners_();
  }
};


/**
 * The delay to wait between continuous checks of localStorage on browsers where
 * tabs do not run in the background. After each interval wait, we check for
 * external changes in localStorage that were not detected in the current tab.
 * @const {number}
 * @private
 */
fireauth.authStorage.Manager.LOCAL_STORAGE_POLLING_TIMER_ = 1000;


/**
 * Starts all storage event listeners.
 * @private
 */
fireauth.authStorage.Manager.prototype.startListeners_ = function() {
  this.getStorage_(fireauth.authStorage.Persistence.LOCAL)
      .addStorageListener(this.storageChangeEventHandler_);
  // TODO: refactor this implementation to be handled by the underlying
  // storage mechanism.
  if (!this.runsInBackground_ &&
      // Add an exception for browsers that persist storage with indexedDB, we
      // should stick with indexedDB listener implementation in that case.
      !fireauth.util.persistsStorageWithIndexedDB() &&
      // Confirm browser web storage is supported as polling relies on it.
      this.webStorageSupported_) {
    this.startManualListeners_();
  }
};

/**
 * Starts manual polling function to detect storage event changes.
 * @private
 */
fireauth.authStorage.Manager.prototype.startManualListeners_ = function() {
  var self = this;
  this.stopManualListeners_();
  /** @private {?number} The interval timer for manual storage checking. */
  this.manualListenerTimer_ = setInterval(function() {
    // Check all keys with listeners on them.
    for (var key in self.listeners_) {
      // Get value from localStorage.
      var currentValue = goog.global['localStorage']['getItem'](key);
      var oldValue = self.localMap_[key];
      // If local map value does not match, trigger listener with storage event.
      if (currentValue != oldValue) {
        self.localMap_[key] = currentValue;
        var event = new goog.events.BrowserEvent(/** @type {!Event} */ ({
          type: 'storage',
          key: key,
          target: window,
          oldValue: oldValue,
          newValue: currentValue,
          // Differentiate this simulated event from the real storage event.
          poll: true
        }));
        self.storageChangeEvent_(event);
      }
    }
  }, fireauth.authStorage.Manager.LOCAL_STORAGE_POLLING_TIMER_);
};


/**
 * Stops manual polling function to detect storage event changes.
 * @private
 */
fireauth.authStorage.Manager.prototype.stopManualListeners_ = function() {
  if (this.manualListenerTimer_) {
    clearInterval(this.manualListenerTimer_);
    this.manualListenerTimer_ = null;
  }
};


/**
 * Stops all storage event listeners.
 * @private
 */
fireauth.authStorage.Manager.prototype.stopListeners_ = function() {
  this.getStorage_(fireauth.authStorage.Persistence.LOCAL)
      .removeStorageListener(this.storageChangeEventHandler_);
  this.stopManualListeners_();
};


/**
 * @param {!goog.events.BrowserEvent|!Array<string>} data The storage event
 *     triggered or the array of keys modified.
 * @private
 */
fireauth.authStorage.Manager.prototype.storageChangeEvent_ = function(data) {
  if (data && data.getBrowserEvent) {
    var event = /** @type {!goog.events.BrowserEvent} */ (data);
    var key = event.getBrowserEvent().key;
    // Key would be null in some situations, like when localStorage is cleared
    // from the browser developer tools.
    if (key == null) {
      // For all keys of interest.
      for (var keyName in this.listeners_) {
        // Check if something changed in this key's real value.
        var storedValue = this.localMap_[keyName];
        // localStorage returns null when a field is not found.
        if (typeof storedValue === 'undefined') {
          storedValue = null;
        }
        var realValue = goog.global['localStorage']['getItem'](keyName);
        if (realValue !== storedValue) {
          // Update local map with real value.
          this.localMap_[keyName] = realValue;
          // Trigger that key's listener.
          this.callListeners_(keyName);
        }
      }
      return;
    }
    // Check if the key is Firebase Auth related, otherwise ignore.
    if (key.indexOf(this.namespace_ + this.separator_) != 0 ||
        // Ignore keys that have no listeners.
        !this.listeners_[key]) {
      return;
    }
    // Check the mechanism how this event was detected.
    // The first event will dictate the mechanism to be used.
    // Do not use hasOwnProperty('poll') as poll gets obfuscated.
    if (typeof event.getBrowserEvent().poll !== 'undefined') {
      // Environment detects storage changes via polling.
      // Remove storage event listener to prevent possible event duplication.
      this.getStorage_(fireauth.authStorage.Persistence.LOCAL)
          .removeStorageListener(this.storageChangeEventHandler_);
    } else {
      // Environment detects storage changes via storage event listener.
      // Remove polling listener to prevent possible event duplication.
      this.stopManualListeners_();
    }
    // Safari embedded iframe. Storage event will trigger with the delta changes
    // but no changes will be applied to the iframe localStorage.
    if (this.safariLocalStorageNotSynced_) {
      // Get current iframe page value, old value and new value.
      var currentValue = goog.global['localStorage']['getItem'](key);
      var newValue = event.getBrowserEvent().newValue;
      // Value not synchronized, synchronize manually.
      if (newValue !== currentValue) {
        if (newValue !== null) {
          // Value changed from current value.
          goog.global['localStorage']['setItem'](key, newValue);
        } else {
          // Current value deleted.
          goog.global['localStorage']['removeItem'](key);
        }
      } else {
        // Already detected and processed, do not trigger listeners again.
        if (this.localMap_[key] === newValue &&
            // Real storage event.
            typeof event.getBrowserEvent().poll === 'undefined') {
          return;
        }
      }
    }
    var self = this;
    var triggerListeners = function() {
      // Keep local map up to date in case storage event is triggered before
      // poll.
      if (typeof event.getBrowserEvent().poll === 'undefined' &&
          self.localMap_[key] === goog.global['localStorage']['getItem'](key)) {
        // Real storage event which has already been detected, do nothing.
        // This seems to trigger in some IE browsers for some reason.
        return;
      }
      self.localMap_[key] = goog.global['localStorage']['getItem'](key);
      self.callListeners_(key);
    };
    if (fireauth.util.isIe10() &&
        goog.global['localStorage']['getItem'](key) !==
        event.getBrowserEvent().newValue &&
        event.getBrowserEvent().newValue !== event.getBrowserEvent().oldValue) {
      // IE 10 has this weird bug where a storage event would trigger with the
      // correct key, oldValue and newValue but localStorage.getItem(key) does
      // not yield the updated value until a few milliseconds. This ensures this
      // recovers from that situation.
      setTimeout(
          triggerListeners, fireauth.authStorage.IE10_LOCAL_STORAGE_SYNC_DELAY);
    } else {
      triggerListeners();
    }
  } else {
    var keys = /** @type {!Array<string>} */ (data);
    goog.array.forEach(keys, goog.bind(this.callListeners_, this));
  }
};


/**
 * Calls all listeners for specified storage event key.
 * @param {string} key The storage event key whose listeners are to be run.
 * @private
 */
fireauth.authStorage.Manager.prototype.callListeners_ = function(key) {
  if (this.listeners_[key]) {
    goog.array.forEach(
        this.listeners_[key],
        function(listener) {
          listener();
        });
  }
};
