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
 * @fileoverview Defines the fireauth.storage.UserManager class which provides
 * utilities to retrieve, store and delete the currently logged in user and to
 * listen to external authentication changes for the same app.
 * With the ability to modify Auth state persistence. The behavior is as
 * follows:
 * Common cases:
 * <ul>
 * <li>Initially, local and session storage will be checked and the state will
 *     be loaded from there without changing it unless the developer calls
 *     setPersistence explicitly. The requirement is that at any time, Auth
 *     state can be saved using one type only of persistence and never more than
 *     one.</li>
 * <li>If the developer tries to sign in with no persistence specified, the
 *     default setting will be used (local in a browser).</li>
 * <li>If the user is not signed in and persistence is set, any future sign-in
 *     attempt will use that type of persistence.</li>
 * <li>If the user is signed in and the developer then switches persistence,
 *     that existing signed in user will change persistence to the new one. All
 *     future sign-in attempts will use that same persistence.</li>
 * <li>When signInWithRedirect is called, the current persistence type is passed
 *     along with that request and on redirect back to app will pass that type
 *     to determine how that state is saved (overriding the default). If the
 *     persistence is explicitly specified on that page, it will change that
 *     redirected Auth state persistence. This is the only time the persistence
 *     is passed from one page to another.
 *     So internally, on redirect, the redirect state is retrieved and then we
 *     check: If the persistence was explicitly provided, we override the
 *     previous type and save the Auth state using that. If no persistence was
 *     explicitly provided, we use the previous persistence type that was passed
 *     in the redirect response.</li>
 * </ul>
 * Behavior across tabs:
 * <ul>
 * <li>User can sign in using session storage on multiple tabs. Each tab cannot
 *     see the state of the other tab.</li>
 * <li>Any attempt to sign in using local storage will be detected and
 *     synchronized on all tabs. If the user was previously signed in on a
 *     specific tab using session storage, that state will be cleared.</li>
 * <li>If the user was previously signed in using local storage and then signs
 *     in using session storage, the user will be signed in on the current tab
 *     only and signed out on all other tabs.</li>
 * <li>Similar logic is applied to the ‘none’ state. In one tab, switching to
 *     ‘none’ state will delete any previously saved state in ‘local’
 *     persistence in other tabs.</li>
 * </ul>
 */

goog.provide('fireauth.storage.UserManager');

goog.require('fireauth.AuthUser');
goog.require('fireauth.authStorage');
goog.require('fireauth.constants');
goog.require('goog.Promise');


/**
 * Defines the Auth user storage manager. It provides methods to
 * store, load and delete an authenticated current user. It also provides
 * methods to listen to external user changes (updates, sign in, sign out, etc.)
 * @param {string} appId The Auth state's application ID.
 * @param {?fireauth.authStorage.Manager=} opt_manager The underlying storage
 *     manager to use. If none is provided, the default global instance is used.
 * @constructor @struct @final
 */
fireauth.storage.UserManager = function(appId, opt_manager) {
  /** @const @private{string} appId The Auth state's application ID. */
  this.appId_ = appId;
  /**
   * @const @private{!fireauth.authStorage.Manager} The underlying storage
   *     manager.
   */
  this.manager_ = opt_manager || fireauth.authStorage.Manager.getInstance();
  /**
   * @private {?fireauth.authStorage.Key} The current Auth user storage
   *     identifier.
   */
  this.currentAuthUserKey_ = null;
  /**
   * @private {!goog.Promise} Storage operation serializer promise. This will
   *     initialize the current persistence used and clean up any duplicate
   *     states or temporary values (persistence for pending redirect).
   *     Afterwards this is used to queue storage requests to make sure
   *     storage operations are always synchronized and read/write events are
   *     processed on the same storage.
   */
  this.onReady_ = this.initialize_();
  // This internal listener will always run before the external ones.
  // This is needed to queue processing of this first before any getCurrentUser
  // is called from external listeners.
  this.manager_.addListener(
      fireauth.storage.UserManager.getAuthUserKey_(
          fireauth.authStorage.Persistence.LOCAL),
      this.appId_,
      goog.bind(this.switchToLocalOnExternalEvent_, this));
};


/**
 * Switches to local storage on external storage event. This will happen when
 * state is specified as local in an external tab while it is none or session
 * in the current one. If a user signs in in an external tab, the current window
 * should detect this, clear existing storage and switch to local storage.
 * @private
 */
fireauth.storage.UserManager.prototype.switchToLocalOnExternalEvent_ =
    function() {
  var self = this;
  var localKey = fireauth.storage.UserManager.getAuthUserKey_(
      fireauth.authStorage.Persistence.LOCAL);
  // Wait for any pending operation to finish first.
  // Block next read/write operation until persistence is transitioned to
  // local.
  this.waitForReady_(function() {
    return goog.Promise.resolve().then(function() {
      // If current persistence is not already local.
      if (self.currentAuthUserKey_ &&
          self.currentAuthUserKey_.persistent !=
          fireauth.authStorage.Persistence.LOCAL) {
        // Check if new current user is available in local storage.
        return self.manager_.get(localKey, self.appId_);
      }
      return null;
    }).then(function(response) {
      // Sign in on an external tab.
      if (response) {
        // Remove any existing non-local user.
        return self.removeAllExcept_(
            fireauth.authStorage.Persistence.LOCAL).then(function() {
              // Set persistence to local.
              self.currentAuthUserKey_ = localKey;
            });
      }
    });
  });
};


/**
 * Removes all states stored in all supported persistence types excluding the
 * specified one.
 * @param {?fireauth.authStorage.Persistence} persistence The type of storage
 *     persistence to switch to.
 * @return {!goog.Promise} The promise that resolves when all stored values are
 *     removed for types of storage excluding specified persistence. This helps
 *     ensure there is always one type of persistence at any time.
 * @private
 */
fireauth.storage.UserManager.prototype.removeAllExcept_ =
    function(persistence) {
  var promises = [];
  // Queue all promises to remove current user in any other persistence type.
  for (var key in fireauth.authStorage.Persistence) {
    // Skip specified persistence.
    if (fireauth.authStorage.Persistence[key] !== persistence) {
      var storageKey = fireauth.storage.UserManager.getAuthUserKey_(
          fireauth.authStorage.Persistence[key]);
      promises.push(this.manager_.remove(
          /** @type {!fireauth.authStorage.Key} */ (storageKey),
          this.appId_));
    }
  }
  // Clear persistence key (only useful for initial load upon returning from a
  // a redirect sign-in operation).
  promises.push(this.manager_.remove(
      fireauth.storage.UserManager.PERSISTENCE_KEY_,
      this.appId_));
  return goog.Promise.all(promises);
};


/**
 * Initializes the current persistence state. This will check the 3 supported
 * types. The first one that is found will be the current persistence. All
 * others will be cleared. If none is found we check PERSISTENCE_KEY_ which
 * when specified means that the operation is returning from a
 * signInWithRedirect call. This persistence will be applied.
 * Otherwise the default local persistence is used.
 * @return {!goog.Promise} A promise that resolves when the current persistence
 *     is resolved.
 * @private
 */
fireauth.storage.UserManager.prototype.initialize_ = function() {
  var self = this;
  // Local key.
  var localKey = fireauth.storage.UserManager.getAuthUserKey_(
      fireauth.authStorage.Persistence.LOCAL);
  // Session key.
  var sessionKey = fireauth.storage.UserManager.getAuthUserKey_(
      fireauth.authStorage.Persistence.SESSION);
  // In memory key. This is unlikely to contain anything on load.
  var inMemoryKey = fireauth.storage.UserManager.getAuthUserKey_(
      fireauth.authStorage.Persistence.NONE);
  // Migrate any old currentUser from localStorage to indexedDB.
  // This keeps any user signed in without the need for reauthentication and
  // minimizes risks of dangling Auth states.
  return this.manager_.migrateFromLocalStorage(
      localKey, this.appId_).then(function() {
    // Check if state is stored in session storage.
    return self.manager_.get(sessionKey, self.appId_);
  }).then(function(response) {
    if (response) {
      // Session storage is being used.
      return sessionKey;
    } else {
      // Session storage is empty. Check in memory storage.
      return self.manager_.get(inMemoryKey, self.appId_)
          .then(function(response) {
            if (response) {
              // In memory storage being used.
              return inMemoryKey;
            } else {
              // Check local storage.
              return self.manager_.get(localKey, self.appId_)
                  .then(function(response) {
                    if (response) {
                      // Local storage being used.
                      return localKey;
                    } else {
                      // Nothing found in any supported storage.
                      // Check current user persistence in storage.
                      return self.manager_.get(
                          fireauth.storage.UserManager.PERSISTENCE_KEY_,
                          self.appId_).then(function(persistence) {
                            if (persistence) {
                              // Sign in with redirect operation, apply this
                              // persistence to any current user.
                              return fireauth.storage.UserManager
                                  .getAuthUserKey_(persistence);
                            } else {
                              // No persistence found, use the default.
                              return localKey;
                            }
                          });
                    }
                  });
            }
          });
    }
  }).then(function(currentKey) {
    // Set current key according to the persistence detected.
    self.currentAuthUserKey_ = currentKey;
    // Make sure only one state available. Clean up everything else.
    return self.removeAllExcept_(currentKey.persistent);
  }).thenCatch(function(error) {
    // If an error occurs in the process and no current key detected, set to
    // persistence value to default.
    if (!self.currentAuthUserKey_) {
      self.currentAuthUserKey_ = localKey;
    }
  });
};


/**
 * @const @private {string} The Auth current user storage identifier name.
 */
fireauth.storage.UserManager.AUTH_USER_KEY_NAME_ = 'authUser';


/**
 * @const @private{!fireauth.authStorage.Key} The Auth user storage persistence
 *     identifier. This is needed to remember the previous persistence state for
 *     sign-in with redirect.
 */
fireauth.storage.UserManager.PERSISTENCE_KEY_ = {
  name: 'persistence',
  persistent: fireauth.authStorage.Persistence.SESSION
};


/**
 * Returns the Auth user key corresponding to the persistence type provided.
 * @param {!fireauth.authStorage.Persistence} persistence The key for the
 *     specified type of persistence.
 * @return {!fireauth.authStorage.Key} The corresponding Auth user storage
 *     identifier.
 * @private
 */
fireauth.storage.UserManager.getAuthUserKey_ = function(persistence) {
  return {
    name: fireauth.storage.UserManager.AUTH_USER_KEY_NAME_,
    persistent: persistence
  };
};


/**
 * Sets the persistence to the specified type.
 * If an existing user already is in storage, it copies that value to the new
 * storage and clears all the others.
 * @param {!fireauth.authStorage.Persistence} persistence The type of storage
 *     persistence to switch to.
 * @return {!goog.Promise} A promise that resolves when persistence change is
 *     applied.
 */
fireauth.storage.UserManager.prototype.setPersistence = function(persistence) {
  var currentUser = null;
  var self = this;
  // Validate the persistence type provided. This will throw a synchronous error
  // if invalid.
  fireauth.authStorage.validatePersistenceArgument(persistence);
  // Wait for turn in queue.
  return this.waitForReady_(function() {
    // If persistence hasn't changed, do nothing.
    if (persistence != self.currentAuthUserKey_.persistent) {
      // Persistence changed. Copy from current storage to new one.
      return self.manager_.get(
        /** @type {!fireauth.authStorage.Key} */ (self.currentAuthUserKey_),
        self.appId_).then(function(result) {
        // Save current user.
        currentUser = result;
        // Clear from current storage.
        return self.removeAllExcept_(persistence);
      }).then(function() {
        // Update persistence key to the new one.
        self.currentAuthUserKey_ =
            fireauth.storage.UserManager.getAuthUserKey_(persistence);
        // Copy current storage type to the new one.
        if (currentUser) {
          return self.manager_.set(
              /** @type {!fireauth.authStorage.Key} */ (
                  self.currentAuthUserKey_),
              currentUser,
              self.appId_);
        }
      });
    }
    // No change in persistence type.
    return goog.Promise.resolve();
  });
};


/**
 * Saves the current persistence type so it can be retrieved after a page
 * redirect. This is relevant for signInWithRedirect.
 * @return {!goog.Promise} Promise that resolve when current persistence is
 *     saved.
 */
fireauth.storage.UserManager.prototype.savePersistenceForRedirect = function() {
  var self = this;
  return this.waitForReady_(function() {
    // Save persistence to survive redirect.
    return self.manager_.set(
        fireauth.storage.UserManager.PERSISTENCE_KEY_,
        self.currentAuthUserKey_.persistent,
        self.appId_);
  });
};


/**
 * Stores the current Auth user for the provided application ID.
 * @param {!fireauth.AuthUser} currentUser The app current Auth user to save.
 * @return {!goog.Promise<void>} A promise that resolves on success.
 */
fireauth.storage.UserManager.prototype.setCurrentUser = function(currentUser) {
  var self = this;
  // Wait for any pending persistence change to be resolved.
  return this.waitForReady_(function() {
    return self.manager_.set(
        /** @type {!fireauth.authStorage.Key} */ (self.currentAuthUserKey_),
        currentUser.toPlainObject(),
        self.appId_);
  });
};


/**
 * Removes the stored current user for provided app ID.
 * @return {!goog.Promise<void>} A promise that resolves on success.
 */
fireauth.storage.UserManager.prototype.removeCurrentUser = function() {
  var self = this;
  // Wait for any pending persistence change to be resolved.
  return this.waitForReady_(function() {
    return self.manager_.remove(
        /** @type {!fireauth.authStorage.Key} */ (self.currentAuthUserKey_),
        self.appId_);
  });
};


/**
 * @param {?string=} authDomain The optional Auth domain to override if
 *     provided.
 * @param {?fireauth.constants.EmulatorSettings=} emulatorConfig The current
 *     emulator config to use in user requests.
 * @return {!goog.Promise<?fireauth.AuthUser>} A promise that resolves with
 *     the stored current user for the provided app ID.
 */
fireauth.storage.UserManager.prototype.getCurrentUser = function(authDomain, emulatorConfig) {
  var self = this;
  // Wait for any pending persistence change to be resolved.
  return this.waitForReady_(function() {
    return self.manager_.get(
        /** @type {!fireauth.authStorage.Key} */ (self.currentAuthUserKey_),
        self.appId_).then(function(response) {
          // If potential user saved, override Auth domain if authDomain is
          // provided.
          // This is useful in cases where on one page the developer initializes
          // the Auth instance without authDomain and signs in user using
          // headless methods. On another page, Auth is initialized with
          // authDomain for the purpose of linking with a popup. The loaded user
          // (stored without the authDomain) must have this field updated with
          // the current authDomain.
          if (response && authDomain) {
            response['authDomain'] = authDomain;
          }
          if (response && emulatorConfig) {
            response['emulatorConfig'] = emulatorConfig;
          }
          return fireauth.AuthUser.fromPlainObject(response || {});
        });
  });
};


/**
 * Serializes storage access operations especially since persistence
 * could be updated from one type to the other while read/write operations
 * occur.
 * @param {function():!goog.Promise<T>} cb The promise return callback to chain
 *     when pending operations are resolved.
 * @return {!goog.Promise<T>} The resulting promise that resolves when provided
 *     promise finally resolves.
 * @template T
 * @private
 */
fireauth.storage.UserManager.prototype.waitForReady_ = function(cb) {
  // Wait for any pending persistence change to be resolved before running
  // storage related operation. Chain to onReady so next call will wait for
  // this operation to resolve.
  // While an error is unlikely, run callback even if it happens, otherwise
  // no storage related event will be allowed to complete after an error.
  this.onReady_ = this.onReady_.then(cb, cb);
  return this.onReady_;
};


/**
 * Adds a listener to Auth current user change event for app ID provided.
 * @param {!function()} listener The listener to run on current user change
 *     event.
 */
fireauth.storage.UserManager.prototype.addCurrentUserChangeListener =
    function(listener) {
  // When this is triggered, getCurrentUser is called, that will have to wait
  // for switchToLocalOnExternalEvent_ to resolve which is ahead of it in the
  // queue.
  this.manager_.addListener(
      fireauth.storage.UserManager.getAuthUserKey_(
          fireauth.authStorage.Persistence.LOCAL),
      this.appId_,
      listener);
};


/**
 * Removes a listener to Auth current user change event for app ID provided.
 * @param {!function()} listener The listener to remove from current user change
 *     event changes.
 */
fireauth.storage.UserManager.prototype.removeCurrentUserChangeListener =
    function(listener) {
  this.manager_.removeListener(
      fireauth.storage.UserManager.getAuthUserKey_(
          fireauth.authStorage.Persistence.LOCAL),
      this.appId_,
      listener);
};
