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

/**
 * @fileoverview Defines a local storage interface with an indexedDB
 * implementation to be used as a fallback with browsers that do not synchronize
 * local storage changes between different windows of the same origin.
 */

goog.provide('fireauth.storage.IndexedDB');

goog.require('fireauth.AuthError');
goog.require('fireauth.authenum.Error');
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
      reject(new Error(event.target.errorCode));
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
  var isLocked = false;
  var dbTemp;
  var self = this;
  return this.initializeDbAndRun_()
      .then(function(db) {
        dbTemp = db;
        var objectStore = self.getDataObjectStore_(
            self.getTransaction_(dbTemp, true));
        return self.onIDBRequest_(objectStore.get(key));
      })
      .then(function(data) {
        var objectStore = self.getDataObjectStore_(
            self.getTransaction_(dbTemp, true));
        if (data) {
          // Update the value(s) in the object that you want to change
          data.value = value;
          // Put this updated object back into the database.
          return self.onIDBRequest_(objectStore.put(data));
        }
        self.pendingOpsTracker_++;
        isLocked = true;
        var obj = {};
        obj[self.dataKeyPath_] = key;
        obj[self.valueKeyPath_] = value;
        return self.onIDBRequest_(objectStore.add(obj));
      })
      .then(function() {
        // Save in local copy to avoid triggering false external event.
        self.localMap_[key] = value;
      })
      .thenAlways(function() {
        if (isLocked) {
          self.pendingOpsTracker_--;
        }
      });
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
  var self = this;
  return this.initializeDbAndRun_()
      .then(function(db) {
        return self.onIDBRequest_(
            self.getDataObjectStore_(self.getTransaction_(db, false)).get(key));
      })
      .then(function(response) {
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
  var isLocked = false;
  var self = this;
  return this.initializeDbAndRun_()
      .then(function(db) {
        isLocked = true;
        self.pendingOpsTracker_++;
        return self.onIDBRequest_(
            self.getDataObjectStore_(
                self.getTransaction_(db, true))['delete'](key));
      }).then(function() {
        // Delete from local copy to avoid triggering false external event.
        delete self.localMap_[key];
      }).thenAlways(function() {
        if (isLocked) {
          self.pendingOpsTracker_--;
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
              reject(new Error(event.target.errorCode));
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
  // Repeat sync every fireauth.storage.IndexedDB.POLLING_DELAY_ ms.
  var repeat = function() {
    self.poll_ =
        goog.Timer.promise(fireauth.storage.IndexedDB.POLLING_DELAY_)
        .then(goog.bind(self.sync_, self))
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
        .then(repeat)
        .thenCatch(function(error) {
          // Do not repeat if cancelled externally.
          if (error.message != fireauth.storage.IndexedDB.STOP_ERROR_) {
            repeat();
          }
        });
    return self.poll_;
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
};
