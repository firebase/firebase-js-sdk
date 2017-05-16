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
goog.provide('fb.api.TransactionResult');


/**
 * A type for the resolve value of Firebase.transaction.
 * @constructor
 * @dict
 * @param {boolean} committed
 * @param {fb.api.DataSnapshot} snapshot
 */
fb.api.TransactionResult = function (committed, snapshot) {
    /**
     * @type {boolean}
     */
    this['committed'] = committed;
    /**
     * @type {fb.api.DataSnapshot}
     */
    this['snapshot'] = snapshot;
};