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
'use strict';

import { ErrorFactory } from '@firebase/util';

import Errors from './errors';

export default class DBInterface {
  private dbName_: string;
  private dbVersion_: number;
  private openDbPromise_: Promise<IDBDatabase>;
  protected errorFactory_: ErrorFactory<string>;
  protected TRANSACTION_READ_WRITE: IDBTransactionMode;

  /**
   * @param {string} dbName
   * @param {number} dbVersion
   */
  constructor(dbName, dbVersion) {
    this.errorFactory_ = new ErrorFactory('messaging', 'Messaging', Errors.map);
    this.dbName_ = dbName;
    this.dbVersion_ = dbVersion;
    this.openDbPromise_ = null;
    this.TRANSACTION_READ_WRITE = 'readwrite';
  }

  /**
   * Get the indexedDB as a promsie.
   * @protected
   * @return {!Promise<!IDBDatabase>} The IndexedDB database
   */
  openDatabase() {
    if (this.openDbPromise_) {
      return this.openDbPromise_;
    }

    this.openDbPromise_ = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName_, this.dbVersion_);
      request.onerror = event => {
        reject((<IDBRequest>event.target).error);
      };
      request.onsuccess = event => {
        resolve((<IDBRequest>event.target).result);
      };
      request.onupgradeneeded = event => {
        var db = (<IDBRequest>event.target).result;
        this.onDBUpgrade(db);
      };
    });

    return this.openDbPromise_;
  }

  /**
   * Close the currently open database.
   * @return {!Promise} Returns the result of the promise chain.
   */
  closeDatabase() {
    return Promise.resolve().then(() => {
      if (this.openDbPromise_) {
        return this.openDbPromise_.then(db => {
          db.close();
          this.openDbPromise_ = null;
        });
      }
    });
  }

  /**
   * @protected
   * @param {!IDBDatabase} db
   */
  onDBUpgrade(db) {
    throw this.errorFactory_.create(Errors.codes.SHOULD_BE_INHERITED);
  }
}
