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
goog.provide('fb.core.operation.AckUserWrite');
goog.require('fb.core.util.ImmutableTree');

/**
 *
 * @param {!fb.core.util.Path} path
 * @param {!fb.core.util.ImmutableTree<!boolean>} affectedTree
 * @param {!boolean} revert
 * @constructor
 * @implements {fb.core.Operation}
 */
fb.core.operation.AckUserWrite = function(path, affectedTree, revert) {
  /** @inheritDoc */
  this.type = fb.core.OperationType.ACK_USER_WRITE;

  /** @inheritDoc */
  this.source = fb.core.OperationSource.User;

  /** @inheritDoc */
  this.path = path;

  /**
   * A tree containing true for each affected path.  Affected paths can't overlap.
   * @type {!fb.core.util.ImmutableTree.<!boolean>}
   */
  this.affectedTree = affectedTree;

  /**
   * @type {boolean}
   */
  this.revert = revert;
};

/**
 * @inheritDoc
 */
fb.core.operation.AckUserWrite.prototype.operationForChild = function(childName) {
  if (!this.path.isEmpty()) {
    fb.core.util.assert(this.path.getFront() === childName, 'operationForChild called for unrelated child.');
    return new fb.core.operation.AckUserWrite(this.path.popFront(), this.affectedTree, this.revert);
  } else if (this.affectedTree.value != null) {
    fb.core.util.assert(this.affectedTree.children.isEmpty(),
        'affectedTree should not have overlapping affected paths.');
    // All child locations are affected as well; just return same operation.
    return this;
  } else {
    var childTree = this.affectedTree.subtree(new fb.core.util.Path(childName));
    return new fb.core.operation.AckUserWrite(fb.core.util.Path.Empty, childTree, this.revert);
  }
};

if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  fb.core.operation.AckUserWrite.prototype.toString = function() {
    return 'Operation(' + this.path + ': ' + this.source.toString() + ' ack write revert=' + this.revert +
        ' affectedTree=' + this.affectedTree + ')';
  };
}
