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
goog.provide('fb.core.Operation');
goog.require('fb.core.operation.AckUserWrite');
goog.require('fb.core.operation.Merge');
goog.require('fb.core.operation.Overwrite');
goog.require('fb.core.operation.ListenComplete');
goog.require('fb.core.util');

/**
 *
 * @enum
 */
fb.core.OperationType = {
  OVERWRITE: 0,
  MERGE: 1,
  ACK_USER_WRITE: 2,
  LISTEN_COMPLETE: 3
};

/**
 * @interface
 */
fb.core.Operation = function() { };

/**
 * @type {!fb.core.OperationSource}
 */
fb.core.Operation.prototype.source;

/**
 * @type {!fb.core.OperationType}
 */
fb.core.Operation.prototype.type;

/**
 * @type {!fb.core.util.Path}
 */
fb.core.Operation.prototype.path;

/**
 * @param {string} childName
 * @return {?fb.core.Operation}
 */
fb.core.Operation.prototype.operationForChild = goog.abstractMethod;


/**
 * @param {boolean} fromUser
 * @param {boolean} fromServer
 * @param {?string} queryId
 * @param {boolean} tagged
 * @constructor
 */
fb.core.OperationSource = function(fromUser, fromServer, queryId, tagged) {
  this.fromUser = fromUser;
  this.fromServer = fromServer;
  this.queryId = queryId;
  this.tagged = tagged;
  fb.core.util.assert(!tagged || fromServer, 'Tagged queries must be from server.');
};

/**
 * @const
 * @type {!fb.core.OperationSource}
 */
fb.core.OperationSource.User = new fb.core.OperationSource(/*fromUser=*/true, false, null, /*tagged=*/false);

/**
 * @const
 * @type {!fb.core.OperationSource}
 */
fb.core.OperationSource.Server = new fb.core.OperationSource(false, /*fromServer=*/true, null, /*tagged=*/false);

/**
 * @param {string} queryId
 * @return {!fb.core.OperationSource}
 */
fb.core.OperationSource.forServerTaggedQuery = function(queryId) {
  return new fb.core.OperationSource(false, /*fromServer=*/true, queryId, /*tagged=*/true);
};

if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  fb.core.OperationSource.prototype.toString = function() {
    return this.fromUser ? 'user' :
        this.tagged ? 'server(queryID=' + this.queryId + ')' :
            'server';
  };
}
