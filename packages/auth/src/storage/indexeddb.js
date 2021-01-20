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
 * @fileoverview Defines a local storage interface with an indexedDB
 * implementation to be used as a fallback with browsers that do not synchronize
 * local storage changes between different windows of the same origin.
 */

goog.provide('fireauth.storage.IndexedDB');

goog.require('fireauth.AuthError');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.messagechannel.Receiver');
goog.require('fireauth.messagechannel.Sender');
goog.require('fireauth.messagechannel.WorkerClientPostMessager');
goog.require('fireauth.storage.Storage');
goog.require('fireauth.util');
goog.require('goog.Promise');
goog.require('goog.Timer');
goog.require('goog.array');



/**
 * Initialize an indexedDB local storage manager used to mimic local storage
 * using an indexedDB underlying implementation including the ability to listen
 * to storage changes by key similar to localstorage storage event.
 * @param {string} dbName The indexedDB database name where all local storage
 *     data is to be stored.
 * @param {string} objectStoreName The indexedDB object store name where all
 *     local storage data is to be stored.
 * @param {string} dataKeyPath The indexedDB object store index name used to key
 *     all local storage data.
 * @param {string} valueKeyPath The indexedDB object store value field for each
 *     entry.
 * @param {number} version The indexedDB database version number.
 * @param {?IDBFactory=} opt_indexedDB The optional IndexedDB factory object.
 * @implements {fireauth.storage.Storage}
 * @constructor
 */
fireauth.storage.IndexedDB = function(
    dbName,
    objectStoreName,
    dataKeyPath,
    valueKeyPath,
    version,
    opt_indexedDB) {
  // indexedDB not available, fail hard.
  if (!fireauth.storage.IndexedDB.isAvailable()) {
    throw new fireauth.AuthError(
        fireauth.authenum.Error.WEB_STORAGE_UNSUPPORTED);
  }
  /**
   * @const @private {string} The indexedDB database name where all local
   *     storage data is to be stored.
   */
  this.dbName_ = dbName;
  /**
   * @const @private {string} The indexedDB object store name where all local
   *     storage data is to be stored.
   */
  this.objectStoreName_ = objectStoreName;
  /**
   * @const @private {string} The indexedDB object store index name used to key
   *     all local storage data.
   */
  this.dataKeyPath_ = dataKeyPath;
  /**
   * @const @private {string} The indexedDB object store value field for each
   *     entry.
   */
  this.valueKeyPath_ = valueKeyPath;
  /** @const @private {number} The indexedDB database version number. */
  this.version_ = version;
  /** @private {!Object.<string, *>} The local indexedDB map copy. */
  this.localMap_ = {};
  /**
   * @private {!Array<function(!Array<string>)>} Listeners to storage events.
   */
  this.storageListeners_ = [];
  /** @private {number} The indexedDB pending write operations tracker. */
  this.pendingOpsTracker_ = 0;
  /** @private {!IDBFactory} The indexedDB factory object. */
  this.indexedDB_ = /** @type {!IDBFactory} */ (
      opt_indexedDB || goog.global.indexedDB);
  /** @public {string} The storage type identifier. */
  this.type = fireauth.storage.Storage.Type.INDEXEDDB;
  /**
   * @private {?goog.Promise<void>} The pending polling promise for syncing
   *     unprocessed indexedDB external changes.
   */
  this.poll_ = null;
  /**
   * @private {?number} The poll timer ID for syncing external indexedDB
   *     changes.
   */
  this.pollTimerId_ = null;
  /**
   * @private {?fireauth.messagechannel.Receiver} The messageChannel receiver if
   *     running from a serviceworker.
   */
  this.receiver_ = null;
  /**
   * @private {?fireauth.messagechannel.Sender} The messageChannel sender to
   *     send keyChanged messages to the service worker from the client.
   */
  this.sender_ = null;
  /**
   * @private {boolean} Whether the service worker has a receiver for the
   *     keyChanged events.
   */
  this.serviceWorkerReceiverAvailable_ = false;
  /** @private {?ServiceWorker} The current active service worker. */
  this.activeServiceWorker_ = null;
  var scope = this;
  if (fireauth.util.getWorkerGlobalScope()) {
    this.receiver_ = fireauth.messagechannel.Receiver.getInstance(
        /** @type {!WorkerGlobalScope} */ (
            fireauth.util.getWorkerGlobalScope()));
    // Listen to indexedDB changes.
    this.receiver_.subscribe('keyChanged', function(origin, request) {
      // Sync data.
      return scope.sync_().then(function(keys) {
        // Trigger listeners if unhandled changes are detected.
        if (keys.length > 0) {
          goog.array.forEach(
              scope.storageListeners_,
              function(listener) {
                listener(keys);
              });
        }
        // When this is false, it means the change was already
        // detected and processed before the notification.
        return {
          'keyProcessed': goog.array.contains(keys, request['key'])
        };
      });
    });
    // Used to inform sender that service worker what events it supports.
    this.receiver_.subscribe('ping', function(origin, request) {
      return goog.Promise.resolve(['keyChanged']);
    });
  } else {
    // Get active service worker when its available.
    fireauth.util.getActiveServiceWorker()
        .then(function(sw) {
          scope.activeServiceWorker_ = sw;
          if (sw) {
            // Initialize the sender.
            scope.sender_ = new fireauth.messagechannel.Sender(
                new fireauth.messagechannel.WorkerClientPostMessager(sw));
            // Ping the service worker to check what events they can handle.
            // Use long timeout.
            scope.sender_.send('ping', null, true)
                .then(function(results) {
                  // Check if keyChanged is supported.
                  if (results[0]['fulfilled'] &&
                      goog.array.contains(results[0]['value'], 'keyChanged')) {
                    scope.serviceWorkerReceiverAvailable_ = true;
                  }
                })
                .thenCatch(function(error) {
                  // Ignore error.
                });
          }
        });
  }
};



/**
 * The indexedDB database name where all local storage data is to be stored.
 * @private @const {string}
 */
fireauth.storage.IndexedDB.DB_NAME_ = 'firebaseLocalStorageDb';


/**
 * The indexedDB object store name where all local storage data is to be stored.
 * @private @const {string}
 */
fireauth.storage.IndexedDB.DATA_OBJECT_STORE_NAME_ = 'firebaseLocalStorage';


/**
 * The indexedDB object store index name used to key all local storage data.
 * @private @const {string}
 */
fireauth.storage.IndexedDB.DATA_KEY_PATH_ = 'fbase_key';


/**
 * The indexedDB object store value field for each entry.
 * @private @const {string}
 */
fireauth.storage.IndexedDB.VALUE_KEY_PATH_ = 'value';


/**
 * The indexedDB database version number.
 * @private @const {number}
 */
fireauth.storage.IndexedDB.VERSION_ = 1;


/**
 * The indexedDB polling delay time in milliseconds.
 * @private @const {number}
 */
fireauth.storage.IndexedDB.POLLING_DELAY_ = 800;


/**
 * Maximum number of times to retry a transaction in the event the connection is
 * closed.
 * @private @const {number}
 */
fireauth.storage.IndexedDB.TRANSACTION_RETRY_COUNT_ = 3;


/**
 * The indexedDB polling stop error.
 * @private @const {string}
 */
fireauth.storage.IndexedDB.STOP_ERROR_ = 'STOP_EVENT';



/**
 * @return {!fireauth.storage.IndexedDB} The Firebase Auth indexedDB
 *     local storage manager.
 */
fireauth.storage.IndexedDB.getFireauthManager = function() {
  if (!fireauth.storage.IndexedDB.managerInstance_) {
    fireauth.storage.IndexedDB.managerInstance_ =
        new fireauth.storage.IndexedDB(
            fireauth.storage.IndexedDB.DB_NAME_,
            fireauth.storage.IndexedDB.DATA_OBJECT_STORE_NAME_,
            fireauth.storage.IndexedDB.DATA_KEY_PATH_,
            fireauth.storage.IndexedDB.VALUE_KEY_PATH_,
            fireauth.storage.IndexedDB.VERSION_);
  }
  return fireauth.storage.IndexedDB.managerInstance_;
};


/**
 * Delete the indexedDB database.
 * @return {!goog.Promise<!IDBDatabase>} A promise that resolves on successful
 *     database deletion.
 * @private
 */
fireauth.storage.IndexedDB.prototype.deleteDb_ = function() {
  var self = this;
  return new goog.Promise(function(resolve, reject) {
    var request = self.indexedDB_.deleteDatabase(self.dbName_);
    request.onsuccess = function(event) {
      resolve();
    };
    request.onerror = function(event) {
      reject(new Error(event.target.error));
    };
  });
};


/**
 * Initializes The indexedDB database, creates it if not already created and
 * opens it.
 * @return {!goog.Promise<!IDBDatabase>} A promise for the database object.
 * @private
 */
fireauth.storage.IndexedDB.prototype.initializeDb_ = function() {
  var self = this;
  return new goog.Promise(function(resolve, reject) {
    var request = self.indexedDB_.open(self.dbName_, self.version_);
    request.onerror = function(event) {
      // Suppress this from surfacing to browser console.
      try {
        event.preventDefault();
      } catch (e) {}
      reject(new Error(event.target.error));
    };
    request.onupgradeneeded = function(event) {
      var db = event.target.result;
      try {
        db.createObjectStore(
            self.objectStoreName_,
            {
              'keyPath': self.dataKeyPath_
            });
      } catch (e) {
        reject(e);
      }
    };
    request.onsuccess = function(event) {
      var db = event.target.result;
      // Strange bug that occurs in Firefox when multiple tabs are opened at the
      // same time. The only way to recover seems to be deleting the database
      // and re-initializing it.
      // https://github.com/firebase/firebase-js-sdk/issues/634
      if (!db.objectStoreNames.contains(self.objectStoreName_)) {
        self.deleteDb_()
            .then(function() {
              return self.initializeDb_();
            })
            .then(function(newDb) {
              resolve(newDb);
            })
            .thenCatch(function(e) {
              reject(e);
            });
      } else {
        resolve(db);
      }
    };
  });
};


/**
 * Checks if indexedDB is initialized, if so, the callback is run, otherwise,
 * it waits for the db to initialize and then runs the callback function.
 * @return {!goog.Promise<!IDBDatabase>} A promise for the initialized indexedDB
 *     database.
 * @private
 */
fireauth.storage.IndexedDB.prototype.initializeDbAndRun_ =
    function() {
  if (!this.initPromise_) {
    this.initPromise_ = this.initializeDb_();
  }
  return this.initPromise_;
};

/**
* Attempts to run a transaction, in the event of an error will re-initialize
* the DB connection and retry a fixed number of times.
* @param {function(!IDBDatabase): !goog.Promise<{T}>} transaction A method
*     which performs a transactional operation on an IDBDatabase.
* @template T 
* @return {!goog.Promise<T>}
* @private
*/
fireauth.storage.IndexedDB.prototype.withRetry_ = function(transaction) {
  let numAttempts = 0;
  const attempt = (resolve, reject) => {
    this.initializeDbAndRun_()
      .then(transaction)
      .then(resolve)
      .thenCatch((error) => {
        if (++numAttempts >
          fireauth.storage.IndexedDB.TRANSACTION_RETRY_COUNT_) {
          reject(error);
          return;
        }
        return this.initializeDbAndRun_().then((db) => {
          db.close();
          this.initPromise_ = undefined;
          return attempt(resolve, reject);
        }).thenCatch((error) => {
          // Make sure any errors caused by initializeDbAndRun_() or
          // db.close() are caught as well and trigger a rejection. If at
          // this point, we are probably in a private browsing context or
          // environment that does not support indexedDB.
          reject(error);
        });
      });
  };
  return new goog.Promise(attempt);
}


/**
 * @return {boolean} Whether indexedDB is available or not.
 */
fireauth.storage.IndexedDB.isAvailable = function() {
  try {
    return !!goog.global['indexedDB'];
  } catch (e) {
    return false;
  }
};


/**
 * Creates a reference for the local storage indexedDB object store and returns
 * it.
 * @param {!IDBTransaction} tx The IDB transaction instance.
 * @return {!IDBObjectStore} The indexedDB object store.
 * @private
 */
fireauth.storage.IndexedDB.prototype.getDataObjectStore_ =
    function(tx) {
  return tx.objectStore(this.objectStoreName_);
};


/**
 * Creates an IDB transaction and returns it.
 * @param {!IDBDatabase} db The indexedDB instance.
 * @param {boolean} isReadWrite Whether the current indexedDB operation is a
 *     read/write operation or not.
 * @return {!IDBTransaction} The requested IDB transaction instance.
 * @private
 */
fireauth.storage.IndexedDB.prototype.getTransaction_ =
    function(db, isReadWrite) {
  var tx = db.transaction(
      [this.objectStoreName_],
      isReadWrite ? 'readwrite' : 'readonly');
  return tx;
};


/**
 * @param {!IDBRequest} request The IDB request instance.
 * @return {!goog.Promise} The promise to resolve on transaction completion.
 * @private
 */
fireauth.storage.IndexedDB.prototype.onIDBRequest_ =
    function(request) {
  return new goog.Promise(function(resolve, reject) {
    request.onsuccess = function(event) {
      if (event && event.target) {
        resolve(event.target.result);
      } else {
        resolve();
      }
    };
    request.onerror = function(event) {
      reject(event.target.error);
    };
  });
};


/**
 * Sets the item's identified by the key provided to the value passed. If the
 * item does not exist, it is created. An optional callback is run on success.
 * @param {string} key The storage key for the item to set. If the item exists,
 *     it is updated, otherwise created.
 * @param {*} value The value to store for the item to set.
 * @return {!goog.Promise<void>} A promise that resolves on operation success.
 * @override
 */
fireauth.storage.IndexedDB.prototype.set = function(key, value) {
  let isLocked = false;
  return this
    .withRetry_((db) => {
      const objectStore =
        this.getDataObjectStore_(this.getTransaction_(db, true));
      return this.onIDBRequest_(objectStore.get(key));
    })
    .then((data) => {
      return this.withRetry_((db) => {
        const objectStore =
          this.getDataObjectStore_(this.getTransaction_(db, true));
        if (data) {
          // Update the value(s) in the object that you want to change
          data.value = value;
          // Put this updated object back into the database.
          return this.onIDBRequest_(objectStore.put(data));
        }
        this.pendingOpsTracker_++;
        isLocked = true;
        const obj = {};
        obj[this.dataKeyPath_] = key;
        obj[this.valueKeyPath_] = value;
        return this.onIDBRequest_(objectStore.add(obj));
      });
    })
    .then(() => {
      // Save in local copy to avoid triggering false external event.
      this.localMap_[key] = value;
      // Announce change in key to service worker.
      return this.notifySW_(key);
    })
    .thenAlways(() => {
      if (isLocked) {
        this.pendingOpsTracker_--;
      }
    });
};


/**
 * Notify the service worker of the indexeDB write operation.
 * Waits until the operation is processed.
 * @param {string} key The key which is changing.
 * @return {!goog.Promise<void>} A promise that resolves on delivery.
 * @private
 */
fireauth.storage.IndexedDB.prototype.notifySW_ = function(key) {
  // If sender is available.
  // Run some sanity check to confirm no sw change occurred.
  // For now, we support one service worker per page.
  if (this.sender_ &&
      this.activeServiceWorker_ &&
      fireauth.util.getServiceWorkerController() ===
      this.activeServiceWorker_) {
    return this.sender_.send(
        'keyChanged',
        {'key': key},
        // Use long timeout if receiver is known to be available.
        this.serviceWorkerReceiverAvailable_)
        .then(function(responses) {
          // Return nothing.
        })
        .thenCatch(function(error) {
          // This is a best effort approach. Ignore errors.
        });
  }
  return goog.Promise.resolve();
};


/**
 * Retrieves a stored item identified by the key provided asynchronously.
 * The value is passed to the callback function provided.
 * @param {string} key The storage key for the item to fetch.
 * @return {!goog.Promise} A promise that resolves with the item's value, or
 *     null if the item is not found.
 * @override
 */
fireauth.storage.IndexedDB.prototype.get = function(key) {
  return this
    .withRetry_((db) => {
      return this.onIDBRequest_(
          this.getDataObjectStore_(this.getTransaction_(db, false)).get(key));
    })
    .then((response) => {
      return response && response.value;
    }); 
};


/**
 * Deletes the item identified by the key provided and on success, runs the
 * optional callback.
 * @param {string} key The storage key for the item to remove.
 * @return {!goog.Promise<void>} A promise that resolves on operation success.
 * @override
 */
fireauth.storage.IndexedDB.prototype.remove = function(key) {
  let isLocked = false;
  return this
    .withRetry_((db) => {
        isLocked = true;
        this.pendingOpsTracker_++;
        return this.onIDBRequest_(
            this.getDataObjectStore_(
                this.getTransaction_(db, true))['delete'](key));
      }).then(() => {
        // Delete from local copy to avoid triggering false external event.
        delete this.localMap_[key];
        // Announce change in key to service worker.
        return this.notifySW_(key);
      }).thenAlways(() => {
        if (isLocked) {
          this.pendingOpsTracker_--;
        }
      });
};


/**
 * @return {!goog.Promise<!Array<string>>} A promise that resolved with all the
 *     storage keys that have changed.
 * @private
 */
fireauth.storage.IndexedDB.prototype.sync_ = function() {
  var self = this;
  return this.initializeDbAndRun_()
      .then(function(db) {
        var objectStore =
            self.getDataObjectStore_(self.getTransaction_(db, false));
        if (objectStore['getAll']) {
          // Get all keys and value pairs using getAll if supported.
          return self.onIDBRequest_(objectStore['getAll']());
        } else {
          // If getAll isn't supported, fallback to cursor.
          return new goog.Promise(function(resolve, reject) {
            var res = [];
            var request = objectStore.openCursor();
            request.onsuccess = function(event) {
              var cursor = event.target.result;
              if (cursor) {
                res.push(cursor.value);
                cursor['continue']();
              } else {
                resolve(res);
              }
            };
            request.onerror = function(event) {
              reject(event.target.error);
            };
          });
        }
      }).then(function(res) {
        var centralCopy = {};
        // List of keys differing from central copy.
        var diffKeys = [];
        // Build central copy (external copy).
        if (self.pendingOpsTracker_ == 0) {
          for (var i = 0; i < res.length; i++) {
            centralCopy[res[i][self.dataKeyPath_]] =
                res[i][self.valueKeyPath_];
          }
          // Get diff of central copy and local copy.
          diffKeys = fireauth.util.getKeyDiff(self.localMap_, centralCopy);
          // Update local copy.
          self.localMap_ = centralCopy;
        }
        // Return modified keys.
        return diffKeys;
      });
};


/**
 * Adds a listener to storage event change.
 * @param {function(!Array<string>)} listener The storage event listener.
 * @override
 */
fireauth.storage.IndexedDB.prototype.addStorageListener =
    function(listener) {
  // First listener, start listeners.
  if (this.storageListeners_.length == 0) {
    this.startListeners_();
  }
  this.storageListeners_.push(listener);
};


/**
 * Removes a listener to storage event change.
 * @param {function(!Array<string>)} listener The storage event listener.
 * @override
 */
fireauth.storage.IndexedDB.prototype.removeStorageListener =
    function(listener) {
  goog.array.removeAllIf(
      this.storageListeners_,
      function(ele) {
        return ele == listener;
      });
  // No more listeners, stop.
  if (this.storageListeners_.length == 0) {
    this.stopListeners_();
  }
};


/**
 * Removes all listeners to storage event change.
 */
fireauth.storage.IndexedDB.prototype.removeAllStorageListeners =
    function() {
  this.storageListeners_ = [];
  // No more listeners, stop.
  this.stopListeners_();
};


/**
 * Starts the listener to storage events.
 * @private
 */
fireauth.storage.IndexedDB.prototype.startListeners_ = function() {
  var self = this;
  // Stop any previous listeners.
  this.stopListeners_();
  var repeat = function() {
    self.pollTimerId_ = setTimeout(
        function() {
          self.poll_ = self.sync_()
              .then(function(keys) {
                // If keys modified, call listeners.
                if (keys.length > 0) {
                  goog.array.forEach(
                      self.storageListeners_,
                      function(listener) {
                        listener(keys);
                      });
                }
              })
              .then(function() {
                repeat();
              })
              .thenCatch(function(error) {
                if (error.message != fireauth.storage.IndexedDB.STOP_ERROR_) {
                  repeat();
                }
              });
        },
        fireauth.storage.IndexedDB.POLLING_DELAY_);
  };
  repeat();
};


/**
 * Stops the listener to storage events.
 * @private
 */
fireauth.storage.IndexedDB.prototype.stopListeners_ = function() {
  if (this.poll_) {
    // Cancel polling function.
    this.poll_.cancel(fireauth.storage.IndexedDB.STOP_ERROR_);
  }
  // Clear any pending polling timer.
  if (this.pollTimerId_) {
    clearTimeout(this.pollTimerId_);
    this.pollTimerId_ = null;
  }
};
